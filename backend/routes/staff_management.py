"""
Advanced Roles, Permissions and Activity Logs Management System
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import hashlib

router = APIRouter(prefix="/admin/staff", tags=["Admin Staff Management"])

# ==================== MODELS ====================

class StaffCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    password: str
    role_id: str
    country_ids: Optional[List[str]] = []  # Countries this staff can manage
    is_active: bool = True

class StaffUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[str] = None
    country_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None

class RoleCreate(BaseModel):
    name: str
    name_fr: str
    description: Optional[str] = None
    level: int = 10  # Lower = more powerful (1 = Super Admin)
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    name_fr: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    permissions: Optional[List[str]] = None

# Default roles
DEFAULT_ROLES = [
    {
        "id": "super_admin",
        "name": "Super Admin",
        "name_fr": "Super Administrateur",
        "description": "Full access to all features and settings",
        "level": 1,
        "permissions": ["*"]  # All permissions
    },
    {
        "id": "admin_country",
        "name": "Country Admin",
        "name_fr": "Admin Pays",
        "description": "Manages specific countries",
        "level": 2,
        "permissions": [
            "users.view", "users.edit", "users.block",
            "transactions.view", "transactions.validate",
            "kyc.view", "kyc.validate",
            "mobile_money.view", "mobile_money.manage",
            "withdrawals.view", "withdrawals.validate",
            "deposits.view", "deposits.validate",
            "notifications.send"
        ]
    },
    {
        "id": "support",
        "name": "Support",
        "name_fr": "Support Client",
        "description": "Customer support agent",
        "level": 5,
        "permissions": [
            "users.view",
            "transactions.view",
            "kyc.view",
            "tickets.view", "tickets.respond",
            "notifications.view"
        ]
    },
    {
        "id": "finance",
        "name": "Finance",
        "name_fr": "Finance",
        "description": "Financial operations manager",
        "level": 3,
        "permissions": [
            "transactions.view", "transactions.validate", "transactions.export",
            "withdrawals.view", "withdrawals.validate",
            "deposits.view", "deposits.validate",
            "reports.view", "reports.export",
            "analytics.view"
        ]
    },
    {
        "id": "kyc_validator",
        "name": "KYC Validator",
        "name_fr": "Validateur KYC",
        "description": "Validates user documents",
        "level": 6,
        "permissions": [
            "users.view",
            "kyc.view", "kyc.validate", "kyc.reject"
        ]
    },
    {
        "id": "agent_manager",
        "name": "Agent Manager",
        "name_fr": "Gestionnaire Agents",
        "description": "Manages partner agents",
        "level": 4,
        "permissions": [
            "partners.view", "partners.edit", "partners.validate",
            "partners.block", "partners.limits",
            "transactions.view"
        ]
    }
]

# All available permissions
AVAILABLE_PERMISSIONS = {
    "users": {
        "label": "Utilisateurs",
        "permissions": [
            {"id": "users.view", "label": "Voir", "description": "Voir la liste des utilisateurs"},
            {"id": "users.edit", "label": "Modifier", "description": "Modifier les profils utilisateurs"},
            {"id": "users.create", "label": "Créer", "description": "Créer des utilisateurs"},
            {"id": "users.delete", "label": "Supprimer", "description": "Supprimer des utilisateurs"},
            {"id": "users.block", "label": "Bloquer", "description": "Bloquer/Débloquer des utilisateurs"},
            {"id": "users.wallet", "label": "Wallet", "description": "Modifier le solde wallet"}
        ]
    },
    "transactions": {
        "label": "Transactions",
        "permissions": [
            {"id": "transactions.view", "label": "Voir", "description": "Voir les transactions"},
            {"id": "transactions.validate", "label": "Valider", "description": "Valider les transactions"},
            {"id": "transactions.reject", "label": "Rejeter", "description": "Rejeter les transactions"},
            {"id": "transactions.refund", "label": "Rembourser", "description": "Effectuer des remboursements"},
            {"id": "transactions.export", "label": "Exporter", "description": "Exporter les données"}
        ]
    },
    "deposits": {
        "label": "Dépôts",
        "permissions": [
            {"id": "deposits.view", "label": "Voir", "description": "Voir les dépôts"},
            {"id": "deposits.validate", "label": "Valider", "description": "Valider les dépôts"},
            {"id": "deposits.reject", "label": "Rejeter", "description": "Rejeter les dépôts"}
        ]
    },
    "withdrawals": {
        "label": "Retraits",
        "permissions": [
            {"id": "withdrawals.view", "label": "Voir", "description": "Voir les retraits"},
            {"id": "withdrawals.validate", "label": "Valider", "description": "Valider les retraits"},
            {"id": "withdrawals.reject", "label": "Rejeter", "description": "Rejeter les retraits"}
        ]
    },
    "kyc": {
        "label": "KYC / Documents",
        "permissions": [
            {"id": "kyc.view", "label": "Voir", "description": "Voir les documents KYC"},
            {"id": "kyc.validate", "label": "Valider", "description": "Valider les documents"},
            {"id": "kyc.reject", "label": "Rejeter", "description": "Rejeter les documents"}
        ]
    },
    "mobile_money": {
        "label": "Mobile Money",
        "permissions": [
            {"id": "mobile_money.view", "label": "Voir", "description": "Voir la configuration Mobile Money"},
            {"id": "mobile_money.manage", "label": "Gérer", "description": "Gérer les opérateurs et services"}
        ]
    },
    "partners": {
        "label": "Partenaires / Agents",
        "permissions": [
            {"id": "partners.view", "label": "Voir", "description": "Voir les partenaires"},
            {"id": "partners.edit", "label": "Modifier", "description": "Modifier les partenaires"},
            {"id": "partners.create", "label": "Créer", "description": "Créer des partenaires"},
            {"id": "partners.validate", "label": "Valider", "description": "Valider les inscriptions"},
            {"id": "partners.block", "label": "Bloquer", "description": "Bloquer/Débloquer"},
            {"id": "partners.limits", "label": "Limites", "description": "Modifier les plafonds"}
        ]
    },
    "notifications": {
        "label": "Notifications",
        "permissions": [
            {"id": "notifications.view", "label": "Voir", "description": "Voir les notifications"},
            {"id": "notifications.send", "label": "Envoyer", "description": "Envoyer des notifications"}
        ]
    },
    "tickets": {
        "label": "Support / Tickets",
        "permissions": [
            {"id": "tickets.view", "label": "Voir", "description": "Voir les tickets"},
            {"id": "tickets.respond", "label": "Répondre", "description": "Répondre aux tickets"},
            {"id": "tickets.close", "label": "Fermer", "description": "Fermer les tickets"}
        ]
    },
    "reports": {
        "label": "Rapports",
        "permissions": [
            {"id": "reports.view", "label": "Voir", "description": "Voir les rapports"},
            {"id": "reports.export", "label": "Exporter", "description": "Exporter les rapports"}
        ]
    },
    "analytics": {
        "label": "Analytics",
        "permissions": [
            {"id": "analytics.view", "label": "Voir", "description": "Voir les analytics"}
        ]
    },
    "settings": {
        "label": "Paramètres",
        "permissions": [
            {"id": "settings.view", "label": "Voir", "description": "Voir les paramètres"},
            {"id": "settings.edit", "label": "Modifier", "description": "Modifier les paramètres"},
            {"id": "settings.zones", "label": "Zones", "description": "Gérer les zones"},
            {"id": "settings.currencies", "label": "Devises", "description": "Gérer les devises"},
            {"id": "settings.gateways", "label": "Passerelles", "description": "Gérer les passerelles"}
        ]
    },
    "staff": {
        "label": "Personnel Admin",
        "permissions": [
            {"id": "staff.view", "label": "Voir", "description": "Voir le personnel"},
            {"id": "staff.create", "label": "Créer", "description": "Créer des comptes staff"},
            {"id": "staff.edit", "label": "Modifier", "description": "Modifier les comptes"},
            {"id": "staff.delete", "label": "Supprimer", "description": "Supprimer des comptes"},
            {"id": "staff.roles", "label": "Rôles", "description": "Gérer les rôles"}
        ]
    }
}


def get_staff_router(db, get_admin_user):
    """Create staff management router with database dependency"""
    
    # ==================== HELPER FUNCTIONS ====================
    
    async def log_activity(admin_id: str, admin_email: str, action: str, module: str, target_id: str = None, details: dict = None, request: Request = None):
        """Log admin activity"""
        log_entry = {
            "id": str(uuid.uuid4()),
            "admin_id": admin_id,
            "admin_email": admin_email,
            "action": action,
            "module": module,
            "target_id": target_id,
            "details": details or {},
            "ip_address": request.client.host if request else None,
            "user_agent": request.headers.get("user-agent") if request else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.activity_logs.insert_one(log_entry)
        return log_entry
    
    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    
    # ==================== INITIALIZATION ====================
    
    @router.post("/init")
    async def initialize_staff_system(admin: dict = Depends(get_admin_user)):
        """Initialize default roles"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if roles exist
        existing = await db.staff_roles.count_documents({})
        if existing > 0:
            return {"message": "Staff system already initialized", "roles_count": existing}
        
        # Insert default roles
        for role in DEFAULT_ROLES:
            role_doc = {
                **role,
                "created_at": now,
                "updated_at": now,
                "is_system": True  # Cannot be deleted
            }
            await db.staff_roles.insert_one(role_doc)
        
        return {"message": f"Initialized {len(DEFAULT_ROLES)} roles successfully"}
    
    # ==================== PERMISSIONS CATALOG ====================
    
    @router.get("/permissions")
    async def get_permissions_catalog(admin: dict = Depends(get_admin_user)):
        """Get all available permissions grouped by module"""
        return {"permissions": AVAILABLE_PERMISSIONS}
    
    # ==================== ROLES MANAGEMENT ====================
    
    @router.get("/roles")
    async def get_all_roles(admin: dict = Depends(get_admin_user)):
        """Get all roles"""
        roles = await db.staff_roles.find({}, {"_id": 0}).sort("level", 1).to_list(100)
        
        if not roles:
            # Auto-initialize
            await initialize_staff_system(admin)
            roles = await db.staff_roles.find({}, {"_id": 0}).sort("level", 1).to_list(100)
        
        return {"roles": roles}
    
    @router.post("/roles")
    async def create_role(data: RoleCreate, request: Request, admin: dict = Depends(get_admin_user)):
        """Create a new role"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if role name exists
        existing = await db.staff_roles.find_one({"name": data.name})
        if existing:
            raise HTTPException(status_code=400, detail="Role name already exists")
        
        role_doc = {
            "id": str(uuid.uuid4()),
            **data.dict(),
            "is_system": False,
            "created_at": now,
            "updated_at": now
        }
        
        await db.staff_roles.insert_one(role_doc)
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "create_role", "staff",
            role_doc["id"],
            {"role_name": data.name},
            request
        )
        
        return {"message": "Role created successfully", "role_id": role_doc["id"]}
    
    @router.put("/roles/{role_id}")
    async def update_role(role_id: str, data: RoleUpdate, request: Request, admin: dict = Depends(get_admin_user)):
        """Update a role"""
        now = datetime.now(timezone.utc).isoformat()
        
        role = await db.staff_roles.find_one({"id": role_id})
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        if role.get("is_system") and role_id == "super_admin":
            raise HTTPException(status_code=400, detail="Cannot modify Super Admin role")
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        await db.staff_roles.update_one({"id": role_id}, {"$set": update_data})
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "update_role", "staff",
            role_id,
            {"changes": update_data},
            request
        )
        
        return {"message": "Role updated successfully"}
    
    @router.delete("/roles/{role_id}")
    async def delete_role(role_id: str, request: Request, admin: dict = Depends(get_admin_user)):
        """Delete a role"""
        role = await db.staff_roles.find_one({"id": role_id})
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        if role.get("is_system"):
            raise HTTPException(status_code=400, detail="Cannot delete system role")
        
        # Check if any staff has this role
        staff_count = await db.admin_staff.count_documents({"role_id": role_id})
        if staff_count > 0:
            raise HTTPException(status_code=400, detail=f"Cannot delete role: {staff_count} staff members have this role")
        
        await db.staff_roles.delete_one({"id": role_id})
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "delete_role", "staff",
            role_id,
            {"role_name": role.get("name")},
            request
        )
        
        return {"message": "Role deleted successfully"}
    
    # ==================== STAFF MANAGEMENT ====================
    
    @router.get("/members")
    async def get_all_staff(
        role_id: str = None,
        is_active: bool = None,
        search: str = None,
        admin: dict = Depends(get_admin_user)
    ):
        """Get all staff members"""
        query = {}
        if role_id:
            query["role_id"] = role_id
        if is_active is not None:
            query["is_active"] = is_active
        
        staff = await db.admin_staff.find(query, {"_id": 0, "password_hash": 0}).to_list(500)
        
        # Enrich with role info
        for member in staff:
            role = await db.staff_roles.find_one({"id": member.get("role_id")}, {"_id": 0})
            member["role"] = role
        
        # Filter by search
        if search:
            search_lower = search.lower()
            staff = [s for s in staff if 
                     search_lower in s.get("first_name", "").lower() or
                     search_lower in s.get("last_name", "").lower() or
                     search_lower in s.get("email", "").lower()]
        
        return {"staff": staff, "total": len(staff)}
    
    @router.get("/members/{staff_id}")
    async def get_staff_member(staff_id: str, admin: dict = Depends(get_admin_user)):
        """Get a specific staff member"""
        member = await db.admin_staff.find_one({"id": staff_id}, {"_id": 0, "password_hash": 0})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        # Add role info
        role = await db.staff_roles.find_one({"id": member.get("role_id")}, {"_id": 0})
        member["role"] = role
        
        # Get recent activity
        activity = await db.activity_logs.find(
            {"admin_id": staff_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(20).to_list(20)
        member["recent_activity"] = activity
        
        return member
    
    @router.post("/members")
    async def create_staff_member(data: StaffCreate, request: Request, admin: dict = Depends(get_admin_user)):
        """Create a new staff member"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if email exists
        existing = await db.admin_staff.find_one({"email": data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Verify role exists
        role = await db.staff_roles.find_one({"id": data.role_id})
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        
        staff_doc = {
            "id": str(uuid.uuid4()),
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email": data.email,
            "phone": data.phone,
            "password_hash": hash_password(data.password),
            "role_id": data.role_id,
            "country_ids": data.country_ids,
            "custom_permissions": [],  # Additional permissions beyond role
            "is_active": data.is_active,
            "last_login": None,
            "login_count": 0,
            "created_at": now,
            "updated_at": now,
            "created_by": admin.get("email")
        }
        
        await db.admin_staff.insert_one(staff_doc)
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "create_staff", "staff",
            staff_doc["id"],
            {"email": data.email, "role": role.get("name_fr")},
            request
        )
        
        return {"message": "Staff member created successfully", "staff_id": staff_doc["id"]}
    
    @router.put("/members/{staff_id}")
    async def update_staff_member(staff_id: str, data: StaffUpdate, request: Request, admin: dict = Depends(get_admin_user)):
        """Update a staff member"""
        now = datetime.now(timezone.utc).isoformat()
        
        member = await db.admin_staff.find_one({"id": staff_id})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        update_data = {k: v for k, v in data.dict().items() if v is not None}
        update_data["updated_at"] = now
        
        await db.admin_staff.update_one({"id": staff_id}, {"$set": update_data})
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "update_staff", "staff",
            staff_id,
            {"changes": list(update_data.keys())},
            request
        )
        
        return {"message": "Staff member updated successfully"}
    
    @router.put("/members/{staff_id}/permissions")
    async def update_staff_permissions(staff_id: str, permissions: List[str], request: Request, admin: dict = Depends(get_admin_user)):
        """Update custom permissions for a staff member"""
        now = datetime.now(timezone.utc).isoformat()
        
        member = await db.admin_staff.find_one({"id": staff_id})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        await db.admin_staff.update_one(
            {"id": staff_id},
            {"$set": {"custom_permissions": permissions, "updated_at": now}}
        )
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "update_permissions", "staff",
            staff_id,
            {"permissions_count": len(permissions)},
            request
        )
        
        return {"message": "Permissions updated successfully"}
    
    @router.put("/members/{staff_id}/toggle")
    async def toggle_staff_status(staff_id: str, request: Request, admin: dict = Depends(get_admin_user)):
        """Toggle staff active status"""
        now = datetime.now(timezone.utc).isoformat()
        
        member = await db.admin_staff.find_one({"id": staff_id})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        new_status = not member.get("is_active", True)
        
        await db.admin_staff.update_one(
            {"id": staff_id},
            {"$set": {"is_active": new_status, "updated_at": now}}
        )
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "toggle_staff_status", "staff",
            staff_id,
            {"new_status": "active" if new_status else "inactive"},
            request
        )
        
        return {"message": f"Staff member {'activated' if new_status else 'deactivated'}", "is_active": new_status}
    
    @router.delete("/members/{staff_id}")
    async def delete_staff_member(staff_id: str, request: Request, admin: dict = Depends(get_admin_user)):
        """Delete a staff member"""
        member = await db.admin_staff.find_one({"id": staff_id})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        
        # Cannot delete yourself
        if member.get("email") == admin.get("email"):
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        await db.admin_staff.delete_one({"id": staff_id})
        
        # Log activity
        await log_activity(
            admin.get("id"), admin.get("email"),
            "delete_staff", "staff",
            staff_id,
            {"email": member.get("email")},
            request
        )
        
        return {"message": "Staff member deleted successfully"}
    
    # ==================== ACTIVITY LOGS ====================
    
    @router.get("/logs")
    async def get_activity_logs(
        admin_id: str = None,
        module: str = None,
        action: str = None,
        limit: int = 100,
        skip: int = 0,
        admin: dict = Depends(get_admin_user)
    ):
        """Get activity logs"""
        query = {}
        if admin_id:
            query["admin_id"] = admin_id
        if module:
            query["module"] = module
        if action:
            query["action"] = action
        
        logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await db.activity_logs.count_documents(query)
        
        return {"logs": logs, "total": total}
    
    @router.get("/logs/stats")
    async def get_logs_stats(admin: dict = Depends(get_admin_user)):
        """Get activity logs statistics"""
        # Total logs
        total = await db.activity_logs.count_documents({})
        
        # By module
        pipeline = [
            {"$group": {"_id": "$module", "count": {"$sum": 1}}}
        ]
        by_module = await db.activity_logs.aggregate(pipeline).to_list(100)
        
        # By action
        pipeline_action = [
            {"$group": {"_id": "$action", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        by_action = await db.activity_logs.aggregate(pipeline_action).to_list(10)
        
        # Most active admins
        pipeline_admin = [
            {"$group": {"_id": "$admin_email", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        by_admin = await db.activity_logs.aggregate(pipeline_admin).to_list(10)
        
        return {
            "total_logs": total,
            "by_module": {item["_id"]: item["count"] for item in by_module},
            "top_actions": [{"action": item["_id"], "count": item["count"]} for item in by_action],
            "top_admins": [{"email": item["_id"], "count": item["count"]} for item in by_admin]
        }
    
    return router
