"""Payment Links routes module for SBPAYGO"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

payment_links_router = APIRouter(prefix="/payment-links", tags=["Payment Links"])

# Will be set by setup function
db = None
get_current_user = None
send_push_notification = None

# Models
class PaymentLinkCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    currency: str = "EUR"
    recipient_name: Optional[str] = None
    expires_hours: Optional[int] = 48

class PaymentLinkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    is_active: Optional[bool] = None


@payment_links_router.post("")
async def create_payment_link(link: PaymentLinkCreate, current_user: dict = Depends(lambda: get_current_user)):
    """Create a new payment link"""
    now = datetime.now(timezone.utc).isoformat()
    link_id = str(uuid.uuid4())
    short_id = uuid.uuid4().hex[:8].upper()
    
    link_doc = {
        "id": link_id,
        "short_id": short_id,
        "user_id": current_user["id"],
        "title": link.title,
        "description": link.description,
        "amount": link.amount,
        "currency": link.currency,
        "recipient_name": link.recipient_name or current_user.get("full_name", ""),
        "is_active": True,
        "total_collected": 0,
        "payment_count": 0,
        "created_at": now,
        "updated_at": now,
        "expires_at": None
    }
    
    await db.payment_links.insert_one(link_doc)
    
    return {
        "id": link_id,
        "short_id": short_id,
        "url": f"/pay/{short_id}",
        "message": "Payment link created"
    }


@payment_links_router.get("")
async def get_payment_links(current_user: dict = Depends(lambda: get_current_user)):
    """Get all payment links for user"""
    links = await db.payment_links.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"links": links}


@payment_links_router.get("/{link_id}")
async def get_payment_link(link_id: str, current_user: dict = Depends(lambda: get_current_user)):
    """Get a specific payment link"""
    link = await db.payment_links.find_one(
        {"$or": [{"id": link_id}, {"short_id": link_id}], "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    return link


@payment_links_router.put("/{link_id}")
async def update_payment_link(link_id: str, update: PaymentLinkUpdate, current_user: dict = Depends(lambda: get_current_user)):
    """Update a payment link"""
    link = await db.payment_links.find_one(
        {"$or": [{"id": link_id}, {"short_id": link_id}], "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if update.title is not None:
        update_data["title"] = update.title
    if update.description is not None:
        update_data["description"] = update.description
    if update.amount is not None:
        update_data["amount"] = update.amount
    if update.is_active is not None:
        update_data["is_active"] = update.is_active
    
    await db.payment_links.update_one({"id": link["id"]}, {"$set": update_data})
    return {"message": "Payment link updated"}


@payment_links_router.delete("/{link_id}")
async def delete_payment_link(link_id: str, current_user: dict = Depends(lambda: get_current_user)):
    """Delete a payment link"""
    result = await db.payment_links.delete_one(
        {"$or": [{"id": link_id}, {"short_id": link_id}], "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment link not found")
    return {"message": "Payment link deleted"}


@payment_links_router.get("/{link_id}/payments")
async def get_link_payments(link_id: str, current_user: dict = Depends(lambda: get_current_user)):
    """Get all payments for a specific link"""
    link = await db.payment_links.find_one(
        {"$or": [{"id": link_id}, {"short_id": link_id}], "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    
    payments = await db.link_payments.find(
        {"link_id": link["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"payments": payments}


# Public endpoint - no auth required
@payment_links_router.get("/public/{short_id}")
async def get_public_payment_link(short_id: str):
    """Get payment link details for public payment page"""
    link = await db.payment_links.find_one(
        {"short_id": short_id, "is_active": True},
        {"_id": 0, "user_id": 0}
    )
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found or inactive")
    
    return {
        "id": link["id"],
        "short_id": link["short_id"],
        "title": link["title"],
        "description": link.get("description"),
        "amount": link["amount"],
        "currency": link["currency"],
        "recipient_name": link.get("recipient_name")
    }


@payment_links_router.post("/public/{short_id}/pay")
async def pay_payment_link(short_id: str, payer_name: str, payer_email: str, background_tasks: BackgroundTasks):
    """Process payment for a payment link (demo mode)"""
    link = await db.payment_links.find_one(
        {"short_id": short_id, "is_active": True},
        {"_id": 0}
    )
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found or inactive")
    
    now = datetime.now(timezone.utc).isoformat()
    payment_id = str(uuid.uuid4())
    
    # Create payment record
    payment_doc = {
        "id": payment_id,
        "link_id": link["id"],
        "payer_name": payer_name,
        "payer_email": payer_email,
        "amount": link["amount"],
        "currency": link["currency"],
        "status": "completed",
        "created_at": now
    }
    await db.link_payments.insert_one(payment_doc)
    
    # Update link stats
    await db.payment_links.update_one(
        {"id": link["id"]},
        {
            "$inc": {"total_collected": link["amount"], "payment_count": 1},
            "$set": {"updated_at": now}
        }
    )
    
    # Credit the link owner's wallet
    await db.wallets.update_one(
        {"user_id": link["user_id"], "currency": link["currency"]},
        {"$inc": {"balance": link["amount"]}, "$set": {"updated_at": now}}
    )
    
    # Create transaction record
    transaction_doc = {
        "id": str(uuid.uuid4()),
        "user_id": link["user_id"],
        "type": "payment_link_received",
        "amount": link["amount"],
        "currency": link["currency"],
        "status": "completed",
        "payment_link_id": link["id"],
        "payer_name": payer_name,
        "payer_email": payer_email,
        "description": f"Payment via link: {link['title']}",
        "created_at": now
    }
    await db.transactions.insert_one(transaction_doc)
    
    # Send notification to link owner
    if send_push_notification:
        background_tasks.add_task(
            send_push_notification,
            link["user_id"],
            "Payment Received",
            f"{payer_name} paid {link['amount']} {link['currency']} via {link['title']}"
        )
    
    return {
        "success": True,
        "payment_id": payment_id,
        "message": "Payment completed successfully",
        "demo_mode": True
    }


def setup_payment_links_routes(database, get_user_func, push_func):
    """Initialize the payment links routes with dependencies"""
    global db, get_current_user, send_push_notification
    
    db = database
    get_current_user = get_user_func
    send_push_notification = push_func
