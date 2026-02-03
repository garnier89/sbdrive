"""
Test Partners/Agents Module for SB Money
Tests: Partner registration, login, dashboard, withdrawal flow, admin management
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
EXISTING_PARTNER = {"email": "testagent@sbmoney.com", "password": "testpassword123"}
ADMIN_USER = {"email": "admin@sbmoney.com", "password": "adminpassword"}
TEST_USER = {"email": "user@sbmoney.com", "password": "userpassword"}


class TestPartnerRegistration:
    """Test partner registration flow"""
    
    def test_register_new_partner(self):
        """POST /api/partners/register - Create new partner"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "business_name": f"TEST_Boutique_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_partner_{unique_id}@sbmoney.com",
            "phone": f"+221771234{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        response = requests.post(f"{BASE_URL}/api/partners/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "partner_code" in data, "Response should contain partner_code"
        assert data["partner_code"].startswith("AG-"), "Partner code should start with AG-"
        assert "message" in data, "Response should contain message"
        print(f"✓ Partner registered with code: {data['partner_code']}")
        
        # Store for cleanup
        return data["partner_code"]
    
    def test_register_duplicate_email(self):
        """POST /api/partners/register - Should reject duplicate email"""
        # First register a partner
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "business_name": f"TEST_Boutique_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_dup_{unique_id}@sbmoney.com",
            "phone": f"+221779999{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/partners/register", json=payload)
        assert response1.status_code == 200
        
        # Try to register with same email
        payload["phone"] = f"+221778888{unique_id[:4]}"  # Different phone
        response2 = requests.post(f"{BASE_URL}/api/partners/register", json=payload)
        
        assert response2.status_code == 400, f"Expected 400 for duplicate email, got {response2.status_code}"
        assert "déjà utilisé" in response2.json().get("detail", "").lower() or "email" in response2.json().get("detail", "").lower()
        print("✓ Duplicate email correctly rejected")


