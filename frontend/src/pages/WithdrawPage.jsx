import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';
import { 
  ArrowUpCircle, Building2, Smartphone, CreditCard, Clock, 
  CheckCircle, Loader2, AlertCircle, History, ChevronRight,
  Calendar, Repeat, Plus, Trash2, Eye, Download
} from 'lucide-react';

const CURRENCY_SYMBOLS = { 
  EUR: '€', USD: '$', XOF: 'CFA', XAF: 'CFA', GHS: '₵', NGN: '₦', KES: 'KSh',
  GNF: 'GNF', CDF: 'CDF', TZS: 'TZS', UGX: 'UGX', RWF: 'RWF', ZMW: 'ZMW', MAD: 'MAD'
};

// Liste complète des 25 pays africains avec Mobile Money
const COUNTRIES = [
  // Afrique de l'Ouest - Zone UEMOA (XOF)
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', currency: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', currency: 'XOF' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', currency: 'XOF' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', currency: 'XOF' },
  { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', currency: 'XOF' },
  // Afrique de l'Ouest - Hors UEMOA
  { code: 'GN', name: 'Guinée', flag: '🇬🇳', currency: 'GNF' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', currency: 'LRD' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', currency: 'SLL' },
  // Afrique Centrale - Zone CEMAC (XAF)
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', currency: 'XAF' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', currency: 'XAF' },
  { code: 'CG', name: 'Congo-Brazzaville', flag: '🇨🇬', currency: 'XAF' },
  { code: 'CD', name: 'RD Congo', flag: '🇨🇩', currency: 'CDF' },
  // Afrique de l'Est
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', currency: 'TZS' },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', currency: 'UGX' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  // Afrique Australe
  { code: 'ZM', name: 'Zambie', flag: '🇿🇲', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', currency: 'ZWL' },
  // Afrique du Nord
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', currency: 'MAD' }
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const STATUS_LABELS = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Complété',
  failed: 'Échoué',
  cancelled: 'Annulé'
};

