import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API } from '@/App';
import { useLanguage } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  User, Mail, Phone, Calendar, Shield, Camera, Edit2, Save, X,
  Lock, Smartphone, History, CreditCard, Building2, Wallet,
  FileText, Upload, CheckCircle, Clock, AlertCircle, Globe, DollarSign
} from 'lucide-react';
import axios from 'axios';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  
  // Profile data
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    date_of_birth: '',
    preferred_language: 'fr',
    default_currency: 'EUR'
  });
  
  // Linked accounts
  const [cards, setCards] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [mobileMoneyAccounts, setMobileMoneyAccounts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  
  // Reference data
  const [currencies, setCurrencies] = useState([]);
  const [languages, setLanguages] = useState([]);
  
  // Password change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // 2FA
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || user.full_name?.split(' ')[0] || '',
        last_name: user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        country: user.country || '',
        date_of_birth: user.date_of_birth || '',
        preferred_language: user.preferred_language || 'fr',
        default_currency: user.default_currency || 'EUR'
      });
    }
    fetchLinkedAccounts();
    fetchReferenceData();
  }, [user]);

  const fetchLinkedAccounts = async () => {
    try {
      const [cardsRes, bankRes, mmRes, docsRes] = await Promise.all([
        axios.get(`${API}/cards`),
        axios.get(`${API}/bank-accounts`),
        axios.get(`${API}/mobile-money-accounts`),
        axios.get(`${API}/documents/my`)
      ]);
      setCards(cardsRes.data.cards || []);
      setBankAccounts(bankRes.data.accounts || []);
      setMobileMoneyAccounts(mmRes.data.accounts || []);
      setDocuments(docsRes.data.documents || []);
    } catch (error) {
      console.error('Error fetching linked accounts:', error);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [currRes, langRes] = await Promise.all([
        axios.get(`${API}/currencies`),
        axios.get(`${API}/languages`)
      ]);
      setCurrencies(currRes.data.currencies || []);
      setLanguages(langRes.data.languages || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/user/profile`, profileData);
      toast.success('Profil mis à jour avec succès');
      setEditing(false);
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(`${API}/user/password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      toast.success('Mot de passe modifié avec succès');
      setShowPasswordDialog(false);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    if (!otpPhone) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/2fa/setup`, { phone_number: otpPhone });
      toast.success('Code OTP envoyé par SMS');
      setOtpSent(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/2fa/verify`, { code: otpCode });
      toast.success('Authentification à deux facteurs activée');
      setShow2FADialog(false);
      setOtpPhone('');
      setOtpCode('');
      setOtpSent(false);
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/auth/2fa/disable`);
      toast.success('Authentification à deux facteurs désactivée');
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      await axios.post(`${API}/user/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo de profil mise à jour');
      if (refreshUser) refreshUser();
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getKYCStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'En attente' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Vérifié' },
      rejected: { color: 'bg-red-500', icon: AlertCircle, text: 'Rejeté' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} text-white`}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto" data-testid="profile-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Mon Profil
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos informations personnelles et votre sécurité
          </p>
        </div>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div 
                  className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={handleAvatarClick}
                >
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold font-['Manrope']">
                  {user?.full_name || `${profileData.first_name} ${profileData.last_name}`}
                </h2>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                  {user?.role === 'admin' && (
                    <Badge className="bg-primary">
                      <Shield className="w-3 h-3 mr-1" />
                      Administrateur
                    </Badge>
                  )}
                  {getKYCStatusBadge(user?.kyc_status)}
                  {user?.two_factor_enabled && (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      <Lock className="w-3 h-3 mr-1" />
                      2FA Activé
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Membre depuis</p>
                <p className="font-medium">{formatDate(user?.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Personnel</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Paiements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>Modifiez vos informations de base</CardDescription>
                </div>
                {!editing ? (
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      disabled={!editing}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    disabled={!editing}
                    placeholder="+33 6 00 00 00 00"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input
                      value={profileData.country}
                      onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                      disabled={!editing}
                      placeholder="FR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Langue</Label>
                    <Select
                      value={profileData.preferred_language}
                      onValueChange={(v) => setProfileData({...profileData, preferred_language: v})}
                      disabled={!editing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.native_name || lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Devise principale</Label>
                  <Select
                    value={profileData.default_currency}
                    onValueChange={(v) => setProfileData({...profileData, default_currency: v})}
                    disabled={!editing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(curr => (
                        <SelectItem key={curr.code} value={curr.code}>
                          {curr.symbol} {curr.code} - {curr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-6">
              {/* Password */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Mot de passe
                  </CardTitle>
                  <CardDescription>Modifiez votre mot de passe</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Changer le mot de passe</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Changer le mot de passe</DialogTitle>
                        <DialogDescription>
                          Entrez votre mot de passe actuel et votre nouveau mot de passe
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Mot de passe actuel</Label>
                          <Input
                            type="password"
                            value={passwordData.current_password}
                            onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nouveau mot de passe</Label>
                          <Input
                            type="password"
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Confirmer le mot de passe</Label>
                          <Input
                            type="password"
                            value={passwordData.confirm_password}
                            onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                          />
                        </div>
                        <Button onClick={handlePasswordChange} className="w-full" disabled={loading}>
                          Changer le mot de passe
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* 2FA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Authentification à deux facteurs (2FA)
                  </CardTitle>
                  <CardDescription>
                    Ajoutez une couche de sécurité supplémentaire à votre compte
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user?.two_factor_enabled ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span>2FA activé sur {user?.two_factor_phone}</span>
                      </div>
                      <Button variant="destructive" onClick={handleDisable2FA} disabled={loading}>
                        Désactiver 2FA
                      </Button>
                    </div>
                  ) : (
                    <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
                      <DialogTrigger asChild>
                        <Button>Activer 2FA</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Activer l'authentification 2FA</DialogTitle>
                          <DialogDescription>
                            Un code de vérification sera envoyé par SMS à chaque connexion
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          {!otpSent ? (
                            <>
                              <div className="space-y-2">
                                <Label>Numéro de téléphone</Label>
                                <Input
                                  value={otpPhone}
                                  onChange={(e) => setOtpPhone(e.target.value)}
                                  placeholder="+33 6 00 00 00 00"
                                />
                              </div>
                              <Button onClick={handleSetup2FA} className="w-full" disabled={loading}>
                                Envoyer le code
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <Label>Code de vérification</Label>
                                <Input
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value)}
                                  placeholder="000000"
                                  maxLength={6}
                                />
                              </div>
                              <Button onClick={handleVerify2FA} className="w-full" disabled={loading}>
                                Vérifier et activer
                              </Button>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>

              {/* Login History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Historique des connexions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    L'historique des connexions sera disponible prochainement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="space-y-6">
              {/* Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Cartes enregistrées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cards.length === 0 ? (
                    <p className="text-muted-foreground">Aucune carte enregistrée</p>
                  ) : (
                    <div className="space-y-3">
                      {cards.map(card => (
                        <div key={card.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-8 h-8 text-primary" />
                            <div>
                              <p className="font-medium capitalize">{card.brand} •••• {card.last4}</p>
                              <p className="text-sm text-muted-foreground">Expire {card.expiry}</p>
                            </div>
                          </div>
                          {card.is_default && <Badge>Par défaut</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/deposit'}>
                    Ajouter une carte
                  </Button>
                </CardContent>
              </Card>

              {/* Bank Accounts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Comptes bancaires liés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bankAccounts.length === 0 ? (
                    <p className="text-muted-foreground">Aucun compte bancaire lié</p>
                  ) : (
                    <div className="space-y-3">
                      {bankAccounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-8 h-8 text-primary" />
                            <div>
                              <p className="font-medium">{account.bank_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {account.iban ? `IBAN: •••• ${account.iban.slice(-4)}` : account.account_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {account.is_default && <Badge>Par défaut</Badge>}
                            <Badge variant={account.verification_status === 'verified' ? 'default' : 'outline'}>
                              {account.verification_status === 'verified' ? 'Vérifié' : 'En attente'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/bank-accounts'}>
                    Gérer les comptes bancaires
                  </Button>
                </CardContent>
              </Card>

              {/* Mobile Money */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Comptes Mobile Money
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mobileMoneyAccounts.length === 0 ? (
                    <p className="text-muted-foreground">Aucun compte Mobile Money lié</p>
                  ) : (
                    <div className="space-y-3">
                      {mobileMoneyAccounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-8 h-8 text-orange-500" />
                            <div>
                              <p className="font-medium">{account.provider_name}</p>
                              <p className="text-sm text-muted-foreground">{account.phone_number}</p>
                            </div>
                          </div>
                          {account.is_default && <Badge>Par défaut</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents KYC
                </CardTitle>
                <CardDescription>
                  Téléchargez vos documents pour vérifier votre identité
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KYC Status */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Statut de vérification</span>
                    {getKYCStatusBadge(user?.kyc_status)}
                  </div>
                </div>

                {/* Document Types */}
                <div className="space-y-4">
                  {[
                    { type: 'id_card', label: "Pièce d'identité", desc: "Carte d'identité, passeport ou permis de conduire" },
                    { type: 'proof_of_address', label: 'Justificatif de domicile', desc: "Facture de moins de 3 mois" },
                    { type: 'selfie', label: 'Photo selfie', desc: "Photo de vous tenant votre pièce d'identité" }
                  ].map(docType => {
                    const uploadedDoc = documents.find(d => d.type === docType.type);
                    return (
                      <div key={docType.type} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{docType.label}</p>
                          <p className="text-sm text-muted-foreground">{docType.desc}</p>
                          {uploadedDoc && (
                            <div className="mt-2">
                              {getKYCStatusBadge(uploadedDoc.status)}
                            </div>
                          )}
                        </div>
                        <Button variant={uploadedDoc ? "outline" : "default"}>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadedDoc ? 'Remplacer' : 'Télécharger'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
