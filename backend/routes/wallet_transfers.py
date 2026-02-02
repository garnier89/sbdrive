# Module Transferts entre Utilisateurs SB Pay
# Routes pour les transferts P2P via numéro de téléphone

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import random
import string

# Create router
wallet_transfers_router = APIRouter(prefix="/api/wallet", tags=["Wallet Transfers"])

# ==================== MODELS ====================

class PhoneTransferRequest(BaseModel):
    recipient_phone: str
    amount: float = Field(..., gt=0)
    currency: str = "XOF"
    description: Optional[str] = None

class PhoneTransferOTPVerify(BaseModel):
    transfer_id: str
    otp_code: str

class PhoneLookupRequest(BaseModel):
    phone_number: str

# ==================== FEE CONFIGURATION ====================

# Frais de transfert P2P (gratuit pour encourager l'adoption)
P2P_TRANSFER_FEE_PERCENT = 0.0  # 0% pour les transferts entre utilisateurs SB Pay
P2P_TRANSFER_FEE_FIXED = 0  # Pas de frais fixes

# Limites de transfert par jour (en XOF)
DAILY_TRANSFER_LIMITS = {
    "unverified": 50000,     # Non vérifié: 50,000 XOF/jour
    "pending": 100000,       # En attente: 100,000 XOF/jour  
    "verified": 2000000,     # Vérifié: 2,000,000 XOF/jour
}

# Limites par transaction
MAX_SINGLE_TRANSFER = 500000  # Max 500,000 XOF par transaction

# ==================== HELPER FUNCTIONS ====================

def generate_otp() -> str:
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def hash_otp(otp: str) -> str:
    """Hash OTP for secure storage"""
    return hashlib.sha256(otp.encode()).hexdigest()

def generate_reference(prefix: str = "P2P") -> str:
    """Generate unique transaction reference"""
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"

def normalize_phone(phone: str) -> str:
    """Normalize phone number (remove spaces, dashes, etc.)"""
    # Remove common separators
    normalized = phone.replace(" ", "").replace("-", "").replace(".", "")
    # Ensure it starts with proper format
    if normalized.startswith("00"):
        normalized = "+" + normalized[2:]
    elif not normalized.startswith("+"):
        # Assume local format, add default country code (Senegal +221)
        if normalized.startswith("0"):
            normalized = "+221" + normalized[1:]
        elif len(normalized) == 9:  # Short format like 77XXXXXXX
            normalized = "+221" + normalized
    return normalized

# ==================== ROUTE SETUP ====================

