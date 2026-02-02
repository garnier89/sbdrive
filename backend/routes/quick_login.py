# Module Connexion Rapide par PIN
# Permet aux utilisateurs de se connecter rapidement avec un PIN à 6 chiffres

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Header, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import secrets
import jwt

# Create router
quick_login_router = APIRouter(prefix="/api/auth", tags=["Quick Login"])

# ==================== MODELS ====================

class QuickPinSetup(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)
    password: str  # Current password to verify identity

class QuickPinLogin(BaseModel):
    device_token: str
    pin: str = Field(..., min_length=4, max_length=6)

class QuickPinChange(BaseModel):
    current_pin: str = Field(..., min_length=4, max_length=6)
    new_pin: str = Field(..., min_length=4, max_length=6)

class QuickPinDisable(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)

# ==================== CONFIGURATION ====================

# PIN security settings
MAX_PIN_ATTEMPTS = 5
PIN_LOCKOUT_MINUTES = 30
DEVICE_TOKEN_EXPIRY_DAYS = 30

# ==================== HELPER FUNCTIONS ====================

def hash_pin(pin: str, salt: str) -> str:
    """Hash PIN with salt for secure storage"""
    return hashlib.sha256(f"{pin}{salt}".encode()).hexdigest()

def generate_device_token() -> str:
    """Generate a secure device token"""
    return secrets.token_urlsafe(32)

def generate_salt() -> str:
    """Generate a random salt"""
    return secrets.token_hex(16)

# ==================== ROUTE SETUP ====================

