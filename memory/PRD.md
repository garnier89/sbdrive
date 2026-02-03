# SBPAYGO - Product Requirements Document

## Project Overview
**Name:** SBPAYGO  
**Website:** sbpaygo.com  
**Type:** Fintech Super App (Mobile Money, Wallet, Cards, Agent Network)  
**Created:** December 2025  
**Last Updated:** February 2026 (Global Rebrand to SBPAYGO)  
**Stack:** React + FastAPI + MongoDB  
**Preview URL:** https://fintech-africa-8.preview.emergentagent.com

## SBPAYGO Ecosystem
| Component | Name |
|-----------|------|
| Application | SBPAYGO |
| Wallet | SBPAYGO Wallet |
| Cartes virtuelles | SBPAYGO Cards |
| Partenaires/Agents | SBPAYGO Partners |
| Administration | SBPAYGO Admin Panel |
| Super Admin | SBPAYGO Super Administrator |
| Coffre-fort | SBPAYGO Coffre-fort |

## Features Summary

### ✅ COMPLETED FEATURES

#### Core Payment Features
- [x] Multi-currency wallets (12 currencies: EUR, USD, XOF, etc.)
- [x] P2P transfers between users (by email)
- [x] **P2P transfers via phone number**
- [x] Bank transfers
- [x] Deposits (Stripe REAL, PayPal/MM DEMO)
- [x] Withdrawals
- [x] Transaction history with PDF receipts
- [x] Exchange rate conversion

#### 🏪 Réseau Partenaires/Agents (NEW - Feb 2026)
- [x] **Inscription Partenaire**
  - Formulaire complet: business name, owner name, email, phone, address
  - Génération de code partenaire unique (AG-XXXXXXXX)
  - Statut initial: "pending" (en attente de validation)
  - Page: /partner/register
- [x] **Connexion Partenaire**
  - Authentification séparée des utilisateurs standard
  - Token JWT avec flag "is_partner"
  - Page: /partner/login
- [x] **Dashboard Partenaire**
  - Solde agent, retraits du jour, montant du jour
  - Limite journalière avec reste disponible
  - Liste des retraits récents
  - Page: /partner/dashboard
- [x] **Flux de Retrait Cash**
  - Recherche client par téléphone, email ou ID utilisateur
  - Envoi OTP au client (DEMO: code retourné dans la réponse)
  - Confirmation avec code OTP à 6 chiffres
  - Débit automatique du wallet client
  - Crédit automatique du wallet partenaire
  - Historique des transactions
- [x] **Administration des Partenaires**
  - Liste avec statistiques (pending, active, suspended)
  - Filtres par statut
  - Recherche par nom, email, code partenaire
  - Activation/Suspension/Rejet des partenaires
  - Modification des limites journalières
  - Page: /admin/partners
- [x] **Page Retrait Cash Utilisateur**
  - Génération de QR code pour retrait
  - Affichage du téléphone/email pour identification
  - Instructions étape par étape
  - Page: /cash-withdrawal

#### 📱 Boutons Téléchargement Mobile (NEW - Feb 2026)
- [x] **Landing Page**
  - Boutons stylisés Google Play et App Store
  - Liens vers les stores (à configurer avec vrais IDs)
  - Message "Applications mobiles bientôt disponibles"
- [x] **Footer**
  - Boutons de téléchargement dans la section Télécharger

#### 📋 Amélioration KYC (NEW - Feb 2026)
- [x] **Message informatif**
  - "Pour augmenter votre plafond, vous devez ajouter votre pièce d'identité"
  - "Votre nom ne peut pas être modifié après l'inscription"
  - "Veuillez également saisir votre date de naissance"
- [x] **Champ date de naissance**
  - Ajouté dans la section Documents KYC
  - Limite d'âge minimum (18 ans)
  - Sauvegarde du profil

#### 📄 Reçus PDF & Améliorations UX (Feb 2026)
- [x] **Reçus PDF téléchargeables**
  - Génération PDF professionnelle via ReportLab
  - Design avec logo, couleurs, statuts
  - Téléchargement depuis l'historique
  - API: GET /api/receipts/transaction/{id}
- [x] **Mode Sombre**
  - Toggle dans la sidebar (icône lune/soleil)
  - Persistence en localStorage
  - Styles dark: adaptés sur tous composants
- [x] **Dashboard enrichi avec graphiques**
  - Graphique d'activité mensuelle (AreaChart)
  - Répartition des dépenses par catégorie (PieChart)
  - Utilise Recharts

