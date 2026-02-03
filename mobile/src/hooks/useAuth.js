// Contexte d'authentification SB Money Mobile
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import storage from '../services/storage';
import biometricService from '../services/biometric';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialiser l'authentification au démarrage
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const token = await storage.getToken();
      if (token) {
        const response = await authAPI.getMe();
        setUser(response.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth init error:', error);
      await storage.removeToken();
    } finally {
      setLoading(false);
    }
  };

  // Connexion classique
  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, user: userData } = response.data;
    
    await storage.setToken(access_token);
    await storage.setUser(userData);
    setUser(userData);
    setIsAuthenticated(true);
    
    return userData;
  };

  // Inscription
  const register = async (data) => {
    const response = await authAPI.register(data);
    const { access_token, user: userData } = response.data;
    
    await storage.setToken(access_token);
    await storage.setUser(userData);
    setUser(userData);
    setIsAuthenticated(true);
    
    return userData;
  };

  // Connexion avec PIN rapide
  const loginWithPin = async (pin) => {
    const deviceToken = await storage.getDeviceToken();
    if (!deviceToken) {
      throw new Error('PIN non configuré');
    }
    
    const response = await authAPI.quickPinLogin(deviceToken, pin);
    const { access_token, user: userData } = response.data;
    
    await storage.setToken(access_token);
    await storage.setUser(userData);
    setUser(userData);
    setIsAuthenticated(true);
    
    return userData;
  };

  // Connexion avec biométrie
  const loginWithBiometric = async () => {
    const success = await biometricService.authenticate();
    if (!success) {
      throw new Error('Authentification biométrique échouée');
    }
    
    // Utiliser le PIN stocké pour se connecter
    const deviceToken = await storage.getDeviceToken();
    if (!deviceToken) {
      throw new Error('Biométrie non configurée');
    }
    
    // On utilise un PIN par défaut stocké de manière sécurisée
    // En production, utiliser Keychain/Keystore
    return loginWithPin('stored_pin');
  };

  // Configuration du PIN rapide
  const setupQuickPin = async (pin, password) => {
    const response = await authAPI.quickPinSetup(pin, password);
    await storage.setDeviceToken(response.data.device_token);
    return response.data;
  };

  // Déconnexion
  const logout = async () => {
    await storage.clearAll();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Rafraîchir les données utilisateur
  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    loginWithPin,
    loginWithBiometric,
    setupQuickPin,
    logout,
    refreshUser,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
