# Module Notifications par Zone/Pays
# Routes pour l'envoi de notifications ciblées par zone géographique

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import asyncio

# Create router
notifications_zone_router = APIRouter(prefix="/api/notifications", tags=["Notifications Zone"])

# ==================== MODELS ====================

class NotificationSend(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=500)
    target_zones: List[str] = []  # Cities/regions
    target_countries: List[str] = []  # Country codes
    target_user_types: List[str] = []  # user, merchant, premium
    channels: List[str] = ["push"]  # push, sms, email, whatsapp
    scheduled_at: Optional[str] = None  # ISO format, null for immediate
    link_url: Optional[str] = None  # Deep link or URL
    priority: str = "normal"  # low, normal, high, urgent

class NotificationFilter(BaseModel):
    status: Optional[str] = None  # sent, scheduled, cancelled, failed
    channel: Optional[str] = None
    country: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

# ==================== CONFIGURATION ====================

# Supported countries with their zones/cities
COUNTRIES_ZONES = {
    "SN": {
        "name": "Sénégal",
        "zones": ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Touba", "Rufisque"]
    },
    "CI": {
        "name": "Côte d'Ivoire", 
        "zones": ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro", "Korhogo", "Daloa"]
    },
    "ML": {
        "name": "Mali",
        "zones": ["Bamako", "Sikasso", "Mopti", "Ségou", "Kayes"]
    },
    "BF": {
        "name": "Burkina Faso",
        "zones": ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"]
    },
    "BJ": {
        "name": "Bénin",
        "zones": ["Cotonou", "Porto-Novo", "Parakou", "Abomey-Calavi"]
    },
    "TG": {
        "name": "Togo",
        "zones": ["Lomé", "Kara", "Sokodé", "Kpalimé"]
    },
    "CM": {
        "name": "Cameroun",
        "zones": ["Douala", "Yaoundé", "Garoua", "Bafoussam", "Bamenda"]
    },
    "GH": {
        "name": "Ghana",
        "zones": ["Accra", "Kumasi", "Tamale", "Takoradi"]
    },
    "NG": {
        "name": "Nigeria",
        "zones": ["Lagos", "Abuja", "Kano", "Port Harcourt", "Ibadan"]
    },
    "FR": {
        "name": "France",
        "zones": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice"]
    }
}

# Notification channels
NOTIFICATION_CHANNELS = {
    "push": {"name": "Push App", "icon": "bell", "available": True},
    "sms": {"name": "SMS", "icon": "message-square", "available": True, "demo": True},
    "email": {"name": "Email", "icon": "mail", "available": True, "demo": True},
    "whatsapp": {"name": "WhatsApp", "icon": "message-circle", "available": True, "demo": True}
}

# ==================== HELPER FUNCTIONS ====================

def generate_notification_id() -> str:
    return f"notif-{uuid.uuid4().hex[:12]}"

# ==================== ROUTE SETUP ====================

