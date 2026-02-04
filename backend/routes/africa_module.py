# Module Afrique - Mobile Money Interop & Airtime
# Routes pour les transferts inter-opérateurs et recharges téléphoniques

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import random
import asyncio

# Create router
africa_router = APIRouter(prefix="/api/africa", tags=["Africa Module"])

# ==================== MODELS ====================

class MobileMoneyTransferRequest(BaseModel):
    source_operator: str  # wave, orange_money, mtn_momo, moov
    source_phone: str
    dest_operator: str
    dest_phone: str
    dest_country: str
    amount: float
    currency: str = "XOF"

class AirtimeTopupRequest(BaseModel):
    phone_number: str
    operator: str
    country: str
    amount: float
    currency: str = "XOF"
    payment_method: str = "wallet"  # wallet or mobile_money

class BeneficiaryCreate(BaseModel):
    nickname: str
    type: str  # mobile_money, bank, wallet
    operator: Optional[str] = None
    phone_number: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    wallet_email: Optional[str] = None
    country: str
    is_favorite: bool = False

class ScheduledTransferCreate(BaseModel):
    beneficiary_id: str
    amount: float
    currency: str = "XOF"
    frequency: str  # once, daily, weekly, monthly
    start_date: str  # ISO format
    max_executions: Optional[int] = None

class BillPaymentRequest(BaseModel):
    bill_type: str  # electricity, water, internet, tv
    provider: str
    customer_ref: str  # meter number, subscriber ID
    amount: float
    currency: str = "XOF"
    payment_method: str = "wallet"

class DisputeCreate(BaseModel):
    transaction_id: str
    type: str  # not_received, wrong_amount, fraud, other
    description: str

# ==================== FEE CONFIGURATION ====================

# Frais par corridor Mobile Money (en XOF)
MM_FEES = {
    ("wave", "orange_money"): {"fixed": 100, "percent": 1.0},
    ("wave", "mtn_momo"): {"fixed": 100, "percent": 1.0},
    ("wave", "moov"): {"fixed": 100, "percent": 1.2},
    ("orange_money", "wave"): {"fixed": 100, "percent": 1.0},
    ("orange_money", "mtn_momo"): {"fixed": 150, "percent": 1.2},
    ("orange_money", "moov"): {"fixed": 150, "percent": 1.2},
    ("mtn_momo", "wave"): {"fixed": 100, "percent": 1.0},
    ("mtn_momo", "orange_money"): {"fixed": 150, "percent": 1.2},
    ("mtn_momo", "moov"): {"fixed": 150, "percent": 1.5},
    ("moov", "wave"): {"fixed": 100, "percent": 1.2},
    ("moov", "orange_money"): {"fixed": 150, "percent": 1.2},
    ("moov", "mtn_momo"): {"fixed": 150, "percent": 1.5},
}

# Import configuration from centralized config
from config.countries_config import AFRICAN_COUNTRIES_CONFIG, get_mobile_money_providers, get_telecom_operators

# Opérateurs Mobile Money par pays - Généré depuis la config centralisée
MM_OPERATORS_BY_COUNTRY = {
    code: [op["code"] for op in config.get("mobile_money", [])]
    for code, config in AFRICAN_COUNTRIES_CONFIG.items()
    if config.get("mobile_money")
}

# Opérateurs télécom pour Airtime - Généré depuis la config centralisée
AIRTIME_OPERATORS = {
    code: [
        {"code": op["code"], "name": op["name"], "min": 100, "max": 100000}
        for op in config.get("telecom_operators", [])
    ]
    for code, config in AFRICAN_COUNTRIES_CONFIG.items()
    if config.get("telecom_operators")
}

