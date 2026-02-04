"""
Saved Bank Cards Module for SBPAYGO
Allows users to save, manage, and use payment cards for faster transactions
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import jwt
import re

saved_cards_router = APIRouter(prefix="/api/saved-cards", tags=["Saved Cards"])

# Will be set by setup function
db = None
JWT_SECRET_KEY = None
JWT_ALGORITHM = None

class CardCreate(BaseModel):
    card_number: str  # Will be validated and masked
    card_holder_name: str
    expiry_month: str  # MM
    expiry_year: str   # YY or YYYY
    card_type: Optional[str] = None  # visa, mastercard, etc.
    nickname: Optional[str] = None
    is_default: Optional[bool] = False

class CardUpdate(BaseModel):
    nickname: Optional[str] = None
    is_default: Optional[bool] = None

def setup_saved_cards_routes(database, jwt_secret, jwt_algo):
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

def detect_card_type(card_number: str) -> str:
    """Detect card type from card number"""
    card_number = card_number.replace(" ", "").replace("-", "")
    
    if card_number.startswith("4"):
        return "visa"
    elif card_number.startswith(("51", "52", "53", "54", "55")) or (2221 <= int(card_number[:4]) <= 2720):
        return "mastercard"
    elif card_number.startswith(("34", "37")):
        return "amex"
    elif card_number.startswith("6011") or card_number.startswith("65"):
        return "discover"
    else:
        return "other"

def mask_card_number(card_number: str) -> str:
    """Mask card number showing only last 4 digits"""
    card_number = card_number.replace(" ", "").replace("-", "")
    return "**** **** **** " + card_number[-4:]

def validate_card_number(card_number: str) -> bool:
    """Validate card number using Luhn algorithm"""
    card_number = card_number.replace(" ", "").replace("-", "")
    if not card_number.isdigit() or len(card_number) < 13 or len(card_number) > 19:
        return False
    
    # Luhn algorithm
    total = 0
    reverse_digits = card_number[::-1]
    for i, digit in enumerate(reverse_digits):
        n = int(digit)
        if i % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    
    return total % 10 == 0

def validate_expiry(month: str, year: str) -> bool:
    """Validate card expiry date"""
    try:
        month_int = int(month)
        year_str = year if len(year) == 4 else "20" + year
        year_int = int(year_str)
        
        if month_int < 1 or month_int > 12:
            return False
        
        now = datetime.now(timezone.utc)
        if year_int < now.year:
            return False
        if year_int == now.year and month_int < now.month:
            return False
        
        return True
    except:
        return False

@saved_cards_router.post("/add")
async def add_card(
    card_data: CardCreate,
    current_user: dict = Depends(get_current_user_local)
):
    """Add a new saved card"""
    
    # Validate card number
    clean_number = card_data.card_number.replace(" ", "").replace("-", "")
    if not validate_card_number(clean_number):
        raise HTTPException(status_code=400, detail="Numero de carte invalide")
    
    # Validate expiry
    if not validate_expiry(card_data.expiry_month, card_data.expiry_year):
        raise HTTPException(status_code=400, detail="Date d'expiration invalide")
    
    # Check for duplicate (last 4 digits match)
    existing = await db.saved_cards.find_one({
        "user_id": current_user["id"],
        "last_four": clean_number[-4:]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Cette carte est deja enregistree")
    
    # Detect card type
    card_type = card_data.card_type or detect_card_type(clean_number)
    
    # If setting as default, unset other defaults
    if card_data.is_default:
        await db.saved_cards.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_default": False}}
        )
    
    # Create card record
    card_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Format expiry
    expiry_year = card_data.expiry_year if len(card_data.expiry_year) == 4 else "20" + card_data.expiry_year
    
    card_doc = {
        "id": card_id,
        "user_id": current_user["id"],
        "card_holder_name": card_data.card_holder_name.upper(),
        "masked_number": mask_card_number(clean_number),
        "last_four": clean_number[-4:],
        "card_type": card_type,
        "expiry_month": card_data.expiry_month.zfill(2),
        "expiry_year": expiry_year,
        "nickname": card_data.nickname or f"Carte {card_type.capitalize()}",
        "is_default": card_data.is_default or False,
        "is_active": True,
        "created_at": now,
        "last_used": None
    }
    
    await db.saved_cards.insert_one(card_doc)
    
    # Remove sensitive fields before returning
    del card_doc["_id"] if "_id" in card_doc else None
    
    return {
        "success": True,
        "message": "Carte ajoutee avec succes",
        "card": {
            "id": card_id,
            "masked_number": card_doc["masked_number"],
            "card_type": card_type,
            "nickname": card_doc["nickname"],
            "is_default": card_doc["is_default"]
        }
    }

@saved_cards_router.get("/list")
async def list_cards(current_user: dict = Depends(get_current_user_local)):
    """Get all saved cards for current user"""
    
    cards = await db.saved_cards.find(
        {"user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return {"cards": cards}

@saved_cards_router.get("/{card_id}")
async def get_card(
    card_id: str,
    current_user: dict = Depends(get_current_user_local)
):
    """Get a specific saved card"""
    
    card = await db.saved_cards.find_one(
        {"id": card_id, "user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    )
    
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvee")
    
    return {"card": card}

@saved_cards_router.put("/{card_id}")
async def update_card(
    card_id: str,
    card_data: CardUpdate,
    current_user: dict = Depends(get_current_user_local)
):
    """Update a saved card (nickname, default status)"""
    
    card = await db.saved_cards.find_one(
        {"id": card_id, "user_id": current_user["id"], "is_active": True}
    )
    
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvee")
    
    update_data = {}
    
    if card_data.nickname is not None:
        update_data["nickname"] = card_data.nickname
    
    if card_data.is_default is True:
        # Unset other defaults first
        await db.saved_cards.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_default": False}}
        )
        update_data["is_default"] = True
    elif card_data.is_default is False:
        update_data["is_default"] = False
    
    if update_data:
        await db.saved_cards.update_one(
            {"id": card_id},
            {"$set": update_data}
        )
    
    return {"success": True, "message": "Carte mise a jour"}

@saved_cards_router.delete("/{card_id}")
async def delete_card(
    card_id: str,
    current_user: dict = Depends(get_current_user_local)
):
    """Delete (deactivate) a saved card"""
    
    card = await db.saved_cards.find_one(
        {"id": card_id, "user_id": current_user["id"], "is_active": True}
    )
    
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvee")
    
    # Soft delete
    await db.saved_cards.update_one(
        {"id": card_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Carte supprimee"}

@saved_cards_router.post("/{card_id}/set-default")
async def set_default_card(
    card_id: str,
    current_user: dict = Depends(get_current_user_local)
):
    """Set a card as default"""
    
    card = await db.saved_cards.find_one(
        {"id": card_id, "user_id": current_user["id"], "is_active": True}
    )
    
    if not card:
        raise HTTPException(status_code=404, detail="Carte non trouvee")
    
    # Unset all defaults
    await db.saved_cards.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"is_default": False}}
    )
    
    # Set this card as default
    await db.saved_cards.update_one(
        {"id": card_id},
        {"$set": {"is_default": True}}
    )
    
    return {"success": True, "message": "Carte definie par defaut"}

@saved_cards_router.get("/default/get")
async def get_default_card(current_user: dict = Depends(get_current_user_local)):
    """Get the default card for current user"""
    
    card = await db.saved_cards.find_one(
        {"user_id": current_user["id"], "is_default": True, "is_active": True},
        {"_id": 0}
    )
    
    if not card:
        # Return the most recently added card
        card = await db.saved_cards.find_one(
            {"user_id": current_user["id"], "is_active": True},
            {"_id": 0},
            sort=[("created_at", -1)]
        )
    
    return {"card": card}
