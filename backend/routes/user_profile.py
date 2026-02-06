"""User profile routes module for SBPAYGO"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import base64

user_profile_router = APIRouter(prefix="/user", tags=["User Profile"])

# Will be set by setup function
db = None
get_current_user = None
hash_password = None
verify_password = None

# Models
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

class LanguageUpdateRequest(BaseModel):
    language: str


@user_profile_router.put("/profile")
async def update_profile(profile: UserProfileUpdate, current_user: dict = Depends(lambda: get_current_user)):
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


@user_profile_router.put("/password")
async def change_password(password_data: PasswordChange, current_user: dict = Depends(lambda: get_current_user)):
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


@user_profile_router.post("/avatar")
async def upload_avatar(avatar: UploadFile = File(...), current_user: dict = Depends(lambda: get_current_user)):
    """Upload user avatar"""
    if not avatar.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await avatar.read()
    base64_image = base64.b64encode(contents).decode('utf-8')
    avatar_url = f"data:{avatar.content_type};base64,{base64_image[:100]}..."
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"avatar_url": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Avatar uploaded successfully"}


@user_profile_router.put("/language")
async def update_language(request: LanguageUpdateRequest, current_user: dict = Depends(lambda: get_current_user)):
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"preferred_language": request.language}})
    return {"message": "Language updated", "language": request.language}


@user_profile_router.put("/currency")
async def update_default_currency(currency: str, current_user: dict = Depends(lambda: get_current_user)):
    """Update user's default currency"""
    valid_currency = await db.currencies.find_one({"code": currency.upper(), "active": True})
    if not valid_currency:
        raise HTTPException(status_code=400, detail="Invalid currency")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"default_currency": currency.upper()}}
    )
    return {"message": "Default currency updated", "currency": currency.upper()}


def setup_user_profile_routes(database, get_user_func, hash_func, verify_func):
    """Initialize the user profile routes with dependencies"""
    global db, get_current_user, hash_password, verify_password
    
    db = database
    get_current_user = get_user_func
    hash_password = hash_func
    verify_password = verify_func
