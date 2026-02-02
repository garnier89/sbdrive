# Module Contact / Centre d'Aide
# Routes pour les tickets de support

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

# Create router
contact_router = APIRouter(prefix="/api/contact", tags=["Contact"])

# ==================== MODELS ====================

class TicketCreate(BaseModel):
    subject: str = Field(..., min_length=5, max_length=200)
    category: str  # technical, transaction, suggestion, security, other
    message: str = Field(..., min_length=10, max_length=2000)
    priority: str = "normal"  # low, normal, high, urgent

class TicketReply(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class TicketStatusUpdate(BaseModel):
    status: str  # open, in_progress, resolved, closed
    admin_note: Optional[str] = None

# ==================== CONFIGURATION ====================

TICKET_CATEGORIES = {
    "technical": {"name": "Problème technique", "icon": "🔧"},
    "transaction": {"name": "Transaction", "icon": "💳"},
    "account": {"name": "Mon compte", "icon": "👤"},
    "security": {"name": "Sécurité", "icon": "🔒"},
    "suggestion": {"name": "Suggestion", "icon": "💡"},
    "other": {"name": "Autre", "icon": "❓"}
}

TICKET_PRIORITIES = {
    "low": {"name": "Basse", "color": "gray"},
    "normal": {"name": "Normale", "color": "blue"},
    "high": {"name": "Haute", "color": "orange"},
    "urgent": {"name": "Urgente", "color": "red"}
}

TICKET_STATUSES = {
    "open": {"name": "Ouvert", "color": "blue"},
    "in_progress": {"name": "En cours", "color": "yellow"},
    "resolved": {"name": "Résolu", "color": "green"},
    "closed": {"name": "Fermé", "color": "gray"}
}

# ==================== ROUTE SETUP ====================

def setup_contact_routes(db, get_current_user, get_admin_user, send_push_notification, send_email_notification):
    """Setup contact routes with database access"""

    @contact_router.get("/categories")
    async def get_ticket_categories():
        """Get available ticket categories"""
        return {
            "categories": TICKET_CATEGORIES,
            "priorities": TICKET_PRIORITIES,
            "statuses": TICKET_STATUSES
        }

    @contact_router.post("/submit")
    async def submit_ticket(
        request: TicketCreate,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Submit a new support ticket"""
        user_id = current_user["id"]
        now = datetime.now(timezone.utc)
        
        # Validate category
        if request.category not in TICKET_CATEGORIES:
            raise HTTPException(status_code=400, detail="Catégorie invalide")
        
        # Generate ticket ID
        ticket_number = f"TKT-{uuid.uuid4().hex[:8].upper()}"
        ticket_id = str(uuid.uuid4())
        
        ticket = {
            "id": ticket_id,
            "ticket_number": ticket_number,
            "user_id": user_id,
            "user_name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user.get('email'),
            "user_email": current_user.get("email"),
            "user_phone": current_user.get("phone"),
            "subject": request.subject,
            "category": request.category,
            "category_name": TICKET_CATEGORIES[request.category]["name"],
            "priority": request.priority,
            "status": "open",
            "messages": [
                {
                    "id": str(uuid.uuid4()),
                    "sender_type": "user",
                    "sender_id": user_id,
                    "sender_name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
                    "message": request.message,
                    "created_at": now.isoformat()
                }
            ],
            "attachments": [],
            "admin_notes": [],
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "resolved_at": None,
            "closed_at": None
        }
        
        await db.support_tickets.insert_one(ticket)
        
        # Create notification for admins
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "new_ticket",
            "title": f"Nouveau ticket: {ticket_number}",
            "message": f"{ticket['user_name']} - {request.subject}",
            "ticket_id": ticket_id,
            "read": False,
            "created_at": now.isoformat()
        })
        
        # Send confirmation to user
        background_tasks.add_task(
            send_push_notification,
            user_id,
            "Ticket créé",
            f"Votre demande {ticket_number} a été enregistrée"
        )
        
        if current_user.get("email"):
            background_tasks.add_task(
                send_email_notification,
                current_user["email"],
                f"Ticket {ticket_number} créé",
                f"Votre demande a été enregistrée. Nous vous répondrons rapidement.\n\nSujet: {request.subject}\nCatégorie: {TICKET_CATEGORIES[request.category]['name']}",
                current_user.get("preferred_language", "fr")
            )
        
        return {
            "message": "Ticket créé avec succès",
            "ticket_id": ticket_id,
            "ticket_number": ticket_number,
            "status": "open"
        }

    @contact_router.get("/tickets")
    async def get_user_tickets(
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's support tickets"""
        user_id = current_user["id"]
        
        query = {"user_id": user_id}
        if status:
            query["status"] = status
        
        tickets = await db.support_tickets.find(
            query,
            {"_id": 0, "messages": 0, "admin_notes": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        
        total = await db.support_tickets.count_documents(query)
        
        # Count by status
        status_counts = {}
        for s in TICKET_STATUSES.keys():
            status_counts[s] = await db.support_tickets.count_documents({
                "user_id": user_id,
                "status": s
            })
        
        return {
            "tickets": tickets,
            "count": len(tickets),
            "total": total,
            "status_counts": status_counts
        }

    @contact_router.get("/tickets/{ticket_id}")
    async def get_ticket_details(
        ticket_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get ticket details with messages"""
        ticket = await db.support_tickets.find_one(
            {"id": ticket_id, "user_id": current_user["id"]},
            {"_id": 0, "admin_notes": 0}
        )
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket non trouvé")
        
        return {"ticket": ticket}

    @contact_router.post("/tickets/{ticket_id}/reply")
    async def reply_to_ticket(
        ticket_id: str,
        request: TicketReply,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Add a reply to a ticket"""
        ticket = await db.support_tickets.find_one({
            "id": ticket_id,
            "user_id": current_user["id"]
        })
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket non trouvé")
        
        if ticket["status"] == "closed":
            raise HTTPException(status_code=400, detail="Ce ticket est fermé")
        
        now = datetime.now(timezone.utc)
        
        new_message = {
            "id": str(uuid.uuid4()),
            "sender_type": "user",
            "sender_id": current_user["id"],
            "sender_name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
            "message": request.message,
            "created_at": now.isoformat()
        }
        
        await db.support_tickets.update_one(
            {"id": ticket_id},
            {
                "$push": {"messages": new_message},
                "$set": {
                    "status": "open" if ticket["status"] == "resolved" else ticket["status"],
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Notify admins
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "ticket_reply",
            "title": f"Réponse: {ticket['ticket_number']}",
            "message": request.message[:100] + "..." if len(request.message) > 100 else request.message,
            "ticket_id": ticket_id,
            "read": False,
            "created_at": now.isoformat()
        })
        
        return {"message": "Réponse envoyée", "message_id": new_message["id"]}

    # ==================== ADMIN ROUTES ====================

    @contact_router.get("/admin/tickets")
    async def get_all_tickets(
        status: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Get all support tickets (admin only)"""
        query = {}
        if status:
            query["status"] = status
        if category:
            query["category"] = category
        if priority:
            query["priority"] = priority
        
        tickets = await db.support_tickets.find(
            query,
            {"_id": 0, "messages": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        
        total = await db.support_tickets.count_documents(query)
        
        # Stats
        stats = {
            "total": await db.support_tickets.count_documents({}),
            "open": await db.support_tickets.count_documents({"status": "open"}),
            "in_progress": await db.support_tickets.count_documents({"status": "in_progress"}),
            "resolved": await db.support_tickets.count_documents({"status": "resolved"}),
            "closed": await db.support_tickets.count_documents({"status": "closed"})
        }
        
        return {
            "tickets": tickets,
            "count": len(tickets),
            "total": total,
            "stats": stats
        }

    @contact_router.get("/admin/tickets/{ticket_id}")
    async def get_ticket_admin(
        ticket_id: str,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Get ticket details (admin only)"""
        ticket = await db.support_tickets.find_one(
            {"id": ticket_id},
            {"_id": 0}
        )
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket non trouvé")
        
        return {"ticket": ticket}

    @contact_router.post("/admin/tickets/{ticket_id}/reply")
    async def admin_reply_to_ticket(
        ticket_id: str,
        request: TicketReply,
        background_tasks: BackgroundTasks,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Admin reply to a ticket"""
        ticket = await db.support_tickets.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket non trouvé")
        
        now = datetime.now(timezone.utc)
        
        new_message = {
            "id": str(uuid.uuid4()),
            "sender_type": "admin",
            "sender_id": current_admin["id"],
            "sender_name": f"{current_admin.get('first_name', '')} {current_admin.get('last_name', '')}".strip() or "Support SB Pay",
            "message": request.message,
            "created_at": now.isoformat()
        }
        
        await db.support_tickets.update_one(
            {"id": ticket_id},
            {
                "$push": {"messages": new_message},
                "$set": {
                    "status": "in_progress",
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Notify user
        background_tasks.add_task(
            send_push_notification,
            ticket["user_id"],
            f"Réponse ticket {ticket['ticket_number']}",
            request.message[:100] + "..." if len(request.message) > 100 else request.message
        )
        
        return {"message": "Réponse envoyée", "message_id": new_message["id"]}

    @contact_router.put("/admin/tickets/{ticket_id}/status")
    async def update_ticket_status(
        ticket_id: str,
        request: TicketStatusUpdate,
        background_tasks: BackgroundTasks,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Update ticket status (admin only)"""
        ticket = await db.support_tickets.find_one({"id": ticket_id})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket non trouvé")
        
        if request.status not in TICKET_STATUSES:
            raise HTTPException(status_code=400, detail="Statut invalide")
        
        now = datetime.now(timezone.utc)
        
        update_data = {
            "status": request.status,
            "updated_at": now.isoformat()
        }
        
        if request.status == "resolved":
            update_data["resolved_at"] = now.isoformat()
        elif request.status == "closed":
            update_data["closed_at"] = now.isoformat()
        
        if request.admin_note:
            await db.support_tickets.update_one(
                {"id": ticket_id},
                {
                    "$push": {
                        "admin_notes": {
                            "admin_id": current_admin["id"],
                            "note": request.admin_note,
                            "created_at": now.isoformat()
                        }
                    }
                }
            )
        
        await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
        
        # Notify user
        status_messages = {
            "in_progress": "est maintenant en cours de traitement",
            "resolved": "a été résolu",
            "closed": "a été fermé"
        }
        
        if request.status in status_messages:
            background_tasks.add_task(
                send_push_notification,
                ticket["user_id"],
                f"Ticket {ticket['ticket_number']}",
                f"Votre ticket {status_messages[request.status]}"
            )
        
        return {"message": f"Statut mis à jour: {TICKET_STATUSES[request.status]['name']}"}

    return contact_router
