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


### 🔄 17. mobile_money_transfers (NEW - Module Afrique)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| source_operator | String | wave, orange_money, mtn_momo, moov |
| source_phone | String | Source phone number |
| dest_operator | String | Destination operator |
| dest_phone | String | Destination phone number |
| dest_country | String | Destination country code |
| amount | Decimal | Transfer amount |
| currency | String | Currency code |
| fee_fixed | Decimal | Fixed fee |
| fee_percent | Decimal | Percentage fee |
| total_fee | Decimal | Total fee charged |
| amount_received | Decimal | Amount after fees |
| exchange_rate | Decimal | If cross-currency |
| status | Enum | pending, processing, completed, failed, refunded |
| external_ref | String | Aggregator reference |
| aggregator | String | mfs_africa, flutterwave, paydunya |
| failure_reason | String | Reason if failed |
| webhook_received | Boolean | Webhook confirmation |
| created_at | DateTime | Creation date |
| completed_at | DateTime | Completion date |

### 📞 18. airtime_topups (NEW - Module Afrique)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| phone_number | String | Phone to credit |
| operator | String | Telecom operator |
| operator_name | String | Display name |
| country | String | Country code |
| amount | Decimal | Recharge amount |
| currency | String | Currency |
| fee | Decimal | Service fee |
| total_charged | Decimal | Amount + fee |
| payment_method | String | wallet, mobile_money |
| status | Enum | pending, processing, completed, failed |
| external_ref | String | Provider reference |
| provider | String | reloadly, dt_one, mfs_africa |
| created_at | DateTime | Creation date |
| completed_at | DateTime | Completion date |

### 📡 19. airtime_operators (NEW - Module Afrique)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| code | String | Operator code |
| name | String | Display name |
| country | String | Country code |
| logo_url | String | Operator logo |
| min_amount | Decimal | Minimum recharge |
| max_amount | Decimal | Maximum recharge |
| denomination_type | String | fixed, range |
| denominations | Array | Fixed amounts available |
| commission_rate | Decimal | SB Pay commission |
| active | Boolean | Is available |
| created_at | DateTime | Creation date |

### 💰 20. fee_configurations (NEW - Module Afrique)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| service_type | String | mm_transfer, airtime, bill_payment, withdrawal |
| source_operator | String | Source (if applicable) |
| dest_operator | String | Destination (if applicable) |
| country | String | Country code |
| fee_fixed | Decimal | Fixed fee amount |
| fee_percent | Decimal | Percentage fee |
| min_fee | Decimal | Minimum fee |
| max_fee | Decimal | Maximum fee |
| currency | String | Fee currency |
| active | Boolean | Is active |
| created_at | DateTime | Creation date |
| updated_at | DateTime | Last update |

### 📊 21. transaction_limits (NEW - Module Afrique)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| kyc_level | Int | 0, 1, 2, 3 |
| service_type | String | mm_transfer, airtime, withdrawal, etc. |
| per_transaction | Decimal | Max per transaction |
| per_day | Decimal | Max per day |
| per_week | Decimal | Max per week |
| per_month | Decimal | Max per month |
| currency | String | Limit currency |
| active | Boolean | Is active |
| created_at | DateTime | Creation date |

### 💼 22. subscription_plans (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| code | String | free, pro, business, enterprise |
| name | String | Plan name |
| price | Decimal | Monthly price |
| currency | String | Price currency |
| features | Array | List of features |
| limits | Object | { transfers_per_day, monthly_volume } |
| commission_discount | Decimal | Fee discount % |
| priority_support | Boolean | Has priority support |
| api_access | Boolean | Can use API |
| active | Boolean | Is available |
| created_at | DateTime | Creation date |

### 📦 23. user_subscriptions (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| plan_id | UUID | FK → subscription_plans |
| plan_code | String | Plan code |
| status | Enum | active, cancelled, expired |
| started_at | DateTime | Start date |
| expires_at | DateTime | Expiry date |
| auto_renew | Boolean | Auto renewal |
| payment_method | String | How they pay |
| created_at | DateTime | Creation date |

