"""
Test Mobile Money Countries and Operators API
Tests for 21+ African countries with Mobile Money support
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Expected 21+ African countries with Mobile Money
EXPECTED_COUNTRIES = [
    'SN', 'CI', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW',  # West Africa UEMOA
    'GN', 'GH', 'NG', 'LR', 'SL',  # West Africa non-UEMOA
    'CM', 'GA', 'CG', 'CD',  # Central Africa
    'KE', 'TZ', 'UG', 'RW',  # East Africa
    'ZM', 'ZW',  # Southern Africa
    'MA'  # North Africa
]

# Sample operators by country for validation
EXPECTED_OPERATORS = {
    'SN': ['wave', 'orange_money', 'free_money', 'e_money'],
    'KE': ['mpesa', 'airtel_money', 't_kash'],
    'NG': ['opay', 'palmpay', 'kuda', 'moniepoint', 'paga'],
    'GH': ['mtn_momo', 'vodafone_cash', 'airteltigo', 'g_money'],
    'CI': ['wave', 'orange_money', 'mtn_momo', 'moov_money'],
    'CM': ['orange_money', 'mtn_momo', 'express_union'],
    'TZ': ['mpesa', 'tigopesa', 'airtel_money', 'halopesa'],
    'UG': ['mtn_momo', 'airtel_money'],
    'RW': ['mtn_momo', 'airtel_money'],
    'ZM': ['mtn_momo', 'airtel_money', 'zamtel_kwacha'],
    'ZW': ['ecocash', 'onemoney'],
    'MA': ['inwi_money', 'orange_money']
}


class TestMobileMoneyOperatorsAPI:
    """Test Mobile Money operators API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_all_operators_returns_all_countries(self):
        """Test that /api/africa/mobile-money/operators returns all 21+ countries"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        countries = data.get('countries', [])
        
        # Should have at least 21 countries (excluding France which has no Mobile Money)
        assert len(countries) >= 21, f"Expected at least 21 countries, got {len(countries)}"
        
        # Verify all expected countries are present
        for country in EXPECTED_COUNTRIES:
            assert country in countries, f"Country {country} not found in API response"
        
        print(f"✓ API returns {len(countries)} countries with Mobile Money")
    
    def test_operators_by_country_structure(self):
        """Test that operators_by_country has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators")
        assert response.status_code == 200
        
        data = response.json()
        operators_by_country = data.get('operators_by_country', {})
        
        # Verify structure for each country
        for country_code, operators in operators_by_country.items():
            assert isinstance(operators, list), f"Operators for {country_code} should be a list"
            for op in operators:
                assert 'code' in op, f"Operator in {country_code} missing 'code'"
                assert 'name' in op, f"Operator in {country_code} missing 'name'"
        
        print(f"✓ All {len(operators_by_country)} countries have valid operator structure")
    
    def test_kenya_operators(self):
        """Test Kenya (KE) has M-Pesa and other operators"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=KE")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('country') == 'KE'
        
        operators = data.get('operators', [])
        operator_codes = [op['code'] for op in operators]
        
        # Kenya must have M-Pesa
        assert 'mpesa' in operator_codes, "Kenya should have M-Pesa"
        assert 'airtel_money' in operator_codes, "Kenya should have Airtel Money"
        
        print(f"✓ Kenya has {len(operators)} operators: {operator_codes}")
    
    def test_nigeria_operators(self):
        """Test Nigeria (NG) has OPay, PalmPay, Kuda, etc."""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=NG")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('country') == 'NG'
        
        operators = data.get('operators', [])
        operator_codes = [op['code'] for op in operators]
        
        # Nigeria should have major fintech operators
        assert 'opay' in operator_codes, "Nigeria should have OPay"
        assert 'palmpay' in operator_codes, "Nigeria should have PalmPay"
        assert 'kuda' in operator_codes, "Nigeria should have Kuda"
        
        print(f"✓ Nigeria has {len(operators)} operators: {operator_codes}")
    
    def test_senegal_operators(self):
        """Test Senegal (SN) has Wave, Orange Money, Free Money"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=SN")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('country') == 'SN'
        
        operators = data.get('operators', [])
        operator_codes = [op['code'] for op in operators]
        
        assert 'wave' in operator_codes, "Senegal should have Wave"
        assert 'orange_money' in operator_codes, "Senegal should have Orange Money"
        
        print(f"✓ Senegal has {len(operators)} operators: {operator_codes}")
    
    def test_ghana_operators(self):
        """Test Ghana (GH) has MTN MoMo, Vodafone Cash"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=GH")
        assert response.status_code == 200
        
        data = response.json()
        operators = data.get('operators', [])
        operator_codes = [op['code'] for op in operators]
        
        assert 'mtn_momo' in operator_codes, "Ghana should have MTN MoMo"
        assert 'vodafone_cash' in operator_codes, "Ghana should have Vodafone Cash"
        
        print(f"✓ Ghana has {len(operators)} operators: {operator_codes}")
    
    def test_cameroon_operators(self):
        """Test Cameroon (CM) has Orange Money, MTN MoMo"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=CM")
        assert response.status_code == 200
        
        data = response.json()
        operators = data.get('operators', [])
        operator_codes = [op['code'] for op in operators]
        
        assert 'orange_money' in operator_codes, "Cameroon should have Orange Money"
        assert 'mtn_momo' in operator_codes, "Cameroon should have MTN MoMo"
        
        print(f"✓ Cameroon has {len(operators)} operators: {operator_codes}")
    
    def test_east_africa_countries(self):
        """Test East African countries (KE, TZ, UG, RW) have operators"""
        east_africa = ['KE', 'TZ', 'UG', 'RW']
        
        for country in east_africa:
            response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country={country}")
            assert response.status_code == 200, f"Failed for {country}"
            
            data = response.json()
            operators = data.get('operators', [])
            assert len(operators) >= 2, f"{country} should have at least 2 operators"
            
            print(f"✓ {country} has {len(operators)} operators")
    
    def test_southern_africa_countries(self):
        """Test Southern African countries (ZM, ZW) have operators"""
        southern_africa = ['ZM', 'ZW']
        
        for country in southern_africa:
            response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country={country}")
            assert response.status_code == 200, f"Failed for {country}"
            
            data = response.json()
            operators = data.get('operators', [])
            assert len(operators) >= 2, f"{country} should have at least 2 operators"
            
            print(f"✓ {country} has {len(operators)} operators")
    
    def test_morocco_operators(self):
        """Test Morocco (MA) has Inwi Money, Orange Money"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=MA")
        assert response.status_code == 200
        
        data = response.json()
        operators = data.get('operators', [])
        operator_codes = [op['code'] for op in operators]
        
        assert 'inwi_money' in operator_codes, "Morocco should have Inwi Money"
        assert 'orange_money' in operator_codes, "Morocco should have Orange Money"
        
        print(f"✓ Morocco has {len(operators)} operators: {operator_codes}")
    
    def test_invalid_country_returns_all(self):
        """Test that invalid country code returns all countries"""
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/operators?country=XX")
        assert response.status_code == 200
        
        data = response.json()
        # Should return all countries when invalid country is provided
        assert 'countries' in data or 'operators_by_country' in data
        
        print("✓ Invalid country returns all countries list")


class TestMobileMoneyFeesAPI:
    """Test Mobile Money fees calculation API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_calculate_fees_same_operator(self):
        """Test fee calculation for same operator transfer"""
        response = self.session.get(
            f"{BASE_URL}/api/africa/mobile-money/fees",
            params={
                "source_operator": "wave",
                "dest_operator": "wave",
                "amount": 10000
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'fees' in data
        fees = data['fees']
        assert 'total' in fees
        assert 'amount_received' in fees
        
        print(f"✓ Same operator fees: {fees['total']} XOF for 10,000 XOF transfer")
    
    def test_calculate_fees_cross_operator(self):
        """Test fee calculation for cross-operator transfer"""
        response = self.session.get(
            f"{BASE_URL}/api/africa/mobile-money/fees",
            params={
                "source_operator": "wave",
                "dest_operator": "orange_money",
                "amount": 10000
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        fees = data['fees']
        
        # Cross-operator should have higher fees
        assert fees['total'] > 0, "Cross-operator transfer should have fees"
        assert fees['amount_received'] < 10000, "Recipient should receive less than sent amount"
        
        print(f"✓ Cross-operator fees: {fees['total']} XOF, recipient gets {fees['amount_received']} XOF")


class TestMobileMoneyTransferAPI:
    """Test Mobile Money transfer API with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "user@sbpaygo.com", "password": "userpassword"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get('access_token')
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
    
    def test_transfer_requires_auth(self):
        """Test that transfer endpoint requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.post(
            f"{BASE_URL}/api/africa/mobile-money/transfer",
            json={
                "source_operator": "wave",
                "source_phone": "+221771234567",
                "dest_operator": "orange_money",
                "dest_phone": "+221781234567",
                "dest_country": "SN",
                "amount": 5000,
                "currency": "XOF"
            }
        )
        assert response.status_code == 401, "Transfer should require authentication"
        print("✓ Transfer endpoint requires authentication")
    
    def test_get_transfers_history(self):
        """Test getting transfer history"""
        if not self.authenticated:
            pytest.skip("Authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/africa/mobile-money/transfers")
        assert response.status_code == 200
        
        data = response.json()
        assert 'transfers' in data
        assert isinstance(data['transfers'], list)
        
        print(f"✓ Transfer history returns {len(data['transfers'])} transfers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
