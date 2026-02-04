# Module de Dépôts Multi-Méthodes SBPAYGO
# Dépôt par carte, Mobile Money, Virement bancaire

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import sys
sys.path.append('/app/backend')
from config.countries_config import AFRICAN_COUNTRIES_CONFIG, get_country_config, get_mobile_money_providers, get_quick_amounts

deposits_router = APIRouter(prefix="/api/deposits-v2", tags=["Deposits V2"])

# Mobile Money providers by country (same as withdrawals for consistency)
MOBILE_MONEY_PROVIDERS = {
    "SN": [
        {"code": "wave", "name": "Wave", "logo": "🌊", "min": 500, "max": 2000000, "fee_percent": 0},
        {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "free_money", "name": "Free Money", "logo": "🔵", "min": 500, "max": 500000, "fee_percent": 0.5}
    ],
    "CI": [
        {"code": "wave", "name": "Wave", "logo": "🌊", "min": 500, "max": 2000000, "fee_percent": 0},
        {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "min": 500, "max": 500000, "fee_percent": 0.5}
    ],
    "ML": [
        {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "min": 500, "max": 500000, "fee_percent": 0.5}
    ],
    "BF": [
        {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "min": 500, "max": 500000, "fee_percent": 0.5}
    ],
    "BJ": [
        {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "min": 500, "max": 500000, "fee_percent": 0.5}
    ],
    "TG": [
        {"code": "flooz", "name": "Flooz", "logo": "🟢", "min": 500, "max": 500000, "fee_percent": 0.5},
        {"code": "tmoney", "name": "T-Money", "logo": "🔵", "min": 500, "max": 500000, "fee_percent": 0.5}
    ],
    "CM": [
        {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "min": 500, "max": 1000000, "fee_percent": 0.5},
        {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "min": 500, "max": 1000000, "fee_percent": 0.5}
    ],
    "GH": [
        {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "min": 1, "max": 100000, "fee_percent": 0},
        {"code": "vodafone_cash", "name": "Vodafone Cash", "logo": "🔴", "min": 1, "max": 100000, "fee_percent": 0.5},
        {"code": "airteltigo", "name": "AirtelTigo Money", "logo": "🔵", "min": 1, "max": 50000, "fee_percent": 0.5}
    ],
    "NG": [
        {"code": "opay", "name": "OPay", "logo": "🟢", "min": 100, "max": 10000000, "fee_percent": 0},
        {"code": "palmpay", "name": "PalmPay", "logo": "🟣", "min": 100, "max": 10000000, "fee_percent": 0},
        {"code": "kuda", "name": "Kuda", "logo": "🟣", "min": 100, "max": 10000000, "fee_percent": 0}
    ],
    "KE": [
        {"code": "mpesa", "name": "M-Pesa", "logo": "🟢", "min": 10, "max": 500000, "fee_percent": 0},
        {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "min": 10, "max": 300000, "fee_percent": 0.5}
    ],
    "FR": []  # No Mobile Money in France
}

# Country currencies
COUNTRY_CURRENCIES = {
    "SN": "XOF", "CI": "XOF", "ML": "XOF", "BF": "XOF", "BJ": "XOF", "TG": "XOF",
    "CM": "XAF", "GH": "GHS", "NG": "NGN", "KE": "KES",
    "FR": "EUR", "US": "USD", "GB": "GBP", "DE": "EUR"
}

# Quick deposit amounts by currency
QUICK_AMOUNTS = {
    "XOF": [5000, 10000, 25000, 50000, 100000, 250000],
    "XAF": [5000, 10000, 25000, 50000, 100000, 250000],
    "EUR": [10, 25, 50, 100, 250, 500],
    "USD": [10, 25, 50, 100, 250, 500],
    "GHS": [50, 100, 200, 500, 1000, 2000],
    "NGN": [5000, 10000, 20000, 50000, 100000, 200000],
    "KES": [500, 1000, 2000, 5000, 10000, 20000]
}

# SBPAYGO Bank accounts for wire transfer
SBPAYGO_BANK_ACCOUNTS = {
    "EUR": {
        "bank_name": "BNP Paribas",
        "account_holder": "SBPAYGO SAS",
        "iban": "FR76 3000 4028 3700 0100 0123 456",
        "bic": "BNPAFRPP",
        "reference_prefix": "SBP-EUR"
    },
    "XOF": {
        "bank_name": "CBAO Groupe Attijariwafa",
        "account_holder": "SBPAYGO SARL",
        "iban": "SN08 SN00 0100 0000 0000 0123 4567",
        "bic": "CBAOSNDA",
        "reference_prefix": "SBP-XOF"
    },
    "USD": {
        "bank_name": "Chase Bank",
        "account_holder": "SBPAYGO Inc",
        "account_number": "****4567",
        "routing_number": "****1234",
        "reference_prefix": "SBP-USD"
    }
}

