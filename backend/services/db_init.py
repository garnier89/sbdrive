"""
SB Pay - Database Initialization
Seeds currencies, languages, banks, zones, and payment methods
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

load_dotenv(Path(__file__).parent.parent / '.env')

# ==================== SEED DATA ====================

CURRENCIES = [
    {"code": "EUR", "name": "Euro", "symbol": "€", "active": True},
    {"code": "USD", "name": "US Dollar", "symbol": "$", "active": True},
    {"code": "XOF", "name": "CFA Franc BCEAO", "symbol": "CFA", "active": True},
    {"code": "XAF", "name": "CFA Franc BEAC", "symbol": "FCFA", "active": True},
    {"code": "GBP", "name": "British Pound", "symbol": "£", "active": True},
    {"code": "MAD", "name": "Moroccan Dirham", "symbol": "DH", "active": True},
    {"code": "NGN", "name": "Nigerian Naira", "symbol": "₦", "active": True},
    {"code": "GHS", "name": "Ghanaian Cedi", "symbol": "₵", "active": True},
    {"code": "KES", "name": "Kenyan Shilling", "symbol": "KSh", "active": True},
    {"code": "ZAR", "name": "South African Rand", "symbol": "R", "active": True},
    {"code": "CAD", "name": "Canadian Dollar", "symbol": "C$", "active": True},
    {"code": "CHF", "name": "Swiss Franc", "symbol": "CHF", "active": True},
]

LANGUAGES = [
    {"code": "fr", "name": "French", "native_name": "Français", "rtl": False, "active": True},
    {"code": "en", "name": "English", "native_name": "English", "rtl": False, "active": True},
    {"code": "es", "name": "Spanish", "native_name": "Español", "rtl": False, "active": True},
    {"code": "pt", "name": "Portuguese", "native_name": "Português", "rtl": False, "active": True},
    {"code": "ar", "name": "Arabic", "native_name": "العربية", "rtl": True, "active": True},
    {"code": "de", "name": "German", "native_name": "Deutsch", "rtl": False, "active": True},
    {"code": "zh", "name": "Chinese", "native_name": "中文", "rtl": False, "active": True},
    {"code": "sw", "name": "Swahili", "native_name": "Kiswahili", "rtl": False, "active": True},
]

BANKS = [
    # France
    {"name": "BNP Paribas", "country": "FR", "swift_code": "BNPAFRPP"},
    {"name": "Société Générale", "country": "FR", "swift_code": "SOGEFRPP"},
    {"name": "Crédit Agricole", "country": "FR", "swift_code": "AGRIFRPP"},
    {"name": "La Banque Postale", "country": "FR", "swift_code": "PSSTFRPP"},
    {"name": "Crédit Mutuel", "country": "FR", "swift_code": "CMCIFRPP"},
    {"name": "LCL", "country": "FR", "swift_code": "CRLYFRPP"},
    # Germany
    {"name": "Deutsche Bank", "country": "DE", "swift_code": "DEUTDEFF"},
    {"name": "Commerzbank", "country": "DE", "swift_code": "COBADEFF"},
    # UK
    {"name": "HSBC UK", "country": "GB", "swift_code": "HBUKGB4B"},
    {"name": "Barclays", "country": "GB", "swift_code": "BARCGB22"},
    {"name": "Lloyds Bank", "country": "GB", "swift_code": "LOYDGB2L"},
    {"name": "NatWest", "country": "GB", "swift_code": "NWBKGB2L"},
    # USA
    {"name": "Bank of America", "country": "US", "swift_code": "BOFAUS3N"},
    {"name": "Chase Bank", "country": "US", "swift_code": "CHASUS33"},
    {"name": "Wells Fargo", "country": "US", "swift_code": "WFBIUS6S"},
    {"name": "Citibank", "country": "US", "swift_code": "CITIUS33"},
    # Senegal
    {"name": "CBAO", "country": "SN", "swift_code": "CBAOSNDA"},
    {"name": "BICIS", "country": "SN", "swift_code": "ABORSNDA"},
    {"name": "Société Générale Sénégal", "country": "SN", "swift_code": "SGSNSNDA"},
    {"name": "Ecobank Sénégal", "country": "SN", "swift_code": "ABORSNDA"},
    # Côte d'Ivoire
    {"name": "BICICI", "country": "CI", "swift_code": "BICICIAB"},
    {"name": "Société Générale CI", "country": "CI", "swift_code": "SGBFCIAB"},
    {"name": "Ecobank CI", "country": "CI", "swift_code": "EABORCIAB"},
    # Morocco
    {"name": "Attijariwafa Bank", "country": "MA", "swift_code": "BCMAMAMC"},
    {"name": "BMCE Bank", "country": "MA", "swift_code": "BMCEMAMC"},
    {"name": "Banque Populaire", "country": "MA", "swift_code": "BCPOMAMA"},
    # Nigeria
    {"name": "GTBank", "country": "NG", "swift_code": "GTBINGLA"},
    {"name": "First Bank", "country": "NG", "swift_code": "FBNINGLA"},
    {"name": "Access Bank", "country": "NG", "swift_code": "LOYDGB2L"},
    {"name": "Zenith Bank", "country": "NG", "swift_code": "ZEABORNG"},
    # Cameroon
    {"name": "Afriland First Bank", "country": "CM", "swift_code": "AFRIDEMX"},
    {"name": "Société Générale Cameroun", "country": "CM", "swift_code": "SGCMCMCX"},
    {"name": "UBA Cameroon", "country": "CM", "swift_code": "UBAAMCMX"},
]

ZONES = [
    {"name": "Zone Europe", "country": "FR", "currency": "EUR", "language": "fr"},
    {"name": "Zone Europe", "country": "DE", "currency": "EUR", "language": "de"},
    {"name": "Zone Europe", "country": "ES", "currency": "EUR", "language": "es"},
    {"name": "Zone UK", "country": "GB", "currency": "GBP", "language": "en"},
    {"name": "Zone Afrique de l'Ouest", "country": "SN", "currency": "XOF", "language": "fr"},
    {"name": "Zone Afrique de l'Ouest", "country": "CI", "currency": "XOF", "language": "fr"},
    {"name": "Zone Afrique de l'Ouest", "country": "ML", "currency": "XOF", "language": "fr"},
    {"name": "Zone Afrique de l'Ouest", "country": "BF", "currency": "XOF", "language": "fr"},
    {"name": "Zone Afrique de l'Ouest", "country": "TG", "currency": "XOF", "language": "fr"},
    {"name": "Zone Afrique de l'Ouest", "country": "BJ", "currency": "XOF", "language": "fr"},
    {"name": "Zone Afrique Centrale", "country": "CM", "currency": "XAF", "language": "fr"},
    {"name": "Zone Afrique Centrale", "country": "GA", "currency": "XAF", "language": "fr"},
    {"name": "Zone Maghreb", "country": "MA", "currency": "MAD", "language": "ar"},
    {"name": "Zone Maghreb", "country": "TN", "currency": "TND", "language": "ar"},
    {"name": "Zone Nigeria", "country": "NG", "currency": "NGN", "language": "en"},
    {"name": "Zone USA", "country": "US", "currency": "USD", "language": "en"},
    {"name": "Zone Canada", "country": "CA", "currency": "CAD", "language": "en"},
]

MOBILE_MONEY_PROVIDERS = [
    {"code": "orange_money", "name": "Orange Money", "countries": ["SN", "CI", "ML", "BF", "CM"], "currencies": ["XOF", "XAF"]},
    {"code": "mtn_momo", "name": "MTN Mobile Money", "countries": ["CI", "CM", "GH", "NG", "UG"], "currencies": ["XOF", "XAF", "GHS", "NGN"]},
    {"code": "wave", "name": "Wave", "countries": ["SN", "CI", "ML", "BF"], "currencies": ["XOF"]},
    {"code": "moov_money", "name": "Moov Money", "countries": ["CI", "BF", "TG", "BJ"], "currencies": ["XOF"]},
    {"code": "m_pesa", "name": "M-Pesa", "countries": ["KE", "TZ", "GH"], "currencies": ["KES", "TZS", "GHS"]},
    {"code": "airtel_money", "name": "Airtel Money", "countries": ["NG", "KE", "UG"], "currencies": ["NGN", "KES", "UGX"]},
]

EXCHANGE_RATES = [
    {"base_currency": "EUR", "target_currency": "USD", "rate": 1.08},
    {"base_currency": "EUR", "target_currency": "XOF", "rate": 655.96},
    {"base_currency": "EUR", "target_currency": "XAF", "rate": 655.96},
    {"base_currency": "EUR", "target_currency": "GBP", "rate": 0.86},
    {"base_currency": "EUR", "target_currency": "MAD", "rate": 10.85},
    {"base_currency": "EUR", "target_currency": "NGN", "rate": 1650.0},
    {"base_currency": "EUR", "target_currency": "GHS", "rate": 15.5},
    {"base_currency": "EUR", "target_currency": "KES", "rate": 155.0},
    {"base_currency": "EUR", "target_currency": "CAD", "rate": 1.47},
    {"base_currency": "EUR", "target_currency": "CHF", "rate": 0.94},
    {"base_currency": "EUR", "target_currency": "ZAR", "rate": 20.5},
    {"base_currency": "USD", "target_currency": "EUR", "rate": 0.93},
    {"base_currency": "USD", "target_currency": "XOF", "rate": 607.37},
    {"base_currency": "USD", "target_currency": "NGN", "rate": 1528.0},
    {"base_currency": "XOF", "target_currency": "EUR", "rate": 0.00152},
    {"base_currency": "GBP", "target_currency": "EUR", "rate": 1.16},
]

ZONE_PAYMENT_METHODS = [
    # Europe
    {"zone_country": "FR", "method": "card", "active": True, "fees_percent": 1.5},
    {"zone_country": "FR", "method": "bank", "active": True, "fees_percent": 0.5},
    {"zone_country": "FR", "method": "wallet", "active": True, "fees_percent": 0.0},
    {"zone_country": "DE", "method": "card", "active": True, "fees_percent": 1.5},
    {"zone_country": "DE", "method": "bank", "active": True, "fees_percent": 0.5},
    # West Africa
    {"zone_country": "SN", "method": "mobile_money", "active": True, "fees_percent": 1.0},
    {"zone_country": "SN", "method": "wallet", "active": True, "fees_percent": 0.0},
    {"zone_country": "SN", "method": "bank", "active": True, "fees_percent": 1.5},
    {"zone_country": "CI", "method": "mobile_money", "active": True, "fees_percent": 1.0},
    {"zone_country": "CI", "method": "wallet", "active": True, "fees_percent": 0.0},
    # Nigeria
    {"zone_country": "NG", "method": "card", "active": True, "fees_percent": 2.0},
    {"zone_country": "NG", "method": "mobile_money", "active": True, "fees_percent": 1.5},
    {"zone_country": "NG", "method": "bank", "active": True, "fees_percent": 1.0},
]


async def init_database():
    """Initialize database with seed data"""
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client[os.environ.get('DB_NAME', 'sbpay')]
    
    now = datetime.now(timezone.utc).isoformat()
    
    print("🗄️  Initializing SB Pay Database...")
    
    # Currencies
    existing_currencies = await db.currencies.count_documents({})
    if existing_currencies == 0:
        for curr in CURRENCIES:
            curr["id"] = str(uuid.uuid4())
            curr["created_at"] = now
        await db.currencies.insert_many(CURRENCIES)
        print(f"✅ {len(CURRENCIES)} currencies inserted")
    else:
        print(f"⏭️  Currencies already exist ({existing_currencies})")
    
    # Languages
    existing_languages = await db.languages.count_documents({})
    if existing_languages == 0:
        for lang in LANGUAGES:
            lang["id"] = str(uuid.uuid4())
            lang["created_at"] = now
        await db.languages.insert_many(LANGUAGES)
        print(f"✅ {len(LANGUAGES)} languages inserted")
    else:
        print(f"⏭️  Languages already exist ({existing_languages})")
    
    # Banks
    existing_banks = await db.banks.count_documents({})
    if existing_banks == 0:
        for bank in BANKS:
            bank["id"] = str(uuid.uuid4())
            bank["created_at"] = now
        await db.banks.insert_many(BANKS)
        print(f"✅ {len(BANKS)} banks inserted")
    else:
        print(f"⏭️  Banks already exist ({existing_banks})")
    
    # Zones
    existing_zones = await db.zones.count_documents({})
    if existing_zones == 0:
        for zone in ZONES:
            zone["id"] = str(uuid.uuid4())
            zone["created_at"] = now
        await db.zones.insert_many(ZONES)
        print(f"✅ {len(ZONES)} zones inserted")
    else:
        print(f"⏭️  Zones already exist ({existing_zones})")
    
    # Mobile Money Providers
    existing_providers = await db.mobile_money_providers.count_documents({})
    if existing_providers == 0:
        for provider in MOBILE_MONEY_PROVIDERS:
            provider["id"] = str(uuid.uuid4())
            provider["created_at"] = now
        await db.mobile_money_providers.insert_many(MOBILE_MONEY_PROVIDERS)
        print(f"✅ {len(MOBILE_MONEY_PROVIDERS)} mobile money providers inserted")
    else:
        print(f"⏭️  Mobile money providers already exist ({existing_providers})")
    
    # Exchange Rates
    existing_rates = await db.exchange_rates.count_documents({})
    if existing_rates == 0:
        for rate in EXCHANGE_RATES:
            rate["id"] = str(uuid.uuid4())
            rate["updated_at"] = now
        await db.exchange_rates.insert_many(EXCHANGE_RATES)
        print(f"✅ {len(EXCHANGE_RATES)} exchange rates inserted")
    else:
        print(f"⏭️  Exchange rates already exist ({existing_rates})")
    
    # Zone Payment Methods
    existing_methods = await db.zone_payment_methods.count_documents({})
    if existing_methods == 0:
        for method in ZONE_PAYMENT_METHODS:
            method["id"] = str(uuid.uuid4())
            method["created_at"] = now
        await db.zone_payment_methods.insert_many(ZONE_PAYMENT_METHODS)
        print(f"✅ {len(ZONE_PAYMENT_METHODS)} zone payment methods inserted")
    else:
        print(f"⏭️  Zone payment methods already exist ({existing_methods})")
    
    # Create indexes
    print("📇 Creating indexes...")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("phone")
    await db.wallets.create_index([("user_id", 1), ("currency", 1)])
    await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.transactions.create_index("reference")
    await db.bank_accounts.create_index("user_id")
    await db.mobile_money_accounts.create_index("user_id")
    await db.cards.create_index("user_id")
    await db.documents.create_index([("user_id", 1), ("type", 1)])
    await db.exchange_rates.create_index([("base_currency", 1), ("target_currency", 1)])
    await db.zones.create_index("country")
    
    print("✅ Database initialization complete!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(init_database())
