# Module Localisation des Agents SBPAYGO
# Carte interactive pour trouver les agents partenaires

from fastapi import APIRouter, HTTPException, Header, Query
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import math

agent_locator_router = APIRouter(prefix="/api/agents", tags=["Agent Locator"])

# Services disponibles chez les agents
AGENT_SERVICES = {
    "cash_withdrawal": {"name": "Retrait Cash", "icon": "banknote", "color": "#22c55e"},
    "deposit": {"name": "Dépôt", "icon": "arrow-down-circle", "color": "#3b82f6"},
    "mobile_money": {"name": "Mobile Money", "icon": "smartphone", "color": "#f97316"},
    "airtime": {"name": "Crédit Téléphone", "icon": "phone", "color": "#8b5cf6"},
    "bill_payment": {"name": "Paiement Factures", "icon": "zap", "color": "#eab308"},
    "transfer": {"name": "Transfert", "icon": "send", "color": "#06b6d4"}
}

# Liste des 21 pays africains avec Mobile Money + France
AFRICAN_COUNTRIES = {
    "SN": {"name": "Sénégal", "currency": "XOF", "center": [14.4974, -14.4524]},
    "CI": {"name": "Côte d'Ivoire", "currency": "XOF", "center": [7.5400, -5.5471]},
    "ML": {"name": "Mali", "currency": "XOF", "center": [17.5707, -3.9962]},
    "BF": {"name": "Burkina Faso", "currency": "XOF", "center": [12.2383, -1.5616]},
    "BJ": {"name": "Bénin", "currency": "XOF", "center": [9.3077, 2.3158]},
    "TG": {"name": "Togo", "currency": "XOF", "center": [8.6195, 0.8248]},
    "NE": {"name": "Niger", "currency": "XOF", "center": [17.6078, 8.0817]},
    "GN": {"name": "Guinée", "currency": "GNF", "center": [9.9456, -9.6966]},
    "CM": {"name": "Cameroun", "currency": "XAF", "center": [7.3697, 12.3547]},
    "GA": {"name": "Gabon", "currency": "XAF", "center": [-0.8037, 11.6094]},
    "CG": {"name": "Congo-Brazzaville", "currency": "XAF", "center": [-0.2280, 15.8277]},
    "CD": {"name": "RD Congo", "currency": "CDF", "center": [-4.0383, 21.7587]},
    "GH": {"name": "Ghana", "currency": "GHS", "center": [7.9465, -1.0232]},
    "NG": {"name": "Nigeria", "currency": "NGN", "center": [9.0820, 8.6753]},
    "KE": {"name": "Kenya", "currency": "KES", "center": [-0.0236, 37.9062]},
    "TZ": {"name": "Tanzanie", "currency": "TZS", "center": [-6.3690, 34.8888]},
    "UG": {"name": "Ouganda", "currency": "UGX", "center": [1.3733, 32.2903]},
    "RW": {"name": "Rwanda", "currency": "RWF", "center": [-1.9403, 29.8739]},
    "ZM": {"name": "Zambie", "currency": "ZMW", "center": [-13.1339, 27.8493]},
    "ZW": {"name": "Zimbabwe", "currency": "ZWL", "center": [-19.0154, 29.1549]},
    "MA": {"name": "Maroc", "currency": "MAD", "center": [31.7917, -7.0926]},
    "FR": {"name": "France", "currency": "EUR", "center": [46.2276, 2.2137]}
}

class AgentCreate(BaseModel):
    business_name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    address: str
    city: str
    country: str
    latitude: float
    longitude: float
    services: List[str]
    opening_hours: Optional[dict] = None

