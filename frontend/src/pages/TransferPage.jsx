import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';
import { 
  Send, Users, Smartphone, Globe, CheckCircle, Loader2, 
  ArrowRight, History, Calculator, RefreshCw
} from 'lucide-react';

const CURRENCY_SYMBOLS = { 
  EUR: '€', USD: '$', XOF: 'CFA', XAF: 'CFA', GHS: '₵', NGN: '₦', KES: 'KSh',
  GNF: 'GNF', CDF: 'CDF', TZS: 'TZS', UGX: 'UGX', RWF: 'RWF', ZMW: 'ZMW', MAD: 'MAD'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  pending: 'En attente',
  processing: 'En cours',
  completed: 'Complété',
  failed: 'Échoué'
};

export default function TransferPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('p2p');
  const [transfers, setTransfers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [exchangeInfo, setExchangeInfo] = useState(null);

  // P2P form
  const [p2pForm, setP2pForm] = useState({
    recipient_identifier: '',
    amount: '',
    currency: 'EUR',
    note: ''
  });

  // Mobile Money form
  const [mobileForm, setMobileForm] = useState({
    phone_number: '',
    recipient_name: '',
    country: 'SN',
    provider: '',
    amount: '',
    currency: 'XOF',
    note: ''
  });

  // International form
  const [intlForm, setIntlForm] = useState({
    recipient_name: '',
    recipient_country: 'SN',
    amount: '',
    source_currency: 'EUR',
    destination_currency: 'XOF',
    delivery_method: 'mobile_money',
    delivery_details: {
      phone_number: ''
    },
    note: ''
  });

  // Fetch config
  const fetchData = useCallback(async () => {
    try {
      const [configRes, historyRes] = await Promise.all([
        axios.get(`${API}/transfers-v2/config`),
        axios.get(`${API}/transfers-v2/history?limit=10`)
      ]);
      setConfig(configRes.data);
      setTransfers(historyRes.data.transfers || []);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch providers when country changes
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await axios.get(`${API}/transfers-v2/providers/${mobileForm.country}`);
        setProviders(res.data.providers || []);
        setMobileForm(f => ({ 
          ...f, 
          currency: res.data.currency,
          provider: res.data.providers?.[0]?.code || '' 
        }));
      } catch (error) {
        console.error('Error fetching providers:', error);
      }
    };
    if (mobileForm.country) {
      fetchProviders();
    }
  }, [mobileForm.country]);

  // Calculate exchange rate
  const calculateExchange = async () => {
    if (!intlForm.amount || !intlForm.source_currency || !intlForm.destination_currency) return;
    try {
      const res = await axios.get(`${API}/transfers-v2/exchange-rate`, {
        params: {
          from_currency: intlForm.source_currency,
          to_currency: intlForm.destination_currency,
          amount: parseFloat(intlForm.amount)
        }
      });
      setExchangeInfo(res.data);
    } catch (error) {
      console.error('Error calculating exchange:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(calculateExchange, 500);
    return () => clearTimeout(timer);
  }, [intlForm.amount, intlForm.source_currency, intlForm.destination_currency]);

  // Get wallet balance
  const getWalletBalance = (currency) => {
    const wallet = config?.wallets?.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  // Handle P2P transfer
  const handleP2PTransfer = async (e) => {
    e.preventDefault();
    if (!p2pForm.recipient_identifier || !p2pForm.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/transfers-v2/p2p`, {
        recipient_identifier: p2pForm.recipient_identifier,
        amount: parseFloat(p2pForm.amount),
        currency: p2pForm.currency,
        note: p2pForm.note || null
      });
      setSuccess({ type: 'p2p', ...res.data });
      toast.success('Transfert effectué!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Mobile Money transfer
  const handleMobileMoneyTransfer = async (e) => {
    e.preventDefault();
    if (!mobileForm.phone_number || !mobileForm.provider || !mobileForm.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/transfers-v2/mobile-money`, {
        phone_number: mobileForm.phone_number,
        recipient_name: mobileForm.recipient_name || null,
        country: mobileForm.country,
        provider: mobileForm.provider,
        amount: parseFloat(mobileForm.amount),
        currency: mobileForm.currency,
        note: mobileForm.note || null
      });
      setSuccess({ type: 'mobile_money', ...res.data });
      toast.success('Transfert effectué!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle International transfer
  const handleInternationalTransfer = async (e) => {
    e.preventDefault();
    if (!intlForm.recipient_name || !intlForm.amount || !intlForm.delivery_details.phone_number) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/transfers-v2/international`, {
        recipient_name: intlForm.recipient_name,
        recipient_country: intlForm.recipient_country,
        amount: parseFloat(intlForm.amount),
        source_currency: intlForm.source_currency,
        destination_currency: intlForm.destination_currency,
        delivery_method: intlForm.delivery_method,
        delivery_details: intlForm.delivery_details,
        note: intlForm.note || null
      });
      setSuccess({ type: 'international', ...res.data });
      toast.success('Transfert initié!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset
  const resetForm = () => {
    setSuccess(null);
    setP2pForm({ recipient_identifier: '', amount: '', currency: 'EUR', note: '' });
    setMobileForm({ phone_number: '', recipient_name: '', country: 'SN', provider: '', amount: '', currency: 'XOF', note: '' });
    setIntlForm({ recipient_name: '', recipient_country: 'SN', amount: '', source_currency: 'EUR', destination_currency: 'XOF', delivery_method: 'mobile_money', delivery_details: { phone_number: '' }, note: '' });
    setExchangeInfo(null);
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
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="transfer-success">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{success.message}</h2>
              
              <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2">
                {success.recipient && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destinataire</span>
                    <span className="font-semibold">{success.recipient}</span>
                  </div>
                )}
                {success.recipient_phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Numéro</span>
                    <span className="font-semibold">{success.recipient_phone}</span>
                  </div>
                )}
                {success.recipient_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nom</span>
                    <span className="font-semibold">{success.recipient_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant envoyé</span>
                  <span className="font-semibold">
                    {(success.amount || success.source_amount)?.toLocaleString()} {success.currency || success.source_currency}
                  </span>
                </div>
                {success.destination_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant reçu</span>
                    <span className="font-bold text-green-600">
                      {success.destination_amount?.toLocaleString()} {success.destination_currency}
                    </span>
                  </div>
                )}
                {success.fees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais</span>
                    <span>{success.fees?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-mono text-sm">{success.reference}</span>
                </div>
                {success.estimated_delivery && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Délai estimé</span>
                    <span>{success.estimated_delivery}</span>
                  </div>
                )}
              </div>

              <Button onClick={resetForm} className="w-full">
                Nouveau transfert
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6" data-testid="transfer-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Transfert d'argent</h1>
          <p className="text-muted-foreground">Envoyez de l'argent à vos proches</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-orange-500" />
                  Type de transfert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="p2p" className="flex items-center gap-1" data-testid="tab-p2p">
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">Entre utilisateurs</span>
                    </TabsTrigger>
                    <TabsTrigger value="mobile" className="flex items-center gap-1" data-testid="tab-mobile">
                      <Smartphone className="w-4 h-4" />
                      <span className="hidden sm:inline">Mobile Money</span>
                    </TabsTrigger>
                    <TabsTrigger value="international" className="flex items-center gap-1" data-testid="tab-intl">
                      <Globe className="w-4 h-4" />
                      <span className="hidden sm:inline">International</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* P2P Transfer */}
                  <TabsContent value="p2p">
                    <form onSubmit={handleP2PTransfer} className="space-y-4">
                      <div>
                        <Label>Email, téléphone ou ID SBPAYGO</Label>
                        <Input
                          value={p2pForm.recipient_identifier}
                          onChange={(e) => setP2pForm({...p2pForm, recipient_identifier: e.target.value})}
                          placeholder="user@email.com ou +33612345678"
                          data-testid="p2p-recipient"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Montant</Label>
                          <Input
                            type="number"
                            value={p2pForm.amount}
                            onChange={(e) => setP2pForm({...p2pForm, amount: e.target.value})}
                            placeholder="0.00"
                            data-testid="p2p-amount"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Solde: {getWalletBalance(p2pForm.currency).toLocaleString()} {CURRENCY_SYMBOLS[p2pForm.currency]}
                          </p>
                        </div>
                        <div>
                          <Label>Devise</Label>
                          <Select value={p2pForm.currency} onValueChange={(v) => setP2pForm({...p2pForm, currency: v})}>
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
                        <Label>Note (optionnel)</Label>
                        <Textarea
                          value={p2pForm.note}
                          onChange={(e) => setP2pForm({...p2pForm, note: e.target.value})}
                          placeholder="Message pour le destinataire..."
                          rows={2}
                        />
                      </div>

                      <div className="bg-green-50 rounded-lg p-3 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Transfert gratuit</p>
                          <p className="text-green-700">Aucun frais entre utilisateurs SBPAYGO</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting} data-testid="p2p-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Envoyer
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Mobile Money Transfer */}
                  <TabsContent value="mobile">
                    <form onSubmit={handleMobileMoneyTransfer} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pays</Label>
                          <Select value={mobileForm.country} onValueChange={(v) => setMobileForm({...mobileForm, country: v})}>
                            <SelectTrigger data-testid="mobile-country">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {config?.supported_countries?.map(c => (
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
                              {providers.map(p => (
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
                          <Label>Numéro de téléphone</Label>
                          <Input
                            value={mobileForm.phone_number}
                            onChange={(e) => setMobileForm({...mobileForm, phone_number: e.target.value})}
                            placeholder="+221 77 XXX XX XX"
                            data-testid="mobile-phone"
                          />
                        </div>
                        <div>
                          <Label>Nom du destinataire (optionnel)</Label>
                          <Input
                            value={mobileForm.recipient_name}
                            onChange={(e) => setMobileForm({...mobileForm, recipient_name: e.target.value})}
                            placeholder="Nom complet"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Montant ({mobileForm.currency})</Label>
                        <Input
                          type="number"
                          value={mobileForm.amount}
                          onChange={(e) => setMobileForm({...mobileForm, amount: e.target.value})}
                          placeholder="5000"
                          data-testid="mobile-amount"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Solde: {getWalletBalance(mobileForm.currency).toLocaleString()} {CURRENCY_SYMBOLS[mobileForm.currency]}
                        </p>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3 flex items-start gap-3">
                        <Smartphone className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-800">Transfert instantané</p>
                          <p className="text-orange-700">Frais: 1.5% du montant</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting} data-testid="mobile-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}
                        Transférer
                      </Button>
                    </form>
                  </TabsContent>

                  {/* International Transfer */}
                  <TabsContent value="international">
                    <form onSubmit={handleInternationalTransfer} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nom du destinataire</Label>
                          <Input
                            value={intlForm.recipient_name}
                            onChange={(e) => setIntlForm({...intlForm, recipient_name: e.target.value})}
                            placeholder="Nom complet"
                            data-testid="intl-name"
                          />
                        </div>
                        <div>
                          <Label>Pays de destination</Label>
                          <Select value={intlForm.recipient_country} onValueChange={(v) => setIntlForm({...intlForm, recipient_country: v, destination_currency: config?.supported_countries?.find(c => c.code === v)?.currency || 'XOF'})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {config?.supported_countries?.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.flag} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Montant envoyé</Label>
                          <Input
                            type="number"
                            value={intlForm.amount}
                            onChange={(e) => setIntlForm({...intlForm, amount: e.target.value})}
                            placeholder="100"
                            data-testid="intl-amount"
                          />
                        </div>
                        <div>
                          <Label>Devise source</Label>
                          <Select value={intlForm.source_currency} onValueChange={(v) => setIntlForm({...intlForm, source_currency: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="XOF">XOF (CFA)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Devise reçue</Label>
                          <Select value={intlForm.destination_currency} onValueChange={(v) => setIntlForm({...intlForm, destination_currency: v})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="XOF">XOF (CFA)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="NGN">NGN (₦)</SelectItem>
                              <SelectItem value="GHS">GHS (₵)</SelectItem>
                              <SelectItem value="KES">KES (KSh)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Exchange rate display */}
                      {exchangeInfo && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{exchangeInfo.amount} {exchangeInfo.from_currency}</p>
                              <p className="text-sm text-muted-foreground">Vous envoyez</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-blue-500" />
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{exchangeInfo.converted_amount?.toLocaleString()} {exchangeInfo.to_currency}</p>
                              <p className="text-sm text-muted-foreground">Reçu</p>
                            </div>
                          </div>
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Taux: 1 {exchangeInfo.from_currency} = {exchangeInfo.rate?.toFixed(4)} {exchangeInfo.to_currency}
                          </p>
                        </div>
                      )}

                      <div>
                        <Label>Numéro Mobile Money du destinataire</Label>
                        <Input
                          value={intlForm.delivery_details.phone_number}
                          onChange={(e) => setIntlForm({...intlForm, delivery_details: { ...intlForm.delivery_details, phone_number: e.target.value }})}
                          placeholder="+221 77 XXX XX XX"
                          data-testid="intl-phone"
                        />
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3 flex items-start gap-3">
                        <Globe className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-purple-800">Transfert international</p>
                          <p className="text-purple-700">Frais: 2.5% + 1€ • Délai: 1-3 jours</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting} data-testid="intl-submit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                        Envoyer à l'international
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
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

            {/* Fees info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Frais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entre utilisateurs</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Gratuit</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mobile Money</span>
                  <span>1.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">International</span>
                  <span>2.5% + 1€</span>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Derniers transferts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transfers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun transfert</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transfers.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1">
                            {t.direction === 'sent' ? (
                              <Send className="w-3 h-3 text-red-500" />
                            ) : (
                              <ArrowRight className="w-3 h-3 text-green-500" />
                            )}
                            {t.recipient_name || t.recipient_phone || t.recipient_identifier || 'Transfert'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${t.direction === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                            {t.direction === 'sent' ? '-' : '+'}{(t.amount || t.source_amount)?.toLocaleString()}
                          </p>
                          <Badge className={STATUS_COLORS[t.status]} variant="secondary">
                            {STATUS_LABELS[t.status]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