# Fournisseurs de factures
BILL_PROVIDERS = {
    "SN": [
        {"code": "senelec", "name": "SENELEC", "type": "electricity"},
        {"code": "sde", "name": "SDE (Eau)", "type": "water"},
        {"code": "canal_sn", "name": "Canal+", "type": "tv"},
        {"code": "orange_fiber_sn", "name": "Orange Fibre", "type": "internet"},
    ],
    "CI": [
        {"code": "cie", "name": "CIE (Électricité)", "type": "electricity"},
        {"code": "sodeci", "name": "SODECI (Eau)", "type": "water"},
        {"code": "canal_ci", "name": "Canal+", "type": "tv"},
    ],
}

# ==================== HELPER FUNCTIONS ====================

def calculate_mm_fees(source: str, dest: str, amount: float) -> dict:
    """Calculate Mobile Money transfer fees"""
    key = (source.lower(), dest.lower())
    if key in MM_FEES:
        config = MM_FEES[key]
        fee_amount = config["fixed"] + (amount * config["percent"] / 100)
        fee_amount = max(150, min(fee_amount, 7000))  # Min 150, Max 7000 XOF
        return {
            "fixed": config["fixed"],
            "percent": config["percent"],
            "total": round(fee_amount, 0),
            "amount_received": round(amount - fee_amount, 0)
        }
    # Default fees for same operator
    return {
        "fixed": 0,
        "percent": 0.5,
        "total": round(amount * 0.005, 0),
        "amount_received": round(amount * 0.995, 0)
    }

def generate_reference(prefix: str = "SB") -> str:
    """Generate unique reference"""
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"

# ==================== ROUTES - MOBILE MONEY INTEROP ====================

# Global notification functions
_send_push_notification = None
_send_email_notification = None
_send_sms_notification = None

