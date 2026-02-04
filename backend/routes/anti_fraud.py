"""
Anti-Fraud Module for SBPAYGO
Detects and prevents multiple account creation by the same user
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import hashlib
import re

anti_fraud_router = APIRouter(prefix="/api/security/anti-fraud", tags=["Anti-Fraud"])

# Will be set by setup function
db = None
JWT_SECRET_KEY = None
JWT_ALGORITHM = None

class DeviceFingerprintData(BaseModel):
    user_agent: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    canvas_hash: Optional[str] = None  # Canvas fingerprint
    webgl_hash: Optional[str] = None   # WebGL fingerprint

class PhoneVerificationRequest(BaseModel):
    phone_number: str

class FraudReportRequest(BaseModel):
    user_id: str
    reason: str
    evidence: Optional[str] = None

def setup_anti_fraud_routes(database, jwt_secret, jwt_algo):
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

async def get_admin_user(authorization: str = Header(None)):
    user = await get_current_user_local(authorization)
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def normalize_phone(phone: str) -> str:
    """Normalize phone number for comparison"""
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    # Remove leading zeros after country code
    if len(digits) > 10:
        return digits[-9:]  # Last 9 digits for most African countries
    return digits

def generate_device_fingerprint(data: DeviceFingerprintData) -> str:
    """Generate a fingerprint hash from device data"""
    fingerprint_string = f"{data.user_agent}|{data.screen_resolution}|{data.timezone}|{data.platform}|{data.canvas_hash}|{data.webgl_hash}"
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()

@anti_fraud_router.post("/register-device")
async def register_device_fingerprint(
    data: DeviceFingerprintData,
    current_user: dict = Depends(get_current_user_local)
):
    """Register device fingerprint for the current user"""
    
    fingerprint = generate_device_fingerprint(data)
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if this fingerprint is already associated with another account
    existing = await db.device_fingerprints.find_one({
        "fingerprint": fingerprint,
        "user_id": {"$ne": current_user["id"]}
    })
    
    suspicious = False
    if existing:
        suspicious = True
        # Log suspicious activity
        await db.fraud_alerts.insert_one({
            "id": str(uuid.uuid4()),
            "type": "duplicate_device",
            "user_id": current_user["id"],
            "related_user_id": existing["user_id"],
            "fingerprint": fingerprint,
            "severity": "high",
            "status": "pending",
            "created_at": now
        })
    
    # Update or insert fingerprint
    await db.device_fingerprints.update_one(
        {"user_id": current_user["id"]},
        {
            "$set": {
                "fingerprint": fingerprint,
                "user_agent": data.user_agent,
                "screen_resolution": data.screen_resolution,
                "timezone": data.timezone,
                "platform": data.platform,
                "updated_at": now
            },
            "$setOnInsert": {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "created_at": now
            }
        },
        upsert=True
    )
    
    return {
        "registered": True,
        "suspicious": suspicious,
        "message": "Appareil enregistre" if not suspicious else "Activite suspecte detectee"
    }

@anti_fraud_router.post("/check-phone")
async def check_phone_duplicate(
    data: PhoneVerificationRequest,
    current_user: dict = Depends(get_current_user_local)
):
    """Check if phone number is already used by another account"""
    
    normalized = normalize_phone(data.phone_number)
    
    # Find all users with similar phone numbers
    all_users = await db.users.find(
        {"id": {"$ne": current_user["id"]}},
        {"_id": 0, "id": 1, "phone": 1, "full_name": 1}
    ).to_list(1000)
    
    duplicates = []
    for user in all_users:
        user_phone = normalize_phone(user.get("phone", ""))
        if user_phone and user_phone == normalized:
            duplicates.append({
                "user_id": user["id"],
                "name_masked": user.get("full_name", "")[:3] + "***"
            })
    
    return {
        "is_duplicate": len(duplicates) > 0,
        "duplicate_count": len(duplicates),
        "duplicates": duplicates if duplicates else None
    }

@anti_fraud_router.get("/alerts")
async def get_fraud_alerts(
    status: str = "pending",
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get fraud alerts (admin only)"""
    
    query = {}
    if status != "all":
        query["status"] = status
    
    alerts = await db.fraud_alerts.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Enrich with user data
    for alert in alerts:
        user = await db.users.find_one(
            {"id": alert.get("user_id")},
            {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "created_at": 1}
        )
        alert["user"] = user
        
        if alert.get("related_user_id"):
            related = await db.users.find_one(
                {"id": alert["related_user_id"]},
                {"_id": 0, "full_name": 1, "email": 1, "phone": 1}
            )
            alert["related_user"] = related
    
    return {"alerts": alerts}

