// Service de stockage sécurisé
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../config';

export const storage = {
  // Token d'authentification
  async getToken() {
    return AsyncStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  },
  
  async setToken(token) {
    return AsyncStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
  },
  
  async removeToken() {
    return AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  },
  
  // Données utilisateur
  async getUser() {
    const data = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },
  
  async setUser(user) {
    return AsyncStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },
  
  async removeUser() {
    return AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
  },
  
  // Device token pour Quick PIN
  async getDeviceToken() {
    return AsyncStorage.getItem(CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
  },
  
  async setDeviceToken(token) {
    return AsyncStorage.setItem(CONFIG.STORAGE_KEYS.DEVICE_TOKEN, token);
  },
  
  async removeDeviceToken() {
    return AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.DEVICE_TOKEN);
  },
  
  // Biométrie activée
  async getBiometricEnabled() {
    const value = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  },
  
  async setBiometricEnabled(enabled) {
    return AsyncStorage.setItem(CONFIG.STORAGE_KEYS.BIOMETRIC_ENABLED, String(enabled));
  },
  
  // Thème
  async getTheme() {
    return AsyncStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
  },
  
  async setTheme(theme) {
    return AsyncStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  },
  
  // Langue
  async getLanguage() {
    return AsyncStorage.getItem(CONFIG.STORAGE_KEYS.LANGUAGE) || 'fr';
  },
  
  async setLanguage(language) {
    return AsyncStorage.setItem(CONFIG.STORAGE_KEYS.LANGUAGE, language);
  },
  
  // Tout effacer (logout)
  async clearAll() {
    const keys = Object.values(CONFIG.STORAGE_KEYS);
    return AsyncStorage.multiRemove(keys);
  },
};

export default storage;
