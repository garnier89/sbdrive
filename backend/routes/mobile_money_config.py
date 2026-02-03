# Module de gestion Mobile Money SBPAYGO
# Gestion des pays, opérateurs et services Mobile Money en Afrique

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

mobile_money_config_router = APIRouter(prefix="/mobile-money-config", tags=["Mobile Money Config"])

# Database reference - will be set during setup
db = None

# ==================== MODELS ====================

class ServiceConfig(BaseModel):
    transfer_p2p: bool = True
    transfer_inter: bool = True
    mobile_recharge: bool = True
    cash_out: bool = True
    merchant_payment: bool = False
    bill_payment: bool = False

class OperatorConfig(BaseModel):
    name: str
    code: str
    logo_url: Optional[str] = None
    active: bool = True
    services: ServiceConfig = ServiceConfig()
    ussd_code: Optional[str] = None
    api_provider: Optional[str] = None  # 'direct', 'mfs_africa', 'flutterwave', 'demo'
    fees_percent: float = 1.5
    min_amount: float = 100
    max_amount: float = 5000000

class CountryConfig(BaseModel):
    name: str
    code: str  # ISO 3166-1 alpha-2
    flag_emoji: str
    currency: str
    currency_symbol: str
    active: bool = True
    operators: List[OperatorConfig] = []
    phone_prefix: str
    phone_format: str = "+XXX XX XXX XX XX"

class CountryCreate(BaseModel):
    name: str
    code: str
    flag_emoji: str
    currency: str
    currency_symbol: str
    phone_prefix: str
    phone_format: Optional[str] = None

class OperatorCreate(BaseModel):
    country_code: str
    name: str
    code: str
    logo_url: Optional[str] = None
    ussd_code: Optional[str] = None
    api_provider: str = "demo"
    fees_percent: float = 1.5
    min_amount: float = 100
    max_amount: float = 5000000

class ServiceToggle(BaseModel):
    country_code: str
    operator_code: str
    service: str  # transfer_p2p, transfer_inter, mobile_recharge, cash_out, merchant_payment, bill_payment
    active: bool

class OperatorToggle(BaseModel):
    country_code: str
    operator_code: str
    active: bool

class CountryToggle(BaseModel):
    country_code: str
    active: bool

# ==================== DEFAULT DATA ====================

