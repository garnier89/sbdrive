# User Extras Module - SBPAYGO
# Unique ID generation, Favorites, Request Money, etc.

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List
import jwt
import uuid
import random
import string

user_extras_router = APIRouter(prefix="/api/user", tags=["User Extras"])

# Request models
class FavoriteOperatorCreate(BaseModel):
    operator_code: str
    operator_name: str
    country: str
    category: str  # deposit, withdraw, transfer, airtime

class RequestMoneyCreate(BaseModel):
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    amount: float
    currency: str = "XOF"
    message: Optional[str] = None

def generate_sbpaygo_id():
    """Generate unique SBPAYGO ID in format SBP-XXXX-XXXX"""
    part1 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    part2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"SBP-{part1}-{part2}"

def setup_user_extras_routes(db, jwt_secret, jwt_algorithm, send_push_notification, send_email_notification):
    """Setup user extras routes with database access"""

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

    # ==================== UNIQUE ID ====================

    @user_extras_router.get("/sbpaygo-id")
    async def get_sbpaygo_id(authorization: str = Header(None)):
        """Get user's unique SBPAYGO ID, generate if not exists"""
        user = await get_current_user(authorization)
        
        sbpaygo_id = user.get("sbpaygo_id")
        
        if not sbpaygo_id:
            # Generate and save new ID
            sbpaygo_id = generate_sbpaygo_id()
            
            # Ensure uniqueness
            while await db.users.find_one({"sbpaygo_id": sbpaygo_id}):
                sbpaygo_id = generate_sbpaygo_id()
            
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"sbpaygo_id": sbpaygo_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {
            "sbpaygo_id": sbpaygo_id,
            "user_id": user["id"],
            "full_name": user.get("full_name", "")
        }

    @user_extras_router.get("/lookup/{identifier}")
    async def lookup_user(identifier: str, authorization: str = Header(None)):
        """Lookup user by SBPAYGO ID, email, or phone"""
        await get_current_user(authorization)
        
        # Try to find by SBPAYGO ID
        user = await db.users.find_one({"sbpaygo_id": identifier}, {"_id": 0})
        
        # Try by email
        if not user:
            user = await db.users.find_one({"email": identifier}, {"_id": 0})
        
        # Try by phone
        if not user:
            user = await db.users.find_one({"phone": identifier}, {"_id": 0})
        
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        # Return masked info
        full_name = user.get("full_name", "")
        name_parts = full_name.split()
        masked_name = f"{name_parts[0]} {name_parts[-1][0]}." if len(name_parts) > 1 else f"{full_name[:3]}..."
        
        phone = user.get("phone", "")
        masked_phone = f"***{phone[-4:]}" if len(phone) > 4 else "***"
        
        return {
            "found": True,
            "user_id": user["id"],
            "sbpaygo_id": user.get("sbpaygo_id"),
            "masked_name": masked_name,
            "masked_phone": masked_phone,
            "country": user.get("country")
        }

    # ==================== FAVORITE OPERATORS ====================

    @user_extras_router.get("/favorite-operators")
    async def get_favorite_operators(
        category: Optional[str] = None,
        authorization: str = Header(None)
    ):
        """Get user's favorite Mobile Money operators"""
        user = await get_current_user(authorization)
        
        query = {"user_id": user["id"]}
        if category:
            query["category"] = category
        
        favorites = await db.favorite_operators.find(
            query,
            {"_id": 0}
        ).sort("usage_count", -1).to_list(50)
        
        return {"favorites": favorites}

    @user_extras_router.post("/favorite-operators")
    async def add_favorite_operator(
        request: FavoriteOperatorCreate,
        authorization: str = Header(None)
    ):
        """Add a Mobile Money operator to favorites"""
        user = await get_current_user(authorization)
        
        # Check if already exists
        existing = await db.favorite_operators.find_one({
            "user_id": user["id"],
            "operator_code": request.operator_code,
            "category": request.category
        })
        
        if existing:
            # Increment usage count
            await db.favorite_operators.update_one(
                {"id": existing["id"]},
                {"$inc": {"usage_count": 1}, "$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
            )
            return {"message": "Favori mis à jour", "id": existing["id"]}
        
        now = datetime.now(timezone.utc).isoformat()
        fav_id = str(uuid.uuid4())
        
        favorite = {
            "id": fav_id,
            "user_id": user["id"],
            "operator_code": request.operator_code,
            "operator_name": request.operator_name,
            "country": request.country,
            "category": request.category,
            "usage_count": 1,
            "created_at": now,
            "last_used": now
        }
        
        await db.favorite_operators.insert_one(favorite)
        
        return {"message": "Ajouté aux favoris", "id": fav_id}

    @user_extras_router.delete("/favorite-operators/{favorite_id}")
    async def remove_favorite_operator(
        favorite_id: str,
        authorization: str = Header(None)
    ):
        """Remove an operator from favorites"""
        user = await get_current_user(authorization)
        
        result = await db.favorite_operators.delete_one({
            "id": favorite_id,
            "user_id": user["id"]
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Favori non trouvé")
        
        return {"message": "Supprimé des favoris"}

    # ==================== REQUEST MONEY ====================

    @user_extras_router.post("/request-money")
    async def create_money_request(
        request: RequestMoneyCreate,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Create a money request to another user"""
        user = await get_current_user(authorization)
        
        if not request.recipient_email and not request.recipient_phone:
            raise HTTPException(status_code=400, detail="Email ou téléphone requis")
        
        # Find recipient
        recipient = None
        if request.recipient_email:
            recipient = await db.users.find_one({"email": request.recipient_email}, {"_id": 0})
        elif request.recipient_phone:
            recipient = await db.users.find_one({"phone": request.recipient_phone}, {"_id": 0})
        
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
        
        if recipient["id"] == user["id"]:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous demander de l'argent")
        
        now = datetime.now(timezone.utc).isoformat()
        request_id = str(uuid.uuid4())
        
        money_request = {
            "id": request_id,
            "requester_id": user["id"],
            "requester_name": user.get("full_name", ""),
            "requester_email": user.get("email", ""),
            "recipient_id": recipient["id"],
            "recipient_name": recipient.get("full_name", ""),
            "recipient_email": recipient.get("email", ""),
            "amount": request.amount,
            "currency": request.currency,
            "message": request.message,
            "status": "pending",  # pending, paid, rejected, expired
            "created_at": now,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }
        
        await db.money_requests.insert_one(money_request)
        
        # Send notification to recipient
        background_tasks.add_task(
            send_push_notification,
            recipient["id"],
            "Demande d'argent",
            f"{user.get('full_name', 'Un utilisateur')} vous demande {request.amount} {request.currency}"
        )
        
        if recipient.get("email"):
            background_tasks.add_task(
                send_email_notification,
                recipient["email"],
                "Demande d'argent SBPAYGO",
                f"{user.get('full_name')} vous demande {request.amount} {request.currency}. {request.message or ''}",
                recipient.get("preferred_language", "fr")
            )
        
        return {
            "message": "Demande envoyée",
            "request_id": request_id,
            "recipient": recipient.get("full_name", "")[:20] + "..."
        }

    @user_extras_router.get("/money-requests")
    async def get_money_requests(
        direction: str = "received",  # received or sent
        status: Optional[str] = None,
        limit: int = 20,
        authorization: str = Header(None)
    ):
        """Get money requests (sent or received)"""
        user = await get_current_user(authorization)
        
        if direction == "received":
            query = {"recipient_id": user["id"]}
        else:
            query = {"requester_id": user["id"]}
        
        if status:
            query["status"] = status
        
        requests = await db.money_requests.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {"requests": requests, "direction": direction}

    @user_extras_router.post("/money-requests/{request_id}/pay")
    async def pay_money_request(
        request_id: str,
        background_tasks: BackgroundTasks,
        authorization: str = Header(None)
    ):
        """Pay a money request"""
        user = await get_current_user(authorization)
        
        money_request = await db.money_requests.find_one({
            "id": request_id,
            "recipient_id": user["id"],
            "status": "pending"
        }, {"_id": 0})
        
        if not money_request:
            raise HTTPException(status_code=404, detail="Demande non trouvée ou déjà traitée")
        
        # Check wallet balance
        wallet = await db.wallets.find_one({
            "user_id": user["id"],
            "currency": money_request["currency"]
        }, {"_id": 0})
        
        if not wallet or wallet["balance"] < money_request["amount"]:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Deduct from payer
        await db.wallets.update_one(
            {"id": wallet["id"]},
            {"$inc": {"balance": -money_request["amount"]}, "$set": {"updated_at": now}}
        )
        
        # Add to requester
        requester_wallet = await db.wallets.find_one({
            "user_id": money_request["requester_id"],
            "currency": money_request["currency"]
        }, {"_id": 0})
        
        if requester_wallet:
            await db.wallets.update_one(
                {"id": requester_wallet["id"]},
                {"$inc": {"balance": money_request["amount"]}, "$set": {"updated_at": now}}
            )
        
        # Update request status
        await db.money_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "paid", "paid_at": now}}
        )
        
        # Create transactions
        tx_id = str(uuid.uuid4())
        
        await db.transactions.insert_many([
            {
                "id": tx_id,
                "user_id": user["id"],
                "type": "transfer_out",
                "amount": -money_request["amount"],
                "currency": money_request["currency"],
                "status": "completed",
                "description": f"Paiement demande de {money_request['requester_name']}",
                "money_request_id": request_id,
                "created_at": now
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": money_request["requester_id"],
                "type": "transfer_in",
                "amount": money_request["amount"],
                "currency": money_request["currency"],
                "status": "completed",
                "description": f"Demande payée par {user.get('full_name', '')}",
                "money_request_id": request_id,
                "created_at": now
            }
        ])
        
        # Notify requester
        background_tasks.add_task(
            send_push_notification,
            money_request["requester_id"],
            "Demande payée!",
            f"{user.get('full_name', 'Un utilisateur')} a payé votre demande de {money_request['amount']} {money_request['currency']}"
        )
        
        return {"message": "Paiement effectué", "transaction_id": tx_id}

    @user_extras_router.post("/money-requests/{request_id}/reject")
    async def reject_money_request(
        request_id: str,
        authorization: str = Header(None)
    ):
        """Reject a money request"""
        user = await get_current_user(authorization)
        
        result = await db.money_requests.update_one(
            {"id": request_id, "recipient_id": user["id"], "status": "pending"},
            {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return {"message": "Demande rejetée"}

    @user_extras_router.post("/money-requests/{request_id}/cancel")
    async def cancel_money_request(
        request_id: str,
        authorization: str = Header(None)
    ):
        """Cancel a sent money request"""
        user = await get_current_user(authorization)
        
        result = await db.money_requests.update_one(
            {"id": request_id, "requester_id": user["id"], "status": "pending"},
            {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return {"message": "Demande annulée"}

    return user_extras_router

# Import timedelta at the top level
from datetime import timedelta