def setup_quick_login_routes(db, verify_password_func, create_token_func, jwt_secret, jwt_algorithm, send_push_notification):
    """Setup quick login routes with database access"""

    @quick_login_router.post("/quick-pin/setup")
    async def setup_quick_pin(
        request: QuickPinSetup,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """
        Setup Quick PIN for fast login.
        Returns a device token that must be stored securely on the device.
        """
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user and verify password
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not verify_password_func(request.password, user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect")
        
        # Validate PIN format
        if not request.pin.isdigit():
            raise HTTPException(status_code=400, detail="Le PIN doit contenir uniquement des chiffres")
        
        now = datetime.now(timezone.utc)
        
        # Generate device token and salt
        device_token = generate_device_token()
        salt = generate_salt()
        pin_hash = hash_pin(request.pin, salt)
        
        # Store quick login credentials
        quick_login_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "device_token_hash": hashlib.sha256(device_token.encode()).hexdigest(),
            "pin_hash": pin_hash,
            "pin_salt": salt,
            "pin_attempts": 0,
            "locked_until": None,
            "is_active": True,
            "device_name": "Web Browser",
            "last_used": now.isoformat(),
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(days=DEVICE_TOKEN_EXPIRY_DAYS)).isoformat()
        }
        
        # Remove any existing quick login for this user (one device at a time for security)
        await db.quick_logins.delete_many({"user_id": user_id})
        
        await db.quick_logins.insert_one(quick_login_doc)
        
        # Update user profile
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"quick_pin_enabled": True, "updated_at": now.isoformat()}}
        )
        
        # Log action
        await db.security_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "action": "quick_pin_setup",
            "ip_address": None,
            "created_at": now.isoformat()
        })
        
        # Notification
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "PIN rapide activé",
            "Vous pouvez maintenant vous connecter rapidement avec votre PIN"
        )
        
        return {
            "message": "PIN rapide configuré avec succès",
            "device_token": device_token,  # Store this securely on the client!
            "expires_in_days": DEVICE_TOKEN_EXPIRY_DAYS,
            "warning": "Conservez ce token de manière sécurisée. Il ne sera plus affiché."
        }

    @quick_login_router.post("/quick-pin/login")
    async def quick_pin_login(
        request: QuickPinLogin,
        background_tasks: BackgroundTasks
    ):
        """
        Login using device token and PIN.
        Much faster than email/password login.
        """
        # Find quick login by device token
        device_token_hash = hashlib.sha256(request.device_token.encode()).hexdigest()
        
        quick_login = await db.quick_logins.find_one({
            "device_token_hash": device_token_hash,
            "is_active": True
        })
        
        if not quick_login:
            raise HTTPException(status_code=401, detail="Appareil non reconnu. Utilisez la connexion classique.")
        
        # Check expiry
        if datetime.fromisoformat(quick_login["expires_at"]) < datetime.now(timezone.utc):
            await db.quick_logins.update_one(
                {"id": quick_login["id"]},
                {"$set": {"is_active": False}}
            )
            raise HTTPException(status_code=401, detail="Session expirée. Veuillez reconfigurer le PIN rapide.")
        
        # Check lockout
        if quick_login.get("locked_until"):
            locked_until = datetime.fromisoformat(quick_login["locked_until"])
            if datetime.now(timezone.utc) < locked_until:
                remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60)
                raise HTTPException(
                    status_code=423,
                    detail=f"Compte verrouillé. Réessayez dans {remaining} minutes."
                )
            else:
                # Reset lockout
                await db.quick_logins.update_one(
                    {"id": quick_login["id"]},
                    {"$set": {"pin_attempts": 0, "locked_until": None}}
                )
                quick_login["pin_attempts"] = 0
        
        # Verify PIN
        pin_hash = hash_pin(request.pin, quick_login["pin_salt"])
        
        if pin_hash != quick_login["pin_hash"]:
            # Increment attempts
            new_attempts = quick_login.get("pin_attempts", 0) + 1
            update_data = {"pin_attempts": new_attempts}
            
            if new_attempts >= MAX_PIN_ATTEMPTS:
                update_data["locked_until"] = (
                    datetime.now(timezone.utc) + timedelta(minutes=PIN_LOCKOUT_MINUTES)
                ).isoformat()
                await db.quick_logins.update_one({"id": quick_login["id"]}, {"$set": update_data})
                raise HTTPException(
                    status_code=423,
                    detail=f"Trop de tentatives. Compte verrouillé pour {PIN_LOCKOUT_MINUTES} minutes."
                )
            
            await db.quick_logins.update_one({"id": quick_login["id"]}, {"$set": update_data})
            remaining = MAX_PIN_ATTEMPTS - new_attempts
            raise HTTPException(status_code=400, detail=f"PIN incorrect. {remaining} tentatives restantes.")
        
        # PIN is correct - reset attempts and get user
        user = await db.users.find_one({"id": quick_login["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Compte désactivé")
        
        now = datetime.now(timezone.utc)
        
        # Update quick login
        await db.quick_logins.update_one(
            {"id": quick_login["id"]},
            {"$set": {"pin_attempts": 0, "last_used": now.isoformat()}}
        )
        
        # Create access token
        access_token = create_token_func({"sub": user["id"]})
        
        # Log login
        await db.security_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "action": "quick_pin_login",
            "created_at": now.isoformat()
        })
        
        # Remove sensitive data
        user.pop("password_hash", None)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user,
            "login_method": "quick_pin"
        }

    @quick_login_router.post("/quick-pin/change")
    async def change_quick_pin(
        request: QuickPinChange,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Change the Quick PIN"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Find quick login
        quick_login = await db.quick_logins.find_one({
            "user_id": user_id,
            "is_active": True
        })
        
        if not quick_login:
            raise HTTPException(status_code=404, detail="PIN rapide non configuré")
        
        # Verify current PIN
        current_pin_hash = hash_pin(request.current_pin, quick_login["pin_salt"])
        if current_pin_hash != quick_login["pin_hash"]:
            raise HTTPException(status_code=400, detail="PIN actuel incorrect")
        
        # Validate new PIN
        if not request.new_pin.isdigit():
            raise HTTPException(status_code=400, detail="Le PIN doit contenir uniquement des chiffres")
        
        # Update PIN
        new_salt = generate_salt()
        new_pin_hash = hash_pin(request.new_pin, new_salt)
        
        await db.quick_logins.update_one(
            {"id": quick_login["id"]},
            {
                "$set": {
                    "pin_hash": new_pin_hash,
                    "pin_salt": new_salt,
                    "pin_attempts": 0,
                    "locked_until": None
                }
            }
        )
        
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "PIN modifié",
            "Votre PIN de connexion rapide a été modifié"
        )
        
        return {"message": "PIN modifié avec succès"}

    @quick_login_router.post("/quick-pin/disable")
    async def disable_quick_pin(
        request: QuickPinDisable,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Disable Quick PIN login"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Find quick login
        quick_login = await db.quick_logins.find_one({
            "user_id": user_id,
            "is_active": True
        })
        
        if not quick_login:
            raise HTTPException(status_code=404, detail="PIN rapide non configuré")
        
        # Verify PIN
        pin_hash = hash_pin(request.pin, quick_login["pin_salt"])
        if pin_hash != quick_login["pin_hash"]:
            raise HTTPException(status_code=400, detail="PIN incorrect")
        
        # Disable
        await db.quick_logins.update_one(
            {"id": quick_login["id"]},
            {"$set": {"is_active": False}}
        )
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"quick_pin_enabled": False}}
        )
        
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "PIN désactivé",
            "La connexion rapide par PIN a été désactivée"
        )
        
        return {"message": "PIN rapide désactivé"}

    @quick_login_router.get("/quick-pin/status")
    async def get_quick_pin_status(
        authorization: str = Header(None)
    ):
        """Check if Quick PIN is configured for the current user"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        quick_login = await db.quick_logins.find_one({
            "user_id": user_id,
            "is_active": True
        })
        
        if not quick_login:
            return {
                "enabled": False,
                "message": "PIN rapide non configuré"
            }
        
        # Check if expired
        is_expired = datetime.fromisoformat(quick_login["expires_at"]) < datetime.now(timezone.utc)
        
        return {
            "enabled": not is_expired,
            "expires_at": quick_login["expires_at"],
            "is_expired": is_expired,
            "last_used": quick_login.get("last_used"),
            "device_name": quick_login.get("device_name", "Unknown")
        }

    @quick_login_router.post("/quick-pin/check-device")
    async def check_device_token(device_token: str):
        """
        Check if a device token is valid (for frontend to show PIN input).
        Does not require authentication.
        """
        device_token_hash = hashlib.sha256(device_token.encode()).hexdigest()
        
        quick_login = await db.quick_logins.find_one({
            "device_token_hash": device_token_hash,
            "is_active": True
        })
        
        if not quick_login:
            return {"valid": False, "message": "Appareil non reconnu"}
        
        is_expired = datetime.fromisoformat(quick_login["expires_at"]) < datetime.now(timezone.utc)
        
        if is_expired:
            return {"valid": False, "message": "Session expirée"}
        
        # Get user info for display (masked email)
        user = await db.users.find_one({"id": quick_login["user_id"]}, {"_id": 0, "email": 1, "first_name": 1})
        
        if user:
            email = user.get("email", "")
            masked_email = email[:2] + "***" + email[email.find("@"):] if "@" in email else "***"
        else:
            masked_email = "***"
        
        return {
            "valid": True,
            "user_hint": user.get("first_name", "Utilisateur"),
            "email_masked": masked_email,
            "is_locked": quick_login.get("locked_until") is not None and 
                         datetime.fromisoformat(quick_login["locked_until"]) > datetime.now(timezone.utc)
        }

    return quick_login_router