def setup_wallet_transfer_routes(db, get_current_user, send_sms_notification, send_push_notification, send_email_notification):
    """Setup wallet transfer routes with database access"""
    
    @wallet_transfers_router.get("/users/lookup-phone")
    async def lookup_user_by_phone(
        phone: str,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Look up a SB Pay user by their phone number.
        Returns basic info if user exists, without revealing sensitive data.
        """
        normalized_phone = normalize_phone(phone)
        
        # Search for user by phone
        user = await db.users.find_one(
            {"phone": normalized_phone},
            {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "phone": 1, "is_active": 1}
        )
        
        if not user:
            # Try without country code
            partial_phone = normalized_phone[-9:] if len(normalized_phone) > 9 else normalized_phone
            user = await db.users.find_one(
                {"phone": {"$regex": f".*{partial_phone}$"}},
                {"_id": 0, "id": 1, "first_name": 1, "last_name": 1, "phone": 1, "is_active": 1}
            )
        
        if not user:
            raise HTTPException(
                status_code=404, 
                detail="Aucun utilisateur SB Pay trouvé avec ce numéro"
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=400,
                detail="Ce compte est désactivé"
            )
        
        # Check if trying to send to self
        if user["id"] == current_user["id"]:
            raise HTTPException(
                status_code=400,
                detail="Vous ne pouvez pas vous envoyer de l'argent à vous-même"
            )
        
        # Return masked info for privacy
        first_name = user.get("first_name", "")
        last_name = user.get("last_name", "")
        
        # Mask last name (show only first letter)
        masked_last_name = last_name[0] + "." if last_name else ""
        
        return {
            "found": True,
            "user_id": user["id"],
            "display_name": f"{first_name} {masked_last_name}".strip(),
            "phone_masked": f"***{normalized_phone[-4:]}" if len(normalized_phone) > 4 else normalized_phone
        }

    @wallet_transfers_router.post("/transfer-phone")
    async def create_phone_transfer(
        request: PhoneTransferRequest,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Initiate a transfer to another SB Pay user via phone number.
        """
        user_id = current_user["id"]
        normalized_phone = normalize_phone(request.recipient_phone)
        
        # 1. Find recipient by phone
        recipient = await db.users.find_one(
            {"phone": normalized_phone},
            {"_id": 0}
        )
        
        if not recipient:
            # Try partial match
            partial_phone = normalized_phone[-9:] if len(normalized_phone) > 9 else normalized_phone
            recipient = await db.users.find_one(
                {"phone": {"$regex": f".*{partial_phone}$"}},
                {"_id": 0}
            )
        
        if not recipient:
            raise HTTPException(
                status_code=404,
                detail="Aucun utilisateur SB Pay trouvé avec ce numéro"
            )
        
        if recipient["id"] == user_id:
            raise HTTPException(
                status_code=400,
                detail="Vous ne pouvez pas vous envoyer de l'argent à vous-même"
            )
        
        if not recipient.get("is_active", True):
            raise HTTPException(
                status_code=400,
                detail="Le compte du destinataire est désactivé"
            )
        
        # 2. Validate amount
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Montant invalide")
        
        if request.amount > MAX_SINGLE_TRANSFER:
            raise HTTPException(
                status_code=400,
                detail=f"Montant maximum par transfert: {MAX_SINGLE_TRANSFER:,} {request.currency}"
            )
        
        # 3. Check sender's daily limit based on KYC
        kyc_status = current_user.get("kyc_status", "unverified")
        daily_limit = DAILY_TRANSFER_LIMITS.get(kyc_status, DAILY_TRANSFER_LIMITS["unverified"])
        
        # Calculate today's transfers
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        today_transfers = await db.transactions.aggregate([
            {
                "$match": {
                    "user_id": user_id,
                    "type": {"$in": ["p2p_transfer_out", "transfer_out"]},
                    "status": "completed",
                    "created_at": {"$gte": today_start.isoformat()}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": {"$abs": "$amount"}}
                }
            }
        ]).to_list(1)
        
        today_total = today_transfers[0]["total"] if today_transfers else 0
        
        if today_total + request.amount > daily_limit:
            raise HTTPException(
                status_code=400,
                detail=f"Limite journalière atteinte ({daily_limit:,} {request.currency}). Déjà transféré: {today_total:,}"
            )
        
        # 4. Check sender's wallet balance
        sender_wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        if not sender_wallet or sender_wallet.get("balance", 0) < request.amount:
            raise HTTPException(
                status_code=400,
                detail="Solde insuffisant"
            )
        
        # 5. Calculate fees (free for P2P)
        fee = round(request.amount * P2P_TRANSFER_FEE_PERCENT / 100) + P2P_TRANSFER_FEE_FIXED
        total_amount = request.amount + fee
        
        if sender_wallet.get("balance", 0) < total_amount:
            raise HTTPException(
                status_code=400,
                detail="Solde insuffisant pour couvrir le montant et les frais"
            )
        
        now = datetime.now(timezone.utc)
        transfer_id = str(uuid.uuid4())
        reference = generate_reference("P2P")
        
        # 6. Check if 2FA is required (for amounts > 100,000 XOF or user preference)
        requires_otp = request.amount > 100000 or current_user.get("two_factor_enabled", False)
        
        if requires_otp:
            # Generate and store OTP
            otp = generate_otp()
            otp_hash = hash_otp(otp)
            
            # Store pending transfer
            pending_transfer = {
                "id": transfer_id,
                "user_id": user_id,
                "recipient_id": recipient["id"],
                "recipient_phone": normalized_phone,
                "recipient_name": f"{recipient.get('first_name', '')} {recipient.get('last_name', '')}".strip(),
                "amount": request.amount,
                "fee": fee,
                "total_amount": total_amount,
                "currency": request.currency,
                "description": request.description,
                "reference": reference,
                "status": "pending_otp",
                "otp_hash": otp_hash,
                "otp_expires_at": (now + timedelta(minutes=5)).isoformat(),
                "otp_attempts": 0,
                "created_at": now.isoformat()
            }
            
            await db.pending_p2p_transfers.insert_one(pending_transfer)
            
            # Send OTP via SMS
            sender_phone = current_user.get("phone")
            if sender_phone:
                background_tasks.add_task(
                    send_sms_notification,
                    sender_phone,
                    f"SB Pay: Votre code de confirmation pour le transfert de {request.amount:,} {request.currency} est: {otp}. Valide 5 min."
                )
            
            return {
                "message": "Code de vérification envoyé par SMS",
                "transfer_id": transfer_id,
                "requires_otp": True,
                "recipient_name": pending_transfer["recipient_name"],
                "amount": request.amount,
                "fee": fee,
                "total": total_amount,
                "currency": request.currency
            }
        
        # 7. Execute transfer immediately (no OTP required)
        result = await execute_transfer(
            db, transfer_id, user_id, recipient["id"], 
            request.amount, fee, request.currency, 
            reference, request.description, 
            recipient.get('first_name', ''), recipient.get('last_name', ''),
            normalized_phone, current_user, recipient,
            background_tasks, send_push_notification, send_email_notification
        )
        
        return result

    @wallet_transfers_router.post("/transfer-phone/verify")
    async def verify_phone_transfer_otp(
        request: PhoneTransferOTPVerify,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Verify OTP and complete the phone transfer.
        """
        user_id = current_user["id"]
        
        # Find pending transfer
        pending = await db.pending_p2p_transfers.find_one({
            "id": request.transfer_id,
            "user_id": user_id,
            "status": "pending_otp"
        })
        
        if not pending:
            raise HTTPException(
                status_code=404,
                detail="Transfert non trouvé ou déjà traité"
            )
        
        # Check OTP expiration
        if datetime.fromisoformat(pending["otp_expires_at"]) < datetime.now(timezone.utc):
            await db.pending_p2p_transfers.update_one(
                {"id": request.transfer_id},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(
                status_code=400,
                detail="Code expiré. Veuillez recommencer le transfert."
            )
        
        # Check OTP attempts
        if pending.get("otp_attempts", 0) >= 3:
            await db.pending_p2p_transfers.update_one(
                {"id": request.transfer_id},
                {"$set": {"status": "blocked"}}
            )
            raise HTTPException(
                status_code=400,
                detail="Trop de tentatives. Transfert bloqué."
            )
        
        # Verify OTP
        if hash_otp(request.otp_code) != pending["otp_hash"]:
            await db.pending_p2p_transfers.update_one(
                {"id": request.transfer_id},
                {"$inc": {"otp_attempts": 1}}
            )
            raise HTTPException(
                status_code=400,
                detail="Code incorrect"
            )
        
        # Get recipient info
        recipient = await db.users.find_one({"id": pending["recipient_id"]}, {"_id": 0})
        if not recipient:
            raise HTTPException(status_code=400, detail="Destinataire non trouvé")
        
        # Execute the transfer
        result = await execute_transfer(
            db, pending["id"], user_id, pending["recipient_id"],
            pending["amount"], pending["fee"], pending["currency"],
            pending["reference"], pending.get("description"),
            recipient.get('first_name', ''), recipient.get('last_name', ''),
            pending["recipient_phone"], current_user, recipient,
            background_tasks, send_push_notification, send_email_notification
        )
        
        # Mark pending transfer as completed
        await db.pending_p2p_transfers.update_one(
            {"id": request.transfer_id},
            {"$set": {"status": "completed"}}
        )
        
        return result

    @wallet_transfers_router.get("/transfer-phone/history")
    async def get_phone_transfer_history(
        current_user: dict = Depends(get_current_user),
        limit: int = 20,
        offset: int = 0
    ):
        """
        Get user's P2P transfer history.
        """
        user_id = current_user["id"]
        
        # Get transfers where user is sender or recipient
        transfers = await db.p2p_transfers.find(
            {"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]},
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        
        # Add direction flag
        for t in transfers:
            t["direction"] = "sent" if t.get("sender_id") == user_id else "received"
        
        return {"transfers": transfers, "count": len(transfers)}

    @wallet_transfers_router.get("/transfer-phone/contacts")
    async def get_recent_transfer_contacts(
        current_user: dict = Depends(get_current_user),
        limit: int = 10
    ):
        """
        Get recent contacts from P2P transfer history.
        """
        user_id = current_user["id"]
        
        # Get unique recipients from recent transfers
        pipeline = [
            {"$match": {"sender_id": user_id, "status": "completed"}},
            {"$sort": {"created_at": -1}},
            {"$group": {
                "_id": "$recipient_id",
                "recipient_name": {"$first": "$recipient_name"},
                "recipient_phone": {"$first": "$recipient_phone"},
                "last_transfer_at": {"$first": "$created_at"},
                "transfer_count": {"$sum": 1}
            }},
            {"$limit": limit},
            {"$project": {
                "_id": 0,
                "user_id": "$_id",
                "name": "$recipient_name",
                "phone_masked": {"$concat": ["***", {"$substr": ["$recipient_phone", -4, 4]}]},
                "last_transfer_at": 1,
                "transfer_count": 1
            }}
        ]
        
        contacts = await db.p2p_transfers.aggregate(pipeline).to_list(length=limit)
        return {"contacts": contacts}

    return wallet_transfers_router


async def execute_transfer(
    db, transfer_id, sender_id, recipient_id, 
    amount, fee, currency, reference, description,
    recipient_first_name, recipient_last_name, recipient_phone,
    sender, recipient,
    background_tasks, send_push_notification, send_email_notification
):
    """Execute the actual transfer between wallets."""
    now = datetime.now(timezone.utc)
    total_amount = amount + fee
    recipient_name = f"{recipient_first_name} {recipient_last_name}".strip()
    sender_name = f"{sender.get('first_name', '')} {sender.get('last_name', '')}".strip()
    
    # 1. Debit sender's wallet
    sender_wallet_result = await db.wallets.update_one(
        {"user_id": sender_id, "currency": currency, "balance": {"$gte": total_amount}},
        {
            "$inc": {"balance": -total_amount},
            "$set": {"updated_at": now.isoformat()}
        }
    )
    
    if sender_wallet_result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Solde insuffisant ou wallet non trouvé")
    
    # 2. Credit recipient's wallet
    recipient_wallet = await db.wallets.find_one({
        "user_id": recipient_id,
        "currency": currency
    })
    
    if recipient_wallet:
        await db.wallets.update_one(
            {"user_id": recipient_id, "currency": currency},
            {
                "$inc": {"balance": amount},  # Recipient gets full amount (no fee)
                "$set": {"updated_at": now.isoformat()}
            }
        )
    else:
        # Create wallet if doesn't exist
        await db.wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": recipient_id,
            "currency": currency,
            "balance": amount,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        })
    
    # 3. Create P2P transfer record
    transfer_record = {
        "id": transfer_id,
        "sender_id": sender_id,
        "sender_name": sender_name,
        "sender_email": sender.get("email"),
        "recipient_id": recipient_id,
        "recipient_name": recipient_name,
        "recipient_phone": recipient_phone,
        "recipient_email": recipient.get("email"),
        "amount": amount,
        "fee": fee,
        "currency": currency,
        "reference": reference,
        "description": description or f"Transfert à {recipient_name}",
        "status": "completed",
        "created_at": now.isoformat(),
        "completed_at": now.isoformat()
    }
    
    await db.p2p_transfers.insert_one(transfer_record)
    
    # 4. Create transaction records for both users
    sender_transaction = {
        "id": str(uuid.uuid4()),
        "user_id": sender_id,
        "type": "p2p_transfer_out",
        "amount": -amount,
        "fee": fee,
        "currency": currency,
        "status": "completed",
        "reference": reference,
        "description": f"Transfert à {recipient_name} ({recipient_phone[-4:]})",
        "counterparty_name": recipient_name,
        "counterparty_phone": recipient_phone,
        "created_at": now.isoformat()
    }
    
    recipient_transaction = {
        "id": str(uuid.uuid4()),
        "user_id": recipient_id,
        "type": "p2p_transfer_in",
        "amount": amount,
        "fee": 0,
        "currency": currency,
        "status": "completed",
        "reference": reference,
        "description": f"Reçu de {sender_name}",
        "counterparty_name": sender_name,
        "counterparty_email": sender.get("email"),
        "created_at": now.isoformat()
    }
    
    await db.transactions.insert_many([sender_transaction, recipient_transaction])
    
    # 5. Send notifications
    # Push notification to sender
    background_tasks.add_task(
        send_push_notification,
        sender_id,
        "Transfert envoyé",
        f"{amount:,.0f} {currency} envoyé à {recipient_name}"
    )
    
    # Push notification to recipient
    background_tasks.add_task(
        send_push_notification,
        recipient_id,
        "Argent reçu",
        f"Vous avez reçu {amount:,.0f} {currency} de {sender_name}"
    )
    
    # Email notification to recipient
    recipient_email = recipient.get("email")
    if recipient_email:
        background_tasks.add_task(
            send_email_notification,
            recipient_email,
            f"Vous avez reçu {amount:,.0f} {currency}",
            f"{sender_name} vous a envoyé {amount:,.0f} {currency} via SB Pay.",
            recipient.get("preferred_language", "fr")
        )
    
    # Remove _id from response
    transfer_record.pop("_id", None)
    
    return {
        "message": "Transfert effectué avec succès",
        "transfer": transfer_record,
        "new_balance": None  # Will be fetched by frontend if needed
    }
