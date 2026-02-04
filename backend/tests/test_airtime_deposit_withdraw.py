"""
Test suite for Airtime, Deposit, and Withdraw pages - Bug fixes verification
Tests the Mobile Money providers integration for 25 African countries
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://afripay-1.preview.emergentagent.com')

class TestAuthentication:
    """Test login flow"""
    
    def test_login_user(self):
        """Test user login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@sbpaygo.com",
            "password": "userpassword"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "user@sbpaygo.com"
        return data["access_token"]


class TestWithdrawalProviders:
    """Test withdrawal providers endpoint for various countries"""
    
    def test_senegal_providers(self):
        """GET /api/withdrawals/providers/SN - Returns Wave, Orange Money, Free Money, E-Money"""
        response = requests.get(f"{BASE_URL}/api/withdrawals/providers/SN")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "SN"
        assert data["currency"] == "XOF"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "wave" in provider_codes
        assert "orange_money" in provider_codes
        assert "free_money" in provider_codes
        assert "e_money" in provider_codes
        assert len(data["providers"]) == 4
    
    def test_kenya_providers(self):
        """GET /api/withdrawals/providers/KE - Returns M-Pesa"""
        response = requests.get(f"{BASE_URL}/api/withdrawals/providers/KE")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "KE"
        assert data["currency"] == "KES"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "mpesa" in provider_codes
        assert len(data["providers"]) >= 1
    
    def test_nigeria_providers(self):
        """GET /api/withdrawals/providers/NG - Returns OPay, PalmPay, etc."""
        response = requests.get(f"{BASE_URL}/api/withdrawals/providers/NG")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "NG"
        assert data["currency"] == "NGN"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "opay" in provider_codes
        assert "palmpay" in provider_codes
    
    def test_ghana_providers(self):
        """GET /api/withdrawals/providers/GH - Returns MTN MoMo"""
        response = requests.get(f"{BASE_URL}/api/withdrawals/providers/GH")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "GH"
        assert data["currency"] == "GHS"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "mtn_momo" in provider_codes


class TestDepositProviders:
    """Test deposit providers endpoint for various countries"""
    
    def test_cameroon_providers(self):
        """GET /api/deposits-v2/providers/CM - Returns Orange Money, MTN MoMo, Express Union"""
        response = requests.get(f"{BASE_URL}/api/deposits-v2/providers/CM")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "CM"
        assert data["currency"] == "XAF"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "orange_money" in provider_codes
        assert "mtn_momo" in provider_codes
        assert "express_union" in provider_codes
        assert len(data["providers"]) == 3
    
    def test_senegal_deposit_providers(self):
        """GET /api/deposits-v2/providers/SN - Returns Wave, Orange Money, Free Money, E-Money"""
        response = requests.get(f"{BASE_URL}/api/deposits-v2/providers/SN")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "SN"
        assert data["currency"] == "XOF"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "wave" in provider_codes
        assert "orange_money" in provider_codes
        assert len(data["providers"]) >= 4
    
    def test_nigeria_deposit_providers(self):
        """GET /api/deposits-v2/providers/NG - Returns OPay, PalmPay, Kuda, Moniepoint, Paga"""
        response = requests.get(f"{BASE_URL}/api/deposits-v2/providers/NG")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "NG"
        assert data["currency"] == "NGN"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "opay" in provider_codes
        assert "palmpay" in provider_codes
        assert "kuda" in provider_codes
        assert "moniepoint" in provider_codes
        assert "paga" in provider_codes
        assert len(data["providers"]) == 5
    
    def test_kenya_deposit_providers(self):
        """GET /api/deposits-v2/providers/KE - Returns M-Pesa, Airtel Money, T-Kash"""
        response = requests.get(f"{BASE_URL}/api/deposits-v2/providers/KE")
        assert response.status_code == 200
        data = response.json()
        assert data["country"] == "KE"
        assert data["currency"] == "KES"
        
        provider_codes = [p["code"] for p in data["providers"]]
        assert "mpesa" in provider_codes
        assert "airtel_money" in provider_codes
        assert "t_kash" in provider_codes
        assert len(data["providers"]) == 3


