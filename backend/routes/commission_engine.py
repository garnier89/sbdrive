"""
Commission Engine - Dynamic rates by country, zone, transaction type and amount tiers
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/admin/commissions", tags=["Commission Engine"])

# ==================== MODELS ====================

class CommissionTier(BaseModel):
    min_amount: float
    max_amount: Optional[float] = None  # None = no limit
    percentage_fee: float
    fixed_fee: float = 0

class CommissionRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    country_code: Optional[str] = None  # None = applies globally
    zone_id: Optional[str] = None
    transaction_type: str  # deposit, withdraw, transfer, card_payment, recharge, mobile_money
    payment_method: Optional[str] = None  # bank, card, mobile_money, wave, orange, mtn, etc.
    percentage_fee: float = 0
    fixed_fee: float = 0
    currency: str = "EUR"
    use_dynamic_rate: bool = False
    tiers: Optional[List[CommissionTier]] = []
    partner_share_percent: float = 0  # % of commission shared with partner
    is_active: bool = True
    priority: int = 10  # Lower = higher priority

class CommissionRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    percentage_fee: Optional[float] = None
    fixed_fee: Optional[float] = None
    use_dynamic_rate: Optional[bool] = None
    tiers: Optional[List[dict]] = None
    partner_share_percent: Optional[float] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None

# Default commission rules
DEFAULT_RULES = [
    # Deposits
    {
        "name": "Dépôt Mobile Money - Afrique Ouest",
        "description": "Commission sur dépôts Mobile Money zone XOF",
        "zone_id": "afrique_ouest",
        "transaction_type": "deposit",
        "payment_method": "mobile_money",
        "percentage_fee": 1.5,
        "fixed_fee": 0,
        "currency": "XOF",
        "use_dynamic_rate": True,
        "tiers": [
            {"min_amount": 0, "max_amount": 10000, "percentage_fee": 2.0, "fixed_fee": 0},
            {"min_amount": 10001, "max_amount": 100000, "percentage_fee": 1.5, "fixed_fee": 0},
            {"min_amount": 100001, "max_amount": None, "percentage_fee": 1.0, "fixed_fee": 0}
        ],
        "partner_share_percent": 30,
        "priority": 5
    },
    {
        "name": "Dépôt Carte Bancaire - Europe",
        "description": "Commission sur dépôts par carte en Europe",
        "zone_id": "europe",
        "transaction_type": "deposit",
        "payment_method": "card",
        "percentage_fee": 2.9,
        "fixed_fee": 0.30,
        "currency": "EUR",
        "use_dynamic_rate": False,
        "partner_share_percent": 0,
        "priority": 5
    },
    # Withdrawals
    {
        "name": "Retrait Mobile Money - Afrique",
        "description": "Commission sur retraits Mobile Money",
        "transaction_type": "withdraw",
        "payment_method": "mobile_money",
        "percentage_fee": 1.0,
        "fixed_fee": 100,
        "currency": "XOF",
        "use_dynamic_rate": True,
        "tiers": [
            {"min_amount": 0, "max_amount": 50000, "percentage_fee": 1.5, "fixed_fee": 100},
            {"min_amount": 50001, "max_amount": 200000, "percentage_fee": 1.0, "fixed_fee": 150},
            {"min_amount": 200001, "max_amount": None, "percentage_fee": 0.8, "fixed_fee": 200}
        ],
        "partner_share_percent": 40,
        "priority": 10
    },
    {
        "name": "Retrait Banque - Europe",
        "description": "Virement bancaire SEPA",
        "zone_id": "europe",
        "transaction_type": "withdraw",
        "payment_method": "bank",
        "percentage_fee": 0,
        "fixed_fee": 1.50,
        "currency": "EUR",
        "use_dynamic_rate": False,
        "partner_share_percent": 0,
        "priority": 5
    },
    # Transfers
    {
        "name": "Transfert P2P - Même pays",
        "description": "Transfert entre utilisateurs même pays",
        "transaction_type": "transfer",
        "payment_method": "internal",
        "percentage_fee": 0.5,
        "fixed_fee": 0,
        "currency": "EUR",
        "use_dynamic_rate": False,
        "partner_share_percent": 0,
        "priority": 20
    },
    {
        "name": "Transfert International",
        "description": "Transfert entre pays différents",
        "transaction_type": "transfer",
        "payment_method": "international",
        "percentage_fee": 3.0,
        "fixed_fee": 2.00,
        "currency": "EUR",
        "use_dynamic_rate": True,
        "tiers": [
            {"min_amount": 0, "max_amount": 100, "percentage_fee": 5.0, "fixed_fee": 2.00},
            {"min_amount": 101, "max_amount": 500, "percentage_fee": 3.5, "fixed_fee": 1.50},
            {"min_amount": 501, "max_amount": 2000, "percentage_fee": 2.5, "fixed_fee": 1.00},
            {"min_amount": 2001, "max_amount": None, "percentage_fee": 1.5, "fixed_fee": 0}
        ],
        "partner_share_percent": 20,
        "priority": 10
    },
    # Card payments
    {
        "name": "Paiement Carte Virtuelle",
        "description": "Commission sur paiements par carte virtuelle",
        "transaction_type": "card_payment",
        "percentage_fee": 2.9,
        "fixed_fee": 0.25,
        "currency": "EUR",
        "use_dynamic_rate": False,
        "partner_share_percent": 0,
        "priority": 10
    },
    # Recharge
    {
        "name": "Recharge Mobile - Afrique",
        "description": "Marge sur recharges téléphoniques",
        "transaction_type": "recharge",
        "percentage_fee": 5.0,
        "fixed_fee": 0,
        "currency": "XOF",
        "use_dynamic_rate": False,
        "partner_share_percent": 50,
        "priority": 10
    }
]


def get_commission_router(db, get_admin_user):
    """Create commission engine router with database dependency"""
    
    # ==================== INITIALIZATION ====================
    
    @router.post("/init")
    async def initialize_commission_rules(admin: dict = Depends(get_admin_user)):
        """Initialize default commission rules"""
        now = datetime.now(timezone.utc).isoformat()
        
        existing = await db.commission_rules.count_documents({})
        if existing > 0:
            return {"message": "Commission rules already initialized", "count": existing}
        
        for rule in DEFAULT_RULES:
            rule_doc = {
                "id": str(uuid.uuid4()),
                **rule,
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
            await db.commission_rules.insert_one(rule_doc)
        
        return {"message": f"Initialized {len(DEFAULT_RULES)} commission rules"}
    
    # ==================== STATISTICS ====================
    
    @router.get("/stats")
    async def get_commission_stats(admin: dict = Depends(get_admin_user)):
        """Get commission statistics"""
        total_rules = await db.commission_rules.count_documents({})
        active_rules = await db.commission_rules.count_documents({"is_active": True})
        
        # By transaction type
        pipeline = [
            {"$group": {"_id": "$transaction_type", "count": {"$sum": 1}}}
        ]
        by_type = await db.commission_rules.aggregate(pipeline).to_list(100)
        
        # Dynamic rate rules
        dynamic_rules = await db.commission_rules.count_documents({"use_dynamic_rate": True})
        
        # Total commissions collected (from transaction history)
        commission_pipeline = [
            {"$match": {"commission_amount": {"$exists": True, "$gt": 0}}},
            {"$group": {
                "_id": "$currency",
                "total": {"$sum": "$commission_amount"},
                "count": {"$sum": 1}
            }}
        ]
        commission_totals = await db.transactions.aggregate(commission_pipeline).to_list(100)
        
        return {
            "total_rules": total_rules,
            "active_rules": active_rules,
            "dynamic_rate_rules": dynamic_rules,
            "by_transaction_type": {item["_id"]: item["count"] for item in by_type},
            "commissions_collected": {item["_id"]: {"total": item["total"], "transactions": item["count"]} for item in commission_totals}
        }
    
    # ==================== RULES CRUD ====================
    
    @router.get("/rules")
    async def get_all_rules(
        transaction_type: str = None,
        country_code: str = None,
        is_active: bool = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Get all commission rules"""
        query = {}
        if transaction_type:
            query["transaction_type"] = transaction_type
        if country_code:
            query["country_code"] = country_code
        if is_active is not None:
            query["is_active"] = is_active
        
        rules = await db.commission_rules.find(query, {"_id": 0}).sort("priority", 1).to_list(500)
        
        if not rules:
            await initialize_commission_rules(admin)
            rules = await db.commission_rules.find(query, {"_id": 0}).sort("priority", 1).to_list(500)
        
        return {"rules": rules, "total": len(rules)}
    
    @router.get("/rules/{rule_id}")
    async def get_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
        """Get a specific rule"""
        rule = await db.commission_rules.find_one({"id": rule_id}, {"_id": 0})
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        return rule
    
    @router.post("/rules")
    async def create_rule(data: CommissionRuleCreate, admin: dict = Depends(get_admin_user)):
        """Create a new commission rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        rule_doc = {
            "id": str(uuid.uuid4()),
            **data.dict(),
            "tiers": [t.dict() if hasattr(t, 'dict') else t for t in (data.tiers or [])],
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("email")
        }
        
        await db.commission_rules.insert_one(rule_doc)
        
        return {"message": "Rule created successfully", "rule_id": rule_doc["id"]}
    
    @router.put("/rules/{rule_id}")
    async def update_rule(rule_id: str, data: CommissionRuleUpdate, admin: dict = Depends(get_admin_user)):
        """Update a commission rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        result = await db.commission_rules.update_one(
            {"id": rule_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": "Rule updated successfully"}
    
    @router.delete("/rules/{rule_id}")
    async def delete_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a commission rule"""
        result = await db.commission_rules.delete_one({"id": rule_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": "Rule deleted successfully"}
    
    @router.put("/rules/{rule_id}/toggle")
    async def toggle_rule(rule_id: str, admin: dict = Depends(get_admin_user)):
        """Toggle rule active status"""
        rule = await db.commission_rules.find_one({"id": rule_id})
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        new_status = not rule.get("is_active", True)
        await db.commission_rules.update_one(
            {"id": rule_id},
            {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": f"Rule {'activated' if new_status else 'deactivated'}", "is_active": new_status}
    
    # ==================== TIERS MANAGEMENT ====================
    
    @router.put("/rules/{rule_id}/tiers")
    async def update_rule_tiers(rule_id: str, tiers: List[dict], admin: dict = Depends(get_admin_user)):
        """Update tiers for a commission rule"""
        now = datetime.now(timezone.utc).isoformat()
        
        result = await db.commission_rules.update_one(
            {"id": rule_id},
            {"$set": {"tiers": tiers, "use_dynamic_rate": len(tiers) > 0, "updated_at": now}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        return {"message": "Tiers updated successfully"}
    
    # ==================== CALCULATION ENGINE ====================
    
    @router.post("/calculate")
    async def calculate_commission(
        amount: float,
        transaction_type: str,
        payment_method: str = None,
        country_code: str = None,
        zone_id: str = None,
        currency: str = "EUR",
        admin: dict = Depends(get_admin_user)
    ):
        """Calculate commission for a transaction (admin preview)"""
        result = await _calculate_commission(
            db, amount, transaction_type, payment_method, country_code, zone_id, currency
        )
        return result
    
    # ==================== PUBLIC CALCULATION (for app) ====================
    
    @router.get("/public/calculate")
    async def public_calculate_commission(
        amount: float,
        transaction_type: str,
        payment_method: str = None,
        country_code: str = None,
        currency: str = "EUR"
    ):
        """Calculate commission for a transaction (public endpoint for app)"""
        result = await _calculate_commission(
            db, amount, transaction_type, payment_method, country_code, None, currency
        )
        return {
            "amount": amount,
            "commission": result["commission_amount"],
            "total": result["total_amount"],
            "currency": currency,
            "breakdown": result["breakdown"]
        }
    
    return router


async def _calculate_commission(db, amount: float, transaction_type: str, payment_method: str = None, 
                                country_code: str = None, zone_id: str = None, currency: str = "EUR"):
    """Internal commission calculation logic"""
    
    # Find applicable rule (priority order: country > zone > global)
    query = {
        "transaction_type": transaction_type,
        "is_active": True
    }
    
    rules = await db.commission_rules.find(query, {"_id": 0}).sort("priority", 1).to_list(100)
    
    # Filter by specificity
    applicable_rule = None
    
    for rule in rules:
        # Check payment method match
        if payment_method and rule.get("payment_method") and rule["payment_method"] != payment_method:
            continue
        
        # Check country match (most specific)
        if country_code and rule.get("country_code") == country_code:
            applicable_rule = rule
            break
        
        # Check zone match
        if zone_id and rule.get("zone_id") == zone_id:
            if not applicable_rule or not applicable_rule.get("country_code"):
                applicable_rule = rule
            continue
        
        # Global rule (no country or zone specified)
        if not rule.get("country_code") and not rule.get("zone_id"):
            if not applicable_rule:
                applicable_rule = rule
    
    if not applicable_rule:
        # Default: no commission
        return {
            "commission_amount": 0,
            "total_amount": amount,
            "rule_applied": None,
            "breakdown": {"percentage": 0, "fixed": 0}
        }
    
    # Calculate commission
    percentage_fee = applicable_rule.get("percentage_fee", 0)
    fixed_fee = applicable_rule.get("fixed_fee", 0)
    
    # Check for dynamic rate (tiers)
    if applicable_rule.get("use_dynamic_rate") and applicable_rule.get("tiers"):
        for tier in applicable_rule["tiers"]:
            min_amt = tier.get("min_amount", 0)
            max_amt = tier.get("max_amount")
            
            if amount >= min_amt and (max_amt is None or amount <= max_amt):
                percentage_fee = tier.get("percentage_fee", percentage_fee)
                fixed_fee = tier.get("fixed_fee", fixed_fee)
                break
    
    # Calculate amounts
    percentage_amount = amount * (percentage_fee / 100)
    commission_amount = percentage_amount + fixed_fee
    total_amount = amount + commission_amount
    
    # Partner share
    partner_share = 0
    if applicable_rule.get("partner_share_percent", 0) > 0:
        partner_share = commission_amount * (applicable_rule["partner_share_percent"] / 100)
    
    return {
        "commission_amount": round(commission_amount, 2),
        "total_amount": round(total_amount, 2),
        "rule_applied": applicable_rule.get("name"),
        "rule_id": applicable_rule.get("id"),
        "breakdown": {
            "percentage_rate": percentage_fee,
            "percentage_amount": round(percentage_amount, 2),
            "fixed_fee": fixed_fee,
            "partner_share": round(partner_share, 2),
            "platform_share": round(commission_amount - partner_share, 2)
        }
    }
