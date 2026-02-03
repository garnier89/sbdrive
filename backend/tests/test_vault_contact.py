# Test file for Vault (Coffre-Fort) and Contact/Support modules
# SB Pay - Iteration 5

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://payport-9.preview.emergentagent.com')

# Test credentials
USER_CREDS = {"email": "user@sbpay.com", "password": "userpassword"}
ADMIN_CREDS = {"email": "admin@sbpay.com", "password": "adminpassword"}
VAULT_PIN = "123456"

# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def user_token():
    """Get user authentication token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDS)
    if res.status_code == 200:
        return res.json().get("access_token")
    pytest.skip("User authentication failed")

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if res.status_code == 200:
        return res.json().get("access_token")
    pytest.skip("Admin authentication failed")

@pytest.fixture
def user_headers(user_token):
    """User auth headers"""
    return {"Authorization": f"Bearer {user_token}"}

@pytest.fixture
def admin_headers(admin_token):
    """Admin auth headers"""
    return {"Authorization": f"Bearer {admin_token}"}

# ==================== VAULT MODULE TESTS ====================

class TestVaultBalance:
    """Tests for GET /api/vault/balance"""
    
    def test_get_vault_balance_success(self, user_headers):
        """Test getting vault balance with valid auth"""
        res = requests.get(f"{BASE_URL}/api/vault/balance?currency=XOF", headers=user_headers)
        assert res.status_code == 200
        
        data = res.json()
        assert "balance" in data
        assert "currency" in data
        assert "has_pin" in data
        assert "is_locked" in data
        assert "limits" in data
        assert data["currency"] == "XOF"
        assert isinstance(data["balance"], (int, float))
        assert isinstance(data["has_pin"], bool)
        
    def test_get_vault_balance_no_auth(self):
        """Test vault balance without authentication"""
        res = requests.get(f"{BASE_URL}/api/vault/balance?currency=XOF")
        assert res.status_code == 401
        
    def test_vault_limits_structure(self, user_headers):
        """Test vault limits are properly structured"""
        res = requests.get(f"{BASE_URL}/api/vault/balance?currency=XOF", headers=user_headers)
        assert res.status_code == 200
        
        limits = res.json().get("limits", {})
        assert "max_balance" in limits
        assert "daily_withdraw_limit" in limits
        assert "daily_withdraw_remaining" in limits
        assert "max_single_deposit" in limits
        assert "max_single_withdraw" in limits

class TestVaultPin:
    """Tests for PIN operations"""
    
    def test_verify_pin_success(self, user_headers):
        """Test PIN verification with correct PIN"""
        res = requests.post(f"{BASE_URL}/api/vault/verify-pin", headers=user_headers, json={
            "pin": VAULT_PIN
        })
        assert res.status_code == 200
        assert res.json().get("valid") == True
        
    def test_verify_pin_wrong(self, user_headers):
        """Test PIN verification with wrong PIN"""
        res = requests.post(f"{BASE_URL}/api/vault/verify-pin", headers=user_headers, json={
            "pin": "000000"
        })
        assert res.status_code == 400
        assert "incorrect" in res.json().get("detail", "").lower() or "tentatives" in res.json().get("detail", "").lower()
        
    def test_verify_pin_invalid_format(self, user_headers):
        """Test PIN verification with invalid format"""
        res = requests.post(f"{BASE_URL}/api/vault/verify-pin", headers=user_headers, json={
            "pin": "123"  # Too short
        })
        assert res.status_code == 422  # Validation error

class TestVaultDeposit:
    """Tests for POST /api/vault/deposit"""
    
    def test_deposit_success(self, user_headers):
        """Test successful deposit to vault"""
        res = requests.post(f"{BASE_URL}/api/vault/deposit", headers=user_headers, json={
            "amount": 100,
            "currency": "XOF",
            "pin": VAULT_PIN,
            "description": "TEST_deposit"
        })
        assert res.status_code == 200
        
        data = res.json()
        assert "message" in data
        assert "vault_balance" in data
        assert "wallet_balance" in data
        assert "reference" in data
        assert data["reference"].startswith("VD-")
        
    def test_deposit_wrong_pin(self, user_headers):
        """Test deposit with wrong PIN"""
        res = requests.post(f"{BASE_URL}/api/vault/deposit", headers=user_headers, json={
            "amount": 100,
            "currency": "XOF",
            "pin": "000000",
            "description": "TEST_wrong_pin"
        })
        assert res.status_code == 400
        
    def test_deposit_invalid_amount(self, user_headers):
        """Test deposit with invalid amount"""
        res = requests.post(f"{BASE_URL}/api/vault/deposit", headers=user_headers, json={
            "amount": -100,
            "currency": "XOF",
            "pin": VAULT_PIN
        })
        assert res.status_code == 422  # Validation error
        
    def test_deposit_no_auth(self):
        """Test deposit without authentication"""
        res = requests.post(f"{BASE_URL}/api/vault/deposit", json={
            "amount": 100,
            "currency": "XOF",
            "pin": VAULT_PIN
        })
        assert res.status_code == 401

class TestVaultWithdraw:
    """Tests for POST /api/vault/withdraw"""
    
    def test_withdraw_success(self, user_headers):
        """Test successful withdrawal from vault"""
        res = requests.post(f"{BASE_URL}/api/vault/withdraw", headers=user_headers, json={
            "amount": 100,
            "currency": "XOF",
            "pin": VAULT_PIN,
            "destination": "wallet",
            "description": "TEST_withdraw"
        })
        assert res.status_code == 200
        
        data = res.json()
        assert "message" in data
        assert "vault_balance" in data
        assert "wallet_balance" in data
        assert "reference" in data
        assert data["reference"].startswith("VW-")
        
    def test_withdraw_wrong_pin(self, user_headers):
        """Test withdrawal with wrong PIN"""
        res = requests.post(f"{BASE_URL}/api/vault/withdraw", headers=user_headers, json={
            "amount": 100,
            "currency": "XOF",
            "pin": "000000",
            "destination": "wallet"
        })
        assert res.status_code == 400
        
    def test_withdraw_exceeds_balance(self, user_headers):
        """Test withdrawal exceeding vault balance or limits"""
        res = requests.post(f"{BASE_URL}/api/vault/withdraw", headers=user_headers, json={
            "amount": 999999999,
            "currency": "XOF",
            "pin": VAULT_PIN,
            "destination": "wallet"
        })
        assert res.status_code == 400
        # Error can be about insufficient balance or exceeding limits
        detail = res.json().get("detail", "").lower()
        assert "insuffisant" in detail or "maximum" in detail or "limite" in detail

class TestVaultTransactions:
    """Tests for GET /api/vault/transactions"""
    
    def test_get_transactions_success(self, user_headers):
        """Test getting vault transaction history"""
        res = requests.get(f"{BASE_URL}/api/vault/transactions?currency=XOF", headers=user_headers)
        assert res.status_code == 200
        
        data = res.json()
        assert "transactions" in data
        assert "count" in data
        assert "total" in data
        assert isinstance(data["transactions"], list)
        
    def test_transactions_structure(self, user_headers):
        """Test transaction structure"""
        res = requests.get(f"{BASE_URL}/api/vault/transactions?currency=XOF", headers=user_headers)
        assert res.status_code == 200
        
        transactions = res.json().get("transactions", [])
        if transactions:
            tx = transactions[0]
            assert "id" in tx
            assert "type" in tx
            assert "amount" in tx
            assert "currency" in tx
            assert "reference" in tx
            assert "created_at" in tx
            assert tx["type"] in ["deposit", "withdraw"]

# ==================== CONTACT MODULE TESTS ====================

class TestContactCategories:
    """Tests for GET /api/contact/categories"""
    
    def test_get_categories_success(self):
        """Test getting ticket categories (no auth required)"""
        res = requests.get(f"{BASE_URL}/api/contact/categories")
        assert res.status_code == 200
        
        data = res.json()
        assert "categories" in data
        assert "priorities" in data
        assert "statuses" in data
        
    def test_categories_content(self):
        """Test categories contain expected values"""
        res = requests.get(f"{BASE_URL}/api/contact/categories")
        data = res.json()
        
        categories = data.get("categories", {})
        assert "technical" in categories
        assert "transaction" in categories
        assert "security" in categories
        
        priorities = data.get("priorities", {})
        assert "low" in priorities
        assert "normal" in priorities
        assert "high" in priorities
        assert "urgent" in priorities
        
        statuses = data.get("statuses", {})
        assert "open" in statuses
        assert "in_progress" in statuses
        assert "resolved" in statuses
        assert "closed" in statuses

class TestContactTicketCreate:
    """Tests for POST /api/contact/submit"""
    
    def test_create_ticket_success(self, user_headers):
        """Test creating a new support ticket"""
        res = requests.post(f"{BASE_URL}/api/contact/submit", headers=user_headers, json={
            "subject": f"TEST_Ticket_{uuid.uuid4().hex[:8]}",
            "category": "technical",
            "message": "This is a test ticket created by automated testing. Please ignore.",
            "priority": "low"
        })
        assert res.status_code == 200
        
        data = res.json()
        assert "message" in data
        assert "ticket_id" in data
        assert "ticket_number" in data
        assert data["ticket_number"].startswith("TKT-")
        assert data["status"] == "open"
        
    def test_create_ticket_missing_subject(self, user_headers):
        """Test creating ticket without subject"""
        res = requests.post(f"{BASE_URL}/api/contact/submit", headers=user_headers, json={
            "category": "technical",
            "message": "Test message",
            "priority": "low"
        })
        assert res.status_code == 422
        
    def test_create_ticket_invalid_category(self, user_headers):
        """Test creating ticket with invalid category"""
        res = requests.post(f"{BASE_URL}/api/contact/submit", headers=user_headers, json={
            "subject": "Test Subject",
            "category": "invalid_category",
            "message": "Test message",
            "priority": "low"
        })
        assert res.status_code == 400
        
    def test_create_ticket_no_auth(self):
        """Test creating ticket without authentication"""
        res = requests.post(f"{BASE_URL}/api/contact/submit", json={
            "subject": "Test Subject",
            "category": "technical",
            "message": "Test message"
        })
        assert res.status_code == 401

class TestContactUserTickets:
    """Tests for user ticket operations"""
    
    def test_get_user_tickets(self, user_headers):
        """Test getting user's tickets"""
        res = requests.get(f"{BASE_URL}/api/contact/tickets", headers=user_headers)
        assert res.status_code == 200
        
        data = res.json()
        assert "tickets" in data
        assert "count" in data
        assert "total" in data
        assert "status_counts" in data
        
    def test_get_ticket_details(self, user_headers):
        """Test getting specific ticket details"""
        # First get list of tickets
        list_res = requests.get(f"{BASE_URL}/api/contact/tickets", headers=user_headers)
        tickets = list_res.json().get("tickets", [])
        
        if not tickets:
            pytest.skip("No tickets available for testing")
            
        ticket_id = tickets[0]["id"]
        res = requests.get(f"{BASE_URL}/api/contact/tickets/{ticket_id}", headers=user_headers)
        assert res.status_code == 200
        
        ticket = res.json().get("ticket", {})
        assert "id" in ticket
        assert "subject" in ticket
        assert "category" in ticket
        assert "messages" in ticket
        assert "status" in ticket
        
    def test_reply_to_ticket(self, user_headers):
        """Test replying to a ticket"""
        # Get a ticket
        list_res = requests.get(f"{BASE_URL}/api/contact/tickets", headers=user_headers)
        tickets = list_res.json().get("tickets", [])
        
        # Find an open ticket
        open_ticket = next((t for t in tickets if t["status"] != "closed"), None)
        if not open_ticket:
            pytest.skip("No open tickets available for testing")
            
        res = requests.post(f"{BASE_URL}/api/contact/tickets/{open_ticket['id']}/reply", headers=user_headers, json={
            "message": "TEST_Reply from automated testing"
        })
        assert res.status_code == 200
        assert "message_id" in res.json()

