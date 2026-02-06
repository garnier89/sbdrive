"""Authentication routes module for SBPAYGO"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import hashlib
import uuid
import random
import string

auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Will be set by setup function
db = None
JWT_SECRET_KEY = None
JWT_ALGORITHM = None
ACCESS_TOKEN_EXPIRE_MINUTES = None

# Models
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

class TwoFactorSetupRequest(BaseModel):
    phone_number: str

class TwoFactorVerifyRequest(BaseModel):
    code: str

# Helpers
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

def generate_sbpaygo_id() -> str:
    """Generate unique SBPAYGO ID in format SBP-XXXX-XXXX"""
    chars = string.ascii_uppercase + string.digits
    part1 = ''.join(random.choices(chars, k=4))
    part2 = ''.join(random.choices(chars, k=4))
    return f"SBP-{part1}-{part2}"

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

# Notification helpers (will be imported from main)
send_email_notification = None
send_sms_notification = None
send_push_notification = None
get_translation = None

# Routes
@auth_router.post("/register")
async def register(user_data: UserCreate, background_tasks: BackgroundTasks):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Generate unique SBPAYGO ID
    sbpaygo_id = generate_sbpaygo_id()
    while await db.users.find_one({"sbpaygo_id": sbpaygo_id}):
        sbpaygo_id = generate_sbpaygo_id()
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    full_name = f"{user_data.first_name} {user_data.last_name}"
    
    user = {
        "id": user_id,
        "sbpaygo_id": sbpaygo_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "full_name": full_name,
        "phone": user_data.phone,
        "country": user_data.country,
        "preferred_language": user_data.preferred_language,
        "default_currency": user_data.default_currency,
        "role": "user",
        "is_active": True,
        "kyc_status": "pending",
        "two_factor_enabled": False,
        "created_at": now,
        "updated_at": now
    }
    await db.users.insert_one(user)
    
    # Create default wallets
    for currency in ["EUR", "XOF", "USD"]:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "currency": currency,
            "balance": 1000.0 if currency == "EUR" else (50000.0 if currency == "XOF" else 100.0),
            "created_at": now,
            "updated_at": now
        }
        await db.wallets.insert_one(wallet)
    
    token = create_access_token({"sub": user_id, "email": user_data.email})
    
    if send_email_notification:
        lang = user_data.preferred_language
        welcome_msg = get_translation("welcome", lang) if get_translation else "Bienvenue sur SBPAYGO"
        background_tasks.add_task(
            send_email_notification,
            user_data.email,
            welcome_msg,
            f"Your SBPAYGO ID: {sbpaygo_id}",
            lang
        )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "sbpaygo_id": sbpaygo_id,
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

@auth_router.post("/login")
async def login(credentials: UserLogin, background_tasks: BackgroundTasks):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    # Generate sbpaygo_id for existing users who don't have one
    if not user.get("sbpaygo_id"):
        sbpaygo_id = generate_sbpaygo_id()
        while await db.users.find_one({"sbpaygo_id": sbpaygo_id}):
            sbpaygo_id = generate_sbpaygo_id()
        await db.users.update_one({"id": user["id"]}, {"$set": {"sbpaygo_id": sbpaygo_id}})
        user["sbpaygo_id"] = sbpaygo_id
    
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
        message = get_translation("otp_message", lang, code=otp) if get_translation else f"Your SBPAYGO code: {otp}"
        if send_sms_notification:
            background_tasks.add_task(send_sms_notification, user["two_factor_phone"], message)
        
        return {
            "requires_2fa": True,
            "user_id": user["id"],
            "message": "OTP sent to your phone"
        }
    
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    lang = user.get("preferred_language", "fr")
    if send_email_notification and get_translation:
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
            "sbpaygo_id": user.get("sbpaygo_id"),
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user.get("role", "user"),
            "preferred_language": user.get("preferred_language", "fr"),
            "kyc_status": user.get("kyc_status", "pending")
        }
    }

@auth_router.post("/verify-2fa")
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

@auth_router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "sbpaygo_id": current_user.get("sbpaygo_id"),
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

@auth_router.post("/2fa/setup")
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
    message = get_translation("otp_message", lang, code=otp) if get_translation else f"Your SBPAYGO code: {otp}"
    if send_sms_notification:
        background_tasks.add_task(send_sms_notification, request.phone_number, message)
    
    return {"message": "OTP sent to your phone", "phone": request.phone_number}

@auth_router.post("/2fa/verify")
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

@auth_router.post("/2fa/disable")
async def disable_2fa(current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"two_factor_enabled": False, "two_factor_phone": None}}
    )
    return {"message": "2FA disabled successfully"}


def setup_auth_routes(database, jwt_secret, jwt_algo, token_expire, email_func, sms_func, push_func, translate_func):
    """Initialize the auth routes with database and config"""
    global db, JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
    global send_email_notification, send_sms_notification, send_push_notification, get_translation
    
    db = database
    JWT_SECRET_KEY = jwt_secret
    JWT_ALGORITHM = jwt_algo
    ACCESS_TOKEN_EXPIRE_MINUTES = token_expire
    send_email_notification = email_func
    send_sms_notification = sms_func
    send_push_notification = push_func
    get_translation = translate_func