class AgentUpdate(BaseModel):
    business_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    services: Optional[List[str]] = None
    is_active: Optional[bool] = None
    opening_hours: Optional[dict] = None

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers"""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def setup_agent_locator_routes(db, jwt_secret, jwt_algorithm):
    """Setup agent locator routes with database access"""

    async def get_current_user(authorization: str):
        """Get current authenticated user"""
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required")
        token = authorization.split(" ")[1]
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
            user_id = payload.get("sub")
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except:
            raise HTTPException(status_code=401, detail="Invalid token")

    async def get_admin_user(authorization: str):
        """Get current authenticated admin"""
        user = await get_current_user(authorization)
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user

    # ==================== PUBLIC ROUTES ====================

    @agent_locator_router.get("/services")
    async def get_agent_services():
        """Get list of available agent services"""
        return {"services": AGENT_SERVICES}

    @agent_locator_router.get("/countries")
    async def get_countries():
        """Get list of supported countries"""
        return {"countries": AFRICAN_COUNTRIES}

    @agent_locator_router.get("/search")
    async def search_agents(
        latitude: float = Query(..., description="User latitude"),
        longitude: float = Query(..., description="User longitude"),
        radius: float = Query(10, description="Search radius in km"),
        country: Optional[str] = Query(None, description="Filter by country code"),
        city: Optional[str] = Query(None, description="Filter by city"),
        service: Optional[str] = Query(None, description="Filter by service"),
        limit: int = Query(50, description="Max results"),
        authorization: str = Header(None)
    ):
        """Search for nearby agents"""
        # Build query
        query = {"is_active": True, "status": "active"}
        
        if country:
            query["country"] = country.upper()
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        if service:
            query["services"] = service
        
        # Get all agents matching filters
        agents = await db.partner_agents.find(
            query,
            {"_id": 0, "password_hash": 0}
        ).to_list(500)
        
        # Calculate distances and filter by radius
        nearby_agents = []
        for agent in agents:
            agent_lat = agent.get("latitude", 0)
            agent_lon = agent.get("longitude", 0)
            
            if agent_lat and agent_lon:
                distance = haversine_distance(latitude, longitude, agent_lat, agent_lon)
                if distance <= radius:
                    agent["distance"] = round(distance, 2)
                    nearby_agents.append(agent)
        
        # Sort by distance
        nearby_agents.sort(key=lambda x: x.get("distance", 999))
        
        # Limit results
        nearby_agents = nearby_agents[:limit]
        
        return {
            "agents": nearby_agents,
            "total": len(nearby_agents),
            "search_center": {"latitude": latitude, "longitude": longitude},
            "radius": radius
        }

    @agent_locator_router.get("/by-country/{country_code}")
    async def get_agents_by_country(
        country_code: str,
        city: Optional[str] = None,
        service: Optional[str] = None,
        limit: int = 100,
        authorization: str = Header(None)
    ):
        """Get agents in a specific country"""
        query = {"country": country_code.upper(), "is_active": True, "status": "active"}
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        if service:
            query["services"] = service
        
        agents = await db.partner_agents.find(
            query,
            {"_id": 0, "password_hash": 0}
        ).limit(limit).to_list(limit)
        
        # Get unique cities for filtering
        cities = list(set([a.get("city", "") for a in agents if a.get("city")]))
        
        return {
            "agents": agents,
            "total": len(agents),
            "country": AFRICAN_COUNTRIES.get(country_code.upper(), {"name": country_code}),
            "cities": sorted(cities)
        }

    @agent_locator_router.get("/{agent_id}")
    async def get_agent_details(
        agent_id: str,
        authorization: str = Header(None)
    ):
        """Get details of a specific agent"""
        agent = await db.partner_agents.find_one(
            {"id": agent_id, "is_active": True},
            {"_id": 0, "password_hash": 0}
        )
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent non trouvé")
        
        # Enrich with service details
        agent_services = []
        for service_code in agent.get("services", []):
            if service_code in AGENT_SERVICES:
                agent_services.append({
                    "code": service_code,
                    **AGENT_SERVICES[service_code]
                })
        agent["services_details"] = agent_services
        
        return agent

    # ==================== ADMIN ROUTES ====================

    @agent_locator_router.post("/admin/create")
    async def admin_create_agent(
        agent_data: AgentCreate,
        authorization: str = Header(None)
    ):
        """Admin: Create a new agent location"""
        admin = await get_admin_user(authorization)
        
        # Validate services
        for service in agent_data.services:
            if service not in AGENT_SERVICES:
                raise HTTPException(status_code=400, detail=f"Service invalide: {service}")
        
        # Validate country
        if agent_data.country.upper() not in AFRICAN_COUNTRIES:
            raise HTTPException(status_code=400, detail="Pays non supporté")
        
        now = datetime.now(timezone.utc)
        agent_id = str(uuid.uuid4())
        
        # Check if linked to existing partner
        existing_partner = await db.partners.find_one({"phone": agent_data.phone})
        
        agent = {
            "id": agent_id,
            "partner_id": existing_partner["id"] if existing_partner else None,
            "business_name": agent_data.business_name,
            "owner_name": agent_data.owner_name,
            "phone": agent_data.phone,
            "email": agent_data.email,
            "address": agent_data.address,
            "city": agent_data.city,
            "country": agent_data.country.upper(),
            "latitude": agent_data.latitude,
            "longitude": agent_data.longitude,
            "services": agent_data.services,
            "opening_hours": agent_data.opening_hours or {
                "monday": "08:00-18:00",
                "tuesday": "08:00-18:00",
                "wednesday": "08:00-18:00",
                "thursday": "08:00-18:00",
                "friday": "08:00-18:00",
                "saturday": "08:00-14:00",
                "sunday": "closed"
            },
            "is_active": True,
            "status": "active",
            "rating": 0,
            "total_reviews": 0,
            "total_transactions": 0,
            "created_by": admin["id"],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await db.partner_agents.insert_one(agent)
        
        return {
            "message": "Agent créé avec succès",
            "agent_id": agent_id,
            "agent": {k: v for k, v in agent.items() if k != "_id"}
        }

    @agent_locator_router.put("/admin/{agent_id}")
    async def admin_update_agent(
        agent_id: str,
        agent_data: AgentUpdate,
        authorization: str = Header(None)
    ):
        """Admin: Update an agent"""
        admin = await get_admin_user(authorization)
        
        agent = await db.partner_agents.find_one({"id": agent_id})
        if not agent:
            raise HTTPException(status_code=404, detail="Agent non trouvé")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if agent_data.business_name is not None:
            update_data["business_name"] = agent_data.business_name
        if agent_data.phone is not None:
            update_data["phone"] = agent_data.phone
        if agent_data.address is not None:
            update_data["address"] = agent_data.address
        if agent_data.city is not None:
            update_data["city"] = agent_data.city
        if agent_data.latitude is not None:
            update_data["latitude"] = agent_data.latitude
        if agent_data.longitude is not None:
            update_data["longitude"] = agent_data.longitude
        if agent_data.services is not None:
            for service in agent_data.services:
                if service not in AGENT_SERVICES:
                    raise HTTPException(status_code=400, detail=f"Service invalide: {service}")
            update_data["services"] = agent_data.services
        if agent_data.is_active is not None:
            update_data["is_active"] = agent_data.is_active
        if agent_data.opening_hours is not None:
            update_data["opening_hours"] = agent_data.opening_hours
        
        await db.partner_agents.update_one({"id": agent_id}, {"$set": update_data})
        
        return {"message": "Agent mis à jour", "updated_fields": list(update_data.keys())}

    @agent_locator_router.delete("/admin/{agent_id}")
    async def admin_delete_agent(
        agent_id: str,
        authorization: str = Header(None)
    ):
        """Admin: Delete an agent"""
        await get_admin_user(authorization)
        
        result = await db.partner_agents.delete_one({"id": agent_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Agent non trouvé")
        
        return {"message": "Agent supprimé"}

    @agent_locator_router.get("/admin/list")
    async def admin_list_agents(
        country: Optional[str] = None,
        city: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Admin: List all agents"""
        await get_admin_user(authorization)
        
        query = {}
        if country:
            query["country"] = country.upper()
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        if is_active is not None:
            query["is_active"] = is_active
        
        agents = await db.partner_agents.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.partner_agents.count_documents(query)
        
        # Stats
        total_active = await db.partner_agents.count_documents({"is_active": True})
        by_country = {}
        for code in AFRICAN_COUNTRIES:
            count = await db.partner_agents.count_documents({"country": code, "is_active": True})
            if count > 0:
                by_country[code] = count
        
        return {
            "agents": agents,
            "total": total,
            "stats": {
                "total_active": total_active,
                "by_country": by_country
            }
        }

    # ==================== SEED DATA ====================

    @agent_locator_router.post("/admin/seed")
    async def admin_seed_agents(
        authorization: str = Header(None)
    ):
        """Admin: Seed demo agents for testing"""
        await get_admin_user(authorization)
        
        # Check if agents already exist
        existing = await db.partner_agents.count_documents({})
        if existing > 0:
            return {"message": f"{existing} agents already exist. Skipping seed."}
        
        now = datetime.now(timezone.utc)
        
        # Demo agents data
        demo_agents = [
            # Sénégal - Dakar
            {
                "business_name": "SBPAYGO Dakar Centre",
                "owner_name": "Amadou Diallo",
                "phone": "+221771234567",
                "address": "123 Avenue Cheikh Anta Diop",
                "city": "Dakar",
                "country": "SN",
                "latitude": 14.6937,
                "longitude": -17.4441,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "airtime"]
            },
            {
                "business_name": "Point Cash Médina",
                "owner_name": "Fatou Ndiaye",
                "phone": "+221772345678",
                "address": "45 Rue Blanchot",
                "city": "Dakar",
                "country": "SN",
                "latitude": 14.6820,
                "longitude": -17.4456,
                "services": ["cash_withdrawal", "mobile_money", "airtime"]
            },
            {
                "business_name": "Express Money Pikine",
                "owner_name": "Moussa Sow",
                "phone": "+221773456789",
                "address": "12 Boulevard de Pikine",
                "city": "Pikine",
                "country": "SN",
                "latitude": 14.7459,
                "longitude": -17.3915,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "airtime", "bill_payment"]
            },
            # Côte d'Ivoire - Abidjan
            {
                "business_name": "SBPAYGO Abidjan Plateau",
                "owner_name": "Konan Yao",
                "phone": "+2250707123456",
                "address": "Avenue Noguès, Plateau",
                "city": "Abidjan",
                "country": "CI",
                "latitude": 5.3167,
                "longitude": -4.0167,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "transfer"]
            },
            {
                "business_name": "Cash Express Cocody",
                "owner_name": "Aïcha Coulibaly",
                "phone": "+2250707234567",
                "address": "Riviera 2, Cocody",
                "city": "Abidjan",
                "country": "CI",
                "latitude": 5.3569,
                "longitude": -3.9803,
                "services": ["cash_withdrawal", "mobile_money", "airtime"]
            },
            {
                "business_name": "Point Services Yopougon",
                "owner_name": "Ibrahim Traoré",
                "phone": "+2250707345678",
                "address": "Marché de Yopougon",
                "city": "Abidjan",
                "country": "CI",
                "latitude": 5.3097,
                "longitude": -4.0656,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "airtime", "bill_payment"]
            },
            # Mali - Bamako
            {
                "business_name": "SBPAYGO Bamako ACI",
                "owner_name": "Seydou Keita",
                "phone": "+22376123456",
                "address": "ACI 2000, Hamdallaye",
                "city": "Bamako",
                "country": "ML",
                "latitude": 12.6392,
                "longitude": -8.0029,
                "services": ["cash_withdrawal", "deposit", "mobile_money"]
            },
            # Burkina Faso - Ouagadougou
            {
                "business_name": "Flash Cash Ouaga",
                "owner_name": "Abdoulaye Ouédraogo",
                "phone": "+22670123456",
                "address": "Quartier Koulouba",
                "city": "Ouagadougou",
                "country": "BF",
                "latitude": 12.3714,
                "longitude": -1.5197,
                "services": ["cash_withdrawal", "mobile_money", "airtime"]
            },
            # Ghana - Accra
            {
                "business_name": "SBPAYGO Accra Central",
                "owner_name": "Kwame Asante",
                "phone": "+233201234567",
                "address": "Oxford Street, Osu",
                "city": "Accra",
                "country": "GH",
                "latitude": 5.5600,
                "longitude": -0.1869,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "transfer"]
            },
            # Nigeria - Lagos
            {
                "business_name": "Quick Cash Victoria Island",
                "owner_name": "Oluwaseun Adeyemi",
                "phone": "+2348012345678",
                "address": "Adeola Odeku Street, VI",
                "city": "Lagos",
                "country": "NG",
                "latitude": 6.4281,
                "longitude": 3.4219,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "transfer", "bill_payment"]
            },
            {
                "business_name": "SBPAYGO Ikeja",
                "owner_name": "Chidinma Okonkwo",
                "phone": "+2348023456789",
                "address": "Allen Avenue, Ikeja",
                "city": "Lagos",
                "country": "NG",
                "latitude": 6.6018,
                "longitude": 3.3515,
                "services": ["cash_withdrawal", "mobile_money", "airtime"]
            },
            # Cameroun - Douala
            {
                "business_name": "Express Transfer Douala",
                "owner_name": "Jean-Pierre Nkoulou",
                "phone": "+237690123456",
                "address": "Akwa, Boulevard de la Liberté",
                "city": "Douala",
                "country": "CM",
                "latitude": 4.0483,
                "longitude": 9.7043,
                "services": ["cash_withdrawal", "deposit", "mobile_money", "transfer"]
            },
            # Kenya - Nairobi
            {
                "business_name": "M-Pesa Point Westlands",
                "owner_name": "James Mwangi",
                "phone": "+254712345678",
                "address": "Westlands Road",
                "city": "Nairobi",
                "country": "KE",
                "latitude": -1.2667,
                "longitude": 36.8111,
                "services": ["cash_withdrawal", "mobile_money", "airtime", "bill_payment"]
            },
            # France - Paris
            {
                "business_name": "SBPAYGO Paris Châtelet",
                "owner_name": "Mamadou Ba",
                "phone": "+33612345678",
                "address": "15 Rue de Rivoli",
                "city": "Paris",
                "country": "FR",
                "latitude": 48.8566,
                "longitude": 2.3522,
                "services": ["cash_withdrawal", "deposit", "transfer"]
            },
            {
                "business_name": "Africa Cash Paris 18",
                "owner_name": "Ousmane Diop",
                "phone": "+33623456789",
                "address": "45 Rue Myrha, Château Rouge",
                "city": "Paris",
                "country": "FR",
                "latitude": 48.8847,
                "longitude": 2.3489,
                "services": ["cash_withdrawal", "mobile_money", "transfer", "airtime"]
            }
        ]
        
        # Insert all agents
        for agent_data in demo_agents:
            agent_id = str(uuid.uuid4())
            agent = {
                "id": agent_id,
                "partner_id": None,
                **agent_data,
                "email": None,
                "opening_hours": {
                    "monday": "08:00-18:00",
                    "tuesday": "08:00-18:00",
                    "wednesday": "08:00-18:00",
                    "thursday": "08:00-18:00",
                    "friday": "08:00-18:00",
                    "saturday": "08:00-14:00",
                    "sunday": "closed"
                },
                "is_active": True,
                "status": "active",
                "rating": round(3.5 + (hash(agent_data["business_name"]) % 15) / 10, 1),
                "total_reviews": hash(agent_data["business_name"]) % 50 + 5,
                "total_transactions": hash(agent_data["business_name"]) % 500 + 100,
                "created_by": "system",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            await db.partner_agents.insert_one(agent)
        
        return {
            "message": f"{len(demo_agents)} agents de démonstration créés",
            "countries": list(set([a["country"] for a in demo_agents]))
        }

    return agent_locator_router
