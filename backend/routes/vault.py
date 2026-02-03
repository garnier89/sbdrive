# Module Coffre-Fort SB Money
# Routes pour la gestion du coffre-fort sécurisé

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import hashlib

# Create router
vault_router = APIRouter(prefix="/api/vault", tags=["Vault"])

# ==================== MODELS ====================

class VaultDeposit(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "XOF"
    pin: str = Field(..., min_length=6, max_length=6)
    description: Optional[str] = None

class VaultWithdraw(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "XOF"
    pin: str = Field(..., min_length=6, max_length=6)
    destination: str = "wallet"  # wallet or bank
    description: Optional[str] = None

class VaultSetPin(BaseModel):
    new_pin: str = Field(..., min_length=6, max_length=6)
    current_pin: Optional[str] = None  # Required if changing existing PIN

class VaultVerifyPin(BaseModel):
    pin: str = Field(..., min_length=6, max_length=6)

# ==================== CONFIGURATION ====================

# Vault limits by KYC status
VAULT_LIMITS = {
    "unverified": {
        "max_balance": 500000,
        "daily_withdraw_limit": 50000,
        "max_single_deposit": 100000,
        "max_single_withdraw": 50000
    },
    "pending": {
        "max_balance": 2000000,
        "daily_withdraw_limit": 200000,
        "max_single_deposit": 500000,
        "max_single_withdraw": 200000
    },
    "verified": {
        "max_balance": 50000000,
        "daily_withdraw_limit": 5000000,
        "max_single_deposit": 10000000,
        "max_single_withdraw": 5000000
    }
}

# PIN attempt limits
MAX_PIN_ATTEMPTS = 5
PIN_LOCKOUT_MINUTES = 30

# ==================== HELPER FUNCTIONS ====================

def hash_pin(pin: str) -> str:
    """Hash PIN for secure storage"""
    return hashlib.sha256(pin.encode()).hexdigest()

def verify_pin(stored_hash: str, provided_pin: str) -> bool:
    """Verify PIN against stored hash"""
    return stored_hash == hash_pin(provided_pin)

# ==================== ROUTE SETUP ====================

def setup_vault_routes(db, get_current_user, send_push_notification, send_sms_notification, send_email_notification):
    """Setup vault routes with database access"""
    
    async def get_or_create_vault(user_id: str, currency: str):
        """Get existing vault or create new one"""
        vault = await db.vaults.find_one({
            "user_id": user_id,
            "currency": currency
        })
        
        if not vault:
            vault = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "currency": currency,
                "balance": 0,
                "pin_hash": None,
                "pin_attempts": 0,
                "pin_locked_until": None,
                "total_deposited": 0,
                "total_withdrawn": 0,
                "transaction_count": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.vaults.insert_one(vault)
        
        return vault

    async def check_pin_lockout(vault: dict) -> bool:
        """Check if vault is locked due to too many PIN attempts"""
        if vault.get("pin_locked_until"):
            locked_until = datetime.fromisoformat(vault["pin_locked_until"])
            if datetime.now(timezone.utc) < locked_until:
                return True
            # Reset lockout if time has passed
            await db.vaults.update_one(
                {"id": vault["id"]},
                {"$set": {"pin_attempts": 0, "pin_locked_until": None}}
            )
        return False

    async def record_pin_attempt(vault_id: str, success: bool):
        """Record PIN attempt and lock if too many failures"""
        if success:
            await db.vaults.update_one(
                {"id": vault_id},
                {"$set": {"pin_attempts": 0, "pin_locked_until": None}}
            )
        else:
            vault = await db.vaults.find_one({"id": vault_id})
            new_attempts = vault.get("pin_attempts", 0) + 1
            
            update_data = {"pin_attempts": new_attempts}
            if new_attempts >= MAX_PIN_ATTEMPTS:
                update_data["pin_locked_until"] = (
                    datetime.now(timezone.utc) + timedelta(minutes=PIN_LOCKOUT_MINUTES)
                ).isoformat()
            
            await db.vaults.update_one({"id": vault_id}, {"$set": update_data})

    @vault_router.get("/balance")
    async def get_vault_balance(
        currency: str = "XOF",
        current_user: dict = Depends(get_current_user)
    ):
        """Get vault balance and status"""
        user_id = current_user["id"]
        vault = await get_or_create_vault(user_id, currency)
        
        kyc_status = current_user.get("kyc_status", "unverified")
        limits = VAULT_LIMITS.get(kyc_status, VAULT_LIMITS["unverified"])
        
        # Calculate today's withdrawals
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_withdrawals = await db.vault_transactions.aggregate([
            {
                "$match": {
                    "vault_id": vault["id"],
                    "type": "withdraw",
                    "status": "completed",
                    "created_at": {"$gte": today_start.isoformat()}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        today_withdrawn = today_withdrawals[0]["total"] if today_withdrawals else 0
        
        # Check if PIN is set
        has_pin = vault.get("pin_hash") is not None
        is_locked = await check_pin_lockout(vault)
        
        return {
            "balance": vault.get("balance", 0),
            "currency": currency,
            "has_pin": has_pin,
            "is_locked": is_locked,
            "locked_until": vault.get("pin_locked_until") if is_locked else None,
            "total_deposited": vault.get("total_deposited", 0),
            "total_withdrawn": vault.get("total_withdrawn", 0),
            "today_withdrawn": today_withdrawn,
            "limits": {
                "max_balance": limits["max_balance"],
                "daily_withdraw_limit": limits["daily_withdraw_limit"],
                "daily_withdraw_remaining": limits["daily_withdraw_limit"] - today_withdrawn,
                "max_single_deposit": limits["max_single_deposit"],
                "max_single_withdraw": limits["max_single_withdraw"]
            },
            "kyc_status": kyc_status
        }

    @vault_router.post("/set-pin")
    async def set_vault_pin(
        request: VaultSetPin,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Set or change vault PIN"""
        user_id = current_user["id"]
        vault = await get_or_create_vault(user_id, "XOF")
        
        # Check lockout
        if await check_pin_lockout(vault):
            raise HTTPException(
                status_code=423,
                detail=f"Coffre-fort verrouillé. Réessayez dans {PIN_LOCKOUT_MINUTES} minutes."
            )
        
        # If PIN exists, verify current PIN
        if vault.get("pin_hash"):
            if not request.current_pin:
                raise HTTPException(
                    status_code=400,
                    detail="PIN actuel requis pour le modifier"
                )
            if not verify_pin(vault["pin_hash"], request.current_pin):
                await record_pin_attempt(vault["id"], False)
                raise HTTPException(status_code=400, detail="PIN actuel incorrect")
        
        # Validate new PIN (must be 6 digits)
        if not request.new_pin.isdigit():
            raise HTTPException(status_code=400, detail="Le PIN doit contenir uniquement des chiffres")
        
        # Set new PIN
        await db.vaults.update_one(
            {"id": vault["id"]},
            {
                "$set": {
                    "pin_hash": hash_pin(request.new_pin),
                    "pin_attempts": 0,
                    "pin_locked_until": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Log action
        await db.vault_activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "vault_id": vault["id"],
            "user_id": user_id,
            "action": "pin_changed" if vault.get("pin_hash") else "pin_set",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "PIN Coffre-Fort modifié",
            "Votre code PIN de coffre-fort a été mis à jour"
        )
        
        return {"message": "PIN défini avec succès"}

    @vault_router.post("/verify-pin")
    async def verify_vault_pin(
        request: VaultVerifyPin,
        current_user: dict = Depends(get_current_user)
    ):
        """Verify vault PIN (for frontend validation before operations)"""
        user_id = current_user["id"]
        vault = await get_or_create_vault(user_id, "XOF")
        
        if not vault.get("pin_hash"):
            raise HTTPException(status_code=400, detail="Aucun PIN défini")
        
        if await check_pin_lockout(vault):
            raise HTTPException(
                status_code=423,
                detail=f"Coffre-fort verrouillé. Réessayez dans {PIN_LOCKOUT_MINUTES} minutes."
            )
        
        if verify_pin(vault["pin_hash"], request.pin):
            await record_pin_attempt(vault["id"], True)
            return {"valid": True}
        else:
            await record_pin_attempt(vault["id"], False)
            vault = await db.vaults.find_one({"id": vault["id"]})
            remaining = MAX_PIN_ATTEMPTS - vault.get("pin_attempts", 0)
            raise HTTPException(
                status_code=400,
                detail=f"PIN incorrect. {remaining} tentatives restantes."
            )

    @vault_router.post("/deposit")
    async def deposit_to_vault(
        request: VaultDeposit,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Deposit money from wallet to vault"""
        user_id = current_user["id"]
        vault = await get_or_create_vault(user_id, request.currency)
        
        # Check PIN
        if not vault.get("pin_hash"):
            raise HTTPException(status_code=400, detail="Veuillez définir un PIN d'abord")
        
        if await check_pin_lockout(vault):
            raise HTTPException(status_code=423, detail="Coffre-fort verrouillé")
        
        if not verify_pin(vault["pin_hash"], request.pin):
            await record_pin_attempt(vault["id"], False)
            raise HTTPException(status_code=400, detail="PIN incorrect")
        
        await record_pin_attempt(vault["id"], True)
        
        # Get limits
        kyc_status = current_user.get("kyc_status", "unverified")
        limits = VAULT_LIMITS.get(kyc_status, VAULT_LIMITS["unverified"])
        
        # Validate amount
        if request.amount > limits["max_single_deposit"]:
            raise HTTPException(
                status_code=400,
                detail=f"Dépôt maximum: {limits['max_single_deposit']:,.0f} {request.currency}"
            )
        
        if vault["balance"] + request.amount > limits["max_balance"]:
            raise HTTPException(
                status_code=400,
                detail=f"Solde maximum du coffre-fort: {limits['max_balance']:,.0f} {request.currency}"
            )
        
        # Check wallet balance
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde wallet insuffisant")
        
        now = datetime.now(timezone.utc)
        transaction_id = str(uuid.uuid4())
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {
                "$inc": {"balance": -request.amount},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Credit vault
        await db.vaults.update_one(
            {"id": vault["id"]},
            {
                "$inc": {
                    "balance": request.amount,
                    "total_deposited": request.amount,
                    "transaction_count": 1
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Create vault transaction
        vault_transaction = {
            "id": transaction_id,
            "vault_id": vault["id"],
            "user_id": user_id,
            "type": "deposit",
            "amount": request.amount,
            "currency": request.currency,
            "source": "wallet",
            "description": request.description or "Dépôt depuis wallet",
            "status": "completed",
            "reference": f"VD-{uuid.uuid4().hex[:8].upper()}",
            "created_at": now.isoformat()
        }
        await db.vault_transactions.insert_one(vault_transaction)
        
        # Create general transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "vault_deposit",
            "amount": -request.amount,
            "currency": request.currency,
            "status": "completed",
            "reference": vault_transaction["reference"],
            "description": f"Dépôt coffre-fort",
            "created_at": now.isoformat()
        })
        
        # Notification
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Dépôt Coffre-Fort",
            f"+{request.amount:,.0f} {request.currency} déposé dans votre coffre-fort"
        )
        
        new_vault = await db.vaults.find_one({"id": vault["id"]})
        new_wallet = await db.wallets.find_one({"id": wallet["id"]})
        
        return {
            "message": "Dépôt effectué avec succès",
            "transaction_id": transaction_id,
            "reference": vault_transaction["reference"],
            "vault_balance": new_vault["balance"],
            "wallet_balance": new_wallet["balance"]
        }

    @vault_router.post("/withdraw")
    async def withdraw_from_vault(
        request: VaultWithdraw,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Withdraw money from vault to wallet"""
        user_id = current_user["id"]
        vault = await get_or_create_vault(user_id, request.currency)
        
        # Check PIN
        if not vault.get("pin_hash"):
            raise HTTPException(status_code=400, detail="Veuillez définir un PIN d'abord")
        
        if await check_pin_lockout(vault):
            raise HTTPException(status_code=423, detail="Coffre-fort verrouillé")
        
        if not verify_pin(vault["pin_hash"], request.pin):
            await record_pin_attempt(vault["id"], False)
            raise HTTPException(status_code=400, detail="PIN incorrect")
        
        await record_pin_attempt(vault["id"], True)
        
        # Get limits
        kyc_status = current_user.get("kyc_status", "unverified")
        limits = VAULT_LIMITS.get(kyc_status, VAULT_LIMITS["unverified"])
        
        # Validate amount
        if request.amount > limits["max_single_withdraw"]:
            raise HTTPException(
                status_code=400,
                detail=f"Retrait maximum: {limits['max_single_withdraw']:,.0f} {request.currency}"
            )
        
        if request.amount > vault["balance"]:
            raise HTTPException(status_code=400, detail="Solde coffre-fort insuffisant")
        
        # Check daily limit
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_withdrawals = await db.vault_transactions.aggregate([
            {
                "$match": {
                    "vault_id": vault["id"],
                    "type": "withdraw",
                    "status": "completed",
                    "created_at": {"$gte": today_start.isoformat()}
                }
            },
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        
        today_withdrawn = today_withdrawals[0]["total"] if today_withdrawals else 0
        
        if today_withdrawn + request.amount > limits["daily_withdraw_limit"]:
            raise HTTPException(
                status_code=400,
                detail=f"Limite journalière atteinte ({limits['daily_withdraw_limit']:,.0f} {request.currency})"
            )
        
        now = datetime.now(timezone.utc)
        transaction_id = str(uuid.uuid4())
        
        # Debit vault
        await db.vaults.update_one(
            {"id": vault["id"]},
            {
                "$inc": {
                    "balance": -request.amount,
                    "total_withdrawn": request.amount,
                    "transaction_count": 1
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Credit wallet
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        if wallet:
            await db.wallets.update_one(
                {"id": wallet["id"]},
                {
                    "$inc": {"balance": request.amount},
                    "$set": {"updated_at": now.isoformat()}
                }
            )
        else:
            # Create wallet if doesn't exist
            wallet = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "currency": request.currency,
                "balance": request.amount,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.wallets.insert_one(wallet)
        
        # Create vault transaction
        vault_transaction = {
            "id": transaction_id,
            "vault_id": vault["id"],
            "user_id": user_id,
            "type": "withdraw",
            "amount": request.amount,
            "currency": request.currency,
            "destination": request.destination,
            "description": request.description or "Retrait vers wallet",
            "status": "completed",
            "reference": f"VW-{uuid.uuid4().hex[:8].upper()}",
            "created_at": now.isoformat()
        }
        await db.vault_transactions.insert_one(vault_transaction)
        
        # Create general transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "vault_withdraw",
            "amount": request.amount,
            "currency": request.currency,
            "status": "completed",
            "reference": vault_transaction["reference"],
            "description": f"Retrait coffre-fort",
            "created_at": now.isoformat()
        })
        
        # Notification
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Retrait Coffre-Fort",
            f"-{request.amount:,.0f} {request.currency} retiré de votre coffre-fort"
        )
        
        new_vault = await db.vaults.find_one({"id": vault["id"]})
        new_wallet = await db.wallets.find_one({"user_id": user_id, "currency": request.currency})
        
        return {
            "message": "Retrait effectué avec succès",
            "transaction_id": transaction_id,
            "reference": vault_transaction["reference"],
            "vault_balance": new_vault["balance"],
            "wallet_balance": new_wallet["balance"]
        }

    @vault_router.get("/transactions")
    async def get_vault_transactions(
        currency: str = "XOF",
        limit: int = 20,
        offset: int = 0,
        current_user: dict = Depends(get_current_user)
    ):
        """Get vault transaction history"""
        user_id = current_user["id"]
        vault = await get_or_create_vault(user_id, currency)
        
        transactions = await db.vault_transactions.find(
            {"vault_id": vault["id"]},
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        
        total = await db.vault_transactions.count_documents({"vault_id": vault["id"]})
        
        return {
            "transactions": transactions,
            "count": len(transactions),
            "total": total
        }

    return vault_router
