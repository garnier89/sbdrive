# International Payments Module - Europe, USA, Asia (China)
# Routes pour les paiements internationaux (PayPal, Alipay, WeChat Pay)

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import random

international_router = APIRouter(prefix="/api/payments/international", tags=["International Payments"])

# ==================== DATA MODELS ====================

class PaymentMethodRequest(BaseModel):
    provider: str  # alipay, wechat_pay, paypal, sepa, ach
    amount: float
    currency: str = "EUR"
    recipient_id: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class DepositRequest(BaseModel):
    provider: str
    amount: float
    currency: str = "EUR"
    return_url: Optional[str] = None

class WithdrawalRequest(BaseModel):
    provider: str
    amount: float
    currency: str = "EUR"
    account_details: Dict[str, Any]

# ==================== CONFIGURATION ====================

# Supported payment providers by region
PAYMENT_PROVIDERS = {
    "europe": {
        "sepa": {
            "name": "SEPA Transfer",
            "currencies": ["EUR"],
            "min_amount": 1,
            "max_amount": 100000,
            "fee_percent": 0,
            "fee_fixed": 0,
            "processing_time": "1-2 business days"
        },
        "paypal": {
            "name": "PayPal",
            "currencies": ["EUR", "GBP", "USD"],
            "min_amount": 1,
            "max_amount": 10000,
            "fee_percent": 2.9,
            "fee_fixed": 0.35,
            "processing_time": "Instant"
        },
        "card": {
            "name": "Carte bancaire (Visa/Mastercard)",
            "currencies": ["EUR", "GBP", "USD"],
            "min_amount": 5,
            "max_amount": 5000,
            "fee_percent": 2.5,
            "fee_fixed": 0,
            "processing_time": "Instant"
        }
    },
    "usa": {
        "ach": {
            "name": "ACH Transfer",
            "currencies": ["USD"],
            "min_amount": 1,
            "max_amount": 25000,
            "fee_percent": 0.5,
            "fee_fixed": 0.25,
            "processing_time": "2-3 business days"
        },
        "paypal": {
            "name": "PayPal",
            "currencies": ["USD"],
            "min_amount": 1,
            "max_amount": 10000,
            "fee_percent": 2.9,
            "fee_fixed": 0.30,
            "processing_time": "Instant"
        },
        "card": {
            "name": "Credit/Debit Card",
            "currencies": ["USD"],
            "min_amount": 5,
            "max_amount": 5000,
            "fee_percent": 2.9,
            "fee_fixed": 0.30,
            "processing_time": "Instant"
        }
    },
    "asia": {
        "alipay": {
            "name": "Alipay (支付宝)",
            "currencies": ["CNY", "USD", "EUR"],
            "min_amount": 10,
            "max_amount": 50000,
            "fee_percent": 2.2,
            "fee_fixed": 0,
            "processing_time": "Instant",
            "icon": "🔷",
            "supported_countries": ["CN", "HK", "MO", "TW", "SG", "MY", "TH", "JP", "KR"]
        },
        "wechat_pay": {
            "name": "WeChat Pay (微信支付)",
            "currencies": ["CNY", "USD", "EUR"],
            "min_amount": 10,
            "max_amount": 50000,
            "fee_percent": 2.0,
            "fee_fixed": 0,
            "processing_time": "Instant",
            "icon": "🟢",
            "supported_countries": ["CN", "HK", "MO", "TW", "SG", "MY", "TH"]
        },
        "unionpay": {
            "name": "UnionPay (银联)",
            "currencies": ["CNY", "USD", "EUR"],
            "min_amount": 10,
            "max_amount": 100000,
            "fee_percent": 1.5,
            "fee_fixed": 0,
            "processing_time": "1-2 business days",
            "icon": "🔴"
        }
    },
    "africa": {
        "mobile_money": {
            "name": "Mobile Money",
            "currencies": ["XOF", "XAF", "NGN", "KES", "GHS", "TZS", "UGX", "ZMW"],
            "min_amount": 100,
            "max_amount": 5000000,
            "fee_percent": 1.5,
            "fee_fixed": 0,
            "processing_time": "Instant"
        }
    }
}