#### 🔑 Connexion Rapide par PIN (Feb 2026)
- [x] **Configuration du PIN**
  - PIN 4-6 chiffres personnalisé
  - Vérification du mot de passe actuel requise
  - Device token sécurisé généré (valide 30 jours)
  - Hashage SHA256 avec salt
- [x] **Connexion rapide**
  - Page /quick-login dédiée
  - Affichage du nom utilisateur masqué
  - Saisie PIN avec indicateur visuel (dots)
  - Verrouillage après 5 tentatives (30 min)
- [x] **Gestion dans Paramètres**
  - Section dédiée dans /settings
  - Modifier le PIN (avec vérification PIN actuel)
  - Désactiver le PIN
  - Statut et dernière utilisation visibles
- [x] **Intégration Login Page**
  - Bouton "Connexion rapide avec PIN" si device configuré
  - Navigation fluide vers /quick-login

#### 💳 Cartes Virtuelles
- [x] **Création de cartes virtuelles**
  - Génération instantanée VISA/Mastercard
  - Numéro, CVV, expiration (affichés une seule fois)
  - Choix de devise et limites personnalisables
- [x] **🎨 Couleurs personnalisées (NEW)**
  - 8 couleurs disponibles : Bleu, Rouge, Vert, Violet, Orange, Noir, Or, Turquoise
  - Différenciation des cartes par usage (Shopping, Netflix, Personnel...)
  - Nom de carte personnalisable
- [x] **Paiements simulés (Mode DEMO)**
  - Paiements en ligne
  - Paiements sans contact (NFC)
- [x] **Gestion complète**
  - Bloquer/Débloquer instantanément
  - Modifier les limites (journalière, par transaction)
  - Activer/Désactiver paiements en ligne ou sans contact
  - Historique des transactions par carte
  - Supprimer la carte
- [x] **Sécurité**
  - Limites basées sur statut KYC
  - Numéro masqué après création (**** 7140)
  - OTP pour transactions élevées (prévu)

#### 🔔 Notifications par Zone/Pays (Admin)
- [x] **Ciblage géographique**
  - 10 pays africains (SN, CI, ML, BF, BJ, TG, CM, GH, NG) + France
  - Zones/villes par pays
  - Types d'utilisateurs (standard, commerçant, premium)
- [x] **Multi-canaux (Mode DEMO)**
  - Push App (actif)
  - SMS, Email, WhatsApp (simulés)
- [x] **Gestion des campagnes**
  - Envoi immédiat ou programmé
  - Priorités (basse, normale, haute, urgente)
  - Lien personnalisé
- [x] **Statistiques**
  - Total campagnes, envoyées, programmées
  - Utilisateurs atteints
  - Historique avec détails

#### 🔐 Coffre-Fort SBPAYGO (NEW)
- [x] **Sécurisation de l'argent**
  - Coffre-fort séparé du wallet principal
  - PIN à 6 chiffres obligatoire
  - Hashage SHA256 du PIN
- [x] **Opérations**
  - Dépôt depuis wallet vers coffre-fort
  - Retrait du coffre-fort vers wallet
  - Historique des transactions
- [x] **Limites basées sur KYC**
  - Unverified: max 500K, retrait/jour 50K
  - Pending: max 2M, retrait/jour 200K
  - Verified: max 50M, retrait/jour 5M
- [x] **Sécurité**
  - Verrouillage après 5 tentatives PIN échouées
  - Délai de 30 minutes avant déblocage
  - Notifications à chaque opération

#### 📨 Centre d'Aide / Contact (NEW)
- [x] **Création de tickets**
  - 6 catégories (technique, transaction, compte, sécurité, suggestion, autre)
  - 4 niveaux de priorité
  - Suivi par numéro de ticket (TKT-XXXXXXXX)
- [x] **Conversation**
  - Messages utilisateur <-> support
  - Historique complet
- [x] **Gestion Admin**
  - Liste tous les tickets
  - Filtres (statut, priorité, recherche)
  - Changer statut (ouvert, en cours, résolu, fermé)
  - Répondre aux tickets
- [x] **Notifications**
  - Confirmation création ticket
  - Notification nouvelle réponse

#### 📱 Transferts entre Utilisateurs SBPAYGO
- [x] **Recherche par numéro de téléphone**
  - Validation utilisateur SBPAYGO
  - Nom masqué pour confidentialité (Test U.)
  - Numéro masqué (***4567)
