// Service API pour SBPAYGO Mobile
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';

// Instance Axios configurée
const api = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      // Navigation vers login sera gérée par le contexte Auth
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH ====================
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (data) => 
    api.post('/auth/register', data),
  
  getMe: () => 
    api.get('/auth/me'),
  
  quickPinSetup: (pin, password) =>
    api.post('/auth/quick-pin/setup', { pin, password }),
  
  quickPinLogin: (deviceToken, pin) =>
    api.post('/auth/quick-pin/login', { device_token: deviceToken, pin }),
  
  quickPinStatus: () =>
    api.get('/auth/quick-pin/status'),
  
  checkDevice: (deviceToken) =>
    api.post(`/auth/quick-pin/check-device?device_token=${deviceToken}`),
};

// ==================== WALLET ====================
export const walletAPI = {
  getWallets: () => 
    api.get('/wallets'),
  
  getTransactions: (limit = 20, offset = 0) =>
    api.get(`/transactions?limit=${limit}&offset=${offset}`),
  
  transfer: (data) =>
    api.post('/transfer', data),
  
  transferByPhone: (data) =>
    api.post('/wallet/transfer-phone', data),
  
  lookupPhone: (phone) =>
    api.get(`/wallet/users/lookup-phone?phone=${encodeURIComponent(phone)}`),
};

// ==================== TRANSFER ====================
export const transferAPI = {
  verifyRecipient: (method, recipient) =>
    api.post('/transfer/verify-recipient', { method, recipient }),
  
  create: (data) =>
    api.post('/transfer/p2p', data),
  
  getDetails: (transferId) =>
    api.get(`/transfer/${transferId}`),
};

// ==================== VAULT ====================
export const vaultAPI = {
  getVault: () =>
    api.get('/vault/balance'),
  
  getBalance: () =>
    api.get('/vault/balance'),
  
  setPin: (pin) =>
    api.post('/vault/set-pin', { pin }),
  
  verifyPin: (pin) =>
    api.post('/vault/verify-pin', { pin }),
  
  deposit: (data) =>
    api.post('/vault/deposit', data),
  
  withdraw: (data) =>
    api.post('/vault/withdraw', data),
  
  getTransactions: () =>
    api.get('/vault/transactions'),
};

// ==================== VIRTUAL CARDS ====================
export const cardAPI = {
  getCards: () =>
    api.get('/virtual-cards'),
  
  createCard: (data) =>
    api.post('/virtual-cards', data),
  
  toggleCard: (cardId) =>
    api.post(`/virtual-cards/${cardId}/toggle`),
  
  verifyPin: (cardId, pin) =>
    api.post(`/virtual-cards/${cardId}/verify-pin`, { pin }),
  
  deleteCard: (cardId) =>
    api.delete(`/virtual-cards/${cardId}`),
  
  updateLimits: (cardId, limits) =>
    api.put(`/virtual-cards/${cardId}/limits`, limits),
  
  getColors: () =>
    api.get('/virtual-cards/colors'),
};

// Legacy export for backwards compatibility
export const cardsAPI = cardAPI;

// ==================== DEPOSITS ====================
export const depositAPI = {
  create: (data) =>
    api.post('/deposit', data),
  
  createStripeSession: (amount, currency) =>
    api.post('/deposit/stripe/create-session', { amount, currency }),
  
  verifyStripe: (sessionId) =>
    api.get(`/deposit/stripe/success?session_id=${sessionId}`),
};

// ==================== RECEIPTS ====================
export const receiptsAPI = {
  downloadReceipt: (transactionId) =>
    api.get(`/receipts/transaction/${transactionId}`, { responseType: 'blob' }),
};

// ==================== USER ====================
export const userAPI = {
  updateProfile: (data) =>
    api.put('/user/profile', data),
  
  changePassword: (currentPassword, newPassword) =>
    api.put('/user/password', { current_password: currentPassword, new_password: newPassword }),
  
  getDocuments: () =>
    api.get('/documents/my'),
};

// ==================== MOBILE MONEY ====================
export const mobileMoneyAPI = {
  getOperators: () =>
    api.get('/mobile-money/operators'),
  
  transfer: (data) =>
    api.post('/mobile-money/transfer', data),
  
  topUp: (data) =>
    api.post('/mobile-money/airtime', data),
};

export default api;
