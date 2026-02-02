# SB Pay - Product Requirements Document

## Project Overview
**Name:** SB Pay  
**Type:** Online Payment System (PayPal-like)  
**Created:** December 2025  
**Last Updated:** February 2026  
**Stack:** React + FastAPI + MongoDB  
**Preview URL:** https://paynow-52.preview.emergentagent.com

## Original Problem Statement
Générer un système de paiement en ligne tel que PayPal tout le système complet le nom c'est SB Pay avec une application et le site internet, une application complète avec les accès administrateur et les accès clients, fond de couleur orange mat avec le logo SB qui est téléchargé, plus les balises de téléchargement play store et apple store.

## User Personas
1. **Client Standard** - Utilisateurs souhaitant envoyer/recevoir de l'argent et payer des factures
2. **Administrateur** - Gestionnaires de la plateforme avec accès complet aux outils de gestion

## Core Requirements

### Authentication & Security
- [x] JWT-based authentication
- [x] User registration with email validation
- [x] Admin/User role separation
- [x] 2FA setup flow (ready for Twilio integration)

### Multi-Currency & Wallets
- [x] Multi-currency wallets (EUR, USD, XOF, GBP, MAD, NGN)
- [x] Real-time balance display
- [x] Exchange rate conversion (static rates - ready for live API)

### Payments & Transfers
- [x] P2P transfers between users
- [x] Stripe deposits (DEMO MODE)
- [x] PayPal deposits (DEMO MODE)
- [x] Mobile Money deposits (Orange, MTN, Wave, Moov) (DEMO MODE)
- [x] Bank transfers
- [x] Withdrawals
- [x] Bill payments

### Admin Features
- [x] Admin Dashboard with statistics
- [x] User management (activate/deactivate)
- [x] Transaction monitoring
- [x] KYC document management
- [x] Geographic zone configuration

### Internationalization
- [x] Multi-language support (FR, EN, ES, PT, AR, DE, ZH)
- [x] Language selector in settings

## What's Been Implemented

### Phase 1 - MVP (December 2025) - COMPLETE
- Basic authentication (JWT)
- Multi-currency wallets (EUR, USD, XOF)
- P2P transfers
- Transaction history
- User dashboard
- Admin dashboard (basic)

### Phase 2 - Extended Features (February 2026) - COMPLETE (DEMO MODE)
- PayPal integration (simulated)
- Mobile Money providers (Orange, MTN, Wave, Moov - simulated)
- Bank account linking
- KYC document system
- Admin zones configuration
- Multi-language framework (7 languages)
- 2FA setup flow (simulated)
- Admin credit/debit accounts
- Enhanced admin dashboard with volume statistics

## Current Status: MIXED MODE
**REAL integrations:**
- ✅ Stripe payments - REAL checkout with test key (sk_test_emergent)
- ✅ Stripe webhooks - Implemented for payment confirmations

**DEMO/Simulated integrations:**
- PayPal - auto-capture simulation (needs API keys)
- Mobile Money - auto-confirm simulation (needs Flutterwave/Paydunya)
- Twilio SMS (2FA) - logs to database instead of sending
- Exchange rates - static rates in code

## Tech Architecture
```
Frontend (React) --> FastAPI Backend --> MongoDB
    |                    |
    |                    ├── Stripe (DEMO)
    |                    ├── PayPal (DEMO)
    |                    ├── Mobile Money (DEMO)
    |                    └── Twilio SMS (DEMO)
    |
    └── Multi-language (i18n)
```

## API Endpoints

### Auth
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user
- `/api/auth/verify-2fa` - Verify 2FA code

### Wallets & Transactions
- `/api/wallets` - Get user wallets
- `/api/transactions` - Get transaction history
- `/api/transfers` - Create P2P transfer
- `/api/bank-transfers` - Create bank transfer

### Deposits
- `/api/deposit/stripe/checkout` - Create Stripe checkout
- `/api/deposit/paypal` - Create PayPal deposit
- `/api/deposit/mobile-money` - Create Mobile Money deposit

### Bank Accounts
- `/api/bank-accounts` - CRUD for linked bank accounts
- `/api/banks` - Get available banks list

### Admin
- `/api/admin/stats` - Dashboard statistics
- `/api/admin/users` - User management
- `/api/admin/transactions` - All transactions
- `/api/admin/documents` - KYC documents
- `/api/admin/zones` - Geographic zones
- `/api/admin/credit` - Credit user account
- `/api/admin/debit` - Debit user account

## Test Credentials
- **Admin:** admin@sbpay.com / adminpassword
- **User:** user@sbpay.com / userpassword

## Prioritized Backlog

### P0 (Critical) - Requires User API Keys
1. ~~**Activate Live Stripe Integration**~~ ✅ DONE - Using test key
2. **Activate Live PayPal Integration** - User needs to provide PayPal API keys
3. **Activate Live Mobile Money** - Recommend Flutterwave/Paydunya aggregator
4. **Activate Live Twilio SMS** - User needs to provide Twilio credentials
5. **Exchange Rate API** - Integrate live currency rates (ExchangeRate-API, Fixer)

### P1 (Important)
- Push notifications for transaction confirmations
- Email notifications (Resend/SendGrid)
- PDF receipt generation

### P2 (Nice to Have)
- QR code payments
- User rewards/loyalty system
- Contact list for transfers
- Recurring payments

### Technical Debt
- Refactor backend/server.py (~1900 lines) into modules:
  - routes/auth.py
  - routes/wallets.py
  - routes/admin.py
  - models/
  - services/

## Files Reference
- `/app/backend/server.py` - Main backend (monolithic)
- `/app/frontend/src/App.js` - React router and contexts
- `/app/frontend/src/pages/admin/*` - Admin pages
- `/app/frontend/src/components/DashboardLayout.jsx` - Main layout
- `/app/frontend/src/i18n/translations.js` - Language files
- `/app/docs/DATABASE_SCHEMA.md` - Database documentation
- `/app/docs/SCREENS_LIST.md` - UI screens documentation

## Test Reports
- `/app/test_reports/iteration_2.json` - Latest test results (100% pass rate)
- `/app/backend/tests/test_sbpay_api.py` - API test suite
