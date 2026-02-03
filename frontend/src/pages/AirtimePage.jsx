import React, { useState, useEffect, useCallback } from 'react';
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
  Phone, Smartphone, Wifi, CheckCircle, Loader2, 
  Star, History, Plus, Trash2, ChevronRight
} from 'lucide-react';

const CURRENCY_SYMBOLS = { 
  EUR: '€', USD: '$', XOF: 'CFA', XAF: 'CFA', GHS: '₵', NGN: '₦', KES: 'KSh',
  GNF: 'GNF', CDF: 'CDF', TZS: 'TZS', UGX: 'UGX', RWF: 'RWF', ZMW: 'ZMW', MAD: 'MAD'
};

export default function AirtimePage() {
  const [countries, setCountries] = useState([]);
  const [operators, setOperators] = useState([]);
  const [dataPackages, setDataPackages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('credit');
  const [wallets, setWallets] = useState([]);

  // Form state
  const [form, setForm] = useState({
    phone_number: '',
    country: 'SN',
    operator: '',
    amount: '',
    data_package_id: ''
  });

  const [currentConfig, setCurrentConfig] = useState({
    currency: 'XOF',
    quick_amounts: [],
    phone_prefix: '+221'
  });

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await axios.get(`${API}/airtime/countries`);
        setCountries(res.data.countries || []);
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };
    fetchCountries();
  }, []);

  // Fetch operators when country changes
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await axios.get(`${API}/airtime/operators/${form.country}`);
        setOperators(res.data.operators || []);
        setCurrentConfig({
          currency: res.data.currency,
          quick_amounts: res.data.quick_amounts || [],
          phone_prefix: res.data.phone_prefix
        });
        if (res.data.operators?.length > 0) {
          setForm(f => ({ ...f, operator: res.data.operators[0].code }));
        }
      } catch (error) {
        console.error('Error fetching operators:', error);
      }
    };
    if (form.country) {
      fetchOperators();
    }
  }, [form.country]);

  // Fetch data packages when operator changes
  useEffect(() => {
    const fetchPackages = async () => {
      if (!form.country || !form.operator) return;
      try {
        const res = await axios.get(`${API}/airtime/data-packages/${form.country}/${form.operator}`);
        setDataPackages(res.data.packages || []);
      } catch (error) {
        console.error('Error fetching packages:', error);
      }
    };
    fetchPackages();
  }, [form.country, form.operator]);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const [walletsRes, favoritesRes, historyRes] = await Promise.all([
        axios.get(`${API}/wallets`),
        axios.get(`${API}/airtime/favorites`),
        axios.get(`${API}/airtime/history?limit=10`)
      ]);
      setWallets(walletsRes.data || []);
      setFavorites(favoritesRes.data.favorites || []);
      setHistory(historyRes.data.topups || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Get wallet balance
  const getWalletBalance = (currency) => {
    const wallet = wallets.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  // Quick amounts
  const QuickAmounts = ({ onSelect, selectedAmount }) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {currentConfig.quick_amounts.map(amount => (
          <Button
            key={amount}
            type="button"
            variant={parseFloat(selectedAmount) === amount ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(amount.toString())}
            className="text-xs"
          >
            {amount.toLocaleString()} {CURRENCY_SYMBOLS[currentConfig.currency] || currentConfig.currency}
          </Button>
        ))}
      </div>
    );
  };

  // Handle credit top-up
  const handleCreditTopup = async (e) => {
    e.preventDefault();
    if (!form.phone_number || !form.operator || !form.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/airtime/topup`, {
        phone_number: form.phone_number,
        country: form.country,
        operator: form.operator,
        amount: parseFloat(form.amount),
        currency: currentConfig.currency
      });
      setSuccess({ type: 'credit', ...res.data });
      toast.success('Recharge effectuée!');
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle data top-up
  const handleDataTopup = async (e) => {
    e.preventDefault();
    if (!form.phone_number || !form.operator || !form.data_package_id) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/airtime/data-topup`, {
        phone_number: form.phone_number,
        country: form.country,
        operator: form.operator,
        data_package_id: form.data_package_id
      });
      setSuccess({ type: 'data', ...res.data });
      toast.success('Forfait activé!');
      fetchUserData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  // Add favorite
  const addFavorite = async () => {
    if (!form.phone_number || !form.operator) {
      toast.error('Entrez un numéro et sélectionnez un opérateur');
      return;
    }
    try {
      await axios.post(`${API}/airtime/favorites?phone_number=${form.phone_number}&country=${form.country}&operator=${form.operator}`);
      toast.success('Ajouté aux favoris');
      fetchUserData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Remove favorite
  const removeFavorite = async (id) => {
    try {
      await axios.delete(`${API}/airtime/favorites/${id}`);
      toast.success('Supprimé des favoris');
      fetchUserData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Use favorite
  const useFavorite = (fav) => {
    setForm({
      ...form,
      phone_number: fav.phone_number,
      country: fav.country,
      operator: fav.operator
    });
  };

  // Reset
  const resetForm = () => {
    setSuccess(null);
    setForm({
      phone_number: '',
      country: 'SN',
      operator: operators[0]?.code || '',
      amount: '',
      data_package_id: ''
    });
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
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="airtime-success">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {success.type === 'credit' ? 'Recharge effectuée!' : 'Forfait activé!'}
              </h2>
              <p className="text-muted-foreground mb-4">{success.message}</p>
              
              <div className="bg-muted rounded-lg p-4 mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Numéro</span>
                  <span className="font-semibold">{success.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opérateur</span>
                  <span>{success.operator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-bold text-green-600">
                    {success.amount?.toLocaleString()} {success.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-mono text-sm">{success.reference}</span>
                </div>
              </div>

              <Button onClick={resetForm} className="w-full">
                Nouvelle recharge
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6" data-testid="airtime-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Recharge Mobile</h1>
          <p className="text-muted-foreground">Rechargez du crédit ou des forfaits data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-orange-500" />
                  Recharge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="credit" className="flex items-center gap-2" data-testid="tab-credit">
                      <Phone className="w-4 h-4" />
                      Crédit téléphone
                    </TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2" data-testid="tab-data">
                      <Wifi className="w-4 h-4" />
                      Forfait Data
                    </TabsTrigger>
                  </TabsList>

                  {/* Credit Top-up */}
                  <TabsContent value="credit">
                    <form onSubmit={handleCreditTopup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pays</Label>
                          <Select value={form.country} onValueChange={(v) => setForm({...form, country: v, operator: ''})}>
                            <SelectTrigger data-testid="country-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.flag} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Opérateur</Label>
                          <Select value={form.operator} onValueChange={(v) => setForm({...form, operator: v})}>
                            <SelectTrigger data-testid="operator-select">
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map(op => (
                                <SelectItem key={op.code} value={op.code}>
                                  {op.logo} {op.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Numéro de téléphone</Label>
                        <div className="flex gap-2">
                          <Input
                            value={form.phone_number}
                            onChange={(e) => setForm({...form, phone_number: e.target.value})}
                            placeholder={`${currentConfig.phone_prefix} XX XXX XX XX`}
                            className="flex-1"
                            data-testid="phone-input"
                          />
                          <Button type="button" variant="outline" size="icon" onClick={addFavorite} title="Ajouter aux favoris">
                            <Star className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Montant ({currentConfig.currency})</Label>
                        <Input
                          type="number"
                          value={form.amount}
                          onChange={(e) => setForm({...form, amount: e.target.value})}
                          placeholder="1000"
                          data-testid="amount-input"
                        />
                        <QuickAmounts 
                          selectedAmount={form.amount}
                          onSelect={(v) => setForm({...form, amount: v})}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          Solde: {getWalletBalance(currentConfig.currency).toLocaleString()} {CURRENCY_SYMBOLS[currentConfig.currency]}
                        </p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-green-800">Recharge instantanée</p>
                          <p className="text-green-700">Sans frais de rechargement</p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !form.phone_number || !form.amount} data-testid="submit-credit">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
                        Recharger maintenant
                      </Button>
                    </form>
                  </TabsContent>

                  {/* Data Top-up */}
                  <TabsContent value="data">
                    <form onSubmit={handleDataTopup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Pays</Label>
                          <Select value={form.country} onValueChange={(v) => setForm({...form, country: v, operator: ''})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map(c => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.flag} {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Opérateur</Label>
                          <Select value={form.operator} onValueChange={(v) => setForm({...form, operator: v})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map(op => (
                                <SelectItem key={op.code} value={op.code}>
                                  {op.logo} {op.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Numéro de téléphone</Label>
                        <Input
                          value={form.phone_number}
                          onChange={(e) => setForm({...form, phone_number: e.target.value})}
                          placeholder={`${currentConfig.phone_prefix} XX XXX XX XX`}
                          data-testid="phone-input-data"
                        />
                      </div>

                      <div>
                        <Label>Forfait Data</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {dataPackages.map(pkg => (
                            <div
                              key={pkg.id}
                              onClick={() => setForm({...form, data_package_id: pkg.id})}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                form.data_package_id === pkg.id 
                                  ? 'border-orange-500 bg-orange-50' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold">{pkg.data}</p>
                                  <p className="text-xs text-muted-foreground">{pkg.validity}</p>
                                </div>
                                <Badge variant={form.data_package_id === pkg.id ? 'default' : 'secondary'}>
                                  {pkg.price?.toLocaleString()} {CURRENCY_SYMBOLS[currentConfig.currency]}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={submitting || !form.phone_number || !form.data_package_id} data-testid="submit-data">
                        {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                        Activer le forfait
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Favorites */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Numéros favoris
                </CardTitle>
              </CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun favori</p>
                ) : (
                  <div className="space-y-2">
                    {favorites.map(fav => (
                      <div key={fav.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => useFavorite(fav)}
                        >
                          <p className="text-sm font-medium">{fav.nickname || fav.phone_number}</p>
                          <p className="text-xs text-muted-foreground">{fav.operator_name}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFavorite(fav.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Dernières recharges
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune recharge</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.map(h => (
                      <div key={h.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">
                            {h.type === 'airtime' ? <Phone className="w-3 h-3 inline mr-1" /> : <Wifi className="w-3 h-3 inline mr-1" />}
                            {h.phone_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {h.operator_name} • {new Date(h.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {h.amount?.toLocaleString()} {h.currency}
                        </Badge>
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
