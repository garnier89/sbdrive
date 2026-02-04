"""
Money Requests Module for SBPAYGO
Allows users to request money from other users via email, phone, or SBPAYGO ID
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import jwt

money_requests_router = APIRouter(prefix="/api/money-requests", tags=["Money Requests"])

# Will be set by setup function
db = None
JWT_SECRET_KEY = None
JWT_ALGORITHM = None
send_push_notification = None
send_email_notification = None
send_sms_notification = None

class MoneyRequestCreate(BaseModel):
    recipient_type: str  # email, phone, sbpaygo_id
    recipient_value: str
    amount: float
    currency: str = "XOF"
    message: Optional[str] = None

class MoneyRequestResponse(BaseModel):
    request_id: str
    action: str  # approve, reject

def setup_money_requests_routes(database, jwt_secret, jwt_algo, push_notif, email_notif, sms_notif):
    global db, JWT_SECRET_KEY, JWT_ALGORITHM, send_push_notification, send_email_notification, send_sms_notification
    db = database
    JWT_SECRET_KEY = jwt_secret
    JWT_ALGORITHM = jwt_algo
    send_push_notification = push_notif
    send_email_notification = email_notif
    send_sms_notification = sms_notif

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

@money_requests_router.post("/create")
async def create_money_request(
    request_data: MoneyRequestCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_local)
):
    """Create a new money request"""
    
    # Find recipient based on type
    recipient = None
    search_field = None
    
    if request_data.recipient_type == "email":
        search_field = {"email": request_data.recipient_value.lower()}
    elif request_data.recipient_type == "phone":
        # Clean phone number
        phone = request_data.recipient_value.replace(" ", "").replace("-", "")
        if not phone.startswith("+"):
            phone = "+" + phone
        search_field = {"phone": phone}
    elif request_data.recipient_type == "sbpaygo_id":
        search_field = {"sbpaygo_id": request_data.recipient_value.upper()}
    else:
        raise HTTPException(status_code=400, detail="Type de destinataire invalide")
    
    if search_field:
        recipient = await db.users.find_one(search_field, {"_id": 0})
    
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinataire non trouvé")
    
    if recipient["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous demander de l'argent")
    
    # Validate amount
    if request_data.amount <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être supérieur à 0")
    
    if request_data.amount > 1000000:  # Max 1M per request
        raise HTTPException(status_code=400, detail="Montant maximum: 1,000,000")
    
    # Create request
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    
    money_request = {
        "id": request_id,
        "requester_id": current_user["id"],
        "requester_name": current_user.get("full_name", "Utilisateur"),
        "requester_sbpaygo_id": current_user.get("sbpaygo_id"),
        "recipient_id": recipient["id"],
        "recipient_name": recipient.get("full_name", "Utilisateur"),
        "recipient_sbpaygo_id": recipient.get("sbpaygo_id"),
        "amount": request_data.amount,
        "currency": request_data.currency,
        "message": request_data.message,
        "status": "pending",  # pending, approved, rejected, expired, cancelled
        "created_at": now,
        "expires_at": expires_at,
        "responded_at": None
    }
    
    await db.money_requests.insert_one(money_request)
    
    # Send notification to recipient
    background_tasks.add_task(
        send_push_notification,
        recipient["id"],
        "Demande d'argent reçue",
        f"{current_user.get('full_name', 'Quelqu\'un')} vous demande {request_data.amount} {request_data.currency}"
    )
    
    # Send email if available
    if recipient.get("email"):
        background_tasks.add_task(
            send_email_notification,
            recipient["email"],
            "Nouvelle demande d'argent - SBPAYGO",
            f"{current_user.get('full_name')} vous demande {request_data.amount} {request_data.currency}. Connectez-vous à SBPAYGO pour répondre.",
            recipient.get("preferred_language", "fr")
        )
    
    return {
        "success": True,
        "request_id": request_id,
        "message": "Demande envoyée avec succès",
        "recipient_name": f"{recipient.get('first_name', '')} {recipient.get('last_name', '')[:1]}."
    }

@money_requests_router.get("/sent")
async def get_sent_requests(current_user: dict = Depends(get_current_user_local)):
    """Get money requests sent by current user"""
    
    requests = await db.money_requests.find(
        {"requester_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"requests": requests}

@money_requests_router.get("/received")
async def get_received_requests(current_user: dict = Depends(get_current_user_local)):
    """Get money requests received by current user"""
    
    requests = await db.money_requests.find(
        {"recipient_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"requests": requests}

@money_requests_router.post("/respond")
async def respond_to_request(
    response: MoneyRequestResponse,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_local)
):
    """Respond to a money request (approve or reject)"""
    
    # Find the request
    request = await db.money_requests.find_one(
        {"id": response.request_id, "recipient_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cette demande est déjà {request['status']}")
    
    # Check if expired
    if datetime.fromisoformat(request["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
        await db.money_requests.update_one(
            {"id": response.request_id},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="Cette demande a expiré")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if response.action == "reject":
        await db.money_requests.update_one(
            {"id": response.request_id},
            {"$set": {"status": "rejected", "responded_at": now}}
        )
        
        # Notify requester
        background_tasks.add_task(
            send_push_notification,
            request["requester_id"],
            "Demande refusée",
            f"Votre demande de {request['amount']} {request['currency']} a été refusée"
        )
        
        return {"success": True, "message": "Demande refusée"}
    
    elif response.action == "approve":
        # Check wallet balance
        wallet = await db.wallets.find_one(
            {"user_id": current_user["id"], "currency": request["currency"]},
            {"_id": 0}
        )
        
        if not wallet or wallet.get("balance", 0) < request["amount"]:
            raise HTTPException(status_code=400, detail="Solde insuffisant")
        
        # Perform transfer
        # Debit sender (current user)
        await db.wallets.update_one(
            {"user_id": current_user["id"], "currency": request["currency"]},
            {"$inc": {"balance": -request["amount"]}}
        )
        
        # Credit requester
        requester_wallet = await db.wallets.find_one(
            {"user_id": request["requester_id"], "currency": request["currency"]},
            {"_id": 0}
        )
        
        if requester_wallet:
            await db.wallets.update_one(
                {"user_id": request["requester_id"], "currency": request["currency"]},
                {"$inc": {"balance": request["amount"]}}
            )
        else:
            # Create wallet if doesn't exist
            await db.wallets.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": request["requester_id"],
                "currency": request["currency"],
                "balance": request["amount"],
                "created_at": now
            })
        
        # Create transaction records
        tx_id = str(uuid.uuid4())
        transaction = {
            "id": tx_id,
            "type": "money_request",
            "from_user_id": current_user["id"],
            "to_user_id": request["requester_id"],
            "amount": request["amount"],
            "currency": request["currency"],
            "fee": 0,
            "status": "completed",
            "description": f"Demande d'argent de {request['requester_name']}",
            "money_request_id": response.request_id,
            "created_at": now
        }
        await db.transactions.insert_one(transaction)
        
        # Update request status
        await db.money_requests.update_one(
            {"id": response.request_id},
            {"$set": {"status": "approved", "responded_at": now, "transaction_id": tx_id}}
        )
        
        # Notify requester
        background_tasks.add_task(
            send_push_notification,
            request["requester_id"],
            "Demande acceptée !",
            f"Vous avez reçu {request['amount']} {request['currency']} de {current_user.get('full_name', 'quelqu\'un')}"
        )
        
        return {
            "success": True,
            "message": "Transfert effectué avec succès",
            "transaction_id": tx_id
        }
    
    else:
        raise HTTPException(status_code=400, detail="Action invalide")

@money_requests_router.post("/cancel/{request_id}")
async def cancel_request(
    request_id: str,
    current_user: dict = Depends(get_current_user_local)
):
    """Cancel a pending money request (requester only)"""
    
    request = await db.money_requests.find_one(
        {"id": request_id, "requester_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Seules les demandes en attente peuvent être annulées")
    
    await db.money_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "cancelled", "responded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Demande annulée"}

@money_requests_router.get("/lookup")
async def lookup_user(
    type: str,
    value: str,
    current_user: dict = Depends(get_current_user_local)
):
    """Look up a user by email, phone, or SBPAYGO ID"""
    
    search_field = None
    
    if type == "email":
        search_field = {"email": value.lower()}
    elif type == "phone":
        phone = value.replace(" ", "").replace("-", "")
        if not phone.startswith("+"):
            phone = "+" + phone
        search_field = {"phone": phone}
    elif type == "sbpaygo_id":
        search_field = {"sbpaygo_id": value.upper()}
    else:
        raise HTTPException(status_code=400, detail="Type de recherche invalide")
    
    user = await db.users.find_one(search_field, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if user["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous rechercher vous-même")
    
    # Return limited info for privacy
    return {
        "found": True,
        "sbpaygo_id": user.get("sbpaygo_id"),
        "name": f"{user.get('first_name', '')} {user.get('last_name', '')[:1]}.",
        "verified": user.get("kyc_status") == "verified"
    }