class TestContactAdminTickets:
    """Tests for admin ticket operations"""
    
    def test_admin_get_all_tickets(self, admin_headers):
        """Test admin getting all tickets"""
        res = requests.get(f"{BASE_URL}/api/contact/admin/tickets", headers=admin_headers)
        assert res.status_code == 200
        
        data = res.json()
        assert "tickets" in data
        assert "total" in data
        assert "stats" in data
        
        stats = data.get("stats", {})
        assert "total" in stats
        assert "open" in stats
        assert "in_progress" in stats
        assert "resolved" in stats
        assert "closed" in stats
        
    def test_admin_get_tickets_filtered(self, admin_headers):
        """Test admin filtering tickets by status"""
        res = requests.get(f"{BASE_URL}/api/contact/admin/tickets?status=open", headers=admin_headers)
        assert res.status_code == 200
        
        tickets = res.json().get("tickets", [])
        for ticket in tickets:
            assert ticket["status"] == "open"
            
    def test_admin_get_ticket_details(self, admin_headers):
        """Test admin getting ticket details"""
        # Get list of tickets
        list_res = requests.get(f"{BASE_URL}/api/contact/admin/tickets", headers=admin_headers)
        tickets = list_res.json().get("tickets", [])
        
        if not tickets:
            pytest.skip("No tickets available for testing")
            
        ticket_id = tickets[0]["id"]
        res = requests.get(f"{BASE_URL}/api/contact/admin/tickets/{ticket_id}", headers=admin_headers)
        assert res.status_code == 200
        
        ticket = res.json().get("ticket", {})
        assert "id" in ticket
        assert "messages" in ticket
        assert "admin_notes" in ticket
        
    def test_admin_reply_to_ticket(self, admin_headers):
        """Test admin replying to a ticket"""
        # Get a ticket
        list_res = requests.get(f"{BASE_URL}/api/contact/admin/tickets", headers=admin_headers)
        tickets = list_res.json().get("tickets", [])
        
        open_ticket = next((t for t in tickets if t["status"] != "closed"), None)
        if not open_ticket:
            pytest.skip("No open tickets available for testing")
            
        res = requests.post(f"{BASE_URL}/api/contact/admin/tickets/{open_ticket['id']}/reply", headers=admin_headers, json={
            "message": "TEST_Admin reply from automated testing"
        })
        assert res.status_code == 200
        assert "message_id" in res.json()
        
    def test_admin_update_ticket_status(self, admin_headers):
        """Test admin updating ticket status"""
        # Get a ticket
        list_res = requests.get(f"{BASE_URL}/api/contact/admin/tickets", headers=admin_headers)
        tickets = list_res.json().get("tickets", [])
        
        open_ticket = next((t for t in tickets if t["status"] == "open"), None)
        if not open_ticket:
            pytest.skip("No open tickets available for testing")
            
        res = requests.put(f"{BASE_URL}/api/contact/admin/tickets/{open_ticket['id']}/status", headers=admin_headers, json={
            "status": "in_progress",
            "admin_note": "TEST_Status update from automated testing"
        })
        assert res.status_code == 200
        
    def test_user_cannot_access_admin_endpoints(self, user_headers):
        """Test that regular users cannot access admin endpoints"""
        res = requests.get(f"{BASE_URL}/api/contact/admin/tickets", headers=user_headers)
        assert res.status_code == 403

