import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Fingerprint, Loader2, Eye, EyeOff, ArrowLeft, User } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DEVICE_TOKEN_KEY = 'sbpay_device_token';

export default function QuickPinLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deviceValid, setDeviceValid] = useState(false);
  const [userHint, setUserHint] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    checkDeviceToken();
  }, []);

  const checkDeviceToken = async () => {
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    
    if (!deviceToken) {
      setLoading(false);
      setDeviceValid(false);
      return;
    }
    
    try {
      const res = await axios.post(`${API}/auth/quick-pin/check-device?device_token=${deviceToken}`);
      if (res.data.valid) {
        setDeviceValid(true);
        setUserHint(res.data.user_hint);
        setEmailMasked(res.data.email_masked);
        setIsLocked(res.data.is_locked);
      } else {
        setDeviceValid(false);
        localStorage.removeItem(DEVICE_TOKEN_KEY);
      }
    } catch (error) {
      setDeviceValid(false);
      localStorage.removeItem(DEVICE_TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.length < 4) {
      toast.error('PIN trop court (minimum 4 chiffres)');
      return;
    }
    
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!deviceToken) {
      toast.error('Appareil non reconnu');
      navigate('/login');
      return;
    }
    
    setLogging(true);
    try {
      const res = await axios.post(`${API}/auth/quick-pin/login`, {
        device_token: deviceToken,
        pin: pin
      });
      
      // Store token
      localStorage.setItem('token', res.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      
      toast.success(`Bienvenue, ${res.data.user.first_name || 'Utilisateur'}!`);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
      if (error.response?.status === 423) {
        setIsLocked(true);
      }
    } finally {
      setLogging(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && pin.length >= 4) {
      handlePinLogin();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no device token or invalid, redirect to normal login
  if (!deviceValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Fingerprint className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>PIN Rapide non configuré</CardTitle>
            <CardDescription>
              Connectez-vous d'abord avec votre email et mot de passe, puis activez le PIN rapide dans les paramètres.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Connexion classique
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md" data-testid="quick-pin-login">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bonjour, {userHint}!</CardTitle>
          <CardDescription>
            {emailMasked}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLocked ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
              <p className="text-red-700 dark:text-red-300 font-medium">
                Compte temporairement verrouillé
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Trop de tentatives. Réessayez dans 30 minutes ou utilisez la connexion classique.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/login')}
              >
                Connexion classique
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-center block">
                  Entrez votre PIN
                </label>
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={handleKeyPress}
                    className="text-center text-3xl tracking-[0.5em] font-mono h-16 pr-12"
                    autoFocus
                    data-testid="pin-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* PIN dots indicator */}
              <div className="flex justify-center gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < pin.length ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <Button
                className="w-full h-12 text-lg"
                onClick={handlePinLogin}
                disabled={logging || pin.length < 4}
                data-testid="pin-login-btn"
              >
                {logging ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Fingerprint className="w-5 h-5 mr-2" />
                )}
                Se connecter
              </Button>
            </>
          )}

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Utiliser email et mot de passe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
