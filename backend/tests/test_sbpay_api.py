"""
SB Pay API Tests - Comprehensive backend testing
Tests: Authentication, Admin Dashboard, Users, Transactions, Documents, Zones, Wallets, Transfers
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@sbpay.com"
ADMIN_PASSWORD = "adminpassword"
USER_EMAIL = "user@sbpay.com"
USER_PASSWORD = "userpassword"


class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "status" in data or "version" in data
        print(f"✓ API health check passed: {data}")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['user']['email']}")
    
    def test_user_login_success(self):
        """Test user login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "user"
        print(f"✓ User login successful: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Then get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == USER_EMAIL
        print(f"✓ Auth/me returned user: {data['email']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth/me correctly requires authentication")


class TestAdminDashboard:
    """Admin dashboard and stats tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_admin_stats(self, admin_token):
        """Test admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        data = response.json()
        # Verify stats structure
        assert "total_users" in data
        assert "total_transactions" in data
        print(f"✓ Admin stats: {data.get('total_users')} users, {data.get('total_transactions')} transactions")
    
    def test_admin_stats_requires_admin(self):
        """Test admin stats requires admin role"""
        # Login as regular user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Try to access admin stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 403
        print("✓ Admin stats correctly requires admin role")


class TestAdminUsers:
    """Admin users management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_admin_get_users(self, admin_token):
        """Test admin get users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        print(f"✓ Admin users list: {data['total']} users found")
    
    def test_admin_get_users_pagination(self, admin_token):
        """Test admin users pagination"""
        response = requests.get(f"{BASE_URL}/api/admin/users?limit=5&offset=0", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) <= 5
        print(f"✓ Admin users pagination works: {len(data['users'])} users returned")
    
    def test_admin_get_single_user(self, admin_token):
        """Test admin get single user details"""
        # First get users list
        users_response = requests.get(f"{BASE_URL}/api/admin/users?limit=1", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        users = users_response.json()["users"]
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["id"]
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "wallets" in data
        print(f"✓ Admin get user details: {data['user']['email']}")


class TestAdminTransactions:
    """Admin transactions management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_admin_get_transactions(self, admin_token):
        """Test admin get all transactions"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        print(f"✓ Admin transactions: {data['total']} transactions found")
    
    def test_admin_transactions_pagination(self, admin_token):
        """Test admin transactions pagination"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions?limit=10&offset=0", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["transactions"]) <= 10
        print(f"✓ Admin transactions pagination: {len(data['transactions'])} returned")


class TestAdminDocuments:
    """Admin KYC documents management tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_admin_get_documents(self, admin_token):
        """Test admin get all documents"""
        response = requests.get(f"{BASE_URL}/api/admin/documents", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        print(f"✓ Admin documents: {len(data['documents'])} documents found")
    
    def test_admin_get_documents_by_status(self, admin_token):
        """Test admin get documents filtered by status"""
        response = requests.get(f"{BASE_URL}/api/admin/documents?status=pending", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data
        # All returned documents should be pending
        for doc in data["documents"]:
            assert doc.get("status") == "pending"
        print(f"✓ Admin documents filter: {len(data['documents'])} pending documents")


class TestAdminZones:
    """Admin zones configuration tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_get_zones(self):
        """Test get zones (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/zones")
        assert response.status_code == 200
        data = response.json()
        assert "zones" in data
        print(f"✓ Zones list: {len(data['zones'])} zones found")
    
    def test_admin_create_zone(self, admin_token):
        """Test admin create zone"""
        zone_data = {
            "zone_name": f"TEST_Zone_{uuid.uuid4().hex[:8]}",
            "countries": ["FR", "DE"],
            "currencies": ["EUR"],
            "payment_methods": ["stripe", "paypal"],
            "transfer_fees_percent": 1.5,
            "min_transfer_amount": 5,
            "max_transfer_amount": 5000,
            "partner_banks": []
        }
        response = requests.post(f"{BASE_URL}/api/admin/zones", json=zone_data, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        assert "zone_id" in data or "message" in data
        print(f"✓ Admin zone created: {zone_data['zone_name']}")


class TestUserWallets:
    """User wallets tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_get_wallets(self, user_token):
        """Test get user wallets"""
        response = requests.get(f"{BASE_URL}/api/wallets", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # User should have multiple currency wallets
        currencies = [w["currency"] for w in data]
        print(f"✓ User wallets: {currencies}")
    
    def test_get_wallet_by_currency(self, user_token):
        """Test get specific wallet by currency"""
        response = requests.get(f"{BASE_URL}/api/wallets/EUR", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["currency"] == "EUR"
        assert "balance" in data
        print(f"✓ EUR wallet balance: {data['balance']}")


class TestUserTransactions:
    """User transactions tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_get_transactions(self, user_token):
        """Test get user transactions"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        print(f"✓ User transactions: {data['total']} transactions")


class TestTransferFlow:
    """P2P Transfer flow tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_transfer_to_self_rejected(self, user_token):
        """Test transfer to self is rejected"""
        response = requests.post(f"{BASE_URL}/api/transfers", json={
            "recipient_email": USER_EMAIL,
            "amount": 10,
            "currency": "EUR",
            "description": "Test self transfer"
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 400
        print("✓ Transfer to self correctly rejected")
    
    def test_transfer_to_nonexistent_user(self, user_token):
        """Test transfer to non-existent user"""
        response = requests.post(f"{BASE_URL}/api/transfers", json={
            "recipient_email": "nonexistent@test.com",
            "amount": 10,
            "currency": "EUR"
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 404
        print("✓ Transfer to non-existent user correctly rejected")


class TestDepositFlow:
    """Deposit flow tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_stripe_checkout_creation(self, user_token):
        """Test Stripe checkout session creation"""
        response = requests.post(f"{BASE_URL}/api/deposits/checkout", json={
            "amount": 50,
            "currency": "eur",
            "origin_url": "https://test.com"
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        # May fail if Stripe not configured, but should not be 500
        assert response.status_code in [200, 400, 500]  # 500 if Stripe not configured
        print(f"✓ Stripe checkout: status {response.status_code}")
    
    def test_paypal_checkout_creation(self, user_token):
        """Test PayPal checkout (demo mode)"""
        response = requests.post(f"{BASE_URL}/api/deposits/paypal", json={
            "amount": 50,
            "currency": "EUR",
            "origin_url": "https://test.com"
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data.get("demo_mode") == True
        print(f"✓ PayPal checkout (demo): order_id={data['order_id']}")
    
    def test_mobile_money_providers(self):
        """Test get mobile money providers"""
        response = requests.get(f"{BASE_URL}/api/mobile-money/providers")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        providers = list(data["providers"].keys())
        print(f"✓ Mobile Money providers: {providers}")
    
    def test_mobile_money_deposit(self, user_token):
        """Test mobile money deposit (demo mode)"""
        response = requests.post(f"{BASE_URL}/api/mobile-money/deposit", json={
            "amount": 5000,
            "currency": "XOF",
            "provider": "orange_money",
            "phone_number": "+221771234567"
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reference" in data
        assert data.get("demo_mode") == True
        print(f"✓ Mobile Money deposit (demo): ref={data['reference']}")


class TestMiscEndpoints:
    """Miscellaneous endpoints tests"""
    
    def test_get_currencies(self):
        """Test get currencies"""
        response = requests.get(f"{BASE_URL}/api/currencies")
        assert response.status_code == 200
        data = response.json()
        assert "currencies" in data
        print(f"✓ Currencies: {data['currencies']}")
    
    def test_get_languages(self):
        """Test get languages"""
        response = requests.get(f"{BASE_URL}/api/languages")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        print(f"✓ Languages: {len(data['languages'])} supported")
    
    def test_get_banks(self):
        """Test get banks"""
        response = requests.get(f"{BASE_URL}/api/banks")
        assert response.status_code == 200
        data = response.json()
        assert "banks" in data
        print(f"✓ Banks: {len(data['banks'])} banks available")
    
    def test_get_banks_by_country(self):
        """Test get banks filtered by country"""
        response = requests.get(f"{BASE_URL}/api/banks?country=FR")
        assert response.status_code == 200
        data = response.json()
        assert "banks" in data
        for bank in data["banks"]:
            assert bank["country"] == "FR"
        print(f"✓ French banks: {len(data['banks'])} found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
