"""
SBPAYGO P2P Transfer Module Tests
Tests: Phone lookup, P2P transfers, transfer history, recent contacts, validations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER1_EMAIL = "user@sbpaygo.com"
USER1_PASSWORD = "userpassword"
USER2_EMAIL = "test@sbpaygo.com"
USER2_PASSWORD = "testpassword"
USER2_PHONE = "+221771234567"


class TestPhoneLookup:
    """Phone lookup endpoint tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_lookup_existing_user(self, user_token):
        """Test phone lookup for existing user"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/users/lookup-phone",
            params={"phone": USER2_PHONE},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"] == True
        assert "user_id" in data
        assert "display_name" in data
        assert "phone_masked" in data
        # Phone should be masked (***XXXX format)
        assert data["phone_masked"].startswith("***")
        print(f"✓ Phone lookup found: {data['display_name']} ({data['phone_masked']})")
    
    def test_lookup_nonexistent_user(self, user_token):
        """Test phone lookup for non-existent user"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/users/lookup-phone",
            params={"phone": "+221999999999"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "trouvé" in data["detail"].lower() or "found" in data["detail"].lower()
        print("✓ Non-existent user correctly returns 404")
    
    def test_lookup_self_blocked(self, user_token):
        """Test that looking up own phone is blocked"""
        # Get user's own phone
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        user_phone = me_response.json().get("phone")
        
        if not user_phone:
            pytest.skip("User has no phone number")
        
        response = requests.get(
            f"{BASE_URL}/api/wallet/users/lookup-phone",
            params={"phone": user_phone},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "vous-même" in data["detail"].lower() or "yourself" in data["detail"].lower()
        print("✓ Self-lookup correctly blocked")
    
    def test_lookup_requires_auth(self):
        """Test that phone lookup requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/users/lookup-phone",
            params={"phone": USER2_PHONE}
        )
        assert response.status_code == 401
        print("✓ Phone lookup correctly requires authentication")


class TestP2PTransfer:
    """P2P transfer endpoint tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_transfer_insufficient_balance(self, user_token):
        """Test transfer with insufficient balance"""
        # Try to transfer EUR (user has 0 EUR balance)
        response = requests.post(
            f"{BASE_URL}/api/wallet/transfer-phone",
            json={
                "recipient_phone": USER2_PHONE,
                "amount": 1000,
                "currency": "EUR",
                "description": "Test insufficient balance"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "insuffisant" in data["detail"].lower() or "insufficient" in data["detail"].lower()
        print("✓ Insufficient balance correctly rejected")
    
    def test_transfer_max_limit(self, user_token):
        """Test transfer exceeding max single transfer limit"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/transfer-phone",
            json={
                "recipient_phone": USER2_PHONE,
                "amount": 600000,  # Max is 500,000 XOF
                "currency": "XOF",
                "description": "Test max limit"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "maximum" in data["detail"].lower()
        print("✓ Max transfer limit correctly enforced")
    
    def test_transfer_to_nonexistent_user(self, user_token):
        """Test transfer to non-existent phone number"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/transfer-phone",
            json={
                "recipient_phone": "+221999999999",
                "amount": 1000,
                "currency": "XOF",
                "description": "Test non-existent"
            },
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "trouvé" in data["detail"].lower() or "found" in data["detail"].lower()
        print("✓ Transfer to non-existent user correctly rejected")
    
    def test_transfer_requires_auth(self):
        """Test that transfer requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/transfer-phone",
            json={
                "recipient_phone": USER2_PHONE,
                "amount": 1000,
                "currency": "XOF"
            }
        )
        assert response.status_code == 401
        print("✓ Transfer correctly requires authentication")


class TestTransferHistory:
    """Transfer history endpoint tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_get_transfer_history(self, user_token):
        """Test getting transfer history"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/transfer-phone/history",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "transfers" in data
        assert "count" in data
        assert isinstance(data["transfers"], list)
        
        # Check transfer structure if any exist
        if data["transfers"]:
            transfer = data["transfers"][0]
            assert "id" in transfer
            assert "amount" in transfer
            assert "currency" in transfer
            assert "status" in transfer
            assert "direction" in transfer
            assert transfer["direction"] in ["sent", "received"]
        
        print(f"✓ Transfer history: {data['count']} transfers found")
    
    def test_transfer_history_pagination(self, user_token):
        """Test transfer history pagination"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/transfer-phone/history",
            params={"limit": 5, "offset": 0},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["transfers"]) <= 5
        print(f"✓ Transfer history pagination: {len(data['transfers'])} transfers returned")
    
    def test_transfer_history_requires_auth(self):
        """Test that transfer history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/wallet/transfer-phone/history")
        assert response.status_code == 401
        print("✓ Transfer history correctly requires authentication")


class TestRecentContacts:
    """Recent contacts endpoint tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER1_EMAIL,
            "password": USER1_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("User login failed")
        return response.json()["access_token"]
    
    def test_get_recent_contacts(self, user_token):
        """Test getting recent contacts"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/transfer-phone/contacts",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        assert isinstance(data["contacts"], list)
        
        # Check contact structure if any exist
        if data["contacts"]:
            contact = data["contacts"][0]
            assert "user_id" in contact
            assert "name" in contact
            assert "phone_masked" in contact
            assert "transfer_count" in contact
        
        print(f"✓ Recent contacts: {len(data['contacts'])} contacts found")
    
    def test_recent_contacts_limit(self, user_token):
        """Test recent contacts limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/transfer-phone/contacts",
            params={"limit": 3},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["contacts"]) <= 3
        print(f"✓ Recent contacts limit: {len(data['contacts'])} contacts returned")
    
    def test_recent_contacts_requires_auth(self):
        """Test that recent contacts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/wallet/transfer-phone/contacts")
        assert response.status_code == 401
        print("✓ Recent contacts correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
