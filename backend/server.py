from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header, BackgroundTasks, UploadFile, File
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
import random
import string
import hashlib
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'sbpaygo_secret_key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Demo Mode Config
DEMO_MODE = os.environ.get('DEMO_MODE', 'true').lower() == 'true'

# Create the main app
app = FastAPI(title="SBPAYGO API", version="5.0.0")

# Health check endpoint at root level for Kubernetes
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {"status": "healthy", "app": "SBPAYGO", "version": "5.0.0"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Import Africa Module
from routes.africa_module import setup_africa_routes, africa_router

# Import Admin Advanced Module
from routes.admin_advanced import setup_admin_advanced_routes, admin_advanced_router

# Import Analytics Module
from routes.analytics import setup_analytics_routes, analytics_router

# Import Alerts Module
from routes.alerts import setup_alerts_routes, alerts_router

# Import Wallet Transfers Module
from routes.wallet_transfers import setup_wallet_transfer_routes, wallet_transfers_router

# Import Virtual Cards Module
from routes.virtual_cards import setup_virtual_cards_routes, virtual_cards_router

# Import Notifications Zone Module
from routes.notifications_zone import setup_notifications_zone_routes, notifications_zone_router

# Import Vault Module
from routes.vault import setup_vault_routes, vault_router

# Import Contact Module
from routes.contact import setup_contact_routes, contact_router

# Import Quick Login Module
from routes.quick_login import setup_quick_login_routes, quick_login_router

# Import Receipts Module
from routes.receipts import setup_receipts_routes, receipts_router

# Import Documents KYC Module
from routes.documents import setup_documents_routes, documents_router

# Import Partners/Agents Module
from routes.partners import setup_partners_routes, partners_router

# Import Refunds Module
from routes.refunds import setup_refunds_routes, refunds_router

# Import Mobile Money Config Module
from routes.mobile_money_config import setup_mobile_money_config_routes, mobile_money_config_router

# Import Rewards Admin Module
from routes.rewards_admin import router as rewards_admin_router, get_rewards_admin_router

# Import Zones Config Module
from routes.zones_config import router as zones_config_router, get_zones_config_router

# Import Staff Management Module
from routes.staff_management import router as staff_router, get_staff_router

# Import Commission Engine Module
from routes.commission_engine import router as commission_router, get_commission_router

# Import Limits Engine Module
from routes.limits_engine import router as limits_router, get_limits_router

# Import Agent Locator Module
from routes.agent_locator import setup_agent_locator_routes, agent_locator_router

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
    first_name: str
    last_name: str
    phone: Optional[str] = None
    preferred_language: str = "fr"
    default_currency: str = "EUR"
    country: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class BankAccountCreate(BaseModel):
    account_holder_name: str
    iban: Optional[str] = None
    account_number: Optional[str] = None
    swift_bic: Optional[str] = None
    bank_name: str
    bank_country: str
    currency: str = "EUR"
    is_default: bool = False

class BankAccountUpdate(BaseModel):
    account_holder_name: Optional[str] = None
    is_default: Optional[bool] = None

class BankTransferRequest(BaseModel):
    bank_account_id: str
    amount: float
    currency: str = "EUR"
    description: Optional[str] = None

class TransferRequest(BaseModel):
    recipient_email: str
    amount: float
    currency: str = "EUR"
    description: Optional[str] = None

class DepositRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    payment_method: str = "stripe"

class MobileMoneyRequest(BaseModel):
    amount: float
    currency: str = "XOF"
    provider: str
    phone_number: str

class WithdrawRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    bank_account_id: Optional[str] = None

class BillPaymentRequest(BaseModel):
    bill_type: str
    bill_reference: str
    amount: float
    currency: str = "EUR"

class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    kyc_status: Optional[str] = None

class AdminCreditDebit(BaseModel):
    user_id: str
    amount: float
    currency: str = "EUR"
    description: str

class CheckoutSessionRequest(BaseModel):
    amount: float
    currency: str = "usd"
    origin_url: str

class TwoFactorSetupRequest(BaseModel):
    phone_number: str

class TwoFactorVerifyRequest(BaseModel):
    code: str

class LanguageUpdateRequest(BaseModel):
    language: str

class PayPalCheckoutRequest(BaseModel):
    amount: float
    currency: str = "EUR"
    origin_url: str

class ZoneConfigCreate(BaseModel):
    zone_name: str
    countries: List[str]
    currencies: List[str]
    payment_methods: List[str]
    transfer_fees_percent: float = 1.0
    min_transfer_amount: float = 1.0
    max_transfer_amount: float = 10000.0
    partner_banks: List[str] = []

class DocumentUpload(BaseModel):
    user_id: str
    document_type: str  # id_card, passport, proof_of_address, bank_statement
    document_name: str

class DocumentStatusUpdate(BaseModel):
    status: str  # pending, approved, rejected
    rejection_reason: Optional[str] = None

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

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

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

# ==================== NOTIFICATION HELPERS ====================

async def send_email_notification(to_email: str, subject: str, content: str, user_language: str = "fr"):
    if DEMO_MODE:
        logger.info(f"[DEMO EMAIL] To: {to_email}, Subject: {subject}")
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "email",
            "to": to_email,
            "subject": subject,
            "content": content,
            "language": user_language,
            "status": "sent",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return True
    return True

async def send_sms_notification(phone_number: str, message: str):
    if DEMO_MODE:
        logger.info(f"[DEMO SMS] To: {phone_number}, Message: {message}")
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "sms",
            "to": phone_number,
            "message": message,
            "status": "sent",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return True
    return True

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "push",
        "title": title,
        "body": body,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.push_notifications.insert_one(notification)
    logger.info(f"[PUSH] User: {user_id}, Title: {title}")
    return True

async def log_admin_action(admin_id: str, action: str, target_type: str, target_id: str, details: dict = None):
    """Log admin actions for audit trail"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_logs.insert_one(log_entry)
    logger.info(f"[ADMIN LOG] Admin: {admin_id}, Action: {action}, Target: {target_type}/{target_id}")

# ==================== EXCHANGE RATES ====================

EXCHANGE_RATES = {
    "EUR": 1.0,
    "USD": 1.08,
    "XOF": 655.96,
    "GBP": 0.86,
    "CAD": 1.47,
    "CHF": 0.94,
    "MAD": 10.85,
    "NGN": 1650.0,
    "GHS": 15.5,
    "KES": 155.0
}

def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    if from_currency == to_currency:
        return amount
    eur_amount = amount / EXCHANGE_RATES.get(from_currency, 1.0)
    return eur_amount * EXCHANGE_RATES.get(to_currency, 1.0)

# ==================== TRANSLATIONS ====================

TRANSLATIONS = {
    "fr": {
        "welcome": "Bienvenue sur SBPAYGO",
        "transfer_success": "Transfert de {amount} {currency} effectué avec succès vers {recipient}",
        "bank_transfer_pending": "Virement bancaire de {amount} {currency} en cours de traitement",
        "deposit_success": "Dépôt de {amount} {currency} effectué avec succès",
        "withdrawal_pending": "Demande de retrait de {amount} {currency} en cours de traitement",
        "bill_paid": "Facture {type} payée avec succès: {amount} {currency}",
        "otp_message": "Votre code de vérification SBPAYGO est: {code}",
        "login_alert": "Nouvelle connexion détectée sur votre compte SBPAYGO",
        "account_credited": "Votre compte a été crédité de {amount} {currency}",
        "account_debited": "Votre compte a été débité de {amount} {currency}",
        "kyc_approved": "Votre document a été approuvé",
        "kyc_rejected": "Votre document a été rejeté: {reason}"
    },
    "en": {
        "welcome": "Welcome to SBPAYGO",
        "transfer_success": "Transfer of {amount} {currency} successfully sent to {recipient}",
        "bank_transfer_pending": "Bank transfer of {amount} {currency} is being processed",
        "deposit_success": "Deposit of {amount} {currency} completed successfully",
        "withdrawal_pending": "Withdrawal request of {amount} {currency} is being processed",
        "bill_paid": "Bill {type} paid successfully: {amount} {currency}",
        "otp_message": "Your SBPAYGO verification code is: {code}",
        "login_alert": "New login detected on your SBPAYGO account",
        "account_credited": "Your account has been credited with {amount} {currency}",
        "account_debited": "Your account has been debited {amount} {currency}",
        "kyc_approved": "Your document has been approved",
        "kyc_rejected": "Your document has been rejected: {reason}"
    }
}

def get_translation(key: str, language: str = "fr", **kwargs) -> str:
    lang_translations = TRANSLATIONS.get(language, TRANSLATIONS["fr"])
    template = lang_translations.get(key, TRANSLATIONS["fr"].get(key, key))
    return template.format(**kwargs) if kwargs else template

# ==================== WORLD BANKS DATABASE ====================

WORLD_BANKS = [
    # France
    {"name": "BNP Paribas", "country": "FR", "swift": "BNPAFRPP", "currency": "EUR"},
    {"name": "Société Générale", "country": "FR", "swift": "SOGEFRPP", "currency": "EUR"},
    {"name": "Crédit Agricole", "country": "FR", "swift": "AGRIFRPP", "currency": "EUR"},
    {"name": "La Banque Postale", "country": "FR", "swift": "PSSTFRPP", "currency": "EUR"},
    {"name": "Crédit Mutuel", "country": "FR", "swift": "CMCIFRPP", "currency": "EUR"},
    # Germany
    {"name": "Deutsche Bank", "country": "DE", "swift": "DEUTDEFF", "currency": "EUR"},
    {"name": "Commerzbank", "country": "DE", "swift": "COBADEFF", "currency": "EUR"},
    # UK
    {"name": "HSBC UK", "country": "GB", "swift": "HBUKGB4B", "currency": "GBP"},
    {"name": "Barclays", "country": "GB", "swift": "BARCGB22", "currency": "GBP"},
    {"name": "Lloyds Bank", "country": "GB", "swift": "LOYDGB2L", "currency": "GBP"},
    # USA
    {"name": "Bank of America", "country": "US", "swift": "BOFAUS3N", "currency": "USD"},
    {"name": "Chase Bank", "country": "US", "swift": "CHASUS33", "currency": "USD"},
    {"name": "Wells Fargo", "country": "US", "swift": "WFBIUS6S", "currency": "USD"},
    {"name": "Citibank", "country": "US", "swift": "CITIUS33", "currency": "USD"},
    # Senegal
    {"name": "CBAO Groupe Attijariwafa", "country": "SN", "swift": "CBAOSNDA", "currency": "XOF"},
    {"name": "Banque de Dakar", "country": "SN", "swift": "BDKRSNDA", "currency": "XOF"},
    {"name": "SGBS", "country": "SN", "swift": "SGSNSNDA", "currency": "XOF"},
    # Ivory Coast
    {"name": "Société Générale CI", "country": "CI", "swift": "SGBFCIAB", "currency": "XOF"},
    {"name": "BICICI", "country": "CI", "swift": "BICICIAB", "currency": "XOF"},
    {"name": "Ecobank CI", "country": "CI", "swift": "ABORCIAB", "currency": "XOF"},
    # Morocco
    {"name": "Attijariwafa Bank", "country": "MA", "swift": "BCMAMAMC", "currency": "MAD"},
    {"name": "BMCE Bank", "country": "MA", "swift": "BMCEMAMC", "currency": "MAD"},
    # Nigeria
    {"name": "GTBank", "country": "NG", "swift": "GTBINGLA", "currency": "NGN"},
    {"name": "Zenith Bank", "country": "NG", "swift": "ZEABORAD", "currency": "NGN"},
    {"name": "First Bank", "country": "NG", "swift": "FBNINGLA", "currency": "NGN"},
    # Ghana
    {"name": "GCB Bank", "country": "GH", "swift": "GHCBGHAC", "currency": "GHS"},
    {"name": "Ecobank Ghana", "country": "GH", "swift": "ECABORAD", "currency": "GHS"},
    # Cameroon
    {"name": "Afriland First Bank", "country": "CM", "swift": "AFRIHM2N", "currency": "XOF"},
    {"name": "Société Générale Cameroun", "country": "CM", "swift": "SGCMCMCX", "currency": "XOF"},
    # Spain
    {"name": "Santander", "country": "ES", "swift": "BSCHESMM", "currency": "EUR"},
    {"name": "BBVA", "country": "ES", "swift": "BBVAESMM", "currency": "EUR"},
    # China
    {"name": "Bank of China", "country": "CN", "swift": "BKCHCNBJ", "currency": "CNY"},
    {"name": "ICBC", "country": "CN", "swift": "ICBKCNBJ", "currency": "CNY"},
]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, background_tasks: BackgroundTasks):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Build full_name from first_name and last_name
    full_name = f"{user_data.first_name} {user_data.last_name}"
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "full_name": full_name,
        "phone": user_data.phone,
        "country": user_data.country,
        "default_currency": user_data.default_currency,
        "role": "user",
        "status": "active",
        "is_active": True,
        "two_factor_enabled": False,
        "two_factor_phone": None,
        "preferred_language": user_data.preferred_language,
        "kyc_status": "pending",
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Get active currencies from database
    currencies = await db.currencies.find({"active": True}, {"code": 1}).to_list(20)
    currency_codes = [c["code"] for c in currencies] if currencies else ["EUR", "USD", "XOF", "GBP", "MAD", "NGN"]
    
    # Create wallets for each active currency
    for currency in currency_codes:
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
    
    background_tasks.add_task(
        send_email_notification,
        user_data.email,
        get_translation("welcome", user_data.preferred_language),
        f"Bienvenue {full_name}!",
        user_data.preferred_language
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "full_name": full_name,
            "default_currency": user_data.default_currency,
            "role": "user",
            "preferred_language": user_data.preferred_language,
            "kyc_status": "pending"
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, background_tasks: BackgroundTasks):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    if user.get("two_factor_enabled") and user.get("two_factor_phone"):
        otp = generate_otp()
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()
        
        await db.otp_codes.update_one(
            {"user_id": user["id"], "type": "login"},
            {"$set": {
                "code_hash": otp_hash,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
                "verified": False
            }},
            upsert=True
        )
        
        lang = user.get("preferred_language", "fr")
        message = get_translation("otp_message", lang, code=otp)
        background_tasks.add_task(send_sms_notification, user["two_factor_phone"], message)
        
        return {
            "requires_2fa": True,
            "user_id": user["id"],
            "message": "OTP sent to your phone"
        }
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    lang = user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        user["email"],
        get_translation("login_alert", lang),
        f"Login at {datetime.now(timezone.utc).isoformat()}",
        lang
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user.get("role", "user"),
            "preferred_language": user.get("preferred_language", "fr"),
            "kyc_status": user.get("kyc_status", "pending")
        }
    }

@api_router.post("/auth/verify-2fa")
async def verify_2fa_login(user_id: str, code: str, background_tasks: BackgroundTasks):
    otp_record = await db.otp_codes.find_one({"user_id": user_id, "type": "login"}, {"_id": 0})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP request found")
    
    if datetime.fromisoformat(otp_record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    if code_hash != otp_record["code_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    await db.otp_codes.update_one({"user_id": user_id, "type": "login"}, {"$set": {"verified": True}})
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user.get("role", "user"),
            "preferred_language": user.get("preferred_language", "fr"),
            "kyc_status": user.get("kyc_status", "pending")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "first_name": current_user.get("first_name", ""),
        "last_name": current_user.get("last_name", ""),
        "full_name": current_user.get("full_name", ""),
        "phone": current_user.get("phone"),
        "country": current_user.get("country"),
        "default_currency": current_user.get("default_currency", "EUR"),
        "role": current_user.get("role", "user"),
        "status": current_user.get("status", "active"),
        "two_factor_enabled": current_user.get("two_factor_enabled", False),
        "two_factor_phone": current_user.get("two_factor_phone"),
        "preferred_language": current_user.get("preferred_language", "fr"),
        "kyc_status": current_user.get("kyc_status", "pending"),
        "avatar_url": current_user.get("avatar_url"),
        "created_at": current_user["created_at"]
    }

# ==================== USER PROFILE ROUTES ====================

class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    preferred_language: Optional[str] = None
    default_currency: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/user/profile")
async def update_profile(profile: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user profile information"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if profile.first_name is not None:
        update_data["first_name"] = profile.first_name
    if profile.last_name is not None:
        update_data["last_name"] = profile.last_name
    if profile.first_name or profile.last_name:
        fn = profile.first_name or current_user.get("first_name", "")
        ln = profile.last_name or current_user.get("last_name", "")
        update_data["full_name"] = f"{fn} {ln}".strip()
    if profile.phone is not None:
        update_data["phone"] = profile.phone
    if profile.country is not None:
        update_data["country"] = profile.country.upper()
    if profile.preferred_language is not None:
        update_data["preferred_language"] = profile.preferred_language
    if profile.default_currency is not None:
        update_data["default_currency"] = profile.default_currency.upper()
    
    await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    return {"message": "Profile updated successfully"}

@api_router.put("/user/password")
async def change_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change user password"""
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    if not verify_password(password_data.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(password_data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.post("/user/avatar")
async def upload_avatar(avatar: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload user avatar"""
    if not avatar.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # In demo mode, we'll store a placeholder or base64
    # In production, upload to cloud storage
    contents = await avatar.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    avatar_url = f"data:{avatar.content_type};base64,{base64_image[:100]}..."  # Truncated for demo
    
    # For demo, just acknowledge upload
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"avatar_url": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Avatar uploaded successfully"}

@api_router.get("/documents/my")
async def get_my_documents(current_user: dict = Depends(get_current_user)):
    """Get current user's KYC documents"""
    documents = await db.documents.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(20)
    return {"documents": documents}

@api_router.post("/documents/upload")
async def upload_document(
    document_type: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a KYC document"""
    valid_types = ["id_card", "passport", "proof_of_address", "bank_statement", "selfie"]
    if document_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid document type")
    
    now = datetime.now(timezone.utc).isoformat()
    doc_id = str(uuid.uuid4())
    
    # In production, upload to cloud storage and get URL
    # For demo, we store metadata only
    doc = {
        "id": doc_id,
        "user_id": current_user["id"],
        "type": document_type,
        "file_name": file.filename,
        "file_type": file.content_type,
        "file_url": f"/documents/{doc_id}",  # Placeholder
        "status": "pending",
        "created_at": now
    }
    
    await db.documents.insert_one(doc)
    
    return {"message": "Document uploaded successfully", "document_id": doc_id}

# ==================== 2FA ROUTES ====================

@api_router.post("/auth/2fa/setup")
async def setup_2fa(request: TwoFactorSetupRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    otp = generate_otp()
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    
    await db.otp_codes.update_one(
        {"user_id": current_user["id"], "type": "2fa_setup"},
        {"$set": {
            "code_hash": otp_hash,
            "phone": request.phone_number,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "verified": False
        }},
        upsert=True
    )
    
    lang = current_user.get("preferred_language", "fr")
    message = get_translation("otp_message", lang, code=otp)
    background_tasks.add_task(send_sms_notification, request.phone_number, message)
    
    return {"message": "OTP sent to your phone", "phone": request.phone_number}

@api_router.post("/auth/2fa/verify")
async def verify_2fa_setup(request: TwoFactorVerifyRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    otp_record = await db.otp_codes.find_one({"user_id": current_user["id"], "type": "2fa_setup"}, {"_id": 0})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No 2FA setup request found")
    
    if datetime.fromisoformat(otp_record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    code_hash = hashlib.sha256(request.code.encode()).hexdigest()
    if code_hash != otp_record["code_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"two_factor_enabled": True, "two_factor_phone": otp_record["phone"]}}
    )
    
    return {"message": "2FA enabled successfully"}

@api_router.post("/auth/2fa/disable")
async def disable_2fa(current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"two_factor_enabled": False, "two_factor_phone": None}}
    )
    return {"message": "2FA disabled successfully"}

# ==================== LANGUAGE ROUTES ====================

@api_router.put("/user/language")
async def update_language(request: LanguageUpdateRequest, current_user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"preferred_language": request.language}})
    return {"message": "Language updated", "language": request.language}

@api_router.get("/languages")
async def get_languages():
    """Get all active languages from database"""
    languages = await db.languages.find({"active": True}, {"_id": 0}).to_list(100)
    if not languages:
        # Fallback to default
        return {
            "languages": [
                {"code": "fr", "name": "French", "native_name": "Français", "rtl": False},
                {"code": "en", "name": "English", "native_name": "English", "rtl": False},
            ]
        }
    return {"languages": languages}

# ==================== CURRENCIES ROUTES ====================

@api_router.get("/currencies")
async def get_currencies():
    """Get all active currencies from database"""
    currencies = await db.currencies.find({"active": True}, {"_id": 0}).to_list(100)
    if not currencies:
        # Fallback to default
        currencies = [
            {"code": "EUR", "name": "Euro", "symbol": "€"},
            {"code": "USD", "name": "US Dollar", "symbol": "$"},
            {"code": "XOF", "name": "CFA Franc", "symbol": "CFA"},
        ]
    return {"currencies": currencies}

@api_router.put("/user/currency")
async def update_default_currency(currency: str, current_user: dict = Depends(get_current_user)):
    """Update user's default currency"""
    valid_currency = await db.currencies.find_one({"code": currency.upper(), "active": True})
    if not valid_currency:
        raise HTTPException(status_code=400, detail="Invalid currency")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"default_currency": currency.upper()}}
    )
    return {"message": "Default currency updated", "currency": currency.upper()}

# ==================== EXCHANGE RATES API ====================

@api_router.get("/exchange-rates")
async def get_exchange_rates(base: str = "EUR"):
    """Get exchange rates for a base currency"""
    rates = await db.exchange_rates.find(
        {"base_currency": base.upper()},
        {"_id": 0, "base_currency": 1, "target_currency": 1, "rate": 1, "updated_at": 1}
    ).to_list(100)
    return {"base_currency": base.upper(), "rates": rates}

@api_router.get("/exchange-rates/convert")
async def convert_currency(amount: float, from_currency: str, to_currency: str):
    """Convert amount between currencies"""
    if from_currency.upper() == to_currency.upper():
        return {"amount": amount, "converted": amount, "rate": 1.0}
    
    rate_doc = await db.exchange_rates.find_one({
        "base_currency": from_currency.upper(),
        "target_currency": to_currency.upper()
    })
    
    if rate_doc:
        converted = amount * rate_doc["rate"]
        return {
            "amount": amount,
            "from_currency": from_currency.upper(),
            "to_currency": to_currency.upper(),
            "rate": rate_doc["rate"],
            "converted": round(converted, 2)
        }
    
    # Try reverse conversion
    reverse_rate = await db.exchange_rates.find_one({
        "base_currency": to_currency.upper(),
        "target_currency": from_currency.upper()
    })
    
    if reverse_rate:
        rate = 1 / reverse_rate["rate"]
        converted = amount * rate
        return {
            "amount": amount,
            "from_currency": from_currency.upper(),
            "to_currency": to_currency.upper(),
            "rate": round(rate, 6),
            "converted": round(converted, 2)
        }
    
    raise HTTPException(status_code=400, detail="Exchange rate not available")

# ==================== CARDS ROUTES ====================

class CardCreate(BaseModel):
    token: str
    brand: str
    last4: str
    expiry_month: int
    expiry_year: int

@api_router.get("/cards")
async def get_user_cards(current_user: dict = Depends(get_current_user)):
    """Get all cards for current user"""
    cards = await db.cards.find(
        {"user_id": current_user["id"], "deleted": {"$ne": True}},
        {"_id": 0, "token": 0}  # Don't expose token
    ).to_list(20)
    return {"cards": cards}

@api_router.post("/cards")
async def add_card(card: CardCreate, current_user: dict = Depends(get_current_user)):
    """Add a new card for current user (requires approval)"""
    now = datetime.now(timezone.utc).isoformat()
    card_id = str(uuid.uuid4())
    
    # Check if card already exists
    existing = await db.cards.find_one({
        "user_id": current_user["id"],
        "last4": card.last4,
        "brand": card.brand,
        "deleted": {"$ne": True}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Card already exists")
    
    # Set as default if first card
    card_count = await db.cards.count_documents({"user_id": current_user["id"], "deleted": {"$ne": True}})
    is_default = card_count == 0
    
    card_doc = {
        "id": card_id,
        "user_id": current_user["id"],
        "token": card.token,
        "brand": card.brand.lower(),
        "last4": card.last4,
        "expiry": f"{card.expiry_month:02d}/{card.expiry_year}",
        "expiry_month": card.expiry_month,
        "expiry_year": card.expiry_year,
        "is_default": is_default,
        "created_at": now,
        "deleted": False,
        # New security fields
        "approval_status": "pending",  # pending, active, rejected, blocked
        "approved_by": None,
        "approved_at": None,
        "approval_reason": None,
        "added_ip": None,  # Would be filled from request
        "added_country": None
    }
    await db.cards.insert_one(card_doc)
    
    # TODO: Send notification email to user about pending approval
    
    return {
        "message": "Card added - pending approval",
        "card_id": card_id,
        "is_default": is_default,
        "approval_status": "pending"
    }

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a card"""
    card = await db.cards.find_one({"id": card_id, "user_id": current_user["id"]})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    await db.cards.update_one(
        {"id": card_id},
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Card deleted"}

@api_router.post("/cards/{card_id}/set-default")
async def set_default_card(card_id: str, current_user: dict = Depends(get_current_user)):
    """Set a card as default"""
    card = await db.cards.find_one({"id": card_id, "user_id": current_user["id"], "deleted": {"$ne": True}})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    await db.cards.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_default": False}}
    )
    await db.cards.update_one(
        {"id": card_id},
        {"$set": {"is_default": True}}
    )
    return {"message": "Default card set"}

# ==================== MOBILE MONEY ACCOUNTS ROUTES ====================

class MobileMoneyAccountCreate(BaseModel):
    provider: str
    phone_number: str
    account_name: Optional[str] = None

@api_router.get("/mobile-money-accounts")
async def get_mobile_money_accounts(current_user: dict = Depends(get_current_user)):
    """Get all mobile money accounts for current user"""
    accounts = await db.mobile_money_accounts.find(
        {"user_id": current_user["id"], "deleted": {"$ne": True}},
        {"_id": 0}
    ).to_list(20)
    return {"accounts": accounts}

@api_router.post("/mobile-money-accounts")
async def add_mobile_money_account(account: MobileMoneyAccountCreate, current_user: dict = Depends(get_current_user)):
    """Add a new mobile money account"""
    # Validate provider
    provider = await db.mobile_money_providers.find_one({"code": account.provider})
    if not provider:
        raise HTTPException(status_code=400, detail="Invalid mobile money provider")
    
    # Check if account already exists
    existing = await db.mobile_money_accounts.find_one({
        "user_id": current_user["id"],
        "provider": account.provider,
        "phone_number": account.phone_number,
        "deleted": {"$ne": True}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Mobile money account already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    account_id = str(uuid.uuid4())
    
    # Set as default if first account
    account_count = await db.mobile_money_accounts.count_documents({
        "user_id": current_user["id"], 
        "deleted": {"$ne": True}
    })
    is_default = account_count == 0
    
    account_doc = {
        "id": account_id,
        "user_id": current_user["id"],
        "provider": account.provider,
        "provider_name": provider["name"],
        "phone_number": account.phone_number,
        "account_name": account.account_name or current_user.get("full_name", ""),
        "is_verified": DEMO_MODE,  # Auto-verify in demo mode
        "is_default": is_default,
        "created_at": now,
        "deleted": False
    }
    await db.mobile_money_accounts.insert_one(account_doc)
    
    return {"message": "Mobile money account added", "account_id": account_id}

@api_router.delete("/mobile-money-accounts/{account_id}")
async def delete_mobile_money_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a mobile money account"""
    account = await db.mobile_money_accounts.find_one({
        "id": account_id, 
        "user_id": current_user["id"]
    })
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await db.mobile_money_accounts.update_one(
        {"id": account_id},
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Mobile money account deleted"}

@api_router.post("/mobile-money-accounts/{account_id}/set-default")
async def set_default_mobile_money_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Set a mobile money account as default"""
    account = await db.mobile_money_accounts.find_one({
        "id": account_id, 
        "user_id": current_user["id"],
        "deleted": {"$ne": True}
    })
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await db.mobile_money_accounts.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_default": False}}
    )
    await db.mobile_money_accounts.update_one(
        {"id": account_id},
        {"$set": {"is_default": True}}
    )
    return {"message": "Default mobile money account set"}

# ==================== BANK ACCOUNTS ROUTES ====================

@api_router.get("/bank-accounts")
async def get_bank_accounts(current_user: dict = Depends(get_current_user)):
    accounts = await db.bank_accounts.find(
        {"user_id": current_user["id"], "deleted": {"$ne": True}},
        {"_id": 0}
    ).to_list(100)
    return {"accounts": accounts}

@api_router.post("/bank-accounts")
async def add_bank_account(account: BankAccountCreate, current_user: dict = Depends(get_current_user)):
    # Validate IBAN or account number
    if not account.iban and not account.account_number:
        raise HTTPException(status_code=400, detail="IBAN or account number required")
    
    now = datetime.now(timezone.utc).isoformat()
    account_id = str(uuid.uuid4())
    
    # If setting as default, unset other defaults
    if account.is_default:
        await db.bank_accounts.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_default": False}}
        )
    
    account_doc = {
        "id": account_id,
        "user_id": current_user["id"],
        "account_holder_name": account.account_holder_name,
        "iban": account.iban,
        "account_number": account.account_number,
        "swift_bic": account.swift_bic,
        "bank_name": account.bank_name,
        "bank_country": account.bank_country,
        "currency": account.currency,
        "is_default": account.is_default,
        "verification_status": "pending",  # pending, verified, failed
        "created_at": now,
        "updated_at": now,
        "deleted": False
    }
    
    await db.bank_accounts.insert_one(account_doc)
    
    # In demo mode, auto-verify after a short delay simulation
    if DEMO_MODE:
        await db.bank_accounts.update_one(
            {"id": account_id},
            {"$set": {"verification_status": "verified"}}
        )
    
    return {"message": "Bank account added", "account_id": account_id}

@api_router.put("/bank-accounts/{account_id}")
async def update_bank_account(account_id: str, update: BankAccountUpdate, current_user: dict = Depends(get_current_user)):
    account = await db.bank_accounts.find_one(
        {"id": account_id, "user_id": current_user["id"], "deleted": {"$ne": True}},
        {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update.account_holder_name:
        update_data["account_holder_name"] = update.account_holder_name
    
    if update.is_default:
        await db.bank_accounts.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_default": False}}
        )
        update_data["is_default"] = True
    
    await db.bank_accounts.update_one({"id": account_id}, {"$set": update_data})
    return {"message": "Bank account updated"}

@api_router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(account_id: str, current_user: dict = Depends(get_current_user)):
    account = await db.bank_accounts.find_one(
        {"id": account_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    await db.bank_accounts.update_one(
        {"id": account_id},
        {"$set": {"deleted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Bank account deleted"}

@api_router.post("/bank-accounts/{account_id}/set-default")
async def set_default_bank_account(account_id: str, current_user: dict = Depends(get_current_user)):
    account = await db.bank_accounts.find_one(
        {"id": account_id, "user_id": current_user["id"], "deleted": {"$ne": True}},
        {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    await db.bank_accounts.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_default": False}}
    )
    
    await db.bank_accounts.update_one(
        {"id": account_id},
        {"$set": {"is_default": True}}
    )
    
    return {"message": "Default bank account set"}

# ==================== BANK TRANSFER ROUTES ====================

@api_router.post("/bank-transfers")
async def create_bank_transfer(transfer: BankTransferRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    # Verify bank account
    bank_account = await db.bank_accounts.find_one(
        {"id": transfer.bank_account_id, "user_id": current_user["id"], "deleted": {"$ne": True}},
        {"_id": 0}
    )
    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    if bank_account.get("verification_status") != "verified":
        raise HTTPException(status_code=400, detail="Bank account not verified")
    
    # Check wallet balance
    wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": transfer.currency},
        {"_id": 0}
    )
    if not wallet or wallet["balance"] < transfer.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Get zone config for fees
    user_country = current_user.get("country", "FR")
    zone_config = await db.zone_configs.find_one(
        {"countries": user_country},
        {"_id": 0}
    )
    
    fees = 0
    if zone_config:
        fees = transfer.amount * (zone_config.get("transfer_fees_percent", 1.0) / 100)
    
    total_amount = transfer.amount + fees
    
    if wallet["balance"] < total_amount:
        raise HTTPException(status_code=400, detail="Insufficient balance for transfer and fees")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Deduct from wallet
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": -total_amount}, "$set": {"updated_at": now}}
    )
    
    # Create transaction
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "bank_transfer",
        "amount": -transfer.amount,
        "fees": fees,
        "currency": transfer.currency,
        "status": "pending",
        "bank_account_id": bank_account["id"],
        "bank_account_iban": bank_account.get("iban", bank_account.get("account_number")),
        "bank_name": bank_account["bank_name"],
        "description": transfer.description or f"Bank transfer to {bank_account['bank_name']}",
        "estimated_arrival": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    # Send notifications
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("bank_transfer_pending", lang, amount=transfer.amount, currency=transfer.currency),
        f"Bank transfer initiated: {transfer.amount} {transfer.currency}",
        lang
    )
    
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Bank Transfer Initiated",
        f"Transfer of {transfer.amount} {transfer.currency} to {bank_account['bank_name']} is being processed"
    )
    
    return {
        "message": "Bank transfer initiated",
        "transaction_id": transaction_id,
        "fees": fees,
        "total_deducted": total_amount,
        "estimated_arrival": transaction_doc["estimated_arrival"]
    }

# ==================== WALLET ROUTES ====================

@api_router.get("/wallets")
async def get_wallets(current_user: dict = Depends(get_current_user)):
    wallets = await db.wallets.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
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
async def create_transfer(transfer: TransferRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
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
    
    # Send notifications
    sender_lang = current_user.get("preferred_language", "fr")
    recipient_lang = recipient.get("preferred_language", "fr")
    
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("transfer_success", sender_lang, amount=transfer.amount, currency=transfer.currency, recipient=transfer.recipient_email),
        f"Transfer completed",
        sender_lang
    )
    
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Transfer Sent",
        f"{transfer.amount} {transfer.currency} sent to {transfer.recipient_email}"
    )
    
    background_tasks.add_task(
        send_push_notification,
        recipient["id"],
        "Money Received",
        f"You received {transfer.amount} {transfer.currency} from {current_user['email']}"
    )
    
    return {"message": "Transfer successful", "transaction_id": transaction_id}

# ==================== DEPOSIT ROUTES ====================

@api_router.post("/deposits/checkout")
async def create_deposit_checkout(request: CheckoutSessionRequest, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest as StripeRequest
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
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
    
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"stripe_session_id": session.session_id}}
    )
    
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
async def check_deposit_status(session_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    payment_record = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not payment_record:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment_record.get("payment_status") == "paid":
        return {"status": "paid", "message": "Payment already processed"}
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    now = datetime.now(timezone.utc).isoformat()
    
    if status.payment_status == "paid" and payment_record.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": now}}
        )
        
        transaction = await db.transactions.find_one({"id": payment_record["transaction_id"]}, {"_id": 0})
        
        if transaction and transaction.get("status") != "completed":
            await db.transactions.update_one(
                {"id": payment_record["transaction_id"]},
                {"$set": {"status": "completed", "updated_at": now}}
            )
            
            currency = payment_record["currency"]
            await db.wallets.update_one(
                {"user_id": current_user["id"], "currency": currency},
                {"$inc": {"balance": payment_record["amount"]}, "$set": {"updated_at": now}}
            )
            
            lang = current_user.get("preferred_language", "fr")
            background_tasks.add_task(
                send_push_notification,
                current_user["id"],
                "Deposit Confirmed",
                f"+{payment_record['amount']} {currency} added to your wallet"
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount": status.amount_total / 100,
        "currency": status.currency.upper()
    }

# ==================== STRIPE WEBHOOK ====================

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle Stripe webhooks for payment confirmations"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"[STRIPE WEBHOOK] Event: {webhook_response.event_type}, Session: {webhook_response.session_id}")
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            payment_record = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if payment_record and payment_record.get("payment_status") != "paid":
                now = datetime.now(timezone.utc).isoformat()
                
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
                
                background_tasks.add_task(
                    send_push_notification,
                    payment_record["user_id"],
                    "Deposit Confirmed",
                    f"+{payment_record['amount']} {payment_record['currency']} added to your wallet"
                )
                
                logger.info(f"[STRIPE WEBHOOK] Payment processed for user {payment_record['user_id']}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"[STRIPE WEBHOOK ERROR] {str(e)}")
        return {"status": "error", "message": str(e)}

# ==================== PAYPAL ROUTES (DEMO) ====================

@api_router.post("/deposits/paypal")
async def create_paypal_checkout(request: PayPalCheckoutRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    order_id = f"PAYPAL-{uuid.uuid4().hex[:12].upper()}"
    
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "deposit",
        "amount": request.amount,
        "currency": request.currency.upper(),
        "status": "pending",
        "payment_method": "paypal",
        "paypal_order_id": order_id,
        "description": "Deposit via PayPal",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    demo_url = f"{request.origin_url}/deposit/paypal-demo?order_id={order_id}&amount={request.amount}&currency={request.currency}"
    
    return {
        "order_id": order_id,
        "checkout_url": demo_url,
        "demo_mode": True,
        "message": "Demo PayPal checkout"
    }

@api_router.post("/deposits/paypal/capture/{order_id}")
async def capture_paypal_payment(order_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one(
        {"paypal_order_id": order_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="PayPal order not found")
    
    if transaction["status"] == "completed":
        return {"message": "Payment already captured", "status": "completed"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"status": "completed", "updated_at": now}}
    )
    
    await db.wallets.update_one(
        {"user_id": current_user["id"], "currency": transaction["currency"]},
        {"$inc": {"balance": transaction["amount"]}, "$set": {"updated_at": now}}
    )
    
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "PayPal Deposit Confirmed",
        f"+{transaction['amount']} {transaction['currency']} added to your wallet"
    )
    
    return {"message": "Payment captured successfully", "status": "completed", "amount": transaction["amount"]}

# ==================== MOBILE MONEY ROUTES (DEMO) ====================

MOBILE_MONEY_PROVIDERS = {
    "orange_money": {"name": "Orange Money", "countries": ["SN", "CI", "ML", "BF", "CM"], "currency": "XOF"},
    "mtn_momo": {"name": "MTN Mobile Money", "countries": ["CI", "CM", "GH", "UG"], "currency": "XOF"},
    "wave": {"name": "Wave", "countries": ["SN", "CI", "ML", "BF"], "currency": "XOF"},
    "moov_money": {"name": "Moov Money", "countries": ["CI", "BF", "TG", "BJ"], "currency": "XOF"}
}

@api_router.get("/mobile-money/providers")
async def get_mobile_money_providers():
    return {"providers": MOBILE_MONEY_PROVIDERS}

@api_router.post("/mobile-money/deposit")
async def create_mobile_money_deposit(request: MobileMoneyRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    if request.provider not in MOBILE_MONEY_PROVIDERS:
        raise HTTPException(status_code=400, detail="Invalid mobile money provider")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    reference = f"MM-{uuid.uuid4().hex[:8].upper()}"
    
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "deposit",
        "amount": request.amount,
        "currency": request.currency,
        "status": "pending",
        "payment_method": request.provider,
        "mobile_money_reference": reference,
        "mobile_money_phone": request.phone_number,
        "description": f"Deposit via {MOBILE_MONEY_PROVIDERS[request.provider]['name']}",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    provider_name = MOBILE_MONEY_PROVIDERS[request.provider]["name"]
    background_tasks.add_task(
        send_sms_notification,
        request.phone_number,
        f"SBPAYGO: Paiement {provider_name} de {request.amount} {request.currency}. Ref: {reference}. [DEMO]"
    )
    
    return {
        "transaction_id": transaction_id,
        "reference": reference,
        "provider": request.provider,
        "provider_name": provider_name,
        "amount": request.amount,
        "currency": request.currency,
        "status": "pending",
        "demo_mode": True
    }

@api_router.post("/mobile-money/confirm/{reference}")
async def confirm_mobile_money_payment(reference: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one(
        {"mobile_money_reference": reference, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Mobile money transaction not found")
    
    if transaction["status"] == "completed":
        return {"message": "Payment already confirmed", "status": "completed"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.transactions.update_one({"id": transaction["id"]}, {"$set": {"status": "completed", "updated_at": now}})
    
    await db.wallets.update_one(
        {"user_id": current_user["id"], "currency": transaction["currency"]},
        {"$inc": {"balance": transaction["amount"]}, "$set": {"updated_at": now}}
    )
    
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Mobile Money Confirmed",
        f"+{transaction['amount']} {transaction['currency']} added to your wallet"
    )
    
    return {"message": "Payment confirmed", "status": "completed", "amount": transaction["amount"]}

# ==================== WITHDRAWAL ROUTES ====================

@api_router.post("/withdrawals")
async def create_withdrawal(withdraw: WithdrawRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": withdraw.currency},
        {"_id": 0}
    )
    
    if not wallet or wallet["balance"] < withdraw.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # If bank account specified, verify it
    bank_account = None
    if withdraw.bank_account_id:
        bank_account = await db.bank_accounts.find_one(
            {"id": withdraw.bank_account_id, "user_id": current_user["id"], "deleted": {"$ne": True}},
            {"_id": 0}
        )
        if not bank_account:
            raise HTTPException(status_code=404, detail="Bank account not found")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": -withdraw.amount}, "$set": {"updated_at": now}}
    )
    
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "withdrawal",
        "amount": -withdraw.amount,
        "currency": withdraw.currency,
        "status": "pending",
        "bank_account_id": withdraw.bank_account_id,
        "description": f"Withdrawal to {bank_account['bank_name'] if bank_account else 'bank account'}",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Withdrawal Requested",
        f"Your withdrawal of {withdraw.amount} {withdraw.currency} is being processed"
    )
    
    return {"message": "Withdrawal request submitted", "transaction_id": transaction_id}

# ==================== BILL PAYMENT ROUTES ====================

@api_router.post("/bills/pay")
async def pay_bill(bill: BillPaymentRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": bill.currency},
        {"_id": 0}
    )
    
    if not wallet or wallet["balance"] < bill.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": -bill.amount}, "$set": {"updated_at": now}}
    )
    
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
    
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Bill Paid",
        f"{bill.bill_type} bill of {bill.amount} {bill.currency} paid successfully"
    )
    
    return {"message": "Bill paid successfully", "transaction_id": transaction_id}

# ==================== TRANSACTION HISTORY ====================

@api_router.get("/transactions")
async def get_transactions(limit: int = 50, offset: int = 0, current_user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    total = await db.transactions.count_documents({"user_id": current_user["id"]})
    
    return {"transactions": transactions, "total": total}

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(limit: int = 20, current_user: dict = Depends(get_current_user)):
    notifications = await db.push_notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.push_notifications.count_documents({"user_id": current_user["id"], "read": False})
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.push_notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.push_notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== WORLD BANKS ====================

@api_router.get("/banks")
async def get_banks(country: Optional[str] = None):
    banks = WORLD_BANKS
    if country:
        banks = [b for b in banks if b["country"] == country.upper()]
    return {"banks": banks}

@api_router.get("/banks/countries")
async def get_bank_countries():
    countries = list(set(b["country"] for b in WORLD_BANKS))
    return {"countries": sorted(countries)}

# ==================== ZONE CONFIGURATION ====================

@api_router.get("/zones")
async def get_zones():
    zones = await db.zone_configs.find({}, {"_id": 0}).to_list(100)
    return {"zones": zones}

@api_router.get("/zones/{zone_id}")
async def get_zone(zone_id: str):
    zone = await db.zone_configs.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

# ==================== KYC DOCUMENTS ====================

@api_router.get("/documents")
async def get_user_documents(current_user: dict = Depends(get_current_user)):
    documents = await db.kyc_documents.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    return {"documents": documents}

@api_router.post("/documents/upload")
async def upload_document(
    document_type: str,
    document_name: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.now(timezone.utc).isoformat()
    doc_id = str(uuid.uuid4())
    
    document = {
        "id": doc_id,
        "user_id": current_user["id"],
        "document_type": document_type,
        "document_name": document_name,
        "status": "pending",
        "uploaded_at": now,
        "reviewed_at": None,
        "rejection_reason": None
    }
    
    await db.kyc_documents.insert_one(document)
    
    return {"message": "Document uploaded", "document_id": doc_id}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users")
async def admin_get_users(limit: int = 50, offset: int = 0, admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).skip(offset).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    return {"users": users, "total": total}

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallets = await db.wallets.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    bank_accounts = await db.bank_accounts.find({"user_id": user_id, "deleted": {"$ne": True}}, {"_id": 0}).to_list(100)
    documents = await db.kyc_documents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    return {
        "user": user,
        "wallets": wallets,
        "bank_accounts": bank_accounts,
        "documents": documents
    }

@api_router.post("/admin/users")
async def admin_create_user(user_data: UserCreate, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
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
        "country": user_data.country,
        "role": "user",
        "is_active": True,
        "two_factor_enabled": False,
        "preferred_language": user_data.preferred_language,
        "kyc_status": "pending",
        "created_at": now,
        "created_by_admin": admin["id"]
    }
    
    await db.users.insert_one(user_doc)
    
    for currency in ["EUR", "USD", "XOF", "GBP", "MAD", "NGN"]:
        await db.wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "balance": 0.0,
            "currency": currency,
            "created_at": now,
            "updated_at": now
        })
    
    await log_admin_action(admin["id"], "create_user", "user", user_id, {"email": user_data.email})
    
    return {"message": "User created", "user_id": user_id}

@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: str, update: AdminUserUpdate, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if update.is_active is not None:
        update_data["is_active"] = update.is_active
    if update.role is not None:
        update_data["role"] = update.role
    if update.kyc_status is not None:
        update_data["kyc_status"] = update.kyc_status
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        await log_admin_action(admin["id"], "update_user", "user", user_id, update_data)
    
    return {"message": "User updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": False, "deleted": True}})
    await log_admin_action(admin["id"], "delete_user", "user", user_id)
    
    return {"message": "User deleted"}

# ==================== ADMIN CREDIT/DEBIT ====================

@api_router.post("/admin/credit")
async def admin_credit_account(request: AdminCreditDebit, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallet = await db.wallets.find_one(
        {"user_id": request.user_id, "currency": request.currency},
        {"_id": 0}
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": request.amount}, "$set": {"updated_at": now}}
    )
    
    transaction_doc = {
        "id": transaction_id,
        "user_id": request.user_id,
        "type": "admin_credit",
        "amount": request.amount,
        "currency": request.currency,
        "status": "completed",
        "description": request.description,
        "admin_id": admin["id"],
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    await log_admin_action(admin["id"], "credit_account", "wallet", wallet["id"], {
        "user_id": request.user_id,
        "amount": request.amount,
        "currency": request.currency
    })
    
    lang = user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        user["email"],
        get_translation("account_credited", lang, amount=request.amount, currency=request.currency),
        f"Your account has been credited",
        lang
    )
    
    background_tasks.add_task(
        send_push_notification,
        request.user_id,
        "Account Credited",
        f"+{request.amount} {request.currency} added to your wallet"
    )
    
    return {"message": "Account credited", "transaction_id": transaction_id}

@api_router.post("/admin/debit")
async def admin_debit_account(request: AdminCreditDebit, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    wallet = await db.wallets.find_one(
        {"user_id": request.user_id, "currency": request.currency},
        {"_id": 0}
    )
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if wallet["balance"] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    await db.wallets.update_one(
        {"id": wallet["id"]},
        {"$inc": {"balance": -request.amount}, "$set": {"updated_at": now}}
    )
    
    transaction_doc = {
        "id": transaction_id,
        "user_id": request.user_id,
        "type": "admin_debit",
        "amount": -request.amount,
        "currency": request.currency,
        "status": "completed",
        "description": request.description,
        "admin_id": admin["id"],
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    await log_admin_action(admin["id"], "debit_account", "wallet", wallet["id"], {
        "user_id": request.user_id,
        "amount": request.amount,
        "currency": request.currency
    })
    
    lang = user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        user["email"],
        get_translation("account_debited", lang, amount=request.amount, currency=request.currency),
        f"Your account has been debited",
        lang
    )
    
    background_tasks.add_task(
        send_push_notification,
        request.user_id,
        "Account Debited",
        f"-{request.amount} {request.currency} from your wallet"
    )
    
    return {"message": "Account debited", "transaction_id": transaction_id}

# Unified wallet operation for both users and partners
class AdminWalletOperation(BaseModel):
    target_id: str
    target_type: str = "user"  # user or partner
    amount: float
    currency: str = "XOF"
    reason: Optional[str] = None

@api_router.post("/admin/wallet/credit")
async def admin_wallet_credit(request: AdminWalletOperation, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Credit wallet for user or partner"""
    if request.target_type == "partner":
        target = await db.partners.find_one({"id": request.target_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    else:
        target = await db.users.find_one({"id": request.target_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Find or create wallet
    wallet = await db.wallets.find_one(
        {"user_id": request.target_id, "currency": request.currency},
        {"_id": 0}
    )
    
    if not wallet:
        # Create wallet
        wallet_id = str(uuid.uuid4())
        wallet = {
            "id": wallet_id,
            "user_id": request.target_id,
            "currency": request.currency,
            "balance": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    # Credit the wallet
    await db.wallets.update_one(
        {"user_id": request.target_id, "currency": request.currency},
        {"$inc": {"balance": request.amount}}
    )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    await db.transactions.insert_one({
        "id": transaction_id,
        "user_id": request.target_id,
        "type": "admin_credit",
        "amount": request.amount,
        "currency": request.currency,
        "status": "completed",
        "description": request.reason or "Crédit administrateur",
        "admin_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Compte crédité avec succès", "transaction_id": transaction_id, "new_balance": wallet.get("balance", 0) + request.amount}

@api_router.post("/admin/wallet/debit")
async def admin_wallet_debit(request: AdminWalletOperation, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    """Debit wallet for user or partner"""
    if request.target_type == "partner":
        target = await db.partners.find_one({"id": request.target_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
    else:
        target = await db.users.find_one({"id": request.target_id}, {"_id": 0})
        if not target:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    wallet = await db.wallets.find_one(
        {"user_id": request.target_id, "currency": request.currency},
        {"_id": 0}
    )
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet non trouvé")
    
    if wallet["balance"] < request.amount:
        raise HTTPException(status_code=400, detail=f"Solde insuffisant. Disponible: {wallet['balance']} {request.currency}")
    
    # Debit the wallet
    await db.wallets.update_one(
        {"user_id": request.target_id, "currency": request.currency},
        {"$inc": {"balance": -request.amount}}
    )
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    await db.transactions.insert_one({
        "id": transaction_id,
        "user_id": request.target_id,
        "type": "admin_debit",
        "amount": -request.amount,
        "currency": request.currency,
        "status": "completed",
        "description": request.reason or "Débit administrateur",
        "admin_id": admin["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Compte débité avec succès", "transaction_id": transaction_id, "new_balance": wallet["balance"] - request.amount}

@api_router.get("/admin/users/{user_id}/activity")
async def get_user_activity(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get user activity history"""
    activities = await db.activity_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return {"activities": activities}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, status: dict, admin: dict = Depends(get_admin_user)):
    """Activate or suspend a user account"""
    new_status = status.get("status", "active")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return {"message": f"Statut mis à jour: {new_status}"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a user account"""
    # Don't allow deleting admins
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Impossible de supprimer un administrateur")
    
    # Soft delete or hard delete
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"status": "deleted", "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Utilisateur supprimé"}

# ==================== ADMIN DOCUMENTS ====================

@api_router.get("/admin/documents")
async def admin_get_documents(status: Optional[str] = None, admin: dict = Depends(get_admin_user)):
    query = {}
    if status:
        query["status"] = status
    
    pipeline = [
        {"$match": query},
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
            "document_type": 1,
            "document_name": 1,
            "status": 1,
            "uploaded_at": 1,
            "reviewed_at": 1,
            "rejection_reason": 1
        }},
        {"$sort": {"uploaded_at": -1}}
    ]
    
    documents = await db.kyc_documents.aggregate(pipeline).to_list(100)
    return {"documents": documents}

@api_router.patch("/admin/documents/{document_id}")
async def admin_update_document(document_id: str, update: DocumentStatusUpdate, background_tasks: BackgroundTasks, admin: dict = Depends(get_admin_user)):
    document = await db.kyc_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": update.status,
        "reviewed_at": now,
        "reviewed_by": admin["id"]
    }
    
    if update.status == "rejected" and update.rejection_reason:
        update_data["rejection_reason"] = update.rejection_reason
    
    await db.kyc_documents.update_one({"id": document_id}, {"$set": update_data})
    
    # Update user KYC status if all documents approved
    user_id = document["user_id"]
    user_docs = await db.kyc_documents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    if all(d.get("status") == "approved" for d in user_docs if d["id"] != document_id) and update.status == "approved":
        await db.users.update_one({"id": user_id}, {"$set": {"kyc_status": "verified"}})
    elif update.status == "rejected":
        await db.users.update_one({"id": user_id}, {"$set": {"kyc_status": "rejected"}})
    
    await log_admin_action(admin["id"], "review_document", "document", document_id, {"status": update.status})
    
    # Notify user
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user:
        lang = user.get("preferred_language", "fr")
        if update.status == "approved":
            background_tasks.add_task(
                send_push_notification,
                user_id,
                "Document Approved",
                get_translation("kyc_approved", lang)
            )
        elif update.status == "rejected":
            background_tasks.add_task(
                send_push_notification,
                user_id,
                "Document Rejected",
                get_translation("kyc_rejected", lang, reason=update.rejection_reason or "Non conforme")
            )
    
    return {"message": "Document status updated"}

# ==================== ADMIN ZONE MANAGEMENT ====================

@api_router.post("/admin/zones")
async def admin_create_zone(zone: ZoneConfigCreate, admin: dict = Depends(get_admin_user)):
    zone_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    zone_doc = {
        "id": zone_id,
        "zone_name": zone.zone_name,
        "countries": zone.countries,
        "currencies": zone.currencies,
        "payment_methods": zone.payment_methods,
        "transfer_fees_percent": zone.transfer_fees_percent,
        "min_transfer_amount": zone.min_transfer_amount,
        "max_transfer_amount": zone.max_transfer_amount,
        "partner_banks": zone.partner_banks,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.zone_configs.insert_one(zone_doc)
    await log_admin_action(admin["id"], "create_zone", "zone", zone_id, {"zone_name": zone.zone_name})
    
    return {"message": "Zone created", "zone_id": zone_id}

@api_router.put("/admin/zones/{zone_id}")
async def admin_update_zone(zone_id: str, zone: ZoneConfigCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.zone_configs.find_one({"id": zone_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "zone_name": zone.zone_name,
        "countries": zone.countries,
        "currencies": zone.currencies,
        "payment_methods": zone.payment_methods,
        "transfer_fees_percent": zone.transfer_fees_percent,
        "min_transfer_amount": zone.min_transfer_amount,
        "max_transfer_amount": zone.max_transfer_amount,
        "partner_banks": zone.partner_banks,
        "updated_at": now
    }
    
    await db.zone_configs.update_one({"id": zone_id}, {"$set": update_data})
    await log_admin_action(admin["id"], "update_zone", "zone", zone_id)
    
    return {"message": "Zone updated"}

@api_router.delete("/admin/zones/{zone_id}")
async def admin_delete_zone(zone_id: str, admin: dict = Depends(get_admin_user)):
    existing = await db.zone_configs.find_one({"id": zone_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    await db.zone_configs.update_one({"id": zone_id}, {"$set": {"is_active": False}})
    await log_admin_action(admin["id"], "delete_zone", "zone", zone_id)
    
    return {"message": "Zone deleted"}

# ==================== ADMIN TRANSACTIONS ====================

@api_router.get("/admin/transactions")
async def admin_get_transactions(limit: int = 100, offset: int = 0, admin: dict = Depends(get_admin_user)):
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
            "fees": 1,
            "currency": 1,
            "status": 1,
            "description": 1,
            "payment_method": 1,
            "created_at": 1
        }},
        {"$sort": {"created_at": -1}},
        {"$skip": offset},
        {"$limit": limit}
    ]
    
    transactions = await db.transactions.aggregate(pipeline).to_list(limit)
    total = await db.transactions.count_documents({})
    
    return {"transactions": transactions, "total": total}

@api_router.patch("/admin/transactions/{transaction_id}/status")
async def admin_update_transaction_status(transaction_id: str, status: str, admin: dict = Depends(get_admin_user)):
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if transaction["type"] == "withdrawal" and status == "completed" and transaction["status"] == "pending":
        await db.transactions.update_one({"id": transaction_id}, {"$set": {"status": "completed", "updated_at": now}})
        await log_admin_action(admin["id"], "approve_withdrawal", "transaction", transaction_id)
        return {"message": "Withdrawal approved"}
    
    if transaction["type"] == "withdrawal" and status == "rejected" and transaction["status"] == "pending":
        await db.wallets.update_one(
            {"user_id": transaction["user_id"], "currency": transaction["currency"]},
            {"$inc": {"balance": abs(transaction["amount"])}, "$set": {"updated_at": now}}
        )
        await db.transactions.update_one({"id": transaction_id}, {"$set": {"status": "rejected", "updated_at": now}})
        await log_admin_action(admin["id"], "reject_withdrawal", "transaction", transaction_id)
        return {"message": "Withdrawal rejected and refunded"}
    
    if transaction["type"] == "bank_transfer" and status == "completed" and transaction["status"] == "pending":
        await db.transactions.update_one({"id": transaction_id}, {"$set": {"status": "completed", "updated_at": now}})
        await log_admin_action(admin["id"], "complete_bank_transfer", "transaction", transaction_id)
        return {"message": "Bank transfer completed"}
    
    await db.transactions.update_one({"id": transaction_id}, {"$set": {"status": status, "updated_at": now}})
    await log_admin_action(admin["id"], "update_transaction_status", "transaction", transaction_id, {"status": status})
    
    return {"message": "Transaction status updated"}

@api_router.get("/admin/stats")
async def admin_get_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    verified_users = await db.users.count_documents({"kyc_status": "verified"})
    total_transactions = await db.transactions.count_documents({})
    
    pipeline = [
        {"$match": {"type": {"$in": ["deposit", "transfer_in"]}, "status": "completed"}},
        {"$group": {"_id": "$currency", "total": {"$sum": {"$abs": "$amount"}}}}
    ]
    volume_by_currency = await db.transactions.aggregate(pipeline).to_list(10)
    
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent_transactions = await db.transactions.count_documents({"created_at": {"$gte": yesterday}})
    
    pending_withdrawals = await db.transactions.count_documents({"type": "withdrawal", "status": "pending"})
    pending_documents = await db.kyc_documents.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "total_transactions": total_transactions,
        "recent_transactions_24h": recent_transactions,
        "volume_by_currency": {v["_id"]: v["total"] for v in volume_by_currency},
        "pending_withdrawals": pending_withdrawals,
        "pending_documents": pending_documents
    }

@api_router.get("/admin/logs")
async def admin_get_logs(limit: int = 100, admin: dict = Depends(get_admin_user)):
    logs = await db.admin_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"logs": logs}

# ==================== ADMIN PAYMENT GATEWAYS ====================

class PaymentGatewayConfig(BaseModel):
    enabled: bool = False
    config: Dict[str, str] = {}
    supported_currencies: List[str] = []
    allowed_zones: List[str] = []

@api_router.get("/admin/payment-gateways")
async def get_payment_gateways(current_user: dict = Depends(get_admin_user)):
    """Get all payment gateway configurations"""
    gateways = await db.payment_gateways.find({}, {"_id": 0}).to_list(20)
    return {"gateways": gateways}

@api_router.get("/admin/payment-gateways/{gateway_id}")
async def get_payment_gateway(gateway_id: str, current_user: dict = Depends(get_admin_user)):
    """Get specific payment gateway configuration"""
    gateway = await db.payment_gateways.find_one({"gateway_id": gateway_id}, {"_id": 0})
    if not gateway:
        return {"gateway_id": gateway_id, "enabled": False, "config": {}}
    return gateway

@api_router.put("/admin/payment-gateways/{gateway_id}")
async def update_payment_gateway(
    gateway_id: str,
    config: PaymentGatewayConfig,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_admin_user)
):
    """Update payment gateway configuration"""
    now = datetime.now(timezone.utc).isoformat()
    
    gateway_doc = {
        "gateway_id": gateway_id,
        "enabled": config.enabled,
        "config": config.config,
        "supported_currencies": config.supported_currencies,
        "allowed_zones": config.allowed_zones,
        "updated_at": now,
        "updated_by": current_user["id"]
    }
    
    await db.payment_gateways.update_one(
        {"gateway_id": gateway_id},
        {"$set": gateway_doc, "$setOnInsert": {"created_at": now}},
        upsert=True
    )
    
    # Log admin action
    background_tasks.add_task(
        log_admin_action,
        current_user["id"],
        "update_gateway",
        "payment_gateway",
        gateway_id,
        {"enabled": config.enabled}
    )
    
    return {"message": "Gateway configuration updated", "gateway_id": gateway_id}

# ==================== PAYMENT RULES & SECURITY ====================

class SecurityRules(BaseModel):
    require_3d_secure: bool = True
    require_cvv: bool = True
    require_avs: bool = True
    block_vpn: bool = True
    block_tor: bool = True
    velocity_check: bool = True
    velocity_max_transactions: int = 10
    velocity_time_window: int = 60
    geo_restriction_enabled: bool = False
    blocked_countries: List[str] = []
    require_kyc_above: float = 1000
    max_daily_deposit: float = 10000
    max_single_transaction: float = 5000
    fraud_score_threshold: int = 70

class CaptureRules(BaseModel):
    capture_mode: str = "automatic"
    capture_delay_hours: int = 0
    manual_review_threshold: float = 500
    auto_capture_below: float = 100
    hold_suspicious: bool = True
    notify_admin_above: float = 1000

class Secure3DSettings(BaseModel):
    enabled: bool = True
    challenge_threshold: int = 0
    exemption_amount: float = 30
    preferred_version: str = "2"
    fallback_to_v1: bool = True

class PaymentRulesUpdate(BaseModel):
    security: Optional[SecurityRules] = None
    capture: Optional[CaptureRules] = None
    secure3d: Optional[Secure3DSettings] = None

@api_router.get("/admin/payment-rules")
async def get_payment_rules(current_user: dict = Depends(get_admin_user)):
    """Get all payment security rules"""
    rules = await db.app_settings.find_one({"type": "payment_rules"}, {"_id": 0})
    if not rules:
        return {
            "security": SecurityRules().model_dump(),
            "capture": CaptureRules().model_dump(),
            "secure3d": Secure3DSettings().model_dump()
        }
    return {
        "security": rules.get("security", SecurityRules().model_dump()),
        "capture": rules.get("capture", CaptureRules().model_dump()),
        "secure3d": rules.get("secure3d", Secure3DSettings().model_dump())
    }

@api_router.put("/admin/payment-rules")
async def update_payment_rules(
    rules: PaymentRulesUpdate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_admin_user)
):
    """Update payment security rules"""
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "type": "payment_rules",
        "updated_at": now,
        "updated_by": current_user["id"]
    }
    
    if rules.security:
        update_data["security"] = rules.security.model_dump()
    if rules.capture:
        update_data["capture"] = rules.capture.model_dump()
    if rules.secure3d:
        update_data["secure3d"] = rules.secure3d.model_dump()
    
    await db.app_settings.update_one(
        {"type": "payment_rules"},
        {"$set": update_data},
        upsert=True
    )
    
    background_tasks.add_task(
        log_admin_action,
        current_user["id"],
        "update_payment_rules",
        "settings",
        "payment_rules",
        {"updated_fields": list(update_data.keys())}
    )
    
    return {"message": "Payment rules updated"}

@api_router.get("/admin/pending-captures")
async def get_pending_captures(current_user: dict = Depends(get_admin_user)):
    """Get transactions pending manual capture"""
    captures = await db.payment_transactions.find(
        {"capture_status": "pending", "payment_status": "authorized"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Enrich with user data
    for capture in captures:
        user = await db.users.find_one({"id": capture.get("user_id")}, {"_id": 0, "email": 1})
        if user:
            capture["user_email"] = user["email"]
    
    return {"captures": captures}

@api_router.post("/admin/capture/{transaction_id}")
async def capture_payment(
    transaction_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_admin_user)
):
    """Manually capture an authorized payment"""
    payment = await db.payment_transactions.find_one(
        {"id": transaction_id, "capture_status": "pending"},
        {"_id": 0}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found or already captured")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # In real implementation, call Stripe API to capture
    # stripe.PaymentIntent.capture(payment["stripe_payment_intent_id"])
    
    # Update payment status
    await db.payment_transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "capture_status": "captured",
            "captured_at": now,
            "captured_by": current_user["id"]
        }}
    )
    
    # Credit user wallet
    if payment.get("user_id") and payment.get("amount"):
        await db.wallets.update_one(
            {"user_id": payment["user_id"], "currency": payment.get("currency", "EUR")},
            {"$inc": {"balance": payment["amount"]}, "$set": {"updated_at": now}}
        )
        
        # Update related transaction
        await db.transactions.update_one(
            {"id": payment.get("transaction_id")},
            {"$set": {"status": "completed", "updated_at": now}}
        )
    
    background_tasks.add_task(
        log_admin_action,
        current_user["id"],
        "capture_payment",
        "payment",
        transaction_id,
        {"amount": payment.get("amount"), "currency": payment.get("currency")}
    )
    
    return {"message": "Payment captured successfully"}

@api_router.post("/admin/void/{transaction_id}")
async def void_payment(
    transaction_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_admin_user)
):
    """Void an authorized payment (release hold)"""
    payment = await db.payment_transactions.find_one(
        {"id": transaction_id, "capture_status": "pending"},
        {"_id": 0}
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found or already processed")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # In real implementation, call Stripe API to cancel
    # stripe.PaymentIntent.cancel(payment["stripe_payment_intent_id"])
    
    await db.payment_transactions.update_one(
        {"id": transaction_id},
        {"$set": {
            "capture_status": "voided",
            "voided_at": now,
            "voided_by": current_user["id"]
        }}
    )
    
    # Update related transaction
    await db.transactions.update_one(
        {"id": payment.get("transaction_id")},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )
    
    background_tasks.add_task(
        log_admin_action,
        current_user["id"],
        "void_payment",
        "payment",
        transaction_id,
        {"amount": payment.get("amount"), "reason": "admin_void"}
    )
    
    return {"message": "Payment voided successfully"}

# ==================== PAYMENT LINKS ====================

class PaymentLinkCreate(BaseModel):
    amount: float
    currency: str = "EUR"
    description: str
    expires_in_hours: int = 24
    allowed_methods: List[str] = ["card", "wallet"]
    customer_email: Optional[str] = None

class PaymentLinkPay(BaseModel):
    method: str  # card, wallet, mobile_money
    wallet_currency: Optional[str] = None  # For wallet payments
    mobile_money_account_id: Optional[str] = None  # For MM payments

@api_router.post("/payment-links")
async def create_payment_link(
    link_data: PaymentLinkCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a shareable payment link"""
    now = datetime.now(timezone.utc)
    link_id = str(uuid.uuid4())
    short_code = uuid.uuid4().hex[:8].upper()
    
    link_doc = {
        "id": link_id,
        "short_code": short_code,
        "created_by": current_user["id"],
        "creator_email": current_user["email"],
        "amount": link_data.amount,
        "currency": link_data.currency.upper(),
        "description": link_data.description,
        "allowed_methods": link_data.allowed_methods,
        "customer_email": link_data.customer_email,
        "status": "active",  # active, paid, expired, cancelled
        "paid_at": None,
        "paid_by": None,
        "transaction_id": None,
        "expires_at": (now + timedelta(hours=link_data.expires_in_hours)).isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.payment_links.insert_one(link_doc)
    
    return {
        "id": link_id,
        "short_code": short_code,
        "payment_url": f"/pay/{short_code}",
        "amount": link_data.amount,
        "currency": link_data.currency.upper(),
        "expires_at": link_doc["expires_at"]
    }

@api_router.get("/payment-links")
async def get_my_payment_links(
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get payment links created by current user"""
    query = {"created_by": current_user["id"]}
    if status:
        query["status"] = status
    
    links = await db.payment_links.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.payment_links.count_documents(query)
    
    return {"links": links, "total": total}

@api_router.get("/payment-links/{link_id}")
async def get_payment_link(link_id: str):
    """Get payment link details (public)"""
    # Try by ID or short_code
    link = await db.payment_links.find_one(
        {"$or": [{"id": link_id}, {"short_code": link_id}]},
        {"_id": 0}
    )
    
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    
    # Check expiration
    if link["status"] == "active":
        if datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
            await db.payment_links.update_one({"id": link["id"]}, {"$set": {"status": "expired"}})
            link["status"] = "expired"
    
    # Don't expose sensitive creator info
    return {
        "id": link["id"],
        "short_code": link["short_code"],
        "amount": link["amount"],
        "currency": link["currency"],
        "description": link["description"],
        "allowed_methods": link["allowed_methods"],
        "status": link["status"],
        "expires_at": link["expires_at"]
    }

@api_router.post("/payment-links/{link_id}/pay")
async def pay_payment_link(
    link_id: str,
    payment: PaymentLinkPay,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Pay a payment link"""
    link = await db.payment_links.find_one(
        {"$or": [{"id": link_id}, {"short_code": link_id}]},
        {"_id": 0}
    )
    
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    
    if link["status"] != "active":
        raise HTTPException(status_code=400, detail=f"Payment link is {link['status']}")
    
    if datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
        await db.payment_links.update_one({"id": link["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="Payment link has expired")
    
    if payment.method not in link["allowed_methods"]:
        raise HTTPException(status_code=400, detail="Payment method not allowed for this link")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Process payment based on method
    if payment.method == "wallet":
        # Pay from wallet
        currency = payment.wallet_currency or link["currency"]
        wallet = await db.wallets.find_one(
            {"user_id": current_user["id"], "currency": currency},
            {"_id": 0}
        )
        
        if not wallet or wallet["balance"] < link["amount"]:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        
        # Deduct from payer
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -link["amount"]}, "$set": {"updated_at": now}}
        )
        
        # Credit to link creator
        creator_wallet = await db.wallets.find_one(
            {"user_id": link["created_by"], "currency": link["currency"]},
            {"_id": 0}
        )
        if creator_wallet:
            await db.wallets.update_one(
                {"id": creator_wallet["id"]},
                {"$inc": {"balance": link["amount"]}, "$set": {"updated_at": now}}
            )
        
        # Create transaction
        transaction = {
            "id": transaction_id,
            "user_id": current_user["id"],
            "type": "payment_link",
            "method": "wallet",
            "amount": -link["amount"],
            "fee": 0,
            "currency": link["currency"],
            "status": "completed",
            "reference": link["short_code"],
            "description": f"Payment: {link['description']}",
            "payment_link_id": link["id"],
            "recipient_id": link["created_by"],
            "created_at": now
        }
        await db.transactions.insert_one(transaction)
        
        # Update link status
        await db.payment_links.update_one(
            {"id": link["id"]},
            {"$set": {
                "status": "paid",
                "paid_at": now,
                "paid_by": current_user["id"],
                "transaction_id": transaction_id
            }}
        )
        
        # Send notifications
        background_tasks.add_task(
            send_push_notification,
            link["created_by"],
            "Payment Received",
            f"You received {link['amount']} {link['currency']} from {current_user['email']}"
        )
        
        return {
            "message": "Payment successful",
            "transaction_id": transaction_id,
            "amount": link["amount"],
            "currency": link["currency"]
        }
    
    elif payment.method == "card":
        # Redirect to Stripe checkout
        return {
            "redirect": "stripe_checkout",
            "message": "Redirect to card payment",
            "payment_link_id": link["id"]
        }
    
    else:
        raise HTTPException(status_code=400, detail="Payment method not implemented")

@api_router.delete("/payment-links/{link_id}")
async def cancel_payment_link(link_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a payment link"""
    link = await db.payment_links.find_one(
        {"id": link_id, "created_by": current_user["id"]},
        {"_id": 0}
    )
    
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    
    if link["status"] != "active":
        raise HTTPException(status_code=400, detail="Cannot cancel this payment link")
    
    await db.payment_links.update_one(
        {"id": link_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Payment link cancelled"}

# ==================== QR CODE PAYMENTS ====================

class QRCodeCreate(BaseModel):
    amount: float
    currency: str = "EUR"
    description: Optional[str] = None

@api_router.post("/qr/generate")
async def generate_qr_code(qr_data: QRCodeCreate, current_user: dict = Depends(get_current_user)):
    """Generate a QR code for receiving payment"""
    if qr_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    now = datetime.now(timezone.utc)
    qr_id = str(uuid.uuid4())
    short_code = uuid.uuid4().hex[:8].upper()
    
    qr_doc = {
        "id": qr_id,
        "code": short_code,
        "recipient_id": current_user["id"],
        "recipient_email": current_user["email"],
        "amount": qr_data.amount,
        "currency": qr_data.currency.upper(),
        "description": qr_data.description,
        "status": "active",  # active, paid, expired
        "paid_at": None,
        "paid_by": None,
        "transaction_id": None,
        "expires_at": (now + timedelta(hours=24)).isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.qr_payments.insert_one(qr_doc)
    
    return {
        "id": qr_id,
        "code": short_code,
        "amount": qr_data.amount,
        "currency": qr_data.currency.upper(),
        "expires_at": qr_doc["expires_at"]
    }

@api_router.get("/qr/{code}")
async def get_qr_payment(code: str):
    """Get QR payment details"""
    qr = await db.qr_payments.find_one(
        {"$or": [{"id": code}, {"code": code}]},
        {"_id": 0}
    )
    
    if not qr:
        raise HTTPException(status_code=404, detail="QR Code not found")
    
    # Check expiration
    if qr["status"] == "active":
        if datetime.fromisoformat(qr["expires_at"]) < datetime.now(timezone.utc):
            await db.qr_payments.update_one({"id": qr["id"]}, {"$set": {"status": "expired"}})
            qr["status"] = "expired"
    
    return {
        "code": qr["code"],
        "amount": qr["amount"],
        "currency": qr["currency"],
        "description": qr.get("description"),
        "recipient_email": qr["recipient_email"],
        "status": qr["status"],
        "expires_at": qr["expires_at"]
    }

@api_router.post("/qr/{code}/pay")
async def pay_qr_code(
    code: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Pay a QR code from wallet"""
    qr = await db.qr_payments.find_one(
        {"$or": [{"id": code}, {"code": code}]},
        {"_id": 0}
    )
    
    if not qr:
        raise HTTPException(status_code=404, detail="QR Code not found")
    
    if qr["status"] != "active":
        raise HTTPException(status_code=400, detail=f"QR Code is {qr['status']}")
    
    if datetime.fromisoformat(qr["expires_at"]) < datetime.now(timezone.utc):
        await db.qr_payments.update_one({"id": qr["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="QR Code has expired")
    
    if qr["recipient_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot pay your own QR code")
    
    # Check payer wallet balance
    payer_wallet = await db.wallets.find_one(
        {"user_id": current_user["id"], "currency": qr["currency"]},
        {"_id": 0}
    )
    
    if not payer_wallet or payer_wallet["balance"] < qr["amount"]:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    
    # Deduct from payer
    await db.wallets.update_one(
        {"id": payer_wallet["id"]},
        {"$inc": {"balance": -qr["amount"]}, "$set": {"updated_at": now}}
    )
    
    # Credit to recipient
    recipient_wallet = await db.wallets.find_one(
        {"user_id": qr["recipient_id"], "currency": qr["currency"]},
        {"_id": 0}
    )
    if recipient_wallet:
        await db.wallets.update_one(
            {"id": recipient_wallet["id"]},
            {"$inc": {"balance": qr["amount"]}, "$set": {"updated_at": now}}
        )
    
    # Create transaction for payer
    payer_transaction = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "type": "qr_payment",
        "method": "wallet",
        "amount": -qr["amount"],
        "fee": 0,
        "currency": qr["currency"],
        "status": "completed",
        "reference": qr["code"],
        "description": f"QR Payment: {qr.get('description', 'N/A')}",
        "recipient_id": qr["recipient_id"],
        "recipient_email": qr["recipient_email"],
        "created_at": now
    }
    await db.transactions.insert_one(payer_transaction)
    
    # Create transaction for recipient
    recipient_transaction = {
        "id": str(uuid.uuid4()),
        "user_id": qr["recipient_id"],
        "type": "qr_received",
        "method": "wallet",
        "amount": qr["amount"],
        "fee": 0,
        "currency": qr["currency"],
        "status": "completed",
        "reference": qr["code"],
        "description": f"QR Payment received from {current_user['email']}",
        "sender_id": current_user["id"],
        "sender_email": current_user["email"],
        "created_at": now
    }
    await db.transactions.insert_one(recipient_transaction)
    
    # Update QR status
    await db.qr_payments.update_one(
        {"id": qr["id"]},
        {"$set": {
            "status": "paid",
            "paid_at": now,
            "paid_by": current_user["id"],
            "transaction_id": transaction_id
        }}
    )
    
    # Send notifications
    background_tasks.add_task(
        send_push_notification,
        qr["recipient_id"],
        "Payment Received",
        f"You received {qr['amount']} {qr['currency']} via QR Code"
    )
    
    return {
        "message": "Payment successful",
        "transaction_id": transaction_id,
        "amount": qr["amount"],
        "currency": qr["currency"]
    }

@api_router.get("/qr/my/codes")
async def get_my_qr_codes(
    status: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get QR codes created by current user"""
    query = {"recipient_id": current_user["id"]}
    if status:
        query["status"] = status
    
    codes = await db.qr_payments.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"codes": codes}

# ==================== SUPPORT SETTINGS (WhatsApp, Tawk.to) ====================

class SupportSettings(BaseModel):
    whatsapp_number: Optional[str] = None
    whatsapp_message: Optional[str] = None
    tawkto_property_id: Optional[str] = None
    tawkto_widget_id: Optional[str] = None
    support_email: Optional[str] = None
    enabled: bool = True

@api_router.get("/support/settings")
async def get_support_settings():
    """Get public support settings"""
    settings = await db.app_settings.find_one({"type": "support"}, {"_id": 0})
    if not settings:
        return {
            "whatsapp_number": "+33612345678",
            "whatsapp_message": "Bonjour, j'ai une question concernant SBPAYGO.",
            "tawkto_property_id": None,
            "tawkto_widget_id": None,
            "enabled": True
        }
    return settings

@api_router.put("/admin/support/settings")
async def update_support_settings(
    settings: SupportSettings,
    current_user: dict = Depends(get_admin_user)
):
    """Update support settings (admin only)"""
    now = datetime.now(timezone.utc).isoformat()
    
    settings_doc = {
        "type": "support",
        "whatsapp_number": settings.whatsapp_number,
        "whatsapp_message": settings.whatsapp_message,
        "tawkto_property_id": settings.tawkto_property_id,
        "tawkto_widget_id": settings.tawkto_widget_id,
        "support_email": settings.support_email,
        "enabled": settings.enabled,
        "updated_at": now,
        "updated_by": current_user["id"]
    }
    
    await db.app_settings.update_one(
        {"type": "support"},
        {"$set": settings_doc},
        upsert=True
    )
    
    return {"message": "Support settings updated"}

# ==================== REWARDS SYSTEM ====================

@api_router.get("/rewards/me")
async def get_my_rewards(current_user: dict = Depends(get_current_user)):
    """Get current user's rewards"""
    rewards = await db.rewards.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not rewards:
        # Create rewards account for user
        now = datetime.now(timezone.utc).isoformat()
        referral_code = current_user["id"][:8].upper()
        
        rewards_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "points": 0,
            "tier": "bronze",
            "total_earned": 0,
            "total_redeemed": 0,
            "referral_code": referral_code,
            "referral_count": 0,
            "cashback_earned": 0,
            "referred_by": None,
            "created_at": now
        }
        await db.rewards.insert_one(rewards_doc)
        # Return clean dict without _id
        rewards = {k: v for k, v in rewards_doc.items() if k != "_id"}
    
    return rewards

@api_router.get("/rewards/history")
async def get_rewards_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get rewards history for current user"""
    history = await db.rewards_history.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"history": history}

@api_router.get("/rewards/referrals")
async def get_my_referrals(current_user: dict = Depends(get_current_user)):
    """Get users referred by current user"""
    rewards = await db.rewards.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not rewards:
        return {"referrals": []}
    
    referrals = await db.rewards.find(
        {"referred_by": rewards.get("referral_code")},
        {"_id": 0, "user_id": 1, "created_at": 1}
    ).to_list(100)
    
    # Enrich with user data
    for ref in referrals:
        user = await db.users.find_one({"id": ref["user_id"]}, {"_id": 0, "email": 1})
        if user:
            ref["email"] = user["email"][:3] + "***@***" + user["email"].split("@")[1][-4:]
        ref["is_active"] = True  # Check transaction count in production
    
    return {"referrals": referrals}

@api_router.post("/rewards/redeem")
async def redeem_rewards(
    points: int,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Convert rewards points to wallet balance"""
    if points < 100:
        raise HTTPException(status_code=400, detail="Minimum 100 points to redeem")
    
    rewards = await db.rewards.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not rewards or rewards["points"] < points:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    now = datetime.now(timezone.utc).isoformat()
    amount = points / 100  # 100 points = 1€
    
    # Deduct points
    await db.rewards.update_one(
        {"user_id": current_user["id"]},
        {
            "$inc": {"points": -points, "total_redeemed": points},
            "$set": {"updated_at": now}
        }
    )
    
    # Credit wallet
    await db.wallets.update_one(
        {"user_id": current_user["id"], "currency": "EUR"},
        {"$inc": {"balance": amount}, "$set": {"updated_at": now}}
    )
    
    # Record history
    history_entry = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "type": "redemption",
        "points": -points,
        "description": f"Conversion de {points} points en €{amount}",
        "created_at": now
    }
    await db.rewards_history.insert_one(history_entry)
    
    # Create transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "type": "rewards_redemption",
        "method": "rewards",
        "amount": amount,
        "fee": 0,
        "currency": "EUR",
        "status": "completed",
        "description": f"Conversion de {points} points de fidélité",
        "created_at": now
    }
    await db.transactions.insert_one(transaction)
    
    return {"message": f"Successfully redeemed {points} points for €{amount}"}

async def award_points(user_id: str, points: int, description: str, point_type: str = "transaction"):
    """Award points to a user (internal function)"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Update rewards
    result = await db.rewards.update_one(
        {"user_id": user_id},
        {
            "$inc": {"points": points, "total_earned": points},
            "$set": {"updated_at": now}
        }
    )
    
    if result.modified_count == 0:
        # Create rewards if doesn't exist
        await db.rewards.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "points": points,
            "tier": "bronze",
            "total_earned": points,
            "total_redeemed": 0,
            "referral_code": user_id[:8].upper(),
            "referral_count": 0,
            "cashback_earned": 0,
            "created_at": now
        })
    
    # Update tier
    rewards = await db.rewards.find_one({"user_id": user_id}, {"_id": 0})
    if rewards:
        new_tier = "bronze"
        if rewards["points"] >= 50000:
            new_tier = "diamond"
        elif rewards["points"] >= 20000:
            new_tier = "platinum"
        elif rewards["points"] >= 5000:
            new_tier = "gold"
        elif rewards["points"] >= 1000:
            new_tier = "silver"
        
        if new_tier != rewards.get("tier"):
            await db.rewards.update_one(
                {"user_id": user_id},
                {"$set": {"tier": new_tier}}
            )
    
    # Record history
    history_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": point_type,
        "points": points,
        "description": description,
        "created_at": now
    }
    await db.rewards_history.insert_one(history_entry)

# ==================== PDF RECEIPTS ====================

from io import BytesIO
from fastapi.responses import StreamingResponse

@api_router.get("/transactions/{transaction_id}/receipt")
async def get_transaction_receipt(transaction_id: str, current_user: dict = Depends(get_current_user)):
    """Generate PDF receipt for a transaction"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.units import cm
    
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#FF6B00'),
        spaceAfter=20
    )
    story.append(Paragraph("SBPAYGO - Reçu de Transaction", title_style))
    story.append(Spacer(1, 20))
    
    # Transaction details
    data = [
        ["Référence:", transaction_id[:8].upper()],
        ["Date:", datetime.fromisoformat(transaction["created_at"]).strftime("%d/%m/%Y %H:%M")],
        ["Type:", transaction.get("type", "N/A").replace("_", " ").title()],
        ["Montant:", f"{transaction.get('amount', 0):,.2f} {transaction.get('currency', 'EUR')}"],
        ["Frais:", f"{transaction.get('fee', 0):,.2f} {transaction.get('currency', 'EUR')}"],
        ["Statut:", transaction.get("status", "N/A").title()],
        ["Description:", transaction.get("description", "N/A")],
    ]
    
    table = Table(data, colWidths=[4*cm, 10*cm])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(table)
    
    story.append(Spacer(1, 40))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.gray,
        alignment=1
    )
    story.append(Paragraph("Ce document est généré automatiquement par SBPAYGO.", footer_style))
    story.append(Paragraph("Pour toute question, contactez support@sbpaygo.com", footer_style))
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=sbpaygo_receipt_{transaction_id[:8]}.pdf"}
    )

# ==================== ZONES API ====================

@api_router.get("/zones")
async def get_zones():
    """Get all zones"""
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    return {"zones": zones}

# ==================== UTILITY ROUTES ====================

@api_router.get("/currencies")
async def get_currencies():
    return {"currencies": list(EXCHANGE_RATES.keys()), "rates": EXCHANGE_RATES}

@api_router.get("/")
async def root():
    return {"message": "SBPAYGO API v3.0", "status": "healthy", "demo_mode": DEMO_MODE}

# Include the router
app.include_router(api_router)

# Setup and include Africa module routes
setup_africa_routes(db, get_current_user)
app.include_router(africa_router)

# Setup and include Admin Advanced module routes
setup_admin_advanced_routes(db, get_current_user, get_admin_user)
app.include_router(admin_advanced_router)

# Setup and include Analytics module routes
setup_analytics_routes(db, get_admin_user)
app.include_router(analytics_router)

# Setup and include Alerts module routes
setup_alerts_routes(db, get_admin_user)
app.include_router(alerts_router)

# Setup and include Wallet Transfers module routes
setup_wallet_transfer_routes(db, get_current_user, send_sms_notification, send_push_notification, send_email_notification)
app.include_router(wallet_transfers_router)

# Setup and include Virtual Cards module routes
setup_virtual_cards_routes(db, get_current_user, send_push_notification, send_sms_notification, send_email_notification)
app.include_router(virtual_cards_router)

# Setup and include Notifications Zone module routes
setup_notifications_zone_routes(db, get_admin_user, send_push_notification, send_sms_notification, send_email_notification)
app.include_router(notifications_zone_router)

# Setup and include Vault module routes
setup_vault_routes(db, get_current_user, send_push_notification, send_sms_notification, send_email_notification)
app.include_router(vault_router)

# Setup and include Contact module routes
setup_contact_routes(db, get_current_user, get_admin_user, send_push_notification, send_email_notification)
app.include_router(contact_router)

# Setup and include Quick Login module routes
setup_quick_login_routes(db, verify_password, create_access_token, JWT_SECRET_KEY, JWT_ALGORITHM, send_push_notification)
app.include_router(quick_login_router)

# Setup and include Receipts module routes
setup_receipts_routes(db, JWT_SECRET_KEY, JWT_ALGORITHM)
app.include_router(receipts_router)

# Setup and include Documents KYC module routes
setup_documents_routes(db, JWT_SECRET_KEY, JWT_ALGORITHM)
app.include_router(documents_router)

# Setup and include Partners/Agents module routes
setup_partners_routes(db, JWT_SECRET_KEY, JWT_ALGORITHM, hash_password, verify_password, create_access_token, send_push_notification)
app.include_router(partners_router)

# Setup and include Refunds module routes
setup_refunds_routes(db, get_current_user, get_admin_user, send_push_notification, send_email_notification)
app.include_router(refunds_router)

# Setup and include Mobile Money Config module routes
setup_mobile_money_config_routes(db)
app.include_router(mobile_money_config_router, prefix="/api")

# Setup and include Rewards Admin module routes
rewards_admin_configured = get_rewards_admin_router(db, get_admin_user)
app.include_router(rewards_admin_configured, prefix="/api")

# Setup and include Zones Config module routes
zones_config_configured = get_zones_config_router(db, get_admin_user)
app.include_router(zones_config_configured, prefix="/api")

# Setup and include Staff Management module routes
staff_configured = get_staff_router(db, get_admin_user)
app.include_router(staff_configured, prefix="/api")

# Setup and include Commission Engine module routes
commission_configured = get_commission_router(db, get_admin_user)
app.include_router(commission_configured, prefix="/api")

# Setup and include Limits Engine module routes
limits_configured = get_limits_router(db, get_admin_user)
app.include_router(limits_configured, prefix="/api")

# Setup and include Agent Locator module routes
setup_agent_locator_routes(db, JWT_SECRET_KEY, JWT_ALGORITHM)
app.include_router(agent_locator_router)

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
