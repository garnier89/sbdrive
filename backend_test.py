#!/usr/bin/env python3
"""
SB Money Backend API Testing Suite
Tests all endpoints with comprehensive coverage
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SBPayAPITester:
    def __init__(self, base_url="https://afripay-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None
        self.admin_id = None

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Default headers
        req_headers = {'Content-Type': 'application/json'}
        if self.token and not headers:
            req_headers['Authorization'] = f'Bearer {self.token}'
        elif headers:
            req_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=req_headers, timeout=30)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")

            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health"""
        print("\n🔍 Testing API Health...")
        success, response = self.run_test("API Health Check", "GET", "", 200)
        return success

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        
        # Test with provided credentials
        test_data = {
            "email": "user@sbmoney.com",
            "password": "User123!",
            "full_name": "Test User",
            "phone": "+33123456789"
        }
        
        success, response = self.run_test(
            "User Registration", "POST", "auth/register", 200, test_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        print("\n🔍 Testing User Login...")
        
        login_data = {
            "email": "user@sbmoney.com",
            "password": "User123!"
        }
        
        success, response = self.run_test(
            "User Login", "POST", "auth/login", 200, login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
            return True
        return False

    def test_admin_registration(self):
        """Test admin registration"""
        print("\n🔍 Testing Admin Registration...")
        
        admin_data = {
            "email": "admin@sbmoney.com",
            "password": "Admin123!",
            "full_name": "Admin User",
            "phone": "+33987654321"
        }
        
        success, response = self.run_test(
            "Admin Registration", "POST", "auth/register", 200, admin_data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            if 'user' in response:
                self.admin_id = response['user'].get('id')
            
            # Need to manually set admin role in database for testing
            # This would normally be done by another admin
            return True
        return False

    def test_get_profile(self):
        """Test get current user profile"""
        print("\n🔍 Testing Get Profile...")
        success, response = self.run_test("Get Profile", "GET", "auth/me", 200)
        return success

    def test_get_wallets(self):
        """Test get user wallets"""
        print("\n🔍 Testing Get Wallets...")
        success, response = self.run_test("Get Wallets", "GET", "wallets", 200)
        
        if success and isinstance(response, list):
            expected_currencies = ["EUR", "USD", "XOF"]
            found_currencies = [w.get('currency') for w in response]
            
            if all(curr in found_currencies for curr in expected_currencies):
                self.log_test("Wallet Currencies Check", True, f"Found all expected currencies: {found_currencies}")
            else:
                self.log_test("Wallet Currencies Check", False, f"Missing currencies. Found: {found_currencies}")
        
        return success

    def test_get_specific_wallet(self):
        """Test get specific wallet"""
        print("\n🔍 Testing Get Specific Wallet...")
        success, response = self.run_test("Get EUR Wallet", "GET", "wallets/EUR", 200)
        return success

    def test_money_transfer(self):
        """Test money transfer between users"""
        print("\n🔍 Testing Money Transfer...")
        
        # First create a recipient user
        recipient_data = {
            "email": "recipient@sbmoney.com",
            "password": "Recipient123!",
            "full_name": "Recipient User"
        }
        
        success, _ = self.run_test(
            "Create Recipient User", "POST", "auth/register", 200, recipient_data
        )
        
        if not success:
            return False
        
        # Try transfer (should fail due to insufficient balance)
        transfer_data = {
            "recipient_email": "recipient@sbmoney.com",
            "amount": 10.0,
            "currency": "EUR",
            "description": "Test transfer"
        }
        
        success, response = self.run_test(
            "Money Transfer (Insufficient Balance)", "POST", "transfers", 400, transfer_data
        )
        
        # This should fail with 400 due to insufficient balance, which is expected
        return success

    def test_deposit_checkout(self):
        """Test deposit checkout creation"""
        print("\n🔍 Testing Deposit Checkout...")
        
        deposit_data = {
            "amount": 100.0,
            "currency": "eur",
            "origin_url": "https://afripay-1.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Create Deposit Checkout", "POST", "deposits/checkout", 200, deposit_data
        )
        
        if success and 'checkout_url' in response:
            self.log_test("Checkout URL Generated", True, f"URL: {response['checkout_url'][:50]}...")
        
        return success

    def test_withdrawal(self):
        """Test withdrawal request"""
        print("\n🔍 Testing Withdrawal...")
        
        withdrawal_data = {
            "amount": 50.0,
            "currency": "EUR",
            "bank_account": "FR1420041010050500013M02606"
        }
        
        # Should fail due to insufficient balance
        success, response = self.run_test(
            "Withdrawal Request (Insufficient Balance)", "POST", "withdrawals", 400, withdrawal_data
        )
        
        return success

    def test_bill_payment(self):
        """Test bill payment"""
        print("\n🔍 Testing Bill Payment...")
        
        bill_data = {
            "bill_type": "electricity",
            "bill_reference": "EDF123456789",
            "amount": 75.50,
            "currency": "EUR"
        }
        
        # Should fail due to insufficient balance
        success, response = self.run_test(
            "Bill Payment (Insufficient Balance)", "POST", "bills/pay", 400, bill_data
        )
        
        return success

    def test_get_transactions(self):
        """Test get transaction history"""
        print("\n🔍 Testing Transaction History...")
        success, response = self.run_test("Get Transactions", "GET", "transactions", 200)
        
        if success and 'transactions' in response:
            self.log_test("Transaction Structure Check", True, f"Found {len(response['transactions'])} transactions")
        
        return success

    def test_currencies(self):
        """Test get supported currencies"""
        print("\n🔍 Testing Currencies Endpoint...")
        success, response = self.run_test("Get Currencies", "GET", "currencies", 200)
        
        if success and 'currencies' in response:
            expected_currencies = ["EUR", "USD", "XOF"]
            found_currencies = response['currencies']
            
            if all(curr in found_currencies for curr in expected_currencies):
                self.log_test("Currency Support Check", True, f"All expected currencies supported: {found_currencies}")
            else:
                self.log_test("Currency Support Check", False, f"Missing currencies. Found: {found_currencies}")
        
        return success

    def test_admin_endpoints(self):
        """Test admin endpoints (will fail without proper admin role)"""
        print("\n🔍 Testing Admin Endpoints...")
        
        # These should fail with 403 since we can't easily set admin role
        admin_headers = {'Authorization': f'Bearer {self.admin_token}'} if self.admin_token else None
        
        success1, _ = self.run_test(
            "Admin Get Users (Expected 403)", "GET", "admin/users", 403, headers=admin_headers
        )
        
        success2, _ = self.run_test(
            "Admin Get Transactions (Expected 403)", "GET", "admin/transactions", 403, headers=admin_headers
        )
        
        success3, _ = self.run_test(
            "Admin Get Stats (Expected 403)", "GET", "admin/stats", 403, headers=admin_headers
        )
        
        return success1 and success2 and success3

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting SB Money API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Basic health check
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False
        
        # Authentication tests
        if not self.test_user_registration():
            # Try login if registration fails (user might already exist)
            if not self.test_user_login():
                print("❌ Cannot authenticate user. Stopping tests.")
                return False
        
        # Core functionality tests
        self.test_get_profile()
        self.test_get_wallets()
        self.test_get_specific_wallet()
        self.test_money_transfer()
        self.test_deposit_checkout()
        self.test_withdrawal()
        self.test_bill_payment()
        self.test_get_transactions()
        self.test_currencies()
        
        # Admin tests
        self.test_admin_registration()
        self.test_admin_endpoints()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test_name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SBPayAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        # Save detailed results
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'tests_run': tester.tests_run,
                    'tests_passed': tester.tests_passed,
                    'success_rate': tester.tests_passed/tester.tests_run*100 if tester.tests_run > 0 else 0
                },
                'results': tester.test_results,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())