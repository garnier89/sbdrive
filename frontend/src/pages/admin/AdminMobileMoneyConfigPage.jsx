import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Globe, Smartphone, Send, ArrowLeftRight, CreditCard, 
  Store, FileText, Search, Plus, Trash2, Settings,
  Check, X, RefreshCw, Loader2, ChevronDown, ChevronRight,
  Zap, Users, TrendingUp, MapPin
} from 'lucide-react';

const SERVICE_ICONS = {
  transfer_p2p: Send,
  transfer_inter: ArrowLeftRight,
  mobile_recharge: Smartphone,
  cash_out: CreditCard,
  merchant_payment: Store,
  bill_payment: FileText
};

const SERVICE_LABELS = {
  transfer_p2p: 'Transfert P2P',
  transfer_inter: 'Inter-opérateurs',
  mobile_recharge: 'Recharge Mobile',
  cash_out: 'Cash-out',
  merchant_payment: 'Paiement Marchand',
  bill_payment: 'Paiement Factures'
};

export default function AdminMobileMoneyConfigPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCountries, setExpandedCountries] = useState({});
  const [showAddCountry, setShowAddCountry] = useState(false);
  const [showAddOperator, setShowAddOperator] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [newCountry, setNewCountry] = useState({
    name: '', code: '', flag_emoji: '', currency: '', currency_symbol: '', phone_prefix: ''
  });
  const [newOperator, setNewOperator] = useState({
    name: '', code: '', ussd_code: '', fees_percent: 1.5
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [countriesRes, statsRes] = await Promise.all([
        axios.get(`${API}/mobile-money-config/countries`),
        axios.get(`${API}/mobile-money-config/stats`)
      ]);
      setCountries(countriesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      // Initialize data if empty
      if (error.response?.status === 404 || countries.length === 0) {
        try {
          await axios.post(`${API}/mobile-money-config/init`);
          const [countriesRes, statsRes] = await Promise.all([
            axios.get(`${API}/mobile-money-config/countries`),
            axios.get(`${API}/mobile-money-config/stats`)
          ]);
          setCountries(countriesRes.data);
          setStats(statsRes.data);
        } catch (initError) {
          toast.error('Erreur lors de l\'initialisation');
        }
      } else {
        toast.error('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeData = async () => {
    try {
      await axios.post(`${API}/mobile-money-config/init`);
      toast.success('Données initialisées avec succès');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'initialisation');
    }
  };

  const toggleCountry = async (countryCode, active) => {
    try {
      await axios.post(`${API}/mobile-money-config/countries/toggle`, {
        country_code: countryCode,
        active: active
      });
      toast.success(`Pays ${active ? 'activé' : 'désactivé'}`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const toggleOperator = async (countryCode, operatorCode, active) => {
    try {
      await axios.post(`${API}/mobile-money-config/operators/toggle`, {
        country_code: countryCode,
        operator_code: operatorCode,
        active: active
      });
      toast.success(`Opérateur ${active ? 'activé' : 'désactivé'}`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const toggleService = async (countryCode, operatorCode, service, active) => {
    try {
      await axios.post(`${API}/mobile-money-config/services/toggle`, {
        country_code: countryCode,
        operator_code: operatorCode,
        service: service,
        active: active
      });
      toast.success(`Service ${active ? 'activé' : 'désactivé'}`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const addCountry = async () => {
    try {
      await axios.post(`${API}/mobile-money-config/countries`, newCountry);
      toast.success('Pays ajouté avec succès');
      setShowAddCountry(false);
      setNewCountry({ name: '', code: '', flag_emoji: '', currency: '', currency_symbol: '', phone_prefix: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    }
  };

  const addOperator = async () => {
    if (!selectedCountry) return;
    try {
      await axios.post(`${API}/mobile-money-config/operators`, {
        country_code: selectedCountry,
        ...newOperator
      });
      toast.success('Opérateur ajouté avec succès');
      setShowAddOperator(false);
      setNewOperator({ name: '', code: '', ussd_code: '', fees_percent: 1.5 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    }
  };

  const deleteOperator = async (countryCode, operatorCode) => {
    if (!confirm('Supprimer cet opérateur ?')) return;
    try {
      await axios.delete(`${API}/mobile-money-config/operators/${countryCode}/${operatorCode}`);
      toast.success('Opérateur supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleExpand = (countryCode) => {
    setExpandedCountries(prev => ({
      ...prev,
      [countryCode]: !prev[countryCode]
    }));
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="admin-mobile-money-config">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Globe className="w-8 h-8 text-orange-500" />
              Mobile Money Afrique
            </h1>
            <p className="text-slate-500 mt-1">
              Gestion des pays, opérateurs et services Mobile Money
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={() => setShowAddCountry(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un pays
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.active_countries}</p>
                    <p className="text-sm text-slate-500">Pays actifs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.active_operators}</p>
                    <p className="text-sm text-slate-500">Opérateurs actifs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Send className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.services_enabled?.transfer_p2p || 0}</p>
                    <p className="text-sm text-slate-500">Transferts P2P</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{stats.services_enabled?.mobile_recharge || 0}</p>
                    <p className="text-sm text-slate-500">Recharges Mobile</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Rechercher un pays..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-orange-200 focus:border-orange-400"
          />
        </div>

        {/* Countries List */}
        {countries.length === 0 ? (
          <Card className="border-orange-100">
            <CardContent className="p-8 text-center">
              <Globe className="w-16 h-16 mx-auto text-orange-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucun pays configuré</h3>
              <p className="text-slate-500 mb-4">Initialisez les données Mobile Money pour commencer</p>
              <Button onClick={initializeData} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Initialiser les données
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCountries.map((country) => (
              <Card key={country.id} className={`border-2 transition-all ${country.active ? 'border-orange-200' : 'border-slate-200 opacity-60'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(country.code)}>
                      {expandedCountries[country.code] ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                      <span className="text-2xl">{country.flag_emoji}</span>
                      <div>
                        <CardTitle className="text-lg">{country.name}</CardTitle>
                        <CardDescription>
                          {country.code} • {country.currency} ({country.currency_symbol}) • {country.operators?.length || 0} opérateurs
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={country.active ? 'default' : 'secondary'} className={country.active ? 'bg-green-500' : ''}>
                        {country.active ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Switch
                        checked={country.active}
                        onCheckedChange={(checked) => toggleCountry(country.code, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>

                {expandedCountries[country.code] && (
                  <CardContent className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-slate-700">Opérateurs Mobile Money</h4>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => { setSelectedCountry(country.code); setShowAddOperator(true); }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>

                    {country.operators?.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">Aucun opérateur configuré</p>
                    ) : (
                      <div className="space-y-4">
                        {country.operators?.map((operator) => (
                          <div 
                            key={operator.code} 
                            className={`p-4 rounded-lg border ${operator.active ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50 border-slate-200'}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Smartphone className={`w-5 h-5 ${operator.active ? 'text-orange-500' : 'text-slate-400'}`} />
                                <div>
                                  <p className="font-semibold text-slate-800">{operator.name}</p>
                                  <p className="text-sm text-slate-500">
                                    Code: {operator.code} • Frais: {operator.fees_percent}%
                                    {operator.ussd_code && ` • USSD: ${operator.ussd_code}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {operator.api_provider || 'demo'}
                                </Badge>
                                <Switch
                                  checked={operator.active}
                                  onCheckedChange={(checked) => toggleOperator(country.code, operator.code, checked)}
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteOperator(country.code, operator.code)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Services Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                              {Object.entries(SERVICE_LABELS).map(([key, label]) => {
                                const Icon = SERVICE_ICONS[key];
                                const isEnabled = operator.services?.[key] ?? false;
                                return (
                                  <button
                                    key={key}
                                    onClick={() => toggleService(country.code, operator.code, key, !isEnabled)}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                                      isEnabled 
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                    }`}
                                  >
                                    <Icon className="w-4 h-4" />
                                    <span className="text-xs text-center">{label}</span>
                                    {isEnabled ? (
                                      <Check className="w-3 h-3 text-green-600" />
                                    ) : (
                                      <X className="w-3 h-3 text-red-400" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Add Country Dialog */}
        <Dialog open={showAddCountry} onOpenChange={setShowAddCountry}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un pays</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau pays pour le Mobile Money
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom du pays</Label>
                  <Input
                    value={newCountry.name}
                    onChange={(e) => setNewCountry({...newCountry, name: e.target.value})}
                    placeholder="Ex: Madagascar"
                  />
                </div>
                <div>
                  <Label>Code ISO</Label>
                  <Input
                    value={newCountry.code}
                    onChange={(e) => setNewCountry({...newCountry, code: e.target.value.toUpperCase()})}
                    placeholder="Ex: MG"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Emoji drapeau</Label>
                  <Input
                    value={newCountry.flag_emoji}
                    onChange={(e) => setNewCountry({...newCountry, flag_emoji: e.target.value})}
                    placeholder="Ex: 🇲🇬"
                  />
                </div>
                <div>
                  <Label>Préfixe téléphone</Label>
                  <Input
                    value={newCountry.phone_prefix}
                    onChange={(e) => setNewCountry({...newCountry, phone_prefix: e.target.value})}
                    placeholder="Ex: +261"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code devise</Label>
                  <Input
                    value={newCountry.currency}
                    onChange={(e) => setNewCountry({...newCountry, currency: e.target.value.toUpperCase()})}
                    placeholder="Ex: MGA"
                  />
                </div>
                <div>
                  <Label>Symbole devise</Label>
                  <Input
                    value={newCountry.currency_symbol}
                    onChange={(e) => setNewCountry({...newCountry, currency_symbol: e.target.value})}
                    placeholder="Ex: Ar"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCountry(false)}>Annuler</Button>
              <Button onClick={addCountry} className="bg-orange-500 hover:bg-orange-600">Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Operator Dialog */}
        <Dialog open={showAddOperator} onOpenChange={setShowAddOperator}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un opérateur</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel opérateur Mobile Money pour {selectedCountry}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Nom de l'opérateur</Label>
                <Input
                  value={newOperator.name}
                  onChange={(e) => setNewOperator({...newOperator, name: e.target.value})}
                  placeholder="Ex: Mvola"
                />
              </div>
              <div>
                <Label>Code unique</Label>
                <Input
                  value={newOperator.code}
                  onChange={(e) => setNewOperator({...newOperator, code: e.target.value.toLowerCase()})}
                  placeholder="Ex: mvola_mg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Code USSD</Label>
                  <Input
                    value={newOperator.ussd_code}
                    onChange={(e) => setNewOperator({...newOperator, ussd_code: e.target.value})}
                    placeholder="Ex: *111#"
                  />
                </div>
                <div>
                  <Label>Frais (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newOperator.fees_percent}
                    onChange={(e) => setNewOperator({...newOperator, fees_percent: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddOperator(false)}>Annuler</Button>
              <Button onClick={addOperator} className="bg-orange-500 hover:bg-orange-600">Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
