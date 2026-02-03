import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Fingerprint } from 'lucide-react';
import axios from 'axios';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png";
const DEVICE_TOKEN_KEY = 'sbpaygo_device_token';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasQuickPin, setHasQuickPin] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if device has Quick PIN configured
  useEffect(() => {
    const checkQuickPin = async () => {
      const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      if (deviceToken) {
        try {
          const res = await axios.post(`${API}/auth/quick-pin/check-device?device_token=${deviceToken}`);
          if (res.data.valid) {
            setHasQuickPin(true);
          }
        } catch (error) {
          // Token invalid, remove it
          localStorage.removeItem(DEVICE_TOKEN_KEY);
        }
      }
    };
    checkQuickPin();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Bienvenue, ${user.full_name}!`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-orange-50/30 flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8" data-testid="login-logo">
            <img src={LOGO_URL} alt="SBPAYGO" className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold font-['Manrope'] bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">SBPAYGO</span>
          </Link>

          <Card className="border-sky-100 shadow-lg shadow-sky-100/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-['Manrope'] text-slate-800">Connexion</CardTitle>
              <CardDescription className="text-slate-500">
                Entrez vos identifiants pour accéder à votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Quick PIN Login Button */}
                {hasQuickPin && (
                  <div className="pb-4 border-b border-sky-100">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 text-sky-600 border-sky-200 hover:bg-sky-50"
                      onClick={() => navigate('/quick-login')}
                      data-testid="quick-pin-login-btn"
                    >
                      <Fingerprint className="w-5 h-5 mr-2" />
                      Connexion rapide avec PIN
                    </Button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      Vous avez configuré la connexion rapide sur cet appareil
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="login-email-input"
                    className="border-sky-200 focus:border-sky-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="login-password-input"
                      className="border-sky-200 focus:border-sky-400"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-slate-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white" 
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Pas encore de compte? </span>
                <Link 
                  to="/register" 
                  className="text-primary hover:underline font-medium"
                  data-testid="register-link"
                >
                  Créer un compte
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary to-orange-600 items-center justify-center p-12">
        <div className="text-white max-w-md text-center">
          <h2 className="text-3xl font-bold font-['Manrope'] mb-4">
            Gérez votre argent en toute simplicité
          </h2>
          <p className="text-lg opacity-90">
            Accédez à votre portefeuille, effectuez des transferts et payez vos factures 
            depuis n'importe où dans le monde.
          </p>
        </div>
      </div>
    </div>
  );
}
