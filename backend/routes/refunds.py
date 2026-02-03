# Module Remboursements SB Money
# Routes pour les demandes et traitements de remboursements

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

# Create router
refunds_router = APIRouter(prefix="/api/refunds", tags=["Refunds"])

# ==================== MODELS ====================

class RefundRequest(BaseModel):
    transaction_id: str
    reason: str
    details: Optional[str] = None

class RefundReview(BaseModel):
    action: str  # approve, reject
    admin_note: Optional[str] = None

# ==================== CONFIGURATION ====================

# Délai de réclamation par défaut (en heures)
DEFAULT_REFUND_WINDOW_HOURS = 48

# Montant max pour remboursement automatique (XOF)
AUTO_REFUND_MAX_AMOUNT = 50000

# Statuts de remboursement
REFUND_STATUSES = {
    "pending": "En attente",
    "processing": "En cours de traitement",
    "approved": "Approuvé",
    "rejected": "Rejeté",
    "completed": "Remboursé",
    "cancelled": "Annulé"
}

# Raisons de remboursement prédéfinies
REFUND_REASONS = [
    {"code": "wrong_recipient", "label": "Erreur de destinataire", "auto_eligible": True},
    {"code": "wrong_amount", "label": "Montant incorrect", "auto_eligible": True},
    {"code": "duplicate", "label": "Transaction en double", "auto_eligible": True},
    {"code": "fraud", "label": "Fraude suspectée", "auto_eligible": False},
    {"code": "service_not_received", "label": "Service non reçu", "auto_eligible": False},
    {"code": "other", "label": "Autre", "auto_eligible": False}
]

# ==================== HELPER FUNCTIONS ====================

def is_within_refund_window(transaction_date: str, window_hours: int = DEFAULT_REFUND_WINDOW_HOURS) -> bool:
    """Check if transaction is within the refund window"""
    try:
        tx_date = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        deadline = tx_date + timedelta(hours=window_hours)
        return datetime.now(timezone.utc) <= deadline
    except:
        return False

