# Module Cartes Virtuelles SB Pay
# Routes pour la création et gestion des cartes virtuelles

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import random
import string
import hashlib

# Create router
virtual_cards_router = APIRouter(prefix="/api/virtual-card", tags=["Virtual Cards"])

# ==================== MODELS ====================

class VirtualCardCreate(BaseModel):
    currency: str = "XOF"
    daily_limit: float = Field(default=100000, gt=0)
    transaction_limit: float = Field(default=50000, gt=0)
    card_name: Optional[str] = None  # Custom name for the card

class VirtualCardUpdate(BaseModel):
    daily_limit: Optional[float] = None
    transaction_limit: Optional[float] = None
    card_name: Optional[str] = None

class VirtualCardBlock(BaseModel):
    card_id: str
    action: str  # "block" or "unblock"
    reason: Optional[str] = None

class VirtualCardPayment(BaseModel):
    card_id: str
    amount: float
    merchant_name: str
    merchant_category: Optional[str] = None
    payment_type: str = "online"  # online, contactless, pos

# ==================== CONFIGURATION ====================

# Card limits configuration
CARD_LIMITS = {
    "unverified": {
        "max_cards": 1,
        "max_daily_limit": 50000,
        "max_transaction_limit": 25000
    },
    "pending": {
        "max_cards": 2,
        "max_daily_limit": 200000,
        "max_transaction_limit": 100000
    },
    "verified": {
        "max_cards": 5,
        "max_daily_limit": 2000000,
        "max_transaction_limit": 500000
    }
}

# OTP threshold for high-value transactions
OTP_THRESHOLD = 50000  # XOF

# Card types
CARD_TYPES = ["visa", "mastercard"]

# ==================== HELPER FUNCTIONS ====================

def generate_card_number() -> str:
    """Generate a realistic-looking card number (for demo purposes)"""
    # Visa starts with 4, Mastercard with 5
    prefix = random.choice(["4", "5"])
    # Generate remaining 15 digits
    remaining = ''.join(random.choices(string.digits, k=15))
    card_number = prefix + remaining
    
    # Format with spaces
    formatted = ' '.join([card_number[i:i+4] for i in range(0, 16, 4)])
    return formatted

def generate_cvv() -> str:
    """Generate a 3-digit CVV"""
    return ''.join(random.choices(string.digits, k=3))

def generate_expiry() -> tuple:
    """Generate expiry date (3 years from now)"""
    expiry_date = datetime.now(timezone.utc) + timedelta(days=365*3)
    return expiry_date.strftime("%m"), expiry_date.strftime("%y")

def hash_sensitive_data(data: str) -> str:
    """Hash sensitive card data for storage"""
    return hashlib.sha256(data.encode()).hexdigest()

def mask_card_number(card_number: str) -> str:
    """Mask card number showing only last 4 digits"""
    digits_only = card_number.replace(" ", "")
    return f"**** **** **** {digits_only[-4:]}"

def get_card_brand(card_number: str) -> str:
    """Determine card brand from number"""
    first_digit = card_number.replace(" ", "")[0]
    return "visa" if first_digit == "4" else "mastercard"

# ==================== ROUTE SETUP ====================

