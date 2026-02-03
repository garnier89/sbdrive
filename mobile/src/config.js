// Configuration API SBPAYGO Mobile
// Note: In production, set REACT_NATIVE_API_URL or API_URL environment variable
const getApiUrl = () => {
  // Check environment variables first
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_NATIVE_API_URL) return process.env.REACT_NATIVE_API_URL;
    if (process.env.API_URL) return process.env.API_URL;
  }
  // Default to production URL (will be replaced during build)
  return '__API_URL__';
};

const CONFIG = {
  // URL de l'API Backend
  API_URL: getApiUrl(),
  
  // Version de l'application
  APP_VERSION: '1.0.0',
  
  // Nom de l'application
  APP_NAME: 'SBPAYGO',
  
  // Timeout des requêtes (ms)
  REQUEST_TIMEOUT: 30000,
  
  // Clés de stockage
  STORAGE_KEYS: {
    AUTH_TOKEN: 'sbpaygo_token',
    USER_DATA: 'sbpaygo_user',
    DEVICE_TOKEN: 'sbpaygo_device_token',
    BIOMETRIC_ENABLED: 'sbpaygo_biometric',
    THEME: 'sbpaygo_theme',
    LANGUAGE: 'sbpaygo_language',
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
