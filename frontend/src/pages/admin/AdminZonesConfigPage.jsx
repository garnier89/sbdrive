import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Globe, MapPin, Coins, Plus, Edit, Trash2, RefreshCw, Search, 
  Check, X, Bell, CreditCard, Smartphone, ArrowLeftRight, Banknote,
  Receipt, Store, Filter, ChevronDown, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

const SERVICE_ICONS = {
  transfer_p2p: { icon: ArrowLeftRight, label: 'Transfert P2P' },
  transfer_inter: { icon: Globe, label: 'Transfert Inter' },
  mobile_money: { icon: Smartphone, label: 'Mobile Money' },
  mobile_recharge: { icon: Smartphone, label: 'Recharge Mobile' },
  cards: { icon: CreditCard, label: 'Cartes' },
  cash_out: { icon: Banknote, label: 'Cash Out' },
  bill_payment: { icon: Receipt, label: 'Paiement Factures' },
  merchant_payment: { icon: Store, label: 'Paiement Marchand' }
};

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollar US' },
  { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (UEMOA)' },
  { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (CEMAC)' },
  { code: 'GHS', symbol: 'GH₵', name: 'Cedi Ghanéen' },
  { code: 'NGN', symbol: '₦', name: 'Naira Nigérian' },
  { code: 'KES', symbol: 'KSh', name: 'Shilling Kenyan' },
  { code: 'TZS', symbol: 'TSh', name: 'Shilling Tanzanien' },
  { code: 'UGX', symbol: 'USh', name: 'Shilling Ougandais' },
  { code: 'RWF', symbol: 'FRw', name: 'Franc Rwandais' },
  { code: 'MAD', symbol: 'DH', name: 'Dirham Marocain' },
  { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien' },
  { code: 'ZAR', symbol: 'R', name: 'Rand Sud-Africain' },
  { code: 'CDF', symbol: 'FC', name: 'Franc Congolais' },
  { code: 'GNF', symbol: 'FG', name: 'Franc Guinéen' },
  { code: 'MGA', symbol: 'Ar', name: 'Ariary Malgache' },
  { code: 'MUR', symbol: 'Rs', name: 'Roupie Mauricienne' },
  { code: 'KMF', symbol: 'FC', name: 'Franc Comorien' }
];

export default function AdminZonesConfigPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [countries, setCountries] = useState([]);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [expandedCountries, setExpandedCountries] = useState({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    try {
      await axios.post(`${API}/admin/zones-config/init`);
    } catch (error) {
      // Ignore
    }
    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchZones(), fetchCountries()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/zones-config/stats`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchZones = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCountry !== 'all') params.append('country', filterCountry);
      if (filterCurrency !== 'all') params.append('currency', filterCurrency);
      if (filterActive !== 'all') params.append('is_active', filterActive === 'active');
      
      const res = await axios.get(`${API}/admin/zones-config/zones?${params}`);
      setZones(res.data.zones || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchCountries = async () => {
    try {
      const res = await axios.get(`${API}/admin/zones-config/countries`);
      setCountries(res.data.countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleToggleZone = async (zoneId) => {
    try {
      const res = await axios.put(`${API}/admin/zones-config/zones/${zoneId}/toggle`);
      toast.success(res.data.message);
      fetchZones();
      fetchStats();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleService = async (zoneId, serviceName, currentValue) => {
    try {
      const zone = zones.find(z => z.id === zoneId);
      const updatedServices = { ...zone.services, [serviceName]: !currentValue };
      await axios.put(`${API}/admin/zones-config/zones/${zoneId}/services`, updatedServices);
      toast.success('Service mis à jour');
      fetchZones();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveZone = async (data) => {
    try {
      if (editingZone) {
        await axios.put(`${API}/admin/zones-config/zones/${editingZone.id}`, data);
        toast.success('Zone mise à jour');
      } else {
        await axios.post(`${API}/admin/zones-config/zones`, data);
        toast.success('Zone créée');
      }
      setShowZoneDialog(false);
      setEditingZone(null);
      fetchZones();
      fetchStats();
      fetchCountries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) return;
    try {
      await axios.delete(`${API}/admin/zones-config/zones/${zoneId}`);
      toast.success('Zone supprimée');
      fetchZones();
      fetchStats();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleCountryExpand = (country) => {
    setExpandedCountries(prev => ({
      ...prev,
      [country]: !prev[country]
    }));
  };

  // Group zones by country
  const groupedZones = zones.reduce((acc, zone) => {
    const key = zone.country;
    if (!acc[key]) acc[key] = [];
    acc[key].push(zone);
    return acc;
  }, {});

  // Filter grouped zones
  const filteredGroupedZones = Object.entries(groupedZones).filter(([country]) => {
    if (searchQuery) {
      return country.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6" data-testid="admin-zones-config-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Globe className="h-8 w-8 text-orange-500" />
              Configuration des Zones
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les pays, départements, devises et services par zone
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchAllData} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button onClick={() => { setEditingZone(null); setShowZoneDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
              Nouvelle zone
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Globe className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats?.total_zones || 0}</p>
                  <p className="text-sm text-blue-600">Zones totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Check className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats?.active_zones || 0}</p>
                  <p className="text-sm text-green-600">Zones actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats?.dom_tom_count || 0}</p>
                  <p className="text-sm text-purple-600">DOM-TOM</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{Object.keys(stats?.currencies || {}).length}</p>
                  <p className="text-sm text-orange-600">Devises</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un pays..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les pays</SelectItem>
                  {countries.map(c => (
                    <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Devise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes devises</SelectItem>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchZones} variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zones Table */}
        <Card>
          <CardHeader>
            <CardTitle>Zones et Services</CardTitle>
            <CardDescription>
              Cliquez sur un pays pour voir/modifier ses zones et services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredGroupedZones.map(([country, countryZones]) => (
                <div key={country} className="border rounded-lg overflow-hidden">
                  {/* Country Header */}
                  <div 
                    className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleCountryExpand(country)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedCountries[country] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <span className="text-2xl">{countryZones[0]?.flag_emoji}</span>
                      <span className="font-semibold">{country}</span>
                      <Badge variant="outline">{countryZones.length} zone(s)</Badge>
                      <Badge>{countryZones[0]?.currency}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={countryZones.every(z => z.is_active) ? 'default' : 'secondary'}>
                        {countryZones.filter(z => z.is_active).length}/{countryZones.length} actives
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Country Zones */}
                  {expandedCountries[country] && (
                    <div className="divide-y">
                      {countryZones.map((zone) => (
                        <div key={zone.id} className={`p-4 ${!zone.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Zone Info */}
                            <div className="flex items-center gap-4 min-w-[200px]">
                              <div>
                                <p className="font-medium">
                                  {zone.department || zone.country}
                                  {zone.city && ` - ${zone.city}`}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Coins className="h-3 w-3" />
                                  {zone.currency} ({zone.currency_symbol})
                                  {zone.phone_prefix && (
                                    <span className="ml-2">📞 {zone.phone_prefix}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Services Grid */}
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(SERVICE_ICONS).map(([key, { icon: Icon, label }]) => (
                                <button
                                  key={key}
                                  onClick={() => handleToggleService(zone.id, key, zone.services?.[key])}
                                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                                    zone.services?.[key] 
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                  title={label}
                                >
                                  <Icon className="h-3 w-3" />
                                  <span className="hidden sm:inline">{zone.services?.[key] ? '✓' : '✗'}</span>
                                </button>
                              ))}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleService(zone.id, 'notifications', zone.notifications_enabled)}
                                className={`p-2 rounded ${zone.notifications_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                                title="Notifications"
                              >
                                <Bell className="h-4 w-4" />
                              </button>
                              <Switch
                                checked={zone.is_active}
                                onCheckedChange={() => handleToggleZone(zone.id)}
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => { setEditingZone(zone); setShowZoneDialog(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteZone(zone.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {filteredGroupedZones.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune zone trouvée
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Légende des services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(SERVICE_ICONS).map(([key, { icon: Icon, label }]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Zone Dialog */}
        <ZoneDialog
          open={showZoneDialog}
          onClose={() => { setShowZoneDialog(false); setEditingZone(null); }}
          onSave={handleSaveZone}
          editingZone={editingZone}
          countries={countries}
        />
      </div>
    </DashboardLayout>
  );
}

function ZoneDialog({ open, onClose, onSave, editingZone, countries }) {
  const [formData, setFormData] = useState({
    country: '',
    country_code: '',
    department: '',
    city: '',
    currency: 'EUR',
    currency_symbol: '€',
    additional_currencies: [],
    phone_prefix: '',
    timezone: '',
    flag_emoji: '',
    notifications_enabled: true,
    is_active: true,
    services: {
      transfer_p2p: true,
      transfer_inter: true,
      mobile_money: true,
      mobile_recharge: true,
      cards: true,
      cash_out: true,
      bill_payment: true,
      merchant_payment: true
    }
  });

  useEffect(() => {
    if (editingZone) {
      setFormData({
        country: editingZone.country || '',
        country_code: editingZone.country_code || '',
        department: editingZone.department || '',
        city: editingZone.city || '',
        currency: editingZone.currency || 'EUR',
        currency_symbol: editingZone.currency_symbol || '€',
        additional_currencies: editingZone.additional_currencies || [],
        phone_prefix: editingZone.phone_prefix || '',
        timezone: editingZone.timezone || '',
        flag_emoji: editingZone.flag_emoji || '',
        notifications_enabled: editingZone.notifications_enabled !== false,
        is_active: editingZone.is_active !== false,
        services: editingZone.services || {
          transfer_p2p: true,
          transfer_inter: true,
          mobile_money: true,
          mobile_recharge: true,
          cards: true,
          cash_out: true,
          bill_payment: true,
          merchant_payment: true
        }
      });
    } else {
      setFormData({
        country: '',
        country_code: '',
        department: '',
        city: '',
        currency: 'EUR',
        currency_symbol: '€',
        additional_currencies: [],
        phone_prefix: '',
        timezone: '',
        flag_emoji: '',
        notifications_enabled: true,
        is_active: true,
        services: {
          transfer_p2p: true,
          transfer_inter: true,
          mobile_money: true,
          mobile_recharge: true,
          cards: true,
          cash_out: true,
          bill_payment: true,
          merchant_payment: true
        }
      });
    }
  }, [editingZone, open]);

  const handleCurrencyChange = (code) => {
    const currency = CURRENCIES.find(c => c.code === code);
    setFormData({
      ...formData,
      currency: code,
      currency_symbol: currency?.symbol || code
    });
  };

  const handleSubmit = () => {
    if (!formData.country || !formData.country_code) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingZone ? 'Modifier la zone' : 'Nouvelle zone'}</DialogTitle>
          <DialogDescription>
            Configurez les paramètres de la zone géographique
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Location */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localisation
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pays *</Label>
                <Input 
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  placeholder="ex: France, Sénégal"
                />
              </div>
              <div className="space-y-2">
                <Label>Code pays *</Label>
                <Input 
                  value={formData.country_code}
                  onChange={(e) => setFormData({...formData, country_code: e.target.value.toUpperCase()})}
                  placeholder="ex: FR, SN"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Département / Région</Label>
                <Input 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  placeholder="ex: Martinique, Métropole"
                />
              </div>
              <div className="space-y-2">
                <Label>Ville (optionnel)</Label>
                <Input 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="ex: Dakar, Fort-de-France"
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji drapeau</Label>
                <Input 
                  value={formData.flag_emoji}
                  onChange={(e) => setFormData({...formData, flag_emoji: e.target.value})}
                  placeholder="🇫🇷"
                />
              </div>
              <div className="space-y-2">
                <Label>Préfixe téléphone</Label>
                <Input 
                  value={formData.phone_prefix}
                  onChange={(e) => setFormData({...formData, phone_prefix: e.target.value})}
                  placeholder="+33"
                />
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Devise
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Devise principale</Label>
                <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} ({c.symbol}) - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Symbole</Label>
                <Input 
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({...formData, currency_symbol: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="font-medium">Services actifs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(SERVICE_ICONS).map(([key, { icon: Icon, label }]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <Switch
                    checked={formData.services[key]}
                    onCheckedChange={(v) => setFormData({
                      ...formData,
                      services: {...formData.services, [key]: v}
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Paramètres</h4>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span>Notifications activées</span>
              </div>
              <Switch
                checked={formData.notifications_enabled}
                onCheckedChange={(v) => setFormData({...formData, notifications_enabled: v})}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>Zone active</span>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({...formData, is_active: v})}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            {editingZone ? 'Mettre à jour' : 'Créer la zone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
