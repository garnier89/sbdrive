import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Percent, Plus, Edit, Trash2, RefreshCw, Calculator, 
  TrendingUp, Layers, Globe, CreditCard, Smartphone, Building2,
  ArrowRightLeft, ChevronRight, DollarSign, PiggyBank
} from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

const TRANSACTION_TYPES = [
  { value: 'deposit', label: 'Dépôt', icon: '📥' },
  { value: 'withdraw', label: 'Retrait', icon: '📤' },
  { value: 'transfer', label: 'Transfert', icon: '🔄' },
  { value: 'card_payment', label: 'Paiement Carte', icon: '💳' },
  { value: 'recharge', label: 'Recharge', icon: '📱' },
  { value: 'mobile_money', label: 'Mobile Money', icon: '📲' }
];

const PAYMENT_METHODS = [
  { value: 'card', label: 'Carte Bancaire' },
  { value: 'bank', label: 'Virement Bancaire' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange', label: 'Orange Money' },
  { value: 'mtn', label: 'MTN Money' },
  { value: 'internal', label: 'Interne' },
  { value: 'international', label: 'International' }
];

const CURRENCIES = ['EUR', 'XOF', 'XAF', 'USD', 'GHS', 'NGN', 'KES'];

export default function AdminCommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState([]);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [activeTab, setActiveTab] = useState('rules');
  
  // Filters
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    try {
      await axios.post(`${API}/admin/commissions/init`);
    } catch (error) {}
    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchRules()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/commissions/stats`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('transaction_type', filterType);
      
      const res = await axios.get(`${API}/admin/commissions/rules?${params}`);
      setRules(res.data.rules || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const handleSaveRule = async (data) => {
    try {
      if (editingRule) {
        await axios.put(`${API}/admin/commissions/rules/${editingRule.id}`, data);
        toast.success('Règle mise à jour');
      } else {
        await axios.post(`${API}/admin/commissions/rules`, data);
        toast.success('Règle créée');
      }
      setShowRuleDialog(false);
      setEditingRule(null);
      fetchRules();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      await axios.put(`${API}/admin/commissions/rules/${ruleId}/toggle`);
      toast.success('Statut modifié');
      fetchRules();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Supprimer cette règle ?')) return;
    try {
      await axios.delete(`${API}/admin/commissions/rules/${ruleId}`);
      toast.success('Règle supprimée');
      fetchRules();
      fetchStats();
    } catch (error) {
      toast.error('Erreur');
    }
  };

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
      <div className="p-4 md:p-6 lg:p-8 space-y-6" data-testid="admin-commissions-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Percent className="h-8 w-8 text-orange-500" />
              Moteur de Commissions
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les commissions par pays, zone et type de transaction
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCalculator(true)} variant="outline" className="gap-2">
              <Calculator className="h-4 w-4" />
              Simulateur
            </Button>
            <Button onClick={() => { setEditingRule(null); setShowRuleDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4" />
              Nouvelle règle
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats?.active_rules || 0}</p>
                  <p className="text-sm text-green-600">Règles actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats?.dynamic_rate_rules || 0}</p>
                  <p className="text-sm text-blue-600">Tarifs dynamiques</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700">
                    {Object.keys(stats?.by_transaction_type || {}).length}
                  </p>
                  <p className="text-sm text-purple-600">Types couverts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <PiggyBank className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{stats?.total_rules || 0}</p>
                  <p className="text-sm text-orange-600">Total règles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rules">📋 Règles de Commission</TabsTrigger>
            <TabsTrigger value="collected">💰 Commissions Collectées</TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Type de transaction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {TRANSACTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchRules} variant="outline">Filtrer</Button>
            </div>

            {/* Rules Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {TRANSACTION_TYPES.find(t => t.value === rule.transaction_type)?.icon}
                          {rule.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">{rule.description}</CardDescription>
                      </div>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Commission Rate */}
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Commission</span>
                        <div className="text-right">
                          {rule.percentage_fee > 0 && (
                            <Badge variant="secondary">{rule.percentage_fee}%</Badge>
                          )}
                          {rule.fixed_fee > 0 && (
                            <Badge variant="outline" className="ml-1">+{rule.fixed_fee} {rule.currency}</Badge>
                          )}
                        </div>
                      </div>
                      {rule.use_dynamic_rate && (
                        <Badge className="mt-2 bg-purple-500">Tarif par paliers</Badge>
                      )}
                    </div>

                    {/* Scope */}
                    <div className="flex flex-wrap gap-1">
                      {rule.country_code && (
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          {rule.country_code}
                        </Badge>
                      )}
                      {rule.zone_id && (
                        <Badge variant="outline" className="text-xs">
                          Zone: {rule.zone_id}
                        </Badge>
                      )}
                      {rule.payment_method && (
                        <Badge variant="outline" className="text-xs">
                          {rule.payment_method}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{rule.currency}</Badge>
                    </div>

                    {/* Partner Share */}
                    {rule.partner_share_percent > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Part partenaire</span>
                        <Badge className="bg-green-500">{rule.partner_share_percent}%</Badge>
                      </div>
                    )}

                    {/* Tiers Preview */}
                    {rule.use_dynamic_rate && rule.tiers?.length > 0 && (
                      <div className="border-t pt-2">
                        <p className="text-xs font-medium mb-1">Paliers:</p>
                        <div className="space-y-1">
                          {rule.tiers.slice(0, 3).map((tier, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {tier.min_amount.toLocaleString()} - {tier.max_amount?.toLocaleString() || '∞'}
                              </span>
                              <span>{tier.percentage_fee}% + {tier.fixed_fee}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => { setEditingRule(rule); setShowRuleDialog(true); }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {rules.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Aucune règle trouvée
              </div>
            )}
          </TabsContent>

          {/* Collected Tab */}
          <TabsContent value="collected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Commissions Collectées par Devise</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.commissions_collected && Object.keys(stats.commissions_collected).length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.entries(stats.commissions_collected).map(([currency, data]) => (
                      <Card key={currency} className="bg-gradient-to-br from-green-50 to-green-100">
                        <CardContent className="p-4 text-center">
                          <p className="text-3xl font-bold text-green-700">
                            {data.total?.toLocaleString()} {currency}
                          </p>
                          <p className="text-sm text-green-600">{data.transactions} transactions</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune commission collectée pour le moment
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rule Dialog */}
        <RuleDialog
          open={showRuleDialog}
          onClose={() => { setShowRuleDialog(false); setEditingRule(null); }}
          onSave={handleSaveRule}
          editingRule={editingRule}
        />

        {/* Calculator Dialog */}
        <CalculatorDialog
          open={showCalculator}
          onClose={() => setShowCalculator(false)}
        />
      </div>
    </DashboardLayout>
  );
}

// Rule Dialog Component
function RuleDialog({ open, onClose, onSave, editingRule }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    country_code: '',
    zone_id: '',
    transaction_type: 'deposit',
    payment_method: '',
    percentage_fee: 0,
    fixed_fee: 0,
    currency: 'EUR',
    use_dynamic_rate: false,
    tiers: [],
    partner_share_percent: 0,
    is_active: true,
    priority: 10
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name || '',
        description: editingRule.description || '',
        country_code: editingRule.country_code || '',
        zone_id: editingRule.zone_id || '',
        transaction_type: editingRule.transaction_type || 'deposit',
        payment_method: editingRule.payment_method || '',
        percentage_fee: editingRule.percentage_fee || 0,
        fixed_fee: editingRule.fixed_fee || 0,
        currency: editingRule.currency || 'EUR',
        use_dynamic_rate: editingRule.use_dynamic_rate || false,
        tiers: editingRule.tiers || [],
        partner_share_percent: editingRule.partner_share_percent || 0,
        is_active: editingRule.is_active !== false,
        priority: editingRule.priority || 10
      });
    } else {
      setFormData({
        name: '',
        description: '',
        country_code: '',
        zone_id: '',
        transaction_type: 'deposit',
        payment_method: '',
        percentage_fee: 0,
        fixed_fee: 0,
        currency: 'EUR',
        use_dynamic_rate: false,
        tiers: [],
        partner_share_percent: 0,
        is_active: true,
        priority: 10
      });
    }
  }, [editingRule, open]);

  const addTier = () => {
    setFormData({
      ...formData,
      tiers: [...formData.tiers, { min_amount: 0, max_amount: null, percentage_fee: 0, fixed_fee: 0 }]
    });
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...formData.tiers];
    newTiers[index][field] = value;
    setFormData({ ...formData, tiers: newTiers });
  };

  const removeTier = (index) => {
    setFormData({ ...formData, tiers: formData.tiers.filter((_, i) => i !== index) });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.transaction_type) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRule ? 'Modifier la règle' : 'Nouvelle règle de commission'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nom *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Dépôt Mobile Money Afrique"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de transaction *</Label>
              <Select value={formData.transaction_type} onValueChange={(v) => setFormData({ ...formData, transaction_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Code pays (optionnel)</Label>
              <Input
                value={formData.country_code}
                onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                placeholder="ex: CI, FR"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Zone (optionnel)</Label>
              <Input
                value={formData.zone_id}
                onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                placeholder="ex: afrique_ouest"
              />
            </div>
          </div>

          {/* Commission */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Commission %</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.percentage_fee}
                onChange={(e) => setFormData({ ...formData, percentage_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Frais fixes</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.fixed_fee}
                onChange={(e) => setFormData({ ...formData, fixed_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Partner Share */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part partenaire (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.partner_share_percent}
                onChange={(e) => setFormData({ ...formData, partner_share_percent: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Priorité (1=haute)</Label>
              <Input
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
              />
            </div>
          </div>

          {/* Dynamic Rate */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Tarification par paliers</Label>
                <p className="text-xs text-muted-foreground">Commission variable selon le montant</p>
              </div>
              <Switch
                checked={formData.use_dynamic_rate}
                onCheckedChange={(v) => setFormData({ ...formData, use_dynamic_rate: v })}
              />
            </div>

            {formData.use_dynamic_rate && (
              <div className="space-y-3">
                {formData.tiers.map((tier, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-2 bg-muted rounded">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={tier.min_amount}
                      onChange={(e) => updateTier(idx, 'min_amount', parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      placeholder="Max (vide=∞)"
                      value={tier.max_amount || ''}
                      onChange={(e) => updateTier(idx, 'max_amount', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-24"
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="%"
                      value={tier.percentage_fee}
                      onChange={(e) => updateTier(idx, 'percentage_fee', parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                    <span>%</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Fixe"
                      value={tier.fixed_fee}
                      onChange={(e) => updateTier(idx, 'fixed_fee', parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeTier(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTier} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un palier
                </Button>
              </div>
            )}
          </div>

          {/* Active */}
          <div className="flex items-center justify-between">
            <Label>Règle active</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            {editingRule ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Calculator Dialog Component
function CalculatorDialog({ open, onClose }) {
  const [amount, setAmount] = useState(100);
  const [transactionType, setTransactionType] = useState('deposit');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        amount: amount.toString(),
        transaction_type: transactionType,
        currency
      });
      if (paymentMethod) params.append('payment_method', paymentMethod);
      if (countryCode) params.append('country_code', countryCode);

      const res = await axios.get(`${API}/admin/commissions/public/calculate?${params}`);
      setResult(res.data);
    } catch (error) {
      toast.error('Erreur de calcul');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulateur de Commission
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Méthode</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes</SelectItem>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="ex: CI"
                maxLength={2}
              />
            </div>
          </div>

          <Button onClick={calculate} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Calculer'}
          </Button>

          {result && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Montant</span>
                <span className="font-medium">{amount} {currency}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Commission</span>
                <span className="font-bold">{result.commission} {currency}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>{result.total} {currency}</span>
              </div>
              {result.breakdown && (
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  <p>Taux: {result.breakdown.percentage_rate}%</p>
                  <p>Frais fixes: {result.breakdown.fixed_fee}</p>
                  {result.breakdown.partner_share > 0 && (
                    <p>Part partenaire: {result.breakdown.partner_share}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
