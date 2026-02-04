"""
Phase 2 Features Test Suite for SBPAYGO
Tests: Saved Cards, Geo Security, Admin Staff Management
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_EMAIL = "user@sbpaygo.com"
USER_PASSWORD = "userpassword"
ADMIN_EMAIL = "admin@sbpaygo.com"
ADMIN_PASSWORD = "adminpassword"

# Test card numbers (Luhn valid) - using unique numbers for testing
VALID_VISA = "4532015112830366"  # Different Visa for testing
VALID_MASTERCARD = "5425233430109903"  # Different Mastercard for testing
INVALID_CARD = "1234567890123456"  # Fails Luhn

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def user_token(api_client):
    """Get user authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"User authentication failed: {response.text}")

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.text}")

@pytest.fixture
def user_auth_headers(user_token):
    """Headers with user auth"""
    return {"Authorization": f"Bearer {user_token}"}

@pytest.fixture
def admin_auth_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}"}


# ==================== SAVED CARDS TESTS ====================

class TestSavedCardsAPI:
    """Tests for Saved Cards CRUD operations"""
    
    created_card_id = None
    
    def test_list_cards_requires_auth(self, api_client):
        """GET /api/saved-cards/list - Returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/saved-cards/list")
        assert response.status_code == 401
        print("✓ List cards requires authentication")
    
    def test_list_cards_empty_initially(self, api_client, user_auth_headers):
        """GET /api/saved-cards/list - Returns empty list or existing cards"""
        response = api_client.get(f"{BASE_URL}/api/saved-cards/list", headers=user_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "cards" in data
        assert isinstance(data["cards"], list)
        print(f"✓ List cards returns {len(data['cards'])} cards")
    
    def test_add_card_invalid_number(self, api_client, user_auth_headers):
        """POST /api/saved-cards/add - Returns 400 for invalid card number (Luhn)"""
        response = api_client.post(f"{BASE_URL}/api/saved-cards/add", 
            headers=user_auth_headers,
            json={
                "card_number": INVALID_CARD,
                "card_holder_name": "TEST USER",
                "expiry_month": "12",
                "expiry_year": "2028"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "invalide" in data.get("detail", "").lower() or "invalid" in data.get("detail", "").lower()
        print("✓ Invalid card number rejected (Luhn validation)")
    
    def test_add_card_expired(self, api_client, user_auth_headers):
        """POST /api/saved-cards/add - Returns 400 for expired card"""
        response = api_client.post(f"{BASE_URL}/api/saved-cards/add", 
            headers=user_auth_headers,
            json={
                "card_number": VALID_VISA,
                "card_holder_name": "TEST USER",
                "expiry_month": "01",
                "expiry_year": "2020"  # Expired
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "expiration" in data.get("detail", "").lower() or "invalide" in data.get("detail", "").lower()
        print("✓ Expired card rejected")
    
    def test_add_card_visa_success(self, api_client, user_auth_headers):
        """POST /api/saved-cards/add - Successfully adds Visa card"""
        response = api_client.post(f"{BASE_URL}/api/saved-cards/add", 
            headers=user_auth_headers,
            json={
                "card_number": VALID_VISA,
                "card_holder_name": "TEST USER VISA",
                "expiry_month": "12",
                "expiry_year": "2028",
                "nickname": "Test Visa Card",
                "is_default": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "card" in data
        assert data["card"]["card_type"] == "visa"
        assert "****" in data["card"]["masked_number"]  # Card is masked
        TestSavedCardsAPI.created_card_id = data["card"]["id"]
        print(f"✓ Visa card added successfully: {data['card']['masked_number']}")
    
    def test_add_duplicate_card(self, api_client, user_auth_headers):
        """POST /api/saved-cards/add - Returns 400 for duplicate card"""
        response = api_client.post(f"{BASE_URL}/api/saved-cards/add", 
            headers=user_auth_headers,
            json={
                "card_number": VALID_VISA,
                "card_holder_name": "TEST USER",
                "expiry_month": "12",
                "expiry_year": "2028"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "deja" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        print("✓ Duplicate card rejected")
    
    def test_add_card_mastercard_success(self, api_client, user_auth_headers):
        """POST /api/saved-cards/add - Successfully adds Mastercard"""
        response = api_client.post(f"{BASE_URL}/api/saved-cards/add", 
            headers=user_auth_headers,
            json={
                "card_number": VALID_MASTERCARD,
                "card_holder_name": "TEST USER MC",
                "expiry_month": "06",
                "expiry_year": "29",  # Short year format
                "nickname": "Test Mastercard"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["card"]["card_type"] == "mastercard"
        print(f"✓ Mastercard added successfully: {data['card']['masked_number']}")
    
    def test_list_cards_after_add(self, api_client, user_auth_headers):
        """GET /api/saved-cards/list - Returns added cards"""
        response = api_client.get(f"{BASE_URL}/api/saved-cards/list", headers=user_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["cards"]) >= 2
        # Check card types
        card_types = [c["card_type"] for c in data["cards"]]
        assert "visa" in card_types or "mastercard" in card_types
        print(f"✓ List returns {len(data['cards'])} cards")
    
    def test_get_default_card(self, api_client, user_auth_headers):
        """GET /api/saved-cards/default/get - Returns default card"""
        response = api_client.get(f"{BASE_URL}/api/saved-cards/default/get", headers=user_auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should have a card (either default or most recent)
        print(f"✓ Default card endpoint works: {data.get('card', {}).get('masked_number', 'None')}")
    
    def test_set_default_card(self, api_client, user_auth_headers):
        """POST /api/saved-cards/{id}/set-default - Sets card as default"""
        if not TestSavedCardsAPI.created_card_id:
            pytest.skip("No card ID available")
        
        response = api_client.post(
            f"{BASE_URL}/api/saved-cards/{TestSavedCardsAPI.created_card_id}/set-default",
            headers=user_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Card set as default successfully")
    
    def test_delete_card_not_found(self, api_client, user_auth_headers):
        """DELETE /api/saved-cards/{id} - Returns 404 for non-existent card"""
        response = api_client.delete(
            f"{BASE_URL}/api/saved-cards/nonexistent-card-id",
            headers=user_auth_headers
        )
        assert response.status_code == 404
        print("✓ Delete non-existent card returns 404")
    
    def test_delete_card_success(self, api_client, user_auth_headers):
        """DELETE /api/saved-cards/{id} - Successfully deletes card"""
        if not TestSavedCardsAPI.created_card_id:
            pytest.skip("No card ID available")
        
        response = api_client.delete(
            f"{BASE_URL}/api/saved-cards/{TestSavedCardsAPI.created_card_id}",
            headers=user_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Card deleted successfully")
        
        # Verify deletion
        get_response = api_client.get(
            f"{BASE_URL}/api/saved-cards/{TestSavedCardsAPI.created_card_id}",
            headers=user_auth_headers
        )
        assert get_response.status_code == 404
        print("✓ Deleted card no longer accessible")


# ==================== GEO SECURITY TESTS ====================

class TestGeoSecurityAPI:
    """Tests for Geolocation Security features"""
    
    def test_get_settings_requires_auth(self, api_client):
        """GET /api/security/geo/settings - Returns 401 without auth"""
        response = api_client.get(f"{BASE_URL}/api/security/geo/settings")
        assert response.status_code == 401
        print("✓ Geo settings requires authentication")
    
    def test_get_settings_default(self, api_client, user_auth_headers):
        """GET /api/security/geo/settings - Returns default settings"""
        response = api_client.get(f"{BASE_URL}/api/security/geo/settings", headers=user_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "settings" in data
        settings = data["settings"]
        assert "enabled" in settings
        assert "allowed_radius_km" in settings
        print(f"✓ Geo settings retrieved: enabled={settings.get('enabled')}, radius={settings.get('allowed_radius_km')}km")
    
    def test_update_settings_missing_coords(self, api_client, user_auth_headers):
        """POST /api/security/geo/settings - Returns 400 when enabling without coordinates"""
        response = api_client.post(f"{BASE_URL}/api/security/geo/settings",
            headers=user_auth_headers,
            json={
                "enabled": True,
                "allowed_radius_km": 50
                # Missing home_latitude and home_longitude
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "coordonnees" in data.get("detail", "").lower() or "position" in data.get("detail", "").lower()
        print("✓ Enabling geo security without coordinates rejected")
    
    def test_update_settings_invalid_coords(self, api_client, user_auth_headers):
        """POST /api/security/geo/settings - Returns 400 for invalid coordinates"""
        response = api_client.post(f"{BASE_URL}/api/security/geo/settings",
            headers=user_auth_headers,
            json={
                "enabled": True,
                "home_latitude": 200,  # Invalid: must be -90 to 90
                "home_longitude": 0,
                "allowed_radius_km": 50
            }
        )
        assert response.status_code == 400
        print("✓ Invalid coordinates rejected")
    
    def test_update_settings_enable_success(self, api_client, user_auth_headers):
        """POST /api/security/geo/settings - Successfully enables geo security"""
        # Paris coordinates
        response = api_client.post(f"{BASE_URL}/api/security/geo/settings",
            headers=user_auth_headers,
            json={
                "enabled": True,
                "home_latitude": 48.8566,
                "home_longitude": 2.3522,
                "allowed_radius_km": 100,
                "notify_on_block": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Geo security enabled successfully")
    
    def test_check_location_within_radius(self, api_client, user_auth_headers):
        """POST /api/security/geo/check - Location within radius is allowed"""
        # Location near Paris (within 100km)
        response = api_client.post(f"{BASE_URL}/api/security/geo/check",
            headers=user_auth_headers,
            json={
                "latitude": 48.9,  # ~5km from Paris
                "longitude": 2.4,
                "transaction_type": "payment"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("allowed") == True
        assert data.get("geo_security_enabled") == True
        print(f"✓ Location within radius allowed: {data.get('distance_km')}km")
    
    def test_check_location_outside_radius(self, api_client, user_auth_headers):
        """POST /api/security/geo/check - Location outside radius is blocked"""
        # Location in London (~350km from Paris)
        response = api_client.post(f"{BASE_URL}/api/security/geo/check",
            headers=user_auth_headers,
            json={
                "latitude": 51.5074,
                "longitude": -0.1278,
                "transaction_type": "payment"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("allowed") == False
        assert data.get("geo_security_enabled") == True
        assert data.get("distance_km") > 100  # Should be ~350km
        print(f"✓ Location outside radius blocked: {data.get('distance_km')}km")
    
    def test_get_geo_logs(self, api_client, user_auth_headers):
        """GET /api/security/geo/logs - Returns location check logs"""
        response = api_client.get(f"{BASE_URL}/api/security/geo/logs", headers=user_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert isinstance(data["logs"], list)
        # Should have at least 2 logs from previous tests
        assert len(data["logs"]) >= 2
        print(f"✓ Geo logs retrieved: {len(data['logs'])} entries")
    
    def test_disable_geo_security(self, api_client, user_auth_headers):
        """POST /api/security/geo/settings - Disables geo security"""
        response = api_client.post(f"{BASE_URL}/api/security/geo/settings",
            headers=user_auth_headers,
            json={
                "enabled": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("✓ Geo security disabled successfully")
    
    def test_check_location_when_disabled(self, api_client, user_auth_headers):
        """POST /api/security/geo/check - All locations allowed when disabled"""
        response = api_client.post(f"{BASE_URL}/api/security/geo/check",
            headers=user_auth_headers,
            json={
                "latitude": 51.5074,  # London
                "longitude": -0.1278,
                "transaction_type": "payment"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("allowed") == True
        assert data.get("geo_security_enabled") == False
        print("✓ Location allowed when geo security disabled")


# ==================== ADMIN STAFF MANAGEMENT TESTS ====================

class TestAdminStaffAPI:
    """Tests for Admin Staff Management features"""
    
    created_staff_id = None
    created_role_id = None
    
    def test_init_staff_system(self, api_client, admin_auth_headers):
        """POST /admin/staff/init - Initializes staff system"""
        response = api_client.post(f"{BASE_URL}/api/admin/staff/init", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Staff system initialized: {data.get('message')}")
    
    def test_get_roles(self, api_client, admin_auth_headers):
        """GET /admin/staff/roles - Returns all roles"""
        response = api_client.get(f"{BASE_URL}/api/admin/staff/roles", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        assert len(data["roles"]) >= 6  # Default roles
        
        # Check for expected roles
        role_ids = [r["id"] for r in data["roles"]]
        assert "super_admin" in role_ids
        assert "support" in role_ids
        assert "finance" in role_ids
        print(f"✓ Roles retrieved: {len(data['roles'])} roles")
    
    def test_get_permissions_catalog(self, api_client, admin_auth_headers):
        """GET /admin/staff/permissions - Returns permissions catalog"""
        response = api_client.get(f"{BASE_URL}/api/admin/staff/permissions", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "permissions" in data
        
        # Check for expected permission modules
        modules = list(data["permissions"].keys())
        assert "users" in modules
        assert "transactions" in modules
        assert "kyc" in modules
        print(f"✓ Permissions catalog retrieved: {len(modules)} modules")
    
    def test_create_role(self, api_client, admin_auth_headers):
        """POST /admin/staff/roles - Creates a new role"""
        response = api_client.post(f"{BASE_URL}/api/admin/staff/roles",
            headers=admin_auth_headers,
            json={
                "name": "TEST_Custom_Role",
                "name_fr": "Rôle Test Personnalisé",
                "description": "Test role for automated testing",
                "level": 8,
                "permissions": ["users.view", "transactions.view"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "role_id" in data
        TestAdminStaffAPI.created_role_id = data["role_id"]
        print(f"✓ Custom role created: {data['role_id']}")
    
    def test_create_duplicate_role(self, api_client, admin_auth_headers):
        """POST /admin/staff/roles - Returns 400 for duplicate role name"""
        response = api_client.post(f"{BASE_URL}/api/admin/staff/roles",
            headers=admin_auth_headers,
            json={
                "name": "TEST_Custom_Role",
                "name_fr": "Duplicate Role",
                "level": 8,
                "permissions": []
            }
        )
        assert response.status_code == 400
        print("✓ Duplicate role name rejected")
    
    def test_get_staff_members(self, api_client, admin_auth_headers):
        """GET /admin/staff/members - Returns staff list"""
        response = api_client.get(f"{BASE_URL}/api/admin/staff/members", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "staff" in data
        assert "total" in data
        print(f"✓ Staff members retrieved: {data['total']} members")
    
    def test_create_staff_member(self, api_client, admin_auth_headers):
        """POST /admin/staff/members - Creates a new staff member"""
        response = api_client.post(f"{BASE_URL}/api/admin/staff/members",
            headers=admin_auth_headers,
            json={
                "first_name": "TEST",
                "last_name": "Staff Member",
                "email": "test_staff_member@sbpaygo.com",
                "phone": "+33612345678",
                "password": "testpassword123",
                "role_id": "support",
                "country_ids": ["SN", "CI"],
                "is_active": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "staff_id" in data
        TestAdminStaffAPI.created_staff_id = data["staff_id"]
        print(f"✓ Staff member created: {data['staff_id']}")
    
    def test_create_duplicate_staff(self, api_client, admin_auth_headers):
        """POST /admin/staff/members - Returns 400 for duplicate email"""
        response = api_client.post(f"{BASE_URL}/api/admin/staff/members",
            headers=admin_auth_headers,
            json={
                "first_name": "Duplicate",
                "last_name": "Staff",
                "email": "test_staff_member@sbpaygo.com",
                "password": "testpassword123",
                "role_id": "support"
            }
        )
        assert response.status_code == 400
        print("✓ Duplicate staff email rejected")
    
    def test_get_staff_member_detail(self, api_client, admin_auth_headers):
        """GET /admin/staff/members/{id} - Returns staff member details"""
        if not TestAdminStaffAPI.created_staff_id:
            pytest.skip("No staff ID available")
        
        response = api_client.get(
            f"{BASE_URL}/api/admin/staff/members/{TestAdminStaffAPI.created_staff_id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("first_name") == "TEST"
        assert data.get("email") == "test_staff_member@sbpaygo.com"
        assert "role" in data
        print(f"✓ Staff member details retrieved: {data.get('email')}")
    
    def test_update_staff_member(self, api_client, admin_auth_headers):
        """PUT /admin/staff/members/{id} - Updates staff member"""
        if not TestAdminStaffAPI.created_staff_id:
            pytest.skip("No staff ID available")
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/staff/members/{TestAdminStaffAPI.created_staff_id}",
            headers=admin_auth_headers,
            json={
                "first_name": "TEST_UPDATED",
                "phone": "+33698765432"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Staff member updated successfully"
        print("✓ Staff member updated successfully")
    
    def test_toggle_staff_status(self, api_client, admin_auth_headers):
        """PUT /admin/staff/members/{id}/toggle - Toggles staff status"""
        if not TestAdminStaffAPI.created_staff_id:
            pytest.skip("No staff ID available")
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/staff/members/{TestAdminStaffAPI.created_staff_id}/toggle",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_active" in data
        print(f"✓ Staff status toggled: is_active={data.get('is_active')}")
    
    def test_get_activity_logs(self, api_client, admin_auth_headers):
        """GET /admin/staff/logs - Returns activity logs"""
        response = api_client.get(f"{BASE_URL}/api/admin/staff/logs", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"✓ Activity logs retrieved: {data['total']} entries")
    
    def test_get_logs_stats(self, api_client, admin_auth_headers):
        """GET /admin/staff/logs/stats - Returns logs statistics"""
        response = api_client.get(f"{BASE_URL}/api/admin/staff/logs/stats", headers=admin_auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_logs" in data
        print(f"✓ Logs stats retrieved: {data.get('total_logs')} total logs")
    
    def test_delete_staff_member(self, api_client, admin_auth_headers):
        """DELETE /admin/staff/members/{id} - Deletes staff member"""
        if not TestAdminStaffAPI.created_staff_id:
            pytest.skip("No staff ID available")
        
        response = api_client.delete(
            f"{BASE_URL}/api/admin/staff/members/{TestAdminStaffAPI.created_staff_id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Staff member deleted successfully"
        print("✓ Staff member deleted successfully")
    
    def test_delete_role(self, api_client, admin_auth_headers):
        """DELETE /admin/staff/roles/{id} - Deletes custom role"""
        if not TestAdminStaffAPI.created_role_id:
            pytest.skip("No role ID available")
        
        response = api_client.delete(
            f"{BASE_URL}/api/admin/staff/roles/{TestAdminStaffAPI.created_role_id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Role deleted successfully"
        print("✓ Custom role deleted successfully")
    
    def test_cannot_delete_system_role(self, api_client, admin_auth_headers):
        """DELETE /admin/staff/roles/{id} - Cannot delete system role"""
        response = api_client.delete(
            f"{BASE_URL}/api/admin/staff/roles/super_admin",
            headers=admin_auth_headers
        )
        assert response.status_code == 400
        print("✓ System role deletion prevented")


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_cards(self, api_client, user_auth_headers):
        """Clean up any remaining test cards"""
        response = api_client.get(f"{BASE_URL}/api/saved-cards/list", headers=user_auth_headers)
        if response.status_code == 200:
            cards = response.json().get("cards", [])
            for card in cards:
                if "TEST" in card.get("card_holder_name", "").upper():
                    api_client.delete(
                        f"{BASE_URL}/api/saved-cards/{card['id']}",
                        headers=user_auth_headers
                    )
        print("✓ Test cards cleaned up")
    
    def test_reset_geo_settings(self, api_client, user_auth_headers):
        """Reset geo security settings"""
        api_client.post(f"{BASE_URL}/api/security/geo/settings",
            headers=user_auth_headers,
            json={"enabled": False}
        )
        print("✓ Geo settings reset")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
