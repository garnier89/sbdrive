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
  Shield, Plus, Edit, Trash2, RefreshCw, AlertTriangle,
  User, Users, Building2, CheckCircle, XCircle, Clock,
  TrendingUp, Lock, Unlock, Eye
} from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

const KYC_LEVELS = [
  { level: 0, name: 'Non vérifié', color: 'bg-gray-500' },
  { level: 1, name: 'Basique', color: 'bg-blue-500' },
  { level: 2, name: 'Vérifié', color: 'bg-green-500' },
  { level: 3, name: 'Premium', color: 'bg-purple-500' }
];

const ACTOR_TYPES = [
  { value: 'user', label: 'Utilisateur', icon: User },
  { value: 'partner', label: 'Partenaire', icon: Building2 },
  { value: 'agent', label: 'Agent', icon: Users }
];

const CURRENCIES = ['EUR', 'XOF', 'XAF', 'USD', 'GHS', 'NGN', 'KES'];

const RULE_TYPES = [
  { value: 'velocity', label: 'Vélocité transactions' },
  { value: 'country_change', label: 'Changement de pays' },
  { value: 'device_change', label: 'Nouvel appareil' },
  { value: 'amount_spike', label: 'Montant suspect' },
  { value: 'multiple_cards', label: 'Cartes multiples' }
];

const ACTIONS = [
  { value: 'alert', label: 'Alerte', color: 'bg-yellow-500' },
  { value: 'block', label: 'Blocage', color: 'bg-red-500' },
  { value: 'verify', label: 'Vérification', color: 'bg-blue-500' }
];