def setup_africa_routes(db, get_current_user, send_push_notification=None, send_email_notification=None, send_sms_notification=None):
    """Setup all Africa module routes with database access and notifications"""
    global _send_push_notification, _send_email_notification, _send_sms_notification
    _send_push_notification = send_push_notification
    _send_email_notification = send_email_notification
    _send_sms_notification = send_sms_notification
    
    @africa_router.get("/mobile-money/operators")
    async def get_mm_operators(country: Optional[str] = None):
        """Get available Mobile Money operators"""
        if country and country.upper() in MM_OPERATORS_BY_COUNTRY:
            operators = MM_OPERATORS_BY_COUNTRY[country.upper()]
            return {
                "country": country.upper(),
                "operators": [
                    {
                        "code": op,
                        "name": op.replace("_", " ").title(),
                        "logo_url": f"/images/operators/{op}.png"
                    }
                    for op in operators
                ]
            }
        return {
            "countries": list(MM_OPERATORS_BY_COUNTRY.keys()),
            "operators_by_country": {
                country: [{"code": op, "name": op.replace("_", " ").title()} for op in ops]
                for country, ops in MM_OPERATORS_BY_COUNTRY.items()
            }
        }

    @africa_router.get("/mobile-money/fees")
    async def calculate_fees(
        source_operator: str,
        dest_operator: str,
        amount: float
    ):
        """Calculate transfer fees between operators"""
        fees = calculate_mm_fees(source_operator, dest_operator, amount)
        return {
            "source_operator": source_operator,
            "dest_operator": dest_operator,
            "amount": amount,
            "currency": "XOF",
            "fees": fees
        }

    @africa_router.post("/mobile-money/transfer")
    async def create_mm_transfer(
        request: MobileMoneyTransferRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Create cross-network Mobile Money transfer"""
        user_id = current_user["id"]
        
        # Check wallet balance
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        fees = calculate_mm_fees(request.source_operator, request.dest_operator, request.amount)
        total_amount = request.amount + fees["total"]
        
        if not wallet or wallet.get("balance", 0) < total_amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Create transfer record
        transfer_id = str(uuid.uuid4())
        transfer = {
            "id": transfer_id,
            "user_id": user_id,
            "source_operator": request.source_operator,
            "source_phone": request.source_phone,
            "dest_operator": request.dest_operator,
            "dest_phone": request.dest_phone,
            "dest_country": request.dest_country,
            "amount": request.amount,
            "currency": request.currency,
            "fee_fixed": fees["fixed"],
            "fee_percent": fees["percent"],
            "total_fee": fees["total"],
            "amount_received": fees["amount_received"],
            "status": "processing",
            "external_ref": generate_reference("MM"),
            "aggregator": "mfs_africa",  # Would be real in production
            "webhook_received": False,
            "created_at": datetime.now(timezone.utc),
            "completed_at": None
        }
        
        await db.mobile_money_transfers.insert_one(transfer)
        
        # Debit wallet
        await db.wallets.update_one(
            {"user_id": user_id, "currency": request.currency},
            {"$inc": {"balance": -total_amount}}
        )
        
        # Create transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "mm_transfer",
            "method": "mobile_money",
            "amount": request.amount,
            "fee": fees["total"],
            "currency": request.currency,
            "status": "processing",
            "reference": transfer["external_ref"],
            "description": f"Transfert {request.source_operator} → {request.dest_operator}: {request.dest_phone}",
            "created_at": datetime.now(timezone.utc)
        }
        await db.transactions.insert_one(transaction)
        
        # Simulate async processing (in production, this would call real API)
        # For demo: auto-complete after 3 seconds
        async def complete_transfer():
            await asyncio.sleep(3)
            await db.mobile_money_transfers.update_one(
                {"id": transfer_id},
                {
                    "$set": {
                        "status": "completed",
                        "webhook_received": True,
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
            await db.transactions.update_one(
                {"reference": transfer["external_ref"]},
                {"$set": {"status": "completed"}}
            )
        
        asyncio.create_task(complete_transfer())
        
        # Remove _id from response
        transfer.pop("_id", None)
        return {
            "message": "Transfert en cours de traitement",
            "transfer": transfer,
            "demo_mode": True
        }

    @africa_router.get("/mobile-money/transfers")
    async def get_mm_transfers(
        current_user: dict = Depends(get_current_user),
        limit: int = 20
    ):
        """Get user's Mobile Money transfers"""
        transfers = await db.mobile_money_transfers.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        return {"transfers": transfers}

    # ==================== ROUTES - AIRTIME ====================

    @africa_router.get("/airtime/operators")
    async def get_airtime_operators(country: Optional[str] = None):
        """Get available telecom operators for airtime"""
        if country and country.upper() in AIRTIME_OPERATORS:
            return {
                "country": country.upper(),
                "operators": AIRTIME_OPERATORS[country.upper()]
            }
        return {
            "countries": list(AIRTIME_OPERATORS.keys()),
            "operators_by_country": AIRTIME_OPERATORS
        }

    @africa_router.post("/airtime/topup")
    async def create_airtime_topup(
        request: AirtimeTopupRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Purchase airtime/credit for a phone number"""
        user_id = current_user["id"]
        
        # Validate operator
        country_operators = AIRTIME_OPERATORS.get(request.country.upper(), [])
        operator_info = next(
            (op for op in country_operators if op["code"] == request.operator),
            None
        )
        
        if not operator_info:
            raise HTTPException(status_code=400, detail="Opérateur non disponible")
        
        if request.amount < operator_info["min"] or request.amount > operator_info["max"]:
            raise HTTPException(
                status_code=400,
                detail=f"Montant doit être entre {operator_info['min']} et {operator_info['max']} {request.currency}"
            )
        
        # Calculate fee (2% for airtime)
        fee = round(request.amount * 0.02, 0)
        total = request.amount + fee
        
        # Check wallet balance
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        if not wallet or wallet.get("balance", 0) < total:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Create topup record
        topup_id = str(uuid.uuid4())
        topup = {
            "id": topup_id,
            "user_id": user_id,
            "phone_number": request.phone_number,
            "operator": request.operator,
            "operator_name": operator_info["name"],
            "country": request.country.upper(),
            "amount": request.amount,
            "currency": request.currency,
            "fee": fee,
            "total_charged": total,
            "payment_method": request.payment_method,
            "status": "processing",
            "external_ref": generate_reference("AIR"),
            "provider": "reloadly",  # Would be real in production
            "created_at": datetime.now(timezone.utc),
            "completed_at": None
        }
        
        await db.airtime_topups.insert_one(topup)
        
        # Debit wallet
        await db.wallets.update_one(
            {"user_id": user_id, "currency": request.currency},
            {"$inc": {"balance": -total}}
        )
        
        # Create transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "airtime",
            "method": request.payment_method,
            "amount": request.amount,
            "fee": fee,
            "currency": request.currency,
            "status": "processing",
            "reference": topup["external_ref"],
            "description": f"Recharge {operator_info['name']}: {request.phone_number}",
            "created_at": datetime.now(timezone.utc)
        }
        await db.transactions.insert_one(transaction)
        
        # Simulate completion
        async def complete_topup():
            await asyncio.sleep(2)
            await db.airtime_topups.update_one(
                {"id": topup_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
            await db.transactions.update_one(
                {"reference": topup["external_ref"]},
                {"$set": {"status": "completed"}}
            )
        
        asyncio.create_task(complete_topup())
        
        topup.pop("_id", None)
        return {
            "message": "Recharge en cours",
            "topup": topup,
            "demo_mode": True
        }

    @africa_router.get("/airtime/history")
    async def get_airtime_history(
        current_user: dict = Depends(get_current_user),
        limit: int = 20
    ):
        """Get user's airtime purchase history"""
        topups = await db.airtime_topups.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        return {"topups": topups}

    # ==================== ROUTES - BILL PAYMENTS ====================

    @africa_router.get("/bills/providers")
    async def get_bill_providers(country: Optional[str] = None, bill_type: Optional[str] = None):
        """Get available bill payment providers"""
        result = {}
        for c, providers in BILL_PROVIDERS.items():
            if country and c != country.upper():
                continue
            filtered = providers
            if bill_type:
                filtered = [p for p in providers if p["type"] == bill_type]
            if filtered:
                result[c] = filtered
        return {"providers": result}

    @africa_router.post("/bills/pay")
    async def pay_bill(
        request: BillPaymentRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Pay a bill (electricity, water, internet, TV)"""
        user_id = current_user["id"]
        
        # Calculate fee (1% for bills, min 100 XOF)
        fee = max(100, round(request.amount * 0.01, 0))
        total = request.amount + fee
        
        # Check wallet
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        if not wallet or wallet.get("balance", 0) < total:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Create bill payment record
        payment_id = str(uuid.uuid4())
        payment = {
            "id": payment_id,
            "user_id": user_id,
            "bill_type": request.bill_type,
            "provider": request.provider,
            "provider_name": request.provider.upper(),
            "customer_ref": request.customer_ref,
            "amount": request.amount,
            "fee": fee,
            "currency": request.currency,
            "status": "processing",
            "external_ref": generate_reference("BILL"),
            "payment_method": request.payment_method,
            "created_at": datetime.now(timezone.utc),
            "completed_at": None
        }
        
        await db.bill_payments.insert_one(payment)
        
        # Debit wallet
        await db.wallets.update_one(
            {"user_id": user_id, "currency": request.currency},
            {"$inc": {"balance": -total}}
        )
        
        # Create transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "bill_payment",
            "method": request.payment_method,
            "amount": request.amount,
            "fee": fee,
            "currency": request.currency,
            "status": "processing",
            "reference": payment["external_ref"],
            "description": f"Paiement {request.bill_type}: {request.provider} - {request.customer_ref}",
            "created_at": datetime.now(timezone.utc)
        }
        await db.transactions.insert_one(transaction)
        
        # Simulate completion
        async def complete_payment():
            await asyncio.sleep(2)
            await db.bill_payments.update_one(
                {"id": payment_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc)
                    }
                }
            )
            await db.transactions.update_one(
                {"reference": payment["external_ref"]},
                {"$set": {"status": "completed"}}
            )
        
        asyncio.create_task(complete_payment())
        
        payment.pop("_id", None)
        return {
            "message": "Paiement en cours",
            "payment": payment,
            "demo_mode": True
        }

    @africa_router.get("/bills/history")
    async def get_bill_history(
        current_user: dict = Depends(get_current_user),
        limit: int = 20
    ):
        """Get user's bill payment history"""
        payments = await db.bill_payments.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        return {"payments": payments}

    # ==================== ROUTES - BENEFICIARIES ====================

    @africa_router.post("/beneficiaries")
    async def create_beneficiary(
        request: BeneficiaryCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Add a new beneficiary"""
        beneficiary = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "nickname": request.nickname,
            "type": request.type,
            "operator": request.operator,
            "phone_number": request.phone_number,
            "bank_name": request.bank_name,
            "account_number": request.account_number,
            "iban": request.iban,
            "wallet_email": request.wallet_email,
            "country": request.country,
            "is_favorite": request.is_favorite,
            "last_used_at": None,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.beneficiaries.insert_one(beneficiary)
        beneficiary.pop("_id", None)
        return {"message": "Bénéficiaire ajouté", "beneficiary": beneficiary}

    @africa_router.get("/beneficiaries")
    async def get_beneficiaries(
        current_user: dict = Depends(get_current_user),
        type: Optional[str] = None
    ):
        """Get user's beneficiaries"""
        query = {"user_id": current_user["id"]}
        if type:
            query["type"] = type
        
        beneficiaries = await db.beneficiaries.find(
            query,
            {"_id": 0}
        ).sort([("is_favorite", -1), ("last_used_at", -1)]).to_list(length=100)
        return {"beneficiaries": beneficiaries}

    @africa_router.put("/beneficiaries/{beneficiary_id}")
    async def update_beneficiary(
        beneficiary_id: str,
        is_favorite: bool,
        current_user: dict = Depends(get_current_user)
    ):
        """Update beneficiary (favorite status)"""
        result = await db.beneficiaries.update_one(
            {"id": beneficiary_id, "user_id": current_user["id"]},
            {"$set": {"is_favorite": is_favorite}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        return {"message": "Bénéficiaire mis à jour"}

    @africa_router.delete("/beneficiaries/{beneficiary_id}")
    async def delete_beneficiary(
        beneficiary_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a beneficiary"""
        result = await db.beneficiaries.delete_one({
            "id": beneficiary_id,
            "user_id": current_user["id"]
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        return {"message": "Bénéficiaire supprimé"}

    # ==================== ROUTES - SCHEDULED TRANSFERS ====================

    @africa_router.post("/scheduled-transfers")
    async def create_scheduled_transfer(
        request: ScheduledTransferCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a scheduled/recurring transfer"""
        # Verify beneficiary exists
        beneficiary = await db.beneficiaries.find_one({
            "id": request.beneficiary_id,
            "user_id": current_user["id"]
        })
        if not beneficiary:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        
        scheduled = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "beneficiary_id": request.beneficiary_id,
            "beneficiary_name": beneficiary.get("nickname"),
            "amount": request.amount,
            "currency": request.currency,
            "frequency": request.frequency,
            "next_execution": datetime.fromisoformat(request.start_date.replace('Z', '+00:00')),
            "last_execution": None,
            "status": "active",
            "executions_count": 0,
            "max_executions": request.max_executions,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.scheduled_transfers.insert_one(scheduled)
        scheduled.pop("_id", None)
        return {"message": "Transfert programmé créé", "scheduled_transfer": scheduled}

    @africa_router.get("/scheduled-transfers")
    async def get_scheduled_transfers(
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's scheduled transfers"""
        transfers = await db.scheduled_transfers.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        return {"scheduled_transfers": transfers}

    @africa_router.put("/scheduled-transfers/{transfer_id}/pause")
    async def pause_scheduled_transfer(
        transfer_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Pause a scheduled transfer"""
        result = await db.scheduled_transfers.update_one(
            {"id": transfer_id, "user_id": current_user["id"]},
            {"$set": {"status": "paused"}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Transfert non trouvé")
        return {"message": "Transfert mis en pause"}

    @africa_router.put("/scheduled-transfers/{transfer_id}/resume")
    async def resume_scheduled_transfer(
        transfer_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Resume a paused scheduled transfer"""
        result = await db.scheduled_transfers.update_one(
            {"id": transfer_id, "user_id": current_user["id"], "status": "paused"},
            {"$set": {"status": "active"}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Transfert non trouvé ou non en pause")
        return {"message": "Transfert repris"}

    @africa_router.delete("/scheduled-transfers/{transfer_id}")
    async def cancel_scheduled_transfer(
        transfer_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Cancel a scheduled transfer"""
        result = await db.scheduled_transfers.update_one(
            {"id": transfer_id, "user_id": current_user["id"]},
            {"$set": {"status": "cancelled"}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Transfert non trouvé")
        return {"message": "Transfert annulé"}

    # ==================== ROUTES - DISPUTES ====================

    @africa_router.post("/disputes")
    async def create_dispute(
        request: DisputeCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Report a dispute on a transaction"""
        # Verify transaction exists
        transaction = await db.transactions.find_one({
            "id": request.transaction_id,
            "user_id": current_user["id"]
        })
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        dispute = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "transaction_id": request.transaction_id,
            "type": request.type,
            "description": request.description,
            "status": "open",
            "resolution": None,
            "refund_amount": None,
            "assigned_to": None,
            "created_at": datetime.now(timezone.utc),
            "resolved_at": None
        }
        
        await db.disputes.insert_one(dispute)
        dispute.pop("_id", None)
        return {"message": "Réclamation enregistrée", "dispute": dispute}

    @africa_router.get("/disputes")
    async def get_disputes(
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's disputes"""
        disputes = await db.disputes.find(
            {"user_id": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        return {"disputes": disputes}

    # ==================== ROUTES - TRANSACTION LIMITS ====================

    @africa_router.get("/limits")
    async def get_user_limits(
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's transaction limits based on KYC level"""
        user = await db.users.find_one({"id": current_user["id"]})
        kyc_level = 1 if user.get("kyc_status") == "verified" else 0
        
        # Default limits (in XOF)
        limits = {
            0: {"per_transaction": 25000, "per_day": 50000, "per_month": 200000},
            1: {"per_transaction": 250000, "per_day": 500000, "per_month": 2000000},
            2: {"per_transaction": 1000000, "per_day": 2500000, "per_month": 10000000},
            3: {"per_transaction": 5000000, "per_day": 10000000, "per_month": 50000000},
        }
        
        # Calculate used amounts today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        
        today_total = 0
        month_total = 0
        
        async for txn in db.transactions.find({
            "user_id": current_user["id"],
            "status": "completed",
            "created_at": {"$gte": today_start}
        }):
            today_total += txn.get("amount", 0)
        
        async for txn in db.transactions.find({
            "user_id": current_user["id"],
            "status": "completed",
            "created_at": {"$gte": month_start}
        }):
            month_total += txn.get("amount", 0)
        
        user_limits = limits.get(kyc_level, limits[0])
        
        return {
            "kyc_level": kyc_level,
            "limits": user_limits,
            "used": {
                "today": today_total,
                "this_month": month_total
            },
            "remaining": {
                "today": max(0, user_limits["per_day"] - today_total),
                "this_month": max(0, user_limits["per_month"] - month_total)
            },
            "currency": "XOF"
        }

    return africa_router