# ==================== INTEGRATION TESTS ====================

class TestVaultContactIntegration:
    """Integration tests for vault and contact modules"""
    
    def test_vault_deposit_withdraw_flow(self, user_headers):
        """Test complete deposit and withdraw flow"""
        # Get initial balance
        balance_res = requests.get(f"{BASE_URL}/api/vault/balance?currency=XOF", headers=user_headers)
        initial_vault = balance_res.json().get("balance", 0)
        
        # Deposit
        deposit_res = requests.post(f"{BASE_URL}/api/vault/deposit", headers=user_headers, json={
            "amount": 500,
            "currency": "XOF",
            "pin": VAULT_PIN,
            "description": "TEST_integration_deposit"
        })
        assert deposit_res.status_code == 200
        after_deposit = deposit_res.json().get("vault_balance")
        assert after_deposit == initial_vault + 500
        
        # Withdraw
        withdraw_res = requests.post(f"{BASE_URL}/api/vault/withdraw", headers=user_headers, json={
            "amount": 500,
            "currency": "XOF",
            "pin": VAULT_PIN,
            "destination": "wallet",
            "description": "TEST_integration_withdraw"
        })
        assert withdraw_res.status_code == 200
        after_withdraw = withdraw_res.json().get("vault_balance")
        assert after_withdraw == initial_vault
        
    def test_ticket_lifecycle(self, user_headers, admin_headers):
        """Test complete ticket lifecycle: create -> reply -> resolve"""
        # Create ticket
        create_res = requests.post(f"{BASE_URL}/api/contact/submit", headers=user_headers, json={
            "subject": f"TEST_Lifecycle_{uuid.uuid4().hex[:8]}",
            "category": "technical",
            "message": "Test ticket for lifecycle testing",
            "priority": "normal"
        })
        assert create_res.status_code == 200
        ticket_id = create_res.json().get("ticket_id")
        
        # User reply
        user_reply_res = requests.post(f"{BASE_URL}/api/contact/tickets/{ticket_id}/reply", headers=user_headers, json={
            "message": "User follow-up message"
        })
        assert user_reply_res.status_code == 200
        
        # Admin reply
        admin_reply_res = requests.post(f"{BASE_URL}/api/contact/admin/tickets/{ticket_id}/reply", headers=admin_headers, json={
            "message": "Admin response to ticket"
        })
        assert admin_reply_res.status_code == 200
        
        # Resolve ticket
        resolve_res = requests.put(f"{BASE_URL}/api/contact/admin/tickets/{ticket_id}/status", headers=admin_headers, json={
            "status": "resolved",
            "admin_note": "Issue resolved via automated testing"
        })
        assert resolve_res.status_code == 200
        
        # Verify status
        details_res = requests.get(f"{BASE_URL}/api/contact/tickets/{ticket_id}", headers=user_headers)
        assert details_res.json().get("ticket", {}).get("status") == "resolved"