@anti_fraud_router.post("/alerts/{alert_id}/resolve")
async def resolve_fraud_alert(
    alert_id: str,
    action: str,  # dismiss, block_user, block_both
    admin: dict = Depends(get_admin_user)
):
    """Resolve a fraud alert (admin only)"""
    
    alert = await db.fraud_alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvee")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if action == "dismiss":
        await db.fraud_alerts.update_one(
            {"id": alert_id},
            {"$set": {"status": "dismissed", "resolved_at": now, "resolved_by": admin["id"]}}
        )
    
    elif action == "block_user":
        await db.users.update_one(
            {"id": alert["user_id"]},
            {"$set": {"status": "blocked", "blocked_at": now, "blocked_reason": "fraud_detection"}}
        )
        await db.fraud_alerts.update_one(
            {"id": alert_id},
            {"$set": {"status": "actioned", "action": "user_blocked", "resolved_at": now, "resolved_by": admin["id"]}}
        )
    
    elif action == "block_both":
        await db.users.update_many(
            {"id": {"$in": [alert["user_id"], alert.get("related_user_id")]}},
            {"$set": {"status": "blocked", "blocked_at": now, "blocked_reason": "fraud_detection"}}
        )
        await db.fraud_alerts.update_one(
            {"id": alert_id},
            {"$set": {"status": "actioned", "action": "both_blocked", "resolved_at": now, "resolved_by": admin["id"]}}
        )
    
    return {"success": True, "action": action}

@anti_fraud_router.post("/report")
async def report_fraud(
    report: FraudReportRequest,
    admin: dict = Depends(get_admin_user)
):
    """Manually report a fraudulent user (admin only)"""
    
    user = await db.users.find_one({"id": report.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.fraud_alerts.insert_one({
        "id": str(uuid.uuid4()),
        "type": "manual_report",
        "user_id": report.user_id,
        "reason": report.reason,
        "evidence": report.evidence,
        "reported_by": admin["id"],
        "severity": "high",
        "status": "pending",
        "created_at": now
    })
    
    return {"success": True, "message": "Signalement enregistre"}

@anti_fraud_router.get("/user/{user_id}/risk-score")
async def get_user_risk_score(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get risk score for a user (admin only)"""
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    
    risk_score = 0
    risk_factors = []
    
    # Check for duplicate devices
    device = await db.device_fingerprints.find_one({"user_id": user_id})
    if device:
        duplicate_devices = await db.device_fingerprints.count_documents({
            "fingerprint": device["fingerprint"],
            "user_id": {"$ne": user_id}
        })
        if duplicate_devices > 0:
            risk_score += 30
            risk_factors.append(f"Appareil partage avec {duplicate_devices} autre(s) compte(s)")
    
    # Check for duplicate phone
    if user.get("phone"):
        normalized_phone = normalize_phone(user["phone"])
        similar_phones = 0
        async for other_user in db.users.find({"id": {"$ne": user_id}, "phone": {"$exists": True}}):
            if normalize_phone(other_user.get("phone", "")) == normalized_phone:
                similar_phones += 1
        if similar_phones > 0:
            risk_score += 25
            risk_factors.append(f"Numero de telephone utilise par {similar_phones} autre(s) compte(s)")
    
    # Check for previous fraud alerts
    alerts_count = await db.fraud_alerts.count_documents({"user_id": user_id})
    if alerts_count > 0:
        risk_score += 20 * min(alerts_count, 3)
        risk_factors.append(f"{alerts_count} alerte(s) de fraude precedente(s)")
    
    # Check account age
    created_at = user.get("created_at")
    if created_at:
        try:
            created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            age_days = (datetime.now(timezone.utc) - created).days
            if age_days < 7:
                risk_score += 10
                risk_factors.append("Compte cree il y a moins de 7 jours")
        except:
            pass
    
    # Check KYC status
    if user.get("kyc_status") != "verified":
        risk_score += 15
        risk_factors.append("KYC non verifie")
    
    # Determine risk level
    if risk_score >= 70:
        risk_level = "critical"
    elif risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return {
        "user_id": user_id,
        "risk_score": min(risk_score, 100),
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "recommendation": "Bloquer le compte" if risk_level == "critical" else "Surveillance renforcee" if risk_level == "high" else "RAS"
    }

@anti_fraud_router.get("/stats")
async def get_fraud_stats(admin: dict = Depends(get_admin_user)):
    """Get fraud detection statistics (admin only)"""
    
    # Count alerts by status
    pending_alerts = await db.fraud_alerts.count_documents({"status": "pending"})
    resolved_alerts = await db.fraud_alerts.count_documents({"status": {"$in": ["dismissed", "actioned"]}})
    
    # Count blocked users
    blocked_users = await db.users.count_documents({"status": "blocked"})
    
    # Count users with high risk
    # This is a simplified calculation
    total_users = await db.users.count_documents({})
    
    # Recent alerts (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_alerts = await db.fraud_alerts.count_documents({
        "created_at": {"$gte": week_ago}
    })
    
    return {
        "pending_alerts": pending_alerts,
        "resolved_alerts": resolved_alerts,
        "blocked_users": blocked_users,
        "total_users": total_users,
        "recent_alerts_7d": recent_alerts,
        "fraud_rate": round((blocked_users / max(total_users, 1)) * 100, 2)
    }
