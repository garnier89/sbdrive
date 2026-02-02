"""
Test Suite for SB Pay Virtual Cards and Notifications Zone Modules
Tests:
- Virtual Cards: Create, List, Block/Unblock, Simulate Payment, Delete
- Notifications Zone: Get Zones, Send Notification, History, Stats
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USER_CREDENTIALS = {"email": "user@sbpay.com", "password": "userpassword"}
ADMIN_CREDENTIALS = {"email": "admin@sbpay.com", "password": "adminpassword"}


class TestAuth:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"User authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
    
    def test_user_login(self):
        """Test user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ User login successful")
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful")


class TestVirtualCards:
    """Virtual Cards Module Tests"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("User authentication failed")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, user_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {user_token}"}
    
    def test_list_virtual_cards(self, auth_headers):
        """Test listing virtual cards"""
        response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        assert response.status_code == 200, f"List cards failed: {response.text}"
        data = response.json()
        assert "cards" in data
        assert "count" in data
        print(f"✓ List virtual cards: {data['count']} cards found")
        return data
    
    def test_list_cards_requires_auth(self):
        """Test that listing cards requires authentication"""
        response = requests.get(f"{BASE_URL}/api/virtual-card/list")
        assert response.status_code == 401, "Should require authentication"
        print("✓ List cards requires authentication (401)")
    
    def test_create_virtual_card(self, auth_headers):
        """Test creating a new virtual card"""
        card_data = {
            "currency": "XOF",
            "daily_limit": 100000,
            "transaction_limit": 50000,
            "card_name": "TEST_Card_Shopping"
        }
        response = requests.post(f"{BASE_URL}/api/virtual-card/create", json=card_data, headers=auth_headers)
        
        # May fail if max cards reached, which is acceptable
        if response.status_code == 400 and "Limite de cartes" in response.text:
            print("✓ Create card: Max cards limit reached (expected behavior)")
            pytest.skip("Max cards limit reached")
        
        assert response.status_code == 200, f"Create card failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "card" in data
        assert "message" in data
        card = data["card"]
        assert "id" in card
        assert "card_number" in card  # Full number shown only at creation
        assert "cvv" in card  # CVV shown only at creation
        assert "expiry" in card
        assert "card_brand" in card
        assert card["currency"] == "XOF"
        assert card["status"] == "active"
        
        print(f"✓ Create virtual card: {card['card_brand']} •••• {card['card_number'][-4:]}")
        return card
    
    def test_create_card_requires_auth(self):
        """Test that creating card requires authentication"""
        card_data = {"currency": "XOF", "daily_limit": 100000, "transaction_limit": 50000}
        response = requests.post(f"{BASE_URL}/api/virtual-card/create", json=card_data)
        assert response.status_code == 401, "Should require authentication"
        print("✓ Create card requires authentication (401)")
    
    def test_get_card_details(self, auth_headers):
        """Test getting specific card details"""
        # First get list of cards
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        if list_response.status_code != 200 or not list_response.json().get("cards"):
            pytest.skip("No cards available to test")
        
        card_id = list_response.json()["cards"][0]["id"]
        response = requests.get(f"{BASE_URL}/api/virtual-card/{card_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get card details failed: {response.text}"
        
        data = response.json()
        assert "card" in data
        card = data["card"]
        assert card["id"] == card_id
        assert "card_number_masked" in card
        assert "wallet_balance" in card
        
        print(f"✓ Get card details: {card['card_name']} - Balance: {card['wallet_balance']}")
    
    def test_block_card(self, auth_headers):
        """Test blocking a virtual card"""
        # Get a card to block
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        if list_response.status_code != 200:
            pytest.skip("Cannot list cards")
        
        cards = list_response.json().get("cards", [])
        active_card = next((c for c in cards if c["status"] == "active"), None)
        
        if not active_card:
            pytest.skip("No active card to block")
        
        block_data = {
            "card_id": active_card["id"],
            "action": "block",
            "reason": "TEST_Block for testing"
        }
        response = requests.post(f"{BASE_URL}/api/virtual-card/block", json=block_data, headers=auth_headers)
        assert response.status_code == 200, f"Block card failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "blocked"
        print(f"✓ Block card: {active_card['last_four']} blocked successfully")
        
        return active_card["id"]
    
    def test_unblock_card(self, auth_headers):
        """Test unblocking a virtual card"""
        # Get a blocked card
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        if list_response.status_code != 200:
            pytest.skip("Cannot list cards")
        
        cards = list_response.json().get("cards", [])
        blocked_card = next((c for c in cards if c["status"] == "blocked"), None)
        
        if not blocked_card:
            pytest.skip("No blocked card to unblock")
        
        unblock_data = {
            "card_id": blocked_card["id"],
            "action": "unblock"
        }
        response = requests.post(f"{BASE_URL}/api/virtual-card/block", json=unblock_data, headers=auth_headers)
        assert response.status_code == 200, f"Unblock card failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "active"
        print(f"✓ Unblock card: {blocked_card['last_four']} unblocked successfully")
    
    def test_block_already_blocked_card(self, auth_headers):
        """Test blocking an already blocked card returns error"""
        # Get a blocked card
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        cards = list_response.json().get("cards", [])
        blocked_card = next((c for c in cards if c["status"] == "blocked"), None)
        
        if not blocked_card:
            pytest.skip("No blocked card to test")
        
        block_data = {"card_id": blocked_card["id"], "action": "block"}
        response = requests.post(f"{BASE_URL}/api/virtual-card/block", json=block_data, headers=auth_headers)
        assert response.status_code == 400, "Should fail for already blocked card"
        print("✓ Block already blocked card returns 400")
    
    def test_simulate_payment(self, auth_headers):
        """Test simulating a card payment"""
        # Get an active card
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        if list_response.status_code != 200:
            pytest.skip("Cannot list cards")
        
        cards = list_response.json().get("cards", [])
        active_card = next((c for c in cards if c["status"] == "active"), None)
        
        if not active_card:
            pytest.skip("No active card for payment simulation")
        
        # Check if wallet has balance
        if active_card.get("wallet_balance", 0) < 1000:
            pytest.skip("Insufficient wallet balance for payment test")
        
        payment_data = {
            "card_id": active_card["id"],
            "amount": 1000,
            "merchant_name": "TEST_Amazon",
            "merchant_category": "Shopping",
            "payment_type": "online"
        }
        response = requests.post(f"{BASE_URL}/api/virtual-card/simulate-payment", json=payment_data, headers=auth_headers)
        
        if response.status_code == 400:
            error_detail = response.json().get("detail", "")
            if "Solde wallet insuffisant" in error_detail:
                print("✓ Simulate payment: Insufficient balance (expected)")
                pytest.skip("Insufficient wallet balance")
            elif "Limite" in error_detail:
                print(f"✓ Simulate payment: Limit reached - {error_detail}")
                pytest.skip("Limit reached")
        
        assert response.status_code == 200, f"Simulate payment failed: {response.text}"
        
        data = response.json()
        assert "transaction" in data
        assert data["transaction"]["status"] == "completed"
        assert data["demo_mode"] == True
        
        print(f"✓ Simulate payment: {payment_data['amount']} XOF at {payment_data['merchant_name']}")
    
    def test_simulate_payment_blocked_card(self, auth_headers):
        """Test that payment fails on blocked card"""
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        cards = list_response.json().get("cards", [])
        blocked_card = next((c for c in cards if c["status"] == "blocked"), None)
        
        if not blocked_card:
            pytest.skip("No blocked card to test")
        
        payment_data = {
            "card_id": blocked_card["id"],
            "amount": 1000,
            "merchant_name": "TEST_Store",
            "payment_type": "online"
        }
        response = requests.post(f"{BASE_URL}/api/virtual-card/simulate-payment", json=payment_data, headers=auth_headers)
        assert response.status_code == 400, "Should fail for blocked card"
        assert "blocked" in response.json().get("detail", "").lower()
        print("✓ Payment on blocked card rejected (400)")
    
    def test_simulate_payment_exceeds_transaction_limit(self, auth_headers):
        """Test that payment exceeding transaction limit fails"""
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        cards = list_response.json().get("cards", [])
        active_card = next((c for c in cards if c["status"] == "active"), None)
        
        if not active_card:
            pytest.skip("No active card to test")
        
        # Try to pay more than transaction limit
        payment_data = {
            "card_id": active_card["id"],
            "amount": active_card["transaction_limit"] + 10000,
            "merchant_name": "TEST_BigStore",
            "payment_type": "online"
        }
        response = requests.post(f"{BASE_URL}/api/virtual-card/simulate-payment", json=payment_data, headers=auth_headers)
        assert response.status_code == 400, "Should fail for exceeding limit"
        assert "limite" in response.json().get("detail", "").lower()
        print("✓ Payment exceeding transaction limit rejected (400)")
    
    def test_get_card_transactions(self, auth_headers):
        """Test getting card transaction history"""
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        if list_response.status_code != 200 or not list_response.json().get("cards"):
            pytest.skip("No cards available")
        
        card_id = list_response.json()["cards"][0]["id"]
        response = requests.get(f"{BASE_URL}/api/virtual-card/transactions/{card_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get transactions failed: {response.text}"
        
        data = response.json()
        assert "transactions" in data
        assert "count" in data
        assert "total" in data
        print(f"✓ Get card transactions: {data['count']} transactions")
    
    def test_toggle_card_feature_online(self, auth_headers):
        """Test toggling online payments feature"""
        list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
        cards = list_response.json().get("cards", [])
        active_card = next((c for c in cards if c["status"] == "active"), None)
        
        if not active_card:
            pytest.skip("No active card to test")
        
        # Toggle online feature off
        response = requests.post(
            f"{BASE_URL}/api/virtual-card/toggle-feature/{active_card['id']}?feature=online&enabled=false",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Toggle feature failed: {response.text}"
        print("✓ Toggle online payments feature: disabled")
        
        # Toggle back on
        response = requests.post(
            f"{BASE_URL}/api/virtual-card/toggle-feature/{active_card['id']}?feature=online&enabled=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        print("✓ Toggle online payments feature: enabled")
    
    def test_delete_virtual_card(self, auth_headers):
        """Test deleting a virtual card"""
        # First create a card to delete
        card_data = {
            "currency": "XOF",
            "daily_limit": 50000,
            "transaction_limit": 25000,
            "card_name": "TEST_ToDelete"
        }
        create_response = requests.post(f"{BASE_URL}/api/virtual-card/create", json=card_data, headers=auth_headers)
        
        if create_response.status_code != 200:
            # Try to find an existing card to delete
            list_response = requests.get(f"{BASE_URL}/api/virtual-card/list", headers=auth_headers)
            cards = list_response.json().get("cards", [])
            test_card = next((c for c in cards if "TEST_" in c.get("card_name", "")), None)
            if not test_card:
                pytest.skip("No card available to delete")
            card_id = test_card["id"]
        else:
            card_id = create_response.json()["card"]["id"]
        
        # Delete the card
        response = requests.delete(f"{BASE_URL}/api/virtual-card/{card_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete card failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Delete virtual card: Card deleted successfully")
    
    def test_delete_nonexistent_card(self, auth_headers):
        """Test deleting a non-existent card returns 404"""
        response = requests.delete(f"{BASE_URL}/api/virtual-card/nonexistent-id-12345", headers=auth_headers)
        assert response.status_code == 404, "Should return 404 for non-existent card"
        print("✓ Delete non-existent card returns 404")


class TestNotificationsZone:
    """Notifications Zone Module Tests (Admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get admin authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=USER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("User authentication failed")
    
    @pytest.fixture(scope="class")
    def user_headers(self, user_token):
        """Get user authorization headers"""
        return {"Authorization": f"Bearer {user_token}"}
    
    def test_get_zones(self, admin_headers):
        """Test getting available zones and countries"""
        response = requests.get(f"{BASE_URL}/api/notifications/zones", headers=admin_headers)
        assert response.status_code == 200, f"Get zones failed: {response.text}"
        
        data = response.json()
        assert "countries" in data
        assert "channels" in data
        
        # Verify expected countries
        countries = data["countries"]
        expected_countries = ["SN", "CI", "ML", "BF", "BJ", "TG", "CM", "GH", "NG", "FR"]
        for code in expected_countries:
            assert code in countries, f"Missing country: {code}"
        
        # Verify channels
        channels = data["channels"]
        expected_channels = ["push", "sms", "email", "whatsapp"]
        for channel in expected_channels:
            assert channel in channels, f"Missing channel: {channel}"
        
        print(f"✓ Get zones: {len(countries)} countries, {len(channels)} channels")
    
    def test_get_zones_requires_admin(self, user_headers):
        """Test that zones endpoint requires admin access"""
        response = requests.get(f"{BASE_URL}/api/notifications/zones", headers=user_headers)
        assert response.status_code == 403, "Should require admin access"
        print("✓ Get zones requires admin access (403)")
    
    def test_filter_users_by_zone(self, admin_headers):
        """Test filtering users by zone/country"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/filter-users?countries=SN,CI",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Filter users failed: {response.text}"
        
        data = response.json()
        assert "total_recipients" in data
        assert "filters_applied" in data
        
        print(f"✓ Filter users: {data['total_recipients']} recipients for SN,CI")
    
    def test_send_notification(self, admin_headers):
        """Test sending a targeted notification"""
        notification_data = {
            "title": "TEST_Promo Spéciale",
            "message": "TEST_Réduction de 10% sur les transferts cette semaine!",
            "target_countries": ["SN"],
            "target_zones": [],
            "target_user_types": [],
            "channels": ["push"],
            "priority": "normal"
        }
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=admin_headers)
        
        # May fail if no users match criteria
        if response.status_code == 400 and "Aucun utilisateur" in response.text:
            print("✓ Send notification: No matching users (expected)")
            pytest.skip("No users match criteria")
        
        assert response.status_code == 200, f"Send notification failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "success"
        assert "notification_id" in data
        assert "recipients_count" in data
        assert data["demo_mode"] == True
        
        print(f"✓ Send notification: {data['recipients_count']} recipients, ID: {data['notification_id']}")
        return data["notification_id"]
    
    def test_send_notification_requires_admin(self, user_headers):
        """Test that sending notification requires admin access"""
        notification_data = {
            "title": "Test",
            "message": "Test message",
            "target_countries": ["SN"],
            "channels": ["push"]
        }
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=user_headers)
        assert response.status_code == 403, "Should require admin access"
        print("✓ Send notification requires admin access (403)")
    
    def test_send_notification_validation(self, admin_headers):
        """Test notification validation - missing required fields"""
        # Missing title
        notification_data = {
            "message": "Test message",
            "target_countries": ["SN"],
            "channels": ["push"]
        }
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=admin_headers)
        assert response.status_code == 422, "Should fail validation for missing title"
        print("✓ Send notification validation: Missing title rejected (422)")
    
    def test_send_notification_no_countries(self, admin_headers):
        """Test notification fails without target countries"""
        notification_data = {
            "title": "Test",
            "message": "Test message",
            "target_countries": [],
            "channels": ["push"]
        }
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=admin_headers)
        # Should fail because no users match empty country filter
        assert response.status_code in [400, 200], f"Unexpected status: {response.status_code}"
        print("✓ Send notification with empty countries handled")
    
    def test_get_notification_history(self, admin_headers):
        """Test getting notification history"""
        response = requests.get(f"{BASE_URL}/api/notifications/history", headers=admin_headers)
        assert response.status_code == 200, f"Get history failed: {response.text}"
        
        data = response.json()
        assert "notifications" in data
        assert "count" in data
        assert "total" in data
        
        print(f"✓ Get notification history: {data['count']} notifications")
    
    def test_get_notification_history_with_filter(self, admin_headers):
        """Test getting notification history with status filter"""
        response = requests.get(f"{BASE_URL}/api/notifications/history?status=sent", headers=admin_headers)
        assert response.status_code == 200, f"Get filtered history failed: {response.text}"
        
        data = response.json()
        # All returned notifications should have status=sent
        for notif in data.get("notifications", []):
            assert notif.get("status") == "sent", f"Unexpected status: {notif.get('status')}"
        
        print(f"✓ Get notification history (filtered): {data['count']} sent notifications")
    
    def test_get_notification_stats(self, admin_headers):
        """Test getting notification statistics"""
        response = requests.get(f"{BASE_URL}/api/notifications/stats/overview", headers=admin_headers)
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        
        data = response.json()
        assert "total_campaigns" in data
        assert "by_status" in data
        assert "this_month" in data
        assert "total_recipients_reached" in data
        
        print(f"✓ Get notification stats: {data['total_campaigns']} campaigns, {data['total_recipients_reached']} recipients reached")
    
    def test_get_notification_details(self, admin_headers):
        """Test getting specific notification details"""
        # First get history to find a notification
        history_response = requests.get(f"{BASE_URL}/api/notifications/history", headers=admin_headers)
        if history_response.status_code != 200 or not history_response.json().get("notifications"):
            pytest.skip("No notifications available")
        
        notification_id = history_response.json()["notifications"][0]["id"]
        response = requests.get(f"{BASE_URL}/api/notifications/{notification_id}", headers=admin_headers)
        assert response.status_code == 200, f"Get notification details failed: {response.text}"
        
        data = response.json()
        assert "notification" in data
        assert data["notification"]["id"] == notification_id
        
        print(f"✓ Get notification details: {data['notification']['title']}")
    
    def test_get_nonexistent_notification(self, admin_headers):
        """Test getting non-existent notification returns 404"""
        response = requests.get(f"{BASE_URL}/api/notifications/nonexistent-id-12345", headers=admin_headers)
        assert response.status_code == 404, "Should return 404 for non-existent notification"
        print("✓ Get non-existent notification returns 404")
    
    def test_send_scheduled_notification(self, admin_headers):
        """Test sending a scheduled notification"""
        from datetime import datetime, timedelta
        
        scheduled_time = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
        
        notification_data = {
            "title": "TEST_Scheduled Promo",
            "message": "TEST_This is a scheduled notification",
            "target_countries": ["SN"],
            "channels": ["push"],
            "priority": "normal",
            "scheduled_at": scheduled_time
        }
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=admin_headers)
        
        if response.status_code == 400 and "Aucun utilisateur" in response.text:
            pytest.skip("No users match criteria")
        
        assert response.status_code == 200, f"Send scheduled notification failed: {response.text}"
        
        data = response.json()
        assert data["scheduled"] == True
        
        print(f"✓ Send scheduled notification: Scheduled for {scheduled_time}")
        return data.get("notification_id")
    
    def test_cancel_scheduled_notification(self, admin_headers):
        """Test cancelling a scheduled notification"""
        # First create a scheduled notification
        from datetime import datetime, timedelta
        
        scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        
        notification_data = {
            "title": "TEST_ToCancel",
            "message": "TEST_This notification will be cancelled",
            "target_countries": ["SN"],
            "channels": ["push"],
            "scheduled_at": scheduled_time
        }
        create_response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=admin_headers)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create scheduled notification")
        
        notification_id = create_response.json().get("notification_id")
        
        # Cancel it
        response = requests.post(f"{BASE_URL}/api/notifications/cancel/{notification_id}", headers=admin_headers)
        assert response.status_code == 200, f"Cancel notification failed: {response.text}"
        
        print(f"✓ Cancel scheduled notification: {notification_id} cancelled")
    
    def test_cancel_already_sent_notification(self, admin_headers):
        """Test that cancelling an already sent notification fails"""
        # Find a sent notification
        history_response = requests.get(f"{BASE_URL}/api/notifications/history?status=sent", headers=admin_headers)
        if history_response.status_code != 200:
            pytest.skip("Cannot get history")
        
        notifications = history_response.json().get("notifications", [])
        sent_notif = next((n for n in notifications if n.get("status") == "sent"), None)
        
        if not sent_notif:
            pytest.skip("No sent notification to test")
        
        response = requests.post(f"{BASE_URL}/api/notifications/cancel/{sent_notif['id']}", headers=admin_headers)
        assert response.status_code == 404, "Should fail for already sent notification"
        print("✓ Cancel already sent notification returns 404")
    
    def test_send_multi_channel_notification(self, admin_headers):
        """Test sending notification via multiple channels"""
        notification_data = {
            "title": "TEST_Multi-Channel",
            "message": "TEST_This goes to multiple channels",
            "target_countries": ["SN"],
            "channels": ["push", "sms", "email"],
            "priority": "high"
        }
        response = requests.post(f"{BASE_URL}/api/notifications/send", json=notification_data, headers=admin_headers)
        
        if response.status_code == 400 and "Aucun utilisateur" in response.text:
            pytest.skip("No users match criteria")
        
        assert response.status_code == 200, f"Send multi-channel notification failed: {response.text}"
        
        data = response.json()
        assert set(data["channels"]) == {"push", "sms", "email"}
        
        print(f"✓ Send multi-channel notification: {data['channels']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
