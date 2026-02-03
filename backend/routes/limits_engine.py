"""
Limits Engine - Transaction limits by KYC level, country, and user type
Anti-fraud rules and velocity checks
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/admin/limits", tags=["Limits Engine"])

# ==================== MODELS ====================

class LimitProfile(BaseModel):
    name: str
    description: Optional[str] = None
    country_code: Optional[str] = None
    zone_id: Optional[str] = None
    kyc_level: int = 0  # 0-3
    actor_type: str = "user"  # user, partner, agent
    currency: str = "EUR"
    per_transaction_limit: float
    daily_limit: float
    weekly_limit: float
    monthly_limit: float
    is_active: bool = True

class LimitProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    per_transaction_limit: Optional[float] = None
    daily_limit: Optional[float] = None
    weekly_limit: Optional[float] = None
    monthly_limit: Optional[float] = None
    is_active: Optional[bool] = None

class RiskRule(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: str  # velocity, country_change, device_change, amount_spike
    threshold: int
    time_window_minutes: int = 60
    action: str = "alert"  # alert, block, verify
    is_active: bool = True

# KYC Levels
KYC_LEVELS = [
    {"level": 0, "name": "Non vérifié", "name_fr": "Non vérifié", "requirements": ["Téléphone uniquement"]},
    {"level": 1, "name": "Basic", "name_fr": "Basique", "requirements": ["Pièce d'identité"]},
    {"level": 2, "name": "Verified", "name_fr": "Vérifié", "requirements": ["Pièce d'identité", "Selfie avec pièce"]},
    {"level": 3, "name": "Premium", "name_fr": "Premium", "requirements": ["Pièce d'identité", "Selfie", "Justificatif domicile"]}
]

# Default Limit Profiles
DEFAULT_PROFILES = [
    # User limits - EUR
    {
        "name": "User EUR - KYC 0",
        "description": "Limites utilisateur non vérifié EUR",
        "kyc_level": 0,
        "actor_type": "user",
        "currency": "EUR",
        "per_transaction_limit": 50,
        "daily_limit": 100,
        "weekly_limit": 300,
        "monthly_limit": 500
    },
    {
        "name": "User EUR - KYC 1",
        "description": "Limites utilisateur basique EUR",
        "kyc_level": 1,
        "actor_type": "user",
        "currency": "EUR",
        "per_transaction_limit": 500,
        "daily_limit": 1000,
        "weekly_limit": 3000,
        "monthly_limit": 5000
    },
    {
        "name": "User EUR - KYC 2",
        "description": "Limites utilisateur vérifié EUR",
        "kyc_level": 2,
        "actor_type": "user",
        "currency": "EUR",
        "per_transaction_limit": 2000,
        "daily_limit": 5000,
        "weekly_limit": 15000,
        "monthly_limit": 30000
    },
    {
        "name": "User EUR - KYC 3",
        "description": "Limites utilisateur premium EUR",
        "kyc_level": 3,
        "actor_type": "user",
        "currency": "EUR",
        "per_transaction_limit": 10000,
        "daily_limit": 25000,
        "weekly_limit": 75000,
        "monthly_limit": 150000
    },
    # User limits - XOF (Afrique Ouest)
    {
        "name": "User XOF - KYC 0",
        "description": "Limites utilisateur non vérifié XOF",
        "kyc_level": 0,
        "actor_type": "user",
        "currency": "XOF",
        "per_transaction_limit": 25000,
        "daily_limit": 50000,
        "weekly_limit": 150000,
        "monthly_limit": 300000
    },
    {
        "name": "User XOF - KYC 1",
        "description": "Limites utilisateur basique XOF",
        "kyc_level": 1,
        "actor_type": "user",
        "currency": "XOF",
        "per_transaction_limit": 300000,
        "daily_limit": 1000000,
        "weekly_limit": 3000000,
        "monthly_limit": 5000000
    },
    {
        "name": "User XOF - KYC 2",
        "description": "Limites utilisateur vérifié XOF",
        "kyc_level": 2,
        "actor_type": "user",
        "currency": "XOF",
        "per_transaction_limit": 2000000,
        "daily_limit": 5000000,
        "weekly_limit": 15000000,
        "monthly_limit": 30000000
    },
    # Partner/Agent limits
    {
        "name": "Partner EUR",
        "description": "Limites partenaire EUR",
        "kyc_level": 3,
        "actor_type": "partner",
        "currency": "EUR",
        "per_transaction_limit": 50000,
        "daily_limit": 200000,
        "weekly_limit": 500000,
        "monthly_limit": 1000000
    },
    {
        "name": "Agent XOF",
        "description": "Limites agent XOF",
        "kyc_level": 3,
        "actor_type": "agent",
        "currency": "XOF",
        "per_transaction_limit": 10000000,
        "daily_limit": 50000000,
        "weekly_limit": 200000000,
        "monthly_limit": 500000000
    }
]

# Default Risk Rules
DEFAULT_RISK_RULES = [
    {
        "name": "Velocity - 5 transactions/2min",
        "description": "Alerte si plus de 5 transactions en 2 minutes",
        "rule_type": "velocity",
        "threshold": 5,
        "time_window_minutes": 2,
        "action": "block"
    },
    {
        "name": "Velocity - 10 transactions/10min",
        "description": "Alerte si plus de 10 transactions en 10 minutes",
        "rule_type": "velocity",
        "threshold": 10,
        "time_window_minutes": 10,
        "action": "alert"
    },
    {
        "name": "Nouveau pays connexion",
        "description": "Vérification si connexion depuis un nouveau pays",
        "rule_type": "country_change",
        "threshold": 1,
        "time_window_minutes": 1440,
        "action": "verify"
    },
    {
        "name": "Nouvel appareil",
        "description": "Alerte si connexion depuis un nouvel appareil",
        "rule_type": "device_change",
        "threshold": 1,
        "time_window_minutes": 1440,
        "action": "alert"
    },
    {
        "name": "Montant suspect",
        "description": "Alerte si montant > 5x la moyenne habituelle",
        "rule_type": "amount_spike",
        "threshold": 5,
        "time_window_minutes": 10080,
        "action": "alert"
    },
    {
        "name": "Cartes multiples",
        "description": "Blocage si 3+ cartes utilisées en 1h",
        "rule_type": "multiple_cards",
        "threshold": 3,
        "time_window_minutes": 60,
        "action": "block"
    }
]


def get_limits_router(db, get_admin_user):
    """Create limits engine router with database dependency"""
    
    # ==================== INITIALIZATION ====================
    
    @router.post("/init")
    async def initialize_limits(admin: dict = Depends(get_admin_user)):
        """Initialize default limits and risk rules"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if profiles exist
        existing_profiles = await db.limit_profiles.count_documents({})
        if existing_profiles == 0:
            for profile in DEFAULT_PROFILES:
                profile_doc = {
                    "id": str(uuid.uuid4()),
                    **profile,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                }
                await db.limit_profiles.insert_one(profile_doc)
        
        # Check if risk rules exist
        existing_rules = await db.risk_rules.count_documents({})
        if existing_rules == 0:
            for rule in DEFAULT_RISK_RULES:
                rule_doc = {
                    "id": str(uuid.uuid4()),
                    **rule,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                }
                await db.risk_rules.insert_one(rule_doc)
        
        return {
            "message": "Limits system initialized",
            "profiles": existing_profiles or len(DEFAULT_PROFILES),
            "risk_rules": existing_rules or len(DEFAULT_RISK_RULES)
        }
    
    # ==================== STATISTICS ====================
    
    @router.get("/stats")
    async def get_limits_stats(admin: dict = Depends(get_admin_user)):
        """Get limits statistics"""
        total_profiles = await db.limit_profiles.count_documents({})
        active_profiles = await db.limit_profiles.count_documents({"is_active": True})
        
        total_rules = await db.risk_rules.count_documents({})
        active_rules = await db.risk_rules.count_documents({"is_active": True})
        
        # Alerts count
        alerts_today = await db.risk_alerts.count_documents({
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}
        })
        
        blocked_today = await db.risk_alerts.count_documents({
            "action_taken": "block",
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()}
        })
        
        # By currency
        pipeline = [
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}}
        ]
        by_currency = await db.limit_profiles.aggregate(pipeline).to_list(100)
        
        return {
            "total_profiles": total_profiles,
            "active_profiles": active_profiles,
            "total_risk_rules": total_rules,
            "active_risk_rules": active_rules,
            "alerts_today": alerts_today,
            "blocked_today": blocked_today,
            "by_currency": {item["_id"]: item["count"] for item in by_currency}
        }
    
    # ==================== KYC LEVELS ====================
    
    @router.get("/kyc-levels")
    async def get_kyc_levels(admin: dict = Depends(get_admin_user)):
        """Get KYC levels configuration"""
        return {"levels": KYC_LEVELS}
    
    # ==================== LIMIT PROFILES CRUD ====================
    
    @router.get("/profiles")
    async def get_all_profiles(
        kyc_level: int = None,
        actor_type: str = None,
        currency: str = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Get all limit profiles"""
        query = {}
        if kyc_level is not None:
            query["kyc_level"] = kyc_level
        if actor_type:
            query["actor_type"] = actor_type
        if currency:
            query["currency"] = currency
        
        profiles = await db.limit_profiles.find(query, {"_id": 0}).sort([("currency", 1), ("kyc_level", 1)]).to_list(500)
        
        if not profiles:
            await initialize_limits(admin)
            profiles = await db.limit_profiles.find(query, {"_id": 0}).sort([("currency", 1), ("kyc_level", 1)]).to_list(500)
        
        return {"profiles": profiles, "total": len(profiles)}
    
    @router.get("/profiles/{profile_id}")
    async def get_profile(profile_id: str, admin: dict = Depends(get_admin_user)):
        """Get a specific limit profile"""
        profile = await db.limit_profiles.find_one({"id": profile_id}, {"_id": 0})
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return profile
    
    @router.post("/profiles")
    async def create_profile(data: LimitProfile, admin: dict = Depends(get_admin_user)):
        """Create a new limit profile"""
        now = datetime.now(timezone.utc).isoformat()
        
        profile_doc = {
            "id": str(uuid.uuid4()),
            **data.dict(),
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("email")
        }
        
        await db.limit_profiles.insert_one(profile_doc)
        
        return {"message": "Profile created successfully", "profile_id": profile_doc["id"]}
    
    @router.put("/profiles/{profile_id}")
    async def update_profile(profile_id: str, data: LimitProfileUpdate, admin: dict = Depends(get_admin_user)):
        """Update a limit profile"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        result = await db.limit_profiles.update_one(
            {"id": profile_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Profile updated successfully"}
    
    @router.delete("/profiles/{profile_id}")
    async def delete_profile(profile_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a limit profile"""
        result = await db.limit_profiles.delete_one({"id": profile_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Profile deleted successfully"}
    
    @router.put("/profiles/{profile_id}/toggle")
    async def toggle_profile(profile_id: str, admin: dict = Depends(get_admin_user)):
        """Toggle profile active status"""
        profile = await db.limit_profiles.find_one({"id": profile_id})
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        new_status = not profile.get("is_active", True)
        await db.limit_profiles.update_one(
            {"id": profile_id},
            {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": f"Profile {'activated' if new_status else 'deactivated'}", "is_active": new_status}
    
    # ==================== RISK RULES CRUD ====================
    
    @router.get("/risk-rules")
    async def get_all_risk_rules(admin: dict = Depends(get_admin_user)):
        """Get all risk rules"""
        rules = await db.risk_rules.find({}, {"_id": 0}).to_list(100)
        return {"rules": rules, "total": len(rules)}
    
    @router.post("/risk-rules")
    async def create_risk_rule(data: RiskRule, admin: dict = Depends(get_admin_user)):
        """Create a new risk rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        rule_doc = {
            "id": str(uuid.uuid4()),
            **data.dict(),
            "created_at": now,
            "updated_at": now
        }
        
        await db.risk_rules.insert_one(rule_doc)
        
        return {"message": "Risk rule created", "rule_id": rule_doc["id"]}
    
    @router.put("/risk-rules/{rule_id}")
    async def update_risk_rule(rule_id: str, data: dict, admin: dict = Depends(get_admin_user)):
        """Update a risk rule"""
        now = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = now
        
        result = await db.risk_rules.update_one(
            {"id": rule_id},
            {"$set": data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": "Rule updated"}
    
    @router.delete("/risk-rules/{rule_id}")
    async def delete_risk_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a risk rule"""
        result = await db.risk_rules.delete_one({"id": rule_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": "Rule deleted"}
    
    @router.put("/risk-rules/{rule_id}/toggle")
    async def toggle_risk_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
        """Toggle risk rule active status"""
        rule = await db.risk_rules.find_one({"id": rule_id})
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        new_status = not rule.get("is_active", True)
        await db.risk_rules.update_one(
            {"id": rule_id},
            {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"is_active": new_status}
    
    # ==================== ALERTS ====================
    
    @router.get("/alerts")
    async def get_risk_alerts(
        limit: int = 50,
        action: str = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Get risk alerts"""
        query = {}
        if action:
            query["action_taken"] = action
        
        alerts = await db.risk_alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {"alerts": alerts, "total": len(alerts)}
    
    @router.put("/alerts/{alert_id}/resolve")
    async def resolve_alert(alert_id: str, resolution: str, admin: dict = Depends(get_admin_user)):
        """Resolve a risk alert"""
        now = datetime.now(timezone.utc).isoformat()
        
        result = await db.risk_alerts.update_one(
            {"id": alert_id},
            {"$set": {
                "resolved": True,
                "resolved_at": now,
                "resolved_by": admin.get("email"),
                "resolution_note": resolution
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert resolved"}
    
    # ==================== LIMIT CHECK (for app) ====================
    
    @router.get("/check")
    async def check_transaction_limit(
        user_id: str,
        amount: float,
        transaction_type: str,
        currency: str = "EUR"
    ):
        """Check if a transaction is within limits (public endpoint for app)"""
        result = await _check_limits(db, user_id, amount, transaction_type, currency)
        return result
    
    return router


async def _check_limits(db, user_id: str, amount: float, transaction_type: str, currency: str):
    """Internal function to check transaction limits"""
    
    # Get user info
    user = await db.users.find_one({"id": user_id})
    if not user:
        return {"allowed": False, "reason": "User not found"}
    
    kyc_level = user.get("kyc_level", 0)
    actor_type = "user"  # Could be determined from user type
    
    # Find applicable limit profile
    profile = await db.limit_profiles.find_one({
        "kyc_level": kyc_level,
        "actor_type": actor_type,
        "currency": currency,
        "is_active": True
    })
    
    if not profile:
        # Fallback to most restrictive
        profile = await db.limit_profiles.find_one({
            "kyc_level": 0,
            "actor_type": "user",
            "currency": currency,
            "is_active": True
        })
    
    if not profile:
        return {"allowed": True, "reason": "No limit profile configured"}
    
    # Check per-transaction limit
    if amount > profile.get("per_transaction_limit", float("inf")):
        return {
            "allowed": False,
            "reason": "Exceeds per-transaction limit",
            "limit": profile["per_transaction_limit"],
            "amount": amount
        }
    
    # Check daily limit
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    daily_total = await _get_user_total(db, user_id, today_start.isoformat(), currency)
    
    if daily_total + amount > profile.get("daily_limit", float("inf")):
        return {
            "allowed": False,
            "reason": "Exceeds daily limit",
            "limit": profile["daily_limit"],
            "current_total": daily_total,
            "requested": amount
        }
    
    # Check weekly limit
    week_start = today_start - timedelta(days=today_start.weekday())
    weekly_total = await _get_user_total(db, user_id, week_start.isoformat(), currency)
    
    if weekly_total + amount > profile.get("weekly_limit", float("inf")):
        return {
            "allowed": False,
            "reason": "Exceeds weekly limit",
            "limit": profile["weekly_limit"],
            "current_total": weekly_total
        }
    
    # Check monthly limit
    month_start = today_start.replace(day=1)
    monthly_total = await _get_user_total(db, user_id, month_start.isoformat(), currency)
    
    if monthly_total + amount > profile.get("monthly_limit", float("inf")):
        return {
            "allowed": False,
            "reason": "Exceeds monthly limit",
            "limit": profile["monthly_limit"],
            "current_total": monthly_total
        }
    
    return {
        "allowed": True,
        "limits": {
            "per_transaction": profile["per_transaction_limit"],
            "daily_remaining": profile["daily_limit"] - daily_total,
            "weekly_remaining": profile["weekly_limit"] - weekly_total,
            "monthly_remaining": profile["monthly_limit"] - monthly_total
        }
    }


async def _get_user_total(db, user_id: str, since: str, currency: str):
    """Get user's total transaction amount since a given time"""
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "currency": currency,
            "status": {"$in": ["completed", "pending"]},
            "created_at": {"$gte": since}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    
    result = await db.transactions.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0
