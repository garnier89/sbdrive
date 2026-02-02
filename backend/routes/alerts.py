# Module Alertes & Permissions Dynamiques
# Alertes automatiques + RBAC avancé

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import asyncio

# Create router
alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts & Thresholds"])

# ==================== MODELS ====================

class AlertThresholdCreate(BaseModel):
    name: str
    metric: str  # daily_volume, daily_transactions, suspicious_activity, new_users, failed_transactions
    operator: str  # gt, lt, gte, lte, eq  (greater than, less than, etc.)
    value: float
    currency: str = "XOF"
    notify_email: bool = True
    notify_sms: bool = False
    notify_dashboard: bool = True
    is_active: bool = True

class AlertThresholdUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    is_active: Optional[bool] = None
    notify_email: Optional[bool] = None
    notify_sms: Optional[bool] = None
    notify_dashboard: Optional[bool] = None

# ==================== DEFAULT THRESHOLDS ====================

DEFAULT_THRESHOLDS = [
    {
        "name": "Volume journalier élevé",
        "metric": "daily_volume",
        "operator": "gte",
        "value": 10000000,  # 10M XOF
        "currency": "XOF",
        "severity": "info"
    },
    {
        "name": "Volume journalier critique",
        "metric": "daily_volume",
        "operator": "gte",
        "value": 50000000,  # 50M XOF
        "currency": "XOF",
        "severity": "warning"
    },
    {
        "name": "Transactions suspectes",
        "metric": "suspicious_activity",
        "operator": "gte",
        "value": 5,
        "currency": "XOF",
        "severity": "critical"
    },
    {
        "name": "Échecs transactions élevés",
        "metric": "failed_transactions",
        "operator": "gte",
        "value": 20,
        "currency": "XOF",
        "severity": "warning"
    },
    {
        "name": "Nouveaux utilisateurs (objectif)",
        "metric": "new_users",
        "operator": "gte",
        "value": 100,
        "currency": "XOF",
        "severity": "success"
    },
    {
        "name": "Carte en attente > 24h",
        "metric": "pending_cards",
        "operator": "gte",
        "value": 1,
        "currency": "XOF",
        "severity": "warning"
    },
    {
        "name": "Transaction unitaire élevée",
        "metric": "single_transaction",
        "operator": "gte",
        "value": 5000000,  # 5M XOF
        "currency": "XOF",
        "severity": "info"
    }
]

# ==================== DETAILED PERMISSIONS ====================

