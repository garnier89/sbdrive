"""
Test International Payments API - Europe, USA, Asia (Alipay, WeChat Pay, PayPal, SEPA, ACH)
Tests for the new international payments module
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInternationalPaymentsProviders:
    """Test international payment providers endpoints"""
    
    def test_get_all_providers(self):
        """GET /api/payments/international/providers - Returns all regions and providers"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers")
        assert response.status_code == 200
        
        data = response.json()
        assert "regions" in data
        assert "providers" in data
        
        # Verify all regions are present
        expected_regions = ["europe", "usa", "asia", "africa"]
        for region in expected_regions:
            assert region in data["regions"], f"Region {region} not found"
            assert region in data["providers"], f"Providers for {region} not found"
    
    def test_get_europe_providers(self):
        """GET /api/payments/international/providers/europe - Returns European providers"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/europe")
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "europe"
        assert "providers" in data
        
        # Verify European providers
        providers = data["providers"]
        assert "sepa" in providers, "SEPA not found in Europe providers"
        assert "paypal" in providers, "PayPal not found in Europe providers"
        assert "card" in providers, "Card not found in Europe providers"
        
        # Verify SEPA details
        sepa = providers["sepa"]
        assert sepa["name"] == "SEPA Transfer"
        assert "EUR" in sepa["currencies"]
        assert sepa["fee_percent"] == 0  # SEPA is free
    
    def test_get_usa_providers(self):
        """GET /api/payments/international/providers/usa - Returns USA providers"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/usa")
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "usa"
        
        providers = data["providers"]
        assert "ach" in providers, "ACH not found in USA providers"
        assert "paypal" in providers, "PayPal not found in USA providers"
        
        # Verify ACH details
        ach = providers["ach"]
        assert ach["name"] == "ACH Transfer"
        assert "USD" in ach["currencies"]
    
    def test_get_asia_providers_alipay_wechat(self):
        """GET /api/payments/international/providers/asia - Returns Alipay and WeChat Pay"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/asia")
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "asia"
        
        providers = data["providers"]
        
        # Verify Alipay
        assert "alipay" in providers, "Alipay not found in Asia providers"
        alipay = providers["alipay"]
        assert alipay["name"] == "Alipay (支付宝)"
        assert "CNY" in alipay["currencies"]
        assert "USD" in alipay["currencies"]
        assert "EUR" in alipay["currencies"]
        assert alipay["icon"] == "🔷"
        assert "CN" in alipay["supported_countries"]
        
        # Verify WeChat Pay
        assert "wechat_pay" in providers, "WeChat Pay not found in Asia providers"
        wechat = providers["wechat_pay"]
        assert wechat["name"] == "WeChat Pay (微信支付)"
        assert "CNY" in wechat["currencies"]
        assert wechat["icon"] == "🟢"
        assert "CN" in wechat["supported_countries"]
        
        # Verify UnionPay
        assert "unionpay" in providers, "UnionPay not found in Asia providers"
    
    def test_get_africa_providers(self):
        """GET /api/payments/international/providers/africa - Returns Mobile Money"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/africa")
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "africa"
        
        providers = data["providers"]
        assert "mobile_money" in providers
        
        mm = providers["mobile_money"]
        assert "XOF" in mm["currencies"]
        assert "NGN" in mm["currencies"]
        assert "KES" in mm["currencies"]
    
    def test_get_invalid_region(self):
        """GET /api/payments/international/providers/invalid - Returns 404"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/invalid_region")
        assert response.status_code == 404
    
    def test_providers_with_region_query_param(self):
        """GET /api/payments/international/providers?region=asia - Returns Asia providers"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers?region=asia")
        assert response.status_code == 200
        
        data = response.json()
        assert data["region"] == "asia"
        assert "alipay" in data["providers"]
        assert "wechat_pay" in data["providers"]