def setup_virtual_cards_routes(db, get_current_user, send_push_notification, send_sms_notification, send_email_notification):
    """Setup virtual cards routes with database access"""
    
    @virtual_cards_router.post("/create")
    async def create_virtual_card(
        request: VirtualCardCreate,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new virtual card linked to user's wallet"""
        user_id = current_user["id"]
        kyc_status = current_user.get("kyc_status", "unverified")
        limits_config = CARD_LIMITS.get(kyc_status, CARD_LIMITS["unverified"])
        
        # Check max cards limit
        existing_cards = await db.virtual_cards.count_documents({
            "user_id": user_id,
            "status": {"$ne": "deleted"}
        })
        
        if existing_cards >= limits_config["max_cards"]:
            raise HTTPException(
                status_code=400,
                detail=f"Limite de cartes atteinte ({limits_config['max_cards']}). Améliorez votre statut KYC pour plus de cartes."
            )
        
        # Validate limits against KYC tier
        daily_limit = min(request.daily_limit, limits_config["max_daily_limit"])
        transaction_limit = min(request.transaction_limit, limits_config["max_transaction_limit"])
        
        # Check wallet exists for currency
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        if not wallet:
            raise HTTPException(
                status_code=400,
                detail=f"Pas de wallet {request.currency} disponible"
            )
        
        # Generate card details
        card_number = generate_card_number()
        cvv = generate_cvv()
        expiry_month, expiry_year = generate_expiry()
        card_brand = get_card_brand(card_number)
        
        now = datetime.now(timezone.utc)
        card_id = str(uuid.uuid4())
        
        # Store card (with hashed sensitive data for security)
        card_doc = {
            "id": card_id,
            "user_id": user_id,
            "card_name": request.card_name or f"Carte {card_brand.title()} {request.currency}",
            "card_number_masked": mask_card_number(card_number),
            "card_number_hash": hash_sensitive_data(card_number),
            "last_four": card_number.replace(" ", "")[-4:],
            "cvv_hash": hash_sensitive_data(cvv),
            "expiry_month": expiry_month,
            "expiry_year": expiry_year,
            "expiry": f"{expiry_month}/{expiry_year}",
            "card_brand": card_brand,
            "currency": request.currency,
            "wallet_id": wallet["id"],
            "daily_limit": daily_limit,
            "transaction_limit": transaction_limit,
            "daily_spent": 0,
            "daily_spent_date": now.date().isoformat(),
            "total_spent": 0,
            "transaction_count": 0,
            "status": "active",  # active, blocked, frozen, deleted
            "block_reason": None,
            "is_contactless_enabled": True,
            "is_online_enabled": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.virtual_cards.insert_one(card_doc)
        
        # Log card creation
        await db.card_activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "card_id": card_id,
            "user_id": user_id,
            "action": "created",
            "details": {"currency": request.currency, "daily_limit": daily_limit},
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Carte virtuelle créée",
            f"Votre carte {card_brand.title()} •••• {card_doc['last_four']} est prête"
        )
        
        # Return card details (only shown once at creation!)
        return {
            "message": "Carte virtuelle créée avec succès",
            "card": {
                "id": card_id,
                "card_name": card_doc["card_name"],
                "card_number": card_number,  # Only shown at creation!
                "cvv": cvv,  # Only shown at creation!
                "expiry": card_doc["expiry"],
                "card_brand": card_brand,
                "currency": request.currency,
                "daily_limit": daily_limit,
                "transaction_limit": transaction_limit,
                "status": "active"
            },
            "wallet_balance": wallet.get("balance", 0),
            "warning": "Conservez ces informations en lieu sûr. Le numéro complet et le CVV ne seront plus affichés."
        }

    @virtual_cards_router.get("/list")
    async def list_virtual_cards(
        current_user: dict = Depends(get_current_user)
    ):
        """List all virtual cards for the current user"""
        user_id = current_user["id"]
        
        cards = await db.virtual_cards.find(
            {"user_id": user_id, "status": {"$ne": "deleted"}},
            {"_id": 0, "card_number_hash": 0, "cvv_hash": 0}
        ).sort("created_at", -1).to_list(length=20)
        
        # Get wallet balances
        for card in cards:
            wallet = await db.wallets.find_one(
                {"id": card.get("wallet_id")},
                {"_id": 0, "balance": 1}
            )
            card["wallet_balance"] = wallet.get("balance", 0) if wallet else 0
            
            # Reset daily spent if new day
            if card.get("daily_spent_date") != datetime.now(timezone.utc).date().isoformat():
                card["daily_spent"] = 0
        
        return {"cards": cards, "count": len(cards)}

    @virtual_cards_router.get("/{card_id}")
    async def get_virtual_card(
        card_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get details of a specific virtual card"""
        card = await db.virtual_cards.find_one(
            {"id": card_id, "user_id": current_user["id"], "status": {"$ne": "deleted"}},
            {"_id": 0, "card_number_hash": 0, "cvv_hash": 0}
        )
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        # Get wallet balance
        wallet = await db.wallets.find_one(
            {"id": card.get("wallet_id")},
            {"_id": 0, "balance": 1}
        )
        card["wallet_balance"] = wallet.get("balance", 0) if wallet else 0
        
        return {"card": card}

    @virtual_cards_router.post("/block")
    async def block_unblock_card(
        request: VirtualCardBlock,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Block or unblock a virtual card"""
        user_id = current_user["id"]
        
        card = await db.virtual_cards.find_one({
            "id": request.card_id,
            "user_id": user_id,
            "status": {"$ne": "deleted"}
        })
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        now = datetime.now(timezone.utc)
        
        if request.action == "block":
            if card["status"] == "blocked":
                raise HTTPException(status_code=400, detail="Carte déjà bloquée")
            
            new_status = "blocked"
            message = "Carte bloquée avec succès"
            notif_title = "Carte bloquée"
            notif_body = f"Votre carte •••• {card['last_four']} a été bloquée"
            
        elif request.action == "unblock":
            if card["status"] != "blocked":
                raise HTTPException(status_code=400, detail="Carte non bloquée")
            
            new_status = "active"
            message = "Carte débloquée avec succès"
            notif_title = "Carte débloquée"
            notif_body = f"Votre carte •••• {card['last_four']} est à nouveau active"
        else:
            raise HTTPException(status_code=400, detail="Action invalide (block/unblock)")
        
        await db.virtual_cards.update_one(
            {"id": request.card_id},
            {
                "$set": {
                    "status": new_status,
                    "block_reason": request.reason if request.action == "block" else None,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Log action
        await db.card_activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "card_id": request.card_id,
            "user_id": user_id,
            "action": request.action,
            "details": {"reason": request.reason},
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(send_push_notification, user_id, notif_title, notif_body)
        
        return {"message": message, "status": new_status}

    @virtual_cards_router.post("/limit")
    async def update_card_limits(
        card_id: str,
        request: VirtualCardUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update card spending limits"""
        user_id = current_user["id"]
        kyc_status = current_user.get("kyc_status", "unverified")
        limits_config = CARD_LIMITS.get(kyc_status, CARD_LIMITS["unverified"])
        
        card = await db.virtual_cards.find_one({
            "id": card_id,
            "user_id": user_id,
            "status": {"$ne": "deleted"}
        })
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if request.daily_limit is not None:
            update_data["daily_limit"] = min(request.daily_limit, limits_config["max_daily_limit"])
        
        if request.transaction_limit is not None:
            update_data["transaction_limit"] = min(request.transaction_limit, limits_config["max_transaction_limit"])
        
        if request.card_name is not None:
            update_data["card_name"] = request.card_name
        
        await db.virtual_cards.update_one({"id": card_id}, {"$set": update_data})
        
        return {
            "message": "Limites mises à jour",
            "new_limits": {
                "daily_limit": update_data.get("daily_limit", card["daily_limit"]),
                "transaction_limit": update_data.get("transaction_limit", card["transaction_limit"])
            }
        }

    @virtual_cards_router.get("/transactions/{card_id}")
    async def get_card_transactions(
        card_id: str,
        current_user: dict = Depends(get_current_user),
        limit: int = 20,
        offset: int = 0
    ):
        """Get transaction history for a specific card"""
        card = await db.virtual_cards.find_one({
            "id": card_id,
            "user_id": current_user["id"],
            "status": {"$ne": "deleted"}
        })
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        transactions = await db.card_transactions.find(
            {"card_id": card_id},
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        
        # Get total count
        total = await db.card_transactions.count_documents({"card_id": card_id})
        
        return {
            "transactions": transactions,
            "count": len(transactions),
            "total": total,
            "card_last_four": card["last_four"]
        }

    @virtual_cards_router.delete("/{card_id}")
    async def delete_virtual_card(
        card_id: str,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete (soft delete) a virtual card"""
        user_id = current_user["id"]
        
        card = await db.virtual_cards.find_one({
            "id": card_id,
            "user_id": user_id,
            "status": {"$ne": "deleted"}
        })
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        now = datetime.now(timezone.utc)
        
        await db.virtual_cards.update_one(
            {"id": card_id},
            {
                "$set": {
                    "status": "deleted",
                    "deleted_at": now.isoformat(),
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Log deletion
        await db.card_activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "card_id": card_id,
            "user_id": user_id,
            "action": "deleted",
            "details": {},
            "created_at": now.isoformat()
        })
        
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Carte supprimée",
            f"Votre carte •••• {card['last_four']} a été supprimée"
        )
        
        return {"message": "Carte supprimée avec succès"}

    @virtual_cards_router.post("/simulate-payment")
    async def simulate_card_payment(
        request: VirtualCardPayment,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Simulate a card payment (DEMO MODE).
        In production, this would be handled by card network webhooks.
        """
        user_id = current_user["id"]
        
        # Get card
        card = await db.virtual_cards.find_one({
            "id": request.card_id,
            "user_id": user_id
        })
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        if card["status"] != "active":
            raise HTTPException(status_code=400, detail=f"Carte {card['status']} - paiement refusé")
        
        # Check payment type enabled
        if request.payment_type == "online" and not card.get("is_online_enabled", True):
            raise HTTPException(status_code=400, detail="Paiements en ligne désactivés pour cette carte")
        
        if request.payment_type == "contactless" and not card.get("is_contactless_enabled", True):
            raise HTTPException(status_code=400, detail="Paiements sans contact désactivés pour cette carte")
        
        # Check transaction limit
        if request.amount > card["transaction_limit"]:
            raise HTTPException(
                status_code=400,
                detail=f"Montant dépasse la limite par transaction ({card['transaction_limit']:,.0f} {card['currency']})"
            )
        
        # Check daily limit
        today = datetime.now(timezone.utc).date().isoformat()
        daily_spent = card["daily_spent"] if card.get("daily_spent_date") == today else 0
        
        if daily_spent + request.amount > card["daily_limit"]:
            raise HTTPException(
                status_code=400,
                detail=f"Limite journalière atteinte ({card['daily_limit']:,.0f} {card['currency']})"
            )
        
        # Check wallet balance
        wallet = await db.wallets.find_one({"id": card["wallet_id"]})
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde wallet insuffisant")
        
        now = datetime.now(timezone.utc)
        transaction_id = str(uuid.uuid4())
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": card["wallet_id"]},
            {
                "$inc": {"balance": -request.amount},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Update card stats
        await db.virtual_cards.update_one(
            {"id": request.card_id},
            {
                "$inc": {
                    "daily_spent": request.amount,
                    "total_spent": request.amount,
                    "transaction_count": 1
                },
                "$set": {
                    "daily_spent_date": today,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Create card transaction record
        card_transaction = {
            "id": transaction_id,
            "card_id": request.card_id,
            "user_id": user_id,
            "amount": request.amount,
            "currency": card["currency"],
            "merchant_name": request.merchant_name,
            "merchant_category": request.merchant_category or "Général",
            "payment_type": request.payment_type,
            "status": "completed",
            "reference": f"VCP-{uuid.uuid4().hex[:8].upper()}",
            "created_at": now.isoformat()
        }
        await db.card_transactions.insert_one(card_transaction)
        
        # Create general transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "card_payment",
            "amount": -request.amount,
            "currency": card["currency"],
            "status": "completed",
            "reference": card_transaction["reference"],
            "description": f"Paiement carte •••• {card['last_four']} - {request.merchant_name}",
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Paiement effectué",
            f"-{request.amount:,.0f} {card['currency']} chez {request.merchant_name}"
        )
        
        return {
            "message": "Paiement effectué",
            "transaction": {
                "id": transaction_id,
                "amount": request.amount,
                "merchant": request.merchant_name,
                "status": "completed",
                "reference": card_transaction["reference"]
            },
            "card_balance_remaining": card["daily_limit"] - (daily_spent + request.amount),
            "wallet_new_balance": wallet["balance"] - request.amount,
            "demo_mode": True
        }

    @virtual_cards_router.post("/toggle-feature/{card_id}")
    async def toggle_card_feature(
        card_id: str,
        feature: str,  # "online" or "contactless"
        enabled: bool,
        current_user: dict = Depends(get_current_user)
    ):
        """Enable/disable specific card features"""
        card = await db.virtual_cards.find_one({
            "id": card_id,
            "user_id": current_user["id"],
            "status": {"$ne": "deleted"}
        })
        
        if not card:
            raise HTTPException(status_code=404, detail="Carte non trouvée")
        
        if feature not in ["online", "contactless"]:
            raise HTTPException(status_code=400, detail="Feature invalide (online/contactless)")
        
        field_name = f"is_{feature}_enabled"
        
        await db.virtual_cards.update_one(
            {"id": card_id},
            {"$set": {field_name: enabled, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        status_text = "activés" if enabled else "désactivés"
        feature_text = "en ligne" if feature == "online" else "sans contact"
        
        return {"message": f"Paiements {feature_text} {status_text}"}

    return virtual_cards_router
