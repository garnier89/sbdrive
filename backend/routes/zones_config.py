"""
Admin routes for managing geographic zones, currencies and services configuration
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/admin/zones-config", tags=["Admin Zones Config"])

# ==================== MODELS ====================

class ZoneServices(BaseModel):
    transfer_p2p: bool = True
    transfer_inter: bool = True
    mobile_money: bool = True
    mobile_recharge: bool = True
    cards: bool = True
    cash_out: bool = True
    bill_payment: bool = True
    merchant_payment: bool = True

class ZoneConfig(BaseModel):
    country: str
    country_code: str
    department: Optional[str] = None
    city: Optional[str] = None
    currency: str
    currency_symbol: str
    additional_currencies: Optional[List[str]] = []
    services: ZoneServices
    notifications_enabled: bool = True
    is_active: bool = True
    timezone: Optional[str] = None
    phone_prefix: Optional[str] = None
    flag_emoji: Optional[str] = None

class UpdateZoneConfig(BaseModel):
    country: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    additional_currencies: Optional[List[str]] = None
    services: Optional[dict] = None
    notifications_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    timezone: Optional[str] = None
    phone_prefix: Optional[str] = None

# Default zones configuration with all countries and DOM-TOM
DEFAULT_ZONES = [
    # France & DOM-TOM
    {
        "country": "France",
        "country_code": "FR",
        "department": "Métropole",
        "currency": "EUR",
        "currency_symbol": "€",
        "additional_currencies": ["USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": False, "mobile_recharge": False, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Europe/Paris",
        "phone_prefix": "+33",
        "flag_emoji": "🇫🇷"
    },
    {
        "country": "France",
        "country_code": "FR",
        "department": "Martinique",
        "currency": "EUR",
        "currency_symbol": "€",
        "additional_currencies": ["USD", "XCD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "America/Martinique",
        "phone_prefix": "+596",
        "flag_emoji": "🇲🇶"
    },
    {
        "country": "France",
        "country_code": "FR",
        "department": "Guadeloupe",
        "currency": "EUR",
        "currency_symbol": "€",
        "additional_currencies": ["USD", "XCD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "America/Guadeloupe",
        "phone_prefix": "+590",
        "flag_emoji": "🇬🇵"
    },
    {
        "country": "France",
        "country_code": "FR",
        "department": "Guyane",
        "currency": "EUR",
        "currency_symbol": "€",
        "additional_currencies": ["USD", "BRL"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "America/Cayenne",
        "phone_prefix": "+594",
        "flag_emoji": "🇬🇫"
    },
    {
        "country": "France",
        "country_code": "FR",
        "department": "Réunion",
        "currency": "EUR",
        "currency_symbol": "€",
        "additional_currencies": ["USD", "MUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Indian/Reunion",
        "phone_prefix": "+262",
        "flag_emoji": "🇷🇪"
    },
    {
        "country": "France",
        "country_code": "FR",
        "department": "Mayotte",
        "currency": "EUR",
        "currency_symbol": "€",
        "additional_currencies": ["USD", "KMF"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Indian/Mayotte",
        "phone_prefix": "+262",
        "flag_emoji": "🇾🇹"
    },
    # Afrique de l'Ouest - Zone CFA (XOF)
    {
        "country": "Sénégal",
        "country_code": "SN",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Dakar",
        "phone_prefix": "+221",
        "flag_emoji": "🇸🇳"
    },
    {
        "country": "Côte d'Ivoire",
        "country_code": "CI",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Abidjan",
        "phone_prefix": "+225",
        "flag_emoji": "🇨🇮"
    },
    {
        "country": "Mali",
        "country_code": "ML",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Bamako",
        "phone_prefix": "+223",
        "flag_emoji": "🇲🇱"
    },
    {
        "country": "Burkina Faso",
        "country_code": "BF",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Ouagadougou",
        "phone_prefix": "+226",
        "flag_emoji": "🇧🇫"
    },
    {
        "country": "Bénin",
        "country_code": "BJ",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Porto-Novo",
        "phone_prefix": "+229",
        "flag_emoji": "🇧🇯"
    },
    {
        "country": "Togo",
        "country_code": "TG",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Lome",
        "phone_prefix": "+228",
        "flag_emoji": "🇹🇬"
    },
    {
        "country": "Niger",
        "country_code": "NE",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Niamey",
        "phone_prefix": "+227",
        "flag_emoji": "🇳🇪"
    },
    {
        "country": "Guinée-Bissau",
        "country_code": "GW",
        "department": None,
        "currency": "XOF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Bissau",
        "phone_prefix": "+245",
        "flag_emoji": "🇬🇼"
    },
    # Afrique Centrale - Zone CFA (XAF)
    {
        "country": "Cameroun",
        "country_code": "CM",
        "department": None,
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Douala",
        "phone_prefix": "+237",
        "flag_emoji": "🇨🇲"
    },
    {
        "country": "Gabon",
        "country_code": "GA",
        "department": None,
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Libreville",
        "phone_prefix": "+241",
        "flag_emoji": "🇬🇦"
    },
    {
        "country": "Congo",
        "country_code": "CG",
        "department": None,
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Brazzaville",
        "phone_prefix": "+242",
        "flag_emoji": "🇨🇬"
    },
    {
        "country": "RD Congo",
        "country_code": "CD",
        "department": None,
        "currency": "CDF",
        "currency_symbol": "FC",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Kinshasa",
        "phone_prefix": "+243",
        "flag_emoji": "🇨🇩"
    },
    {
        "country": "Tchad",
        "country_code": "TD",
        "department": None,
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Ndjamena",
        "phone_prefix": "+235",
        "flag_emoji": "🇹🇩"
    },
    {
        "country": "Centrafrique",
        "country_code": "CF",
        "department": None,
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Bangui",
        "phone_prefix": "+236",
        "flag_emoji": "🇨🇫"
    },
    {
        "country": "Guinée Équatoriale",
        "country_code": "GQ",
        "department": None,
        "currency": "XAF",
        "currency_symbol": "FCFA",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Malabo",
        "phone_prefix": "+240",
        "flag_emoji": "🇬🇶"
    },
    # Afrique de l'Est
    {
        "country": "Kenya",
        "country_code": "KE",
        "department": None,
        "currency": "KES",
        "currency_symbol": "KSh",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Nairobi",
        "phone_prefix": "+254",
        "flag_emoji": "🇰🇪"
    },
    {
        "country": "Tanzanie",
        "country_code": "TZ",
        "department": None,
        "currency": "TZS",
        "currency_symbol": "TSh",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Dar_es_Salaam",
        "phone_prefix": "+255",
        "flag_emoji": "🇹🇿"
    },
    {
        "country": "Ouganda",
        "country_code": "UG",
        "department": None,
        "currency": "UGX",
        "currency_symbol": "USh",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Kampala",
        "phone_prefix": "+256",
        "flag_emoji": "🇺🇬"
    },
    {
        "country": "Rwanda",
        "country_code": "RW",
        "department": None,
        "currency": "RWF",
        "currency_symbol": "FRw",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Kigali",
        "phone_prefix": "+250",
        "flag_emoji": "🇷🇼"
    },
    # Afrique de l'Ouest (autres devises)
    {
        "country": "Ghana",
        "country_code": "GH",
        "department": None,
        "currency": "GHS",
        "currency_symbol": "GH₵",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Accra",
        "phone_prefix": "+233",
        "flag_emoji": "🇬🇭"
    },
    {
        "country": "Nigeria",
        "country_code": "NG",
        "department": None,
        "currency": "NGN",
        "currency_symbol": "₦",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Lagos",
        "phone_prefix": "+234",
        "flag_emoji": "🇳🇬"
    },
    {
        "country": "Guinée",
        "country_code": "GN",
        "department": None,
        "currency": "GNF",
        "currency_symbol": "FG",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Conakry",
        "phone_prefix": "+224",
        "flag_emoji": "🇬🇳"
    },
    # Afrique du Nord
    {
        "country": "Maroc",
        "country_code": "MA",
        "department": None,
        "currency": "MAD",
        "currency_symbol": "DH",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Casablanca",
        "phone_prefix": "+212",
        "flag_emoji": "🇲🇦"
    },
    {
        "country": "Tunisie",
        "country_code": "TN",
        "department": None,
        "currency": "TND",
        "currency_symbol": "DT",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Tunis",
        "phone_prefix": "+216",
        "flag_emoji": "🇹🇳"
    },
    # Afrique Australe
    {
        "country": "Afrique du Sud",
        "country_code": "ZA",
        "department": None,
        "currency": "ZAR",
        "currency_symbol": "R",
        "additional_currencies": ["USD", "EUR"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Africa/Johannesburg",
        "phone_prefix": "+27",
        "flag_emoji": "🇿🇦"
    },
    # Comores
    {
        "country": "Comores",
        "country_code": "KM",
        "department": None,
        "currency": "KMF",
        "currency_symbol": "FC",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Indian/Comoro",
        "phone_prefix": "+269",
        "flag_emoji": "🇰🇲"
    },
    {
        "country": "Madagascar",
        "country_code": "MG",
        "department": None,
        "currency": "MGA",
        "currency_symbol": "Ar",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Indian/Antananarivo",
        "phone_prefix": "+261",
        "flag_emoji": "🇲🇬"
    },
    {
        "country": "Maurice",
        "country_code": "MU",
        "department": None,
        "currency": "MUR",
        "currency_symbol": "Rs",
        "additional_currencies": ["EUR", "USD"],
        "services": {"transfer_p2p": True, "transfer_inter": True, "mobile_money": True, "mobile_recharge": True, "cards": True, "cash_out": True, "bill_payment": True, "merchant_payment": True},
        "notifications_enabled": True,
        "is_active": True,
        "timezone": "Indian/Mauritius",
        "phone_prefix": "+230",
        "flag_emoji": "🇲🇺"
    },
]

def get_zones_config_router(db, get_admin_user):
    """Create zones config admin router with database dependency"""
    
    # ==================== INITIALIZATION ====================
    
    @router.post("/init")
    async def initialize_zones_config(admin: dict = Depends(get_admin_user)):
        """Initialize default zones configuration"""
        now = datetime.now(timezone.utc).isoformat()
        
        existing = await db.zones_config.count_documents({})
        if existing > 0:
            return {"message": "Zones configuration already initialized", "count": existing}
        
        for zone in DEFAULT_ZONES:
            zone_doc = {
                "id": str(uuid.uuid4()),
                **zone,
                "created_at": now,
                "updated_at": now
            }
            await db.zones_config.insert_one(zone_doc)
        
        return {"message": f"Initialized {len(DEFAULT_ZONES)} zones successfully"}
    
    # ==================== STATISTICS ====================
    
    @router.get("/stats")
    async def get_zones_stats(admin: dict = Depends(get_admin_user)):
        """Get zones statistics"""
        total_zones = await db.zones_config.count_documents({})
        active_zones = await db.zones_config.count_documents({"is_active": True})
        
        # Count by currency
        pipeline = [
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}}
        ]
        currency_stats = await db.zones_config.aggregate(pipeline).to_list(100)
        
        # Count by country
        country_pipeline = [
            {"$group": {"_id": "$country", "count": {"$sum": 1}}}
        ]
        country_stats = await db.zones_config.aggregate(country_pipeline).to_list(100)
        
        # Count DOM-TOM
        dom_tom_count = await db.zones_config.count_documents({
            "country": "France",
            "department": {"$ne": "Métropole"}
        })
        
        return {
            "total_zones": total_zones,
            "active_zones": active_zones,
            "inactive_zones": total_zones - active_zones,
            "dom_tom_count": dom_tom_count,
            "currencies": {item["_id"]: item["count"] for item in currency_stats},
            "countries_count": len(country_stats)
        }
    
    # ==================== ZONES CRUD ====================
    
    @router.get("/zones")
    async def get_all_zones(
        country: str = None,
        currency: str = None,
        is_active: bool = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Get all zones with optional filters"""
        query = {}
        if country:
            query["country"] = country
        if currency:
            query["currency"] = currency
        if is_active is not None:
            query["is_active"] = is_active
        
        zones = await db.zones_config.find(query, {"_id": 0}).sort([("country", 1), ("department", 1)]).to_list(500)
        
        if not zones:
            # Auto-initialize if empty
            await initialize_zones_config(admin)
            zones = await db.zones_config.find(query, {"_id": 0}).sort([("country", 1), ("department", 1)]).to_list(500)
        
        return {"zones": zones, "total": len(zones)}
    
    @router.get("/zones/{zone_id}")
    async def get_zone(zone_id: str, admin: dict = Depends(get_admin_user)):
        """Get a specific zone"""
        zone = await db.zones_config.find_one({"id": zone_id}, {"_id": 0})
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        return zone
    
    @router.post("/zones")
    async def create_zone(data: ZoneConfig, admin: dict = Depends(get_admin_user)):
        """Create a new zone"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check for duplicate
        existing = await db.zones_config.find_one({
            "country": data.country,
            "department": data.department,
            "city": data.city
        })
        if existing:
            raise HTTPException(status_code=400, detail="Zone already exists")
        
        zone_doc = {
            "id": str(uuid.uuid4()),
            **data.dict(),
            "services": data.services.dict(),
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("email", "admin")
        }
        
        await db.zones_config.insert_one(zone_doc)
        
        return {"message": "Zone created successfully", "zone_id": zone_doc["id"]}
    
    @router.put("/zones/{zone_id}")
    async def update_zone(zone_id: str, data: UpdateZoneConfig, admin: dict = Depends(get_admin_user)):
        """Update a zone"""
        now = datetime.now(timezone.utc).isoformat()
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        result = await db.zones_config.update_one(
            {"id": zone_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        return {"message": "Zone updated successfully"}
    
    @router.delete("/zones/{zone_id}")
    async def delete_zone(zone_id: str, admin: dict = Depends(get_admin_user)):
        """Delete a zone"""
        result = await db.zones_config.delete_one({"id": zone_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        return {"message": "Zone deleted successfully"}
    
    # ==================== SERVICE TOGGLE ====================
    
    @router.put("/zones/{zone_id}/services")
    async def update_zone_services(zone_id: str, services: dict, admin: dict = Depends(get_admin_user)):
        """Update services for a zone"""
        now = datetime.now(timezone.utc).isoformat()
        
        result = await db.zones_config.update_one(
            {"id": zone_id},
            {"$set": {"services": services, "updated_at": now}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        return {"message": "Services updated successfully"}
    
    @router.put("/zones/{zone_id}/toggle")
    async def toggle_zone_status(zone_id: str, admin: dict = Depends(get_admin_user)):
        """Toggle zone active status"""
        now = datetime.now(timezone.utc).isoformat()
        
        zone = await db.zones_config.find_one({"id": zone_id})
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        
        new_status = not zone.get("is_active", True)
        
        await db.zones_config.update_one(
            {"id": zone_id},
            {"$set": {"is_active": new_status, "updated_at": now}}
        )
        
        return {"message": f"Zone {'activated' if new_status else 'deactivated'}", "is_active": new_status}
    
    # ==================== BULK OPERATIONS ====================
    
    @router.put("/bulk/toggle-service")
    async def bulk_toggle_service(
        service_name: str,
        enabled: bool,
        country: str = None,
        currency: str = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Toggle a service for multiple zones"""
        now = datetime.now(timezone.utc).isoformat()
        
        query = {}
        if country:
            query["country"] = country
        if currency:
            query["currency"] = currency
        
        result = await db.zones_config.update_many(
            query,
            {"$set": {f"services.{service_name}": enabled, "updated_at": now}}
        )
        
        return {"message": f"Updated {result.modified_count} zones"}
    
    # ==================== CURRENCIES ====================
    
    @router.get("/currencies")
    async def get_available_currencies(admin: dict = Depends(get_admin_user)):
        """Get all unique currencies"""
        pipeline = [
            {"$group": {"_id": "$currency", "symbol": {"$first": "$currency_symbol"}, "count": {"$sum": 1}}}
        ]
        currencies = await db.zones_config.aggregate(pipeline).to_list(100)
        
        return {"currencies": [{"code": c["_id"], "symbol": c["symbol"], "zones_count": c["count"]} for c in currencies]}
    
    # ==================== COUNTRIES ====================
    
    @router.get("/countries")
    async def get_available_countries(admin: dict = Depends(get_admin_user)):
        """Get all unique countries with their departments"""
        pipeline = [
            {"$group": {
                "_id": "$country",
                "country_code": {"$first": "$country_code"},
                "flag_emoji": {"$first": "$flag_emoji"},
                "departments": {"$addToSet": "$department"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        countries = await db.zones_config.aggregate(pipeline).to_list(100)
        
        return {"countries": [{
            "name": c["_id"],
            "code": c["country_code"],
            "flag": c["flag_emoji"],
            "departments": [d for d in c["departments"] if d],
            "zones_count": c["count"]
        } for c in countries]}
    
    # ==================== PUBLIC API (for app) ====================
    
    @router.get("/public/zone")
    async def get_zone_for_user(country_code: str, department: str = None):
        """Get zone configuration for a user (public endpoint)"""
        query = {"country_code": country_code, "is_active": True}
        if department:
            query["department"] = department
        
        zone = await db.zones_config.find_one(query, {"_id": 0})
        
        if not zone:
            # Fallback to country without department
            zone = await db.zones_config.find_one(
                {"country_code": country_code, "department": None, "is_active": True},
                {"_id": 0}
            )
        
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not configured")
        
        return {
            "country": zone["country"],
            "department": zone.get("department"),
            "currency": zone["currency"],
            "currency_symbol": zone["currency_symbol"],
            "services": zone["services"],
            "phone_prefix": zone.get("phone_prefix")
        }
    
    return router
