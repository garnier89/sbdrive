"""
Admin routes for managing rewards configuration
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/admin/rewards", tags=["Admin Rewards"])

# ==================== MODELS ====================

class TierConfig(BaseModel):
    name: str
    name_fr: str
    min_points: int
    cashback_rate: float
    color: str
    icon: Optional[str] = None
    benefits: Optional[List[str]] = []

class RewardOffer(BaseModel):
    name: str
    description: str
    points_cost: int
    reward_type: str  # cashback, discount, bonus, gift
    reward_value: float
    currency: Optional[str] = "EUR"
    is_active: bool = True
    expires_at: Optional[str] = None
    max_redemptions: Optional[int] = None
    current_redemptions: int = 0
    conditions: Optional[str] = None

class RewardRule(BaseModel):
    name: str
    description: str
    action_type: str  # transaction, referral, registration, deposit, etc.
    points_awarded: int
    multiplier: Optional[float] = 1.0
    min_amount: Optional[float] = None
    max_points_per_day: Optional[int] = None
    is_active: bool = True

class UpdateTierConfig(BaseModel):
    name: Optional[str] = None
    name_fr: Optional[str] = None
    min_points: Optional[int] = None
    cashback_rate: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    benefits: Optional[List[str]] = None

class UpdateRewardOffer(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    points_cost: Optional[int] = None
    reward_type: Optional[str] = None
    reward_value: Optional[float] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None
    max_redemptions: Optional[int] = None
    conditions: Optional[str] = None

class UpdateRewardRule(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    action_type: Optional[str] = None
    points_awarded: Optional[int] = None
    multiplier: Optional[float] = None
    min_amount: Optional[float] = None
    max_points_per_day: Optional[int] = None
    is_active: Optional[bool] = None

# Default tiers configuration
DEFAULT_TIERS = [
    {
        "id": "bronze",
        "name": "Bronze",
        "name_fr": "Bronze",
        "min_points": 0,
        "cashback_rate": 0.5,
        "color": "#CD7F32",
        "icon": "medal",
        "benefits": ["0.5% cashback sur les transactions", "Accès aux offres de base"]
    },
    {
        "id": "silver",
        "name": "Silver",
        "name_fr": "Argent",
        "min_points": 1000,
        "cashback_rate": 1.0,
        "color": "#C0C0C0",
        "icon": "award",
        "benefits": ["1% cashback sur les transactions", "Frais réduits de 10%", "Support prioritaire"]
    },
    {
        "id": "gold",
        "name": "Gold",
        "name_fr": "Or",
        "min_points": 5000,
        "cashback_rate": 1.5,
        "color": "#FFD700",
        "icon": "star",
        "benefits": ["1.5% cashback sur les transactions", "Frais réduits de 20%", "Virements gratuits", "Carte virtuelle premium"]
    },
    {
        "id": "platinum",
        "name": "Platinum",
        "name_fr": "Platine",
        "min_points": 20000,
        "cashback_rate": 2.0,
        "color": "#E5E4E2",
        "icon": "crown",
        "benefits": ["2% cashback sur les transactions", "Frais réduits de 30%", "Conseiller dédié", "Limites augmentées"]
    },
    {
        "id": "diamond",
        "name": "Diamond",
        "name_fr": "Diamant",
        "min_points": 50000,
        "cashback_rate": 3.0,
        "color": "#B9F2FF",
        "icon": "gem",
        "benefits": ["3% cashback sur les transactions", "Aucun frais", "Accès VIP", "Avantages exclusifs"]
    }
]

DEFAULT_RULES = [
    {
        "id": str(uuid.uuid4()),
        "name": "Points par transaction",
        "description": "Gagnez 1 point par euro dépensé",
        "action_type": "transaction",
        "points_awarded": 1,
        "multiplier": 1.0,
        "min_amount": 1.0,
        "max_points_per_day": 1000,
        "is_active": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Bonus parrainage",
        "description": "500 points pour chaque parrainage réussi",
        "action_type": "referral",
        "points_awarded": 500,
        "multiplier": 1.0,
        "min_amount": None,
        "max_points_per_day": 5000,
        "is_active": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Bonus inscription",
        "description": "100 points offerts à l'inscription",
        "action_type": "registration",
        "points_awarded": 100,
        "multiplier": 1.0,
        "min_amount": None,
        "max_points_per_day": None,
        "is_active": True
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Bonus premier dépôt",
        "description": "Points x2 sur le premier dépôt",
        "action_type": "first_deposit",
        "points_awarded": 0,
        "multiplier": 2.0,
        "min_amount": 10.0,
        "max_points_per_day": None,
        "is_active": True
    }
]

DEFAULT_OFFERS = [
    {
        "id": str(uuid.uuid4()),
        "name": "Conversion en espèces",
        "description": "Convertissez vos points en solde (100 points = 1€)",
        "points_cost": 100,
        "reward_type": "cashback",
        "reward_value": 1.0,
        "currency": "EUR",
        "is_active": True,
        "expires_at": None,
        "max_redemptions": None,
        "current_redemptions": 0,
        "conditions": "Minimum 100 points requis"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Virement gratuit",
        "description": "Un virement international sans frais",
        "points_cost": 500,
        "reward_type": "discount",
        "reward_value": 100,
        "currency": "PERCENT",
        "is_active": True,
        "expires_at": None,
        "max_redemptions": None,
        "current_redemptions": 0,
        "conditions": "Valable sur un virement unique"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Bonus 5€",
        "description": "Recevez 5€ de bonus sur votre wallet",
        "points_cost": 400,
        "reward_type": "bonus",
        "reward_value": 5.0,
        "currency": "EUR",
        "is_active": True,
        "expires_at": None,
        "max_redemptions": 1000,
        "current_redemptions": 0,
        "conditions": "Limité à 1 par utilisateur par mois"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Bonus 20€",
        "description": "Recevez 20€ de bonus sur votre wallet",
        "points_cost": 1500,
        "reward_type": "bonus",
        "reward_value": 20.0,
        "currency": "EUR",
        "is_active": True,
        "expires_at": None,
        "max_redemptions": 500,
        "current_redemptions": 0,
        "conditions": "Réservé aux membres Gold et plus"
    }
]

def get_rewards_admin_router(db, get_admin_user):
    """Create rewards admin router with database dependency"""
    
    # ==================== INITIALIZATION ====================
    
    @router.post("/init")
    async def initialize_rewards_config(admin: dict = Depends(get_admin_user)):
        """Initialize default rewards configuration"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if already initialized
        existing_config = await db.rewards_config.find_one({"type": "settings"})
        if existing_config:
            return {"message": "Rewards configuration already initialized", "status": "exists"}
        
        # Insert default tiers
        for tier in DEFAULT_TIERS:
            tier["type"] = "tier"
            tier["created_at"] = now
            tier["updated_at"] = now
            await db.rewards_config.update_one(
                {"id": tier["id"], "type": "tier"},
                {"$set": tier},
                upsert=True
            )
        
        # Insert default rules
        for rule in DEFAULT_RULES:
            rule["type"] = "rule"
            rule["created_at"] = now
            rule["updated_at"] = now
            await db.rewards_config.insert_one(rule)
        
        # Insert default offers
        for offer in DEFAULT_OFFERS:
            offer["type"] = "offer"
            offer["created_at"] = now
            offer["updated_at"] = now
            await db.rewards_config.insert_one(offer)
        
        # Insert settings
        settings = {
            "type": "settings",
            "points_per_euro": 1,
            "referral_bonus": 500,
            "registration_bonus": 100,
            "redemption_rate": 100,  # 100 points = 1€
            "min_redemption": 100,
            "created_at": now,
            "updated_at": now
        }
        await db.rewards_config.insert_one(settings)
        
        return {"message": "Rewards configuration initialized successfully", "status": "created"}
    
    # ==================== STATISTICS ====================
    
    @router.get("/stats")
    async def get_rewards_stats(admin: dict = Depends(get_admin_user)):
        """Get rewards system statistics"""
        # Count users by tier
        tier_counts = {}
        for tier in ["bronze", "silver", "gold", "platinum", "diamond"]:
            count = await db.rewards.count_documents({"tier": tier})
            tier_counts[tier] = count
        
        # Total points in circulation
        pipeline = [
            {"$group": {"_id": None, "total_points": {"$sum": "$points"}, "total_earned": {"$sum": "$total_earned"}, "total_redeemed": {"$sum": "$total_redeemed"}}}
        ]
        stats_result = await db.rewards.aggregate(pipeline).to_list(1)
        stats = stats_result[0] if stats_result else {"total_points": 0, "total_earned": 0, "total_redeemed": 0}
        
        # Count offers
        active_offers = await db.rewards_config.count_documents({"type": "offer", "is_active": True})
        total_offers = await db.rewards_config.count_documents({"type": "offer"})
        
        # Count rules
        active_rules = await db.rewards_config.count_documents({"type": "rule", "is_active": True})
        total_rules = await db.rewards_config.count_documents({"type": "rule"})
        
        # Recent redemptions
        recent_redemptions = await db.rewards_history.count_documents({"type": "redemption"})
        
        return {
            "tier_distribution": tier_counts,
            "total_users": sum(tier_counts.values()),
            "total_points_in_circulation": stats.get("total_points", 0),
            "total_points_earned": stats.get("total_earned", 0),
            "total_points_redeemed": stats.get("total_redeemed", 0),
            "active_offers": active_offers,
            "total_offers": total_offers,
            "active_rules": active_rules,
            "total_rules": total_rules,
            "total_redemptions": recent_redemptions
        }
    
    # ==================== TIERS MANAGEMENT ====================
    
    @router.get("/tiers")
    async def get_all_tiers(admin: dict = Depends(get_admin_user)):
        """Get all tier configurations"""
        tiers = await db.rewards_config.find({"type": "tier"}, {"_id": 0}).sort("min_points", 1).to_list(100)
        if not tiers:
            # Return defaults if not initialized
            return {"tiers": DEFAULT_TIERS}
        return {"tiers": tiers}
    
    @router.put("/tiers/{tier_id}")
    async def update_tier(tier_id: str, data: UpdateTierConfig, admin: dict = Depends(get_admin_user)):
        """Update a tier configuration"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        result = await db.rewards_config.update_one(
            {"id": tier_id, "type": "tier"},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Tier not found")
        
        return {"message": f"Tier {tier_id} updated successfully"}
    
    # ==================== OFFERS MANAGEMENT ====================
    
    @router.get("/offers")
    async def get_all_offers(admin: dict = Depends(get_admin_user)):
        """Get all reward offers"""
        offers = await db.rewards_config.find({"type": "offer"}, {"_id": 0}).sort("points_cost", 1).to_list(100)
        if not offers:
            return {"offers": DEFAULT_OFFERS}
        return {"offers": offers}
    
    @router.post("/offers")
    async def create_offer(data: RewardOffer, admin: dict = Depends(get_admin_user)):
        """Create a new reward offer"""
        now = datetime.now(timezone.utc).isoformat()
        
        offer_doc = {
            "id": str(uuid.uuid4()),
            "type": "offer",
            **data.dict(),
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("email", "admin")
        }
        
        await db.rewards_config.insert_one(offer_doc)
        
        return {"message": "Offer created successfully", "offer_id": offer_doc["id"]}
    
    @router.put("/offers/{offer_id}")
    async def update_offer(offer_id: str, data: UpdateRewardOffer, admin: dict = Depends(get_admin_user)):
        """Update a reward offer"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        result = await db.rewards_config.update_one(
            {"id": offer_id, "type": "offer"},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        return {"message": f"Offer updated successfully"}
    
    @router.delete("/offers/{offer_id}")
    async def delete_offer(offer_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a reward offer"""
        result = await db.rewards_config.delete_one({"id": offer_id, "type": "offer"})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Offer not found")
        
        return {"message": "Offer deleted successfully"}
    
    # ==================== RULES MANAGEMENT ====================
    
    @router.get("/rules")
    async def get_all_rules(admin: dict = Depends(get_admin_user)):
        """Get all reward rules"""
        rules = await db.rewards_config.find({"type": "rule"}, {"_id": 0}).to_list(100)
        if not rules:
            return {"rules": DEFAULT_RULES}
        return {"rules": rules}
    
    @router.post("/rules")
    async def create_rule(data: RewardRule, admin: dict = Depends(get_admin_user)):
        """Create a new reward rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        rule_doc = {
            "id": str(uuid.uuid4()),
            "type": "rule",
            **data.dict(),
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("email", "admin")
        }
        
        await db.rewards_config.insert_one(rule_doc)
        
        return {"message": "Rule created successfully", "rule_id": rule_doc["id"]}
    
    @router.put("/rules/{rule_id}")
    async def update_rule(rule_id: str, data: UpdateRewardRule, admin: dict = Depends(get_admin_user)):
        """Update a reward rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        result = await db.rewards_config.update_one(
            {"id": rule_id, "type": "rule"},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": f"Rule updated successfully"}
    
    @router.delete("/rules/{rule_id}")
    async def delete_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a reward rule"""
        result = await db.rewards_config.delete_one({"id": rule_id, "type": "rule"})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": "Rule deleted successfully"}
    
    # ==================== USER REWARDS MANAGEMENT ====================
    
    @router.get("/users")
    async def get_users_rewards(
        skip: int = 0, 
        limit: int = 50,
        tier: str = None,
        search: str = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Get all users rewards with optional filters"""
        query = {}
        if tier:
            query["tier"] = tier
        
        rewards = await db.rewards.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
        
        # Enrich with user data
        for reward in rewards:
            user = await db.users.find_one({"id": reward["user_id"]}, {"_id": 0, "email": 1, "full_name": 1})
            if user:
                reward["user_email"] = user.get("email", "N/A")
                reward["user_name"] = user.get("full_name", "N/A")
        
        # Filter by search if provided
        if search:
            rewards = [r for r in rewards if search.lower() in r.get("user_email", "").lower() or search.lower() in r.get("user_name", "").lower()]
        
        total = await db.rewards.count_documents(query)
        
        return {"users": rewards, "total": total}
    
    @router.post("/users/{user_id}/award")
    async def award_points_to_user(
        user_id: str,
        points: int,
        description: str,
        admin: dict = Depends(get_admin_user)
    ):
        """Manually award points to a user"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update rewards
        result = await db.rewards.update_one(
            {"user_id": user_id},
            {
                "$inc": {"points": points, "total_earned": max(0, points)},
                "$set": {"updated_at": now}
            }
        )
        
        if result.matched_count == 0:
            # Create rewards if doesn't exist
            await db.rewards.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "points": points,
                "tier": "bronze",
                "total_earned": max(0, points),
                "total_redeemed": 0,
                "referral_code": user_id[:8].upper(),
                "referral_count": 0,
                "cashback_earned": 0,
                "created_at": now
            })
        
        # Record history
        history_entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "admin_adjustment",
            "points": points,
            "description": f"[Admin] {description}",
            "created_at": now,
            "admin_email": admin.get("email", "admin")
        }
        await db.rewards_history.insert_one(history_entry)
        
        return {"message": f"Successfully awarded {points} points to user"}
    
    return router