export default function WithdrawPage() {
  const [wallets, setWallets] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('bank');
  const [historyTab, setHistoryTab] = useState('withdraw');
  const [withdrawals, setWithdrawals] = useState([]);
  const [scheduledWithdrawals, setScheduledWithdrawals] = useState([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Form states
  const [bankForm, setBankForm] = useState({
    amount: '',
    currency: 'EUR',
    bank_account_id: '',
    iban: '',
    bank_name: ''
  });

  const [mobileForm, setMobileForm] = useState({
    amount: '',
    currency: 'XOF',
    country: 'SN',
    provider: '',
    phone_number: ''
  });

  const [cardForm, setCardForm] = useState({
    amount: '',
    currency: 'EUR',
    card_id: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    amount: '',
    currency: 'EUR',
    method: 'bank',
    frequency: 'monthly',
    start_date: '',
    end_date: ''
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [walletsRes, configRes, historyRes, scheduledRes] = await Promise.all([
        axios.get(`${API}/wallets`),
        axios.get(`${API}/withdrawals/config`),
        axios.get(`${API}/withdrawals/history?limit=20`),
        axios.get(`${API}/withdrawals/scheduled`)
      ]);
      setWallets(walletsRes.data);
      setConfig(configRes.data);
      setWithdrawals(historyRes.data.withdrawals || []);
      setScheduledWithdrawals(scheduledRes.data.scheduled_withdrawals || []);
      
      // Set default currency
      if (configRes.data.currency) {
        setBankForm(f => ({ ...f, currency: configRes.data.currency }));
        setCardForm(f => ({ ...f, currency: configRes.data.currency }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur de chargement');
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
        const res = await axios.get(`${API}/withdrawals/providers/${mobileForm.country}`);
        if (res.data.providers?.length > 0) {
          setMobileForm(f => ({ ...f, provider: res.data.providers[0].code, currency: res.data.currency || 'XOF' }));
        }
        // Update config with new providers
        setConfig(c => c ? { ...c, mobile_money_providers: res.data.providers } : c);
      } catch (error) {
        console.error('Error fetching providers:', error);
      }
    };
    if (mobileForm.country) {
      fetchProviders();
    }
  }, [mobileForm.country]);

  // Get country currency
  const getCountryCurrency = (countryCode) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country?.currency || 'XOF';
  };

  // Get wallet balance
  const getWalletBalance = (currency) => {
    const wallet = wallets.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  // Quick amount selection
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

  // Handle bank withdrawal
  const handleBankWithdrawal = async (e) => {
    e.preventDefault();
    if (!bankForm.amount || parseFloat(bankForm.amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/withdrawals/bank`, {
        amount: parseFloat(bankForm.amount),
        currency: bankForm.currency,
        bank_account_id: bankForm.bank_account_id || null,
        iban: bankForm.iban || null,
        bank_name: bankForm.bank_name || null
      });
      setSuccess({ type: 'bank', ...res.data });
      toast.success('Retrait bancaire initié!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Mobile Money withdrawal
  const handleMobileMoneyWithdrawal = async (e) => {
    e.preventDefault();
    if (!mobileForm.amount || !mobileForm.provider || !mobileForm.phone_number) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/withdrawals/mobile-money`, {
        amount: parseFloat(mobileForm.amount),
        currency: mobileForm.currency,
        country: mobileForm.country,
        provider: mobileForm.provider,
        phone_number: mobileForm.phone_number
      });
      setSuccess({ type: 'mobile_money', ...res.data });
      toast.success('Retrait Mobile Money effectué!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle card withdrawal
  const handleCardWithdrawal = async (e) => {
    e.preventDefault();
    if (!cardForm.amount || parseFloat(cardForm.amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCard = config?.cards?.find(c => c.id === cardForm.card_id);
      const res = await axios.post(`${API}/withdrawals/card`, {
        amount: parseFloat(cardForm.amount),
        currency: cardForm.currency,
        card_id: cardForm.card_id || null,
        card_last4: selectedCard?.last4 || null
      });
      setSuccess({ type: 'card', ...res.data });
      toast.success('Retrait carte initié!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle scheduled withdrawal
  const handleScheduledWithdrawal = async (e) => {
    e.preventDefault();
    if (!scheduleForm.amount || !scheduleForm.start_date) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/withdrawals/scheduled`, {
        amount: parseFloat(scheduleForm.amount),
        currency: scheduleForm.currency,
        method: scheduleForm.method,
        method_details: {},
        frequency: scheduleForm.frequency,
        start_date: scheduleForm.start_date,
        end_date: scheduleForm.end_date || null
      });
      toast.success('Retrait programmé créé!');
      setShowScheduleDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel scheduled withdrawal
  const cancelScheduled = async (id) => {
    try {
      await axios.delete(`${API}/withdrawals/scheduled/${id}`);
      toast.success('Retrait programmé annulé');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Reset form
  const resetForm = () => {
    setSuccess(null);
    setBankForm({ amount: '', currency: config?.currency || 'EUR', bank_account_id: '', iban: '', bank_name: '' });
    setMobileForm({ amount: '', currency: 'XOF', country: 'SN', provider: '', phone_number: '' });
    setCardForm({ amount: '', currency: config?.currency || 'EUR', card_id: '' });
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
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="withdraw-success">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {success.type === 'mobile_money' ? 'Retrait effectué!' : 'Demande soumise!'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {success.message}
              </p>
              
              <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold">{success.amount?.toLocaleString()} {CURRENCY_SYMBOLS[bankForm.currency] || bankForm.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais</span>
                  <span>{success.fees?.toLocaleString()} {CURRENCY_SYMBOLS[bankForm.currency] || bankForm.currency}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Total débité</span>
                  <span className="font-bold">{success.total_debited?.toLocaleString()} {CURRENCY_SYMBOLS[bankForm.currency] || bankForm.currency}</span>
                </div>
                {success.estimated_arrival && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Arrivée estimée</span>
                    <span>{new Date(success.estimated_arrival).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>

              <Button onClick={resetForm} className="w-full">
                Nouveau retrait
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6" data-testid="withdraw-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Retirer des fonds</h1>
            <p className="text-muted-foreground">Choisissez votre méthode de retrait</p>
          </div>
          
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="schedule-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Programmer un retrait
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programmer un retrait</DialogTitle>
                <DialogDescription>
                  Créez un retrait automatique récurrent
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleScheduledWithdrawal} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Montant</Label>
                    <Input
                      type="number"
                      value={scheduleForm.amount}
                      onChange={(e) => setScheduleForm({...scheduleForm, amount: e.target.value})}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label>Devise</Label>
                    <Select value={scheduleForm.currency} onValueChange={(v) => setScheduleForm({...scheduleForm, currency: v})}>
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
                
                <div>
                  <Label>Fréquence</Label>
                  <Select value={scheduleForm.frequency} onValueChange={(v) => setScheduleForm({...scheduleForm, frequency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Une fois</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="biweekly">Bi-mensuel</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={scheduleForm.start_date}
                      onChange={(e) => setScheduleForm({...scheduleForm, start_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Date de fin (optionnel)</Label>
                    <Input
                      type="date"
                      value={scheduleForm.end_date}
                      onChange={(e) => setScheduleForm({...scheduleForm, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Créer le retrait programmé
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main withdrawal form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-orange-500" />
                  Méthode de retrait
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="bank" className="flex items-center gap-2" data-testid="tab-bank">
                      <Building2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Banque</span>
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center gap-2" data-testid="tab-mobile">
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Mobile Money</span>
                    </TabsTrigger>
                    <TabsTrigger value="card" className="flex items-center gap-2" data-testid="tab-card">
                      <CreditCard className="w-4 h-4" />
                      <span className="hidden sm:inline">Carte</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Bank Withdrawal */}
                  <TabsContent value="bank">
                    <form onSubmit={handleBankWithdrawal} className="space-y-4">
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
                            <SelectTrigger data-testid="bank-currency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="XOF">XOF (CFA)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Solde: {getWalletBalance(bankForm.currency).toLocaleString()} {CURRENCY_SYMBOLS[bankForm.currency]}
                          </p>
                        </div>
                      </div>

                      {config?.bank_accounts?.length > 0 ? (
                        <div>
                          <Label>Compte bancaire enregistré</Label>
                          <Select value={bankForm.bank_account_id} onValueChange={(v) => setBankForm({...bankForm, bank_account_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un compte" />
                            </SelectTrigger>
                            <SelectContent>
                              {config.bank_accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.bank_name} - {acc.iban?.slice(-4) || acc.account_number?.slice(-4)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <>
                          <div>
                            <Label>IBAN</Label>
                            <Input
                              value={bankForm.iban}
                              onChange={(e) => setBankForm({...bankForm, iban: e.target.value})}
                              placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                              data-testid="bank-iban"
                            />
                          </div>
                          <div>
                            <Label>Nom de la banque</Label>
                            <Input
                              value={bankForm.bank_name}
                              onChange={(e) => setBankForm({...bankForm, bank_name: e.target.value})}
                              placeholder="Ex: BNP Paribas"
                            />
                          </div>
                        </>
                      )}

                      <div className="bg-orange-50 rounded-lg p-3 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-800">Délai: 1-3 jours ouvrés</p>
                          <p className="text-orange-700">Frais: 1% du montant</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !bankForm.amount} data-testid="bank-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                        Retirer vers compte bancaire
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Mobile Money Withdrawal */}
                  <TabsContent value="mobile">
                    <form onSubmit={handleMobileMoneyWithdrawal} className="space-y-4">
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Solde: {getWalletBalance(getCountryCurrency(mobileForm.country)).toLocaleString()} {CURRENCY_SYMBOLS[getCountryCurrency(mobileForm.country)]}
                          </p>
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
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Transfert instantané</p>
                          <p className="text-green-700">Frais: ~1-1.5% selon l'opérateur</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !mobileForm.amount || !mobileForm.provider} data-testid="mobile-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                        Retirer vers Mobile Money
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Card Withdrawal */}
                  <TabsContent value="card">
                    <form onSubmit={handleCardWithdrawal} className="space-y-4">
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
                            Solde: {getWalletBalance(cardForm.currency).toLocaleString()} {CURRENCY_SYMBOLS[cardForm.currency]}
                          </p>
                        </div>
                      </div>

                      {config?.cards?.length > 0 ? (
                        <div>
                          <Label>Carte</Label>
                          <Select value={cardForm.card_id} onValueChange={(v) => setCardForm({...cardForm, card_id: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une carte" />
                            </SelectTrigger>
                            <SelectContent>
                              {config.cards.map(card => (
                                <SelectItem key={card.id} value={card.id}>
                                  {card.brand?.toUpperCase()} •••• {card.last4}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            Aucune carte enregistrée. Ajoutez une carte dans vos paramètres.
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-800">Délai: 3-5 jours ouvrés</p>
                          <p className="text-blue-700">Frais: 1.5% du montant</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !cardForm.amount} data-testid="card-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                        Retirer vers carte
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar - History */}
          <div className="space-y-4">
            {/* Wallets summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vos soldes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {wallets.slice(0, 3).map(wallet => (
                  <div key={wallet.id} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{wallet.currency}</span>
                    <span className="font-semibold">
                      {wallet.balance.toLocaleString()} {CURRENCY_SYMBOLS[wallet.currency] || wallet.currency}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={historyTab} onValueChange={setHistoryTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="withdraw" className="text-xs">Retraits</TabsTrigger>
                    <TabsTrigger value="scheduled" className="text-xs">Programmés</TabsTrigger>
                  </TabsList>

                  <TabsContent value="withdraw" className="space-y-2 max-h-64 overflow-y-auto">
                    {withdrawals.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun retrait</p>
                    ) : (
                      withdrawals.map(w => (
                        <div key={w.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              {w.type === 'bank' && <Building2 className="w-3 h-3 inline mr-1" />}
                              {w.type === 'mobile_money' && <Smartphone className="w-3 h-3 inline mr-1" />}
                              {w.type === 'card' && <CreditCard className="w-3 h-3 inline mr-1" />}
                              {w.amount?.toLocaleString()} {w.currency}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(w.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Badge className={STATUS_COLORS[w.status]} variant="secondary">
                            {STATUS_LABELS[w.status]}
                          </Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="scheduled" className="space-y-2 max-h-64 overflow-y-auto">
                    {scheduledWithdrawals.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun retrait programmé</p>
                    ) : (
                      scheduledWithdrawals.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Repeat className="w-3 h-3" />
                              {s.amount?.toLocaleString()} {s.currency}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.frequency === 'monthly' && 'Mensuel'}
                              {s.frequency === 'weekly' && 'Hebdomadaire'}
                              {s.frequency === 'biweekly' && 'Bi-mensuel'}
                              {s.frequency === 'once' && 'Une fois'}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => cancelScheduled(s.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
