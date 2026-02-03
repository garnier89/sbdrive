# Module de Transfert Multi-Méthodes SBPAYGO
# Transfert P2P, Mobile Money, International

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import sys
sys.path.append('/app/backend')
from config.countries_config import AFRICAN_COUNTRIES_CONFIG, get_country_config, get_mobile_money_providers

transfers_v2_router = APIRouter(prefix="/api/transfers-v2", tags=["Transfers V2"])

# Exchange rates (demo - in production would use live rates)
EXCHANGE_RATES = {
    "EUR": {"XOF": 655.957, "USD": 1.08, "GHS": 13.5, "NGN": 1620, "KES": 165, "GNF": 9300, "XAF": 655.957},
    "USD": {"XOF": 607, "EUR": 0.93, "GHS": 12.5, "NGN": 1500, "KES": 153, "GNF": 8600, "XAF": 607},
    "XOF": {"EUR": 0.00152, "USD": 0.00165, "XAF": 1, "GNF": 14.2}
}

class P2PTransferRequest(BaseModel):
    recipient_identifier: str  # Email, phone, or SBPAYGO ID
    amount: float
    currency: str = "EUR"
    note: Optional[str] = None

class MobileMoneyTransferRequest(BaseModel):
    phone_number: str
    recipient_name: Optional[str] = None
    country: str
    provider: str
    amount: float
    currency: str
    note: Optional[str] = None

class InternationalTransferRequest(BaseModel):
    recipient_name: str
    recipient_country: str
    amount: float
    source_currency: str
    destination_currency: str
    delivery_method: str  # mobile_money, bank_account, cash_pickup
    delivery_details: dict  # Phone number, bank details, etc.
    note: Optional[str] = None