DEFAULT_AFRICAN_COUNTRIES = [
    {
        "name": "Côte d'Ivoire",
        "code": "CI",
        "flag_emoji": "🇨🇮",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+225",
        "phone_format": "+225 XX XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "Orange Money", "code": "orange_ci", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "MTN MoMo", "code": "mtn_ci", "ussd_code": "*133#", "api_provider": "demo", "fees_percent": 1.5},
            {"name": "Moov Money", "code": "moov_ci", "ussd_code": "*155#", "api_provider": "demo", "fees_percent": 1.2},
            {"name": "Wave", "code": "wave_ci", "ussd_code": None, "api_provider": "demo", "fees_percent": 0.0}
        ]
    },
    {
        "name": "Sénégal",
        "code": "SN",
        "flag_emoji": "🇸🇳",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+221",
        "phone_format": "+221 XX XXX XX XX",
        "active": True,
        "operators": [
            {"name": "Orange Money", "code": "orange_sn", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Free Money", "code": "free_sn", "ussd_code": "*555#", "api_provider": "demo", "fees_percent": 0.5},
            {"name": "Wave", "code": "wave_sn", "ussd_code": None, "api_provider": "demo", "fees_percent": 0.0},
            {"name": "Wizall", "code": "wizall_sn", "ussd_code": "*707#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Kenya",
        "code": "KE",
        "flag_emoji": "🇰🇪",
        "currency": "KES",
        "currency_symbol": "KSh",
        "phone_prefix": "+254",
        "phone_format": "+254 XXX XXX XXX",
        "active": True,
        "operators": [
            {"name": "M-PESA", "code": "mpesa_ke", "ussd_code": "*334#", "api_provider": "demo", "fees_percent": 0.5},
            {"name": "Airtel Money", "code": "airtel_ke", "ussd_code": "*334#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Ghana",
        "code": "GH",
        "flag_emoji": "🇬🇭",
        "currency": "GHS",
        "currency_symbol": "₵",
        "phone_prefix": "+233",
        "phone_format": "+233 XX XXX XXXX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_gh", "ussd_code": "*170#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Vodafone Cash", "code": "vodafone_gh", "ussd_code": "*110#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "AirtelTigo Money", "code": "airteltigo_gh", "ussd_code": "*500#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Cameroun",
        "code": "CM",
        "flag_emoji": "🇨🇲",
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "phone_prefix": "+237",
        "phone_format": "+237 X XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_cm", "ussd_code": "*126#", "api_provider": "demo", "fees_percent": 1.5},
            {"name": "Orange Money", "code": "orange_cm", "ussd_code": "#150#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Burkina Faso",
        "code": "BF",
        "flag_emoji": "🇧🇫",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+226",
        "phone_format": "+226 XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "Orange Money", "code": "orange_bf", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Moov Money", "code": "moov_bf", "ussd_code": "*555#", "api_provider": "demo", "fees_percent": 1.2},
            {"name": "Wizall", "code": "wizall_bf", "ussd_code": "*707#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Mali",
        "code": "ML",
        "flag_emoji": "🇲🇱",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+223",
        "phone_format": "+223 XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "Orange Money", "code": "orange_ml", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Moov Money", "code": "moov_ml", "ussd_code": "*555#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Bénin",
        "code": "BJ",
        "flag_emoji": "🇧🇯",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+229",
        "phone_format": "+229 XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_bj", "ussd_code": "*880#", "api_provider": "demo", "fees_percent": 1.5},
            {"name": "Moov Money", "code": "moov_bj", "ussd_code": "*555#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Togo",
        "code": "TG",
        "flag_emoji": "🇹🇬",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+228",
        "phone_format": "+228 XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "Moov Money", "code": "moov_tg", "ussd_code": "*555#", "api_provider": "demo", "fees_percent": 1.2},
            {"name": "Togocel T-Money", "code": "tmoney_tg", "ussd_code": "*145#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Niger",
        "code": "NE",
        "flag_emoji": "🇳🇪",
        "currency": "XOF",
        "currency_symbol": "CFA",
        "phone_prefix": "+227",
        "phone_format": "+227 XX XX XX XX",
        "active": True,
        "operators": [
            {"name": "Airtel Money", "code": "airtel_ne", "ussd_code": "*444#", "api_provider": "demo", "fees_percent": 1.5},
            {"name": "Moov Money", "code": "moov_ne", "ussd_code": "*555#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Guinée",
        "code": "GN",
        "flag_emoji": "🇬🇳",
        "currency": "GNF",
        "currency_symbol": "FG",
        "phone_prefix": "+224",
        "phone_format": "+224 XXX XX XX XX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_gn", "ussd_code": "*126#", "api_provider": "demo", "fees_percent": 1.5},
            {"name": "Orange Money", "code": "orange_gn", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Ouganda",
        "code": "UG",
        "flag_emoji": "🇺🇬",
        "currency": "UGX",
        "currency_symbol": "USh",
        "phone_prefix": "+256",
        "phone_format": "+256 XXX XXX XXX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_ug", "ussd_code": "*165#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Airtel Money", "code": "airtel_ug", "ussd_code": "*185#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Rwanda",
        "code": "RW",
        "flag_emoji": "🇷🇼",
        "currency": "RWF",
        "currency_symbol": "FRw",
        "phone_prefix": "+250",
        "phone_format": "+250 XXX XXX XXX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_rw", "ussd_code": "*182#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Airtel Money", "code": "airtel_rw", "ussd_code": "*182#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Tanzanie",
        "code": "TZ",
        "flag_emoji": "🇹🇿",
        "currency": "TZS",
        "currency_symbol": "TSh",
        "phone_prefix": "+255",
        "phone_format": "+255 XXX XXX XXX",
        "active": True,
        "operators": [
            {"name": "M-PESA", "code": "mpesa_tz", "ussd_code": "*150*00#", "api_provider": "demo", "fees_percent": 0.5},
            {"name": "Airtel Money", "code": "airtel_tz", "ussd_code": "*150*60#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Tigo Pesa", "code": "tigo_tz", "ussd_code": "*150*01#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "RD Congo",
        "code": "CD",
        "flag_emoji": "🇨🇩",
        "currency": "CDF",
        "currency_symbol": "FC",
        "phone_prefix": "+243",
        "phone_format": "+243 XXX XXX XXX",
        "active": True,
        "operators": [
            {"name": "M-PESA", "code": "mpesa_cd", "ussd_code": "*151#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Airtel Money", "code": "airtel_cd", "ussd_code": "*501#", "api_provider": "demo", "fees_percent": 1.2},
            {"name": "Orange Money", "code": "orange_cd", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Congo Brazzaville",
        "code": "CG",
        "flag_emoji": "🇨🇬",
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "phone_prefix": "+242",
        "phone_format": "+242 XX XXX XXXX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_cg", "ussd_code": "*126#", "api_provider": "demo", "fees_percent": 1.5},
            {"name": "Airtel Money", "code": "airtel_cg", "ussd_code": "*144#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Zambie",
        "code": "ZM",
        "flag_emoji": "🇿🇲",
        "currency": "ZMW",
        "currency_symbol": "ZK",
        "phone_prefix": "+260",
        "phone_format": "+260 XXX XXX XXX",
        "active": True,
        "operators": [
            {"name": "MTN MoMo", "code": "mtn_zm", "ussd_code": "*303#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Airtel Money", "code": "airtel_zm", "ussd_code": "*778#", "api_provider": "demo", "fees_percent": 1.2},
            {"name": "Zeepay", "code": "zeepay_zm", "ussd_code": None, "api_provider": "demo", "fees_percent": 0.8}
        ]
    },
    {
        "name": "Zimbabwe",
        "code": "ZW",
        "flag_emoji": "🇿🇼",
        "currency": "USD",
        "currency_symbol": "$",
        "phone_prefix": "+263",
        "phone_format": "+263 XX XXX XXXX",
        "active": True,
        "operators": [
            {"name": "EcoCash", "code": "ecocash_zw", "ussd_code": "*151#", "api_provider": "demo", "fees_percent": 2.0}
        ]
    },
    {
        "name": "Botswana",
        "code": "BW",
        "flag_emoji": "🇧🇼",
        "currency": "BWP",
        "currency_symbol": "P",
        "phone_prefix": "+267",
        "phone_format": "+267 XX XXX XXX",
        "active": True,
        "operators": [
            {"name": "Orange Money", "code": "orange_bw", "ussd_code": "*145#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Mascom MyZaka", "code": "myzaka_bw", "ussd_code": "*167#", "api_provider": "demo", "fees_percent": 1.2}
        ]
    },
    {
        "name": "Nigéria",
        "code": "NG",
        "flag_emoji": "🇳🇬",
        "currency": "NGN",
        "currency_symbol": "₦",
        "phone_prefix": "+234",
        "phone_format": "+234 XXX XXX XXXX",
        "active": True,
        "operators": [
            {"name": "OPay", "code": "opay_ng", "ussd_code": "*955#", "api_provider": "demo", "fees_percent": 0.5},
            {"name": "PalmPay", "code": "palmpay_ng", "ussd_code": None, "api_provider": "demo", "fees_percent": 0.5},
            {"name": "Paga", "code": "paga_ng", "ussd_code": "*242#", "api_provider": "demo", "fees_percent": 1.0}
        ]
    },
    {
        "name": "Éthiopie",
        "code": "ET",
        "flag_emoji": "🇪🇹",
        "currency": "ETB",
        "currency_symbol": "Br",
        "phone_prefix": "+251",
        "phone_format": "+251 XX XXX XXXX",
        "active": True,
        "operators": [
            {"name": "M-PESA", "code": "mpesa_et", "ussd_code": "*858#", "api_provider": "demo", "fees_percent": 1.0},
            {"name": "Telebirr", "code": "telebirr_et", "ussd_code": "*127#", "api_provider": "demo", "fees_percent": 0.5}
        ]
    }
]

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

async def get_current_admin_user(request):
    """Get current authenticated admin user"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        import jwt
        payload = jwt.decode(token, "sbpaygo_secret_key", algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id})
        if not user or user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== API ROUTES ====================

@mobile_money_config_router.get("/countries")
async def get_all_countries():
    """Get all Mobile Money countries configuration"""
    countries = await db.mobile_money_countries.find().to_list(100)
    return [serialize_doc(c) for c in countries]

@mobile_money_config_router.get("/countries/active")
async def get_active_countries():
    """Get only active countries with active operators"""
    countries = await db.mobile_money_countries.find({"active": True}).to_list(100)
    result = []
    for country in countries:
        country = serialize_doc(country)
        # Filter only active operators
        country["operators"] = [op for op in country.get("operators", []) if op.get("active", True)]
        if country["operators"]:  # Only include if has active operators
            result.append(country)
    return result

@mobile_money_config_router.get("/countries/{country_code}")
async def get_country(country_code: str):
    """Get specific country configuration"""
    country = await db.mobile_money_countries.find_one({"code": country_code.upper()})
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return serialize_doc(country)

@mobile_money_config_router.post("/countries/toggle")
async def toggle_country(data: CountryToggle):
    """Toggle country active status (Admin only)"""
    result = await db.mobile_money_countries.update_one(
        {"code": data.country_code.upper()},
        {"$set": {"active": data.active, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Country not found")
    return {"success": True, "message": f"Country {data.country_code} {'activated' if data.active else 'deactivated'}"}

@mobile_money_config_router.post("/operators/toggle")
async def toggle_operator(data: OperatorToggle):
    """Toggle operator active status (Admin only)"""
    result = await db.mobile_money_countries.update_one(
        {"code": data.country_code.upper(), "operators.code": data.operator_code},
        {"$set": {"operators.$.active": data.active, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Country or operator not found")
    return {"success": True, "message": f"Operator {data.operator_code} {'activated' if data.active else 'deactivated'}"}

@mobile_money_config_router.post("/services/toggle")
async def toggle_service(data: ServiceToggle):
    """Toggle specific service for an operator (Admin only)"""
    service_field = f"operators.$.services.{data.service}"
    result = await db.mobile_money_countries.update_one(
        {"code": data.country_code.upper(), "operators.code": data.operator_code},
        {"$set": {service_field: data.active, "updated_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Country, operator, or service not found")
    return {"success": True, "message": f"Service {data.service} {'enabled' if data.active else 'disabled'} for {data.operator_code}"}

@mobile_money_config_router.post("/countries")
async def add_country(data: CountryCreate):
    """Add a new country (Admin only)"""
    existing = await db.mobile_money_countries.find_one({"code": data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Country already exists")
    
    country_doc = {
        "name": data.name,
        "code": data.code.upper(),
        "flag_emoji": data.flag_emoji,
        "currency": data.currency,
        "currency_symbol": data.currency_symbol,
        "phone_prefix": data.phone_prefix,
        "phone_format": data.phone_format or f"{data.phone_prefix} XX XXX XX XX",
        "active": True,
        "operators": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.mobile_money_countries.insert_one(country_doc)
    return {"success": True, "message": f"Country {data.name} added"}

@mobile_money_config_router.post("/operators")
async def add_operator(data: OperatorCreate):
    """Add a new operator to a country (Admin only)"""
    country = await db.mobile_money_countries.find_one({"code": data.country_code.upper()})
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    # Check if operator already exists
    for op in country.get("operators", []):
        if op["code"] == data.code:
            raise HTTPException(status_code=400, detail="Operator already exists in this country")
    
    operator_doc = {
        "name": data.name,
        "code": data.code,
        "logo_url": data.logo_url,
        "ussd_code": data.ussd_code,
        "api_provider": data.api_provider,
        "fees_percent": data.fees_percent,
        "min_amount": data.min_amount,
        "max_amount": data.max_amount,
        "active": True,
        "services": {
            "transfer_p2p": True,
            "transfer_inter": True,
            "mobile_recharge": True,
            "cash_out": True,
            "merchant_payment": False,
            "bill_payment": False
        }
    }
    
    await db.mobile_money_countries.update_one(
        {"code": data.country_code.upper()},
        {"$push": {"operators": operator_doc}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return {"success": True, "message": f"Operator {data.name} added to {data.country_code}"}

@mobile_money_config_router.delete("/operators/{country_code}/{operator_code}")
async def delete_operator(country_code: str, operator_code: str):
    """Delete an operator from a country (Admin only)"""
    result = await db.mobile_money_countries.update_one(
        {"code": country_code.upper()},
        {"$pull": {"operators": {"code": operator_code}}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Country or operator not found")
    return {"success": True, "message": f"Operator {operator_code} removed"}

@mobile_money_config_router.get("/stats")
async def get_stats():
    """Get Mobile Money configuration statistics"""
    countries = await db.mobile_money_countries.find().to_list(100)
    
    total_countries = len(countries)
    active_countries = sum(1 for c in countries if c.get("active", True))
    total_operators = sum(len(c.get("operators", [])) for c in countries)
    active_operators = sum(
        sum(1 for op in c.get("operators", []) if op.get("active", True))
        for c in countries if c.get("active", True)
    )
    
    # Count services enabled
    services_count = {
        "transfer_p2p": 0,
        "transfer_inter": 0,
        "mobile_recharge": 0,
        "cash_out": 0,
        "merchant_payment": 0,
        "bill_payment": 0
    }
    
    for country in countries:
        if country.get("active", True):
            for op in country.get("operators", []):
                if op.get("active", True):
                    services = op.get("services", {})
                    for service, enabled in services.items():
                        if enabled and service in services_count:
                            services_count[service] += 1
    
    return {
        "total_countries": total_countries,
        "active_countries": active_countries,
        "total_operators": total_operators,
        "active_operators": active_operators,
        "services_enabled": services_count
    }

@mobile_money_config_router.post("/init")
async def initialize_default_data():
    """Initialize default Mobile Money countries data"""
    existing = await db.mobile_money_countries.count_documents({})
    if existing > 0:
        return {"success": True, "message": "Data already initialized", "count": existing}
    
    now = datetime.now(timezone.utc)
    
    for country_data in DEFAULT_AFRICAN_COUNTRIES:
        operators = []
        for op in country_data.get("operators", []):
            operators.append({
                "name": op["name"],
                "code": op["code"],
                "logo_url": op.get("logo_url"),
                "ussd_code": op.get("ussd_code"),
                "api_provider": op.get("api_provider", "demo"),
                "fees_percent": op.get("fees_percent", 1.5),
                "min_amount": op.get("min_amount", 100),
                "max_amount": op.get("max_amount", 5000000),
                "active": True,
                "services": {
                    "transfer_p2p": True,
                    "transfer_inter": True,
                    "mobile_recharge": True,
                    "cash_out": True,
                    "merchant_payment": False,
                    "bill_payment": False
                }
            })
        
        country_doc = {
            "name": country_data["name"],
            "code": country_data["code"],
            "flag_emoji": country_data["flag_emoji"],
            "currency": country_data["currency"],
            "currency_symbol": country_data["currency_symbol"],
            "phone_prefix": country_data["phone_prefix"],
            "phone_format": country_data.get("phone_format", ""),
            "active": country_data.get("active", True),
            "operators": operators,
            "created_at": now,
            "updated_at": now
        }
        
        await db.mobile_money_countries.insert_one(country_doc)
    
    return {"success": True, "message": f"Initialized {len(DEFAULT_AFRICAN_COUNTRIES)} countries"}

# ==================== SETUP FUNCTION ====================

def setup_mobile_money_config_routes(app_db):
    """Setup Mobile Money config routes with database"""
    global db
    db = app_db
    return mobile_money_config_router
