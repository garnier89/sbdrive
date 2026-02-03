# SBPAYGO Mobile

Application mobile React Native pour la plateforme fintech SBPAYGO - la solution de paiement digitale #1 en Afrique.

## 🎨 Thème "Orange 50%"

L'application utilise un thème orange dominant avec les couleurs principales:
- **Primary**: `#f97316` (Orange)
- **Primary Dark**: `#ea580c`
- **Primary Light**: `#fb923c`
- **Background**: `#fff7ed` (Orange très léger)

## 📱 Écrans Disponibles

### Authentification
- **LoginScreen** - Connexion avec email/mot de passe, PIN rapide ou biométrie
- **RegisterScreen** - Création de compte
- **QuickPinScreen** - Connexion rapide avec PIN

### Principal
- **DashboardScreen** - Vue d'ensemble du portefeuille et actions rapides
- **TransferScreen** - Transferts P2P en 3 étapes (destinataire → montant → confirmation)
- **CardsScreen** - Gestion des cartes virtuelles avec couleurs personnalisables
- **HistoryScreen** - Historique des transactions avec filtres
- **ProfileScreen** - Profil utilisateur et paramètres
- **VaultScreen** - Coffre-fort sécurisé par PIN
- **DepositScreen** - Dépôts via carte, virement ou Mobile Money

## 🏗️ Architecture

```
/app/mobile/
├── App.js                     # Point d'entrée
├── src/
│   ├── config.js              # Configuration API
│   ├── hooks/
│   │   └── useAuth.js         # Contexte d'authentification
│   ├── navigation/
│   │   └── AppNavigator.js    # Navigation (Stack + Bottom Tabs)
│   ├── screens/
│   │   ├── auth/              # Écrans d'authentification
│   │   └── main/              # Écrans principaux
│   ├── services/
│   │   ├── api.js             # Service API Axios
│   │   ├── biometric.js       # Service biométrique
│   │   └── storage.js         # AsyncStorage wrapper
│   └── styles/
│       └── theme.js           # Thème et styles globaux
```

## 🚀 Démarrage

```bash
# Installation des dépendances
cd /app/mobile
yarn install

# Démarrer Metro
yarn start

# Android
yarn android

# iOS
yarn ios
```

## 🔑 Configuration API

L'URL de l'API est configurée dans `src/config.js`:
```javascript
API_URL: 'https://vibrant-gauss.preview.emergentagent.com/api'
```

## 📋 Fonctionnalités

- ✅ Authentification JWT
- ✅ Connexion rapide avec PIN
- ✅ Support biométrique (empreinte/Face ID)
- ✅ Multi-devises (EUR, USD, XOF, GBP, CAD, CHF)
- ✅ Transferts P2P avec vérification
- ✅ Cartes virtuelles personnalisables
- ✅ Coffre-fort sécurisé
- ✅ Dépôts multi-méthodes
- ✅ Historique avec filtres
- ✅ Pull-to-refresh
- ✅ Thème Orange 50% cohérent

## 📦 Dépendances Principales

- React Native 0.73.2
- React Navigation 6.x
- Axios
- AsyncStorage
- React Native Biometrics
- React Native Vector Icons (Feather)

## 🎯 Branding

- **Nom**: SBPAYGO
- **Tagline**: "La Fintech #1 en Afrique"
- **Couleur principale**: Orange (#f97316)
- **Logo**: Disponible dans les assets
