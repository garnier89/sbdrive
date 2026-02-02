import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Users, Phone, Loader2, CheckCircle, ArrowRight, Search, 
  AlertCircle, Shield, Clock, UserCheck, Send
} from 'lucide-react';
import axios from 'axios';

const CURRENCIES = ['XOF', 'EUR', 'USD'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA' };

export default function UserTransferPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  
  const [formData, setFormData] = useState({
    recipient_phone: '',
    amount: '',
    currency: 'XOF',
    description: ''
  });

  useEffect(() => {
    fetchWallets();
    fetchRecentContacts();
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await axios.get(`${API}/wallets`);
      setWallets(res.data);
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  };

  const fetchRecentContacts = async () => {
    try {
      const res = await axios.get(`${API}/wallet/transfer-phone/contacts`);
      setRecentContacts(res.data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const selectedWallet = wallets.find(w => w.currency === formData.currency);
  const hasInsufficientFunds = selectedWallet && parseFloat(formData.amount || 0) > selectedWallet.balance;

  const handlePhoneLookup = async () => {
    if (!formData.recipient_phone || formData.recipient_phone.length < 8) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    setLookingUp(true);
    setRecipientInfo(null);

    try {
      const res = await axios.get(`${API}/wallet/users/lookup-phone`, {
        params: { phone: formData.recipient_phone }
      });
      setRecipientInfo(res.data);
      toast.success('Utilisateur trouvé!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Utilisateur non trouvé';
      toast.error(message);
      setRecipientInfo(null);
    } finally {
      setLookingUp(false);
    }
  };

  const selectContact = (contact) => {
    // Extract full phone from masked (we'll need to search again)
    setFormData({ ...formData, recipient_phone: '' });
    setRecipientInfo({
      found: true,
      user_id: contact.user_id,
      display_name: contact.name,
      phone_masked: contact.phone_masked
    });
    toast.info(`Contact ${contact.name} sélectionné. Le numéro sera vérifié lors du transfert.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!recipientInfo || !formData.amount) {
      toast.error('Veuillez rechercher un destinataire et entrer un montant');
      return;
    }

    if (hasInsufficientFunds) {
      toast.error('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/wallet/transfer-phone`, {
        recipient_phone: formData.recipient_phone || recipientInfo.phone_masked,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description
      });

      if (res.data.requires_otp) {
        setPendingTransfer(res.data);
        setStep(2.5); // OTP verification step
        toast.info('Code de vérification envoyé par SMS');
      } else {
        setStep(3);
        toast.success('Transfert effectué avec succès!');
        fetchWallets();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du transfert');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/wallet/transfer-phone/verify`, {
        transfer_id: pendingTransfer.transfer_id,
        otp_code: otpCode
      });
      setStep(3);
      toast.success('Transfert effectué avec succès!');
      fetchWallets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount, currency) => {
    return `${parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} ${CURRENCY_SYMBOLS[currency] || currency}`;
  };

  const resetForm = () => {
    setFormData({ recipient_phone: '', amount: '', currency: 'XOF', description: '' });
    setRecipientInfo(null);
    setPendingTransfer(null);
    setOtpCode('');
    setStep(1);
    fetchWallets();
    fetchRecentContacts();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="user-transfer-page">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
              Transfert entre utilisateurs
            </h1>
          </div>
          <p className="text-muted-foreground">
            Envoyez de l'argent instantanément à d'autres utilisateurs SB Pay via leur numéro de téléphone
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">Transferts gratuits</p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Les transferts entre utilisateurs SB Pay sont gratuits et instantanés.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors
                ${step >= s || (s === 2 && step === 2.5) 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}`}
              >
                {step > s || (s === 2 && step === 3) ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 transition-colors ${step > s || (s === 1 && step === 2.5) ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Find Recipient & Enter Amount */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Recent Contacts */}
            {recentContacts.length > 0 && (
              <Card data-testid="recent-contacts-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Contacts récents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {recentContacts.map((contact) => (
                      <button
                        key={contact.user_id}
                        onClick={() => selectContact(contact)}
                        className="flex-shrink-0 flex flex-col items-center p-3 rounded-lg hover:bg-muted transition-colors border border-border"
                        data-testid={`contact-${contact.user_id}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                          <UserCheck className="w-6 h-6 text-primary" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[80px]">{contact.name}</span>
                        <span className="text-xs text-muted-foreground">{contact.phone_masked}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phone Search */}
            <Card data-testid="phone-search-card">
              <CardHeader>
                <CardTitle className="font-['Manrope']">Rechercher un destinataire</CardTitle>
                <CardDescription>
                  Entrez le numéro de téléphone d'un utilisateur SB Pay
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="tel"
                      placeholder="Ex: +221 77 123 45 67"
                      value={formData.recipient_phone}
                      onChange={(e) => {
                        setFormData({ ...formData, recipient_phone: e.target.value });
                        setRecipientInfo(null);
                      }}
                      data-testid="phone-input"
                    />
                  </div>
                  <Button 
                    onClick={handlePhoneLookup}
                    disabled={lookingUp || !formData.recipient_phone}
                    data-testid="search-btn"
                  >
                    {lookingUp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Recipient Found */}
                {recipientInfo && recipientInfo.found && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3"
                       data-testid="recipient-found">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                      <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {recipientInfo.display_name}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Utilisateur SB Pay vérifié • {recipientInfo.phone_masked}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Amount & Transfer Details */}
            {recipientInfo && recipientInfo.found && (
              <Card data-testid="transfer-details-card">
                <CardHeader>
                  <CardTitle className="font-['Manrope']">Montant du transfert</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Montant *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="1"
                        min="1"
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        data-testid="amount-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Devise</Label>
                      <Select 
                        value={formData.currency} 
                        onValueChange={(v) => setFormData({ ...formData, currency: v })}
                      >
                        <SelectTrigger data-testid="currency-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedWallet && (
                    <p className={`text-sm ${hasInsufficientFunds ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Solde disponible: {formatAmount(selectedWallet.balance, selectedWallet.currency)}
                      {hasInsufficientFunds && ' - Solde insuffisant'}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">Note (optionnel)</Label>
                    <Textarea
                      id="description"
                      placeholder="Ex: Remboursement, Cadeau..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      maxLength={100}
                      data-testid="description-input"
                    />
                  </div>

                  {/* Security Notice */}
                  {parseFloat(formData.amount || 0) > 100000 && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
                      <Shield className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Pour votre sécurité, un code SMS sera envoyé pour confirmer ce transfert.
                      </p>
                    </div>
                  )}

                  <Button 
                    className="w-full"
                    disabled={!formData.amount || hasInsufficientFunds || loading}
                    onClick={() => setStep(2)}
                    data-testid="continue-btn"
                  >
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Confirm Transfer */}
        {step === 2 && (
          <Card data-testid="confirm-card">
            <CardHeader>
              <CardTitle className="font-['Manrope']">Confirmer le transfert</CardTitle>
              <CardDescription>
                Vérifiez les détails avant de confirmer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Destinataire</span>
                  <div className="text-right">
                    <p className="font-medium">{recipientInfo?.display_name}</p>
                    <p className="text-sm text-muted-foreground">{recipientInfo?.phone_masked}</p>
                  </div>
                </div>
                <div className="border-t border-border" />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-bold text-2xl text-primary">
                    {formatAmount(formData.amount, formData.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Frais</span>
                  <span className="font-medium text-green-600">Gratuit</span>
                </div>
                {formData.description && (
                  <>
                    <div className="border-t border-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Note</span>
                      <span className="font-medium text-right max-w-[200px]">{formData.description}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Retour
                </Button>
                <Button 
                  className="flex-1"
                  disabled={loading}
                  onClick={handleSubmit}
                  data-testid="confirm-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2.5: OTP Verification */}
        {step === 2.5 && (
          <Card data-testid="otp-card">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Vérification de sécurité
              </CardTitle>
              <CardDescription>
                Un code a été envoyé par SMS à votre numéro de téléphone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Montant à envoyer</p>
                <p className="text-2xl font-bold text-primary">
                  {formatAmount(pendingTransfer?.amount || formData.amount, formData.currency)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  à {pendingTransfer?.recipient_name || recipientInfo?.display_name}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Code de vérification (6 chiffres)</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                  data-testid="otp-input"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Le code expire dans 5 minutes. Ne partagez jamais ce code.
                </p>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={resetForm}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  disabled={loading || otpCode.length !== 6}
                  onClick={handleOTPVerify}
                  data-testid="verify-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card data-testid="success-card">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
                Transfert réussi!
              </h2>
              <p className="text-muted-foreground mb-2">
                {formatAmount(formData.amount, formData.currency)} envoyé à
              </p>
              <p className="font-medium text-lg mb-6">
                {pendingTransfer?.recipient_name || recipientInfo?.display_name}
              </p>
              
              <div className="p-4 bg-muted rounded-lg mb-6 text-sm">
                <p className="text-muted-foreground">
                  Le destinataire a été notifié et recevra les fonds instantanément.
                </p>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.location.href = '/history'} className="flex-1">
                  Voir l'historique
                </Button>
                <Button onClick={resetForm} className="flex-1" data-testid="new-transfer-btn">
                  Nouveau transfert
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
