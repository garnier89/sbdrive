import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PartnerLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/partners/login`, formData);
      
      // Store partner token
      localStorage.setItem('sbpaygo_partner_token', response.data.access_token);
      localStorage.setItem('sbpaygo_partner', JSON.stringify(response.data.partner));
      
      toast.success(`Bienvenue ${response.data.partner.business_name}!`);
      navigate('/partner/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Link>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Espace Partenaire</CardTitle>
            <CardDescription className="text-slate-400">
              Connectez-vous à votre compte agent SBPAYGO
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                  data-testid="partner-login-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Votre mot de passe"
                    className="bg-slate-700 border-slate-600 text-white pr-10"
                    required
                    data-testid="partner-login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading}
                data-testid="partner-login-submit"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Connexion...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center space-y-2">
              <p className="text-slate-400">
                Pas encore partenaire?{' '}
                <Link to="/partner/register" className="text-green-400 hover:text-green-300">
                  Devenir partenaire
                </Link>
              </p>
              <p className="text-slate-500 text-sm">
                <Link to="/login" className="hover:text-slate-300">
                  Connexion utilisateur →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
