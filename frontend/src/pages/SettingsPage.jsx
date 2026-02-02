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
  
  // Quick PIN States
  const [quickPinStatus, setQuickPinStatus] = useState(null);
  const [loadingQuickPin, setLoadingQuickPin] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  
  // Change PIN States
  const [showChangePin, setShowChangePin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPinChange, setNewPinChange] = useState('');
  
  // Disable PIN States
  const [showDisablePin, setShowDisablePin] = useState(false);
  const [disablePin, setDisablePin] = useState('');

  // Fetch Quick PIN status on load
  useEffect(() => {
    fetchQuickPinStatus();
  }, []);

  const fetchQuickPinStatus = async () => {
    try {
      const res = await axios.get(`${API}/auth/quick-pin/status`);
      setQuickPinStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch Quick PIN status');
      setQuickPinStatus({ enabled: false });
    } finally {
      setLoadingQuickPin(false);
    }
  };

  const handleSetupQuickPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error('Le PIN doit contenir entre 4 et 6 chiffres');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Les PINs ne correspondent pas');
      return;
    }
    if (!currentPassword) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setSavingPin(true);
    try {
      const res = await axios.post(`${API}/auth/quick-pin/setup`, {
        pin: newPin,
        password: currentPassword
      });
      
      // Store device token securely
      localStorage.setItem(DEVICE_TOKEN_KEY, res.data.device_token);
      
      toast.success('PIN rapide configuré avec succès!');
      setShowPinSetup(false);
      setNewPin('');
      setConfirmPin('');
      setCurrentPassword('');
      fetchQuickPinStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la configuration du PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const handleChangeQuickPin = async () => {
    if (newPinChange.length < 4 || newPinChange.length > 6) {
      toast.error('Le nouveau PIN doit contenir entre 4 et 6 chiffres');
      return;
    }
    if (!currentPin) {
      toast.error('Veuillez entrer votre PIN actuel');
      return;
    }

    setSavingPin(true);
    try {
      await axios.post(`${API}/auth/quick-pin/change`, {
        current_pin: currentPin,
        new_pin: newPinChange
      });
      
      toast.success('PIN modifié avec succès!');
      setShowChangePin(false);
      setCurrentPin('');
      setNewPinChange('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification du PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const handleDisableQuickPin = async () => {
    if (!disablePin) {
      toast.error('Veuillez entrer votre PIN');
      return;
    }

    setSavingPin(true);
    try {
      await axios.post(`${API}/auth/quick-pin/disable`, {
        pin: disablePin
      });
      
      // Remove device token
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      
      toast.success('PIN rapide désactivé');
      setShowDisablePin(false);
      setDisablePin('');
      fetchQuickPinStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la désactivation');
    } finally {
      setSavingPin(false);
    }
  };
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

        {/* Quick PIN Login Settings */}
        <Card data-testid="quick-pin-settings">
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              Connexion Rapide par PIN
              {quickPinStatus?.enabled && (
                <Badge className="bg-green-100 text-green-700 ml-2">Activé</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connectez-vous rapidement avec un code PIN à 4-6 chiffres sur cet appareil
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingQuickPin ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : quickPinStatus?.enabled ? (
              <div className="space-y-4">
                {/* PIN is enabled */}
                <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Check className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-700 dark:text-green-400">
                      PIN rapide activé
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Dernière utilisation: {quickPinStatus.last_used ? 
                        new Date(quickPinStatus.last_used).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Jamais'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Expire le: {new Date(quickPinStatus.expires_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Change PIN */}
                {showChangePin ? (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium">Modifier le PIN</h4>
                    <div className="space-y-2">
                      <Label>PIN actuel</Label>
                      <Input
                        type={showPin ? "text" : "password"}
                        maxLength={6}
                        placeholder="••••••"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-xl tracking-widest"
                        data-testid="current-pin-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nouveau PIN (4-6 chiffres)</Label>
                      <Input
                        type={showPin ? "text" : "password"}
                        maxLength={6}
                        placeholder="••••••"
                        value={newPinChange}
                        onChange={(e) => setNewPinChange(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-xl tracking-widest"
                        data-testid="new-pin-change-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowChangePin(false);
                          setCurrentPin('');
                          setNewPinChange('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        onClick={handleChangeQuickPin}
                        disabled={savingPin || currentPin.length < 4 || newPinChange.length < 4}
                        data-testid="confirm-change-pin-btn"
                      >
                        {savingPin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Modifier
                      </Button>
                    </div>
                  </div>
                ) : showDisablePin ? (
                  <div className="space-y-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <h4 className="font-medium text-red-700 dark:text-red-400">Désactiver le PIN rapide</h4>
                    <p className="text-sm text-red-600 dark:text-red-500">
                      Entrez votre PIN actuel pour confirmer la désactivation
                    </p>
                    <div className="space-y-2">
                      <Label>PIN actuel</Label>
                      <Input
                        type={showPin ? "text" : "password"}
                        maxLength={6}
                        placeholder="••••••"
                        value={disablePin}
                        onChange={(e) => setDisablePin(e.target.value.replace(/\D/g, ''))}
                        className="text-center text-xl tracking-widest"
                        data-testid="disable-pin-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowDisablePin(false);
                          setDisablePin('');
                        }}
                      >
                        Annuler
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={handleDisableQuickPin}
                        disabled={savingPin || disablePin.length < 4}
                        data-testid="confirm-disable-pin-btn"
                      >
                        {savingPin ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Désactiver
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => setShowChangePin(true)}
                      data-testid="change-pin-btn"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Modifier le PIN
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowDisablePin(true)}
                      data-testid="disable-pin-btn"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Désactiver
                    </Button>
                  </div>
                )}
              </div>
            ) : showPinSetup ? (
              /* Setup PIN Form */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nouveau PIN (4-6 chiffres)</Label>
                  <div className="relative">
                    <Input
                      type={showPin ? "text" : "password"}
                      maxLength={6}
                      placeholder="••••••"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-xl tracking-widest pr-10"
                      data-testid="new-pin-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* PIN dots indicator */}
                  <div className="flex justify-center gap-2 pt-1">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          i < newPin.length ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confirmer le PIN</Label>
                  <Input
                    type={showPin ? "text" : "password"}
                    maxLength={6}
                    placeholder="••••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl tracking-widest"
                    data-testid="confirm-pin-input"
                  />
                  {confirmPin && newPin && confirmPin !== newPin && (
                    <p className="text-xs text-red-500">Les PINs ne correspondent pas</p>
                  )}
                  {confirmPin && newPin && confirmPin === newPin && newPin.length >= 4 && (
                    <p className="text-xs text-green-500">✓ Les PINs correspondent</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mot de passe actuel (pour vérification)</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Votre mot de passe"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                      data-testid="password-verify-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowPinSetup(false);
                      setNewPin('');
                      setConfirmPin('');
                      setCurrentPassword('');
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSetupQuickPin}
                    disabled={savingPin || newPin.length < 4 || newPin !== confirmPin || !currentPassword}
                    data-testid="save-pin-btn"
                  >
                    {savingPin ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Fingerprint className="w-4 h-4 mr-2" />
                    )}
                    Activer le PIN
                  </Button>
                </div>
              </div>
            ) : (
              /* Not enabled - show setup prompt */
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Avantages du PIN rapide:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Connexion en quelques secondes</li>
                    <li>• Plus besoin de saisir email/mot de passe</li>
                    <li>• Sécurisé par verrouillage après 5 tentatives</li>
                    <li>• Valide 30 jours sur cet appareil</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => setShowPinSetup(true)}
                  data-testid="setup-pin-btn"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Configurer le PIN rapide
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
