import React, { useState, useEffect } from 'react';
import { useAuth, useLanguage, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Settings, Globe, Shield, Smartphone, Loader2, Check, Fingerprint, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';
import axios from 'axios';

const DEVICE_TOKEN_KEY = 'sbpay_device_token';

const LANGUAGES = [
  { code: 'fr', name: 'Français', native: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', native: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', native: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', native: 'Arabic', flag: '🇸🇦' },
  { code: 'de', name: 'Deutsch', native: 'German', flag: '🇩🇪' },
  { code: 'zh', name: '中文', native: 'Chinese', flag: '🇨🇳' }
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [loading2FA, setLoading2FA] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const handleLanguageChange = async (newLang) => {
    try {
      await setLanguage(newLang);
      toast.success(t('success'));
    } catch (error) {
      toast.error(t('error'));
    }
  };

  const handleEnable2FA = async () => {
    if (!phoneNumber) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    setLoading2FA(true);
    try {
      await axios.post(`${API}/auth/2fa/setup`, { phone_number: phoneNumber });
      setShowOTPInput(true);
      toast.success('Code OTP envoyé à votre téléphone');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode) {
      toast.error('Veuillez entrer le code OTP');
      return;
    }

    setLoading2FA(true);
    try {
      await axios.post(`${API}/auth/2fa/verify`, { code: otpCode });
      toast.success('2FA activé avec succès!');
      setShowOTPInput(false);
      setOtpCode('');
      setPhoneNumber('');
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading2FA(true);
    try {
      await axios.post(`${API}/auth/2fa/disable`);
      toast.success('2FA désactivé');
      await refreshUser();
    } catch (error) {
      toast.error('Erreur lors de la désactivation du 2FA');
    } finally {
      setLoading2FA(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6" data-testid="settings-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            {t('settings')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos préférences et la sécurité de votre compte
          </p>
        </div>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {t('language')}
            </CardTitle>
            <CardDescription>
              Choisissez votre langue préférée pour l'interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={language === lang.code ? 'default' : 'outline'}
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => handleLanguageChange(lang.code)}
                    data-testid={`lang-${lang.code}`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-xs">{lang.name}</span>
                  </Button>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <Label>{t('language')}</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="mt-2" data-testid="language-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name} ({lang.native})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2FA Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {t('twoFactorAuth')}
              {user?.two_factor_enabled && (
                <Badge className="bg-green-100 text-green-700 ml-2">Activé</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Ajoutez une couche de sécurité supplémentaire avec la vérification par SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.two_factor_enabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Check className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      2FA est activé
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Votre compte est protégé par vérification SMS
                    </p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleDisable2FA}
                  disabled={loading2FA}
                  data-testid="disable-2fa-btn"
                >
                  {loading2FA ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {t('disable2FA')}
                </Button>
              </div>
            ) : showOTPInput ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm">Code envoyé à {phoneNumber}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otp">{t('enterOTP')}</Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                    data-testid="otp-input"
                  />
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowOTPInput(false);
                      setOtpCode('');
                    }}
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleVerify2FA}
                    disabled={loading2FA || otpCode.length !== 6}
                    data-testid="verify-otp-btn"
                  >
                    {loading2FA ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {t('verify')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phoneNumber')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    data-testid="2fa-phone-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Entrez votre numéro avec l'indicatif pays (ex: +33 pour la France)
                  </p>
                </div>
                <Button 
                  onClick={handleEnable2FA}
                  disabled={loading2FA || !phoneNumber}
                  data-testid="enable-2fa-btn"
                >
                  {loading2FA ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  {t('enable2FA')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-primary">{t('demo')}</Badge>
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  Mode Démonstration
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-500">
                  Les SMS et emails sont simulés. Les notifications apparaissent dans les logs serveur.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
