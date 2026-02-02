# SB Pay - Interopérabilité Mobile Money Afrique

## 🎯 Objectif
Permettre les transferts entre différents opérateurs Mobile Money, même sur des réseaux différents.

---

## 📱 Matrice d'Interopérabilité

### Transferts Supportés

| De ↓ / Vers → | Wave | Orange Money | MTN MoMo | Moov Money |
|---------------|------|--------------|----------|------------|
| **Wave** | ✅ | ✅ | ✅ | ✅ |
| **Orange Money** | ✅ | ✅ | ✅ | ✅ |
| **MTN MoMo** | ✅ | ✅ | ✅ | ✅ |
| **Moov Money** | ✅ | ✅ | ✅ | ✅ |

### Couverture par Pays

| Pays | Wave | Orange | MTN | Moov |
|------|------|--------|-----|------|
| 🇸🇳 Sénégal | ✅ | ✅ | ❌ | ❌ |
| 🇨🇮 Côte d'Ivoire | ✅ | ✅ | ✅ | ✅ |
| 🇲🇱 Mali | ✅ | ✅ | ❌ | ✅ |
| 🇧🇫 Burkina Faso | ✅ | ✅ | ❌ | ✅ |
| 🇧🇯 Bénin | ✅ | ❌ | ✅ | ✅ |
| 🇹🇬 Togo | ✅ | ❌ | ❌ | ✅ |
| 🇨🇲 Cameroun | ❌ | ✅ | ✅ | ❌ |
| 🇬🇭 Ghana | ❌ | ❌ | ✅ | ❌ |

---

## 🔁 Flux Technique

### Transfert Cross-Network

```
┌──────────────┐
│  Utilisateur │
│   (App SB)   │
└──────┬───────┘
       │ 1. Initie transfert
       │    - Opérateur source: Wave
       │    - Numéro dest: +225XXXXXXXX
       │    - Opérateur dest: Orange
       │    - Montant: 10,000 XOF
       ▼
┌──────────────┐
│   Backend    │
│   SB Pay     │
└──────┬───────┘
       │ 2. Validation
       │    - Solde suffisant?
       │    - KYC OK?
       │    - Limites respectées?
       │    - Frais calculés
       ▼
┌──────────────┐
│  Passerelle  │
│  (MFS Africa)│
└──────┬───────┘
       │ 3. Routage intelligent
       │    - Détecte opérateurs
       │    - Choisit route optimale
       │    - Initie débit source
       ▼
┌──────────────┐
│   Wave API   │
│  (Opérateur  │
│   source)    │
└──────┬───────┘
       │ 4. Débit compte Wave
       │    - Vérifie PIN/Auth
       │    - Débite 10,000 XOF
       │    - Confirme à MFS
       ▼
┌──────────────┐
│   Réseau     │
│ Interopérable│
│  (Clearing)  │
└──────┬───────┘
       │ 5. Settlement
       │    - Compensation inter-opérateurs
       │    - Conversion si nécessaire
       ▼
┌──────────────┐
│ Orange Money │
│  (Opérateur  │
│   dest)      │
└──────┬───────┘
       │ 6. Crédit compte Orange
       │    - Crédite destinataire
       │    - Envoie SMS confirmation
       ▼
┌──────────────┐
│   Webhook    │
│ Confirmation │
└──────┬───────┘
       │ 7. Notification SB Pay
       │    - Status: SUCCESS
       │    - Ref: TXN123456
       ▼
┌──────────────┐
│   Backend    │
│   SB Pay     │
└──────┬───────┘
       │ 8. Finalisation
       │    - Met à jour transaction
       │    - Notifie utilisateur
       │    - Log admin
       ▼
┌──────────────┐
│  Utilisateur │
│  (Notifié)   │
└──────────────┘
```

---

## 💰 Structure des Frais

### Frais par Corridor

| Corridor | Frais Fixe | % Variable | Min | Max |
|----------|------------|------------|-----|-----|
| Wave → Orange | 100 XOF | 1.0% | 150 XOF | 5,000 XOF |
| Wave → MTN | 100 XOF | 1.0% | 150 XOF | 5,000 XOF |
| Wave → Moov | 100 XOF | 1.2% | 150 XOF | 5,500 XOF |
| Orange → Wave | 100 XOF | 1.0% | 150 XOF | 5,000 XOF |
| Orange → MTN | 150 XOF | 1.2% | 200 XOF | 6,000 XOF |
| Orange → Moov | 150 XOF | 1.2% | 200 XOF | 6,000 XOF |
| MTN → Wave | 100 XOF | 1.0% | 150 XOF | 5,000 XOF |
| MTN → Orange | 150 XOF | 1.2% | 200 XOF | 6,000 XOF |
| MTN → Moov | 150 XOF | 1.5% | 200 XOF | 7,000 XOF |
| Moov → Wave | 100 XOF | 1.2% | 150 XOF | 5,500 XOF |
| Moov → Orange | 150 XOF | 1.2% | 200 XOF | 6,000 XOF |
| Moov → MTN | 150 XOF | 1.5% | 200 XOF | 7,000 XOF |

### Exemple de Calcul
```
Montant: 50,000 XOF
Corridor: Wave → Orange
Frais fixe: 100 XOF
Frais variable: 50,000 × 1% = 500 XOF
Total frais: 600 XOF
Montant reçu: 49,400 XOF
```