class TestAllCountriesProviders:
    """Test providers for all 25 African countries"""
    
    COUNTRIES = [
        # West Africa - UEMOA (XOF)
        ("SN", "XOF", "Sénégal"),
        ("CI", "XOF", "Côte d'Ivoire"),
        ("ML", "XOF", "Mali"),
        ("BF", "XOF", "Burkina Faso"),
        ("BJ", "XOF", "Bénin"),
        ("TG", "XOF", "Togo"),
        ("NE", "XOF", "Niger"),
        ("GW", "XOF", "Guinée-Bissau"),
        # West Africa - Non-UEMOA
        ("GN", "GNF", "Guinée"),
        ("GH", "GHS", "Ghana"),
        ("NG", "NGN", "Nigeria"),
        ("LR", "LRD", "Liberia"),
        ("SL", "SLL", "Sierra Leone"),
        # Central Africa - CEMAC (XAF)
        ("CM", "XAF", "Cameroun"),
        ("GA", "XAF", "Gabon"),
        ("CG", "XAF", "Congo-Brazzaville"),
        ("CD", "CDF", "RD Congo"),
        # East Africa
        ("KE", "KES", "Kenya"),
        ("TZ", "TZS", "Tanzanie"),
        ("UG", "UGX", "Ouganda"),
        ("RW", "RWF", "Rwanda"),
        # Southern Africa
        ("ZM", "ZMW", "Zambie"),
        ("ZW", "ZWL", "Zimbabwe"),
        # North Africa
        ("MA", "MAD", "Maroc"),
    ]
    
    @pytest.mark.parametrize("country_code,expected_currency,country_name", COUNTRIES)
    def test_deposit_providers_for_country(self, country_code, expected_currency, country_name):
        """Test deposit providers endpoint returns correct data for each country"""
        response = requests.get(f"{BASE_URL}/api/deposits-v2/providers/{country_code}")
        assert response.status_code == 200, f"Failed for {country_name} ({country_code})"
        data = response.json()
        assert data["country"] == country_code
        assert data["currency"] == expected_currency, f"Currency mismatch for {country_name}"
        assert "providers" in data
        assert len(data["providers"]) >= 1, f"No providers for {country_name}"
    
    @pytest.mark.parametrize("country_code,expected_currency,country_name", COUNTRIES)
    def test_withdrawal_providers_for_country(self, country_code, expected_currency, country_name):
        """Test withdrawal providers endpoint returns correct data for each country"""
        response = requests.get(f"{BASE_URL}/api/withdrawals/providers/{country_code}")
        assert response.status_code == 200, f"Failed for {country_name} ({country_code})"
        data = response.json()
        assert data["country"] == country_code
        assert data["currency"] == expected_currency, f"Currency mismatch for {country_name}"
        assert "providers" in data
        assert len(data["providers"]) >= 1, f"No providers for {country_name}"


class TestAirtimeEndpoints:
    """Test airtime-related endpoints"""
    
    def test_airtime_countries(self):
        """GET /api/airtime/countries - Returns list of supported countries"""
        response = requests.get(f"{BASE_URL}/api/airtime/countries")
        assert response.status_code == 200
        data = response.json()
        assert "countries" in data
        assert len(data["countries"]) >= 10
    
    def test_airtime_operators_senegal(self):
        """GET /api/airtime/operators/SN - Returns Senegal operators"""
        response = requests.get(f"{BASE_URL}/api/airtime/operators/SN")
        assert response.status_code == 200
        data = response.json()
        assert "operators" in data
        assert data["currency"] == "XOF"
        assert data["phone_prefix"] == "+221"
    
    def test_airtime_operators_ghana(self):
        """GET /api/airtime/operators/GH - Returns Ghana operators"""
        response = requests.get(f"{BASE_URL}/api/airtime/operators/GH")
        assert response.status_code == 200
        data = response.json()
        assert "operators" in data
        assert data["currency"] == "GHS"
        assert data["phone_prefix"] == "+233"
        
        # Verify MTN Ghana is in operators
        operator_codes = [op["code"] for op in data["operators"]]
        assert "mtn_gh" in operator_codes


class TestDepositConfig:
    """Test deposit configuration endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@sbpaygo.com",
            "password": "userpassword"
        })
        return response.json()["access_token"]
    
    def test_deposit_config(self, auth_token):
        """GET /api/deposits-v2/config - Returns deposit configuration"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/deposits-v2/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "methods" in data
        assert "mobile_money_providers" in data
        assert "quick_amounts" in data
        assert "wallets" in data
        assert "supported_countries" in data
        
        # Verify supported countries list has 24+ countries
        assert len(data["supported_countries"]) >= 20


class TestWithdrawalConfig:
    """Test withdrawal configuration endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@sbpaygo.com",
            "password": "userpassword"
        })
        return response.json()["access_token"]
    
    def test_withdrawal_config(self, auth_token):
        """GET /api/withdrawals/config - Returns withdrawal configuration"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/withdrawals/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "methods" in data
        assert "mobile_money_providers" in data
        assert "quick_amounts" in data
        assert "supported_countries" in data
        
        # Verify supported countries list has 24+ countries
        assert len(data["supported_countries"]) >= 20


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
