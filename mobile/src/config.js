// Configuration API SB Pay Mobile
const CONFIG = {
  // URL de l'API Backend
  API_URL: 'https://moneyhub-sb.preview.emergentagent.com/api',
  
  // Version de l'application
  APP_VERSION: '1.0.0',
  
  // Timeout des requêtes (ms)
  REQUEST_TIMEOUT: 30000,
  
  // Clés de stockage
  STORAGE_KEYS: {
    AUTH_TOKEN: 'sbpay_token',
    USER_DATA: 'sbpay_user',
    DEVICE_TOKEN: 'sbpay_device_token',
    BIOMETRIC_ENABLED: 'sbpay_biometric',
    THEME: 'sbpay_theme',
    LANGUAGE: 'sbpay_language',
  },
  
  // Configuration biométrique
  BIOMETRIC: {
    PROMPT_MESSAGE: 'Authentifiez-vous avec votre empreinte',
    CANCEL_BUTTON: 'Annuler',
    FALLBACK_LABEL: 'Utiliser le PIN',
  },
  
  // Devises supportées
  CURRENCIES: ['EUR', 'USD', 'XOF', 'GBP', 'CAD', 'CHF'],
  
  // Symboles devises
  CURRENCY_SYMBOLS: {
    EUR: '€',
    USD: '$',
    XOF: 'CFA',
    GBP: '£',
    CAD: 'C$',
    CHF: 'CHF'
  },
};

export default CONFIG;