def setup_transfers_v2_routes(db, jwt_secret, jwt_algorithm, send_push_notification):
    """Setup transfers routes with database access"""

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

    def convert_currency(amount: float, from_currency: str, to_currency: str) -> tuple:
        """Convert amount between currencies"""
        if from_currency == to_currency:
            return amount, 1.0
        
        rates = EXCHANGE_RATES.get(from_currency, {})
        rate = rates.get(to_currency)
        
        if not rate:
            # Try reverse
            reverse_rates = EXCHANGE_RATES.get(to_currency, {})
            reverse_rate = reverse_rates.get(from_currency)
            if reverse_rate:
                rate = 1 / reverse_rate
            else:
                raise HTTPException(status_code=400, detail=f"Conversion {from_currency} -> {to_currency} non supportée")
        
        return amount * rate, rate

    # ==================== CONFIG ROUTES ====================

    @transfers_v2_router.get("/config")
    async def get_transfer_config(authorization: str = Header(None)):
        """Get transfer configuration"""
        user = await get_current_user(authorization)
        
        # Get user's wallets
        wallets = await db.wallets.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).to_list(10)
        
        # Get countries with mobile money
        countries = []
        for code, config in AFRICAN_COUNTRIES_CONFIG.items():
            if config.get("mobile_money"):
                countries.append({
                    "code": code,
                    "name": config["name"],
                    "flag": config["flag"],
                    "currency": config["currency"],
                    "providers_count": len(config["mobile_money"])
                })
        
        return {
            "methods": ["p2p", "mobile_money", "international"],
            "wallets": wallets,
            "supported_countries": countries,
            "exchange_rates": EXCHANGE_RATES,
            "fees": {
                "p2p": {"percent": 0, "fixed": 0, "description": "Gratuit entre utilisateurs SBPAYGO"},
                "mobile_money": {"percent": 1.5, "fixed": 0, "description": "1.5% pour Mobile Money"},
                "international": {"percent": 2.5, "fixed": 1, "description": "2.5% + 1€ pour international"}
            }
        }

    @transfers_v2_router.get("/providers/{country}")
    async def get_transfer_providers(country: str):
        """Get Mobile Money providers for transfers"""
        config = get_country_config(country)
        if not config:
            raise HTTPException(status_code=404, detail="Pays non supporté")
        
        return {
            "country": country.upper(),
            "country_name": config["name"],
            "flag": config["flag"],
            "currency": config["currency"],
            "providers": config.get("mobile_money", [])
        }

    @transfers_v2_router.get("/exchange-rate")
    async def get_exchange_rate(
        from_currency: str,
        to_currency: str,
        amount: float = 100
    ):
        """Get exchange rate between two currencies"""
        try:
            converted, rate = convert_currency(amount, from_currency.upper(), to_currency.upper())
            return {
                "from_currency": from_currency.upper(),
                "to_currency": to_currency.upper(),
                "rate": rate,
                "amount": amount,
                "converted_amount": round(converted, 2)
            }
        except HTTPException:
            raise
        except:
            raise HTTPException(status_code=400, detail="Erreur de conversion")

    # ==================== P2P TRANSFER ====================

    @transfers_v2_router.post("/p2p")
    async def create_p2p_transfer(
        request: P2PTransferRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Transfer to another SBPAYGO user"""
        user = await get_current_user(authorization)
        
        # Find recipient
        recipient = await db.users.find_one({
            "$or": [
                {"email": request.recipient_identifier},
                {"phone": request.recipient_identifier},
                {"id": request.recipient_identifier}
            ]
        }, {"_id": 0})
        
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
        
        if recipient["id"] == user["id"]:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous transférer à vous-même")
        
        # Check sender's wallet
        sender_wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": request.currency},
            {"_id": 0}
        )
        if not sender_wallet or sender_wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # P2P is free
        fees = 0
        total_debit = request.amount
        
        now = datetime.now(timezone.utc)
        transfer_id = str(uuid.uuid4())
        reference = f"P2P-{transfer_id[:8].upper()}"
        
        # Debit sender
        await db.wallets.update_one(
            {"id": sender_wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Credit recipient (create wallet if needed)
        recipient_wallet = await db.wallets.find_one(
            {"user_id": recipient["id"], "currency": request.currency}
        )
        if recipient_wallet:
            await db.wallets.update_one(
                {"id": recipient_wallet["id"]},
                {"$inc": {"balance": request.amount}, "$set": {"updated_at": now.isoformat()}}
            )
        else:
            await db.wallets.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": recipient["id"],
                "currency": request.currency,
                "balance": request.amount,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            })
        
        # Create transfer record
        transfer = {
            "id": transfer_id,
            "type": "p2p",
            "sender_id": user["id"],
            "sender_name": user.get("full_name", ""),
            "recipient_id": recipient["id"],
            "recipient_name": recipient.get("full_name", ""),
            "recipient_identifier": request.recipient_identifier,
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": request.currency,
            "reference": reference,
            "note": request.note,
            "status": "completed",
            "created_at": now.isoformat()
        }
        await db.transfers.insert_one(transfer)
        
        # Create transactions
        for tx in [
            {"user_id": user["id"], "amount": -total_debit, "description": f"Transfert vers {recipient.get('full_name', request.recipient_identifier)}"},
            {"user_id": recipient["id"], "amount": request.amount, "description": f"Reçu de {user.get('full_name', user.get('email', ''))}"}
        ]:
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                **tx,
                "type": "p2p_transfer",
                "currency": request.currency,
                "status": "completed",
                "transfer_id": transfer_id,
                "created_at": now.isoformat()
            })
        
        # Notifications
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Transfert envoyé",
            f"{request.amount} {request.currency} envoyé à {recipient.get('full_name', request.recipient_identifier)}"
        )
        background_tasks.add_task(
            send_push_notification,
            recipient["id"],
            "Transfert reçu",
            f"{request.amount} {request.currency} reçu de {user.get('full_name', user.get('email', ''))}"
        )
        
        return {
            "message": "Transfert effectué",
            "transfer_id": transfer_id,
            "reference": reference,
            "recipient": recipient.get("full_name", request.recipient_identifier),
            "amount": request.amount,
            "fees": fees,
            "currency": request.currency,
            "status": "completed"
        }

    # ==================== MOBILE MONEY TRANSFER ====================

    @transfers_v2_router.post("/mobile-money")
    async def create_mobile_money_transfer(
        request: MobileMoneyTransferRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Transfer to Mobile Money account"""
        user = await get_current_user(authorization)
        
        # Get country config
        config = get_country_config(request.country)
        if not config:
            raise HTTPException(status_code=400, detail="Pays non supporté")
        
        # Validate provider
        providers = config.get("mobile_money", [])
        provider = next((p for p in providers if p["code"] == request.provider), None)
        if not provider:
            raise HTTPException(status_code=400, detail="Opérateur non supporté")
        
        # Validate amount
        if request.amount < provider.get("min", 500):
            raise HTTPException(status_code=400, detail=f"Montant minimum: {provider.get('min', 500)}")
        if request.amount > provider.get("max", 2000000):
            raise HTTPException(status_code=400, detail=f"Montant maximum: {provider.get('max', 2000000)}")
        
        # Check wallet
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": request.currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Calculate fees (1.5% for mobile money)
        fee_percent = 1.5
        fees = request.amount * (fee_percent / 100)
        total_debit = request.amount + fees
        
        if wallet["balance"] < total_debit:
            raise HTTPException(status_code=400, detail="Solde insuffisant pour couvrir les frais")
        
        now = datetime.now(timezone.utc)
        transfer_id = str(uuid.uuid4())
        reference = f"MM-{transfer_id[:8].upper()}"
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create transfer record
        transfer = {
            "id": transfer_id,
            "type": "mobile_money",
            "sender_id": user["id"],
            "sender_name": user.get("full_name", ""),
            "recipient_phone": request.phone_number,
            "recipient_name": request.recipient_name,
            "country": request.country.upper(),
            "provider": request.provider,
            "provider_name": provider["name"],
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": request.currency,
            "reference": reference,
            "note": request.note,
            "status": "completed",  # Demo mode
            "demo_mode": True,
            "created_at": now.isoformat()
        }
        await db.transfers.insert_one(transfer)
        
        # Create transaction
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "mobile_money_transfer",
            "amount": -total_debit,
            "currency": request.currency,
            "status": "completed",
            "description": f"Transfert {provider['name']} vers {request.phone_number}",
            "transfer_id": transfer_id,
            "created_at": now.isoformat()
        })
        
        # Notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Transfert Mobile Money envoyé",
            f"{request.amount} {request.currency} envoyé via {provider['name']} vers {request.phone_number}"
        )
        
        return {
            "message": "Transfert Mobile Money effectué",
            "transfer_id": transfer_id,
            "reference": reference,
            "recipient_phone": request.phone_number,
            "provider": provider["name"],
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": request.currency,
            "status": "completed",
            "demo_mode": True
        }

    # ==================== INTERNATIONAL TRANSFER ====================

    @transfers_v2_router.post("/international")
    async def create_international_transfer(
        request: InternationalTransferRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create international money transfer"""
        user = await get_current_user(authorization)
        
        # Check wallet
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": request.source_currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Convert currency
        try:
            converted_amount, rate = convert_currency(
                request.amount, 
                request.source_currency, 
                request.destination_currency
            )
        except:
            raise HTTPException(status_code=400, detail="Erreur de conversion de devise")
        
        # Calculate fees (2.5% + 1 fixed)
        fee_percent = 2.5
        fee_fixed = 1 if request.source_currency == "EUR" else 655 if request.source_currency == "XOF" else 1
        fees = request.amount * (fee_percent / 100) + fee_fixed
        total_debit = request.amount + fees
        
        if wallet["balance"] < total_debit:
            raise HTTPException(status_code=400, detail="Solde insuffisant pour couvrir les frais")
        
        now = datetime.now(timezone.utc)
        transfer_id = str(uuid.uuid4())
        reference = f"INT-{transfer_id[:8].upper()}"
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create transfer record
        transfer = {
            "id": transfer_id,
            "type": "international",
            "sender_id": user["id"],
            "sender_name": user.get("full_name", ""),
            "recipient_name": request.recipient_name,
            "recipient_country": request.recipient_country,
            "delivery_method": request.delivery_method,
            "delivery_details": request.delivery_details,
            "source_amount": request.amount,
            "source_currency": request.source_currency,
            "destination_amount": round(converted_amount, 2),
            "destination_currency": request.destination_currency,
            "exchange_rate": rate,
            "fees": fees,
            "total_debited": total_debit,
            "reference": reference,
            "note": request.note,
            "status": "processing",  # International takes time
            "estimated_delivery": "1-3 jours ouvrés",
            "created_at": now.isoformat()
        }
        await db.transfers.insert_one(transfer)
        
        # Create transaction
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "international_transfer",
            "amount": -total_debit,
            "currency": request.source_currency,
            "status": "completed",
            "description": f"Transfert international vers {request.recipient_name} ({request.recipient_country})",
            "transfer_id": transfer_id,
            "created_at": now.isoformat()
        })
        
        # Notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Transfert international initié",
            f"{request.amount} {request.source_currency} -> {round(converted_amount, 2)} {request.destination_currency} vers {request.recipient_country}"
        )
        
        return {
            "message": "Transfert international initié",
            "transfer_id": transfer_id,
            "reference": reference,
            "recipient_name": request.recipient_name,
            "recipient_country": request.recipient_country,
            "source_amount": request.amount,
            "source_currency": request.source_currency,
            "destination_amount": round(converted_amount, 2),
            "destination_currency": request.destination_currency,
            "exchange_rate": rate,
            "fees": fees,
            "total_debited": total_debit,
            "delivery_method": request.delivery_method,
            "estimated_delivery": "1-3 jours ouvrés",
            "status": "processing"
        }

    # ==================== HISTORY ====================

    @transfers_v2_router.get("/history")
    async def get_transfer_history(
        type: Optional[str] = None,
        direction: Optional[str] = None,  # sent, received
        limit: int = 50,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Get user's transfer history"""
        user = await get_current_user(authorization)
        
        query = {
            "$or": [
                {"sender_id": user["id"]},
                {"recipient_id": user["id"]}
            ]
        }
        
        if type:
            query["type"] = type
        
        if direction == "sent":
            query = {"sender_id": user["id"]}
            if type:
                query["type"] = type
        elif direction == "received":
            query = {"recipient_id": user["id"]}
            if type:
                query["type"] = type
        
        transfers = await db.transfers.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.transfers.count_documents(query)
        
        # Add direction flag
        for t in transfers:
            t["direction"] = "sent" if t.get("sender_id") == user["id"] else "received"
        
        return {
            "transfers": transfers,
            "total": total
        }

    return transfers_v2_router
