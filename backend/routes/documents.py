# Module Documents KYC
# Gestion de l'upload et validation des documents d'identité

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import os
import base64

documents_router = APIRouter(prefix="/api/documents", tags=["Documents KYC"])

# Types de documents acceptés
DOCUMENT_TYPES = {
    'id_card': "Pièce d'identité",
    'passport': "Passeport",
    'driving_license': "Permis de conduire",
    'proof_of_address': "Justificatif de domicile",
    'selfie': "Photo selfie avec pièce d'identité"
}

# Extensions acceptées
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    type: str
    type_label: str
    status: str
    filename: str
    uploaded_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None

class ReviewDocumentRequest(BaseModel):
    document_id: str
    action: str  # 'approve' or 'reject'
    reason: Optional[str] = None

def setup_documents_routes(db, jwt_secret, jwt_algorithm):
    """Setup documents KYC routes with database access"""

    async def get_current_user(authorization: str):
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")

    @documents_router.post("/upload")
    async def upload_document(
        file: UploadFile = File(...),
        document_type: str = Form(...),
        authorization: str = Header(None)
    ):
        """Upload a KYC document"""
        user = await get_current_user(authorization)
        
        # Validate document type
        if document_type not in DOCUMENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Type de document invalide. Types acceptés: {', '.join(DOCUMENT_TYPES.keys())}")
        
        # Validate file extension
        filename = file.filename.lower()
        ext = os.path.splitext(filename)[1]
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Extension non autorisée. Extensions acceptées: {', '.join(ALLOWED_EXTENSIONS)}")
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Fichier trop volumineux. Taille max: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        # Check if document of this type already exists and is pending/approved
        existing = await db.kyc_documents.find_one({
            "user_id": user["id"],
            "type": document_type,
            "status": {"$in": ["pending", "approved"]}
        })
        
        if existing:
            if existing["status"] == "approved":
                raise HTTPException(status_code=400, detail="Un document de ce type a déjà été approuvé")
            elif existing["status"] == "pending":
                # Replace the pending document
                await db.kyc_documents.delete_one({"id": existing["id"]})
        
        # Create document record
        doc_id = str(uuid.uuid4())
        document = {
            "id": doc_id,
            "user_id": user["id"],
            "type": document_type,
            "type_label": DOCUMENT_TYPES[document_type],
            "status": "pending",
            "filename": f"{doc_id}{ext}",
            "original_filename": file.filename,
            "content_type": file.content_type,
            "file_size": len(content),
            "file_data": base64.b64encode(content).decode('utf-8'),  # Store as base64
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_at": None,
            "reviewed_by": None,
            "rejection_reason": None
        }
        
        await db.kyc_documents.insert_one(document)
        
        # Update user's KYC status to pending if not already verified
        if user.get("kyc_status") != "verified":
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"kyc_status": "pending"}}
            )
        
        return {
            "message": "Document téléchargé avec succès",
            "document": {
                "id": doc_id,
                "type": document_type,
                "type_label": DOCUMENT_TYPES[document_type],
                "status": "pending",
                "uploaded_at": document["uploaded_at"]
            }
        }

    @documents_router.get("/my")
    async def get_my_documents(authorization: str = Header(None)):
        """Get current user's uploaded documents"""
        user = await get_current_user(authorization)
        
        documents = await db.kyc_documents.find(
            {"user_id": user["id"]},
            {"_id": 0, "file_data": 0}  # Exclude file data for listing
        ).sort("uploaded_at", -1).to_list(100)
        
        return {
            "documents": documents,
            "kyc_status": user.get("kyc_status", "unverified")
        }

    @documents_router.get("/{document_id}")
    async def get_document(document_id: str, authorization: str = Header(None)):
        """Get a specific document details"""
        user = await get_current_user(authorization)
        
        document = await db.kyc_documents.find_one(
            {"id": document_id},
            {"_id": 0}
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        # Only owner or admin can view
        if document["user_id"] != user["id"] and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        return document

    @documents_router.delete("/{document_id}")
    async def delete_document(document_id: str, authorization: str = Header(None)):
        """Delete a document (only if pending)"""
        user = await get_current_user(authorization)
        
        document = await db.kyc_documents.find_one({"id": document_id})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        if document["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        
        if document["status"] != "pending":
            raise HTTPException(status_code=400, detail="Seuls les documents en attente peuvent être supprimés")
        
        await db.kyc_documents.delete_one({"id": document_id})
        
        return {"message": "Document supprimé"}

    # ==================== ADMIN ENDPOINTS ====================

    @documents_router.get("/admin/pending")
    async def admin_get_pending_documents(
        limit: int = 20,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Admin: Get all pending documents for review"""
        user = await get_current_user(authorization)
        
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get pending documents with user info
        pipeline = [
            {"$match": {"status": "pending"}},
            {"$sort": {"uploaded_at": 1}},
            {"$skip": offset},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "id",
                    "as": "user_info"
                }
            },
            {"$unwind": "$user_info"},
            {
                "$project": {
                    "_id": 0,
                    "id": 1,
                    "user_id": 1,
                    "type": 1,
                    "type_label": 1,
                    "status": 1,
                    "filename": 1,
                    "original_filename": 1,
                    "uploaded_at": 1,
                    "user_name": "$user_info.full_name",
                    "user_email": "$user_info.email"
                }
            }
        ]
        
        documents = await db.kyc_documents.aggregate(pipeline).to_list(limit)
        total = await db.kyc_documents.count_documents({"status": "pending"})
        
        return {
            "documents": documents,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    @documents_router.get("/admin/all")
    async def admin_get_all_documents(
        status: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Admin: Get all documents with filters"""
        user = await get_current_user(authorization)
        
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        query = {}
        if status:
            query["status"] = status
        if user_id:
            query["user_id"] = user_id
        
        documents = await db.kyc_documents.find(
            query,
            {"_id": 0, "file_data": 0}
        ).sort("uploaded_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.kyc_documents.count_documents(query)
        
        return {
            "documents": documents,
            "total": total
        }

    @documents_router.post("/admin/review")
    async def admin_review_document(
        request: ReviewDocumentRequest,
        authorization: str = Header(None)
    ):
        """Admin: Approve or reject a document"""
        user = await get_current_user(authorization)
        
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        document = await db.kyc_documents.find_one({"id": request.document_id})
        
        if not document:
            raise HTTPException(status_code=404, detail="Document non trouvé")
        
        if document["status"] != "pending":
            raise HTTPException(status_code=400, detail="Ce document a déjà été traité")
        
        if request.action not in ["approve", "reject"]:
            raise HTTPException(status_code=400, detail="Action invalide. Utilisez 'approve' ou 'reject'")
        
        new_status = "approved" if request.action == "approve" else "rejected"
        
        # Update document
        update_data = {
            "status": new_status,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": user["id"]
        }
        
        if request.action == "reject" and request.reason:
            update_data["rejection_reason"] = request.reason
        
        await db.kyc_documents.update_one(
            {"id": request.document_id},
            {"$set": update_data}
        )
        
        # Update user's KYC status if approved
        if request.action == "approve":
            # Check if all required documents are approved
            doc_owner_id = document["user_id"]
            approved_docs = await db.kyc_documents.find({
                "user_id": doc_owner_id,
                "status": "approved"
            }).to_list(10)
            
            approved_types = {d["type"] for d in approved_docs}
            
            # If ID document is approved, upgrade KYC status
            if "id_card" in approved_types or "passport" in approved_types or "driving_license" in approved_types:
                await db.users.update_one(
                    {"id": doc_owner_id},
                    {"$set": {
                        "kyc_status": "verified",
                        "kyc_verified_at": datetime.now(timezone.utc).isoformat(),
                        "kyc_verified_by": user["id"]
                    }}
                )
                
                # Increase user limits
                await db.users.update_one(
                    {"id": doc_owner_id},
                    {"$set": {
                        "daily_limit": 10000,
                        "transaction_limit": 5000,
                        "monthly_limit": 50000
                    }}
                )
        
        return {
            "message": f"Document {'approuvé' if request.action == 'approve' else 'rejeté'}",
            "document_id": request.document_id,
            "new_status": new_status
        }

    @documents_router.get("/admin/user/{user_id}")
    async def admin_get_user_documents(
        user_id: str,
        authorization: str = Header(None)
    ):
        """Admin: Get all documents for a specific user"""
        admin = await get_current_user(authorization)
        
        if admin.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        documents = await db.kyc_documents.find(
            {"user_id": user_id},
            {"_id": 0, "file_data": 0}
        ).sort("uploaded_at", -1).to_list(20)
        
        return {
            "user": {
                "id": user["id"],
                "full_name": user.get("full_name"),
                "email": user.get("email"),
                "kyc_status": user.get("kyc_status", "unverified"),
                "daily_limit": user.get("daily_limit", 1000),
                "transaction_limit": user.get("transaction_limit", 500)
            },
            "documents": documents
        }

    return documents_router
