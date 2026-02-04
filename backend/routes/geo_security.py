"""
Geolocation Security Module for SBPAYGO
Allows users to restrict transactions to a specific geographic area
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import jwt
import math

geo_security_router = APIRouter(prefix="/api/security/geo", tags=["Geolocation Security"])

# Will be set by setup function
db = None
JWT_SECRET_KEY = None
JWT_ALGORITHM = None

class GeoSettingsUpdate(BaseModel):
    enabled: bool
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None
    allowed_radius_km: Optional[float] = 50.0  # Default 50km
    notify_on_block: Optional[bool] = True

class LocationCheck(BaseModel):
    latitude: float
    longitude: float
    transaction_type: Optional[str] = "payment"

def setup_geo_security_routes(database, jwt_secret, jwt_algo):
    global db, JWT_SECRET_KEY, JWT_ALGORITHM
    db = database
    JWT_SECRET_KEY = jwt_secret
    JWT_ALGORITHM = jwt_algo

async def get_current_user_local(authorization: str = Header(None)):
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
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance between two points on Earth using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

@geo_security_router.get("/settings")
async def get_geo_settings(current_user: dict = Depends(get_current_user_local)):
    """Get current geolocation security settings"""
    
    settings = await db.geo_security_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        return {
            "settings": {
                "enabled": False,
                "home_latitude": None,
                "home_longitude": None,
                "allowed_radius_km": 50.0,
                "notify_on_block": True,
                "home_address": None
            }
        }
    
    return {"settings": settings}

@geo_security_router.post("/settings")
async def update_geo_settings(
    settings_data: GeoSettingsUpdate,
    current_user: dict = Depends(get_current_user_local)
):
    """Update geolocation security settings"""
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate coordinates if enabling
    if settings_data.enabled:
        if settings_data.home_latitude is None or settings_data.home_longitude is None:
            raise HTTPException(
                status_code=400, 
                detail="Les coordonnees de votre position sont requises pour activer la securite geographique"
            )
        
        if not (-90 <= settings_data.home_latitude <= 90):
            raise HTTPException(status_code=400, detail="Latitude invalide")
        
        if not (-180 <= settings_data.home_longitude <= 180):
            raise HTTPException(status_code=400, detail="Longitude invalide")
        
        if settings_data.allowed_radius_km and settings_data.allowed_radius_km < 1:
            raise HTTPException(status_code=400, detail="Le rayon minimum est de 1 km")
    
    settings_doc = {
        "user_id": current_user["id"],
        "enabled": settings_data.enabled,
        "home_latitude": settings_data.home_latitude,
        "home_longitude": settings_data.home_longitude,
        "allowed_radius_km": settings_data.allowed_radius_km or 50.0,
        "notify_on_block": settings_data.notify_on_block,
        "updated_at": now
    }
    
    # Upsert settings
    existing = await db.geo_security_settings.find_one({"user_id": current_user["id"]})
    
    if existing:
        await db.geo_security_settings.update_one(
            {"user_id": current_user["id"]},
            {"$set": settings_doc}
        )
    else:
        settings_doc["created_at"] = now
        await db.geo_security_settings.insert_one(settings_doc)
    
    return {
        "success": True,
        "message": "Parametres de securite geographique mis a jour" if settings_data.enabled else "Securite geographique desactivee"
    }

@geo_security_router.post("/check")
async def check_location(
    location: LocationCheck,
    current_user: dict = Depends(get_current_user_local)
):
    """Check if a location is within the allowed area"""
    
    settings = await db.geo_security_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    # If no settings or not enabled, allow all
    if not settings or not settings.get("enabled"):
        return {
            "allowed": True,
            "geo_security_enabled": False,
            "message": "Securite geographique non activee"
        }
    
    # Calculate distance from home
    distance = haversine_distance(
        settings["home_latitude"],
        settings["home_longitude"],
        location.latitude,
        location.longitude
    )
    
    allowed_radius = settings.get("allowed_radius_km", 50.0)
    is_allowed = distance <= allowed_radius
    
    # Log the check
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "latitude": location.latitude,
        "longitude": location.longitude,
        "distance_km": round(distance, 2),
        "allowed_radius_km": allowed_radius,
        "is_allowed": is_allowed,
        "transaction_type": location.transaction_type,
        "checked_at": datetime.now(timezone.utc).isoformat()
    }
    await db.geo_security_logs.insert_one(log_entry)
    
    if not is_allowed:
        return {
            "allowed": False,
            "geo_security_enabled": True,
            "distance_km": round(distance, 2),
            "allowed_radius_km": allowed_radius,
            "message": f"Transaction bloquee: vous etes a {round(distance, 1)} km de votre zone autorisee ({allowed_radius} km)"
        }
    
    return {
        "allowed": True,
        "geo_security_enabled": True,
        "distance_km": round(distance, 2),
        "allowed_radius_km": allowed_radius,
        "message": "Position autorisee"
    }

@geo_security_router.get("/logs")
async def get_geo_logs(
    limit: int = 20,
    current_user: dict = Depends(get_current_user_local)
):
    """Get geolocation security check logs"""
    
    logs = await db.geo_security_logs.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("checked_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs}

@geo_security_router.delete("/settings")
async def disable_geo_security(current_user: dict = Depends(get_current_user_local)):
    """Disable geolocation security completely"""
    
    await db.geo_security_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"enabled": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Securite geographique desactivee"}

@geo_security_router.post("/set-home")
async def set_home_location(
    latitude: float,
    longitude: float,
    address: Optional[str] = None,
    current_user: dict = Depends(get_current_user_local)
):
    """Set the home location for geo security"""
    
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Coordonnees invalides")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.geo_security_settings.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "home_latitude": latitude,
                "home_longitude": longitude,
                "home_address": address,
                "updated_at": now
            },
            "$setOnInsert": {
                "user_id": current_user["id"],
                "enabled": False,
                "allowed_radius_km": 50.0,
                "notify_on_block": True,
                "created_at": now
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "Position de reference mise a jour",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "address": address
        }
    }
