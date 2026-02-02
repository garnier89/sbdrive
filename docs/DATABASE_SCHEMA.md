# SB Pay - Database Schema Documentation

## Overview
Complete database schema for SB Pay payment system with support for:
- Multi-currency wallets
- Bank accounts & cards
- Mobile Money integration
- Multi-language & multi-zone support

---

## Collections

### 👤 1. users
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique email |
| password_hash | String | Bcrypt hash |
| first_name | String | First name |
| last_name | String | Last name |
| full_name | String | Computed full name |
| phone | String | Phone number |
| country | String | Country code (FR, SN, etc.) |
| default_currency | String | User's main currency |
| preferred_language | String | Language code |
| status | Enum | active, suspended, deleted |
| role | String | user, admin |
| kyc_status | String | pending, verified, rejected |
| two_factor_enabled | Boolean | 2FA status |
| two_factor_phone | String | 2FA phone |
| created_at | DateTime | Registration date |

### 💼 2. wallets
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| currency | String | Currency code |
| balance | Decimal | Current balance |
| created_at | DateTime | Creation date |
| updated_at | DateTime | Last update |

> One user can have multiple wallets (one per currency)

### 💳 3. cards
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| token | String | Stripe token (encrypted) |
| brand | String | visa, mastercard, amex |
| last4 | String | Last 4 digits |
| expiry | String | MM/YYYY |
| expiry_month | Int | Month |
| expiry_year | Int | Year |
| is_default | Boolean | Default card flag |
| deleted | Boolean | Soft delete |
| created_at | DateTime | Creation date |

### 🏦 4. bank_accounts
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| bank_id | UUID | FK → banks (optional) |
| bank_name | String | Bank name |
| account_holder_name | String | Account holder |
| iban | String | IBAN number |
| account_number | String | Account number |
| swift_bic | String | SWIFT/BIC code |
| bank_country | String | Country code |
| currency | String | Account currency |
| is_default | Boolean | Default account |
| verification_status | String | pending, verified, failed |
| deleted | Boolean | Soft delete |
| created_at | DateTime | Creation date |

### 🏛️ 5. banks
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Bank name |
| country | String | Country code |
| swift_code | String | SWIFT code |
| logo_url | String | Bank logo URL |
| created_at | DateTime | Creation date |

### 📱 6. mobile_money_accounts
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| provider | String | orange_money, mtn_momo, wave, moov_money |
| provider_name | String | Display name |
| phone_number | String | Mobile number |
| account_name | String | Account holder name |
| is_verified | Boolean | Verification status |
| is_default | Boolean | Default account |
| deleted | Boolean | Soft delete |
| created_at | DateTime | Creation date |

### 📱 7. mobile_money_providers
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| code | String | Provider code |
| name | String | Display name |
| countries | Array | Supported countries |
| currencies | Array | Supported currencies |
| created_at | DateTime | Creation date |

### 💸 8. transactions
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| type | Enum | payment, transfer, deposit, withdrawal, bill_payment, refund |
| method | Enum | card, mobile_money, wallet, bank |
| amount | Decimal | Transaction amount |
| fee | Decimal | Transaction fee |
| currency | String | Currency code |
| status | Enum | pending, completed, failed, cancelled |
| reference | String | External reference (API ID) |
| description | String | Transaction description |
| recipient_email | String | For transfers |
| stripe_session_id | String | For Stripe payments |
| paypal_order_id | String | For PayPal payments |
| bank_account_id | String | For bank transfers |
| mobile_money_account_id | String | For MM transfers |
| created_at | DateTime | Transaction date |
| updated_at | DateTime | Last update |

### 💱 9. currencies
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| code | String | ISO code (EUR, USD, XOF) |
| name | String | Full name |
| symbol | String | Currency symbol |
| active | Boolean | Is active |
| created_at | DateTime | Creation date |

### 🌐 10. languages
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| code | String | Language code (fr, en, ar) |
| name | String | English name |
| native_name | String | Native name |
| rtl | Boolean | Right-to-left |
| active | Boolean | Is active |
| created_at | DateTime | Creation date |

### 🗺️ 11. zones
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Zone name |
| country | String | Country code |
| currency | String | Default currency |
| language | String | Default language |
| created_at | DateTime | Creation date |