- [x] **Transferts P2P gratuits**
  - 0% frais entre utilisateurs
  - Instantané
  - Multi-devises (XOF, EUR, USD)
- [x] **Sécurité renforcée**
  - OTP SMS pour montants > 100,000 XOF
  - Limites journalières par statut KYC
  - Max 500,000 XOF par transaction
- [x] **Contacts récents**
  - Historique des destinataires
  - Sélection rapide
- [x] **Historique P2P**
  - Transferts envoyés/reçus
  - Direction (sent/received)

#### 🔁 Système de Remboursements (NEW)
- [x] **Récupération automatique des fonds**
  - Remboursement automatique si < 50,000 XOF et raison éligible
  - Raisons auto-éligibles: erreur destinataire, montant incorrect, doublon
- [x] **Demande de remboursement**
  - Délai de réclamation: 48h (configurable)
  - 6 raisons prédéfinies
  - Validation admin pour gros montants
- [x] **Interface utilisateur**
  - Vérification éligibilité avant demande
  - Temps restant affiché
  - Historique des demandes
  - Annulation possible si en attente
- [x] **Administration**
  - Liste toutes les demandes
  - Stats (pending, approved, rejected)
  - Approuver/Rejeter avec note
- [x] **Notifications**
  - Alertes à chaque étape
  - Notification admin pour nouvelles demandes

#### 🌍 Module Afrique
- [x] **Transferts Mobile Money Inter-opérateurs**
  - Wave ↔ Orange Money ↔ MTN MoMo ↔ Moov Money
  - Calcul des frais en temps réel
  - Support multi-pays (SN, CI, ML, BF, BJ, TG, CM)
- [x] **Recharge Crédit Téléphonique**
  - Orange, Free, MTN, Moov, Expresso
  - Montants rapides et personnalisés
  - Préfixes téléphoniques par pays
- [x] **Paiement de Factures**
  - Électricité (SENELEC, CIE)
  - Eau (SDE, SODECI)
  - Internet/TV (Canal+, Orange Fibre)
- [x] **Gestion des Bénéficiaires**
  - Contacts favoris
  - Historique par bénéficiaire
- [x] **Transferts Programmés**
  - Récurrents (quotidien, hebdomadaire, mensuel)
  - Planification future
- [x] **Gestion des Litiges**
  - Signalement de transactions
  - Suivi des réclamations

#### 🔐 Module Sécurité & Gestion Avancée
- [x] **Approbation des Cartes Bancaires**
  - Workflow: pending → active/rejected/blocked
  - Notification utilisateur lors de l'ajout
  - Page admin pour approuver/refuser
  - Détection IP, pays, tentatives suspectes
- [x] **CMS (Content Management System)**
  - Gestion textes, images, tarifs
  - Support multi-langue (FR, EN, AR)
  - Catégories: Général, Légal, Marketing, Frais, Erreurs
  - Interface admin complète
- [x] **Super Admin & RBAC**
  - Hiérarchie: Super Admin → Admin → Support → User
  - Gestion des administrateurs (créer, modifier, supprimer)
  - Permissions personnalisables par module
  - Logs de toutes les actions admin

#### 🛡️ Super Admin Panel (NEW - Feb 2026)
- [x] **Gestion complète des Utilisateurs**
  - Liste avec recherche (nom, email, téléphone)
  - Modification profil utilisateur
  - Opérations wallet (crédit/débit)
  - Visualisation documents KYC
  - Historique d'activité
  - Activation/Suspension compte
  - Suppression utilisateur
- [x] **Gestion complète des Partenaires/Agents**
  - Liste avec recherche (nom, code, email)
  - Création de nouveaux agents
  - Ajustement des plafonds (journalier, mensuel, par transaction)
  - Visualisation localisation
  - Activation/Suspension compte
  - Suppression partenaire
- [x] **Opérations Financières Admin**
  - Créditer wallet utilisateur ou partenaire
  - Débiter wallet utilisateur ou partenaire
  - Multi-devises (XOF, EUR, USD)
  - Raison/commentaire obligatoire
  - Logs d'audit
- [x] **Statistiques temps réel**
  - Compteur utilisateurs
  - Compteur partenaires
  - Comptes actifs
  - Demandes en attente
- [x] **Page**: /admin/super

#### 📊 Module Analytics & KPIs (NEW)
- [x] **Dashboard Analytics**
  - KPIs en temps réel (Volume, Revenus, Transactions)
  - Filtres par période (jour, semaine, mois, année)
  - Comparaison avec période précédente
  - Indicateurs de croissance