# Exchange rates (demo - in production, use real-time API)
EXCHANGE_RATES = {
    "EUR": {"USD": 1.08, "GBP": 0.86, "CNY": 7.82, "XOF": 655.96, "XAF": 655.96},
    "USD": {"EUR": 0.93, "GBP": 0.79, "CNY": 7.24, "XOF": 607.37, "XAF": 607.37},
    "CNY": {"EUR": 0.13, "USD": 0.14, "GBP": 0.11, "XOF": 84.5, "XAF": 84.5},
    "XOF": {"EUR": 0.00152, "USD": 0.00165, "CNY": 0.0118},
    "XAF": {"EUR": 0.00152, "USD": 0.00165, "CNY": 0.0118}
}

# ==================== HELPER FUNCTIONS ====================

def generate_reference(prefix: str = "INT") -> str:
    """Generate unique transaction reference"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = ''.join(random.choices('0123456789ABCDEF', k=6))
    return f"{prefix}-{timestamp}-{random_part}"

def calculate_fees(provider_config: dict, amount: float) -> dict:
    """Calculate transaction fees"""
    fee_percent = amount * (provider_config["fee_percent"] / 100)
    fee_fixed = provider_config.get("fee_fixed", 0)
    total_fee = round(fee_percent + fee_fixed, 2)
    return {
        "fee_percent": round(fee_percent, 2),
        "fee_fixed": fee_fixed,
        "total_fee": total_fee,
        "total_amount": round(amount + total_fee, 2)
    }

def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """Get exchange rate between currencies"""
    if from_currency == to_currency:
        return 1.0
    rates = EXCHANGE_RATES.get(from_currency, {})
    return rates.get(to_currency, 1.0)

# ==================== ROUTES ====================

def setup_international_payments_routes(db, get_current_user, send_push_notification=None, send_email_notification=None):
    """Setup international payment routes"""
    
    @international_router.get("/providers")
    async def get_payment_providers(region: Optional[str] = None):
        """Get available payment providers by region"""
        if region and region.lower() in PAYMENT_PROVIDERS:
            return {
                "region": region.lower(),
                "providers": PAYMENT_PROVIDERS[region.lower()]
            }
        return {
            "regions": list(PAYMENT_PROVIDERS.keys()),
            "providers": PAYMENT_PROVIDERS
        }
    
    @international_router.get("/providers/{region}")
    async def get_region_providers(region: str):
        """Get payment providers for a specific region"""
        region_lower = region.lower()
        if region_lower not in PAYMENT_PROVIDERS:
            raise HTTPException(status_code=404, detail=f"Region '{region}' not found")
        return {
            "region": region_lower,
            "providers": PAYMENT_PROVIDERS[region_lower]
        }
    
    @international_router.get("/exchange-rate")
    async def get_exchange_rate_endpoint(
        from_currency: str = "EUR",
        to_currency: str = "USD",
        amount: float = 1.0
    ):
        """Get exchange rate and converted amount"""
        rate = get_exchange_rate(from_currency.upper(), to_currency.upper())
        converted = round(amount * rate, 2)
        return {
            "from_currency": from_currency.upper(),
            "to_currency": to_currency.upper(),
            "rate": rate,
            "amount": amount,
            "converted_amount": converted
        }
    
    @international_router.post("/deposit/initiate")
    async def initiate_deposit(
        request: DepositRequest,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Initiate a deposit via international payment provider"""
        user_id = current_user["id"]
        provider = request.provider.lower()
        
        # Find provider config
        provider_config = None
        region = None
        for reg, providers in PAYMENT_PROVIDERS.items():
            if provider in providers:
                provider_config = providers[provider]
                region = reg
                break
        
        if not provider_config:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        # Validate amount
        if request.amount < provider_config["min_amount"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Minimum amount is {provider_config['min_amount']} {request.currency}"
            )
        if request.amount > provider_config["max_amount"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Maximum amount is {provider_config['max_amount']} {request.currency}"
            )
        
        # Calculate fees
        fees = calculate_fees(provider_config, request.amount)
        
        # Create deposit record
        deposit_id = str(uuid.uuid4())
        reference = generate_reference("DEP")
        
        deposit = {
            "id": deposit_id,
            "user_id": user_id,
            "provider": provider,
            "region": region,
            "amount": request.amount,
            "currency": request.currency,
            "fees": fees["total_fee"],
            "total_amount": fees["total_amount"],
            "status": "pending",
            "reference": reference,
            "return_url": request.return_url,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc),  # Add expiration
            "payment_url": None,  # Would be generated by payment gateway
            "metadata": {}
        }
        
        await db.international_deposits.insert_one(deposit)
        
        # Generate mock payment URL (in production, this would be from payment gateway)
        payment_url = None
        if provider == "alipay":
            payment_url = f"https://intl.alipay.com/pay?ref={reference}&amount={request.amount}"
        elif provider == "wechat_pay":
            payment_url = f"https://pay.wechat.com/qr?ref={reference}&amount={request.amount}"
        elif provider == "paypal":
            payment_url = f"https://www.paypal.com/checkout?token={reference}"
        
        # Update with payment URL
        await db.international_deposits.update_one(
            {"id": deposit_id},
            {"$set": {"payment_url": payment_url}}
        )
        
        return {
            "deposit_id": deposit_id,
            "reference": reference,
            "provider": provider,
            "provider_name": provider_config["name"],
            "amount": request.amount,
            "currency": request.currency,
            "fees": fees,
            "status": "pending",
            "payment_url": payment_url,
            "processing_time": provider_config["processing_time"],
            "message": f"Please complete payment via {provider_config['name']}"
        }
    
    @international_router.post("/withdraw/initiate")
    async def initiate_withdrawal(
        request: WithdrawalRequest,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Initiate a withdrawal to international payment provider"""
        user_id = current_user["id"]
        provider = request.provider.lower()
        
        # Find provider config
        provider_config = None
        region = None
        for reg, providers in PAYMENT_PROVIDERS.items():
            if provider in providers:
                provider_config = providers[provider]
                region = reg
                break
        
        if not provider_config:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        # Check wallet balance
        wallet = await db.wallets.find_one({
            "user_id": user_id,
            "currency": request.currency
        })
        
        fees = calculate_fees(provider_config, request.amount)
        total_debit = fees["total_amount"]
        
        if not wallet or wallet.get("balance", 0) < total_debit:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Create withdrawal record
        withdrawal_id = str(uuid.uuid4())
        reference = generate_reference("WIT")
        
        withdrawal = {
            "id": withdrawal_id,
            "user_id": user_id,
            "provider": provider,
            "region": region,
            "amount": request.amount,
            "currency": request.currency,
            "fees": fees["total_fee"],
            "total_debit": total_debit,
            "status": "processing",
            "reference": reference,
            "account_details": request.account_details,
            "created_at": datetime.now(timezone.utc),
            "completed_at": None
        }
        
        await db.international_withdrawals.insert_one(withdrawal)
        
        # Debit wallet
        await db.wallets.update_one(
            {"user_id": user_id, "currency": request.currency},
            {"$inc": {"balance": -total_debit}}
        )
        
        # Create transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "international_withdrawal",
            "method": provider,
            "amount": request.amount,
            "fee": fees["total_fee"],
            "currency": request.currency,
            "status": "processing",
            "reference": reference,
            "description": f"Retrait vers {provider_config['name']}",
            "created_at": datetime.now(timezone.utc)
        }
        await db.transactions.insert_one(transaction)
        
        # Send notification
        if send_push_notification:
            background_tasks.add_task(
                send_push_notification,
                user_id,
                "Retrait international initié",
                f"Votre retrait de {request.amount} {request.currency} vers {provider_config['name']} est en cours."
            )
        
        return {
            "withdrawal_id": withdrawal_id,
            "reference": reference,
            "provider": provider,
            "provider_name": provider_config["name"],
            "amount": request.amount,
            "currency": request.currency,
            "fees": fees,
            "status": "processing",
            "processing_time": provider_config["processing_time"],
            "message": f"Withdrawal initiated to {provider_config['name']}"
        }
    
    @international_router.get("/deposit/{deposit_id}/status")
    async def get_deposit_status(
        deposit_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get status of a deposit"""
        deposit = await db.international_deposits.find_one(
            {"id": deposit_id, "user_id": current_user["id"]},
            {"_id": 0}
        )
        if not deposit:
            raise HTTPException(status_code=404, detail="Deposit not found")
        return deposit
    
    @international_router.get("/withdrawal/{withdrawal_id}/status")
    async def get_withdrawal_status(
        withdrawal_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get status of a withdrawal"""
        withdrawal = await db.international_withdrawals.find_one(
            {"id": withdrawal_id, "user_id": current_user["id"]},
            {"_id": 0}
        )
        if not withdrawal:
            raise HTTPException(status_code=404, detail="Withdrawal not found")
        return withdrawal
    
    @international_router.get("/history")
    async def get_international_history(
        type: Optional[str] = None,  # deposit, withdrawal
        provider: Optional[str] = None,
        limit: int = 20,
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's international payment history"""
        user_id = current_user["id"]
        
        deposits = []
        withdrawals = []
        
        if type is None or type == "deposit":
            query = {"user_id": user_id}
            if provider:
                query["provider"] = provider.lower()
            deposits_cursor = db.international_deposits.find(
                query, {"_id": 0}
            ).sort("created_at", -1).limit(limit)
            deposits = await deposits_cursor.to_list(length=limit)
        
        if type is None or type == "withdrawal":
            query = {"user_id": user_id}
            if provider:
                query["provider"] = provider.lower()
            withdrawals_cursor = db.international_withdrawals.find(
                query, {"_id": 0}
            ).sort("created_at", -1).limit(limit)
            withdrawals = await withdrawals_cursor.to_list(length=limit)
        
        return {
            "deposits": deposits,
            "withdrawals": withdrawals,
            "total_deposits": len(deposits),
            "total_withdrawals": len(withdrawals)
        }
    
    # ==================== WEBHOOK HANDLERS (for payment gateway callbacks) ====================
    
    @international_router.post("/webhook/alipay")
    async def alipay_webhook(payload: Dict[str, Any]):
        """Handle Alipay payment notifications"""
        # In production, verify signature and process payment
        reference = payload.get("out_trade_no")
        status = payload.get("trade_status")
        
        if reference and status == "TRADE_SUCCESS":
            deposit = await db.international_deposits.find_one({"reference": reference})
            if deposit and deposit["status"] == "pending":
                # Update deposit status
                await db.international_deposits.update_one(
                    {"reference": reference},
                    {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
                )
                
                # Credit user wallet
                await db.wallets.update_one(
                    {"user_id": deposit["user_id"], "currency": deposit["currency"]},
                    {"$inc": {"balance": deposit["amount"]}},
                    upsert=True
                )
        
        return {"success": True}
    
    @international_router.post("/webhook/wechat")
    async def wechat_webhook(payload: Dict[str, Any]):
        """Handle WeChat Pay notifications"""
        # In production, verify signature and process payment
        reference = payload.get("out_trade_no")
        result_code = payload.get("result_code")
        
        if reference and result_code == "SUCCESS":
            deposit = await db.international_deposits.find_one({"reference": reference})
            if deposit and deposit["status"] == "pending":
                await db.international_deposits.update_one(
                    {"reference": reference},
                    {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
                )
                
                await db.wallets.update_one(
                    {"user_id": deposit["user_id"], "currency": deposit["currency"]},
                    {"$inc": {"balance": deposit["amount"]}},
                    upsert=True
                )
        
        return {"return_code": "SUCCESS"}
    
    @international_router.post("/webhook/paypal")
    async def paypal_webhook(payload: Dict[str, Any]):
        """Handle PayPal IPN notifications"""
        # In production, verify IPN and process payment
        reference = payload.get("invoice")
        payment_status = payload.get("payment_status")
        
        if reference and payment_status == "Completed":
            deposit = await db.international_deposits.find_one({"reference": reference})
            if deposit and deposit["status"] == "pending":
                await db.international_deposits.update_one(
                    {"reference": reference},
                    {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
                )
                
                await db.wallets.update_one(
                    {"user_id": deposit["user_id"], "currency": deposit["currency"]},
                    {"$inc": {"balance": deposit["amount"]}},
                    upsert=True
                )
        
        return {"status": "OK"}