### ⚙️ 12. zone_payment_methods
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| zone_country | String | Country code |
| method | String | card, mobile_money, bank, wallet |
| active | Boolean | Is enabled |
| fees_percent | Decimal | Fee percentage |
| created_at | DateTime | Creation date |

### 📄 13. documents
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| type | Enum | id_card, passport, proof_of_address, bank_statement, selfie |
| file_url | String | Document URL |
| status | Enum | pending, approved, rejected |
| rejection_reason | String | Reason if rejected |
| created_at | DateTime | Upload date |

### 🛠️ 14. admin_logs
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| admin_id | UUID | FK → users (admin) |
| action | String | Action performed |
| target_type | String | Entity type |
| target_id | String | Entity ID |
| details | Object | Additional details |
| created_at | DateTime | Action date |

### 💱 15. exchange_rates
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| base_currency | String | Base currency |
| target_currency | String | Target currency |
| rate | Decimal | Exchange rate |
| updated_at | DateTime | Last update |

### 💳 16. payment_transactions
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| session_id | String | Stripe session ID |
| transaction_id | UUID | FK → transactions |
| user_id | UUID | FK → users |
| amount | Decimal | Amount |
| currency | String | Currency |
| payment_status | String | pending, paid, failed |
| created_at | DateTime | Creation date |
| updated_at | DateTime | Last update |

---

## Relationships

```
users ─────┬──────► wallets (1:N)
           ├──────► cards (1:N)
           ├──────► bank_accounts (1:N)
           ├──────► mobile_money_accounts (1:N)
           ├──────► transactions (1:N)
           └──────► documents (1:N)

bank_accounts ────► banks (N:1)

zones ────────────► zone_payment_methods (1:N)

admin_logs ───────► users (N:1) [admin user]
```

---

## Indexes

- `users.email` - Unique
- `users.phone` - Standard
- `wallets.(user_id, currency)` - Compound
- `transactions.(user_id, created_at)` - Compound (descending)
- `transactions.reference` - Standard
- `bank_accounts.user_id` - Standard
- `mobile_money_accounts.user_id` - Standard
- `cards.user_id` - Standard
- `documents.(user_id, type)` - Compound
- `exchange_rates.(base_currency, target_currency)` - Compound
- `zones.country` - Standard

---

## Data Seeding

Initial data is seeded via `/app/backend/services/db_init.py`:

- **12 currencies** (EUR, USD, XOF, XAF, GBP, MAD, NGN, GHS, KES, ZAR, CAD, CHF)
- **8 languages** (FR, EN, ES, PT, AR, DE, ZH, SW)
- **33 banks** (France, Germany, UK, USA, Senegal, Côte d'Ivoire, Morocco, Nigeria, Cameroon)
- **17 zones** (Europe, West Africa, Central Africa, Maghreb, Nigeria, USA, Canada)
- **6 mobile money providers** (Orange, MTN, Wave, Moov, M-Pesa, Airtel)
- **16 exchange rates** (EUR, USD, XOF base pairs)
- **13 zone payment methods** (per country activation)

---

## API Endpoints

### Public
- `GET /api/currencies` - List currencies
- `GET /api/languages` - List languages
- `GET /api/exchange-rates` - Get rates
- `GET /api/exchange-rates/convert` - Convert currency
- `GET /api/banks` - List banks

### Authenticated (User)
- `GET/POST/DELETE /api/cards` - Manage cards
- `GET/POST/DELETE /api/bank-accounts` - Manage bank accounts
- `GET/POST/DELETE /api/mobile-money-accounts` - Manage mobile money
- `GET /api/wallets` - Get user wallets
- `POST /api/transfers` - P2P transfer
- `POST /api/deposits/checkout` - Stripe deposit
- `POST /api/mobile-money/deposit` - Mobile money deposit
- `GET /api/transactions` - Transaction history

### Admin
- `GET /api/admin/stats` - Dashboard stats
- `GET/PUT /api/admin/users` - Manage users
- `GET /api/admin/transactions` - All transactions
- `GET/PUT /api/admin/documents` - KYC documents
- `POST /api/admin/credit` - Credit user wallet
- `POST /api/admin/debit` - Debit user wallet
