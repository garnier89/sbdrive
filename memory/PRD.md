# SB Pay - Product Requirements Document

## Project Overview
**Name:** SB Pay  
**Type:** Online Payment System (PayPal-like)  
**Created:** December 2025  
**Stack:** React + FastAPI + MongoDB

## Original Problem Statement
Générer un système de paiement en ligne tel que PayPal tout le système complet le nom c'est SB Pay avec une application et le site internet, une application complète avec les accès administrateur et les accès clients, fond de couleur orange mat avec le logo SB qui est téléchargé, plus les balises de téléchargement play store et apple store.

## User Personas
1. **Client Standard** - Utilisateurs souhaitant envoyer/recevoir de l'argent et payer des factures
2. **Administrateur** - Gestionnaires de la plateforme avec accès complet

## Core Requirements (Static)
- ✅ Système d'authentification JWT
- ✅ Multi-devises (EUR, USD, XOF)
- ✅ Transferts entre utilisateurs
- ✅ Dépôts via Stripe
- ✅ Retraits
- ✅ Paiement de factures
- ✅ Historique des transactions
- ✅ Dashboard Admin
- ✅ Logo SB intégré
- ✅ Badges Play Store / App Store

## What's Been Implemented

### December 2025 - MVP Complete
- **Backend API (FastAPI)**
  - Auth: register, login, me endpoints
  - Wallets: multi-currency (EUR, USD, XOF)
  - Transfers: P2P money transfer
  - Deposits: Stripe checkout integration
  - Withdrawals: withdrawal requests
  - Bills: pay various bill types
  - Transactions: full history
  - Admin: users, transactions, stats

- **Frontend (React)**
  - Landing page with SB logo and store badges
  - Login/Register with JWT
  - Dashboard with wallet overview
  - Transfer wizard (3 steps)
  - Deposit via Stripe
  - Withdrawal form
  - Bill payment (electricity, phone, internet, water, rent)
  - Transaction history with filters
  - Profile page
  - Admin dashboard
  - Admin users management
  - Admin transactions view

- **Design**
  - Orange mat primary color (#E87E04)
  - Manrope font for headings
  - Inter font for body
  - Light theme with Shadcn UI components

## Tech Architecture
```
Frontend (React) --> FastAPI Backend --> MongoDB
                         |
                         v
                   Stripe (Payments)
```

## API Endpoints
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user
- `/api/wallets` - Get user wallets
- `/api/transfers` - Create transfer
- `/api/deposits/checkout` - Create Stripe checkout
- `/api/deposits/status/{session_id}` - Check payment status
- `/api/withdrawals` - Request withdrawal
- `/api/bills/pay` - Pay a bill
- `/api/transactions` - Get transaction history
- `/api/admin/*` - Admin endpoints

## Prioritized Backlog

### P0 (Critical) - ✅ Done
- Authentication system
- Multi-currency wallets
- Money transfers
- Stripe deposits

### P1 (Important) - Future
- PayPal integration (requested but not fully implemented)
- Email notifications
- Mobile app (native iOS/Android)
- 2FA authentication

### P2 (Nice to Have)
- Currency conversion feature
- Recurring payments
- QR code payments
- Contact list for transfers

## Test Credentials
- **Admin:** admin@sbpay.com / Admin123!
- **User:** user@sbpay.com / User123!

## Next Tasks
1. Implement PayPal as additional payment method
2. Add email notifications for transactions
3. Implement 2FA for enhanced security
4. Create mobile-responsive improvements
5. Add PDF receipt generation
