# Test module for PDF Receipts and Dashboard features
# Tests: PDF receipt generation, transaction data for charts

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPDFReceipts:
    """PDF Receipt generation endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@sbmoney.com",
            "password": "userpassword"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a transaction ID for testing
        tx_response = self.session.get(f"{BASE_URL}/api/transactions?limit=1")
        assert tx_response.status_code == 200
        transactions = tx_response.json().get("transactions", [])
        self.transaction_id = transactions[0]["id"] if transactions else None
    
    def test_receipt_endpoint_returns_pdf(self):
        """Test that receipt endpoint returns valid PDF"""
        if not self.transaction_id:
            pytest.skip("No transactions available for testing")
        
        response = self.session.get(
            f"{BASE_URL}/api/receipts/transaction/{self.transaction_id}"
        )
        
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "application/pdf"
        assert "Content-Disposition" in response.headers
        assert "attachment" in response.headers.get("Content-Disposition", "")
        assert len(response.content) > 0
    
    def test_receipt_requires_authentication(self):
        """Test that receipt endpoint requires auth"""
        if not self.transaction_id:
            pytest.skip("No transactions available for testing")
        
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(
            f"{BASE_URL}/api/receipts/transaction/{self.transaction_id}"
        )
        
        assert response.status_code == 401
    
    def test_receipt_not_found_for_invalid_id(self):
        """Test that invalid transaction ID returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/receipts/transaction/invalid-transaction-id-12345"
        )
        
        assert response.status_code == 404
    
    def test_receipt_filename_format(self):
        """Test that PDF filename follows expected format"""
        if not self.transaction_id:
            pytest.skip("No transactions available for testing")
        
        response = self.session.get(
            f"{BASE_URL}/api/receipts/transaction/{self.transaction_id}"
        )
        
        assert response.status_code == 200
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "recu_sbmoney_" in content_disposition
        assert ".pdf" in content_disposition


class TestDashboardData:
    """Dashboard data endpoints for charts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@sbmoney.com",
            "password": "userpassword"
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_transactions_endpoint_returns_data(self):
        """Test transactions endpoint returns data for charts"""
        response = self.session.get(f"{BASE_URL}/api/transactions?limit=50")
        
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "total" in data
        assert isinstance(data["transactions"], list)
    
    def test_transactions_have_required_fields_for_charts(self):
        """Test transactions have fields needed for dashboard charts"""
        response = self.session.get(f"{BASE_URL}/api/transactions?limit=10")
        
        assert response.status_code == 200
        transactions = response.json().get("transactions", [])
        
        if transactions:
            tx = transactions[0]
            # Required fields for charts
            assert "amount" in tx
            assert "type" in tx
            assert "created_at" in tx
            assert "currency" in tx
    
    def test_wallets_endpoint_returns_data(self):
        """Test wallets endpoint returns data for balance display"""
        response = self.session.get(f"{BASE_URL}/api/wallets")
        
        assert response.status_code == 200
        wallets = response.json()
        assert isinstance(wallets, list)
        
        if wallets:
            wallet = wallets[0]
            assert "balance" in wallet
            assert "currency" in wallet


class TestThemeSupport:
    """Test theme-related functionality (backend doesn't handle theme, but verify no conflicts)"""
    
    def test_api_works_regardless_of_theme(self):
        """Verify API works - theme is frontend-only"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@sbmoney.com",
            "password": "userpassword"
        })
        
        assert response.status_code == 200
        assert "access_token" in response.json()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
