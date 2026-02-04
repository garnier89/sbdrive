# Module de Retraits Multi-Méthodes SBPAYGO
# Retrait bancaire, Mobile Money, Carte, Programmé

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import sys
sys.path.append('/app/backend')
from config.countries_config import AFRICAN_COUNTRIES_CONFIG, get_country_config, get_mobile_money_providers, get_quick_amounts

withdrawals_router = APIRouter(prefix="/api/withdrawals", tags=["Withdrawals"])

# Quick withdrawal amounts by currency
QUICK_AMOUNTS = {
    "XOF": [5000, 10000, 25000, 50000, 100000, 250000],
    "EUR": [10, 25, 50, 100, 250, 500],
    "USD": [10, 25, 50, 100, 250, 500],
    "GHS": [50, 100, 200, 500, 1000, 2000],
    "NGN": [5000, 10000, 20000, 50000, 100000, 200000],
    "KES": [500, 1000, 2000, 5000, 10000, 20000]
}

# Request models
class BankWithdrawalRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    bank_account_id: Optional[str] = None
    iban: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None

class MobileMoneyWithdrawalRequest(BaseModel):
    amount: float
    currency: str = "XOF"
    country: str
    provider: str
    phone_number: str
    recipient_name: Optional[str] = None

class CardWithdrawalRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    card_id: Optional[str] = None
    card_last4: Optional[str] = None

class ScheduledWithdrawalRequest(BaseModel):
    amount: float
    currency: str
    method: str  # bank, mobile_money, card
    method_details: dict
    frequency: str  # once, weekly, biweekly, monthly
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None

