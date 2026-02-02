import React, { createContext, useContext, useState, useEffect } from 'react';
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { translations, isRTL } from "@/i18n/translations";

// Pages
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import TransferPage from "@/pages/TransferPage";
import DepositPage from "@/pages/DepositPage";
import DepositSuccessPage from "@/pages/DepositSuccessPage";
import WithdrawPage from "@/pages/WithdrawPage";
import BankAccountsPage from "@/pages/BankAccountsPage";
import BillsPage from "@/pages/BillsPage";
import HistoryPage from "@/pages/HistoryPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminZones from "@/pages/admin/AdminZones";
import AdminGateways from "@/pages/admin/AdminGateways";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Language Context
const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('sbpay_language') || 'fr';
  });

  const setLanguage = async (lang) => {
    localStorage.setItem('sbpay_language', lang);
    setLanguageState(lang);
    
    // Update document direction for RTL languages
    document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
    
    // Update user preference on server if logged in
    const token = localStorage.getItem('sbpay_token');
    if (token) {
      try {
        await axios.put(`${API}/user/language`, { language: lang });
      } catch (error) {
        console.error('Failed to update language on server');
      }
    }
  };

  const t = (key) => {
    const lang = translations[language] || translations.fr;
    return lang[key] || translations.fr[key] || key;
  };

  useEffect(() => {
    document.documentElement.dir = isRTL(language) ? 'rtl' : 'ltr';
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL: isRTL(language) }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Auth Context
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
  const [token, setToken] = useState(localStorage.getItem('sbpay_token'));
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('sbpay_token');
      if (savedToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data);
          setToken(savedToken);
          
          // Sync language from server
          if (response.data.preferred_language) {
            localStorage.setItem('sbpay_language', response.data.preferred_language);
          }
        } catch (error) {
          localStorage.removeItem('sbpay_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    
    if (response.data.requires_2fa) {
      setRequires2FA(true);
      setPending2FAUserId(response.data.user_id);
      return { requires_2fa: true };
    }
    
    const { access_token, user: userData } = response.data;
    localStorage.setItem('sbpay_token', access_token);
    setToken(access_token);
    setUser(userData);
    
    if (userData.preferred_language) {
      localStorage.setItem('sbpay_language', userData.preferred_language);
    }
    
    return userData;
  };

  const verify2FA = async (code) => {
    const response = await axios.post(`${API}/auth/verify-2fa?user_id=${pending2FAUserId}&code=${code}`);
    const { access_token, user: userData } = response.data;
    localStorage.setItem('sbpay_token', access_token);
    setToken(access_token);
    setUser(userData);
    setRequires2FA(false);
    setPending2FAUserId(null);
    return userData;
  };

  const register = async (email, password, full_name, phone, preferred_language = 'fr') => {
    const response = await axios.post(`${API}/auth/register`, { 
      email, password, full_name, phone, preferred_language 
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('sbpay_token', access_token);
    localStorage.setItem('sbpay_language', preferred_language);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('sbpay_token');
    setToken(null);
    setUser(null);
    setRequires2FA(false);
    setPending2FAUserId(null);
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user');
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    refreshUser,
    verify2FA,
    requires2FA,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Axios interceptor
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('sbpay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sbpay_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/transfer" element={
              <ProtectedRoute><TransferPage /></ProtectedRoute>
            } />
            <Route path="/deposit" element={
              <ProtectedRoute><DepositPage /></ProtectedRoute>
            } />
            <Route path="/deposit/success" element={
              <ProtectedRoute><DepositSuccessPage /></ProtectedRoute>
            } />
            <Route path="/deposit/paypal-demo" element={
              <ProtectedRoute><DepositSuccessPage /></ProtectedRoute>
            } />
            <Route path="/withdraw" element={
              <ProtectedRoute><WithdrawPage /></ProtectedRoute>
            } />
            <Route path="/bank-accounts" element={
              <ProtectedRoute><BankAccountsPage /></ProtectedRoute>
            } />
            <Route path="/bills" element={
              <ProtectedRoute><BillsPage /></ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute><HistoryPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/transactions" element={
              <ProtectedRoute adminOnly><AdminTransactions /></ProtectedRoute>
            } />
            <Route path="/admin/documents" element={
              <ProtectedRoute adminOnly><AdminDocuments /></ProtectedRoute>
            } />
            <Route path="/admin/zones" element={
              <ProtectedRoute adminOnly><AdminZones /></ProtectedRoute>
            } />
            <Route path="/admin/gateways" element={
              <ProtectedRoute adminOnly><AdminGateways /></ProtectedRoute>
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
