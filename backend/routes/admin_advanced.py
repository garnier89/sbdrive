# Module Sécurité & Gestion Avancée
# - Approbation des cartes
# - CMS Content Management
# - Super Admin & RBAC

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

# Create router
admin_advanced_router = APIRouter(prefix="/api/admin", tags=["Admin Advanced"])

# ==================== MODELS ====================

# Card Approval Models
class CardApprovalAction(BaseModel):
    card_id: str
    action: str  # approve, reject, block
    reason: Optional[str] = None

# CMS Models
class CMSContentCreate(BaseModel):
    key: str
    type: str  # text, image, html, json
    value: str
    language: str = "fr"
    category: str = "general"  # general, legal, marketing, fees, errors

class CMSContentUpdate(BaseModel):
    value: str
    language: Optional[str] = None

# Admin Management Models
class AdminCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "admin"  # admin, support, super_admin
    permissions: Optional[Dict[str, bool]] = None

class AdminUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[Dict[str, bool]] = None

class RoleCreate(BaseModel):
    role_name: str
    display_name: str
    permissions: Dict[str, bool]
    level: int  # 1=super_admin, 2=admin, 3=support, 4=user

# ==================== DEFAULT PERMISSIONS ====================

DEFAULT_PERMISSIONS = {
    "super_admin": {
        "users_view": True,
        "users_manage": True,
        "users_delete": True,
        "transactions_view": True,
        "transactions_manage": True,
        "wallets_credit": True,
        "wallets_debit": True,
        "cards_approve": True,
        "documents_view": True,
        "documents_approve": True,
        "zones_manage": True,
        "gateways_manage": True,
        "cms_view": True,
        "cms_edit": True,
        "admins_view": True,
        "admins_manage": True,
        "roles_manage": True,
        "logs_view": True,
        "settings_manage": True,
        "platform_suspend": True,
    },
    "admin": {
        "users_view": True,
        "users_manage": True,
        "users_delete": False,
        "transactions_view": True,
        "transactions_manage": True,
        "wallets_credit": True,
        "wallets_debit": True,
        "cards_approve": True,
        "documents_view": True,
        "documents_approve": True,
        "zones_manage": True,
        "gateways_manage": False,
        "cms_view": True,
        "cms_edit": True,
        "admins_view": False,
        "admins_manage": False,
        "roles_manage": False,
        "logs_view": True,
        "settings_manage": False,
        "platform_suspend": False,
    },
    "support": {
        "users_view": True,
        "users_manage": False,
        "users_delete": False,
        "transactions_view": True,
        "transactions_manage": False,
        "wallets_credit": False,
        "wallets_debit": False,
        "cards_approve": False,
        "documents_view": True,
        "documents_approve": False,
        "zones_manage": False,
        "gateways_manage": False,
        "cms_view": False,
        "cms_edit": False,
        "admins_view": False,
        "admins_manage": False,
        "roles_manage": False,
        "logs_view": False,
        "settings_manage": False,
        "platform_suspend": False,
    }
}

ROLE_LEVELS = {
    "super_admin": 1,
    "admin": 2,
    "support": 3,
    "user": 4
}

# ==================== HELPER FUNCTIONS ====================

def check_permission(user: dict, permission: str) -> bool:
    """Check if user has specific permission"""
    role = user.get("role", "user")
    if role == "super_admin":
        return True
    
    user_permissions = user.get("permissions", {})
    if user_permissions.get(permission):
        return True
    
    # Fall back to default role permissions
    default_perms = DEFAULT_PERMISSIONS.get(role, {})
    return default_perms.get(permission, False)

def get_client_info(request: Request) -> dict:
    """Extract client information from request"""
    return {
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", "unknown"),
        "country": request.headers.get("cf-ipcountry", "unknown")  # Cloudflare header
    }