def setup_withdrawals_routes(db, jwt_secret, jwt_algorithm, send_push_notification, send_email_notification):
    """Setup withdrawals routes with database access"""

    async def get_current_user(authorization: str):
        """Get current authenticated user"""
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

    # ==================== CONFIG ROUTES ====================

    @withdrawals_router.get("/config")
    async def get_withdrawal_config(authorization: str = Header(None)):
        """Get withdrawal configuration for user's country"""
        user = await get_current_user(authorization)
        country = user.get("country", "FR")
        currency = user.get("default_currency", "EUR")
        
        methods = WITHDRAWAL_METHODS.get(country, ["bank"])
        providers = MOBILE_MONEY_PROVIDERS.get(country, [])
        quick_amounts = QUICK_AMOUNTS.get(currency, QUICK_AMOUNTS.get("EUR"))
        
        # Get user's saved bank accounts
        bank_accounts = await db.bank_accounts.find(
            {"user_id": user["id"], "deleted": {"$ne": True}},
            {"_id": 0}
        ).to_list(20)
        
        # Get user's saved mobile money accounts
        mm_accounts = await db.mobile_money_accounts.find(
            {"user_id": user["id"], "deleted": {"$ne": True}},
            {"_id": 0}
        ).to_list(20)
        
        # Get user's cards
        cards = await db.cards.find(
            {"user_id": user["id"], "deleted": {"$ne": True}, "approval_status": "active"},
            {"_id": 0, "token": 0}
        ).to_list(20)
        
        return {
            "country": country,
            "currency": currency,
            "methods": methods,
            "mobile_money_providers": providers,
            "quick_amounts": quick_amounts,
            "bank_accounts": bank_accounts,
            "mobile_money_accounts": mm_accounts,
            "cards": cards,
            "limits": {
                "min_amount": 1,
                "max_daily": 10000 if currency == "EUR" else 5000000,
                "max_transaction": 5000 if currency == "EUR" else 2000000
            }
        }

    @withdrawals_router.get("/providers/{country}")
    async def get_mobile_money_providers(country: str):
        """Get Mobile Money providers for a specific country"""
        providers = MOBILE_MONEY_PROVIDERS.get(country.upper(), [])
        return {"country": country.upper(), "providers": providers}

    @withdrawals_router.get("/methods/{country}")
    async def get_withdrawal_methods(country: str):
        """Get available withdrawal methods for a country"""
        methods = WITHDRAWAL_METHODS.get(country.upper(), ["bank"])
        return {"country": country.upper(), "methods": methods}

    @withdrawals_router.get("/quick-amounts/{currency}")
    async def get_quick_amounts(currency: str):
        """Get quick withdrawal amounts for a currency"""
        amounts = QUICK_AMOUNTS.get(currency.upper(), QUICK_AMOUNTS.get("EUR"))
        return {"currency": currency.upper(), "amounts": amounts}

    # ==================== BANK WITHDRAWAL ====================

    @withdrawals_router.post("/bank")
    async def create_bank_withdrawal(
        request: BankWithdrawalRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create a bank withdrawal request"""
        user = await get_current_user(authorization)
        
        # Check wallet balance
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": request.currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Calculate fees (1% for bank transfer)
        fee_percent = 1.0
        fees = request.amount * (fee_percent / 100)
        total_debit = request.amount + fees
        
        if wallet["balance"] < total_debit:
            raise HTTPException(status_code=400, detail="Solde insuffisant pour couvrir les frais")
        
        now = datetime.now(timezone.utc)
        withdrawal_id = str(uuid.uuid4())
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create withdrawal record
        withdrawal = {
            "id": withdrawal_id,
            "user_id": user["id"],
            "type": "bank",
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": request.currency,
            "status": "pending",
            "bank_account_id": request.bank_account_id,
            "iban": request.iban,
            "bank_name": request.bank_name,
            "account_holder": request.account_holder or user.get("full_name"),
            "estimated_arrival": (now + timedelta(days=2)).isoformat(),
            "created_at": now.isoformat()
        }
        await db.withdrawals.insert_one(withdrawal)
        
        # Create transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "withdrawal_bank",
            "amount": -total_debit,
            "currency": request.currency,
            "status": "completed",
            "description": f"Retrait bancaire vers {request.bank_name or 'compte'}",
            "withdrawal_id": withdrawal_id,
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Retrait bancaire initié",
            f"Votre retrait de {request.amount} {request.currency} est en cours de traitement"
        )
        
        return {
            "message": "Retrait bancaire initié",
            "withdrawal_id": withdrawal_id,
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "estimated_arrival": withdrawal["estimated_arrival"],
            "status": "pending"
        }

    # ==================== MOBILE MONEY WITHDRAWAL ====================

    @withdrawals_router.post("/mobile-money")
    async def create_mobile_money_withdrawal(
        request: MobileMoneyWithdrawalRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create a Mobile Money withdrawal request"""
        user = await get_current_user(authorization)
        
        # Validate provider
        providers = MOBILE_MONEY_PROVIDERS.get(request.country.upper(), [])
        provider = next((p for p in providers if p["code"] == request.provider), None)
        if not provider:
            raise HTTPException(status_code=400, detail="Opérateur Mobile Money non supporté")
        
        # Validate amount limits
        if request.amount < provider["min"]:
            raise HTTPException(status_code=400, detail=f"Montant minimum: {provider['min']} {request.currency}")
        if request.amount > provider["max"]:
            raise HTTPException(status_code=400, detail=f"Montant maximum: {provider['max']} {request.currency}")
        
        # Check wallet balance
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": request.currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Calculate fees
        fees = request.amount * (provider["fee_percent"] / 100)
        total_debit = request.amount + fees
        
        if wallet["balance"] < total_debit:
            raise HTTPException(status_code=400, detail="Solde insuffisant pour couvrir les frais")
        
        now = datetime.now(timezone.utc)
        withdrawal_id = str(uuid.uuid4())
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create withdrawal record
        withdrawal = {
            "id": withdrawal_id,
            "user_id": user["id"],
            "type": "mobile_money",
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": request.currency,
            "country": request.country.upper(),
            "provider": request.provider,
            "provider_name": provider["name"],
            "phone_number": request.phone_number,
            "recipient_name": request.recipient_name,
            "status": "processing",  # Mobile Money is usually instant
            "created_at": now.isoformat()
        }
        await db.withdrawals.insert_one(withdrawal)
        
        # Create transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "withdrawal_mobile_money",
            "amount": -total_debit,
            "currency": request.currency,
            "status": "completed",
            "description": f"Retrait {provider['name']} vers {request.phone_number}",
            "withdrawal_id": withdrawal_id,
            "created_at": now.isoformat()
        })
        
        # In demo mode, mark as completed immediately
        await db.withdrawals.update_one(
            {"id": withdrawal_id},
            {"$set": {"status": "completed", "completed_at": now.isoformat()}}
        )
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Retrait Mobile Money effectué",
            f"{request.amount} {request.currency} envoyé vers {request.phone_number} via {provider['name']}"
        )
        
        return {
            "message": "Retrait Mobile Money effectué",
            "withdrawal_id": withdrawal_id,
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "provider": provider["name"],
            "phone_number": request.phone_number,
            "status": "completed"
        }

    # ==================== CARD WITHDRAWAL ====================

    @withdrawals_router.post("/card")
    async def create_card_withdrawal(
        request: CardWithdrawalRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create a card withdrawal (refund to card)"""
        user = await get_current_user(authorization)
        
        # Check wallet balance
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": request.currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Calculate fees (1.5% for card withdrawal)
        fee_percent = 1.5
        fees = request.amount * (fee_percent / 100)
        total_debit = request.amount + fees
        
        if wallet["balance"] < total_debit:
            raise HTTPException(status_code=400, detail="Solde insuffisant pour couvrir les frais")
        
        now = datetime.now(timezone.utc)
        withdrawal_id = str(uuid.uuid4())
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create withdrawal record
        withdrawal = {
            "id": withdrawal_id,
            "user_id": user["id"],
            "type": "card",
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": request.currency,
            "card_id": request.card_id,
            "card_last4": request.card_last4,
            "status": "pending",
            "estimated_arrival": (now + timedelta(days=3)).isoformat(),
            "created_at": now.isoformat()
        }
        await db.withdrawals.insert_one(withdrawal)
        
        # Create transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "withdrawal_card",
            "amount": -total_debit,
            "currency": request.currency,
            "status": "completed",
            "description": f"Retrait vers carte ****{request.card_last4 or '****'}",
            "withdrawal_id": withdrawal_id,
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Retrait carte initié",
            f"Votre retrait de {request.amount} {request.currency} vers votre carte est en cours"
        )
        
        return {
            "message": "Retrait carte initié",
            "withdrawal_id": withdrawal_id,
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "estimated_arrival": withdrawal["estimated_arrival"],
            "status": "pending"
        }

    # ==================== SCHEDULED WITHDRAWALS ====================

    @withdrawals_router.post("/scheduled")
    async def create_scheduled_withdrawal(
        request: ScheduledWithdrawalRequest,
        authorization: str = Header(None)
    ):
        """Create a scheduled/recurring withdrawal"""
        user = await get_current_user(authorization)
        
        now = datetime.now(timezone.utc)
        schedule_id = str(uuid.uuid4())
        
        # Validate frequency
        valid_frequencies = ["once", "weekly", "biweekly", "monthly"]
        if request.frequency not in valid_frequencies:
            raise HTTPException(status_code=400, detail="Fréquence invalide")
        
        # Create scheduled withdrawal
        scheduled = {
            "id": schedule_id,
            "user_id": user["id"],
            "amount": request.amount,
            "currency": request.currency,
            "method": request.method,
            "method_details": request.method_details,
            "frequency": request.frequency,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "next_execution": request.start_date,
            "description": request.description,
            "status": "active",
            "executions_count": 0,
            "last_execution": None,
            "created_at": now.isoformat()
        }
        await db.scheduled_withdrawals.insert_one(scheduled)
        
        return {
            "message": "Retrait programmé créé",
            "schedule_id": schedule_id,
            "frequency": request.frequency,
            "next_execution": request.start_date,
            "status": "active"
        }

    @withdrawals_router.get("/scheduled")
    async def get_scheduled_withdrawals(authorization: str = Header(None)):
        """Get user's scheduled withdrawals"""
        user = await get_current_user(authorization)
        
        scheduled = await db.scheduled_withdrawals.find(
            {"user_id": user["id"], "status": {"$ne": "deleted"}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        
        return {"scheduled_withdrawals": scheduled}

    @withdrawals_router.delete("/scheduled/{schedule_id}")
    async def cancel_scheduled_withdrawal(
        schedule_id: str,
        authorization: str = Header(None)
    ):
        """Cancel a scheduled withdrawal"""
        user = await get_current_user(authorization)
        
        result = await db.scheduled_withdrawals.update_one(
            {"id": schedule_id, "user_id": user["id"]},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Retrait programmé non trouvé")
        
        return {"message": "Retrait programmé annulé"}

    # ==================== WITHDRAWAL HISTORY ====================

    @withdrawals_router.get("/history")
    async def get_withdrawal_history(
        status: Optional[str] = None,
        method: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Get user's withdrawal history"""
        user = await get_current_user(authorization)
        
        query = {"user_id": user["id"]}
        if status:
            query["status"] = status
        if method:
            query["type"] = method
        
        withdrawals = await db.withdrawals.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.withdrawals.count_documents(query)
        
        # Stats
        total_withdrawn = 0
        cursor = db.withdrawals.find({"user_id": user["id"], "status": "completed"})
        async for w in cursor:
            total_withdrawn += w.get("amount", 0)
        
        pending_count = await db.withdrawals.count_documents({"user_id": user["id"], "status": "pending"})
        
        return {
            "withdrawals": withdrawals,
            "total": total,
            "stats": {
                "total_withdrawn": total_withdrawn,
                "pending_count": pending_count
            }
        }

    @withdrawals_router.get("/{withdrawal_id}")
    async def get_withdrawal_details(
        withdrawal_id: str,
        authorization: str = Header(None)
    ):
        """Get details of a specific withdrawal"""
        user = await get_current_user(authorization)
        
        withdrawal = await db.withdrawals.find_one(
            {"id": withdrawal_id, "user_id": user["id"]},
            {"_id": 0}
        )
        
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Retrait non trouvé")
        
        return withdrawal

    return withdrawals_router