- [x] **Revenus par Source**
  - Répartition par type de transaction
  - Pourcentages et volumes
  - Barres de progression
- [x] **Top Utilisateurs**
  - Classement par volume
  - Statistiques par utilisateur
- [x] **Stats Mobile Money**
  - Par corridor (Wave → Orange, etc.)
  - Par opérateur source
- [x] **Répartition Géographique**
  - Utilisateurs par pays
  - Transferts par destination

#### 🔔 Module Alertes & Seuils (NEW)
- [x] **Seuils d'alerte configurables**
  - Volume journalier (info à 10M, warning à 50M XOF)
  - Transactions suspectes (critical)
  - Échecs de transactions (warning)
  - Nouveaux utilisateurs (objectif success)
  - Cartes en attente > 24h
  - Transaction unitaire élevée
- [x] **Notifications dashboard**
  - Liste des alertes déclenchées
  - Marquer comme lu/non lu
  - Filtrage par statut
- [x] **Configuration notifications**
  - Email, SMS, Dashboard
  - Activer/Désactiver par seuil
- [x] **Métriques en temps réel**
  - Affichage des valeurs actuelles
  - Vérification manuelle

#### 🔑 RBAC Avancé (Permissions Détaillées)
- [x] **45+ permissions granulaires**
  - Utilisateurs (voir, créer, modifier, supprimer, bloquer)
  - Transactions (voir, valider, rejeter, rembourser)
  - Wallet (voir, créditer, débiter, limites)
  - Passerelles (voir, configurer, activer)
  - Mobile Money (voir, gérer, opérateurs)
  - Banques, Devises, Zones
  - CMS, KYC, Cartes, Liens paiement
  - Logs, Analytics, Alertes
  - Administration (admins, rôles)
  - Système (paramètres, suspension)
- [x] **Catalogue permissions par catégorie**
- [x] **Attribution dynamique par admin**

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
- [x] WhatsApp link in footer contact section
- [x] Tawk.to integration ready
- [x] Support settings admin

#### Internationalization
- [x] 8 languages supported
- [x] 17 geographic zones
- [x] Zone-specific payment methods

### Database Collections (40+)
users, wallets, cards, bank_accounts, banks, mobile_money_accounts, mobile_money_providers, transactions, currencies, languages, zones, zone_payment_methods, documents, admin_logs, exchange_rates, payment_transactions, payment_gateways, payment_links, qr_payments, rewards, rewards_history, app_settings, **mobile_money_transfers**, **airtime_topups**, **bill_payments**, **beneficiaries**, **scheduled_transfers**, **disputes**, **fee_configurations**, **transaction_limits**, **p2p_transfers**, **pending_p2p_transfers**, **virtual_cards**, **card_transactions**, **card_activity_logs**, **notifications_campaigns**, **notification_logs**, **vaults**, **vault_transactions**, **vault_activity_logs**, **support_tickets**, **admin_notifications**, **quick_logins**, **security_logs**

## Test Credentials
- **Admin:** admin@sbpaygo.com / adminpassword
- **User:** user@sbpaygo.com / userpassword (vault PIN: 123456, Quick PIN: 1234)
- **User 2:** test@sbpaygo.com / testpassword (phone: +221771234567)

## API Endpoints (120+)
See /app/docs/API_REFERENCE.md for complete list

### Quick PIN Login APIs (NEW - Feb 2026)
- `GET /api/auth/quick-pin/status` - Statut du PIN (activé, expiration, dernière utilisation)
- `POST /api/auth/quick-pin/setup` - Configurer PIN (nécessite auth + password)
- `POST /api/auth/quick-pin/login` - Connexion avec device_token + PIN
- `POST /api/auth/quick-pin/check-device` - Vérifier validité du device token
- `POST /api/auth/quick-pin/change` - Modifier PIN (avec PIN actuel)
- `POST /api/auth/quick-pin/disable` - Désactiver PIN

### Vault APIs
- `GET /api/vault/balance` - Solde et limites du coffre-fort
- `POST /api/vault/set-pin` - Définir/modifier PIN
- `POST /api/vault/verify-pin` - Vérifier PIN
- `POST /api/vault/deposit` - Déposer depuis wallet
- `POST /api/vault/withdraw` - Retirer vers wallet
- `GET /api/vault/transactions` - Historique transactions coffre-fort

