"""
Test Money Requests API - Phase 1 UX Features
Tests for:
- User lookup by SBPAYGO ID, email, phone
- Create money request
- Get sent/received requests
- Respond to requests (approve/reject)
- Cancel requests
- Login returns sbpaygo_id
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_CREDENTIALS = {"email": "user@sbpaygo.com", "password": "userpassword"}
TEST_CREDENTIALS = {"email": "test@sbpaygo.com", "password": "testpassword"}
ADMIN_CREDENTIALS = {"email": "admin@sbpaygo.com", "password": "adminpassword"}


class TestLoginSbpaygoId:
    """Test that login returns sbpaygo_id"""
    
    def test_user_login_returns_sbpaygo_id(self):
        """User login should return sbpaygo_id in user object"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert "sbpaygo_id" in data["user"]
        assert data["user"]["sbpaygo_id"].startswith("SBP-")
        assert len(data["user"]["sbpaygo_id"]) == 13  # SBP-XXXX-XXXX format
        print(f"User sbpaygo_id: {data['user']['sbpaygo_id']}")
    
    def test_test_user_login_returns_sbpaygo_id(self):
        """Test user login should return sbpaygo_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS)
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert "sbpaygo_id" in data["user"]
        assert data["user"]["sbpaygo_id"].startswith("SBP-")
        print(f"Test user sbpaygo_id: {data['user']['sbpaygo_id']}")
    
    def test_admin_login_returns_sbpaygo_id(self):
        """Admin login should return sbpaygo_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        
        data = response.json()
        assert "user" in data
        assert "sbpaygo_id" in data["user"]
        assert data["user"]["sbpaygo_id"].startswith("SBP-")
        print(f"Admin sbpaygo_id: {data['user']['sbpaygo_id']}")


class TestMoneyRequestsLookup:
    """Test user lookup for money requests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_user_info(self):
        """Get test user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS)
        return response.json()["user"]
    
    def test_lookup_by_sbpaygo_id(self, auth_token, test_user_info):
        """Lookup user by SBPAYGO ID"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        sbpaygo_id = test_user_info["sbpaygo_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/money-requests/lookup",
            params={"type": "sbpaygo_id", "value": sbpaygo_id},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert data["sbpaygo_id"] == sbpaygo_id
        assert "name" in data
        print(f"Found user by ID: {data['name']}")
    
    def test_lookup_by_email(self, auth_token):
        """Lookup user by email"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/money-requests/lookup",
            params={"type": "email", "value": "test@sbpaygo.com"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert "sbpaygo_id" in data
        print(f"Found user by email: {data['name']}")
    
    def test_lookup_by_phone(self, auth_token):
        """Lookup user by phone"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/money-requests/lookup",
            params={"type": "phone", "value": "+221771234567"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        print(f"Found user by phone: {data['name']}")
    
    def test_lookup_nonexistent_user(self, auth_token):
        """Lookup nonexistent user should return 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/money-requests/lookup",
            params={"type": "sbpaygo_id", "value": "SBP-XXXX-XXXX"},
            headers=headers
        )
        
        assert response.status_code == 404
    
    def test_lookup_without_auth(self):
        """Lookup without auth should return 401"""
        response = requests.get(
            f"{BASE_URL}/api/money-requests/lookup",
            params={"type": "email", "value": "test@sbpaygo.com"}
        )
        
        assert response.status_code == 401


