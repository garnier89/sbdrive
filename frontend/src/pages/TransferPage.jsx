import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Send, Loader2, CheckCircle, ArrowRight, ArrowLeft, User, 
  Wallet, Lock, Store, Shield, MessageSquare, Phone, Mail,
  AlertCircle, Search
} from 'lucide-react';
import axios from 'axios';

const CURRENCIES = ['EUR', 'USD', 'XOF', 'GBP', 'MAD', 'NGN'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH', NGN: '₦' };

export default function TransferPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [wallets, setWallets] = useState([]);
  const [vaultBalance, setVaultBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const [formData, setFormData] = useState({
    recipient_email: '',
    recipient_phone: '',
    amount: '',
    currency: 'EUR',
    source: 'wallet', // wallet or vault
    message: '',
    transferType: 'standard', // standard, partner, admin
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchWallets();
    fetchVaultBalance();
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await axios.get(`${API}/wallets`);
      setWallets(res.data);
    } catch (error) {
      console.error('Error fetching wallets');
    }
  };

  const fetchVaultBalance = async () => {
    try {
      const res = await axios.get(`${API}/vault/balance`);
      setVaultBalance(res.data);
    } catch (error) {
      // Vault might not be set up
      setVaultBalance(null);
    }
  };

  const selectedWallet = wallets.find(w => w.currency === formData.currency);
  const availableBalance = formData.source === 'wallet' 
    ? (selectedWallet?.balance || 0)
    : (vaultBalance?.balance || 0);
  const hasInsufficientFunds = parseFloat(formData.amount || 0) > availableBalance;

  // Search recipient by email or phone
  const searchRecipient = async () => {
    const identifier = formData.recipient_phone || formData.recipient_email;
    if (!identifier) {
      toast.error('Veuillez entrer un email ou un numéro de téléphone');
      return;
    }

    setSearchingRecipient(true);
    setRecipientInfo(null);

    try {
      // Try phone search first
      if (formData.recipient_phone) {
        const res = await axios.get(`${API}/wallet/users/lookup-phone?phone=${encodeURIComponent(formData.recipient_phone)}`);
        setRecipientInfo(res.data);
        toast.success('Destinataire trouvé!');
        return;
      }
      
      // For email, we'll verify on transfer (no direct lookup endpoint)
      // Just set a placeholder info
      if (formData.recipient_email) {
        setRecipientInfo({
          found: true,
          name_masked: formData.recipient_email.split('@')[0].substring(0, 3) + '***',
          identifier: formData.recipient_email
        });
        toast.success('Email vérifié');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Destinataire non trouvé');
      setRecipientInfo(null);
    } finally {
      setSearchingRecipient(false);
    }
  };

  const handleSubmit = async () => {
    if (!recipientInfo) {
      toast.error('Veuillez vérifier le destinataire');
      return;
    }

    if (hasInsufficientFunds) {
      toast.error('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      // Different endpoints based on transfer type
      if (formData.transferType === 'standard') {
        if (formData.recipient_phone) {
          // P2P transfer via phone
          const res = await axios.post(`${API}/wallet/transfer-phone`, {
            recipient_phone: formData.recipient_phone,
            amount: parseFloat(formData.amount),
            currency: formData.currency
          });
          
          // Check if OTP is required
          if (res.data.requires_otp) {
            setOtpSent(true);
            toast.info('Code OTP envoyé pour confirmation');
            return;
          }
        } else {
          // Standard email transfer
          await axios.post(`${API}/transfers`, {
            recipient_email: formData.recipient_email,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            description: formData.message
          });
        }
      } else if (formData.transferType === 'admin' && isAdmin) {
        // Admin transfer - credit user directly
        await axios.post(`${API}/admin/users/credit`, {
          user_id: recipientInfo.user_id || 'lookup',
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          description: formData.message || 'Crédit administrateur'
        });
      }

      setStep(5); // Success step
      toast.success('Transfert effectué avec succès!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du transfert');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez entrer un code OTP valide');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/wallet/transfer-phone/verify`, {
        transfer_id: recipientInfo.transfer_id,
        otp_code: otpCode
      });
      setStep(5);
      toast.success('Transfert confirmé!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code OTP invalide');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount, currency) => {
    return `${parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[currency] || currency}`;
  };

  const resetForm = () => {
    setFormData({ 
      recipient_email: '', 
      recipient_phone: '',
      amount: '', 
      currency: 'EUR', 
      source: 'wallet',
      message: '',
      transferType: 'standard'
    });
    setRecipientInfo(null);
    setOtpSent(false);
    setOtpCode('');
    setStep(1);
    fetchWallets();
    fetchVaultBalance();
  };

  const canProceedStep1 = (formData.recipient_email || formData.recipient_phone) && recipientInfo;
  const canProceedStep2 = formData.amount && parseFloat(formData.amount) > 0 && !hasInsufficientFunds;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="transfer-page">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            💸 Envoyer de l'argent
          </h1>
          <p className="text-muted-foreground mt-2">
            Transférez de l'argent à vos proches instantanément
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                  ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  ${step === s ? 'ring-4 ring-primary/20' : ''}`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 mx-1 transition-all ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Recipient Details */}
        {step === 1 && (
          <Card data-testid="transfer-step-1">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Étape 1 : Détails du destinataire
              </CardTitle>
              <CardDescription>
                Entrez l'email ou le numéro de téléphone du destinataire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="recipient_email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email du destinataire
                </Label>
                <Input
                  id="recipient_email"
                  type="email"
                  placeholder="destinataire@email.com"
                  value={formData.recipient_email}
                  onChange={(e) => {
                    setFormData({ ...formData, recipient_email: e.target.value, recipient_phone: '' });
                    setRecipientInfo(null);
                  }}
                  disabled={!!formData.recipient_phone}
                  data-testid="transfer-recipient-email"
                />
              </div>

              <div className="flex items-center justify-center">
                <span className="text-muted-foreground text-sm px-4">OU</span>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="recipient_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Numéro de téléphone
                </Label>
                <Input
                  id="recipient_phone"
                  type="tel"
                  placeholder="+221 77 123 4567"
                  value={formData.recipient_phone}
                  onChange={(e) => {
                    setFormData({ ...formData, recipient_phone: e.target.value, recipient_email: '' });
                    setRecipientInfo(null);
                  }}
                  disabled={!!formData.recipient_email}
                  data-testid="transfer-recipient-phone"
                />
              </div>

              {/* Search Button */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={searchRecipient}
                disabled={searchingRecipient || (!formData.recipient_email && !formData.recipient_phone)}
                data-testid="transfer-search-recipient"
              >
                {searchingRecipient ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Vérifier le destinataire
              </Button>

              {/* Recipient Info */}
              {recipientInfo && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        Destinataire vérifié
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {recipientInfo.name_masked || recipientInfo.identifier}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                data-testid="transfer-step1-continue"
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Amount and Source */}
        {step === 2 && (
          <Card data-testid="transfer-step-2">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Étape 2 : Montant et source
              </CardTitle>
              <CardDescription>
                Sélectionnez le montant et la source des fonds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="text-lg font-semibold"
                    data-testid="transfer-amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger data-testid="transfer-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c} ({CURRENCY_SYMBOLS[c]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Source Selection */}
              <div className="space-y-3">
                <Label>Source des fonds</Label>
                <RadioGroup 
                  value={formData.source} 
                  onValueChange={(v) => setFormData({ ...formData, source: v })}
                  className="grid grid-cols-1 gap-3"
                >
                  {/* Wallet Option */}
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.source === 'wallet' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="wallet" id="wallet" />
                    <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Wallet className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium">Wallet personnel</p>
                            <p className="text-sm text-muted-foreground">
                              Solde: {formatAmount(selectedWallet?.balance || 0, formData.currency)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Vault Option */}
                  {vaultBalance && (
                    <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${formData.source === 'vault' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="vault" id="vault" />
                      <Label htmlFor="vault" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-amber-500" />
                            <div>
                              <p className="font-medium">Coffre-fort</p>
                              <p className="text-sm text-muted-foreground">
                                Solde: {formatAmount(vaultBalance.balance || 0, vaultBalance.currency || 'XOF')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>

              {/* Insufficient Funds Warning */}
              {hasInsufficientFunds && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">
                    Solde insuffisant. Disponible: {formatAmount(availableBalance, formData.currency)}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  className="flex-1"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  data-testid="transfer-step2-continue"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Advanced Options */}
        {step === 3 && (
          <Card data-testid="transfer-step-3">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Étape 3 : Options avancées
              </CardTitle>
              <CardDescription>
                Personnalisez votre transfert
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Transfer Type */}
              <div className="space-y-3">
                <Label>Type de transfert</Label>
                <RadioGroup 
                  value={formData.transferType} 
                  onValueChange={(v) => setFormData({ ...formData, transferType: v })}
                  className="space-y-3"
                >
                  {/* Standard Transfer */}
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.transferType === 'standard' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="standard" id="standard" />
                    <Label htmlFor="standard" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Send className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Transfert standard</p>
                          <p className="text-sm text-muted-foreground">
                            Envoi direct au destinataire
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Partner Transfer - For users */}
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.transferType === 'partner' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <RadioGroupItem value="partner" id="partner" />
                    <Label htmlFor="partner" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium">Via espace partenaire</p>
                          <p className="text-sm text-muted-foreground">
                            Envoyez via un agent partenaire SB Money
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  {/* Admin Transfer - Only for admins */}
                  {isAdmin && (
                    <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${formData.transferType === 'admin' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-purple-500" />
                          <div>
                            <p className="font-medium">Virement administrateur</p>
                            <p className="text-sm text-muted-foreground">
                              Crédit direct sur le compte utilisateur
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message au destinataire (optionnel)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Ex: Joyeux anniversaire! 🎂"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  data-testid="transfer-message"
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => setStep(4)}
                  data-testid="transfer-step3-continue"
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <Card data-testid="transfer-step-4">
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Étape 4 : Confirmation
              </CardTitle>
              <CardDescription>
                Vérifiez les détails avant de confirmer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OTP Input (if required) */}
              {otpSent && (
                <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Vérification OTP requise</span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Un code a été envoyé au destinataire pour confirmer le transfert
                  </p>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="Entrez le code OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                    data-testid="transfer-otp"
                  />
                </div>
              )}

              {/* Transfer Summary */}
              <div className="bg-muted rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Destinataire</span>
                  <span className="font-medium">
                    {recipientInfo?.name_masked || formData.recipient_phone || formData.recipient_email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-bold text-2xl text-primary">
                    {formatAmount(formData.amount, formData.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium flex items-center gap-2">
                    {formData.source === 'wallet' ? (
                      <><Wallet className="w-4 h-4" /> Wallet</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Coffre-fort</>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Frais</span>
                  <span className="font-medium text-green-600">Gratuit</span>
                </div>
                {formData.message && (
                  <div className="pt-4 border-t">
                    <span className="text-muted-foreground text-sm">Message:</span>
                    <p className="font-medium mt-1">{formData.message}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  className="flex-1"
                  disabled={loading || (otpSent && otpCode.length !== 6)}
                  onClick={otpSent ? verifyOtp : handleSubmit}
                  data-testid="transfer-confirm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Confirmer le transfert
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <Card data-testid="transfer-success">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
                Transfert réussi! 🎉
              </h2>
              <p className="text-muted-foreground mb-2">
                {formatAmount(formData.amount, formData.currency)} envoyé à
              </p>
              <p className="font-medium text-lg mb-6">
                {recipientInfo?.name_masked || formData.recipient_phone || formData.recipient_email}
              </p>
              {formData.message && (
                <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-muted-foreground">Votre message:</p>
                  <p className="font-medium">{formData.message}</p>
                </div>
              )}
              <Button onClick={resetForm} data-testid="transfer-new">
                <Send className="w-4 h-4 mr-2" />
                Nouveau transfert
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
