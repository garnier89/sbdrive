from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'sbpay_secret_key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Create the main app
app = FastAPI(title="SB Pay API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: str

class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    currency: str
    created_at: str
    updated_at: str

class TransferRequest(BaseModel):
    recipient_email: str
    amount: float
    currency: str = "EUR"
    description: Optional[str] = None

class DepositRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    payment_method: str = "stripe"

class WithdrawRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    bank_account: Optional[str] = None

class BillPaymentRequest(BaseModel):
    bill_type: str
    bill_reference: str
    amount: float
    currency: str = "EUR"

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    amount: float
    currency: str
    status: str
    description: Optional[str] = None
    recipient_email: Optional[str] = None
    sender_email: Optional[str] = None
    created_at: str

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None

class CheckoutSessionRequest(BaseModel):
    amount: float
    currency: str = "usd"
    origin_url: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is disabled")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== EXCHANGE RATES ====================

EXCHANGE_RATES = {
    "EUR": 1.0,
    "USD": 1.08,
    "XOF": 655.96,
    "GBP": 0.86,
    "CAD": 1.47,
    "CHF": 0.94
}

def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    if from_currency == to_currency:
        return amount
    eur_amount = amount / EXCHANGE_RATES.get(from_currency, 1.0)
    return eur_amount * EXCHANGE_RATES.get(to_currency, 1.0)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "full_name": user_data.full_name,
        "phone": user_data.phone,
        "role": "user",
        "is_active": True,
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Create wallets for each currency
    for currency in ["EUR", "USD", "XOF"]:
        wallet_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "balance": 0.0,
            "currency": currency,
            "created_at": now,
            "updated_at": now
        }
        await db.wallets.insert_one(wallet_doc)
    
    token = create_access_token({"sub": user_id, "email": user_data.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": "user"
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user.get("role", "user")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "phone": current_user.get("phone"),
        "role": current_user.get("role", "user"),
        "created_at": current_user["created_at"]
    }

# ==================== WALLET ROUTES ====================

@api_router.get("/wallets")
async def get_wallets(current_user: dict = Depends(get_current_user)):
    wallets = await db.wallets.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).to_list(100)
    return wallets

@api_router.get("/wallets/{currency}")
async def get_wallet(currency: str, current_user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": currency.upper()},
        {"_id": 0}
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet

# ==================== TRANSFER ROUTES ====================

@api_router.post("/transfers")
async def create_transfer(transfer: TransferRequest, current_user: dict = Depends(get_current_user)):
    if transfer.recipient_email == current_user["email"]:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")
    
    recipient = await db.users.find_one({"email": transfer.recipient_email}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    sender_wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": transfer.currency},
        {"_id": 0}
    )
    if not sender_wallet or sender_wallet["balance"] < transfer.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Deduct from sender
    await db.wallets.update_one(
        {"id": sender_wallet["id"]},
        {"$inc": {"balance": -transfer.amount}, "$set": {"updated_at": now}}
    )
    
    # Add to recipient
    recipient_wallet = await db.wallets.find_one(
        {"user_id": recipient["id"], "currency": transfer.currency},
        {"_id": 0}
    )
    if recipient_wallet:
        await db.wallets.update_one(
            {"id": recipient_wallet["id"]},
            {"$inc": {"balance": transfer.amount}, "$set": {"updated_at": now}}
        )
    
    # Create transaction records
    sender_transaction = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "transfer_out",
        "amount": -transfer.amount,
        "currency": transfer.currency,
        "status": "completed",
        "description": transfer.description or f"Transfer to {transfer.recipient_email}",
        "recipient_email": transfer.recipient_email,
        "created_at": now
    }
    
    recipient_transaction = {
        "id": str(uuid.uuid4()),
        "user_id": recipient["id"],
        "type": "transfer_in",
        "amount": transfer.amount,
        "currency": transfer.currency,
        "status": "completed",
        "description": f"Transfer from {current_user['email']}",
        "sender_email": current_user["email"],
        "created_at": now
    }
    
    await db.transactions.insert_many([sender_transaction, recipient_transaction])
    
    return {"message": "Transfer successful", "transaction_id": transaction_id}

