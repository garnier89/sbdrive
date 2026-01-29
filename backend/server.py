from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header, BackgroundTasks
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

# Demo Mode Config (simulated integrations)
DEMO_MODE = os.environ.get('DEMO_MODE', 'true').lower() == 'true'

# Create the main app
app = FastAPI(title="SB Pay API", version="2.0.0")

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
    preferred_language: str = "fr"

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
    two_factor_enabled: bool = False
    preferred_language: str = "fr"

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

class MobileMoneyRequest(BaseModel):
    amount: float
    currency: str = "XOF"
    provider: str  # orange_money, mtn_momo, wave, moov_money
    phone_number: str

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
    """Send email notification (demo mode - logs only)"""
    if DEMO_MODE:
        logger.info(f"[DEMO EMAIL] To: {to_email}, Subject: {subject}")
        # Store in notifications collection for demo
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
    # Real SendGrid implementation would go here
    return True

async def send_sms_notification(phone_number: str, message: str):
    """Send SMS notification (demo mode - logs only)"""
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
    # Real Twilio implementation would go here
    return True

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification (demo mode - stores for retrieval)"""
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

# ==================== TRANSLATIONS ====================

TRANSLATIONS = {
    "fr": {
        "welcome": "Bienvenue sur SB Pay",
        "transfer_success": "Transfert de {amount} {currency} effectué avec succès vers {recipient}",
        "deposit_success": "Dépôt de {amount} {currency} effectué avec succès",
        "withdrawal_pending": "Demande de retrait de {amount} {currency} en cours de traitement",
        "bill_paid": "Facture {type} payée avec succès: {amount} {currency}",
        "otp_message": "Votre code de vérification SB Pay est: {code}",
        "login_alert": "Nouvelle connexion détectée sur votre compte SB Pay",
        "2fa_enabled": "L'authentification à deux facteurs a été activée",
        "2fa_disabled": "L'authentification à deux facteurs a été désactivée"
    },
    "en": {
        "welcome": "Welcome to SB Pay",
        "transfer_success": "Transfer of {amount} {currency} successfully sent to {recipient}",
        "deposit_success": "Deposit of {amount} {currency} completed successfully",
        "withdrawal_pending": "Withdrawal request of {amount} {currency} is being processed",
        "bill_paid": "Bill {type} paid successfully: {amount} {currency}",
        "otp_message": "Your SB Pay verification code is: {code}",
        "login_alert": "New login detected on your SB Pay account",
        "2fa_enabled": "Two-factor authentication has been enabled",
        "2fa_disabled": "Two-factor authentication has been disabled"
    },
    "es": {
        "welcome": "Bienvenido a SB Pay",
        "transfer_success": "Transferencia de {amount} {currency} enviada exitosamente a {recipient}",
        "deposit_success": "Depósito de {amount} {currency} completado exitosamente",
        "withdrawal_pending": "Solicitud de retiro de {amount} {currency} en proceso",
        "bill_paid": "Factura {type} pagada exitosamente: {amount} {currency}",
        "otp_message": "Tu código de verificación SB Pay es: {code}",
        "login_alert": "Nuevo inicio de sesión detectado en tu cuenta SB Pay",
        "2fa_enabled": "La autenticación de dos factores ha sido activada",
        "2fa_disabled": "La autenticación de dos factores ha sido desactivada"
    },
    "pt": {
        "welcome": "Bem-vindo ao SB Pay",
        "transfer_success": "Transferência de {amount} {currency} enviada com sucesso para {recipient}",
        "deposit_success": "Depósito de {amount} {currency} concluído com sucesso",
        "withdrawal_pending": "Solicitação de saque de {amount} {currency} em processamento",
        "bill_paid": "Conta {type} paga com sucesso: {amount} {currency}",
        "otp_message": "Seu código de verificação SB Pay é: {code}",
        "login_alert": "Novo login detectado em sua conta SB Pay",
        "2fa_enabled": "A autenticação de dois fatores foi ativada",
        "2fa_disabled": "A autenticação de dois fatores foi desativada"
    },
    "ar": {
        "welcome": "مرحبًا بك في SB Pay",
        "transfer_success": "تم تحويل {amount} {currency} بنجاح إلى {recipient}",
        "deposit_success": "تم إيداع {amount} {currency} بنجاح",
        "withdrawal_pending": "طلب سحب {amount} {currency} قيد المعالجة",
        "bill_paid": "تم دفع فاتورة {type} بنجاح: {amount} {currency}",
        "otp_message": "رمز التحقق الخاص بك في SB Pay هو: {code}",
        "login_alert": "تم اكتشاف تسجيل دخول جديد على حسابك في SB Pay",
        "2fa_enabled": "تم تفعيل المصادقة الثنائية",
        "2fa_disabled": "تم تعطيل المصادقة الثنائية"
    },
    "de": {
        "welcome": "Willkommen bei SB Pay",
        "transfer_success": "Überweisung von {amount} {currency} erfolgreich an {recipient} gesendet",
        "deposit_success": "Einzahlung von {amount} {currency} erfolgreich abgeschlossen",
        "withdrawal_pending": "Auszahlungsanfrage von {amount} {currency} wird bearbeitet",
        "bill_paid": "Rechnung {type} erfolgreich bezahlt: {amount} {currency}",
        "otp_message": "Ihr SB Pay Verifizierungscode ist: {code}",
        "login_alert": "Neue Anmeldung auf Ihrem SB Pay Konto erkannt",
        "2fa_enabled": "Zwei-Faktor-Authentifizierung wurde aktiviert",
        "2fa_disabled": "Zwei-Faktor-Authentifizierung wurde deaktiviert"
    },
    "zh": {
        "welcome": "欢迎使用 SB Pay",
        "transfer_success": "成功向 {recipient} 转账 {amount} {currency}",
        "deposit_success": "成功存入 {amount} {currency}",
        "withdrawal_pending": "提款请求 {amount} {currency} 正在处理中",
        "bill_paid": "账单 {type} 支付成功: {amount} {currency}",
        "otp_message": "您的 SB Pay 验证码是: {code}",
        "login_alert": "检测到您的 SB Pay 账户有新的登录",
        "2fa_enabled": "双重身份验证已启用",
        "2fa_disabled": "双重身份验证已禁用"
    }
}

def get_translation(key: str, language: str = "fr", **kwargs) -> str:
    lang_translations = TRANSLATIONS.get(language, TRANSLATIONS["fr"])
    template = lang_translations.get(key, TRANSLATIONS["fr"].get(key, key))
    return template.format(**kwargs) if kwargs else template

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, background_tasks: BackgroundTasks):
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
        "two_factor_enabled": False,
        "two_factor_phone": None,
        "preferred_language": user_data.preferred_language,
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
    
    # Send welcome email
    background_tasks.add_task(
        send_email_notification,
        user_data.email,
        get_translation("welcome", user_data.preferred_language),
        f"Bienvenue {user_data.full_name}!",
        user_data.preferred_language
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": "user",
            "preferred_language": user_data.preferred_language
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
    
    # Check if 2FA is enabled
    if user.get("two_factor_enabled") and user.get("two_factor_phone"):
        # Generate and send OTP
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
        
        # Send OTP via SMS
        lang = user.get("preferred_language", "fr")
        message = get_translation("otp_message", lang, code=otp)
        background_tasks.add_task(send_sms_notification, user["two_factor_phone"], message)
        
        return {
            "requires_2fa": True,
            "user_id": user["id"],
            "message": "OTP sent to your phone"
        }
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    # Send login alert
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
            "preferred_language": user.get("preferred_language", "fr")
        }
    }

@api_router.post("/auth/verify-2fa")
async def verify_2fa_login(user_id: str, code: str, background_tasks: BackgroundTasks):
    otp_record = await db.otp_codes.find_one(
        {"user_id": user_id, "type": "login"},
        {"_id": 0}
    )
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No OTP request found")
    
    if datetime.fromisoformat(otp_record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    code_hash = hashlib.sha256(code.encode()).hexdigest()
    if code_hash != otp_record["code_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Mark as verified
    await db.otp_codes.update_one(
        {"user_id": user_id, "type": "login"},
        {"$set": {"verified": True}}
    )
    
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
            "preferred_language": user.get("preferred_language", "fr")
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
        "two_factor_enabled": current_user.get("two_factor_enabled", False),
        "preferred_language": current_user.get("preferred_language", "fr"),
        "created_at": current_user["created_at"]
    }

# ==================== 2FA ROUTES ====================

@api_router.post("/auth/2fa/setup")
async def setup_2fa(request: TwoFactorSetupRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    # Generate OTP and send to phone
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
    otp_record = await db.otp_codes.find_one(
        {"user_id": current_user["id"], "type": "2fa_setup"},
        {"_id": 0}
    )
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="No 2FA setup request found")
    
    if datetime.fromisoformat(otp_record["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    code_hash = hashlib.sha256(request.code.encode()).hexdigest()
    if code_hash != otp_record["code_hash"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Enable 2FA for user
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_factor_enabled": True,
            "two_factor_phone": otp_record["phone"]
        }}
    )
    
    # Send confirmation
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("2fa_enabled", lang),
        "2FA enabled",
        lang
    )
    
    return {"message": "2FA enabled successfully"}

@api_router.post("/auth/2fa/disable")
async def disable_2fa(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_factor_enabled": False,
            "two_factor_phone": None
        }}
    )
    
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("2fa_disabled", lang),
        "2FA disabled",
        lang
    )
    
    return {"message": "2FA disabled successfully"}

# ==================== LANGUAGE ROUTES ====================

@api_router.put("/user/language")
async def update_language(request: LanguageUpdateRequest, current_user: dict = Depends(get_current_user)):
    if request.language not in TRANSLATIONS:
        raise HTTPException(status_code=400, detail="Unsupported language")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"preferred_language": request.language}}
    )
    
    return {"message": "Language updated", "language": request.language}

@api_router.get("/languages")
async def get_languages():
    return {
        "languages": [
            {"code": "fr", "name": "Français", "native": "Français"},
            {"code": "en", "name": "English", "native": "English"},
            {"code": "es", "name": "Spanish", "native": "Español"},
            {"code": "pt", "name": "Portuguese", "native": "Português"},
            {"code": "ar", "name": "Arabic", "native": "العربية", "rtl": True},
            {"code": "de", "name": "German", "native": "Deutsch"},
            {"code": "zh", "name": "Chinese", "native": "中文"}
        ]
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
    
    # Email notifications
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("transfer_success", sender_lang, amount=transfer.amount, currency=transfer.currency, recipient=transfer.recipient_email),
        f"Transfer completed: {transfer.amount} {transfer.currency}",
        sender_lang
    )
    
    background_tasks.add_task(
        send_email_notification,
        transfer.recipient_email,
        f"Received {transfer.amount} {transfer.currency} from {current_user['email']}",
        f"You received a transfer",
        recipient_lang
    )
    
    # Push notifications
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
    
    # SMS if phone available
    if current_user.get("phone"):
        background_tasks.add_task(
            send_sms_notification,
            current_user["phone"],
            f"SB Pay: {transfer.amount} {transfer.currency} sent to {transfer.recipient_email}"
        )
    
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
async def check_deposit_status(session_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
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
            
            # Send notifications
            lang = current_user.get("preferred_language", "fr")
            background_tasks.add_task(
                send_email_notification,
                current_user["email"],
                get_translation("deposit_success", lang, amount=payment_record["amount"], currency=currency),
                f"Deposit confirmed: {payment_record['amount']} {currency}",
                lang
            )
            
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

# ==================== PAYPAL ROUTES (DEMO) ====================

@api_router.post("/deposits/paypal")
async def create_paypal_checkout(request: PayPalCheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create PayPal checkout session (demo mode)"""
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    order_id = f"PAYPAL-{uuid.uuid4().hex[:12].upper()}"
    
    # Create pending transaction
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
    
    # In demo mode, return a simulated PayPal URL
    demo_url = f"{request.origin_url}/deposit/paypal-demo?order_id={order_id}&amount={request.amount}&currency={request.currency}"
    
    return {
        "order_id": order_id,
        "checkout_url": demo_url,
        "demo_mode": True,
        "message": "Demo PayPal checkout - click to simulate payment"
    }