---

## 🔌 APIs d'Intégration

### Agrégateurs Recommandés

| Service | Spécialité | Couverture | API Doc |
|---------|------------|------------|---------|
| **MFS Africa** | Interop MM leader | 35+ pays | [docs.mfsafrica.com](https://docs.mfsafrica.com) |
| **Flutterwave** | Multi-services | 34 pays | [developer.flutterwave.com](https://developer.flutterwave.com) |
| **PayDunya** | Afrique Ouest | UEMOA | [paydunya.com/developers](https://paydunya.com/developers) |
| **Thunes** | Cross-border | 130+ pays | [docs.thunes.com](https://docs.thunes.com) |

### Endpoints MFS Africa (Exemple)

```javascript
// Initier transfert
POST /v1/transfers
{
  "source": {
    "type": "mobile_money",
    "operator": "wave",
    "msisdn": "+221771234567",
    "country": "SN"
  },
  "destination": {
    "type": "mobile_money", 
    "operator": "orange_money",
    "msisdn": "+225071234567",
    "country": "CI"
  },
  "amount": {
    "value": 50000,
    "currency": "XOF"
  },
  "reference": "SBPAY-TXN-123456"
}

// Réponse
{
  "id": "mfs-txn-789",
  "status": "pending",
  "created_at": "2025-12-15T10:30:00Z",
  "fees": {
    "value": 600,
    "currency": "XOF"
  }
}

// Webhook confirmation
POST /webhook/mfs-callback
{
  "id": "mfs-txn-789",
  "status": "completed",
  "completed_at": "2025-12-15T10:30:45Z"
}
```

---

## 🔐 Règles de Sécurité

### Vérifications Obligatoires

| Étape | Vérification | Action si échec |
|-------|--------------|-----------------|
| 1 | Authentification utilisateur | Refus 401 |
| 2 | Solde suffisant (montant + frais) | Erreur "Solde insuffisant" |
| 3 | KYC niveau suffisant | Demande documents |
| 4 | Limite quotidienne | Erreur "Limite atteinte" |
| 5 | Limite mensuelle | Erreur "Limite atteinte" |
| 6 | Numéro destinataire valide | Erreur "Numéro invalide" |
| 7 | Pays/opérateur supporté | Erreur "Non disponible" |
| 8 | Anti-fraude (velocity) | Blocage + alerte |

### Limites par Niveau KYC

| Niveau | Par Transaction | Par Jour | Par Mois |
|--------|-----------------|----------|----------|
| KYC 0 | 25,000 XOF | 50,000 XOF | 200,000 XOF |
| KYC 1 | 250,000 XOF | 500,000 XOF | 2,000,000 XOF |
| KYC 2 | 1,000,000 XOF | 2,500,000 XOF | 10,000,000 XOF |
| KYC 3 | 5,000,000 XOF | 10,000,000 XOF | 50,000,000 XOF |

---

## 📞 Recharge Crédit Téléphone (Airtime)

### Opérateurs Supportés

| Pays | Opérateurs |
|------|------------|
| 🇸🇳 Sénégal | Orange, Free, Expresso |
| 🇨🇮 Côte d'Ivoire | Orange, MTN, Moov |
| 🇲🇱 Mali | Orange, Malitel |
| 🇧🇫 Burkina Faso | Orange, Moov, Telecel |
| 🇧🇯 Bénin | MTN, Moov |
| 🇨🇲 Cameroun | Orange, MTN |

### Flux Recharge

```
Utilisateur
    │
    ▼ 1. Sélectionne "Crédit téléphone"
┌──────────┐
│ Frontend │
└────┬─────┘
     │ 2. Choisit:
     │    - Pays
     │    - Opérateur
     │    - Numéro
     │    - Montant
     ▼
┌──────────┐
│ Backend  │
│ SB Pay   │
└────┬─────┘
     │ 3. Validation + débit wallet
     ▼
┌──────────┐
│ Reloadly │
│ / DT One │
└────┬─────┘
     │ 4. API Airtime
     ▼
┌──────────┐
│ Opérateur│
│ Télécom  │
└────┬─────┘
     │ 5. Crédit ajouté
     ▼
┌──────────┐
│ Téléphone│
│ crédité  │
└──────────┘
```

### APIs Airtime

| Service | Couverture | Avantage |
|---------|------------|----------|
| **Reloadly** | 140+ pays | Large couverture |
| **DT One** | 160+ pays | Fiabilité |
| **MFS Africa** | Afrique | Intégré MM |

---

## 🧪 Mode Démo

En attendant les clés API production, le système simule:

1. **Délai réaliste** - 2-5 secondes de traitement
2. **Réponses simulées** - Status success/pending/failed
3. **Webhooks mockés** - Callbacks automatiques
4. **Frais calculés** - Selon vraie grille tarifaire

### Activation Mode Production

```python
# backend/.env
MFS_AFRICA_API_KEY=your_live_key
MFS_AFRICA_SECRET=your_live_secret
RELOADLY_API_KEY=your_live_key
DEMO_MODE=false  # Désactiver le mode démo
```

---

*Document créé : Décembre 2025*
