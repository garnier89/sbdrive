// Configuration API SB Money Mobile
const CONFIG = {
  // URL de l'API Backend
  API_URL: 'https://vibrant-gauss.preview.emergentagent.com/api',
  
  // Version de l'application
  APP_VERSION: '1.0.0',
  
  // Timeout des requêtes (ms)
  REQUEST_TIMEOUT: 30000,
  
  // Clés de stockage
  STORAGE_KEYS: {
    AUTH_TOKEN: 'sbmoney_token',
    USER_DATA: 'sbmoney_user',
    DEVICE_TOKEN: 'sbmoney_device_token',
    BIOMETRIC_ENABLED: 'sbmoney_biometric',
    THEME: 'sbmoney_theme',
    LANGUAGE: 'sbmoney_language',
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
