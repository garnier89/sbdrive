import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';
import { 
  ArrowDownCircle, CreditCard, Smartphone, Building2, 
  CheckCircle, Loader2, AlertCircle, History, Copy, 
  Clock, Shield, Zap, ChevronRight
} from 'lucide-react';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', XAF: 'CFA', GHS: '₵', NGN: '₦', KES: 'KSh' };

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  awaiting_transfer: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  pending: 'En attente',
  awaiting_transfer: 'En attente de virement',
  processing: 'En cours',
  completed: 'Complété',
  failed: 'Échoué',
  cancelled: 'Annulé'
};

const COUNTRIES = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', currency: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', currency: 'XOF' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', currency: 'XOF' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' }
];

export default function DepositPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('card');
  const [deposits, setDeposits] = useState([]);
  const [bankTransferInfo, setBankTransferInfo] = useState(null);

  // Card form
  const [cardForm, setCardForm] = useState({
    amount: '',
    currency: 'EUR'
  });

  // Mobile Money form
  const [mobileForm, setMobileForm] = useState({
    amount: '',
    country: 'SN',
    provider: '',
    phone_number: ''
  });

  // Bank transfer form
  const [bankForm, setBankForm] = useState({
    amount: '',
    currency: 'EUR'
  });

  // Get country currency
  const getCountryCurrency = (countryCode) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country?.currency || 'XOF';
  };

  // Fetch config
  const fetchData = useCallback(async () => {
    try {
      const [configRes, historyRes] = await Promise.all([
        axios.get(`${API}/deposits-v2/config`),
        axios.get(`${API}/deposits-v2/history?limit=10`)
      ]);
      setConfig(configRes.data);
      setDeposits(historyRes.data.deposits || []);
      
      if (configRes.data.currency) {
        setCardForm(f => ({ ...f, currency: configRes.data.currency }));
        setBankForm(f => ({ ...f, currency: configRes.data.currency }));
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch mobile providers when country changes
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await axios.get(`${API}/deposits-v2/providers/${mobileForm.country}`);
        if (res.data.providers?.length > 0) {
          setMobileForm(f => ({ ...f, provider: res.data.providers[0].code }));
        }
        // Update config with new providers
        setConfig(c => c ? { ...c, mobile_money_providers: res.data.providers } : c);
      } catch (error) {
        console.error('Error fetching providers:', error);
      }
    };
    fetchProviders();
  }, [mobileForm.country]);

  // Get wallet balance
  const getWalletBalance = (currency) => {
    const wallet = config?.wallets?.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  // Quick amounts
  const QuickAmounts = ({ currency, onSelect, selectedAmount }) => {
    const amounts = config?.quick_amounts || [10, 25, 50, 100, 250, 500];
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {amounts.map(amount => (
          <Button
            key={amount}
            type="button"
            variant={parseFloat(selectedAmount) === amount ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(amount.toString())}
            className="text-xs"
          >
            {amount.toLocaleString()} {CURRENCY_SYMBOLS[currency] || currency}
          </Button>
        ))}
      </div>
    );
  };

  // Handle card deposit (Stripe)
  const handleCardDeposit = async (e) => {
    e.preventDefault();
    if (!cardForm.amount || parseFloat(cardForm.amount) < 1) {
      toast.error('Montant minimum: 1 ' + CURRENCY_SYMBOLS[cardForm.currency]);
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/deposits/checkout`, {
        amount: parseFloat(cardForm.amount),
        currency: cardForm.currency.toLowerCase(),
        origin_url: window.location.origin
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('Erreur lors de la création de la session');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Mobile Money deposit
  const handleMobileMoneyDeposit = async (e) => {
    e.preventDefault();
    if (!mobileForm.amount || !mobileForm.provider || !mobileForm.phone_number) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const currency = getCountryCurrency(mobileForm.country);

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/deposits-v2/mobile-money`, {
        amount: parseFloat(mobileForm.amount),
        currency: currency,
        country: mobileForm.country,
        provider: mobileForm.provider,
        phone_number: mobileForm.phone_number
      });
      setSuccess({ type: 'mobile_money', ...res.data });
      toast.success('Dépôt effectué!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle bank transfer
  const handleBankTransfer = async (e) => {
    e.preventDefault();
    if (!bankForm.amount || parseFloat(bankForm.amount) < 1) {
      toast.error('Montant invalide');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/deposits-v2/bank-transfer`, {
        amount: parseFloat(bankForm.amount),
        currency: bankForm.currency
      });
      setBankTransferInfo(res.data);
      toast.success('Instructions de virement générées');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié!');
  };

  // Reset
  const resetForm = () => {
    setSuccess(null);
    setBankTransferInfo(null);
    setCardForm({ amount: '', currency: config?.currency || 'EUR' });
    setMobileForm({ amount: '', country: 'SN', provider: '', phone_number: '' });
    setBankForm({ amount: '', currency: config?.currency || 'EUR' });
    fetchData();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  // Success screen
  if (success) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="deposit-success">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Dépôt effectué!</h2>
              <p className="text-muted-foreground mb-4">{success.message}</p>
              
              <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold">{success.amount?.toLocaleString()} {success.currency || 'XOF'}</span>
                </div>
                {success.fees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais</span>
                    <span>{success.fees?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Crédité</span>
                  <span className="font-bold text-green-600">{success.net_credited?.toLocaleString()}</span>
                </div>
                {success.provider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Via</span>
                    <span>{success.provider}</span>
                  </div>
                )}
              </div>

              {success.demo_mode && (
                <div className="bg-yellow-50 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Mode démo: crédit instantané
                </div>
              )}

              <Button onClick={resetForm} className="w-full">
                Nouveau dépôt
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Bank transfer instructions
  if (bankTransferInfo) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="bank-transfer-info">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                Instructions de virement
              </CardTitle>
              <CardDescription>
                Effectuez un virement vers le compte SBPAYGO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="font-semibold text-orange-800 mb-2">Montant à transférer</p>
                <p className="text-2xl font-bold text-orange-600">
                  {bankTransferInfo.expected_amount?.toLocaleString()} {CURRENCY_SYMBOLS[bankTransferInfo.currency] || bankTransferInfo.currency}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Banque</p>
                    <p className="font-medium">{bankTransferInfo.bank_info?.bank_name}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Bénéficiaire</p>
                    <p className="font-medium">{bankTransferInfo.bank_info?.account_holder}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">IBAN</p>
                    <p className="font-mono text-sm">{bankTransferInfo.bank_info?.iban}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(bankTransferInfo.bank_info?.iban)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                {bankTransferInfo.bank_info?.bic && (
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                      <p className="font-mono">{bankTransferInfo.bank_info?.bic}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(bankTransferInfo.bank_info?.bic)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex-1">
                    <p className="text-xs text-green-700 font-medium">RÉFÉRENCE (OBLIGATOIRE)</p>
                    <p className="font-mono font-bold text-green-800">{bankTransferInfo.reference}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(bankTransferInfo.reference)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Instructions
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {bankTransferInfo.instructions?.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Retour
                </Button>
                <Button onClick={() => navigate('/dashboard')} className="flex-1">
                  Tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6" data-testid="deposit-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Approvisionner mon compte</h1>
          <p className="text-muted-foreground">Ajoutez des fonds à votre portefeuille SBPAYGO</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main deposit form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-green-500" />
                  Méthode de dépôt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="card" className="flex items-center gap-2" data-testid="tab-card">
                      <CreditCard className="w-4 h-4" />
                      <span className="hidden sm:inline">Carte</span>
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center gap-2" data-testid="tab-mobile">
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Mobile Money</span>
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="flex items-center gap-2" data-testid="tab-bank">
                      <Building2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Virement</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Card Deposit */}
                  <TabsContent value="card">
                    <form onSubmit={handleCardDeposit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Montant *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            value={cardForm.amount}
                            onChange={(e) => setCardForm({...cardForm, amount: e.target.value})}
                            placeholder="0.00"
                            data-testid="card-amount"
                          />
                          <QuickAmounts 
                            currency={cardForm.currency} 
                            selectedAmount={cardForm.amount}
                            onSelect={(v) => setCardForm({...cardForm, amount: v})}
                          />
                        </div>
                        <div>
                          <Label>Devise</Label>
                          <Select value={cardForm.currency} onValueChange={(v) => setCardForm({...cardForm, currency: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Solde actuel: {getWalletBalance(cardForm.currency).toLocaleString()} {CURRENCY_SYMBOLS[cardForm.currency]}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                        <Shield className="w-5 h-5 text-green-600" />
                        <div className="text-sm">
                          <p className="font-medium">Paiement sécurisé par Stripe</p>
                          <p className="text-muted-foreground">Visa, Mastercard, American Express</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !cardForm.amount} data-testid="card-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        Payer par carte
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Mobile Money Deposit */}
                  <TabsContent value="mobile">
                    <form onSubmit={handleMobileMoneyDeposit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pays</Label>
                          <Select value={mobileForm.country} onValueChange={(v) => setMobileForm({...mobileForm, country: v, provider: ''})}>
                            <SelectTrigger data-testid="mobile-country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.flag} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Opérateur</Label>
                          <Select value={mobileForm.provider} onValueChange={(v) => setMobileForm({...mobileForm, provider: v})}>
                            <SelectTrigger data-testid="mobile-provider">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {config?.mobile_money_providers?.map(p => (
                                <SelectItem key={p.code} value={p.code}>
                                  {p.logo} {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Montant ({getCountryCurrency(mobileForm.country)}) *</Label>
                          <Input
                            type="number"
                            value={mobileForm.amount}
                            onChange={(e) => setMobileForm({...mobileForm, amount: e.target.value})}
                            placeholder="5000"
                            data-testid="mobile-amount"
                          />
                        </div>
                        <div>
                          <Label>Numéro de téléphone *</Label>
                          <Input
                            value={mobileForm.phone_number}
                            onChange={(e) => setMobileForm({...mobileForm, phone_number: e.target.value})}
                            placeholder="+221 77 123 45 67"
                            data-testid="mobile-phone"
                          />
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3 flex items-start gap-3">
                        <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Crédit instantané</p>
                          <p className="text-green-700">Frais: 0-0.5% selon l'opérateur</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !mobileForm.amount || !mobileForm.provider} data-testid="mobile-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                        Déposer via Mobile Money
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Bank Transfer */}
                  <TabsContent value="bank">
                    <form onSubmit={handleBankTransfer} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Montant *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="1"
                            value={bankForm.amount}
                            onChange={(e) => setBankForm({...bankForm, amount: e.target.value})}
                            placeholder="0.00"
                            data-testid="bank-amount"
                          />
                          <QuickAmounts 
                            currency={bankForm.currency} 
                            selectedAmount={bankForm.amount}
                            onSelect={(v) => setBankForm({...bankForm, amount: v})}
                          />
                        </div>
                        <div>
                          <Label>Devise</Label>
                          <Select value={bankForm.currency} onValueChange={(v) => setBankForm({...bankForm, currency: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="XOF">XOF (CFA)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-800">Délai: 1-2 jours ouvrés</p>
                          <p className="text-blue-700">Pas de frais de dépôt</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !bankForm.amount} data-testid="bank-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                        Obtenir les coordonnées bancaires
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Wallets */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vos soldes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {config?.wallets?.slice(0, 4).map(wallet => (
                  <div key={wallet.id} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{wallet.currency}</span>
                    <span className="font-semibold">
                      {wallet.balance.toLocaleString()} {CURRENCY_SYMBOLS[wallet.currency] || wallet.currency}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent deposits */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Dépôts récents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                {deposits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun dépôt</p>
                ) : (
                  deposits.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">
                          {d.type === 'mobile_money' && <Smartphone className="w-3 h-3 inline mr-1" />}
                          {d.type === 'card' && <CreditCard className="w-3 h-3 inline mr-1" />}
                          {d.type === 'bank_transfer' && <Building2 className="w-3 h-3 inline mr-1" />}
                          {(d.net_amount || d.amount)?.toLocaleString()} {d.currency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Badge className={STATUS_COLORS[d.status]} variant="secondary">
                        {STATUS_LABELS[d.status]}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
