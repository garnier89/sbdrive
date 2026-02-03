# Module de Recharge Mobile SBPAYGO
# Recharge de crédit téléphonique pour 21 pays africains

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import sys
sys.path.append('/app/backend')
from config.countries_config import AFRICAN_COUNTRIES_CONFIG, get_country_config, get_telecom_operators, get_quick_amounts

airtime_router = APIRouter(prefix="/api/airtime", tags=["Airtime/Mobile Top-up"])

class AirtimeTopupRequest(BaseModel):
    phone_number: str
    country: str
    operator: str
    amount: float
    currency: Optional[str] = None

class AirtimeDataRequest(BaseModel):
    phone_number: str
    country: str
    operator: str
    data_package_id: str

def setup_airtime_routes(db, jwt_secret, jwt_algorithm, send_push_notification):
    """Setup airtime routes with database access"""

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

    # ==================== CONFIG ROUTES ====================

    @airtime_router.get("/countries")
    async def get_supported_countries():
        """Get all supported countries for airtime"""
        countries = []
        for code, config in AFRICAN_COUNTRIES_CONFIG.items():
            if config.get("telecom_operators"):
                countries.append({
                    "code": code,
                    "name": config["name"],
                    "flag": config["flag"],
                    "currency": config["currency"],
                    "phone_prefix": config["phone_prefix"],
                    "operators_count": len(config["telecom_operators"])
                })
        return {"countries": countries, "total": len(countries)}

    @airtime_router.get("/operators/{country}")
    async def get_operators(country: str):
        """Get telecom operators for a country"""
        config = get_country_config(country)
        if not config:
            raise HTTPException(status_code=404, detail="Pays non supporté")
        
        operators = config.get("telecom_operators", [])
        currency = config.get("currency", "XOF")
        quick_amounts = get_quick_amounts(currency)
        
        return {
            "country": country.upper(),
            "country_name": config["name"],
            "flag": config["flag"],
            "currency": currency,
            "phone_prefix": config["phone_prefix"],
            "operators": operators,
            "quick_amounts": quick_amounts
        }

    @airtime_router.get("/data-packages/{country}/{operator}")
    async def get_data_packages(country: str, operator: str):
        """Get available data packages for an operator"""
        config = get_country_config(country)
        if not config:
            raise HTTPException(status_code=404, detail="Pays non supporté")
        
        currency = config.get("currency", "XOF")
        
        # Demo data packages (in production, this would come from the operator's API)
        base_packages = [
            {"id": "data_100mb", "name": "100 MB", "data": "100 MB", "validity": "1 jour", "multiplier": 1},
            {"id": "data_250mb", "name": "250 MB", "data": "250 MB", "validity": "3 jours", "multiplier": 2},
            {"id": "data_500mb", "name": "500 MB", "data": "500 MB", "validity": "7 jours", "multiplier": 3.5},
            {"id": "data_1gb", "name": "1 GB", "data": "1 GB", "validity": "30 jours", "multiplier": 6},
            {"id": "data_2gb", "name": "2 GB", "data": "2 GB", "validity": "30 jours", "multiplier": 10},
            {"id": "data_5gb", "name": "5 GB", "data": "5 GB", "validity": "30 jours", "multiplier": 20},
            {"id": "data_10gb", "name": "10 GB", "data": "10 GB", "validity": "30 jours", "multiplier": 35},
            {"id": "data_illimite_jour", "name": "Illimité 24h", "data": "Illimité", "validity": "24 heures", "multiplier": 15}
        ]
        
        # Calculate prices based on currency
        base_price = 500 if currency == "XOF" else (1 if currency == "EUR" else 100)
        
        packages = []
        for pkg in base_packages:
            packages.append({
                **pkg,
                "price": int(base_price * pkg["multiplier"]),
                "currency": currency
            })
        
        return {
            "country": country.upper(),
            "operator": operator,
            "currency": currency,
            "packages": packages
        }

    # ==================== TOPUP ROUTES ====================

    @airtime_router.post("/topup")
    async def create_topup(
        request: AirtimeTopupRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create an airtime top-up"""
        user = await get_current_user(authorization)
        
        # Get country config
        config = get_country_config(request.country)
        if not config:
            raise HTTPException(status_code=400, detail="Pays non supporté")
        
        # Validate operator
        operators = config.get("telecom_operators", [])
        operator = next((op for op in operators if op["code"] == request.operator), None)
        if not operator:
            raise HTTPException(status_code=400, detail="Opérateur non supporté")
        
        currency = request.currency or config.get("currency", "XOF")
        
        # Validate amount
        if request.amount < 100:
            raise HTTPException(status_code=400, detail="Montant minimum: 100")
        
        # Check wallet balance
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < request.amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Calculate fees (usually free for airtime in most markets)
        fees = 0
        total_debit = request.amount + fees
        
        now = datetime.now(timezone.utc)
        topup_id = str(uuid.uuid4())
        reference = f"AIR-{topup_id[:8].upper()}"
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -total_debit}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create topup record
        topup = {
            "id": topup_id,
            "user_id": user["id"],
            "type": "airtime",
            "phone_number": request.phone_number,
            "country": request.country.upper(),
            "operator": request.operator,
            "operator_name": operator["name"],
            "amount": request.amount,
            "fees": fees,
            "total_debited": total_debit,
            "currency": currency,
            "reference": reference,
            "status": "completed",  # Demo mode: instant
            "demo_mode": True,
            "created_at": now.isoformat()
        }
        await db.airtime_topups.insert_one(topup)
        
        # Create transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "airtime_topup",
            "amount": -total_debit,
            "currency": currency,
            "status": "completed",
            "description": f"Recharge {operator['name']} - {request.phone_number}",
            "topup_id": topup_id,
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Recharge effectuée",
            f"{request.amount} {currency} envoyé vers {request.phone_number} ({operator['name']})"
        )
        
        return {
            "message": "Recharge effectuée avec succès",
            "topup_id": topup_id,
            "reference": reference,
            "phone_number": request.phone_number,
            "operator": operator["name"],
            "amount": request.amount,
            "currency": currency,
            "status": "completed",
            "demo_mode": True
        }

    @airtime_router.post("/data-topup")
    async def create_data_topup(
        request: AirtimeDataRequest,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create a data package top-up"""
        user = await get_current_user(authorization)
        
        # Get country config
        config = get_country_config(request.country)
        if not config:
            raise HTTPException(status_code=400, detail="Pays non supporté")
        
        # Validate operator
        operators = config.get("telecom_operators", [])
        operator = next((op for op in operators if op["code"] == request.operator), None)
        if not operator:
            raise HTTPException(status_code=400, detail="Opérateur non supporté")
        
        currency = config.get("currency", "XOF")
        
        # Get package details (demo)
        base_price = 500 if currency == "XOF" else (1 if currency == "EUR" else 100)
        packages_multipliers = {
            "data_100mb": 1, "data_250mb": 2, "data_500mb": 3.5, "data_1gb": 6,
            "data_2gb": 10, "data_5gb": 20, "data_10gb": 35, "data_illimite_jour": 15
        }
        
        multiplier = packages_multipliers.get(request.data_package_id)
        if not multiplier:
            raise HTTPException(status_code=400, detail="Forfait non trouvé")
        
        amount = int(base_price * multiplier)
        
        # Check wallet balance
        wallet = await db.wallets.find_one(
            {"user_id": user["id"], "currency": currency},
            {"_id": 0}
        )
        if not wallet or wallet.get("balance", 0) < amount:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        now = datetime.now(timezone.utc)
        topup_id = str(uuid.uuid4())
        reference = f"DATA-{topup_id[:8].upper()}"
        
        # Debit wallet
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -amount}, "$set": {"updated_at": now.isoformat()}}
        )
        
        # Create topup record
        topup = {
            "id": topup_id,
            "user_id": user["id"],
            "type": "data",
            "phone_number": request.phone_number,
            "country": request.country.upper(),
            "operator": request.operator,
            "operator_name": operator["name"],
            "data_package_id": request.data_package_id,
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "status": "completed",
            "demo_mode": True,
            "created_at": now.isoformat()
        }
        await db.airtime_topups.insert_one(topup)
        
        # Create transaction record
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "data_topup",
            "amount": -amount,
            "currency": currency,
            "status": "completed",
            "description": f"Forfait data {operator['name']} - {request.phone_number}",
            "topup_id": topup_id,
            "created_at": now.isoformat()
        })
        
        # Send notification
        background_tasks.add_task(
            send_push_notification,
            user["id"],
            "Forfait data activé",
            f"Forfait {request.data_package_id} activé pour {request.phone_number}"
        )
        
        return {
            "message": "Forfait data activé",
            "topup_id": topup_id,
            "reference": reference,
            "phone_number": request.phone_number,
            "operator": operator["name"],
            "data_package": request.data_package_id,
            "amount": amount,
            "currency": currency,
            "status": "completed",
            "demo_mode": True
        }

    # ==================== HISTORY ====================

    @airtime_router.get("/history")
    async def get_topup_history(
        type: Optional[str] = None,
        country: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        authorization: str = Header(None)
    ):
        """Get user's airtime/data top-up history"""
        user = await get_current_user(authorization)
        
        query = {"user_id": user["id"]}
        if type:
            query["type"] = type
        if country:
            query["country"] = country.upper()
        
        topups = await db.airtime_topups.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.airtime_topups.count_documents(query)
        
        return {
            "topups": topups,
            "total": total
        }

    @airtime_router.get("/favorites")
    async def get_favorite_numbers(authorization: str = Header(None)):
        """Get user's favorite phone numbers for quick recharge"""
        user = await get_current_user(authorization)
        
        favorites = await db.airtime_favorites.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).to_list(20)
        
        return {"favorites": favorites}

    @airtime_router.post("/favorites")
    async def add_favorite_number(
        phone_number: str,
        country: str,
        operator: str,
        nickname: Optional[str] = None,
        authorization: str = Header(None)
    ):
        """Add a favorite phone number"""
        user = await get_current_user(authorization)
        
        config = get_country_config(country)
        if not config:
            raise HTTPException(status_code=400, detail="Pays non supporté")
        
        operators = config.get("telecom_operators", [])
        op = next((o for o in operators if o["code"] == operator), None)
        if not op:
            raise HTTPException(status_code=400, detail="Opérateur non supporté")
        
        favorite_id = str(uuid.uuid4())
        favorite = {
            "id": favorite_id,
            "user_id": user["id"],
            "phone_number": phone_number,
            "country": country.upper(),
            "operator": operator,
            "operator_name": op["name"],
            "nickname": nickname or phone_number,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.airtime_favorites.insert_one(favorite)
        
        return {"message": "Numéro ajouté aux favoris", "favorite_id": favorite_id}

    @airtime_router.delete("/favorites/{favorite_id}")
    async def remove_favorite_number(
        favorite_id: str,
        authorization: str = Header(None)
    ):
        """Remove a favorite phone number"""
        user = await get_current_user(authorization)
        
        result = await db.airtime_favorites.delete_one({
            "id": favorite_id,
            "user_id": user["id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Favori non trouvé")
        
        return {"message": "Numéro supprimé des favoris"}

    return airtime_router
