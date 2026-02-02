# Quick PIN Login Feature Tests
# Tests for /api/auth/quick-pin/* endpoints

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_EMAIL = "user@sbpay.com"
USER_PASSWORD = "userpassword"
ADMIN_EMAIL = "admin@sbpay.com"
ADMIN_PASSWORD = "adminpassword"
TEST_PIN = "1234"
NEW_PIN = "5678"


class TestQuickPinLoginSetup:
    """Tests for Quick PIN setup and configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Could not authenticate user")
    
    def test_quick_pin_status_not_configured(self):
        """Test GET /api/auth/quick-pin/status when not configured"""
        response = self.session.get(f"{BASE_URL}/api/auth/quick-pin/status")
        assert response.status_code == 200
        data = response.json()
        # Status should return enabled field
        assert "enabled" in data
        print(f"Quick PIN status: {data}")
    
    def test_quick_pin_status_requires_auth(self):
        """Test that status endpoint requires authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/auth/quick-pin/status")
        assert response.status_code == 401
        print("Status endpoint correctly requires authentication")
    
    def test_quick_pin_setup_requires_auth(self):
        """Test that setup endpoint requires authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": TEST_PIN,
            "password": USER_PASSWORD
        })
        assert response.status_code == 401
        print("Setup endpoint correctly requires authentication")
    
    def test_quick_pin_setup_wrong_password(self):
        """Test setup with wrong password"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": TEST_PIN,
            "password": "wrongpassword"
        })
        assert response.status_code == 400
        data = response.json()
        assert "incorrect" in data.get("detail", "").lower() or "mot de passe" in data.get("detail", "").lower()
        print(f"Wrong password correctly rejected: {data}")
    
    def test_quick_pin_setup_invalid_pin_format(self):
        """Test setup with non-numeric PIN"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": "abcd",
            "password": USER_PASSWORD
        })
        assert response.status_code == 400
        print("Non-numeric PIN correctly rejected")
    
    def test_quick_pin_setup_pin_too_short(self):
        """Test setup with PIN too short"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": "12",
            "password": USER_PASSWORD
        })
        assert response.status_code == 422  # Validation error
        print("Short PIN correctly rejected")
    
    def test_quick_pin_setup_success(self):
        """Test successful PIN setup"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": TEST_PIN,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "device_token" in data
        assert "message" in data
        assert len(data["device_token"]) > 20  # Token should be substantial
        print(f"PIN setup successful, device_token length: {len(data['device_token'])}")
        
        # Store device token for later tests
        self.__class__.device_token = data["device_token"]
        return data["device_token"]


class TestQuickPinLogin:
    """Tests for Quick PIN login functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup device token for login tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # First login and setup PIN to get device token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate user")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Setup PIN to get device token
        setup_response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": TEST_PIN,
            "password": USER_PASSWORD
        })
        if setup_response.status_code == 200:
            self.device_token = setup_response.json().get("device_token")
        else:
            pytest.skip("Could not setup PIN")
    
    def test_check_device_valid(self):
        """Test POST /api/auth/quick-pin/check-device with valid token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/quick-pin/check-device?device_token={self.device_token}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True
        assert "user_hint" in data
        assert "email_masked" in data
        print(f"Device check valid: user_hint={data.get('user_hint')}, email={data.get('email_masked')}")
    
    def test_check_device_invalid(self):
        """Test check-device with invalid token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/quick-pin/check-device?device_token=invalid_token_12345"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == False
        print(f"Invalid device correctly rejected: {data}")
    
    def test_quick_pin_login_success(self):
        """Test successful login with device token and PIN"""
        # Use a fresh session without auth header
        login_session = requests.Session()
        login_session.headers.update({"Content-Type": "application/json"})
        
        response = login_session.post(f"{BASE_URL}/api/auth/quick-pin/login", json={
            "device_token": self.device_token,
            "pin": TEST_PIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data.get("login_method") == "quick_pin"
        print(f"Quick PIN login successful for user: {data['user'].get('email')}")
    
    def test_quick_pin_login_wrong_pin(self):
        """Test login with wrong PIN"""
        login_session = requests.Session()
        login_session.headers.update({"Content-Type": "application/json"})
        
        response = login_session.post(f"{BASE_URL}/api/auth/quick-pin/login", json={
            "device_token": self.device_token,
            "pin": "9999"
        })
        assert response.status_code == 400
        data = response.json()
        assert "incorrect" in data.get("detail", "").lower() or "tentatives" in data.get("detail", "").lower()
        print(f"Wrong PIN correctly rejected: {data}")
    
    def test_quick_pin_login_invalid_device(self):
        """Test login with invalid device token"""
        login_session = requests.Session()
        login_session.headers.update({"Content-Type": "application/json"})
        
        response = login_session.post(f"{BASE_URL}/api/auth/quick-pin/login", json={
            "device_token": "invalid_device_token",
            "pin": TEST_PIN
        })
        assert response.status_code == 401
        print("Invalid device token correctly rejected")


class TestQuickPinManagement:
    """Tests for PIN change and disable functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session with PIN configured"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate user")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Setup PIN
        setup_response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/setup", json={
            "pin": TEST_PIN,
            "password": USER_PASSWORD
        })
        if setup_response.status_code == 200:
            self.device_token = setup_response.json().get("device_token")
    
    def test_quick_pin_status_enabled(self):
        """Test status shows enabled after setup"""
        response = self.session.get(f"{BASE_URL}/api/auth/quick-pin/status")
        assert response.status_code == 200
        data = response.json()
        assert data.get("enabled") == True
        assert "expires_at" in data
        print(f"PIN status enabled, expires: {data.get('expires_at')}")
    
    def test_quick_pin_change_wrong_current(self):
        """Test change PIN with wrong current PIN"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/change", json={
            "current_pin": "9999",
            "new_pin": NEW_PIN
        })
        assert response.status_code == 400
        print("Wrong current PIN correctly rejected for change")
    
    def test_quick_pin_change_success(self):
        """Test successful PIN change"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/change", json={
            "current_pin": TEST_PIN,
            "new_pin": NEW_PIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PIN change successful: {data}")
        
        # Verify new PIN works for login
        login_session = requests.Session()
        login_session.headers.update({"Content-Type": "application/json"})
        
        login_response = login_session.post(f"{BASE_URL}/api/auth/quick-pin/login", json={
            "device_token": self.device_token,
            "pin": NEW_PIN
        })
        assert login_response.status_code == 200
        print("Login with new PIN successful")
        
        # Change back to original PIN for other tests
        self.session.post(f"{BASE_URL}/api/auth/quick-pin/change", json={
            "current_pin": NEW_PIN,
            "new_pin": TEST_PIN
        })
    
    def test_quick_pin_disable_wrong_pin(self):
        """Test disable with wrong PIN"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/disable", json={
            "pin": "9999"
        })
        assert response.status_code == 400
        print("Wrong PIN correctly rejected for disable")
    
    def test_quick_pin_disable_success(self):
        """Test successful PIN disable"""
        response = self.session.post(f"{BASE_URL}/api/auth/quick-pin/disable", json={
            "pin": TEST_PIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PIN disable successful: {data}")
        
        # Verify status shows disabled
        status_response = self.session.get(f"{BASE_URL}/api/auth/quick-pin/status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data.get("enabled") == False
        print("PIN status correctly shows disabled")


class TestQuickPinSecurity:
    """Security tests for Quick PIN feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for security tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate user")
        
        token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_change_requires_auth(self):
        """Test that change endpoint requires authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/quick-pin/change", json={
            "current_pin": TEST_PIN,
            "new_pin": NEW_PIN
        })
        assert response.status_code == 401
        print("Change endpoint correctly requires authentication")
    
    def test_disable_requires_auth(self):
        """Test that disable endpoint requires authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/quick-pin/disable", json={
            "pin": TEST_PIN
        })
        assert response.status_code == 401
        print("Disable endpoint correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