class TestMoneyRequestsCreate:
    """Test creating money requests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_user_info(self):
        """Get test user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS)
        return response.json()["user"]
    
    def test_create_money_request_by_id(self, auth_token, test_user_info):
        """Create money request using SBPAYGO ID"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/money-requests/create",
            json={
                "recipient_type": "sbpaygo_id",
                "recipient_value": test_user_info["sbpaygo_id"],
                "amount": 1000,
                "currency": "XOF",
                "message": "Test request by ID"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "request_id" in data
        print(f"Created request: {data['request_id']}")
    
    def test_create_money_request_by_email(self, auth_token):
        """Create money request using email"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/money-requests/create",
            json={
                "recipient_type": "email",
                "recipient_value": "test@sbpaygo.com",
                "amount": 2000,
                "currency": "XOF",
                "message": "Test request by email"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_create_money_request_invalid_amount(self, auth_token, test_user_info):
        """Create money request with invalid amount should fail"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/money-requests/create",
            json={
                "recipient_type": "sbpaygo_id",
                "recipient_value": test_user_info["sbpaygo_id"],
                "amount": -100,
                "currency": "XOF"
            },
            headers=headers
        )
        
        assert response.status_code == 400
    
    def test_create_money_request_to_self(self, auth_token):
        """Create money request to self should fail"""
        # Get user's own sbpaygo_id
        user_response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        user_sbpaygo_id = user_response.json()["user"]["sbpaygo_id"]
        
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/api/money-requests/create",
            json={
                "recipient_type": "sbpaygo_id",
                "recipient_value": user_sbpaygo_id,
                "amount": 1000,
                "currency": "XOF"
            },
            headers=headers
        )
        
        assert response.status_code == 400


class TestMoneyRequestsSentReceived:
    """Test getting sent and received requests"""
    
    @pytest.fixture
    def user_token(self):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_token(self):
        """Get auth token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_get_sent_requests(self, user_token):
        """Get sent money requests"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = requests.get(f"{BASE_URL}/api/money-requests/sent", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
        print(f"Sent requests count: {len(data['requests'])}")
    
    def test_get_received_requests(self, test_token):
        """Get received money requests"""
        headers = {"Authorization": f"Bearer {test_token}"}
        
        response = requests.get(f"{BASE_URL}/api/money-requests/received", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
        print(f"Received requests count: {len(data['requests'])}")
    
    def test_sent_requests_without_auth(self):
        """Get sent requests without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/money-requests/sent")
        assert response.status_code == 401
    
    def test_received_requests_without_auth(self):
        """Get received requests without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/money-requests/received")
        assert response.status_code == 401


class TestMoneyRequestsRespond:
    """Test responding to money requests"""
    
    @pytest.fixture
    def user_token(self):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_token(self):
        """Get auth token for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_reject_request(self, user_token, test_token):
        """Test rejecting a money request"""
        # First create a request
        user_headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        
        create_response = requests.post(
            f"{BASE_URL}/api/money-requests/create",
            json={
                "recipient_type": "email",
                "recipient_value": "test@sbpaygo.com",
                "amount": 500,
                "currency": "XOF",
                "message": "Request to reject"
            },
            headers=user_headers
        )
        
        assert create_response.status_code == 200
        request_id = create_response.json()["request_id"]
        
        # Now reject it as test user
        test_headers = {"Authorization": f"Bearer {test_token}", "Content-Type": "application/json"}
        
        reject_response = requests.post(
            f"{BASE_URL}/api/money-requests/respond",
            json={"request_id": request_id, "action": "reject"},
            headers=test_headers
        )
        
        assert reject_response.status_code == 200
        assert reject_response.json()["success"] == True
        print(f"Rejected request: {request_id}")


class TestMoneyRequestsCancel:
    """Test canceling money requests"""
    
    @pytest.fixture
    def user_token(self):
        """Get auth token for user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        return response.json()["access_token"]
    
    def test_cancel_own_request(self, user_token):
        """Test canceling own money request"""
        headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        
        # Create a request
        create_response = requests.post(
            f"{BASE_URL}/api/money-requests/create",
            json={
                "recipient_type": "email",
                "recipient_value": "test@sbpaygo.com",
                "amount": 300,
                "currency": "XOF",
                "message": "Request to cancel"
            },
            headers=headers
        )
        
        assert create_response.status_code == 200
        request_id = create_response.json()["request_id"]
        
        # Cancel it
        cancel_response = requests.post(
            f"{BASE_URL}/api/money-requests/cancel/{request_id}",
            headers=headers
        )
        
        assert cancel_response.status_code == 200
        print(f"Cancelled request: {request_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