### 👥 24. beneficiaries (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| nickname | String | Display name |
| type | Enum | mobile_money, bank, wallet |
| operator | String | If mobile money |
| phone_number | String | If mobile money |
| bank_name | String | If bank |
| account_number | String | If bank |
| iban | String | If bank |
| wallet_email | String | If wallet |
| country | String | Country code |
| is_favorite | Boolean | Favorite flag |
| last_used_at | DateTime | Last transaction |
| created_at | DateTime | Creation date |

### 📅 25. scheduled_transfers (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| beneficiary_id | UUID | FK → beneficiaries |
| amount | Decimal | Transfer amount |
| currency | String | Currency |
| frequency | Enum | once, daily, weekly, monthly |
| next_execution | DateTime | Next execution date |
| last_execution | DateTime | Last execution |
| status | Enum | active, paused, completed, cancelled |
| executions_count | Int | Number of executions |
| max_executions | Int | Max executions (null = infinite) |
| created_at | DateTime | Creation date |

### 🧾 26. bill_payments (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| bill_type | Enum | electricity, water, internet, tv, other |
| provider | String | Bill provider |
| provider_name | String | Display name |
| customer_ref | String | Customer reference/meter number |
| amount | Decimal | Bill amount |
| fee | Decimal | Service fee |
| currency | String | Currency |
| status | Enum | pending, processing, completed, failed |
| external_ref | String | Provider reference |
| payment_method | String | wallet, mobile_money |
| created_at | DateTime | Payment date |
| completed_at | DateTime | Completion date |

### 🏪 27. bill_providers (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| code | String | Provider code |
| name | String | Display name |
| type | Enum | electricity, water, internet, tv |
| country | String | Country code |
| logo_url | String | Provider logo |
| commission_rate | Decimal | SB Pay commission |
| active | Boolean | Is available |
| created_at | DateTime | Creation date |

### 💳 28. virtual_cards (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| card_number | String | Encrypted card number |
| last4 | String | Last 4 digits |
| expiry_month | Int | Expiry month |
| expiry_year | Int | Expiry year |
| cvv | String | Encrypted CVV |
| brand | String | visa, mastercard |
| status | Enum | active, frozen, cancelled |
| balance | Decimal | Card balance |
| currency | String | Card currency |
| daily_limit | Decimal | Daily spending limit |
| monthly_limit | Decimal | Monthly limit |
| created_at | DateTime | Creation date |

### 🎯 29. savings_goals (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| name | String | Goal name |
| target_amount | Decimal | Target amount |
| current_amount | Decimal | Amount saved |
| currency | String | Currency |
| deadline | DateTime | Target date |
| auto_save_enabled | Boolean | Auto save |
| auto_save_amount | Decimal | Auto save amount |
| auto_save_frequency | Enum | daily, weekly, monthly |
| status | Enum | active, completed, cancelled |
| created_at | DateTime | Creation date |
| completed_at | DateTime | When reached |

### 🎁 30. referral_program (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| referrer_id | UUID | FK → users (who referred) |
| referee_id | UUID | FK → users (who was referred) |
| referrer_bonus | Decimal | Bonus for referrer |
| referee_bonus | Decimal | Bonus for referee |
| currency | String | Bonus currency |
| status | Enum | pending, qualified, paid |
| qualification_date | DateTime | When qualified |
| paid_at | DateTime | When paid |
| created_at | DateTime | Referral date |

### 🚨 31. disputes (NEW)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| transaction_id | UUID | FK → transactions |
| type | Enum | not_received, wrong_amount, fraud, other |
| description | String | Issue description |
| status | Enum | open, investigating, resolved, closed |
| resolution | String | Resolution details |
| refund_amount | Decimal | If refunded |
| assigned_to | UUID | Admin handling |
| created_at | DateTime | Report date |
| resolved_at | DateTime | Resolution date |


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