class TestExchangeRateAPI:
    """Test exchange rate endpoint"""
    
    def test_exchange_rate_eur_to_usd(self):
        """GET /api/payments/international/exchange-rate - EUR to USD"""
        response = requests.get(
            f"{BASE_URL}/api/payments/international/exchange-rate",
            params={"from_currency": "EUR", "to_currency": "USD", "amount": 100}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["from_currency"] == "EUR"
        assert data["to_currency"] == "USD"
        assert data["amount"] == 100.0
        assert data["rate"] > 0
        assert data["converted_amount"] > 0
        # EUR to USD rate should be around 1.08
        assert 1.0 < data["rate"] < 1.2
    
    def test_exchange_rate_eur_to_cny(self):
        """GET /api/payments/international/exchange-rate - EUR to CNY"""
        response = requests.get(
            f"{BASE_URL}/api/payments/international/exchange-rate",
            params={"from_currency": "EUR", "to_currency": "CNY", "amount": 100}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["from_currency"] == "EUR"
        assert data["to_currency"] == "CNY"
        # EUR to CNY rate should be around 7.82
        assert 7.0 < data["rate"] < 8.5
        assert data["converted_amount"] > 700
    
    def test_exchange_rate_same_currency(self):
        """GET /api/payments/international/exchange-rate - Same currency returns 1.0"""
        response = requests.get(
            f"{BASE_URL}/api/payments/international/exchange-rate",
            params={"from_currency": "EUR", "to_currency": "EUR", "amount": 100}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["rate"] == 1.0
        assert data["converted_amount"] == 100.0
    
    def test_exchange_rate_xof_to_eur(self):
        """GET /api/payments/international/exchange-rate - XOF to EUR"""
        response = requests.get(
            f"{BASE_URL}/api/payments/international/exchange-rate",
            params={"from_currency": "XOF", "to_currency": "EUR", "amount": 10000}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["from_currency"] == "XOF"
        assert data["to_currency"] == "EUR"
        # 10000 XOF should be around 15 EUR
        assert 10 < data["converted_amount"] < 20


class TestProviderDetails:
    """Test provider configuration details"""
    
    def test_alipay_configuration(self):
        """Verify Alipay provider configuration"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/asia")
        assert response.status_code == 200
        
        alipay = response.json()["providers"]["alipay"]
        
        # Verify configuration
        assert alipay["min_amount"] == 10
        assert alipay["max_amount"] == 50000
        assert alipay["fee_percent"] == 2.2
        assert alipay["processing_time"] == "Instant"
        
        # Verify supported countries
        supported = alipay["supported_countries"]
        assert "CN" in supported  # China
        assert "HK" in supported  # Hong Kong
        assert "SG" in supported  # Singapore
        assert "JP" in supported  # Japan
        assert "KR" in supported  # Korea
    
    def test_wechat_pay_configuration(self):
        """Verify WeChat Pay provider configuration"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/asia")
        assert response.status_code == 200
        
        wechat = response.json()["providers"]["wechat_pay"]
        
        # Verify configuration
        assert wechat["min_amount"] == 10
        assert wechat["max_amount"] == 50000
        assert wechat["fee_percent"] == 2.0
        assert wechat["processing_time"] == "Instant"
        
        # Verify supported countries
        supported = wechat["supported_countries"]
        assert "CN" in supported
        assert "HK" in supported
        assert "TH" in supported  # Thailand
    
    def test_paypal_configuration(self):
        """Verify PayPal provider configuration in Europe"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/europe")
        assert response.status_code == 200
        
        paypal = response.json()["providers"]["paypal"]
        
        assert paypal["name"] == "PayPal"
        assert "EUR" in paypal["currencies"]
        assert "GBP" in paypal["currencies"]
        assert "USD" in paypal["currencies"]
        assert paypal["fee_percent"] == 2.9
        assert paypal["processing_time"] == "Instant"
    
    def test_sepa_configuration(self):
        """Verify SEPA provider configuration"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/europe")
        assert response.status_code == 200
        
        sepa = response.json()["providers"]["sepa"]
        
        assert sepa["name"] == "SEPA Transfer"
        assert sepa["currencies"] == ["EUR"]
        assert sepa["fee_percent"] == 0  # SEPA is free
        assert sepa["fee_fixed"] == 0
        assert sepa["max_amount"] == 100000
    
    def test_ach_configuration(self):
        """Verify ACH provider configuration"""
        response = requests.get(f"{BASE_URL}/api/payments/international/providers/usa")
        assert response.status_code == 200
        
        ach = response.json()["providers"]["ach"]
        
        assert ach["name"] == "ACH Transfer"
        assert ach["currencies"] == ["USD"]
        assert ach["fee_percent"] == 0.5
        assert ach["processing_time"] == "2-3 business days"


class TestLandingPageAPIs:
    """Test APIs used by landing page"""
    
    def test_landing_page_loads(self):
        """Verify landing page is accessible"""
        response = requests.get(f"{BASE_URL}")
        assert response.status_code == 200
    
    def test_legal_terms_page(self):
        """Verify terms page is accessible"""
        response = requests.get(f"{BASE_URL}/legal/terms")
        assert response.status_code == 200
    
    def test_legal_privacy_page(self):
        """Verify privacy page is accessible"""
        response = requests.get(f"{BASE_URL}/legal/privacy")
        assert response.status_code == 200
    
    def test_legal_pricing_page(self):
        """Verify pricing page is accessible"""
        response = requests.get(f"{BASE_URL}/legal/pricing")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