# ==================== DEPOSIT ROUTES (STRIPE) ====================

@api_router.post("/deposits/checkout")
async def create_deposit_checkout(request: CheckoutSessionRequest, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest as StripeRequest
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Create pending transaction
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "deposit",
        "amount": request.amount,
        "currency": request.currency.upper(),
        "status": "pending",
        "payment_method": "stripe",
        "description": "Deposit via Stripe",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    # Create Stripe checkout session
    success_url = f"{request.origin_url}/deposit/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/deposit"
    
    webhook_url = f"{request.origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = StripeRequest(
        amount=float(request.amount),
        currency=request.currency.lower(),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "transaction_id": transaction_id,
            "user_id": current_user["id"],
            "user_email": current_user["email"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Update transaction with session ID
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"stripe_session_id": session.session_id}}
    )
    
    # Store in payment_transactions collection
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "transaction_id": transaction_id,
        "user_id": current_user["id"],
        "amount": request.amount,
        "currency": request.currency.upper(),
        "payment_status": "pending",
        "created_at": now
    })
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/deposits/status/{session_id}")
async def check_deposit_status(session_id: str, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    payment_record = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not payment_record:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If already processed, return cached status
    if payment_record.get("payment_status") == "paid":
        return {"status": "paid", "message": "Payment already processed"}
    
    # Check status from Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    if status.payment_status == "paid" and payment_record.get("payment_status") != "paid":
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": now}}
        )
        
        # Update main transaction
        transaction = await db.transactions.find_one(
            {"id": payment_record["transaction_id"]},
            {"_id": 0}
        )
        
        if transaction and transaction.get("status") != "completed":
            await db.transactions.update_one(
                {"id": payment_record["transaction_id"]},
                {"$set": {"status": "completed", "updated_at": now}}
            )
            
            # Credit user wallet
            currency = payment_record["currency"]
            await db.wallets.update_one(
                {"user_id": current_user["id"], "currency": currency},
                {"$inc": {"balance": payment_record["amount"]}, "$set": {"updated_at": now}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency.upper()
    }

# ==================== WEBHOOK ====================

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            now = datetime.now(timezone.utc).isoformat()
            
            payment_record = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if payment_record and payment_record.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "updated_at": now}}
                )
                
                await db.transactions.update_one(
                    {"id": payment_record["transaction_id"]},
                    {"$set": {"status": "completed", "updated_at": now}}
                )
                
                await db.wallets.update_one(
                    {"user_id": payment_record["user_id"], "currency": payment_record["currency"]},
                    {"$inc": {"balance": payment_record["amount"]}, "$set": {"updated_at": now}}
                )
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ==================== WITHDRAWAL ROUTES ====================

@api_router.post("/withdrawals")
async def create_withdrawal(withdraw: WithdrawRequest, current_user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": withdraw.currency},
        {"_id": 0}
    )
    
    if not wallet or wallet["balance"] < withdraw.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Deduct from wallet
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": -withdraw.amount}, "$set": {"updated_at": now}}
    )
    
    # Create transaction (pending admin approval in real scenario)
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "withdrawal",
        "amount": -withdraw.amount,
        "currency": withdraw.currency,
        "status": "pending",
        "description": f"Withdrawal to {withdraw.bank_account or 'bank account'}",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    return {"message": "Withdrawal request submitted", "transaction_id": transaction_id}

# ==================== BILL PAYMENT ROUTES ====================

