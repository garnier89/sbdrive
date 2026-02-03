# Super Admin Panel API Tests
# Tests for user management, partner management, wallet operations, and document management

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSuperAdminAuthentication:
    """Test admin authentication and access control"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_email = "admin@sbpaygo.com"
        self.admin_password = "adminpassword"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_login_success(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("TEST PASSED: Admin login successful")
    
    def test_admin_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@sbpaygo.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("TEST PASSED: Invalid credentials rejected")


class TestUserManagement:
    """Test user management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sbpaygo.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_get_all_users(self):
        """Test GET /api/admin/users returns user list"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data or isinstance(data, list)
        print(f"TEST PASSED: Got {len(data.get('users', data))} users")
    
    def test_get_user_by_id(self):
        """Test GET /api/admin/users/{user_id} returns user details"""
        # First get list of users
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json().get("users", response.json())
        
        if len(users) > 0:
            user_id = users[0].get("id")
            response = self.session.get(f"{BASE_URL}/api/admin/users/{user_id}")
            assert response.status_code == 200
            data = response.json()
            # Response may have user nested under "user" key
            user_data = data.get("user", data)
            assert "email" in user_data
            print(f"TEST PASSED: Got user details for {user_data.get('email')}")
        else:
            pytest.skip("No users to test")
    
    def test_update_user_status(self):
        """Test PUT /api/admin/users/{user_id}/status updates user status"""
        # Get a non-admin user
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json().get("users", response.json())
        
        non_admin_user = None
        for user in users:
            if user.get("role") != "admin" and user.get("email") != "admin@sbpaygo.com":
                non_admin_user = user
                break
        
        if non_admin_user:
            user_id = non_admin_user.get("id")
            current_status = non_admin_user.get("status", "active")
            new_status = "suspended" if current_status == "active" else "active"
            
            response = self.session.put(f"{BASE_URL}/api/admin/users/{user_id}/status", json={
                "status": new_status
            })
            assert response.status_code == 200
            print(f"TEST PASSED: User status updated to {new_status}")
            
            # Revert status
            self.session.put(f"{BASE_URL}/api/admin/users/{user_id}/status", json={
                "status": current_status
            })
        else:
            pytest.skip("No non-admin user to test")
    
    def test_get_user_activity(self):
        """Test GET /api/admin/users/{user_id}/activity returns activity log"""
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json().get("users", response.json())
        
        if len(users) > 0:
            user_id = users[0].get("id")
            response = self.session.get(f"{BASE_URL}/api/admin/users/{user_id}/activity")
            assert response.status_code == 200
            data = response.json()
            assert "activities" in data
            print(f"TEST PASSED: Got {len(data.get('activities', []))} activities")
        else:
            pytest.skip("No users to test")


class TestPartnerManagement:
    """Test partner management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sbpaygo.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_get_all_partners(self):
        """Test GET /api/partners/admin/list returns partner list"""
        response = self.session.get(f"{BASE_URL}/api/partners/admin/list")
        assert response.status_code == 200
        data = response.json()
        assert "partners" in data
        assert "stats" in data
        print(f"TEST PASSED: Got {len(data.get('partners', []))} partners")
        print(f"Stats: pending={data['stats'].get('pending')}, active={data['stats'].get('active')}, suspended={data['stats'].get('suspended')}")
    
    def test_create_partner(self):
        """Test POST /api/partners/register creates new partner (via registration endpoint)"""
        unique_id = str(uuid.uuid4())[:8]
        partner_data = {
            "business_name": f"TEST_SuperAdmin_{unique_id}",
            "owner_name": f"TEST_Owner_{unique_id}",
            "email": f"test_superadmin_{unique_id}@sbpaygo.com",
            "phone": f"+221771234{unique_id[:4]}",
            "address": "123 Test Street",
            "city": "Dakar",
            "country": "SN",
            "password": "testpassword123"
        }
        
        # Partners are created via registration endpoint
        response = requests.post(f"{BASE_URL}/api/partners/register", json=partner_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "partner_code" in data
        print(f"TEST PASSED: Partner created with code {data.get('partner_code')}")
    
    def test_update_partner_status(self):
        """Test PUT /api/partners/admin/{partner_id}/status updates partner status"""
        # Get partners list
        response = self.session.get(f"{BASE_URL}/api/partners/admin/list")
        partners = response.json().get("partners", [])
        
        # Find a test partner
        test_partner = None
        for partner in partners:
            if partner.get("business_name", "").startswith("TEST_"):
                test_partner = partner
                break
        
        if test_partner:
            partner_id = test_partner.get("id")
            current_status = test_partner.get("status", "pending")
            new_status = "active" if current_status != "active" else "suspended"
            
            response = self.session.put(f"{BASE_URL}/api/partners/admin/{partner_id}/status", json={
                "status": new_status,
                "reason": "Test status update"
            })
            assert response.status_code == 200
            print(f"TEST PASSED: Partner status updated to {new_status}")
        else:
            pytest.skip("No test partner found")
    
    def test_update_partner_limits(self):
        """Test PUT /api/partners/admin/{partner_id}/limits updates partner limits"""
        # Get partners list
        response = self.session.get(f"{BASE_URL}/api/partners/admin/list")
        partners = response.json().get("partners", [])
        
        if len(partners) > 0:
            partner_id = partners[0].get("id")
            
            response = self.session.put(f"{BASE_URL}/api/partners/admin/{partner_id}/limits", json={
                "daily_limit": 600000
            })
            assert response.status_code == 200
            print("TEST PASSED: Partner limits updated")
        else:
            pytest.skip("No partners to test")


class TestWalletOperations:
    """Test admin wallet credit/debit operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sbpaygo.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_wallet_credit_user(self):
        """Test POST /api/admin/wallet/credit credits user wallet"""
        # Get a user
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json().get("users", response.json())
        
        if len(users) > 0:
            user_id = users[0].get("id")
            
            response = self.session.post(f"{BASE_URL}/api/admin/wallet/credit", json={
                "target_id": user_id,
                "target_type": "user",
                "amount": 1000,
                "currency": "XOF",
                "reason": "Test credit from Super Admin"
            })
            assert response.status_code == 200
            data = response.json()
            assert "transaction_id" in data
            print(f"TEST PASSED: User wallet credited - {data}")
        else:
            pytest.skip("No users to test")
    
    def test_wallet_debit_user(self):
        """Test POST /api/admin/wallet/debit debits user wallet"""
        # Get a user
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json().get("users", response.json())
        
        if len(users) > 0:
            user_id = users[0].get("id")
            
            # First credit to ensure balance
            self.session.post(f"{BASE_URL}/api/admin/wallet/credit", json={
                "target_id": user_id,
                "target_type": "user",
                "amount": 500,
                "currency": "XOF",
                "reason": "Pre-debit credit"
            })
            
            response = self.session.post(f"{BASE_URL}/api/admin/wallet/debit", json={
                "target_id": user_id,
                "target_type": "user",
                "amount": 100,
                "currency": "XOF",
                "reason": "Test debit from Super Admin"
            })
            assert response.status_code == 200
            data = response.json()
            assert "transaction_id" in data
            print(f"TEST PASSED: User wallet debited - {data}")
        else:
            pytest.skip("No users to test")
    
    def test_wallet_credit_partner(self):
        """Test POST /api/admin/wallet/credit credits partner wallet"""
        # Get a partner
        response = self.session.get(f"{BASE_URL}/api/partners/admin/list")
        partners = response.json().get("partners", [])
        
        if len(partners) > 0:
            partner_id = partners[0].get("id")
            
            response = self.session.post(f"{BASE_URL}/api/admin/wallet/credit", json={
                "target_id": partner_id,
                "target_type": "partner",
                "amount": 5000,
                "currency": "XOF",
                "reason": "Test partner credit from Super Admin"
            })
            assert response.status_code == 200
            data = response.json()
            assert "transaction_id" in data
            print(f"TEST PASSED: Partner wallet credited - {data}")
        else:
            pytest.skip("No partners to test")


class TestDocumentManagement:
    """Test admin document management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sbpaygo.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_get_documents(self):
        """Test GET /api/admin/documents returns document list"""
        response = self.session.get(f"{BASE_URL}/api/admin/documents")
        assert response.status_code == 200
        data = response.json()
        assert "documents" in data or isinstance(data, list)
        print(f"TEST PASSED: Got documents list")
    
    def test_get_documents_by_user(self):
        """Test GET /api/admin/documents?user_id={id} returns user documents"""
        # Get a user
        response = self.session.get(f"{BASE_URL}/api/admin/users")
        users = response.json().get("users", response.json())
        
        if len(users) > 0:
            user_id = users[0].get("id")
            response = self.session.get(f"{BASE_URL}/api/admin/documents?user_id={user_id}")
            assert response.status_code == 200
            print("TEST PASSED: Got user documents")
        else:
            pytest.skip("No users to test")


class TestSearchFunctionality:
    """Test search and filter functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sbpaygo.com",
            "password": "adminpassword"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Admin login failed")
    
    def test_filter_partners_by_status(self):
        """Test GET /api/partners/admin/list?status=active filters by status"""
        response = self.session.get(f"{BASE_URL}/api/partners/admin/list?status=active")
        assert response.status_code == 200
        data = response.json()
        partners = data.get("partners", [])
        
        # Verify all returned partners are active
        for partner in partners:
            assert partner.get("status") == "active"
        
        print(f"TEST PASSED: Filtered {len(partners)} active partners")
    
    def test_filter_partners_by_pending(self):
        """Test GET /api/partners/admin/list?status=pending filters pending partners"""
        response = self.session.get(f"{BASE_URL}/api/partners/admin/list?status=pending")
        assert response.status_code == 200
        data = response.json()
        partners = data.get("partners", [])
        
        # Verify all returned partners are pending
        for partner in partners:
            assert partner.get("status") == "pending"
        
        print(f"TEST PASSED: Filtered {len(partners)} pending partners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