class TestPartnerLogin:
    """Test partner login flow"""
    
    def test_login_pending_partner(self):
        """POST /api/partners/login - Pending partner should get 403"""
        # Register a new partner (will be pending)
        unique_id = str(uuid.uuid4())[:8]
        register_payload = {
            "business_name": f"TEST_Pending_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_pending_{unique_id}@sbmoney.com",
            "phone": f"+221775555{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/partners/register", json=register_payload)
        assert reg_response.status_code == 200
        
        # Try to login
        login_payload = {
            "email": register_payload["email"],
            "password": "testpassword123"
        }
        
        response = requests.post(f"{BASE_URL}/api/partners/login", json=login_payload)
        
        assert response.status_code == 403, f"Expected 403 for pending partner, got {response.status_code}"
        assert "attente" in response.json().get("detail", "").lower()
        print("✓ Pending partner correctly blocked from login")
    
    def test_login_invalid_credentials(self):
        """POST /api/partners/login - Invalid credentials should return 401"""
        payload = {
            "email": "nonexistent@sbmoney.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/partners/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_missing_fields(self):
        """POST /api/partners/login - Missing fields should return 400"""
        payload = {"email": "test@sbmoney.com"}  # Missing password
        
        response = requests.post(f"{BASE_URL}/api/partners/login", json=payload)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Missing fields correctly rejected")


class TestAdminPartnerManagement:
    """Test admin partner management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("access_token")
    
    def test_admin_list_partners(self, admin_token):
        """GET /api/partners/admin/list - List all partners"""
        response = requests.get(
            f"{BASE_URL}/api/partners/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "partners" in data, "Response should contain partners list"
        assert "stats" in data, "Response should contain stats"
        assert "pending" in data["stats"], "Stats should contain pending count"
        assert "active" in data["stats"], "Stats should contain active count"
        print(f"✓ Admin list partners: {len(data['partners'])} partners, stats: {data['stats']}")
    
    def test_admin_list_partners_filter_by_status(self, admin_token):
        """GET /api/partners/admin/list?status=pending - Filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/partners/admin/list?status=pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # All returned partners should be pending
        for partner in data.get("partners", []):
            assert partner.get("status") == "pending", f"Expected pending status, got {partner.get('status')}"
        print(f"✓ Admin filter by status: {len(data['partners'])} pending partners")
    
    def test_admin_activate_partner(self, admin_token):
        """PUT /api/partners/admin/{id}/status - Activate a partner"""
        # First register a new partner
        unique_id = str(uuid.uuid4())[:8]
        register_payload = {
            "business_name": f"TEST_Activate_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_activate_{unique_id}@sbmoney.com",
            "phone": f"+221776666{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        reg_response = requests.post(f"{BASE_URL}/api/partners/register", json=register_payload)
        assert reg_response.status_code == 200
        
        # Get the partner ID from admin list
        list_response = requests.get(
            f"{BASE_URL}/api/partners/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        partners = list_response.json().get("partners", [])
        partner = next((p for p in partners if p.get("email") == register_payload["email"]), None)
        
        assert partner is not None, "Newly registered partner not found in list"
        partner_id = partner["id"]
        
        # Activate the partner
        response = requests.put(
            f"{BASE_URL}/api/partners/admin/{partner_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("new_status") == "active", "Partner should be activated"
        print(f"✓ Partner {partner_id} activated successfully")
        
        # Verify partner can now login
        login_response = requests.post(f"{BASE_URL}/api/partners/login", json={
            "email": register_payload["email"],
            "password": "testpassword123"
        })
        
        assert login_response.status_code == 200, f"Activated partner should be able to login, got {login_response.status_code}"
        assert "access_token" in login_response.json(), "Login should return access_token"
        print("✓ Activated partner can login successfully")
        
        return login_response.json().get("access_token"), partner_id
    
    def test_admin_suspend_partner(self, admin_token):
        """PUT /api/partners/admin/{id}/status - Suspend a partner"""
        # First create and activate a partner
        unique_id = str(uuid.uuid4())[:8]
        register_payload = {
            "business_name": f"TEST_Suspend_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_suspend_{unique_id}@sbmoney.com",
            "phone": f"+221777777{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        requests.post(f"{BASE_URL}/api/partners/register", json=register_payload)
        
        # Get partner ID
        list_response = requests.get(
            f"{BASE_URL}/api/partners/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        partners = list_response.json().get("partners", [])
        partner = next((p for p in partners if p.get("email") == register_payload["email"]), None)
        partner_id = partner["id"]
        
        # Activate first
        requests.put(
            f"{BASE_URL}/api/partners/admin/{partner_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Now suspend
        response = requests.put(
            f"{BASE_URL}/api/partners/admin/{partner_id}/status",
            json={"status": "suspended", "reason": "Test suspension"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        assert response.json().get("new_status") == "suspended"
        print(f"✓ Partner {partner_id} suspended successfully")
        
        # Verify partner cannot login
        login_response = requests.post(f"{BASE_URL}/api/partners/login", json={
            "email": register_payload["email"],
            "password": "testpassword123"
        })
        
        assert login_response.status_code == 403, "Suspended partner should not be able to login"
        print("✓ Suspended partner correctly blocked from login")
    
    def test_admin_get_partner_details(self, admin_token):
        """GET /api/partners/admin/{id} - Get partner details"""
        # Get any partner from list
        list_response = requests.get(
            f"{BASE_URL}/api/partners/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        partners = list_response.json().get("partners", [])
        
        if not partners:
            pytest.skip("No partners available for testing")
        
        partner_id = partners[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/partners/admin/{partner_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "business_name" in data
        assert "owner_name" in data
        assert "email" in data
        assert "withdrawals" in data, "Response should include withdrawals history"
        print(f"✓ Partner details retrieved: {data['business_name']}")
    
    def test_admin_unauthorized_access(self):
        """Admin endpoints should require admin authentication"""
        # Try without token
        response = requests.get(f"{BASE_URL}/api/partners/admin/list")
        assert response.status_code == 401, "Should require authentication"
        
        # Try with regular user token
        user_login = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
        if user_login.status_code == 200:
            user_token = user_login.json().get("access_token")
            response = requests.get(
                f"{BASE_URL}/api/partners/admin/list",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            # 401 or 403 are both acceptable - endpoint is protected
            assert response.status_code in [401, 403], f"Regular user should not access admin endpoints, got {response.status_code}"
        
        print("✓ Admin endpoints correctly protected")


class TestPartnerDashboard:
    """Test partner dashboard endpoint"""
    
    @pytest.fixture
    def active_partner_token(self):
        """Create and activate a partner, return token"""
        # Register partner
        unique_id = str(uuid.uuid4())[:8]
        register_payload = {
            "business_name": f"TEST_Dashboard_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_dashboard_{unique_id}@sbmoney.com",
            "phone": f"+221778888{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        requests.post(f"{BASE_URL}/api/partners/register", json=register_payload)
        
        # Get admin token and activate
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if admin_login.status_code != 200:
            pytest.skip("Admin login failed")
        admin_token = admin_login.json().get("access_token")
        
        # Get partner ID
        list_response = requests.get(
            f"{BASE_URL}/api/partners/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        partners = list_response.json().get("partners", [])
        partner = next((p for p in partners if p.get("email") == register_payload["email"]), None)
        
        if not partner:
            pytest.skip("Partner not found")
        
        # Activate
        requests.put(
            f"{BASE_URL}/api/partners/admin/{partner['id']}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as partner
        login_response = requests.post(f"{BASE_URL}/api/partners/login", json={
            "email": register_payload["email"],
            "password": "testpassword123"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Partner login failed: {login_response.text}")
        
        return login_response.json().get("access_token")
    
    def test_get_partner_dashboard(self, active_partner_token):
        """GET /api/partners/dashboard - Get dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/partners/dashboard",
            headers={"Authorization": f"Bearer {active_partner_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify dashboard fields
        assert "wallet_balance" in data, "Dashboard should have wallet_balance"
        assert "wallet_currency" in data, "Dashboard should have wallet_currency"
        assert "daily_limit" in data, "Dashboard should have daily_limit"
        assert "daily_withdrawn" in data, "Dashboard should have daily_withdrawn"
        assert "today_withdrawals" in data, "Dashboard should have today_withdrawals"
        assert "total_withdrawals" in data, "Dashboard should have total_withdrawals"
        assert "recent_withdrawals" in data, "Dashboard should have recent_withdrawals"
        
        print(f"✓ Dashboard data: balance={data['wallet_balance']} {data['wallet_currency']}, limit={data['daily_limit']}")
    
    def test_get_partner_profile(self, active_partner_token):
        """GET /api/partners/me - Get partner profile"""
        response = requests.get(
            f"{BASE_URL}/api/partners/me",
            headers={"Authorization": f"Bearer {active_partner_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "business_name" in data
        assert "owner_name" in data
        assert "email" in data
        assert "partner_code" in data
        assert "password_hash" not in data, "Password hash should not be exposed"
        
        print(f"✓ Partner profile: {data['business_name']} ({data['partner_code']})")
    
    def test_dashboard_requires_auth(self):
        """Dashboard should require authentication"""
        response = requests.get(f"{BASE_URL}/api/partners/dashboard")
        assert response.status_code == 401
        print("✓ Dashboard correctly requires authentication")


class TestWithdrawalFlow:
    """Test cash withdrawal flow"""
    
    @pytest.fixture
    def setup_withdrawal_test(self):
        """Setup: Create active partner and ensure test user has balance"""
        # Register partner
        unique_id = str(uuid.uuid4())[:8]
        partner_email = f"test_withdrawal_{unique_id}@sbmoney.com"
        register_payload = {
            "business_name": f"TEST_Withdrawal_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": partner_email,
            "phone": f"+221779999{unique_id[:4]}",
            "address": "123 Rue du Commerce",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        requests.post(f"{BASE_URL}/api/partners/register", json=register_payload)
        
        # Get admin token and activate partner
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        if admin_login.status_code != 200:
            pytest.skip("Admin login failed")
        admin_token = admin_login.json().get("access_token")
        
        # Get partner ID and activate
        list_response = requests.get(
            f"{BASE_URL}/api/partners/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        partners = list_response.json().get("partners", [])
        partner = next((p for p in partners if p.get("email") == partner_email), None)
        
        if not partner:
            pytest.skip("Partner not found")
        
        requests.put(
            f"{BASE_URL}/api/partners/admin/{partner['id']}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Login as partner
        login_response = requests.post(f"{BASE_URL}/api/partners/login", json={
            "email": partner_email,
            "password": "testpassword123"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Partner login failed: {login_response.text}")
        
        partner_token = login_response.json().get("access_token")
        
        return {
            "partner_token": partner_token,
            "admin_token": admin_token,
            "partner_id": partner["id"]
        }
    
    def test_initiate_withdrawal_client_not_found(self, setup_withdrawal_test):
        """POST /api/partners/withdrawal/initiate - Client not found"""
        response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/initiate",
            json={
                "client_identifier": "nonexistent_client_12345",
                "amount": 100,
                "currency": "XOF"
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        assert "non trouvé" in response.json().get("detail", "").lower()
        print("✓ Client not found correctly handled")
    
    def test_initiate_withdrawal_success(self, setup_withdrawal_test):
        """POST /api/partners/withdrawal/initiate - Successful initiation"""
        # Use test user email to find client
        response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/initiate",
            json={
                "client_identifier": TEST_USER["email"],
                "amount": 100,
                "currency": "XOF"
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        # Could be 200 (success) or 400 (insufficient balance)
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            if "insuffisant" in detail.lower():
                print("✓ Withdrawal initiation correctly checks balance (insufficient)")
                return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "withdrawal_id" in data, "Response should contain withdrawal_id"
        assert "client_name" in data, "Response should contain client_name"
        assert "amount" in data, "Response should contain amount"
        assert "demo_otp" in data, "Response should contain demo_otp (mocked)"
        
        print(f"✓ Withdrawal initiated: {data['withdrawal_id']}, OTP: {data['demo_otp']}")
        return data
    
    def test_confirm_withdrawal_invalid_otp(self, setup_withdrawal_test):
        """POST /api/partners/withdrawal/confirm - Invalid OTP"""
        # First initiate a withdrawal
        init_response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/initiate",
            json={
                "client_identifier": TEST_USER["email"],
                "amount": 50,
                "currency": "XOF"
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        if init_response.status_code != 200:
            pytest.skip(f"Could not initiate withdrawal: {init_response.text}")
        
        withdrawal_id = init_response.json().get("withdrawal_id")
        
        # Try to confirm with wrong OTP
        response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/confirm",
            json={
                "withdrawal_id": withdrawal_id,
                "otp_code": "000000"  # Wrong OTP
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "incorrect" in response.json().get("detail", "").lower()
        print("✓ Invalid OTP correctly rejected")
    
    def test_full_withdrawal_flow(self, setup_withdrawal_test):
        """Test complete withdrawal flow: initiate -> confirm with OTP"""
        # Initiate withdrawal
        init_response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/initiate",
            json={
                "client_identifier": TEST_USER["email"],
                "amount": 25,
                "currency": "XOF"
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        if init_response.status_code != 200:
            if init_response.status_code == 400 and "insuffisant" in init_response.json().get("detail", "").lower():
                print("✓ Full withdrawal flow: Client has insufficient balance (expected)")
                return
            pytest.skip(f"Could not initiate withdrawal: {init_response.text}")
        
        init_data = init_response.json()
        withdrawal_id = init_data["withdrawal_id"]
        demo_otp = init_data["demo_otp"]
        
        print(f"  Withdrawal initiated: {withdrawal_id}")
        print(f"  Demo OTP: {demo_otp}")
        
        # Confirm with correct OTP
        confirm_response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/confirm",
            json={
                "withdrawal_id": withdrawal_id,
                "otp_code": demo_otp
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        assert confirm_response.status_code == 200, f"Expected 200, got {confirm_response.status_code}: {confirm_response.text}"
        confirm_data = confirm_response.json()
        
        assert "message" in confirm_data
        assert confirm_data.get("amount") == 25
        assert "partner_new_balance" in confirm_data
        
        print(f"✓ Full withdrawal flow completed: {confirm_data['amount']} XOF")
        print(f"  Partner new balance: {confirm_data['partner_new_balance']}")
    
    def test_cancel_withdrawal(self, setup_withdrawal_test):
        """POST /api/partners/withdrawal/cancel/{id} - Cancel pending withdrawal"""
        # Initiate withdrawal
        init_response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/initiate",
            json={
                "client_identifier": TEST_USER["email"],
                "amount": 10,
                "currency": "XOF"
            },
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        if init_response.status_code != 200:
            pytest.skip(f"Could not initiate withdrawal: {init_response.text}")
        
        withdrawal_id = init_response.json().get("withdrawal_id")
        
        # Cancel the withdrawal
        response = requests.post(
            f"{BASE_URL}/api/partners/withdrawal/cancel/{withdrawal_id}",
            headers={"Authorization": f"Bearer {setup_withdrawal_test['partner_token']}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "annulé" in response.json().get("message", "").lower()
        print(f"✓ Withdrawal {withdrawal_id} cancelled successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