DETAILED_PERMISSIONS = {
    # Utilisateurs
    "users_view": {"label": "Voir utilisateurs", "module": "users", "category": "Utilisateurs"},
    "users_create": {"label": "Créer utilisateurs", "module": "users", "category": "Utilisateurs"},
    "users_edit": {"label": "Modifier utilisateurs", "module": "users", "category": "Utilisateurs"},
    "users_delete": {"label": "Supprimer utilisateurs", "module": "users", "category": "Utilisateurs"},
    "users_block": {"label": "Bloquer/Débloquer utilisateurs", "module": "users", "category": "Utilisateurs"},
    
    # Transactions
    "transactions_view": {"label": "Voir transactions", "module": "transactions", "category": "Transactions"},
    "transactions_validate": {"label": "Valider transactions", "module": "transactions", "category": "Transactions"},
    "transactions_reject": {"label": "Rejeter transactions", "module": "transactions", "category": "Transactions"},
    "transactions_refund": {"label": "Rembourser transactions", "module": "transactions", "category": "Transactions"},
    
    # Wallet
    "wallet_view": {"label": "Voir wallets", "module": "wallet", "category": "Wallet"},
    "wallet_credit": {"label": "Créditer wallet", "module": "wallet", "category": "Wallet"},
    "wallet_debit": {"label": "Débiter wallet", "module": "wallet", "category": "Wallet"},
    "wallet_limits": {"label": "Gérer limites wallet", "module": "wallet", "category": "Wallet"},
    
    # Passerelles paiement
    "gateways_view": {"label": "Voir passerelles", "module": "gateways", "category": "Passerelles Paiement"},
    "gateways_config": {"label": "Configurer passerelles", "module": "gateways", "category": "Passerelles Paiement"},
    "gateways_toggle": {"label": "Activer/Désactiver passerelles", "module": "gateways", "category": "Passerelles Paiement"},
    
    # Mobile Money
    "mobile_money_view": {"label": "Voir Mobile Money", "module": "mobile_money", "category": "Mobile Money"},
    "mobile_money_manage": {"label": "Gérer transferts MM", "module": "mobile_money", "category": "Mobile Money"},
    "mobile_money_operators": {"label": "Configurer opérateurs", "module": "mobile_money", "category": "Mobile Money"},
    
    # Banques
    "banks_view": {"label": "Voir banques", "module": "banks", "category": "Banques"},
    "banks_manage": {"label": "Gérer banques", "module": "banks", "category": "Banques"},
    
    # Devises
    "currencies_view": {"label": "Voir devises", "module": "currencies", "category": "Devises"},
    "currencies_manage": {"label": "Gérer devises", "module": "currencies", "category": "Devises"},
    "exchange_rates": {"label": "Modifier taux de change", "module": "currencies", "category": "Devises"},
    
    # Zones
    "zones_view": {"label": "Voir zones", "module": "zones", "category": "Zones Géographiques"},
    "zones_manage": {"label": "Gérer zones", "module": "zones", "category": "Zones Géographiques"},
    "zones_fees": {"label": "Configurer frais par zone", "module": "zones", "category": "Zones Géographiques"},
    
    # CMS
    "cms_view": {"label": "Voir contenu", "module": "cms", "category": "CMS / Contenu"},
    "cms_edit": {"label": "Modifier contenu", "module": "cms", "category": "CMS / Contenu"},
    "cms_delete": {"label": "Supprimer contenu", "module": "cms", "category": "CMS / Contenu"},
    
    # KYC / Documents
    "kyc_view": {"label": "Voir documents KYC", "module": "kyc", "category": "Documents / KYC"},
    "kyc_approve": {"label": "Approuver KYC", "module": "kyc", "category": "Documents / KYC"},
    "kyc_reject": {"label": "Rejeter KYC", "module": "kyc", "category": "Documents / KYC"},
    
    # Cartes
    "cards_view": {"label": "Voir cartes", "module": "cards", "category": "Sécurité / Cartes"},
    "cards_approve": {"label": "Approuver cartes", "module": "cards", "category": "Sécurité / Cartes"},
    "cards_block": {"label": "Bloquer cartes", "module": "cards", "category": "Sécurité / Cartes"},
    
    # Liens paiement
    "payment_links_view": {"label": "Voir liens paiement", "module": "payment_links", "category": "Liens de Paiement"},
    "payment_links_manage": {"label": "Gérer liens paiement", "module": "payment_links", "category": "Liens de Paiement"},
    
    # Logs
    "logs_view": {"label": "Voir logs admin", "module": "logs", "category": "Logs Administrateurs"},
    "logs_export": {"label": "Exporter logs", "module": "logs", "category": "Logs Administrateurs"},
    
    # Analytics
    "analytics_view": {"label": "Voir analytics", "module": "analytics", "category": "Analytics"},
    "analytics_export": {"label": "Exporter données", "module": "analytics", "category": "Analytics"},
    
    # Alertes
    "alerts_view": {"label": "Voir alertes", "module": "alerts", "category": "Alertes"},
    "alerts_manage": {"label": "Configurer alertes", "module": "alerts", "category": "Alertes"},
    
    # Administration
    "admins_view": {"label": "Voir administrateurs", "module": "admins", "category": "Administration"},
    "admins_create": {"label": "Créer administrateurs", "module": "admins", "category": "Administration"},
    "admins_edit": {"label": "Modifier administrateurs", "module": "admins", "category": "Administration"},
    "admins_delete": {"label": "Supprimer administrateurs", "module": "admins", "category": "Administration"},
    "roles_manage": {"label": "Gérer rôles", "module": "admins", "category": "Administration"},
    
    # Système
    "settings_view": {"label": "Voir paramètres", "module": "settings", "category": "Système"},
    "settings_manage": {"label": "Modifier paramètres", "module": "settings", "category": "Système"},
    "platform_suspend": {"label": "Suspendre plateforme", "module": "settings", "category": "Système"},
}

# ==================== SETUP ROUTES ====================

