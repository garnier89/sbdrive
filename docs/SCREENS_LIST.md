# 🖥️ SB Pay - Liste des Écrans de l'Application

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SB PAY - STRUCTURE DES ÉCRANS                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PAGES PUBLIQUES              ESPACE UTILISATEUR          ESPACE ADMIN      │
│  ──────────────               ──────────────────          ────────────      │
│  • Landing Page               • Dashboard                 • Dashboard Admin │
│  • Connexion                  • Transfert                 • Utilisateurs    │
│  • Inscription                • Dépôt                     • Transactions    │
│                               • Retrait                   • Documents KYC   │
│                               • Comptes Bancaires         • Zones           │
│                               • Factures                  • Logs Admin      │
│                               • Historique                                   │
│                               • Profil                                       │
│                               • Paramètres                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌐 PAGES PUBLIQUES

### 1. Landing Page (`/`)

**Objectif:** Présenter SB Pay et convertir les visiteurs

**Éléments:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo SB] SB Pay          [Fonctionnalités] [À propos] [Login] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L'ARGENT SE DÉPLACE. RAPIDEMENT.                              │
│                                                                 │
│  [Image Hero - Paiement Mobile]                                │
│                                                                 │
│  [🍎 App Store]  [▶️ Google Play]                              │
│                                                                 │
│  [Créer un compte]  [Se connecter]                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  STATISTIQUES                                                   │
│  500K+ Utilisateurs | 50M€ Transactions | 150+ Pays            │
├─────────────────────────────────────────────────────────────────┤
│  FONCTIONNALITÉS                                                │
│  [💸 Transferts]  [🔒 Sécurité]  [🌍 Multi-devises]  [💳 Factures]│
├─────────────────────────────────────────────────────────────────┤
│  Footer: Liens | Téléchargement | Contact                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Page de Connexion (`/login`)

**Éléments:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  [Logo SB Pay]                    │    ZONE DÉCORATIVE          │
│                                   │    Gradient Orange          │
│  ┌─────────────────────────────┐  │    "Gérez votre argent      │
│  │      CONNEXION              │  │     en toute simplicité"    │
│  │                             │  │                             │
│  │  Email: [____________]      │  │                             │
│  │                             │  │                             │
│  │  Mot de passe: [________]   │  │                             │
│  │                [👁️]         │  │                             │
│  │                             │  │                             │
│  │  [    SE CONNECTER    ]     │  │                             │
│  │                             │  │                             │
│  │  Pas de compte? [Créer]     │  │                             │
│  └─────────────────────────────┘  │                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**États:**
- Formulaire vide
- Erreur de connexion
- 2FA requis (affiche champ OTP)

---

### 3. Page d'Inscription (`/register`)