@api_router.post("/deposits/paypal/capture/{order_id}")
async def capture_paypal_payment(order_id: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Capture PayPal payment (demo mode - auto-approves)"""
    transaction = await db.transactions.find_one(
        {"paypal_order_id": order_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="PayPal order not found")
    
    if transaction["status"] == "completed":
        return {"message": "Payment already captured", "status": "completed"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update transaction as completed
    await db.transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"status": "completed", "updated_at": now}}
    )
    
    # Credit wallet
    await db.wallets.update_one(
        {"user_id": current_user["id"], "currency": transaction["currency"]},
        {"$inc": {"balance": transaction["amount"]}, "$set": {"updated_at": now}}
    )
    
    # Send notifications
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("deposit_success", lang, amount=transaction["amount"], currency=transaction["currency"]),
        f"PayPal deposit confirmed",
        lang
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
    """Create mobile money deposit request (demo mode)"""
    if request.provider not in MOBILE_MONEY_PROVIDERS:
        raise HTTPException(status_code=400, detail="Invalid mobile money provider")
    
    now = datetime.now(timezone.utc).isoformat()
    transaction_id = str(uuid.uuid4())
    reference = f"MM-{uuid.uuid4().hex[:8].upper()}"
    
    # Create pending transaction
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
    
    # In demo mode, send SMS with payment instructions
    provider_name = MOBILE_MONEY_PROVIDERS[request.provider]["name"]
    background_tasks.add_task(
        send_sms_notification,
        request.phone_number,
        f"SB Pay: Paiement {provider_name} de {request.amount} {request.currency}. Ref: {reference}. [DEMO - Auto-confirmé en 5s]"
    )
    
    return {
        "transaction_id": transaction_id,
        "reference": reference,
        "provider": request.provider,
        "provider_name": provider_name,
        "amount": request.amount,
        "currency": request.currency,
        "status": "pending",
        "demo_mode": True,
        "message": f"Demo {provider_name} - SMS sent with payment instructions"
    }

@api_router.post("/mobile-money/confirm/{reference}")
async def confirm_mobile_money_payment(reference: str, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Confirm mobile money payment (demo mode - auto-confirms)"""
    transaction = await db.transactions.find_one(
        {"mobile_money_reference": reference, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Mobile money transaction not found")
    
    if transaction["status"] == "completed":
        return {"message": "Payment already confirmed", "status": "completed"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update transaction
    await db.transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {"status": "completed", "updated_at": now}}
    )
    
    # Credit wallet
    await db.wallets.update_one(
        {"user_id": current_user["id"], "currency": transaction["currency"]},
        {"$inc": {"balance": transaction["amount"]}, "$set": {"updated_at": now}}
    )
    
    # Send notifications
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Mobile Money Confirmed",
        f"+{transaction['amount']} {transaction['currency']} added to your wallet"
    )
    
    return {"message": "Payment confirmed", "status": "completed", "amount": transaction["amount"]}

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
async def create_withdrawal(withdraw: WithdrawRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
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
    
    # Create transaction
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
    
    # Send notifications
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("withdrawal_pending", lang, amount=withdraw.amount, currency=withdraw.currency),
        f"Withdrawal request submitted",
        lang
    )
    
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
    
    # Send notifications
    lang = current_user.get("preferred_language", "fr")
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        get_translation("bill_paid", lang, type=bill.bill_type, amount=bill.amount, currency=bill.currency),
        f"Bill payment confirmed",
        lang
    )
    
    background_tasks.add_task(
        send_push_notification,
        current_user["id"],
        "Bill Paid",
        f"{bill.bill_type} bill of {bill.amount} {bill.currency} paid successfully"
    )
    
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

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications")
async def get_notifications(limit: int = 20, current_user: dict = Depends(get_current_user)):
    notifications = await db.push_notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.push_notifications.count_documents(
        {"user_id": current_user["id"], "read": False}
    )
    
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
    
    # Users by language
    lang_pipeline = [
        {"$group": {"_id": "$preferred_language", "count": {"$sum": 1}}}
    ]
    users_by_language = await db.users.aggregate(lang_pipeline).to_list(10)
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_transactions": total_transactions,
        "recent_transactions_24h": recent_transactions,
        "volume_by_currency": {v["_id"]: v["total"] for v in volume_by_currency},
        "users_by_language": {v["_id"]: v["count"] for v in users_by_language if v["_id"]}
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
    return {"message": "SB Pay API v2.0", "status": "healthy", "demo_mode": DEMO_MODE}

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