# Request models
class CardDepositRequest(BaseModel):
    amount: float
    currency: str = "EUR"

class MobileMoneyDepositRequest(BaseModel):
    amount: float
    currency: str = "XOF"
    country: str
    provider: str
    phone_number: str

class BankTransferRequest(BaseModel):
    amount: float
    currency: str = "EUR"

def setup_deposits_v2_routes(db, jwt_secret, jwt_algorithm, send_push_notification, send_email_notification):
    """Setup deposits routes with database access"""

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

    @deposits_router.get("/config")
    async def get_deposit_config(authorization: str = Header(None)):
        """Get deposit configuration for user's country"""
        user = await get_current_user(authorization)
        country = user.get("country", "FR")
        currency = COUNTRY_CURRENCIES.get(country, "EUR")
        
        # Available methods based on country
        methods = ["card"]  # Card always available
        if country in MOBILE_MONEY_PROVIDERS and len(MOBILE_MONEY_PROVIDERS[country]) > 0:
            methods.append("mobile_money")
        methods.append("bank_transfer")  # Bank transfer always available
        
        providers = MOBILE_MONEY_PROVIDERS.get(country, [])
        quick_amounts = QUICK_AMOUNTS.get(currency, QUICK_AMOUNTS.get("EUR"))
        
        # Get wallets
        wallets = await db.wallets.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).to_list(10)
        
        return {
            "country": country,
            "currency": currency,
            "methods": methods,
            "mobile_money_providers": providers,
            "quick_amounts": quick_amounts,
            "wallets": wallets,
            "bank_account": SBPAYGO_BANK_ACCOUNTS.get(currency),
            "limits": {
                "min_amount": 1 if currency in ["EUR", "USD"] else 500,
                "max_daily": 50000 if currency in ["EUR", "USD"] else 10000000,
                "max_transaction": 10000 if currency in ["EUR", "USD"] else 5000000
            }
        }

    @deposits_router.get("/providers/{country}")
    async def get_mobile_money_providers(country: str):
        """Get Mobile Money providers for a specific country"""
        providers = MOBILE_MONEY_PROVIDERS.get(country.upper(), [])
        currency = COUNTRY_CURRENCIES.get(country.upper(), "XOF")
        return {
            "country": country.upper(), 
            "currency": currency,
            "providers": providers
        }

    @deposits_router.get("/quick-amounts/{currency}")
    async def get_quick_amounts(currency: str):
        """Get quick deposit amounts for a currency"""
        amounts = QUICK_AMOUNTS.get(currency.upper(), QUICK_AMOUNTS.get("EUR"))
        return {"currency": currency.upper(), "amounts": amounts}

    @deposits_router.get("/bank-info/{currency}")
    async def get_bank_info(currency: str, authorization: str = Header(None)):
        """Get SBPAYGO bank account for wire transfers"""
        user = await get_current_user(authorization)
        
        bank_info = SBPAYGO_BANK_ACCOUNTS.get(currency.upper())
        if not bank_info:
            raise HTTPException(status_code=404, detail="Devise non supportée pour virement")
        
        # Generate unique reference for this user
        reference = f"{bank_info['reference_prefix']}-{user['id'][:8].upper()}"
        
        return {
            "currency": currency.upper(),
            "bank_info": bank_info,
            "reference": reference,
            "instructions": f"Incluez la référence '{reference}' dans le motif du virement pour un crédit automatique."
        }

    # ==================== MOBILE MONEY DEPOSIT ====================

    @deposits_router.post("/mobile-money")
    async def create_mobile_money_deposit(
        request: MobileMoneyDepositRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create a Mobile Money deposit request"""
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
        
        now = datetime.now(timezone.utc)
        deposit_id = str(uuid.uuid4())
        reference = f"DEP-{deposit_id[:8].upper()}"
        
        # Calculate fees (deposits usually free or low fees)
        fees = request.amount * (provider["fee_percent"] / 100)
        net_amount = request.amount - fees
        
        # Create deposit record
        deposit = {
            "id": deposit_id,
            "user_id": user["id"],
            "type": "mobile_money",
            "amount": request.amount,
            "fees": fees,
            "net_amount": net_amount,
            "currency": request.currency,
            "country": request.country.upper(),
            "provider": request.provider,
            "provider_name": provider["name"],
            "phone_number": request.phone_number,
            "reference": reference,
            "status": "pending",
            "demo_mode": True,
            "created_at": now.isoformat()
        }
        await db.deposits.insert_one(deposit)
        
        # In demo mode, auto-confirm after a delay
        # In production, this would wait for webhook from Mobile Money provider
        
        # For demo: immediately credit wallet
        wallet = await db.wallets.find_one({"user_id": user["id"], "currency": request.currency})
        if wallet:
            await db.wallets.update_one(
                {"id": wallet["id"]},
                {"$inc": {"balance": net_amount}, "$set": {"updated_at": now.isoformat()}}
            )
        else:
            # Create wallet if doesn't exist
            await db.wallets.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "currency": request.currency,
                "balance": net_amount,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            })
        
        # Update deposit status
        await db.deposits.update_one(
            {"id": deposit_id},
            {"$set": {"status": "completed", "completed_at": now.isoformat()}}
        )
        
        # Create transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "deposit_mobile_money",
            "amount": net_amount,
            "currency": request.currency,
            "status": "completed",
            "description": f"Dépôt {provider['name']} depuis {request.phone_number}",
            "deposit_id": deposit_id,
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Dépôt Mobile Money reçu",
            f"{net_amount} {request.currency} crédité via {provider['name']}"
        )
        
        return {
            "message": "Dépôt Mobile Money effectué",
            "deposit_id": deposit_id,
            "reference": reference,
            "amount": request.amount,
            "fees": fees,
            "net_credited": net_amount,
            "provider": provider["name"],
            "status": "completed",
            "demo_mode": True,
            "instructions": f"En mode démo, le dépôt est crédité instantanément. En production, vous recevrez une demande de paiement sur {request.phone_number}."
        }

    # ==================== BANK TRANSFER DEPOSIT ====================

    @deposits_router.post("/bank-transfer")
    async def create_bank_transfer_deposit(
        request: BankTransferRequest,
        authorization: str = Header(None)
    ):
        """Create a bank transfer deposit request"""
        user = await get_current_user(authorization)
        
        bank_info = SBPAYGO_BANK_ACCOUNTS.get(request.currency.upper())
        if not bank_info:
            raise HTTPException(status_code=400, detail="Devise non supportée")
        
        now = datetime.now(timezone.utc)
        deposit_id = str(uuid.uuid4())
        reference = f"{bank_info['reference_prefix']}-{user['id'][:8].upper()}-{deposit_id[:4].upper()}"
        
        # Create pending deposit record
        deposit = {
            "id": deposit_id,
            "user_id": user["id"],
            "type": "bank_transfer",
            "expected_amount": request.amount,
            "currency": request.currency.upper(),
            "reference": reference,
            "bank_info": bank_info,
            "status": "awaiting_transfer",
            "created_at": now.isoformat(),
            "expires_at": (now.replace(hour=23, minute=59, second=59)).isoformat()
        }
        await db.deposits.insert_one(deposit)
        
        return {
            "message": "Virement en attente",
            "deposit_id": deposit_id,
            "reference": reference,
            "expected_amount": request.amount,
            "currency": request.currency.upper(),
            "bank_info": bank_info,
            "status": "awaiting_transfer",
            "instructions": [
                f"1. Effectuez un virement de {request.amount} {request.currency.upper()} vers le compte ci-dessus",
                f"2. Utilisez EXACTEMENT cette référence: {reference}",
                "3. Votre compte sera crédité sous 1-2 jours ouvrés après réception",
                "4. Conservez votre preuve de virement"
            ]
        }

    # ==================== DEPOSIT HISTORY ====================

    @deposits_router.get("/history")
    async def get_deposit_history(
        status: Optional[str] = None,
        method: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Get user's deposit history"""
        user = await get_current_user(authorization)
        
        query = {"user_id": user["id"]}
        if status:
            query["status"] = status
        if method:
            query["type"] = method
        
        deposits = await db.deposits.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.deposits.count_documents(query)
        
        # Stats
        total_deposited = 0
        cursor = db.deposits.find({"user_id": user["id"], "status": "completed"})
        async for d in cursor:
            total_deposited += d.get("net_amount", d.get("amount", 0))
        
        pending_count = await db.deposits.count_documents({"user_id": user["id"], "status": {"$in": ["pending", "awaiting_transfer"]}})
        
        return {
            "deposits": deposits,
            "total": total,
            "stats": {
                "total_deposited": total_deposited,
                "pending_count": pending_count
            }
        }

    @deposits_router.get("/{deposit_id}")
    async def get_deposit_details(
        deposit_id: str,
        authorization: str = Header(None)
    ):
        """Get details of a specific deposit"""
        user = await get_current_user(authorization)
        
        deposit = await db.deposits.find_one(
            {"id": deposit_id, "user_id": user["id"]},
            {"_id": 0}
        )
        
        if not deposit:
            raise HTTPException(status_code=404, detail="Dépôt non trouvé")
        
        return deposit

    return deposits_router
