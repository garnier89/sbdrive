# Module Partenaires / Agents SB Pay
# Gestion des agents de retrait cash

from fastapi import APIRouter, HTTPException, Header, Depends, BackgroundTasks, UploadFile, File, Form
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import jwt
import uuid
import hashlib
import secrets
import base64

partners_router = APIRouter(prefix="/api/partners", tags=["Partners/Agents"])

# Status des partenaires
PARTNER_STATUSES = {
    "pending": {"name": "En attente", "color": "amber"},
    "active": {"name": "Actif", "color": "green"},
    "suspended": {"name": "Suspendu", "color": "red"},
    "rejected": {"name": "Rejeté", "color": "gray"}
}

class PartnerRegistration(BaseModel):
    business_name: str
    owner_name: str
    email: EmailStr
    phone: str
    address: str
    city: str
    country: str
    password: str

class WithdrawalRequest(BaseModel):
    client_identifier: str  # Phone number or QR code
    amount: float
    currency: str = "EUR"

class WithdrawalConfirm(BaseModel):
    withdrawal_id: str
    otp_code: str

def setup_partners_routes(db, jwt_secret, jwt_algorithm, hash_password, verify_password, create_access_token, send_push_notification):
    """Setup partners routes with database access"""

    async def get_current_partner(authorization: str):
        """Get current authenticated partner"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            partner_id = payload.get("sub")
            if not payload.get("is_partner"):
                raise HTTPException(status_code=403, detail="Partner access required")
            partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
            if not partner:
                raise HTTPException(status_code=404, detail="Partner not found")
            if partner.get("status") != "active":
                raise HTTPException(status_code=403, detail="Partner account not active")
            return partner
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")

    async def get_admin_user(authorization: str):
        """Get current authenticated admin"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user or user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin access required")
            return user
        except:
            raise HTTPException(status_code=401, detail="Invalid token")

    # ==================== PARTNER REGISTRATION ====================

    @partners_router.post("/register")
    async def register_partner(request: PartnerRegistration):
        """Register a new partner/agent"""
        # Check if email already exists
        existing = await db.partners.find_one({"email": request.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        
        # Check if phone already exists
        existing_phone = await db.partners.find_one({"phone": request.phone})
        if existing_phone:
            raise HTTPException(status_code=400, detail="Numéro de téléphone déjà utilisé")
        
        now = datetime.now(timezone.utc)
        partner_id = str(uuid.uuid4())
        partner_code = f"AG-{secrets.token_hex(4).upper()}"
        
        partner = {
            "id": partner_id,
            "partner_code": partner_code,
            "business_name": request.business_name,
            "owner_name": request.owner_name,
            "email": request.email,
            "phone": request.phone,
            "address": request.address,
            "city": request.city,
            "country": request.country,
            "password_hash": hash_password(request.password),
            "status": "pending",
            "kyc_status": "pending",
            "wallet_balance": 0,
            "wallet_currency": "EUR",
            "daily_limit": 5000,
            "daily_withdrawn": 0,
            "total_withdrawals": 0,
            "total_amount_withdrawn": 0,
            "documents": [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.partners.insert_one(partner)
        
        # Notify admins
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "new_partner_registration",
            "title": "Nouvelle inscription partenaire",
            "message": f"{request.business_name} ({request.owner_name}) a demandé à devenir partenaire",
            "partner_id": partner_id,
            "read": False,
            "created_at": now.isoformat()
        })
        
        return {
            "message": "Inscription enregistrée. En attente de validation.",
            "partner_code": partner_code
        }

    @partners_router.post("/login")
    async def partner_login(request: dict):
        """Partner login"""
        email = request.get("email", "").strip()
        password = request.get("password", "")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email et mot de passe requis")
        
        partner = await db.partners.find_one({"email": email})
        if not partner:
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
        
        if not verify_password(password, partner.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Identifiants incorrects")
        
        if partner.get("status") == "pending":
            raise HTTPException(status_code=403, detail="Votre compte est en attente de validation")
        
        if partner.get("status") == "suspended":
            raise HTTPException(status_code=403, detail="Votre compte a été suspendu")
        
        if partner.get("status") == "rejected":
            raise HTTPException(status_code=403, detail="Votre demande de partenariat a été rejetée")
        
        # Create token with partner flag
        token = create_access_token(
            data={"sub": partner["id"], "is_partner": True}
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "partner": {
                "id": partner["id"],
                "partner_code": partner["partner_code"],
                "business_name": partner["business_name"],
                "owner_name": partner["owner_name"],
                "email": partner["email"],
                "wallet_balance": partner.get("wallet_balance", 0),
                "wallet_currency": partner.get("wallet_currency", "EUR"),
                "status": partner["status"]
            }
        }

    # ==================== PARTNER DASHBOARD ====================

    @partners_router.get("/me")
    async def get_partner_profile(authorization: str = Header(None)):
        """Get current partner profile"""
        partner = await get_current_partner(authorization)
        
        # Remove sensitive data
        partner.pop("password_hash", None)
        
        return partner

    @partners_router.get("/dashboard")
    async def get_partner_dashboard(authorization: str = Header(None)):
        """Get partner dashboard data"""
        partner = await get_current_partner(authorization)
        
        # Get today's stats
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        today_withdrawals = await db.partner_withdrawals.count_documents({
            "partner_id": partner["id"],
            "created_at": {"$gte": today.isoformat()},
            "status": "completed"
        })
        
        today_amount = 0
        cursor = db.partner_withdrawals.find({
            "partner_id": partner["id"],
            "created_at": {"$gte": today.isoformat()},
            "status": "completed"
        })
        async for w in cursor:
            today_amount += w.get("amount", 0)
        
        # Recent withdrawals
        recent = await db.partner_withdrawals.find(
            {"partner_id": partner["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        return {
            "wallet_balance": partner.get("wallet_balance", 0),
            "wallet_currency": partner.get("wallet_currency", "EUR"),
            "daily_limit": partner.get("daily_limit", 5000),
            "daily_withdrawn": today_amount,
            "today_withdrawals": today_withdrawals,
            "total_withdrawals": partner.get("total_withdrawals", 0),
            "recent_withdrawals": recent
        }

    # ==================== CASH WITHDRAWAL PROCESS ====================

    @partners_router.post("/withdrawal/initiate")
    async def initiate_withdrawal(
        request: WithdrawalRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Initiate a cash withdrawal for a client"""
        partner = await get_current_partner(authorization)
        
        # Find client by phone or QR code
        client_identifier = request.client_identifier.strip()
        
        # Try to find by phone
        client = await db.users.find_one(
            {"phone": {"$regex": client_identifier.replace("+", "\\+"), "$options": "i"}},
            {"_id": 0}
        )
        
        if not client:
            # Try by user ID (from QR code)
            client = await db.users.find_one({"id": client_identifier}, {"_id": 0})
        
        if not client:
            # Try by email
            client = await db.users.find_one({"email": client_identifier.lower()}, {"_id": 0})
        
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé. Vérifiez le numéro ou le code QR.")
        
        # Check client wallet balance
        wallet = await db.wallets.find_one({
            "user_id": client["id"],
            "currency": request.currency
        })
        
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde client insuffisant")
        
        # Check partner daily limit
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_amount = 0
        cursor = db.partner_withdrawals.find({
            "partner_id": partner["id"],
            "created_at": {"$gte": today.isoformat()},
            "status": "completed"
        })
        async for w in cursor:
            today_amount += w.get("amount", 0)
        
        if today_amount + request.amount > partner.get("daily_limit", 5000):
            raise HTTPException(status_code=400, detail="Limite journalière dépassée")
        
        # Generate OTP for client
        otp_code = str(secrets.randbelow(900000) + 100000)
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        
        now = datetime.now(timezone.utc)
        withdrawal_id = str(uuid.uuid4())
        
        withdrawal = {
            "id": withdrawal_id,
            "partner_id": partner["id"],
            "partner_code": partner["partner_code"],
            "partner_name": partner["business_name"],
            "client_id": client["id"],
            "client_name": client.get("full_name", ""),
            "client_phone": client.get("phone", ""),
            "amount": request.amount,
            "currency": request.currency,
            "otp_hash": otp_hash,
            "otp_expires": (now.replace(microsecond=0) + timezone.utc.utcoffset(now) if timezone.utc.utcoffset(now) else now).isoformat(),
            "status": "pending_otp",
            "created_at": now.isoformat()
        }
        
        # Store OTP expiry (5 minutes)
        from datetime import timedelta
        withdrawal["otp_expires"] = (now + timedelta(minutes=5)).isoformat()
        
        await db.partner_withdrawals.insert_one(withdrawal)
        
        # Send OTP to client (mocked - would use Twilio in production)
        background_tasks.add_task(
            send_push_notification,
            client["id"],
            "Code de retrait",
            f"Votre code de retrait chez {partner['business_name']}: {otp_code}. Valide 5 minutes."
        )
        
        # Mask client name for display
        name_parts = client.get("full_name", "Client").split()
        masked_name = name_parts[0] if name_parts else "Client"
        if len(name_parts) > 1:
            masked_name += " " + name_parts[-1][0] + "."
        
        return {
            "withdrawal_id": withdrawal_id,
            "client_name": masked_name,
            "client_phone_masked": client.get("phone", "")[-4:].rjust(len(client.get("phone", "")), "*"),
            "amount": request.amount,
            "currency": request.currency,
            "message": f"Code OTP envoyé au client. Valide 5 minutes.",
            # For demo purposes, include OTP (remove in production)
            "demo_otp": otp_code
        }

    @partners_router.post("/withdrawal/confirm")
    async def confirm_withdrawal(
        request: WithdrawalConfirm,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Confirm withdrawal with OTP"""
        partner = await get_current_partner(authorization)
        
        withdrawal = await db.partner_withdrawals.find_one({
            "id": request.withdrawal_id,
            "partner_id": partner["id"]
        })
        
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Retrait non trouvé")
        
        if withdrawal.get("status") != "pending_otp":
            raise HTTPException(status_code=400, detail="Ce retrait a déjà été traité")
        
        # Check OTP expiry
        now = datetime.now(timezone.utc)
        otp_expires = datetime.fromisoformat(withdrawal["otp_expires"].replace("Z", "+00:00"))
        if now > otp_expires:
            await db.partner_withdrawals.update_one(
                {"id": request.withdrawal_id},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(status_code=400, detail="Code OTP expiré")
        
        # Verify OTP
        otp_hash = hashlib.sha256(request.otp_code.encode()).hexdigest()
        if otp_hash != withdrawal.get("otp_hash"):
            raise HTTPException(status_code=400, detail="Code OTP incorrect")
        
        # Process withdrawal
        client_id = withdrawal["client_id"]
        amount = withdrawal["amount"]
        currency = withdrawal["currency"]
        
        # Debit client wallet
        result = await db.wallets.update_one(
            {"user_id": client_id, "currency": currency, "balance": {"$gte": amount}},
            {"$inc": {"balance": -amount}}
        )
        
        if result.modified_count == 0:
            await db.partner_withdrawals.update_one(
                {"id": request.withdrawal_id},
                {"$set": {"status": "failed", "error": "Insufficient balance"}}
            )
            raise HTTPException(status_code=400, detail="Solde client insuffisant")
        
        # Credit partner wallet
        await db.partners.update_one(
            {"id": partner["id"]},
            {
                "$inc": {
                    "wallet_balance": amount,
                    "total_withdrawals": 1,
                    "total_amount_withdrawn": amount
                }
            }
        )
        
        # Update withdrawal status
        await db.partner_withdrawals.update_one(
            {"id": request.withdrawal_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now.isoformat()
                }
            }
        )
        
        # Create transaction records
        tx_id = str(uuid.uuid4())
        await db.transactions.insert_one({
            "id": tx_id,
            "user_id": client_id,
            "type": "partner_withdrawal",
            "amount": -amount,
            "currency": currency,
            "description": f"Retrait cash chez {partner['business_name']}",
            "status": "completed",
            "partner_id": partner["id"],
            "partner_code": partner["partner_code"],
            "withdrawal_id": request.withdrawal_id,
            "created_at": now.isoformat()
        })
        
        # Notify client
        background_tasks.add_task(
            send_push_notification,
            client_id,
            "Retrait effectué",
            f"Retrait de {amount} {currency} chez {partner['business_name']} confirmé."
        )
        
        return {
            "message": "Retrait confirmé avec succès",
            "withdrawal_id": request.withdrawal_id,
            "amount": amount,
            "currency": currency,
            "partner_new_balance": partner.get("wallet_balance", 0) + amount
        }

    @partners_router.post("/withdrawal/cancel/{withdrawal_id}")
    async def cancel_withdrawal(
        withdrawal_id: str,
        authorization: str = Header(None)
    ):
        """Cancel a pending withdrawal"""
        partner = await get_current_partner(authorization)
        
        result = await db.partner_withdrawals.update_one(
            {
                "id": withdrawal_id,
                "partner_id": partner["id"],
                "status": "pending_otp"
            },
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Retrait non trouvable ou déjà traité")
        
        return {"message": "Retrait annulé"}

    # ==================== PARTNER DOCUMENTS ====================

    @partners_router.post("/documents/upload")
    async def upload_partner_document(
        file: UploadFile = File(...),
        document_type: str = Form(...),
        authorization: str = Header(None)
    ):
        """Upload partner KYC document"""
        partner = await get_current_partner(authorization)
        
        valid_types = ["id_card", "business_license", "shop_photo", "proof_of_address"]
        if document_type not in valid_types:
            raise HTTPException(status_code=400, detail="Type de document invalide")
        
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 5MB)")
        
        doc_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        document = {
            "id": doc_id,
            "type": document_type,
            "filename": file.filename,
            "content_type": file.content_type,
            "file_data": base64.b64encode(content).decode('utf-8'),
            "status": "pending",
            "uploaded_at": now.isoformat()
        }
        
        await db.partners.update_one(
            {"id": partner["id"]},
            {"$push": {"documents": document}}
        )
        
        return {"message": "Document téléchargé", "document_id": doc_id}

    # ==================== ADMIN PARTNER MANAGEMENT ====================

    @partners_router.get("/admin/list")
    async def admin_list_partners(
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Admin: List all partners"""
        await get_admin_user(authorization)
        
        query = {}
        if status:
            query["status"] = status
        
        partners = await db.partners.find(
            query,
            {"_id": 0, "password_hash": 0, "documents.file_data": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.partners.count_documents(query)
        
        # Get stats
        pending = await db.partners.count_documents({"status": "pending"})
        active = await db.partners.count_documents({"status": "active"})
        suspended = await db.partners.count_documents({"status": "suspended"})
        
        return {
            "partners": partners,
            "total": total,
            "stats": {
                "pending": pending,
                "active": active,
                "suspended": suspended
            }
        }

    @partners_router.get("/admin/{partner_id}")
    async def admin_get_partner(
        partner_id: str,
        authorization: str = Header(None)
    ):
        """Admin: Get partner details"""
        await get_admin_user(authorization)
        
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "password_hash": 0})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        # Get recent withdrawals
        withdrawals = await db.partner_withdrawals.find(
            {"partner_id": partner_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        partner["withdrawals"] = withdrawals
        
        return partner

    @partners_router.put("/admin/{partner_id}/status")
    async def admin_update_partner_status(
        partner_id: str,
        request: dict,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Admin: Update partner status"""
        admin = await get_admin_user(authorization)
        
        new_status = request.get("status")
        reason = request.get("reason", "")
        
        if new_status not in PARTNER_STATUSES:
            raise HTTPException(status_code=400, detail="Statut invalide")
        
        partner = await db.partners.find_one({"id": partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        now = datetime.now(timezone.utc)
        
        update_data = {
            "status": new_status,
            "updated_at": now.isoformat(),
            "status_updated_by": admin["id"],
            "status_reason": reason
        }
        
        if new_status == "active":
            update_data["activated_at"] = now.isoformat()
            update_data["kyc_status"] = "verified"
        
        await db.partners.update_one({"id": partner_id}, {"$set": update_data})
        
        # Notify partner
        status_messages = {
            "active": "Votre compte partenaire SB Pay a été activé!",
            "suspended": f"Votre compte partenaire a été suspendu. Raison: {reason}",
            "rejected": f"Votre demande de partenariat a été rejetée. Raison: {reason}"
        }
        
        if new_status in status_messages:
            await db.admin_notifications.insert_one({
                "id": str(uuid.uuid4()),
                "type": "partner_status_update",
                "partner_id": partner_id,
                "title": f"Partenaire {new_status}",
                "message": f"{partner['business_name']} - {status_messages[new_status]}",
                "read": False,
                "created_at": now.isoformat()
            })
        
        return {
            "message": f"Statut mis à jour: {PARTNER_STATUSES[new_status]['name']}",
            "new_status": new_status
        }

    @partners_router.put("/admin/{partner_id}/limits")
    async def admin_update_partner_limits(
        partner_id: str,
        request: dict,
        authorization: str = Header(None)
    ):
        """Admin: Update partner limits"""
        await get_admin_user(authorization)
        
        partner = await db.partners.find_one({"id": partner_id})
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        update_data = {}
        if "daily_limit" in request:
            update_data["daily_limit"] = float(request["daily_limit"])
        
        if update_data:
            await db.partners.update_one({"id": partner_id}, {"$set": update_data})
        
        return {"message": "Limites mises à jour", "limits": update_data}

    return partners_router