def setup_alerts_routes(db, get_admin_user):
    """Setup alerts and advanced permissions routes"""
    
    # ==================== ALERT THRESHOLDS ====================
    
    @alerts_router.get("/thresholds")
    async def get_alert_thresholds(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get all alert thresholds"""
        thresholds = await db.alert_thresholds.find({}, {"_id": 0}).to_list(length=100)
        
        # If no thresholds, return defaults
        if not thresholds:
            return {"thresholds": DEFAULT_THRESHOLDS, "is_default": True}
        
        return {"thresholds": thresholds, "is_default": False}
    
    @alerts_router.post("/thresholds")
    async def create_alert_threshold(
        data: AlertThresholdCreate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Create new alert threshold"""
        threshold = {
            "id": str(uuid.uuid4()),
            "name": data.name,
            "metric": data.metric,
            "operator": data.operator,
            "value": data.value,
            "currency": data.currency,
            "notify_email": data.notify_email,
            "notify_sms": data.notify_sms,
            "notify_dashboard": data.notify_dashboard,
            "is_active": data.is_active,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc),
            "last_triggered": None,
            "trigger_count": 0
        }
        
        await db.alert_thresholds.insert_one(threshold)
        threshold.pop("_id", None)
        return {"message": "Seuil d'alerte créé", "threshold": threshold}
    
    @alerts_router.put("/thresholds/{threshold_id}")
    async def update_alert_threshold(
        threshold_id: str,
        data: AlertThresholdUpdate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Update alert threshold"""
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.alert_thresholds.update_one(
            {"id": threshold_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Seuil non trouvé")
        
        return {"message": "Seuil mis à jour"}
    
    @alerts_router.delete("/thresholds/{threshold_id}")
    async def delete_alert_threshold(
        threshold_id: str,
        current_user: dict = Depends(get_admin_user)
    ):
        """Delete alert threshold"""
        result = await db.alert_thresholds.delete_one({"id": threshold_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Seuil non trouvé")
        
        return {"message": "Seuil supprimé"}
    
    # ==================== ALERT NOTIFICATIONS ====================
    
    @alerts_router.get("/notifications")
    async def get_alert_notifications(
        status: Optional[str] = None,  # unread, read, all
        limit: int = 50,
        current_user: dict = Depends(get_admin_user)
    ):
        """Get alert notifications"""
        query = {}
        if status == "unread":
            query["read"] = False
        elif status == "read":
            query["read"] = True
        
        notifications = await db.alert_notifications.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        unread_count = await db.alert_notifications.count_documents({"read": False})
        
        return {
            "notifications": notifications,
            "unread_count": unread_count
        }
    
    @alerts_router.put("/notifications/{notification_id}/read")
    async def mark_notification_read(
        notification_id: str,
        current_user: dict = Depends(get_admin_user)
    ):
        """Mark notification as read"""
        await db.alert_notifications.update_one(
            {"id": notification_id},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Notification marquée comme lue"}
    
    @alerts_router.put("/notifications/mark-all-read")
    async def mark_all_notifications_read(
        current_user: dict = Depends(get_admin_user)
    ):
        """Mark all notifications as read"""
        await db.alert_notifications.update_many(
            {"read": False},
            {"$set": {"read": True, "read_at": datetime.now(timezone.utc)}}
        )
        return {"message": "Toutes les notifications marquées comme lues"}
    
    # ==================== CHECK THRESHOLDS ====================
    
    @alerts_router.get("/check")
    async def check_thresholds(
        current_user: dict = Depends(get_admin_user)
    ):
        """Manually check all thresholds and generate alerts"""
        alerts = await check_all_thresholds(db)
        return {"alerts_generated": len(alerts), "alerts": alerts}
    
    @alerts_router.get("/current-metrics")
    async def get_current_metrics(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get current metric values for threshold comparison"""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Daily volume
        volume_pipeline = [
            {"$match": {"created_at": {"$gte": today_start.isoformat()}, "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        volume_result = await db.transactions.aggregate(volume_pipeline).to_list(length=1)
        daily_volume = volume_result[0]["total"] if volume_result else 0
        
        # Daily transactions
        daily_transactions = await db.transactions.count_documents({
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        # Failed transactions
        failed_transactions = await db.transactions.count_documents({
            "created_at": {"$gte": today_start.isoformat()},
            "status": "failed"
        })
        
        # New users today
        new_users = await db.users.count_documents({
            "role": "user",
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        # Pending cards > 24h
        yesterday = now - timedelta(hours=24)
        pending_cards = await db.cards.count_documents({
            "approval_status": "pending",
            "created_at": {"$lte": yesterday.isoformat()}
        })
        
        # Suspicious activity (velocity: more than 10 transactions in 1 hour per user)
        suspicious = 0  # Would need more complex aggregation
        
        return {
            "metrics": {
                "daily_volume": {"value": daily_volume, "currency": "XOF"},
                "daily_transactions": {"value": daily_transactions},
                "failed_transactions": {"value": failed_transactions},
                "new_users": {"value": new_users},
                "pending_cards": {"value": pending_cards},
                "suspicious_activity": {"value": suspicious}
            },
            "checked_at": now.isoformat()
        }
    
    # ==================== PERMISSIONS ====================
    
    @alerts_router.get("/permissions/catalog")
    async def get_permissions_catalog(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get full catalog of available permissions"""
        # Group by category
        categories = {}
        for perm_key, perm_info in DETAILED_PERMISSIONS.items():
            category = perm_info["category"]
            if category not in categories:
                categories[category] = []
            categories[category].append({
                "key": perm_key,
                "label": perm_info["label"],
                "module": perm_info["module"]
            })
        
        return {
            "permissions": DETAILED_PERMISSIONS,
            "by_category": categories
        }
    
    return alerts_router


async def check_all_thresholds(db):
    """Check all active thresholds and create alerts if needed"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get current metrics
    metrics = {}
    
    # Daily volume
    volume_pipeline = [
        {"$match": {"created_at": {"$gte": today_start.isoformat()}, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    volume_result = await db.transactions.aggregate(volume_pipeline).to_list(length=1)
    metrics["daily_volume"] = volume_result[0]["total"] if volume_result else 0
    
    # Daily transactions
    metrics["daily_transactions"] = await db.transactions.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # Failed transactions
    metrics["failed_transactions"] = await db.transactions.count_documents({
        "created_at": {"$gte": today_start.isoformat()},
        "status": "failed"
    })
    
    # New users
    metrics["new_users"] = await db.users.count_documents({
        "role": "user",
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # Pending cards
    yesterday = now - timedelta(hours=24)
    metrics["pending_cards"] = await db.cards.count_documents({
        "approval_status": "pending",
        "created_at": {"$lte": yesterday.isoformat()}
    })
    
    # Get active thresholds
    thresholds = await db.alert_thresholds.find({"is_active": True}, {"_id": 0}).to_list(length=100)
    
    # If no custom thresholds, use defaults
    if not thresholds:
        thresholds = DEFAULT_THRESHOLDS
    
    alerts = []
    
    for threshold in thresholds:
        metric_value = metrics.get(threshold["metric"], 0)
        threshold_value = threshold["value"]
        operator = threshold.get("operator", "gte")
        
        triggered = False
        if operator == "gt" and metric_value > threshold_value:
            triggered = True
        elif operator == "gte" and metric_value >= threshold_value:
            triggered = True
        elif operator == "lt" and metric_value < threshold_value:
            triggered = True
        elif operator == "lte" and metric_value <= threshold_value:
            triggered = True
        elif operator == "eq" and metric_value == threshold_value:
            triggered = True
        
        if triggered:
            # Create alert notification
            alert = {
                "id": str(uuid.uuid4()),
                "threshold_id": threshold.get("id"),
                "threshold_name": threshold["name"],
                "metric": threshold["metric"],
                "metric_value": metric_value,
                "threshold_value": threshold_value,
                "severity": threshold.get("severity", "info"),
                "message": f"{threshold['name']}: {metric_value:,.0f} (seuil: {threshold_value:,.0f})",
                "read": False,
                "created_at": now,
                "notify_email": threshold.get("notify_email", True),
                "notify_sms": threshold.get("notify_sms", False),
                "notify_dashboard": threshold.get("notify_dashboard", True)
            }
            
            # Check if same alert was created today (avoid duplicates)
            existing = await db.alert_notifications.find_one({
                "threshold_name": threshold["name"],
                "created_at": {"$gte": today_start}
            })
            
            if not existing:
                await db.alert_notifications.insert_one(alert)
                alerts.append(alert)
                
                # Update threshold trigger count
                if threshold.get("id"):
                    await db.alert_thresholds.update_one(
                        {"id": threshold["id"]},
                        {
                            "$set": {"last_triggered": now},
                            "$inc": {"trigger_count": 1}
                        }
                    )
    
    return alerts