async def log_admin_action(db, admin_id: str, action: str, module: str, target_id: str = None, details: dict = None, request: Request = None):
    """Log admin action for audit trail"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "action": action,
        "module": module,
        "target_id": target_id,
        "details": details or {},
        "ip": request.client.host if request and request.client else "unknown",
        "created_at": datetime.now(timezone.utc)
    }
    await db.admin_logs.insert_one(log_entry)

# ==================== SETUP ROUTES ====================

def setup_admin_advanced_routes(db, get_current_user, get_admin_user):
    """Setup all admin advanced routes"""
    
    import bcrypt
    
    # ==================== CARD APPROVAL ROUTES ====================
    
    @admin_advanced_router.get("/cards/pending")
    async def get_pending_cards(
        request: Request,
        current_user: dict = Depends(get_admin_user)
    ):
        """Get all cards pending approval"""
        if not check_permission(current_user, "cards_approve"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        cards = await db.cards.find(
            {"approval_status": "pending"},
            {"_id": 0}
        ).sort("created_at", -1).to_list(length=100)
        
        # Enrich with user info
        for card in cards:
            user = await db.users.find_one({"id": card.get("user_id")}, {"_id": 0, "email": 1, "full_name": 1})
            card["user"] = user
        
        return {"cards": cards}
    
    @admin_advanced_router.get("/cards/all")
    async def get_all_cards_admin(
        request: Request,
        status: Optional[str] = None,
        current_user: dict = Depends(get_admin_user)
    ):
        """Get all cards with optional status filter"""
        if not check_permission(current_user, "cards_approve"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        query = {"deleted": {"$ne": True}}
        if status:
            query["approval_status"] = status
        
        cards = await db.cards.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=200)
        
        # Enrich with user info
        for card in cards:
            user = await db.users.find_one({"id": card.get("user_id")}, {"_id": 0, "email": 1, "full_name": 1})
            card["user"] = user
        
        return {"cards": cards}
    
    @admin_advanced_router.post("/cards/approve")
    async def approve_card(
        request: Request,
        data: CardApprovalAction,
        current_user: dict = Depends(get_admin_user)
    ):
        """Approve, reject or block a card"""
        if not check_permission(current_user, "cards_approve"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        card = await db.cards.find_one({"id": data.card_id})
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        
        new_status = {
            "approve": "active",
            "reject": "rejected",
            "block": "blocked"
        }.get(data.action)
        
        if not new_status:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        await db.cards.update_one(
            {"id": data.card_id},
            {
                "$set": {
                    "approval_status": new_status,
                    "approved_by": current_user["id"],
                    "approved_at": datetime.now(timezone.utc),
                    "approval_reason": data.reason
                }
            }
        )
        
        # Log action
        await log_admin_action(
            db, current_user["id"], f"card_{data.action}", "cards",
            data.card_id, {"reason": data.reason}, request
        )
        
        # TODO: Send notification to user
        
        return {"message": f"Card {data.action}d successfully", "new_status": new_status}
    
    # ==================== CMS ROUTES ====================
    
    @admin_advanced_router.get("/cms")
    async def get_cms_content(
        category: Optional[str] = None,
        language: str = "fr",
        current_user: dict = Depends(get_admin_user)
    ):
        """Get CMS content"""
        if not check_permission(current_user, "cms_view"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        query = {"language": language}
        if category:
            query["category"] = category
        
        content = await db.cms_content.find(query, {"_id": 0}).to_list(length=500)
        return {"content": content}
    
    @admin_advanced_router.post("/cms")
    async def create_cms_content(
        request: Request,
        data: CMSContentCreate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Create new CMS content"""
        if not check_permission(current_user, "cms_edit"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Check if key already exists for this language
        existing = await db.cms_content.find_one({
            "key": data.key,
            "language": data.language
        })
        if existing:
            raise HTTPException(status_code=400, detail="Content key already exists for this language")
        
        content = {
            "id": str(uuid.uuid4()),
            "key": data.key,
            "type": data.type,
            "value": data.value,
            "language": data.language,
            "category": data.category,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.cms_content.insert_one(content)
        
        await log_admin_action(
            db, current_user["id"], "cms_create", "cms",
            content["id"], {"key": data.key}, request
        )
        
        content.pop("_id", None)
        return {"message": "Content created", "content": content}
    
    @admin_advanced_router.put("/cms/{content_id}")
    async def update_cms_content(
        content_id: str,
        request: Request,
        data: CMSContentUpdate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Update CMS content"""
        if not check_permission(current_user, "cms_edit"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        update_data = {
            "value": data.value,
            "updated_by": current_user["id"],
            "updated_at": datetime.now(timezone.utc)
        }
        if data.language:
            update_data["language"] = data.language
        
        result = await db.cms_content.update_one(
            {"id": content_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Content not found")
        
        await log_admin_action(
            db, current_user["id"], "cms_update", "cms",
            content_id, {"new_value": data.value[:100]}, request
        )
        
        return {"message": "Content updated"}
    
    @admin_advanced_router.delete("/cms/{content_id}")
    async def delete_cms_content(
        content_id: str,
        request: Request,
        current_user: dict = Depends(get_admin_user)
    ):
        """Delete CMS content"""
        if not check_permission(current_user, "cms_edit"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        result = await db.cms_content.delete_one({"id": content_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Content not found")
        
        await log_admin_action(
            db, current_user["id"], "cms_delete", "cms",
            content_id, {}, request
        )
        
        return {"message": "Content deleted"}
    
    # ==================== ADMIN MANAGEMENT ROUTES ====================
    
    @admin_advanced_router.get("/admins")
    async def get_all_admins(
        request: Request,
        current_user: dict = Depends(get_admin_user)
    ):
        """Get all admin users (Super Admin only)"""
        if not check_permission(current_user, "admins_view"):
            raise HTTPException(status_code=403, detail="Permission denied - Super Admin only")
        
        admins = await db.users.find(
            {"role": {"$in": ["admin", "support", "super_admin"]}},
            {"_id": 0, "password_hash": 0}
        ).to_list(length=100)
        
        return {"admins": admins}
    
    @admin_advanced_router.post("/admins")
    async def create_admin(
        request: Request,
        data: AdminCreate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Create new admin user (Super Admin only)"""
        if not check_permission(current_user, "admins_manage"):
            raise HTTPException(status_code=403, detail="Permission denied - Super Admin only")
        
        # Check role hierarchy - can't create higher level
        if ROLE_LEVELS.get(data.role, 99) <= ROLE_LEVELS.get(current_user.get("role"), 99):
            if current_user.get("role") != "super_admin":
                raise HTTPException(status_code=403, detail="Cannot create admin with equal or higher role")
        
        # Check if email exists
        existing = await db.users.find_one({"email": data.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Hash password
        password_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Get default permissions for role
        permissions = data.permissions or DEFAULT_PERMISSIONS.get(data.role, {})
        
        admin = {
            "id": str(uuid.uuid4()),
            "email": data.email,
            "password_hash": password_hash,
            "full_name": data.full_name,
            "role": data.role,
            "permissions": permissions,
            "is_active": True,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(admin)
        
        await log_admin_action(
            db, current_user["id"], "admin_create", "admins",
            admin["id"], {"email": data.email, "role": data.role}, request
        )
        
        admin.pop("_id", None)
        admin.pop("password_hash", None)
        return {"message": "Admin created", "admin": admin}
    
    @admin_advanced_router.put("/admins/{admin_id}")
    async def update_admin(
        admin_id: str,
        request: Request,
        data: AdminUpdate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Update admin user (Super Admin only)"""
        if not check_permission(current_user, "admins_manage"):
            raise HTTPException(status_code=403, detail="Permission denied - Super Admin only")
        
        # Get target admin
        target_admin = await db.users.find_one({"id": admin_id})
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Check role hierarchy
        target_level = ROLE_LEVELS.get(target_admin.get("role"), 99)
        current_level = ROLE_LEVELS.get(current_user.get("role"), 99)
        
        if target_level <= current_level and current_user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Cannot modify admin with equal or higher role")
        
        update_data = {}
        if data.full_name:
            update_data["full_name"] = data.full_name
        if data.role:
            # Can't promote to higher than self
            new_level = ROLE_LEVELS.get(data.role, 99)
            if new_level < current_level and current_user.get("role") != "super_admin":
                raise HTTPException(status_code=403, detail="Cannot promote to higher role than yourself")
            update_data["role"] = data.role
        if data.is_active is not None:
            update_data["is_active"] = data.is_active
        if data.permissions:
            update_data["permissions"] = data.permissions
        
        if update_data:
            update_data["updated_at"] = datetime.now(timezone.utc)
            await db.users.update_one({"id": admin_id}, {"$set": update_data})
        
        await log_admin_action(
            db, current_user["id"], "admin_update", "admins",
            admin_id, update_data, request
        )
        
        return {"message": "Admin updated"}
    
    @admin_advanced_router.delete("/admins/{admin_id}")
    async def delete_admin(
        admin_id: str,
        request: Request,
        current_user: dict = Depends(get_admin_user)
    ):
        """Delete/deactivate admin (Super Admin only)"""
        if not check_permission(current_user, "admins_manage"):
            raise HTTPException(status_code=403, detail="Permission denied - Super Admin only")
        
        if admin_id == current_user["id"]:
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        target_admin = await db.users.find_one({"id": admin_id})
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Check role hierarchy
        target_level = ROLE_LEVELS.get(target_admin.get("role"), 99)
        current_level = ROLE_LEVELS.get(current_user.get("role"), 99)
        
        if target_level <= current_level and current_user.get("role") != "super_admin":
            raise HTTPException(status_code=403, detail="Cannot delete admin with equal or higher role")
        
        # Soft delete - just deactivate
        await db.users.update_one(
            {"id": admin_id},
            {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
        )
        
        await log_admin_action(
            db, current_user["id"], "admin_delete", "admins",
            admin_id, {"email": target_admin.get("email")}, request
        )
        
        return {"message": "Admin deactivated"}
    
    # ==================== ROLES & PERMISSIONS ROUTES ====================
    
    @admin_advanced_router.get("/roles")
    async def get_roles(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get all roles and permissions"""
        if not check_permission(current_user, "roles_manage"):
            # Return limited info for non-super admins
            return {
                "roles": [
                    {"role_name": "admin", "display_name": "Administrateur", "level": 2},
                    {"role_name": "support", "display_name": "Support", "level": 3},
                ]
            }
        
        roles = await db.admin_roles.find({}, {"_id": 0}).to_list(length=50)
        
        # If no custom roles, return defaults
        if not roles:
            roles = [
                {"role_name": "super_admin", "display_name": "Super Administrateur", "level": 1, "permissions": DEFAULT_PERMISSIONS["super_admin"]},
                {"role_name": "admin", "display_name": "Administrateur", "level": 2, "permissions": DEFAULT_PERMISSIONS["admin"]},
                {"role_name": "support", "display_name": "Support", "level": 3, "permissions": DEFAULT_PERMISSIONS["support"]},
            ]
        
        return {"roles": roles, "available_permissions": list(DEFAULT_PERMISSIONS["super_admin"].keys())}
    
    @admin_advanced_router.post("/roles")
    async def create_role(
        request: Request,
        data: RoleCreate,
        current_user: dict = Depends(get_admin_user)
    ):
        """Create custom role (Super Admin only)"""
        if not check_permission(current_user, "roles_manage"):
            raise HTTPException(status_code=403, detail="Permission denied - Super Admin only")
        
        existing = await db.admin_roles.find_one({"role_name": data.role_name})
        if existing:
            raise HTTPException(status_code=400, detail="Role already exists")
        
        role = {
            "id": str(uuid.uuid4()),
            "role_name": data.role_name,
            "display_name": data.display_name,
            "permissions": data.permissions,
            "level": data.level,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.admin_roles.insert_one(role)
        
        await log_admin_action(
            db, current_user["id"], "role_create", "roles",
            role["id"], {"role_name": data.role_name}, request
        )
        
        role.pop("_id", None)
        return {"message": "Role created", "role": role}
    
    @admin_advanced_router.put("/roles/{role_name}")
    async def update_role_permissions(
        role_name: str,
        request: Request,
        permissions: Dict[str, bool],
        current_user: dict = Depends(get_admin_user)
    ):
        """Update role permissions (Super Admin only)"""
        if not check_permission(current_user, "roles_manage"):
            raise HTTPException(status_code=403, detail="Permission denied - Super Admin only")
        
        if role_name == "super_admin":
            raise HTTPException(status_code=400, detail="Cannot modify super_admin permissions")
        
        result = await db.admin_roles.update_one(
            {"role_name": role_name},
            {
                "$set": {
                    "permissions": permissions,
                    "updated_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        
        await log_admin_action(
            db, current_user["id"], "role_update", "roles",
            role_name, {"permissions": permissions}, request
        )
        
        return {"message": "Role permissions updated"}
    
    # ==================== ADMIN LOGS ROUTES ====================
    
    @admin_advanced_router.get("/logs")
    async def get_admin_logs(
        module: Optional[str] = None,
        admin_id: Optional[str] = None,
        limit: int = 100,
        current_user: dict = Depends(get_admin_user)
    ):
        """Get admin action logs"""
        if not check_permission(current_user, "logs_view"):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        query = {}
        if module:
            query["module"] = module
        if admin_id:
            query["admin_id"] = admin_id
        
        logs = await db.admin_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Enrich with admin names
        for log in logs:
            admin = await db.users.find_one({"id": log.get("admin_id")}, {"_id": 0, "email": 1, "full_name": 1})
            log["admin"] = admin
        
        return {"logs": logs}
    
    # ==================== CURRENT USER PERMISSIONS ====================
    
    @admin_advanced_router.get("/my-permissions")
    async def get_my_permissions(
        current_user: dict = Depends(get_admin_user)
    ):
        """Get current admin's permissions"""
        role = current_user.get("role", "admin")
        user_permissions = current_user.get("permissions", {})
        default_permissions = DEFAULT_PERMISSIONS.get(role, {})
        
        # Merge: user permissions override defaults
        merged = {**default_permissions, **user_permissions}
        
        return {
            "role": role,
            "level": ROLE_LEVELS.get(role, 99),
            "permissions": merged
        }
    
    return admin_advanced_router