**Éléments:**
```
┌──────────────────────────────────────────────────────────────────┐
│  ZONE DÉCORATIVE              │                                  │
│  "Rejoignez SB Pay"           │  [Logo SB Pay]                   │
│                               │                                  │
│                               │  ┌─────────────────────────────┐ │
│                               │  │    CRÉER UN COMPTE          │ │
│                               │  │                             │ │
│                               │  │  Nom complet: [__________]  │ │
│                               │  │  Email: [__________]        │ │
│                               │  │  Téléphone: [__________]    │ │
│                               │  │  Mot de passe: [________]   │ │
│                               │  │  Confirmer: [__________]    │ │
│                               │  │                             │ │
│                               │  │  Langue: [🇫🇷 Français ▼]   │ │
│                               │  │                             │ │
│                               │  │  [   CRÉER MON COMPTE   ]   │ │
│                               │  │                             │ │
│                               │  │  Déjà inscrit? [Connexion]  │ │
│                               │  └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 👤 ESPACE UTILISATEUR

### 4. Dashboard (`/dashboard`)

**Objectif:** Vue d'ensemble du compte

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Sidebar]          │  TABLEAU DE BORD                                  │
│                     │                                                    │
│  🏠 Dashboard       │  Bonjour, Jean 👋                                 │
│  📤 Transfert       │                                                    │
│  📥 Dépôt           │  ┌─────────────────────────────────────────────┐  │
│  📤 Retrait         │  │  SOLDE TOTAL (EUR)                          │  │
│  🏦 Comptes         │  │       1,234.56 €                  [💰]      │  │
│  📄 Factures        │  │                          Gradient Orange    │  │
│  📋 Historique      │  └─────────────────────────────────────────────┘  │
│  ⚙️ Paramètres      │                                                    │
│                     │  ACTIONS RAPIDES                                   │
│  ─────────────      │  [📤 Envoyer] [📥 Dépôt] [📤 Retrait] [📄 Factures]│
│  👑 Admin           │                                                    │
│  (si admin)         │  MES PORTEFEUILLES                                │
│                     │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  ─────────────      │  │ EUR     │ │ USD     │ │ XOF     │              │
│  [Photo]            │  │ 800.00€ │ │ $234.56 │ │ 50,000  │              │
│  Jean Dupont        │  └─────────┘ └─────────┘ └─────────┘              │
│  jean@email.com     │                                                    │
│  [Déconnexion]      │  TRANSACTIONS RÉCENTES                            │
│                     │  ┌─────────────────────────────────────────────┐  │
│                     │  │ ↗️ Envoyé à marie@... | -50€ | Complété     │  │
│                     │  │ ↙️ Reçu de paul@...  | +100€ | Complété     │  │
│                     │  │ 📄 Facture électricité | -45€ | Complété    │  │
│                     │  │                    [Voir tout →]            │  │
│                     │  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Transfert d'Argent (`/transfer`)

**Processus en 3 étapes:**

```
ÉTAPE 1 - DÉTAILS                 ÉTAPE 2 - CONFIRMATION        ÉTAPE 3 - SUCCÈS
┌─────────────────────┐           ┌─────────────────────┐       ┌─────────────────────┐
│                     │           │                     │       │                     │
│  Email destinataire │           │  RÉCAPITULATIF      │       │      ✅             │
│  [_________________]│           │                     │       │                     │
│                     │           │  À: marie@email.com │       │  TRANSFERT RÉUSSI!  │
│  Montant   Devise   │           │  Montant: 100 EUR   │       │                     │
│  [_____]  [EUR ▼]   │           │  Description: ...   │       │  100 EUR envoyé à   │
│                     │           │                     │       │  marie@email.com    │
│  Solde: 800.00 EUR  │           │  ┌───────────────┐  │       │                     │
│                     │           │  │  [Retour]     │  │       │  [Nouveau transfert]│
│  Description        │           │  │  [Confirmer ✓]│  │       │                     │
│  [_________________]│           │  └───────────────┘  │       │                     │
│                     │           │                     │       │                     │
│  [Continuer →]      │           │                     │       │                     │
└─────────────────────┘           └─────────────────────┘       └─────────────────────┘
```

---

### 6. Dépôt (`/deposit`)

**3 onglets de paiement:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  APPROVISIONNER MON COMPTE                                              │
│                                                                         │
│  [💳 Carte]    [🅿️ PayPal]    [📱 Mobile Money]                        │
│  ═══════════                                                            │
│                                                                         │
│  ┌─── ONGLET CARTE ───────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Devise: [EUR ▼]                                                   ││
│  │                                                                    ││
│  │  Montant:                                                          ││
│  │  [10€] [25€] [50€] [100€] [Autre]                                 ││
│  │                                                                    ││
│  │  ┌─────────────────────────────────────────┐                      ││
│  │  │  Montant à déposer: 50.00 €             │                      ││
│  │  └─────────────────────────────────────────┘                      ││
│  │                                                                    ││
│  │  🔒 Paiement sécurisé via Stripe                                  ││
│  │                                                                    ││
│  │  [       Payer par carte       ]                                  ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─── ONGLET MOBILE MONEY ────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Opérateur:                                                        ││
│  │  [🍊 Orange] [📱 MTN] [🌊 Wave] [💜 Moov]                         ││
│  │                                                                    ││
│  │  Téléphone: [+221 77 123 45 67]                                   ││
│  │  Montant: [5000] CFA                                              ││
│  │                                                                    ││
│  │  [    Payer par Mobile Money    ]                                 ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 7. Comptes Bancaires (`/bank-accounts`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPTES BANCAIRES                            [+ Ajouter un compte]     │
│  Gérez vos comptes bancaires liés                                       │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 🏦 BNP Paribas                    [⭐ Par défaut] [✓ Vérifié]     ││
│  │    Jean Dupont                                                     ││
│  │    FR76 3000 6000 0112 3456 7890 189                              ││
│  │    SWIFT: BNPAFRPP • EUR                                          ││
│  │                                                                    ││
│  │    [📤 Virement]  [⭐]  [🗑️]                                      ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 🏦 CBAO Sénégal                              [⏳ En vérification] ││
│  │    Jean Dupont                                                     ││
│  │    SN08 S001 0001 0000 1234 5678 901                              ││
│  │    SWIFT: CBAOSNDA • XOF                                          ││
│  │                                                                    ││
│  │    [⭐]  [🗑️]                                                     ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ╔══════════════════════════════════════════════════════════════════╗  │
│  ║  DIALOGUE: AJOUTER UN COMPTE                                     ║  │
│  ║                                                                  ║  │
│  ║  Pays de la banque: [France ▼]                                   ║  │
│  ║  Banque: [BNP Paribas ▼]                                         ║  │
│  ║  Titulaire: [________________]                                   ║  │
│  ║  IBAN: [________________________________]                        ║  │
│  ║  SWIFT/BIC: [BNPAFRPP] (auto-rempli)                            ║  │
│  ║                                                                  ║  │
│  ║  [    Ajouter le compte    ]                                     ║  │
│  ╚══════════════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 8. Retrait (`/withdraw`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  RETIRER DES FONDS                                                      │
│  Transférez vers votre compte bancaire                                  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                                                                    ││
│  │  Montant    Devise                                                 ││
│  │  [500]      [EUR ▼]                                                ││
│  │                                                                    ││
│  │  Solde disponible: 800.00 EUR                                      ││
│  │                                                                    ││
│  │  Compte de destination:                                            ││
│  │  [🏦 BNP Paribas - FR76...789 ▼]                                  ││
│  │                                                                    ││
│  │  ⚠️ Frais: 1% • Délai: 1-3 jours ouvrés                           ││
│  │                                                                    ││
│  │  [      Demander le retrait      ]                                ││
│  │                                                                    ││
│  └────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 9. Paiement de Factures (`/bills`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PAIEMENT DE FACTURES                                                   │
│                                                                         │
│  Type de facture:                                                       │
│  [⚡ Électricité] [📱 Téléphone] [🌐 Internet] [💧 Eau] [🏠 Loyer]     │
│  ════════════════                                                       │
│                                                                         │
│  Référence/Contrat: [________________]                                  │
│                                                                         │
│  Montant    Devise                                                      │
│  [45.00]    [EUR ▼]                                                     │
│                                                                         │
│  Solde disponible: 800.00 EUR                                           │
│                                                                         │
│  [        Payer la facture        ]                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 10. Historique des Transactions (`/history`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HISTORIQUE DES TRANSACTIONS                                            │
│                                                                         │
│  [🔍 Rechercher...]              [Type: Tous ▼]                        │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 📤 Envoyé                      │  15 Jan 2025 14:32                ││
│  │    Transfer to marie@email.com │  -100.00 EUR                      ││
│  │    [Envoyé] [Complété]         │  ID: abc123...                    ││
│  ├────────────────────────────────┼───────────────────────────────────┤│
│  │ 📥 Reçu                        │  14 Jan 2025 10:15                ││
│  │    Transfer from paul@email.com│  +250.00 EUR                      ││
│  │    [Reçu] [Complété]           │  ID: def456...                    ││
│  ├────────────────────────────────┼───────────────────────────────────┤│
│  │ 🏦 Virement bancaire           │  13 Jan 2025 09:00                ││
│  │    To BNP Paribas              │  -500.00 EUR                      ││
│  │    [Retrait] [En attente]      │  ID: ghi789...                    ││
│  ├────────────────────────────────┼───────────────────────────────────┤│
│  │ 💳 Dépôt Stripe                │  12 Jan 2025 16:45                ││
│  │    Deposit via credit card     │  +100.00 EUR                      ││
│  │    [Dépôt] [Complété]          │  ID: jkl012...                    ││
│  └────────────────────────────────┴───────────────────────────────────┘│
│                                                                         │
│  Page 1 sur 5                          [← Précédent]  [Suivant →]      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 11. Paramètres (`/settings`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PARAMÈTRES                                                             │
│                                                                         │
│  ┌─── LANGUE ────────────────────────────────────────────────────────┐ │
│  │ 🌍                                                                │ │
│  │                                                                   │ │
│  │  [🇫🇷] [🇬🇧] [🇪🇸] [🇵🇹] [🇸🇦] [🇩🇪] [🇨🇳]                         │ │
│  │                                                                   │ │
│  │  Langue actuelle: [Français ▼]                                    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── AUTHENTIFICATION 2FA ──────────────────────────────────────────┐ │
│  │ 🔐                                           [✓ Activé]           │ │
│  │                                                                   │ │
│  │  Votre compte est protégé par vérification SMS                    │ │
│  │                                                                   │ │
│  │  [    Désactiver 2FA    ]                                        │ │
│  │                                                                   │ │
│  │  ─────── OU SI NON ACTIVÉ ───────                                │ │
│  │                                                                   │ │
│  │  Téléphone: [+33 6 12 34 56 78]                                  │ │
│  │  [    Activer 2FA    ]                                           │ │
│  │                                                                   │ │
│  │  [Code OTP: [______] ]  ← Apparaît après envoi                   │ │
│  │  [    Vérifier    ]                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── MODE DÉMO ─────────────────────────────────────────────────────┐ │
│  │ ⚠️ Mode Démonstration                                             │ │
│  │    SMS et emails simulés. Voir logs serveur.                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 👑 ESPACE ADMINISTRATEUR

### 12. Dashboard Admin (`/admin`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TABLEAU DE BORD ADMIN                                                  │
│                                                                         │
│  ┌─── ALERTES ───────────────────────────────────────────────────────┐ │
│  │ ⚠️ 5 Retraits en attente    │  📄 3 Documents à valider          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── STATISTIQUES ──────────────────────────────────────────────────┐ │
│  │ 👥 1,234        │ ✓ 987          │ 💳 45,678      │ 📈 234       │ │
│  │ Utilisateurs   │ Vérifiés       │ Transactions   │ (24h)        │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── VOLUME PAR DEVISE ─────────────────────────────────────────────┐ │
│  │  EUR: 125,000€  │  USD: $45,000  │  XOF: 5,000,000 CFA           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── ACTIONS ADMIN ─────────────────────────────────────────────────┐ │
│  │ [➕ Créditer]  [➖ Débiter]  [📄 Documents]  [🌍 Zones]           │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─── NAVIGATION RAPIDE ─────────────────────────────────────────────┐ │
│  │ [👥 Gestion Utilisateurs →]  [💳 Toutes les Transactions →]      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 13. Gestion des Utilisateurs (`/admin/users`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  GESTION DES UTILISATEURS                          [+ Créer utilisateur]│
│                                                                         │
│  [🔍 Rechercher par nom ou email...]                                    │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Utilisateur      │ Email           │ Rôle  │ Statut │ KYC  │ ⋮    ││
│  ├──────────────────┼─────────────────┼───────┼────────┼──────┼──────┤│
│  │ 👤 Jean Dupont   │ jean@email.com  │ User  │ ✓ Actif│ ✓    │ [⋮] ││
│  │ 👑 Admin SB      │ admin@sbpay.com │ Admin │ ✓ Actif│ ✓    │ [⋮] ││
│  │ 👤 Marie Martin  │ marie@email.com │ User  │ ✓ Actif│ ⏳   │ [⋮] ││
│  │ 👤 Paul Durand   │ paul@email.com  │ User  │ ❌ Inactif│ ❌  │ [⋮] ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  Menu contextuel [⋮]:                                                   │
│  ├─ ✓ Activer / ❌ Désactiver                                          │
│  ├─ 👑 Promouvoir Admin / Rétrograder                                  │
│  └─ 👁️ Voir détails                                                    │
│                                                                         │
│  Page 1 sur 10                         [← Précédent]  [Suivant →]      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 14. Gestion des Transactions Admin (`/admin/transactions`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TOUTES LES TRANSACTIONS                                                │
│                                                                         │
│  [🔍 Rechercher...]              [Statut: Tous ▼]                       │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Utilisateur   │ Type       │ Montant     │ Statut    │ Date  │ ⋮  ││
│  ├───────────────┼────────────┼─────────────┼───────────┼───────┼────┤│
│  │ Jean Dupont   │ Retrait    │ -500.00 EUR │ ⏳ Attente│ 15/01 │[⋮] ││
│  │ Marie Martin  │ Transfert  │ -100.00 EUR │ ✓ Complété│ 15/01 │    ││
│  │ Paul Durand   │ Dépôt      │ +250.00 EUR │ ✓ Complété│ 14/01 │    ││
│  │ Jean Dupont   │ Virement   │ -1000 EUR   │ ⏳ Attente│ 14/01 │[⋮] ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  Menu contextuel [⋮] (pour retraits/virements en attente):             │
│  ├─ ✓ Approuver                                                        │
│  └─ ❌ Rejeter                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 15. Gestion des Documents KYC (`/admin/documents`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DOCUMENTS KYC                                                          │
│                                                                         │
│  [Statut: En attente ▼]                                                 │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Utilisateur   │ Type           │ Document      │ Statut  │ Actions││
│  ├───────────────┼────────────────┼───────────────┼─────────┼────────┤│
│  │ Jean Dupont   │ Carte d'identité│ id_recto.pdf │ ⏳      │[✓] [❌]││
│  │ Marie Martin  │ Justificatif   │ facture.pdf  │ ⏳      │[✓] [❌]││
│  │ Paul Durand   │ Passeport      │ passport.jpg │ ✓ Approuvé│       ││
│  │ Sophie Petit  │ Relevé bancaire│ releve.pdf   │ ❌ Rejeté│        ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ╔══════════════════════════════════════════════════════════════════╗  │
│  ║  DIALOGUE: REJETER LE DOCUMENT                                   ║  │
│  ║                                                                  ║  │
│  ║  Raison du rejet:                                                ║  │
│  ║  [Document illisible, informations manquantes...              ]  ║  │
│  ║                                                                  ║  │
│  ║  [Annuler]  [Rejeter]                                           ║  │
│  ╚══════════════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 16. Gestion des Zones (`/admin/zones`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ZONES D'ACTIVITÉ                                  [+ Nouvelle Zone]    │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ 📍 Europe de l'Ouest                                    [✏️] [🗑️] ││
│  │    Pays: 🇫🇷 🇩🇪 🇪🇸 🇧🇪 🇳🇱                                       ││
│  │    Devises: EUR                                                   ││
│  │    Paiements: Carte, PayPal, Virement                             ││
│  │    Frais: 1% • Min: 1€ • Max: 10,000€                            ││
│  ├────────────────────────────────────────────────────────────────────┤│
│  │ 📍 Afrique de l'Ouest                                   [✏️] [🗑️] ││
│  │    Pays: 🇸🇳 🇨🇮 🇲🇱 🇧🇫                                          ││
│  │    Devises: XOF, EUR                                              ││
│  │    Paiements: Orange Money, MTN, Wave, Virement                   ││
│  │    Frais: 1.5% • Min: 100 CFA • Max: 5,000,000 CFA               ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ╔══════════════════════════════════════════════════════════════════╗  │
│  ║  DIALOGUE: CRÉER/MODIFIER ZONE                                   ║  │
│  ║                                                                  ║  │
│  ║  Nom: [Afrique de l'Ouest          ]                            ║  │
│  ║                                                                  ║  │
│  ║  Pays: [🇸🇳 SN] [🇨🇮 CI] [🇲🇱 ML] [+ Ajouter]                    ║  │
│  ║  Devises: [XOF] [EUR] [+ Ajouter]                                ║  │
│  ║  Paiements: [Orange] [MTN] [Wave] [+ Ajouter]                    ║  │
│  ║                                                                  ║  │
│  ║  Frais: [1.5]%   Min: [100]   Max: [5000000]                    ║  │
│  ║                                                                  ║  │
│  ║  [    Enregistrer    ]                                          ║  │
│  ╚══════════════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 17. Dialogue Créditer/Débiter

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════════════════════╗  │
│  ║  ➕ CRÉDITER UN COMPTE                                           ║  │
│  ║                                                                  ║  │
│  ║  Utilisateur:                                                    ║  │
│  ║  [Jean Dupont (jean@email.com) ▼]                               ║  │
│  ║                                                                  ║  │
│  ║  Montant:     Devise:                                           ║  │
│  ║  [500.00]     [EUR ▼]                                           ║  │
│  ║                                                                  ║  │
│  ║  Motif (obligatoire):                                           ║  │
│  ║  [Bonus de bienvenue, remboursement...                       ]  ║  │
│  ║                                                                  ║  │
│  ║  [     Créditer le compte     ]                                 ║  │
│  ╚══════════════════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 COMPOSANTS RÉUTILISABLES

### Sidebar Navigation
```
┌────────────────────┐
│ [Logo] SB Pay      │
├────────────────────┤
│ MENU PRINCIPAL     │
│ ○ Dashboard        │
│ ○ Transfert        │
│ ○ Dépôt            │
│ ○ Retrait          │
│ ○ Comptes Bancaires│
│ ○ Factures         │
│ ○ Historique       │
│ ○ Paramètres       │
├────────────────────┤
│ ADMINISTRATION     │
│ ○ Dashboard Admin  │
│ ○ Utilisateurs     │
│ ○ Transactions     │
│ ○ Documents        │
│ ○ Zones            │
├────────────────────┤
│ [Photo]            │
│ Jean Dupont        │
│ jean@email.com     │
│ [Déconnexion]      │
└────────────────────┘
```

### Notifications Toast
```
┌─────────────────────────────┐
│ ✅ Transfert réussi!        │
│ 100 EUR envoyé à marie@...  │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ❌ Erreur                   │
│ Solde insuffisant           │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ⏳ Traitement en cours...   │
│ Veuillez patienter          │
└─────────────────────────────┘
```

---

## 📊 RÉCAPITULATIF

| Section | Nombre d'écrans |
|---------|-----------------|
| Pages Publiques | 3 |
| Espace Utilisateur | 8 |
| Espace Admin | 5 |
| **TOTAL** | **16 écrans** |

### Fonctionnalités Implémentées ✅
- Multi-langues (7 langues)
- Multi-devises (6+ devises)
- Wallets par devise
- Transferts P2P
- Dépôts (Stripe, PayPal, Mobile Money)
- Virements bancaires
- Paiement de factures
- Historique complet
- 2FA par SMS
- KYC documents
- Gestion admin complète
- Zones géographiques configurables