export default function AdminLimitsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [riskRules, setRiskRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('profiles');
  
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  
  const [filterKYC, setFilterKYC] = useState('all');
  const [filterCurrency, setFilterCurrency] = useState('all');

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    try {
      await axios.post(`${API}/admin/limits/init`);
    } catch (error) {}
    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchProfiles(), fetchRiskRules(), fetchAlerts()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/limits/stats`);
      setStats(res.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const params = new URLSearchParams();
      if (filterKYC !== 'all') params.append('kyc_level', filterKYC);
      if (filterCurrency !== 'all') params.append('currency', filterCurrency);
      
      const res = await axios.get(`${API}/admin/limits/profiles?${params}`);
      setProfiles(res.data.profiles || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchRiskRules = async () => {
    try {
      const res = await axios.get(`${API}/admin/limits/risk-rules`);
      setRiskRules(res.data.rules || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API}/admin/limits/alerts?limit=20`);
      setAlerts(res.data.alerts || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSaveProfile = async (data) => {
    try {
      if (editingProfile) {
        await axios.put(`${API}/admin/limits/profiles/${editingProfile.id}`, data);
        toast.success('Profil mis à jour');
      } else {
        await axios.post(`${API}/admin/limits/profiles`, data);
        toast.success('Profil créé');
      }
      setShowProfileDialog(false);
      setEditingProfile(null);
      fetchProfiles();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleToggleProfile = async (profileId) => {
    try {
      await axios.put(`${API}/admin/limits/profiles/${profileId}/toggle`);
      toast.success('Statut modifié');
      fetchProfiles();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (!confirm('Supprimer ce profil ?')) return;
    try {
      await axios.delete(`${API}/admin/limits/profiles/${profileId}`);
      toast.success('Profil supprimé');
      fetchProfiles();
      fetchStats();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleSaveRule = async (data) => {
    try {
      if (editingRule) {
        await axios.put(`${API}/admin/limits/risk-rules/${editingRule.id}`, data);
        toast.success('Règle mise à jour');
      } else {
        await axios.post(`${API}/admin/limits/risk-rules`, data);
        toast.success('Règle créée');
      }
      setShowRuleDialog(false);
      setEditingRule(null);
      fetchRiskRules();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleToggleRule = async (ruleId) => {
    try {
      await axios.put(`${API}/admin/limits/risk-rules/${ruleId}/toggle`);
      fetchRiskRules();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
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
      <div className="p-4 md:p-6 lg:p-8 space-y-6" data-testid="admin-limits-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-orange-500" />
              Limites & Anti-Fraude
            </h1>
            <p className="text-muted-foreground mt-1">
              Plafonds par KYC et règles de sécurité
            </p>
          </div>
          <Button onClick={fetchAllData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{stats?.active_profiles || 0}</p>
                  <p className="text-sm text-blue-600">Profils actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Lock className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats?.active_risk_rules || 0}</p>
                  <p className="text-sm text-purple-600">Règles anti-fraude</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{stats?.alerts_today || 0}</p>
                  <p className="text-sm text-yellow-600">Alertes aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-700">{stats?.blocked_today || 0}</p>
                  <p className="text-sm text-red-600">Blocages aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profiles">📊 Profils de Limites</TabsTrigger>
            <TabsTrigger value="rules">🛡️ Règles Anti-Fraude</TabsTrigger>
            <TabsTrigger value="alerts">⚠️ Alertes</TabsTrigger>
          </TabsList>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex gap-4">
                <Select value={filterKYC} onValueChange={setFilterKYC}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Niveau KYC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous niveaux</SelectItem>
                    {KYC_LEVELS.map(k => (
                      <SelectItem key={k.level} value={k.level.toString()}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={fetchProfiles} variant="outline">Filtrer</Button>
              </div>
              <Button onClick={() => { setEditingProfile(null); setShowProfileDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4" />
                Nouveau profil
              </Button>
            </div>

            {/* KYC Levels Overview */}
            <div className="grid md:grid-cols-4 gap-4">
              {KYC_LEVELS.map(kyc => (
                <Card key={kyc.level} className="border-l-4" style={{ borderLeftColor: kyc.color.replace('bg-', '#') }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge className={kyc.color}>{kyc.level}</Badge>
                      <span className="font-medium">{kyc.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {profiles.filter(p => p.kyc_level === kyc.level).length} profils
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Profiles Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile) => {
                const kyc = KYC_LEVELS.find(k => k.level === profile.kyc_level);
                const ActorIcon = ACTOR_TYPES.find(a => a.value === profile.actor_type)?.icon || User;
                
                return (
                  <Card key={profile.id} className={!profile.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ActorIcon className="h-5 w-5" />
                            {profile.name}
                          </CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge className={kyc?.color || 'bg-gray-500'}>KYC {profile.kyc_level}</Badge>
                            <Badge variant="outline">{profile.currency}</Badge>
                          </div>
                        </div>
                        <Switch
                          checked={profile.is_active}
                          onCheckedChange={() => handleToggleProfile(profile.id)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Par transaction</p>
                          <p className="font-bold">{formatAmount(profile.per_transaction_limit, profile.currency)}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Journalier</p>
                          <p className="font-bold">{formatAmount(profile.daily_limit, profile.currency)}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Hebdomadaire</p>
                          <p className="font-bold">{formatAmount(profile.weekly_limit, profile.currency)}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground text-xs">Mensuel</p>
                          <p className="font-bold">{formatAmount(profile.monthly_limit, profile.currency)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingProfile(profile); setShowProfileDialog(true); }}>
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleDeleteProfile(profile.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Risk Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingRule(null); setShowRuleDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4" />
                Nouvelle règle
              </Button>
            </div>

            <div className="space-y-3">
              {riskRules.map((rule) => {
                const actionStyle = ACTIONS.find(a => a.value === rule.action);
                
                return (
                  <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{rule.name}</h4>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">
                                {RULE_TYPES.find(r => r.value === rule.rule_type)?.label || rule.rule_type}
                              </Badge>
                              <Badge variant="outline">Seuil: {rule.threshold}</Badge>
                              <Badge variant="outline">{rule.time_window_minutes} min</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={actionStyle?.color}>{actionStyle?.label}</Badge>
                          <Switch checked={rule.is_active} onCheckedChange={() => handleToggleRule(rule.id)} />
                          <Button variant="ghost" size="icon" onClick={() => { setEditingRule(rule); setShowRuleDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertes récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className={`h-5 w-5 ${alert.action_taken === 'block' ? 'text-red-500' : 'text-yellow-500'}`} />
                          <div>
                            <p className="font-medium">{alert.rule_name}</p>
                            <p className="text-sm text-muted-foreground">User: {alert.user_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={ACTIONS.find(a => a.value === alert.action_taken)?.color}>
                            {alert.action_taken}
                          </Badge>
                          {alert.resolved ? (
                            <Badge variant="outline" className="text-green-600">Résolu</Badge>
                          ) : (
                            <Button size="sm" variant="outline">Résoudre</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucune alerte récente</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Profile Dialog */}
        <ProfileDialog
          open={showProfileDialog}
          onClose={() => { setShowProfileDialog(false); setEditingProfile(null); }}
          onSave={handleSaveProfile}
          editingProfile={editingProfile}
        />

        {/* Rule Dialog */}
        <RuleDialog
          open={showRuleDialog}
          onClose={() => { setShowRuleDialog(false); setEditingRule(null); }}
          onSave={handleSaveRule}
          editingRule={editingRule}
        />
      </div>
    </DashboardLayout>
  );
}

function ProfileDialog({ open, onClose, onSave, editingProfile }) {
  const [formData, setFormData] = useState({
    name: '', description: '', country_code: '', zone_id: '',
    kyc_level: 0, actor_type: 'user', currency: 'EUR',
    per_transaction_limit: 100, daily_limit: 500, weekly_limit: 2000, monthly_limit: 5000,
    is_active: true
  });

  useEffect(() => {
    if (editingProfile) {
      setFormData({ ...editingProfile });
    } else {
      setFormData({
        name: '', description: '', country_code: '', zone_id: '',
        kyc_level: 0, actor_type: 'user', currency: 'EUR',
        per_transaction_limit: 100, daily_limit: 500, weekly_limit: 2000, monthly_limit: 5000,
        is_active: true
      });
    }
  }, [editingProfile, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingProfile ? 'Modifier le profil' : 'Nouveau profil de limites'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Niveau KYC</Label>
              <Select value={formData.kyc_level.toString()} onValueChange={(v) => setFormData({...formData, kyc_level: parseInt(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KYC_LEVELS.map(k => <SelectItem key={k.level} value={k.level.toString()}>{k.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.actor_type} onValueChange={(v) => setFormData({...formData, actor_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTOR_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Par transaction</Label>
              <Input type="number" value={formData.per_transaction_limit} onChange={(e) => setFormData({...formData, per_transaction_limit: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Journalier</Label>
              <Input type="number" value={formData.daily_limit} onChange={(e) => setFormData({...formData, daily_limit: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Hebdomadaire</Label>
              <Input type="number" value={formData.weekly_limit} onChange={(e) => setFormData({...formData, weekly_limit: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Mensuel</Label>
              <Input type="number" value={formData.monthly_limit} onChange={(e) => setFormData({...formData, monthly_limit: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(formData)} className="bg-orange-500 hover:bg-orange-600">
            {editingProfile ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({ open, onClose, onSave, editingRule }) {
  const [formData, setFormData] = useState({
    name: '', description: '', rule_type: 'velocity',
    threshold: 5, time_window_minutes: 60, action: 'alert', is_active: true
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({ ...editingRule });
    } else {
      setFormData({
        name: '', description: '', rule_type: 'velocity',
        threshold: 5, time_window_minutes: 60, action: 'alert', is_active: true
      });
    }
  }, [editingRule, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingRule ? 'Modifier la règle' : 'Nouvelle règle anti-fraude'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type de règle</Label>
              <Select value={formData.rule_type} onValueChange={(v) => setFormData({...formData, rule_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={formData.action} onValueChange={(v) => setFormData({...formData, action: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seuil</Label>
              <Input type="number" value={formData.threshold} onChange={(e) => setFormData({...formData, threshold: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Fenêtre (min)</Label>
              <Input type="number" value={formData.time_window_minutes} onChange={(e) => setFormData({...formData, time_window_minutes: parseInt(e.target.value)})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(formData)} className="bg-orange-500 hover:bg-orange-600">
            {editingRule ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