def get_time_remaining(transaction_date: str, window_hours: int = DEFAULT_REFUND_WINDOW_HOURS) -> dict:
    """Get time remaining for refund eligibility"""
    try:
        tx_date = datetime.fromisoformat(transaction_date.replace('Z', '+00:00'))
        deadline = tx_date + timedelta(hours=window_hours)
        remaining = deadline - datetime.now(timezone.utc)
        
        if remaining.total_seconds() <= 0:
            return {"eligible": False, "hours": 0, "minutes": 0, "message": "Délai expiré"}
        
        hours = int(remaining.total_seconds() // 3600)
        minutes = int((remaining.total_seconds() % 3600) // 60)
        
        return {
            "eligible": True,
            "hours": hours,
            "minutes": minutes,
            "message": f"{hours}h {minutes}min restantes"
        }
    except:
        return {"eligible": False, "hours": 0, "minutes": 0, "message": "Erreur de calcul"}

# ==================== ROUTE SETUP ====================

def setup_refunds_routes(db, get_current_user, get_admin_user, send_push_notification, send_email_notification):
    """Setup refund routes with database access"""
    
    @refunds_router.get("/reasons")
    async def get_refund_reasons():
        """Get available refund reasons"""
        return {
            "reasons": REFUND_REASONS,
            "refund_window_hours": DEFAULT_REFUND_WINDOW_HOURS,
            "auto_refund_max": AUTO_REFUND_MAX_AMOUNT
        }
    
    @refunds_router.get("/eligibility/{transaction_id}")
    async def check_refund_eligibility(
        transaction_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Check if a transaction is eligible for refund"""
        user_id = current_user["id"]
        
        # Find the transaction
        transaction = await db.transactions.find_one(
            {"id": transaction_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        # Check if refund already exists
        existing_refund = await db.refund_requests.find_one(
            {"transaction_id": transaction_id, "status": {"$nin": ["rejected", "cancelled"]}},
            {"_id": 0}
        )
        
        if existing_refund:
            return {
                "eligible": False,
                "reason": "Une demande de remboursement existe déjà pour cette transaction",
                "existing_refund": {
                    "id": existing_refund["id"],
                    "status": existing_refund["status"],
                    "status_label": REFUND_STATUSES.get(existing_refund["status"], existing_refund["status"])
                }
            }
        
        # Check transaction type (only outgoing transfers eligible)
        eligible_types = ["transfer_out", "p2p_transfer_out", "mobile_money_transfer"]
        if transaction.get("type") not in eligible_types:
            return {
                "eligible": False,
                "reason": "Ce type de transaction n'est pas éligible au remboursement"
            }
        
        # Check if already completed/failed
        if transaction.get("status") in ["failed", "refunded", "cancelled"]:
            return {
                "eligible": False,
                "reason": f"Transaction déjà {transaction.get('status')}"
            }
        
        # Check time window
        time_remaining = get_time_remaining(transaction.get("created_at", ""))
        
        if not time_remaining["eligible"]:
            return {
                "eligible": False,
                "reason": f"Délai de réclamation dépassé ({DEFAULT_REFUND_WINDOW_HOURS}h max)",
                "time_info": time_remaining
            }
        
        # Calculate if auto-refund eligible
        amount = abs(transaction.get("amount", 0))
        auto_eligible = amount <= AUTO_REFUND_MAX_AMOUNT
        
        return {
            "eligible": True,
            "transaction": {
                "id": transaction["id"],
                "type": transaction.get("type"),
                "amount": amount,
                "currency": transaction.get("currency", "XOF"),
                "recipient": transaction.get("recipient_email") or transaction.get("recipient_phone", "N/A"),
                "created_at": transaction.get("created_at"),
                "status": transaction.get("status")
            },
            "time_remaining": time_remaining,
            "auto_refund_eligible": auto_eligible,
            "auto_refund_message": "Remboursement automatique si approuvé" if auto_eligible else "Validation admin requise",
            "reasons": REFUND_REASONS
        }
    
    @refunds_router.post("/request")
    async def create_refund_request(
        request: RefundRequest,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a refund request for a transaction"""
        user_id = current_user["id"]
        
        # Find the transaction
        transaction = await db.transactions.find_one(
            {"id": request.transaction_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        # Check eligibility (reuse logic)
        eligible_types = ["transfer_out", "p2p_transfer_out", "mobile_money_transfer"]
        if transaction.get("type") not in eligible_types:
            raise HTTPException(status_code=400, detail="Type de transaction non éligible")
        
        if transaction.get("status") in ["failed", "refunded", "cancelled"]:
            raise HTTPException(status_code=400, detail="Transaction déjà traitée")
        
        # Check time window
        if not is_within_refund_window(transaction.get("created_at", "")):
            raise HTTPException(
                status_code=400, 
                detail=f"Délai de réclamation dépassé ({DEFAULT_REFUND_WINDOW_HOURS}h max)"
            )
        
        # Check for existing request
        existing = await db.refund_requests.find_one(
            {"transaction_id": request.transaction_id, "status": {"$nin": ["rejected", "cancelled"]}},
            {"_id": 0}
        )
        
        if existing:
            raise HTTPException(status_code=400, detail="Une demande existe déjà pour cette transaction")
        
        # Validate reason
        valid_reasons = [r["code"] for r in REFUND_REASONS]
        if request.reason not in valid_reasons:
            raise HTTPException(status_code=400, detail="Raison invalide")
        
        # Get reason details
        reason_info = next((r for r in REFUND_REASONS if r["code"] == request.reason), None)
        
        now = datetime.now(timezone.utc)
        refund_id = str(uuid.uuid4())
        amount = abs(transaction.get("amount", 0))
        currency = transaction.get("currency", "XOF")
        
        # Determine if auto-approve
        auto_approve = (
            reason_info and 
            reason_info.get("auto_eligible", False) and 
            amount <= AUTO_REFUND_MAX_AMOUNT
        )
        
        # Create refund request
        refund_doc = {
            "id": refund_id,
            "transaction_id": request.transaction_id,
            "user_id": user_id,
            "user_email": current_user.get("email"),
            "user_name": current_user.get("full_name"),
            "amount": amount,
            "currency": currency,
            "reason_code": request.reason,
            "reason_label": reason_info["label"] if reason_info else request.reason,
            "details": request.details,
            "status": "processing" if auto_approve else "pending",
            "auto_approved": auto_approve,
            "admin_note": None,
            "reviewed_by": None,
            "reviewed_at": None,
            "completed_at": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.refund_requests.insert_one(refund_doc)
        
        # If auto-approve, process immediately
        if auto_approve:
            # Process refund
            await process_refund(db, refund_doc, transaction, current_user, background_tasks, send_push_notification)
            refund_doc["status"] = "completed"
        else:
            # Notify admin
            await db.admin_notifications.insert_one({
                "id": str(uuid.uuid4()),
                "type": "refund_request",
                "title": "Nouvelle demande de remboursement",
                "message": f"Demande de {amount:,.0f} {currency} de {current_user.get('full_name')}",
                "reference_id": refund_id,
                "priority": "high" if amount > 100000 else "normal",
                "read": False,
                "created_at": now.isoformat()
            })
        
        # Notify user
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Demande de remboursement" + (" approuvée" if auto_approve else " reçue"),
            f"{'Remboursement de' if auto_approve else 'Demande pour'} {amount:,.0f} {currency} {'effectué' if auto_approve else 'en cours de traitement'}"
        )
        
        return {
            "message": "Remboursement effectué" if auto_approve else "Demande de remboursement créée",
            "refund": {
                "id": refund_id,
                "status": refund_doc["status"],
                "status_label": REFUND_STATUSES.get(refund_doc["status"]),
                "amount": amount,
                "currency": currency,
                "auto_approved": auto_approve
            }
        }
    
    @refunds_router.get("/my-requests")
    async def get_my_refund_requests(
        current_user: dict = Depends(get_current_user)
    ):
        """Get all refund requests for current user"""
        user_id = current_user["id"]
        
        requests = await db.refund_requests.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        # Add status labels
        for req in requests:
            req["status_label"] = REFUND_STATUSES.get(req.get("status"), req.get("status"))
        
        return {"requests": requests, "count": len(requests)}
    
    @refunds_router.get("/request/{refund_id}")
    async def get_refund_request(
        refund_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get details of a specific refund request"""
        user_id = current_user["id"]
        
        request = await db.refund_requests.find_one(
            {"id": refund_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        request["status_label"] = REFUND_STATUSES.get(request.get("status"), request.get("status"))
        
        # Get original transaction
        transaction = await db.transactions.find_one(
            {"id": request["transaction_id"]},
            {"_id": 0}
        )
        
        return {
            "request": request,
            "transaction": transaction
        }
    
    @refunds_router.post("/cancel/{refund_id}")
    async def cancel_refund_request(
        refund_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Cancel a pending refund request"""
        user_id = current_user["id"]
        
        request = await db.refund_requests.find_one(
            {"id": refund_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if request["status"] not in ["pending"]:
            raise HTTPException(status_code=400, detail="Cette demande ne peut plus être annulée")
        
        await db.refund_requests.update_one(
            {"id": refund_id},
            {"$set": {
                "status": "cancelled",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Demande de remboursement annulée"}
    
    # ==================== ADMIN ROUTES ====================
    
    @refunds_router.get("/admin/list")
    async def admin_list_refunds(
        status: Optional[str] = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Admin: List all refund requests"""
        query = {}
        if status:
            query["status"] = status
        
        requests = await db.refund_requests.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Add status labels
        for req in requests:
            req["status_label"] = REFUND_STATUSES.get(req.get("status"), req.get("status"))
        
        # Get stats
        stats = {
            "total": await db.refund_requests.count_documents({}),
            "pending": await db.refund_requests.count_documents({"status": "pending"}),
            "processing": await db.refund_requests.count_documents({"status": "processing"}),
            "completed": await db.refund_requests.count_documents({"status": "completed"}),
            "rejected": await db.refund_requests.count_documents({"status": "rejected"})
        }
        
        return {"requests": requests, "stats": stats}
    
    @refunds_router.post("/admin/review/{refund_id}")
    async def admin_review_refund(
        refund_id: str,
        review: RefundReview,
        background_tasks: BackgroundTasks,
        admin: dict = Depends(get_admin_user)
    ):
        """Admin: Review and approve/reject a refund request"""
        
        request = await db.refund_requests.find_one(
            {"id": refund_id},
            {"_id": 0}
        )
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if request["status"] not in ["pending", "processing"]:
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        now = datetime.now(timezone.utc)
        
        if review.action == "approve":
            # Get original transaction
            transaction = await db.transactions.find_one(
                {"id": request["transaction_id"]},
                {"_id": 0}
            )
            
            if not transaction:
                raise HTTPException(status_code=400, detail="Transaction originale introuvable")
            
            # Get user
            user = await db.users.find_one(
                {"id": request["user_id"]},
                {"_id": 0}
            )
            
            # Process the refund
            await process_refund(db, request, transaction, user, background_tasks, send_push_notification)
            
            # Update request status
            await db.refund_requests.update_one(
                {"id": refund_id},
                {"$set": {
                    "status": "completed",
                    "admin_note": review.admin_note,
                    "reviewed_by": admin["id"],
                    "reviewed_at": now.isoformat(),
                    "completed_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }}
            )
            
            message = "Remboursement approuvé et effectué"
            
        elif review.action == "reject":
            await db.refund_requests.update_one(
                {"id": refund_id},
                {"$set": {
                    "status": "rejected",
                    "admin_note": review.admin_note,
                    "reviewed_by": admin["id"],
                    "reviewed_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }}
            )
            
            # Notify user of rejection
            background_tasks.add_task(
                send_push_notification,
                request["user_id"],
                "Demande de remboursement rejetée",
                f"Votre demande de {request['amount']:,.0f} {request['currency']} a été rejetée. Raison: {review.admin_note or 'Non spécifiée'}"
            )
            
            message = "Demande de remboursement rejetée"
        else:
            raise HTTPException(status_code=400, detail="Action invalide")
        
        return {"message": message, "status": review.action}
    
    return refunds_router


async def process_refund(db, refund_request, transaction, user, background_tasks, send_push_notification):
    """Process a refund: credit user wallet and update records"""
    user_id = refund_request["user_id"]
    amount = refund_request["amount"]
    currency = refund_request["currency"]
    now = datetime.now(timezone.utc)
    
    # Find user's wallet
    wallet = await db.wallets.find_one(
        {"user_id": user_id, "currency": currency},
        {"_id": 0}
    )
    
    if wallet:
        # Credit the wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {
                "$inc": {"balance": amount},
                "$set": {"updated_at": now.isoformat()}
            }
        )
    
    # Create refund transaction record
    refund_tx = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "refund",
        "amount": amount,
        "currency": currency,
        "status": "completed",
        "description": f"Remboursement - {refund_request.get('reason_label', 'N/A')}",
        "reference": f"REF-{refund_request['id'][:8].upper()}",
        "original_transaction_id": transaction["id"],
        "created_at": now.isoformat()
    }
    
    await db.transactions.insert_one(refund_tx)
    
    # Update original transaction status
    await db.transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"status": "refunded", "refunded_at": now.isoformat()}}
    )
    
    # Notify user
    if user:
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Remboursement effectué",
            f"{amount:,.0f} {currency} ont été crédités sur votre wallet"
        )