### Contact/Support APIs (NEW)
- `GET /api/contact/categories` - Catégories et priorités
- `POST /api/contact/submit` - Créer ticket
- `GET /api/contact/tickets` - Mes tickets (utilisateur)
- `GET /api/contact/tickets/{id}` - Détails ticket
- `POST /api/contact/tickets/{id}/reply` - Répondre au ticket
- `GET /api/contact/admin/tickets` - Tous les tickets (admin)
- `GET /api/contact/admin/tickets/{id}` - Détails ticket (admin)
- `POST /api/contact/admin/tickets/{id}/reply` - Réponse admin
- `PUT /api/contact/admin/tickets/{id}/status` - Changer statut

### Virtual Cards APIs
- `POST /api/virtual-card/create` - Créer une carte virtuelle
- `GET /api/virtual-card/list` - Lister les cartes
- `GET /api/virtual-card/{id}` - Détails d'une carte
- `POST /api/virtual-card/block` - Bloquer/Débloquer carte
- `POST /api/virtual-card/limit` - Modifier limites
- `POST /api/virtual-card/simulate-payment` - Simuler paiement (DEMO)
- `POST /api/virtual-card/toggle-feature/{id}` - Activer/désactiver features
- `GET /api/virtual-card/transactions/{id}` - Historique transactions carte
- `DELETE /api/virtual-card/{id}` - Supprimer carte

### Notifications Zone APIs (NEW - Admin)
- `GET /api/notifications/zones` - Liste pays/zones disponibles
- `GET /api/notifications/filter-users` - Filtrer utilisateurs par zone
- `POST /api/notifications/send` - Envoyer notification ciblée
- `GET /api/notifications/history` - Historique campagnes
- `GET /api/notifications/stats/overview` - Statistiques
- `GET /api/notifications/{id}` - Détails notification
- `POST /api/notifications/cancel/{id}` - Annuler notification programmée

### P2P User Transfer APIs
- `GET /api/wallet/users/lookup-phone` - Recherche utilisateur par téléphone
- `POST /api/wallet/transfer-phone` - Créer un transfert P2P
- `POST /api/wallet/transfer-phone/verify` - Vérifier OTP et compléter transfert
- `GET /api/wallet/transfer-phone/history` - Historique des transferts P2P
- `GET /api/wallet/transfer-phone/contacts` - Contacts récents

### New Africa Module APIs
- `GET /api/africa/mobile-money/operators` - Get MM operators by country
- `GET /api/africa/mobile-money/fees` - Calculate transfer fees
- `POST /api/africa/mobile-money/transfer` - Cross-network transfer
- `GET /api/africa/airtime/operators` - Get telecom operators
- `POST /api/africa/airtime/topup` - Buy airtime
- `GET /api/africa/bills/providers` - Get bill providers
- `POST /api/africa/bills/pay` - Pay a bill
- `POST /api/africa/beneficiaries` - Add beneficiary
- `POST /api/africa/scheduled-transfers` - Create scheduled transfer
- `POST /api/africa/disputes` - Report a dispute
- `GET /api/africa/limits` - Get user limits

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
│   ├── routes/
│   │   ├── wallet_transfers.py (P2P transfers)
│   │   ├── virtual_cards.py (Virtual cards)
│   │   ├── notifications_zone.py (Admin notifications)
│   │   ├── vault.py (Coffre-fort)
│   │   ├── contact.py (Support tickets)
│   │   ├── quick_login.py (NEW - Quick PIN Login)
│   │   ├── africa_module.py
│   │   ├── admin_advanced.py
│   │   ├── analytics.py
│   │   └── alerts.py
│   └── services/db_init.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── UserTransferPage.jsx (P2P transfers)
│       │   ├── VirtualCardsPage.jsx (Virtual cards)
│       │   ├── VaultPage.jsx (Coffre-fort)
│       │   ├── HelpCenterPage.jsx (Centre d'aide)
│       │   ├── QuickPinLoginPage.jsx (NEW - Connexion PIN)
│       │   ├── SettingsPage.jsx (Updated - Section Quick PIN)
│       │   ├── LoginPage.jsx (Updated - Bouton Quick PIN)
│       │   ├── QRPaymentPage.jsx
│       │   ├── RewardsPage.jsx
│       │   ├── PaymentLinksPage.jsx
│       │   ├── ProfilePage.jsx
│       │   └── admin/
│       │       ├── AdminNotificationsPage.jsx
│       │       ├── AdminTicketsPage.jsx (Gestion tickets)
│       │       ├── AdminAnalyticsPage.jsx
│       │       ├── AdminAlertsPage.jsx
│       │       └── ...
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