def setup_notifications_zone_routes(db, get_admin_user, send_push_notification, send_sms_notification, send_email_notification):
    """Setup notification zone routes with database access"""
    
    @notifications_zone_router.get("/zones")
    async def get_available_zones(
        current_admin: dict = Depends(get_admin_user)
    ):
        """Get all available countries and zones for targeting"""
        return {
            "countries": COUNTRIES_ZONES,
            "channels": NOTIFICATION_CHANNELS
        }

    @notifications_zone_router.get("/filter-users")
    async def filter_users_by_zone(
        countries: Optional[str] = None,  # Comma-separated country codes
        zones: Optional[str] = None,  # Comma-separated zone names
        user_types: Optional[str] = None,  # Comma-separated user types
        current_admin: dict = Depends(get_admin_user)
    ):
        """Get count of users matching the filter criteria"""
        query = {"is_active": True}
        
        # Parse filters
        country_list = countries.split(",") if countries else []
        zone_list = zones.split(",") if zones else []
        type_list = user_types.split(",") if user_types else []
        
        if country_list:
            query["country"] = {"$in": [c.upper() for c in country_list]}
        
        # For zones, we'd need a city/zone field on users
        # For now, filter by country as proxy
        
        if type_list:
            if "merchant" in type_list:
                query["is_merchant"] = True
            if "premium" in type_list:
                query["subscription_tier"] = {"$in": ["gold", "platinum", "diamond"]}
        
        count = await db.users.count_documents(query)
        
        # Get sample users for preview
        sample_users = await db.users.find(
            query,
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "country": 1, "phone": 1}
        ).limit(5).to_list(5)
        
        return {
            "total_recipients": count,
            "sample_users": sample_users,
            "filters_applied": {
                "countries": country_list,
                "zones": zone_list,
                "user_types": type_list
            }
        }

    @notifications_zone_router.post("/send")
    async def send_targeted_notification(
        request: NotificationSend,
        background_tasks: BackgroundTasks,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Send a targeted notification to users by zone/country"""
        admin_id = current_admin["id"]
        now = datetime.now(timezone.utc)
        
        # Build user query
        user_query = {"is_active": True}
        
        if request.target_countries:
            user_query["country"] = {"$in": [c.upper() for c in request.target_countries]}
        
        if request.target_user_types:
            if "merchant" in request.target_user_types:
                user_query["is_merchant"] = True
            if "premium" in request.target_user_types:
                user_query["subscription_tier"] = {"$in": ["gold", "platinum", "diamond"]}
        
        # Get recipient count
        recipient_count = await db.users.count_documents(user_query)
        
        if recipient_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Aucun utilisateur ne correspond aux critères de ciblage"
            )
        
        # Create notification record
        notification_id = generate_notification_id()
        
        is_scheduled = request.scheduled_at is not None
        scheduled_time = None
        if is_scheduled:
            try:
                scheduled_time = datetime.fromisoformat(request.scheduled_at.replace('Z', '+00:00'))
            except:
                raise HTTPException(status_code=400, detail="Format de date invalide")
        
        notification_doc = {
            "id": notification_id,
            "admin_id": admin_id,
            "admin_email": current_admin.get("email"),
            "title": request.title,
            "message": request.message,
            "target_zones": request.target_zones,
            "target_countries": request.target_countries,
            "target_user_types": request.target_user_types,
            "channels": request.channels,
            "link_url": request.link_url,
            "priority": request.priority,
            "recipient_count": recipient_count,
            "sent_count": 0,
            "failed_count": 0,
            "opened_count": 0,
            "clicked_count": 0,
            "status": "scheduled" if is_scheduled else "sending",
            "scheduled_at": scheduled_time.isoformat() if scheduled_time else None,
            "sent_at": None if is_scheduled else now.isoformat(),
            "created_at": now.isoformat()
        }
        
        await db.notifications_campaigns.insert_one(notification_doc)
        
        # If not scheduled, send immediately
        if not is_scheduled:
            # Get all recipient user IDs
            recipients = await db.users.find(
                user_query,
                {"_id": 0, "id": 1, "email": 1, "phone": 1, "full_name": 1}
            ).to_list(length=None)
            
            # Send notifications in background
            async def send_notifications():
                sent = 0
                failed = 0
                
                for user in recipients:
                    try:
                        # Send to each channel
                        if "push" in request.channels:
                            await send_push_notification(
                                user["id"],
                                request.title,
                                request.message
                            )
                        
                        if "email" in request.channels and user.get("email"):
                            # Demo mode - log only
                            await db.notification_logs.insert_one({
                                "notification_id": notification_id,
                                "user_id": user["id"],
                                "channel": "email",
                                "to": user["email"],
                                "status": "sent",
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                        
                        if "sms" in request.channels and user.get("phone"):
                            # Demo mode - log only
                            await db.notification_logs.insert_one({
                                "notification_id": notification_id,
                                "user_id": user["id"],
                                "channel": "sms",
                                "to": user["phone"],
                                "status": "sent",
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                        
                        if "whatsapp" in request.channels and user.get("phone"):
                            # Demo mode - log only
                            await db.notification_logs.insert_one({
                                "notification_id": notification_id,
                                "user_id": user["id"],
                                "channel": "whatsapp",
                                "to": user["phone"],
                                "status": "sent",
                                "created_at": datetime.now(timezone.utc).isoformat()
                            })
                        
                        sent += 1
                    except Exception as e:
                        failed += 1
                
                # Update notification stats
                await db.notifications_campaigns.update_one(
                    {"id": notification_id},
                    {
                        "$set": {
                            "sent_count": sent,
                            "failed_count": failed,
                            "status": "sent",
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            
            background_tasks.add_task(send_notifications)
        
        # Log admin action
        await db.admin_logs.insert_one({
            "id": str(uuid.uuid4()),
            "admin_id": admin_id,
            "action": "send_notification",
            "target_type": "notification",
            "target_id": notification_id,
            "details": {
                "title": request.title,
                "recipient_count": recipient_count,
                "channels": request.channels,
                "scheduled": is_scheduled
            },
            "created_at": now.isoformat()
        })
        
        return {
            "status": "success",
            "notification_id": notification_id,
            "recipients_count": recipient_count,
            "channels": request.channels,
            "scheduled": is_scheduled,
            "scheduled_at": request.scheduled_at,
            "demo_mode": True
        }

    @notifications_zone_router.get("/history")
    async def get_notification_history(
        current_admin: dict = Depends(get_admin_user),
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ):
        """Get history of sent/scheduled notifications"""
        query = {}
        if status:
            query["status"] = status
        
        notifications = await db.notifications_campaigns.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(length=limit)
        
        total = await db.notifications_campaigns.count_documents(query)
        
        return {
            "notifications": notifications,
            "count": len(notifications),
            "total": total
        }

    @notifications_zone_router.get("/{notification_id}")
    async def get_notification_details(
        notification_id: str,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Get detailed information about a notification"""
        notification = await db.notifications_campaigns.find_one(
            {"id": notification_id},
            {"_id": 0}
        )
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification non trouvée")
        
        # Get delivery logs
        logs = await db.notification_logs.find(
            {"notification_id": notification_id},
            {"_id": 0}
        ).limit(100).to_list(length=100)
        
        # Calculate stats by channel
        channel_stats = {}
        for log in logs:
            channel = log.get("channel", "unknown")
            if channel not in channel_stats:
                channel_stats[channel] = {"sent": 0, "failed": 0}
            if log.get("status") == "sent":
                channel_stats[channel]["sent"] += 1
            else:
                channel_stats[channel]["failed"] += 1
        
        return {
            "notification": notification,
            "delivery_logs": logs[:20],  # First 20 logs
            "channel_stats": channel_stats
        }

    @notifications_zone_router.post("/cancel/{notification_id}")
    async def cancel_scheduled_notification(
        notification_id: str,
        current_admin: dict = Depends(get_admin_user)
    ):
        """Cancel a scheduled notification"""
        notification = await db.notifications_campaigns.find_one({
            "id": notification_id,
            "status": "scheduled"
        })
        
        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification non trouvée ou déjà envoyée"
            )
        
        await db.notifications_campaigns.update_one(
            {"id": notification_id},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancelled_by": current_admin["id"]
                }
            }
        )
        
        return {"message": "Notification annulée"}

    @notifications_zone_router.get("/stats/overview")
    async def get_notification_stats(
        current_admin: dict = Depends(get_admin_user)
    ):
        """Get overview statistics for notifications"""
        # Total notifications
        total = await db.notifications_campaigns.count_documents({})
        
        # By status
        sent = await db.notifications_campaigns.count_documents({"status": "sent"})
        scheduled = await db.notifications_campaigns.count_documents({"status": "scheduled"})
        cancelled = await db.notifications_campaigns.count_documents({"status": "cancelled"})
        
        # This month
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month = await db.notifications_campaigns.count_documents({
            "created_at": {"$gte": month_start.isoformat()}
        })
        
        # Total recipients reached
        pipeline = [
            {"$group": {"_id": None, "total_recipients": {"$sum": "$sent_count"}}}
        ]
        recipients_result = await db.notifications_campaigns.aggregate(pipeline).to_list(1)
        total_recipients = recipients_result[0]["total_recipients"] if recipients_result else 0
        
        return {
            "total_campaigns": total,
            "by_status": {
                "sent": sent,
                "scheduled": scheduled,
                "cancelled": cancelled
            },
            "this_month": this_month,
            "total_recipients_reached": total_recipients
        }

    return notifications_zone_router