@api_router.post("/bills/pay")
async def pay_bill(bill: BillPaymentRequest, current_user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": bill.currency},
        {"_id": 0}
    )
    
    if not wallet or wallet["balance"] < bill.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Deduct from wallet
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": -bill.amount}, "$set": {"updated_at": now}}
    )
    
    # Create transaction
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "bill_payment",
        "amount": -bill.amount,
        "currency": bill.currency,
        "status": "completed",
        "description": f"{bill.bill_type}: {bill.bill_reference}",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    return {"message": "Bill paid successfully", "transaction_id": transaction_id}

# ==================== TRANSACTION HISTORY ====================

@api_router.get("/transactions")
async def get_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    transactions = await db.transactions.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.transactions.count_documents({"user_id": current_user["id"]})
    
    return {"transactions": transactions, "total": total}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users")
async def admin_get_users(
    limit: int = 50,
    offset: int = 0,
    admin: dict = Depends(get_admin_user)
):
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).skip(offset).limit(limit).to_list(limit)
    
    total = await db.users.count_documents({})
    
    return {"users": users, "total": total}

@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    update: AdminUserUpdate,
    admin: dict = Depends(get_admin_user)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if update.is_active is not None:
        update_data["is_active"] = update.is_active
    if update.role is not None:
        update_data["role"] = update.role
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    return {"message": "User updated successfully"}

@api_router.get("/admin/transactions")
async def admin_get_transactions(
    limit: int = 100,
    offset: int = 0,
    admin: dict = Depends(get_admin_user)
):
    pipeline = [
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "user_id": 1,
            "user_email": "$user.email",
            "user_name": "$user.full_name",
            "type": 1,
            "amount": 1,
            "currency": 1,
            "status": 1,
            "description": 1,
            "created_at": 1
        }},
        {"$sort": {"created_at": -1}},
        {"$skip": offset},
        {"$limit": limit}
    ]
    
    transactions = await db.transactions.aggregate(pipeline).to_list(limit)
    total = await db.transactions.count_documents({})
    
    return {"transactions": transactions, "total": total}

@api_router.get("/admin/stats")
async def admin_get_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    total_transactions = await db.transactions.count_documents({})
    
    # Calculate total volume by currency
    pipeline = [
        {"$match": {"type": {"$in": ["deposit", "transfer_in"]}, "status": "completed"}},
        {"$group": {
            "_id": "$currency",
            "total": {"$sum": {"$abs": "$amount"}}
        }}
    ]
    volume_by_currency = await db.transactions.aggregate(pipeline).to_list(10)
    
    # Recent transactions count (last 24h)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent_transactions = await db.transactions.count_documents({
        "created_at": {"$gte": yesterday}
    })
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_transactions": total_transactions,
        "recent_transactions_24h": recent_transactions,
        "volume_by_currency": {v["_id"]: v["total"] for v in volume_by_currency}
    }

@api_router.patch("/admin/transactions/{transaction_id}/status")
async def admin_update_transaction_status(
    transaction_id: str,
    status: str,
    admin: dict = Depends(get_admin_user)
):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Handle withdrawal approval
    if transaction["type"] == "withdrawal" and status == "completed" and transaction["status"] == "pending":
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "completed", "updated_at": now}}
        )
        return {"message": "Withdrawal approved"}
    
    # Handle withdrawal rejection - refund the amount
    if transaction["type"] == "withdrawal" and status == "rejected" and transaction["status"] == "pending":
        await db.wallets.update_one(
            {"user_id": transaction["user_id"], "currency": transaction["currency"]},
            {"$inc": {"balance": abs(transaction["amount"])}, "$set": {"updated_at": now}}
        )
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "rejected", "updated_at": now}}
        )
        return {"message": "Withdrawal rejected and refunded"}
    
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": status, "updated_at": now}}
    )
    
    return {"message": "Transaction status updated"}

# ==================== UTILITY ROUTES ====================

@api_router.get("/currencies")
async def get_currencies():
    return {
        "currencies": list(EXCHANGE_RATES.keys()),
        "rates": EXCHANGE_RATES
    }

@api_router.get("/")
async def root():
    return {"message": "SB Pay API v1.0", "status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
