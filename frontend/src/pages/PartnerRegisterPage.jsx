import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/App';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COUNTRIES = [
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'TG', name: 'Togo' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'FR', name: 'France' },
];

export default function PartnerRegisterPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/partners/register`, {
        business_name: formData.business_name,
        owner_name: formData.owner_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        password: formData.password
      });
      
      setPartnerCode(response.data.partner_code);
      setSuccess(true);
      toast.success('Inscription enregistrée avec succès!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-white">Inscription réussie!</CardTitle>
            <CardDescription className="text-slate-400">
              Votre demande de partenariat a été enregistrée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4 text-center">
              <p className="text-sm text-slate-400 mb-2">Votre code partenaire</p>
              <p className="text-2xl font-bold text-green-400 font-mono">{partnerCode}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-amber-400 text-sm">
                ⏳ Votre compte est en attente de validation par notre équipe. 
                Vous recevrez un email une fois votre compte activé.
              </p>
            </div>
            <div className="space-y-2 pt-4">
              <Button 
                onClick={() => navigate('/partner/login')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Se connecter
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Link>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Devenir Partenaire SBPAYGO</CardTitle>
            <CardDescription className="text-slate-400">
              Rejoignez notre réseau d'agents et proposez des retraits cash à vos clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                  Informations de l'entreprise
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nom de l'entreprise *</Label>
                    <Input
                      value={formData.business_name}
                      onChange={(e) => handleChange('business_name', e.target.value)}
                      placeholder="Ex: Boutique Amadou"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                      data-testid="partner-business-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nom du propriétaire *</Label>
                    <Input
                      value={formData.owner_name}
                      onChange={(e) => handleChange('owner_name', e.target.value)}
                      placeholder="Ex: Amadou Diallo"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                      data-testid="partner-owner-name"
                    />
                  </div>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                  Coordonnées
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="email@exemple.com"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                      data-testid="partner-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Téléphone *</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+221 77 123 4567"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                      data-testid="partner-phone"
                    />
                  </div>
                </div>
              </div>
              
              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                  Adresse du point de vente
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Adresse *</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="123 Rue du Commerce"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                      data-testid="partner-address"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Ville *</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="Dakar"
                        className="bg-slate-700 border-slate-600 text-white"
                        required
                        data-testid="partner-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Pays *</Label>
                      <Select 
                        value={formData.country} 
                        onValueChange={(value) => handleChange('country', value)}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white" data-testid="partner-country">
                          <SelectValue placeholder="Sélectionner un pays" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(country => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Password */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2">
                  Sécurité
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Mot de passe *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="Minimum 8 caractères"
                        className="bg-slate-700 border-slate-600 text-white pr-10"
                        required
                        minLength={8}
                        data-testid="partner-password"
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
                  <div className="space-y-2">
                    <Label className="text-slate-300">Confirmer le mot de passe *</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      placeholder="Confirmez votre mot de passe"
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                      data-testid="partner-confirm-password"
                    />
                  </div>
                </div>
              </div>
              
              {/* Terms */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400">
                  En vous inscrivant, vous acceptez les conditions générales d'utilisation 
                  et vous engagez à respecter les réglementations en vigueur concernant 
                  les services financiers.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading}
                data-testid="partner-submit-btn"
              >
                {loading ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Inscription en cours...
                  </span>
                ) : (
                  'Soumettre ma demande'
                )}
              </Button>
            </form>
            
            <p className="text-center text-slate-400 mt-6">
              Déjà partenaire?{' '}
              <Link to="/partner/login" className="text-green-400 hover:text-green-300">
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
