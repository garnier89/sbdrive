# SB Pay - Product Requirements Document

## Project Overview
**Name:** SB Pay  
**Type:** Online Payment System (PayPal-like Fintech Platform)  
**Created:** December 2025  
**Last Updated:** February 2026  
**Stack:** React + FastAPI + MongoDB  
**Preview URL:** https://paynow-52.preview.emergentagent.com

## Features Summary

### ✅ COMPLETED FEATURES

#### Core Payment Features
- [x] Multi-currency wallets (12 currencies: EUR, USD, XOF, etc.)
- [x] P2P transfers between users
- [x] Bank transfers
- [x] Deposits (Stripe REAL, PayPal/MM DEMO)
- [x] Withdrawals
- [x] Transaction history with PDF receipts
- [x] Exchange rate conversion

#### QR Code Payments
- [x] Generate QR codes for receiving payments
- [x] Scan QR codes to pay
- [x] Download/Share QR codes
- [x] QR payment tracking

#### Payment Links
- [x] Create shareable payment links
- [x] Custom amount, currency, description, expiry
- [x] Public payment page (/pay/:code)
- [x] Track link status

#### Rewards & Loyalty System
- [x] Points earned on transactions (1€ = 1 point)
- [x] 5 tiers: Bronze, Silver, Gold, Platinum, Diamond
- [x] Cashback rates: 0.5% - 3%
- [x] Referral program (500 points per referral)
- [x] Points redemption (100 points = 1€)

#### User Profile
- [x] Personal info management
- [x] Security settings (password, 2FA)
- [x] Linked payments overview
- [x] KYC document management

#### Admin Panel
- [x] Dashboard with statistics
- [x] User management
- [x] Transaction monitoring
- [x] KYC document review
- [x] Geographic zones configuration
- [x] Payment gateways configuration
- [x] Security & Capture rules (3D Secure, Anti-fraud, Velocity)

#### Support & Communication
- [x] WhatsApp floating button
- [x] Tawk.to integration ready
- [x] Support settings admin

#### Internationalization
- [x] 8 languages supported
- [x] 17 geographic zones
- [x] Zone-specific payment methods

### Database Collections (20+)
users, wallets, cards, bank_accounts, banks, mobile_money_accounts, mobile_money_providers, transactions, currencies, languages, zones, zone_payment_methods, documents, admin_logs, exchange_rates, payment_transactions, payment_gateways, payment_links, qr_payments, rewards, rewards_history, app_settings

## Test Credentials
- **Admin:** admin@sbpay.com / adminpassword
- **User:** user@sbpay.com / userpassword

## API Endpoints (50+)
See /app/docs/API_REFERENCE.md for complete list

## Configuration Needed

### For Production:
1. **WhatsApp Business** - Set your actual business number
2. **Tawk.to** - Create free account, add property/widget IDs
3. **PayPal** - Add Client ID + Secret
4. **Flutterwave** - For real Mobile Money
5. **Twilio** - For SMS 2FA
6. **Firebase** - For push notifications

## Files Structure
```
/app/
├── backend/
│   ├── server.py (main API)
│   ├── models/schemas.py
│   └── services/db_init.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── QRPaymentPage.jsx
│       │   ├── RewardsPage.jsx
│       │   ├── PaymentLinksPage.jsx
│       │   ├── ProfilePage.jsx
│       │   └── admin/
│       │       ├── AdminGateways.jsx
│       │       └── AdminPaymentRules.jsx
│       └── components/
│           └── ChatSupport.jsx
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── PAYMENT_FLOWS.md
│   └── SCREENS_LIST.md
└── memory/
    └── PRD.md
```

## Status: PRODUCTION READY (Demo Mode)
All features implemented. To go fully live:
1. Replace demo API keys with production keys
2. Configure WhatsApp Business number
3. Set up Tawk.to for live chat
4. Enable Twilio for real SMS
