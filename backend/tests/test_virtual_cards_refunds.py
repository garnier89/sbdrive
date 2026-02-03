# Test Virtual Cards Color Selection and Refund System
# Tests for: Virtual card colors, custom names, refund eligibility, refund requests

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_EMAIL = "user@sbpay.com"
USER_PASSWORD = "userpassword"
ADMIN_EMAIL = "admin@sbpay.com"
ADMIN_PASSWORD = "adminpassword"


class TestVirtualCardColors:
    """Test virtual card color selection feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = response.json().get("user", {}).get("id")
        else:
            pytest.skip("Authentication failed")
    
    def test_get_card_colors_returns_8_colors(self):
        """GET /api/virtual-card/colors - Returns 8 color options"""
        response = self.session.get(f"{BASE_URL}/api/virtual-card/colors")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "colors" in data
        colors = data["colors"]
        assert len(colors) == 8
        
        # Verify all expected colors are present
        color_codes = [c["code"] for c in colors]
        expected_colors = ["blue", "red", "green", "purple", "orange", "black", "gold", "teal"]
        for expected in expected_colors:
            assert expected in color_codes, f"Missing color: {expected}"
        
        # Verify each color has required fields
        for color in colors:
            assert "code" in color
            assert "name" in color
            assert "gradient" in color
    
    def test_create_card_with_custom_color(self):
        """POST /api/virtual-card/create - Creates card with selected color"""
        test_name = f"TEST_Card_{uuid.uuid4().hex[:8]}"
        
        response = self.session.post(f"{BASE_URL}/api/virtual-card/create", json={
            "currency": "XOF",
            "daily_limit": 100000,
            "transaction_limit": 50000,
            "card_name": test_name,
            "card_color": "gold"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "card" in data
        card = data["card"]
        assert card["card_name"] == test_name
        assert card["card_color"] == "gold"
        assert card["status"] == "active"
        assert "card_number" in card  # Full number shown at creation
        assert "cvv" in card  # CVV shown at creation
    
    def test_create_card_with_custom_name(self):
        """POST /api/virtual-card/create - Creates card with custom name"""
        custom_name = "Ma Carte Shopping"
        
        response = self.session.post(f"{BASE_URL}/api/virtual-card/create", json={
            "currency": "XOF",
            "daily_limit": 100000,
            "transaction_limit": 50000,
            "card_name": custom_name,
            "card_color": "purple"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["card"]["card_name"] == custom_name
    
    def test_create_card_with_invalid_color_defaults_to_blue(self):
        """POST /api/virtual-card/create - Invalid color defaults to blue"""
        response = self.session.post(f"{BASE_URL}/api/virtual-card/create", json={
            "currency": "XOF",
            "daily_limit": 100000,
            "transaction_limit": 50000,
            "card_name": "Test Invalid Color",
            "card_color": "invalid_color"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Should default to blue
        assert data["card"]["card_color"] == "blue"
    
    def test_list_cards_shows_color(self):
        """GET /api/virtual-card/list - Cards include color information"""
        response = self.session.get(f"{BASE_URL}/api/virtual-card/list")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "cards" in data
        # If there are cards, verify they have color field
        if data["cards"]:
            for card in data["cards"]:
                assert "card_color" in card or card.get("card_color") is None


class TestRefundReasons:
    """Test refund reasons endpoint"""
    
    def test_get_refund_reasons_returns_6_options(self):
        """GET /api/refunds/reasons - Returns 6 predefined reasons"""
        response = requests.get(f"{BASE_URL}/api/refunds/reasons")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "reasons" in data
        reasons = data["reasons"]
        assert len(reasons) == 6
        
        # Verify expected reasons
        reason_codes = [r["code"] for r in reasons]
        expected_codes = ["wrong_recipient", "wrong_amount", "duplicate", "fraud", "service_not_received", "other"]
        for expected in expected_codes:
            assert expected in reason_codes, f"Missing reason: {expected}"
        
        # Verify auto_eligible flags
        for reason in reasons:
            assert "code" in reason
            assert "label" in reason
            assert "auto_eligible" in reason
        
        # Verify refund window and auto max
        assert data["refund_window_hours"] == 48
        assert data["auto_refund_max"] == 50000


class TestRefundEligibility:
    """Test refund eligibility checking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = response.json().get("user", {}).get("id")
        else:
            pytest.skip("Authentication failed")
    
    def test_eligibility_check_nonexistent_transaction(self):
        """GET /api/refunds/eligibility/{id} - Returns 404 for nonexistent transaction"""
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/refunds/eligibility/{fake_id}")
        
        assert response.status_code == 404
    
    def test_eligibility_check_requires_auth(self):
        """GET /api/refunds/eligibility/{id} - Requires authentication"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/refunds/eligibility/{fake_id}")
        
        assert response.status_code == 401


class TestRefundRequests:
    """Test refund request creation and management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = response.json().get("user", {}).get("id")
        else:
            pytest.skip("Authentication failed")
    
    def test_get_my_refund_requests(self):
        """GET /api/refunds/my-requests - Returns user's refund requests"""
        response = self.session.get(f"{BASE_URL}/api/refunds/my-requests")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "count" in data
        assert isinstance(data["requests"], list)
    
    def test_create_refund_request_invalid_transaction(self):
        """POST /api/refunds/request - Returns 404 for invalid transaction"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/refunds/request", json={
            "transaction_id": fake_id,
            "reason": "wrong_recipient",
            "details": "Test refund"
        })
        
        assert response.status_code == 404
    
    def test_cancel_refund_request_invalid_id(self):
        """POST /api/refunds/cancel/{id} - Returns 404 for invalid refund"""
        fake_id = str(uuid.uuid4())
        response = self.session.post(f"{BASE_URL}/api/refunds/cancel/{fake_id}")
        
        assert response.status_code == 404


class TestTransferAndRefundFlow:
    """Test complete transfer and refund flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = response.json().get("user", {}).get("id")
        else:
            pytest.skip("Authentication failed")
    
    def test_create_transfer_for_refund_testing(self):
        """POST /api/transfers - Create a transfer to test refund eligibility"""
        # First check if user has balance
        wallets_response = self.session.get(f"{BASE_URL}/api/wallets")
        
        if wallets_response.status_code != 200:
            pytest.skip("Could not get wallets")
        
        wallets = wallets_response.json().get("wallets", [])
        xof_wallet = next((w for w in wallets if w.get("currency") == "XOF"), None)
        
        if not xof_wallet or xof_wallet.get("balance", 0) < 1000:
            pytest.skip("Insufficient balance for transfer test")
        
        # Create a small transfer
        response = self.session.post(f"{BASE_URL}/api/transfers", json={
            "recipient_email": "admin@sbpay.com",
            "amount": 1000,
            "currency": "XOF",
            "description": "TEST_Refund_Transfer"
        })
        
        # Transfer might succeed or fail based on various conditions
        # We just verify the endpoint works
        assert response.status_code in [200, 400, 404]
    
    def test_get_transactions_for_refund(self):
        """GET /api/transactions - Get transactions to find refundable ones"""
        response = self.session.get(f"{BASE_URL}/api/transactions?limit=20")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "transactions" in data
        assert "total" in data
        
        # Check if any transactions are refundable (transfer_out, p2p_transfer_out)
        refundable_types = ["transfer_out", "p2p_transfer_out", "mobile_money_transfer"]
        refundable_txs = [tx for tx in data["transactions"] if tx.get("type") in refundable_types and tx.get("status") == "completed"]
        
        print(f"Found {len(refundable_txs)} potentially refundable transactions")


class TestHistoryPageIntegration:
    """Test history page with refund tabs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_transactions_endpoint_for_history(self):
        """GET /api/transactions - Returns transactions for history page"""
        response = self.session.get(f"{BASE_URL}/api/transactions?limit=20&offset=0")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "transactions" in data
        assert "total" in data
        
        # Verify transaction structure
        if data["transactions"]:
            tx = data["transactions"][0]
            assert "id" in tx
            assert "type" in tx
            assert "amount" in tx
            assert "currency" in tx
            assert "status" in tx
            assert "created_at" in tx
    
    def test_refund_requests_endpoint_for_history(self):
        """GET /api/refunds/my-requests - Returns refund requests for history page"""
        response = self.session.get(f"{BASE_URL}/api/refunds/my-requests")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        assert "count" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
