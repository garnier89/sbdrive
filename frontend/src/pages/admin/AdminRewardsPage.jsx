import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Gift, Star, Trophy, Users, Plus, Edit, Trash2, 
  TrendingUp, Award, Crown, Gem, Medal, Settings,
  RefreshCw, Search, ChevronRight, Zap, Target
} from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

const REWARD_TYPES = [
  { value: 'cashback', label: 'Cashback', icon: '💰' },
  { value: 'discount', label: 'Réduction', icon: '🏷️' },
  { value: 'bonus', label: 'Bonus', icon: '🎁' },
  { value: 'gift', label: 'Cadeau', icon: '🎀' }
];

const ACTION_TYPES = [
  { value: 'transaction', label: 'Transaction' },
  { value: 'referral', label: 'Parrainage' },
  { value: 'registration', label: 'Inscription' },
  { value: 'first_deposit', label: 'Premier dépôt' },
  { value: 'deposit', label: 'Dépôt' },
  { value: 'transfer', label: 'Transfert' },
  { value: 'bill_payment', label: 'Paiement facture' }
];

const TIER_ICONS = {
  bronze: Medal,
  silver: Award,
  gold: Star,
  platinum: Crown,
  diamond: Gem
};

export default function AdminRewardsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    try {
      // Initialize config if needed
      await axios.post(`${API}/admin/rewards/init`);
    } catch (error) {
      // Ignore if already initialized
    }
    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchTiers(),
      fetchOffers(),
      fetchRules(),
      fetchUsers()
    ]);
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/rewards/stats`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTiers = async () => {
    try {
      const res = await axios.get(`${API}/admin/rewards/tiers`);
      setTiers(res.data.tiers || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await axios.get(`${API}/admin/rewards/offers`);
      setOffers(res.data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await axios.get(`${API}/admin/rewards/rules`);
      setRules(res.data.rules || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (tierFilter !== 'all') params.append('tier', tierFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await axios.get(`${API}/admin/rewards/users?${params}`);
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // ==================== OFFER CRUD ====================
  
  const handleSaveOffer = async (data) => {
    try {
      if (editingItem) {
        await axios.put(`${API}/admin/rewards/offers/${editingItem.id}`, data);
        toast.success('Offre mise à jour avec succès');
      } else {
        await axios.post(`${API}/admin/rewards/offers`, data);
        toast.success('Offre créée avec succès');
      }
      setShowOfferDialog(false);
      setEditingItem(null);
      fetchOffers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return;
    try {
      await axios.delete(`${API}/admin/rewards/offers/${offerId}`);
      toast.success('Offre supprimée');
      fetchOffers();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ==================== RULE CRUD ====================
  
  const handleSaveRule = async (data) => {
    try {
      if (editingItem) {
        await axios.put(`${API}/admin/rewards/rules/${editingItem.id}`, data);
        toast.success('Règle mise à jour avec succès');
      } else {
        await axios.post(`${API}/admin/rewards/rules`, data);
        toast.success('Règle créée avec succès');
      }
      setShowRuleDialog(false);
      setEditingItem(null);
      fetchRules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return;
    try {
      await axios.delete(`${API}/admin/rewards/rules/${ruleId}`);
      toast.success('Règle supprimée');
      fetchRules();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ==================== TIER UPDATE ====================
  
  const handleUpdateTier = async (tierId, data) => {
    try {
      await axios.put(`${API}/admin/rewards/tiers/${tierId}`, data);
      toast.success('Niveau mis à jour');
      fetchTiers();
      setShowTierDialog(false);
      setEditingItem(null);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ==================== AWARD POINTS ====================
  
  const handleAwardPoints = async (userId, points, description) => {
    try {
      await axios.post(`${API}/admin/rewards/users/${userId}/award?points=${points}&description=${encodeURIComponent(description)}`);
      toast.success(`${points} points attribués avec succès`);
      setShowAwardDialog(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error('Erreur lors de l\'attribution des points');
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
      <div className="p-4 md:p-6 lg:p-8 space-y-6" data-testid="admin-rewards-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Gift className="h-8 w-8 text-orange-500" />
              Gestion des Récompenses
            </h1>
            <p className="text-muted-foreground mt-1">
              Configurez les niveaux, offres et règles de fidélité
            </p>
          </div>
          <Button onClick={fetchAllData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{stats?.total_users || 0}</p>
                  <p className="text-sm text-orange-600">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{(stats?.total_points_in_circulation || 0).toLocaleString()}</p>
                  <p className="text-sm text-yellow-600">Points en circulation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats?.active_offers || 0}</p>
                  <p className="text-sm text-green-600">Offres actives</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700">{stats?.total_redemptions || 0}</p>
                  <p className="text-sm text-purple-600">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="tiers" className="text-xs md:text-sm">Niveaux</TabsTrigger>
            <TabsTrigger value="offers" className="text-xs md:text-sm">Offres</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs md:text-sm">Règles</TabsTrigger>
            <TabsTrigger value="users" className="text-xs md:text-sm">Utilisateurs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tier Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Répartition par niveau
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats?.tier_distribution || {}).map(([tier, count]) => {
                      const TierIcon = TIER_ICONS[tier] || Medal;
                      const tierConfig = tiers.find(t => t.id === tier);
                      const percentage = stats?.total_users ? ((count / stats.total_users) * 100).toFixed(1) : 0;
                      return (
                        <div key={tier} className="flex items-center gap-3">
                          <TierIcon className="h-5 w-5" style={{ color: tierConfig?.color || '#666' }} />
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="capitalize font-medium">{tierConfig?.name_fr || tier}</span>
                              <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ width: `${percentage}%`, backgroundColor: tierConfig?.color || '#f97316' }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Statistiques Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700">Total points gagnés</span>
                      <span className="font-bold text-green-700">{(stats?.total_points_earned || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700">Total points convertis</span>
                      <span className="font-bold text-orange-700">{(stats?.total_points_redeemed || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700">Points en circulation</span>
                      <span className="font-bold text-blue-700">{(stats?.total_points_in_circulation || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-700">Valeur en €</span>
                      <span className="font-bold text-purple-700">€{((stats?.total_points_in_circulation || 0) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tiers Tab */}
          <TabsContent value="tiers" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier) => {
                const TierIcon = TIER_ICONS[tier.id] || Medal;
                return (
                  <Card key={tier.id} className="relative overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 right-0 h-2"
                      style={{ backgroundColor: tier.color }}
                    />
                    <CardHeader className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TierIcon className="h-8 w-8" style={{ color: tier.color }} />
                          <div>
                            <CardTitle>{tier.name_fr || tier.name}</CardTitle>
                            <CardDescription>{tier.min_points.toLocaleString()} points minimum</CardDescription>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => { setEditingItem(tier); setShowTierDialog(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Taux de cashback</span>
                          <Badge variant="secondary">{tier.cashback_rate}%</Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-sm font-medium">Avantages:</span>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {(tier.benefits || []).slice(0, 3).map((benefit, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <ChevronRight className="h-3 w-3 text-orange-500" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Offres de récompenses</h3>
              <Button onClick={() => { setEditingItem(null); setShowOfferDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <Card key={offer.id} className={!offer.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {REWARD_TYPES.find(t => t.value === offer.reward_type)?.icon || '🎁'}
                          {offer.name}
                        </CardTitle>
                        <CardDescription>{offer.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => { setEditingItem(offer); setShowOfferDialog(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteOffer(offer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Coût</span>
                        <Badge>{offer.points_cost} points</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Valeur</span>
                        <span className="font-medium">
                          {offer.currency === 'PERCENT' ? `${offer.reward_value}%` : `€${offer.reward_value}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Statut</span>
                        <Badge variant={offer.is_active ? 'default' : 'secondary'}>
                          {offer.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      {offer.max_redemptions && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Utilisations</span>
                          <span className="text-sm">{offer.current_redemptions || 0} / {offer.max_redemptions}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Règles d'attribution des points</h3>
              <Button onClick={() => { setEditingItem(null); setShowRuleDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4" />
                Nouvelle règle
              </Button>
            </div>
            
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Target className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-orange-600">+{rule.points_awarded} pts</p>
                          {rule.multiplier > 1 && (
                            <p className="text-xs text-muted-foreground">x{rule.multiplier} multiplicateur</p>
                          )}
                        </div>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {ACTION_TYPES.find(t => t.value === rule.action_type)?.label || rule.action_type}
                        </Badge>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { setEditingItem(rule); setShowRuleDialog(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                  className="pl-10"
                />
              </div>
              <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrer par niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Argent</SelectItem>
                  <SelectItem value="gold">Or</SelectItem>
                  <SelectItem value="platinum">Platine</SelectItem>
                  <SelectItem value="diamond">Diamant</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={fetchUsers} variant="outline">Rechercher</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Utilisateur</th>
                        <th className="text-left p-4 font-medium">Niveau</th>
                        <th className="text-right p-4 font-medium">Points</th>
                        <th className="text-right p-4 font-medium">Total gagné</th>
                        <th className="text-right p-4 font-medium">Parrainages</th>
                        <th className="text-center p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const TierIcon = TIER_ICONS[user.tier] || Medal;
                        const tierConfig = tiers.find(t => t.id === user.tier);
                        return (
                          <tr key={user.user_id} className="border-t hover:bg-muted/30">
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{user.user_name || 'N/A'}</p>
                                <p className="text-sm text-muted-foreground">{user.user_email}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge className="gap-1" style={{ backgroundColor: tierConfig?.color || '#CD7F32', color: '#fff' }}>
                                <TierIcon className="h-3 w-3" />
                                {tierConfig?.name_fr || user.tier}
                              </Badge>
                            </td>
                            <td className="p-4 text-right font-medium">{(user.points || 0).toLocaleString()}</td>
                            <td className="p-4 text-right">{(user.total_earned || 0).toLocaleString()}</td>
                            <td className="p-4 text-right">{user.referral_count || 0}</td>
                            <td className="p-4 text-center">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => { setSelectedUser(user); setShowAwardDialog(true); }}
                              >
                                <Gift className="h-4 w-4 mr-1" />
                                Attribuer
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Aucun utilisateur trouvé
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Offer Dialog */}
        <OfferDialog 
          open={showOfferDialog}
          onClose={() => { setShowOfferDialog(false); setEditingItem(null); }}
          onSave={handleSaveOffer}
          editingItem={editingItem}
        />

        {/* Rule Dialog */}
        <RuleDialog 
          open={showRuleDialog}
          onClose={() => { setShowRuleDialog(false); setEditingItem(null); }}
          onSave={handleSaveRule}
          editingItem={editingItem}
        />

        {/* Tier Dialog */}
        <TierDialog 
          open={showTierDialog}
          onClose={() => { setShowTierDialog(false); setEditingItem(null); }}
          onSave={handleUpdateTier}
          editingItem={editingItem}
        />

        {/* Award Points Dialog */}
        <AwardDialog 
          open={showAwardDialog}
          onClose={() => { setShowAwardDialog(false); setSelectedUser(null); }}
          onAward={handleAwardPoints}
          user={selectedUser}
        />
      </div>
    </DashboardLayout>
  );
}

// ==================== SUB COMPONENTS ====================

function OfferDialog({ open, onClose, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_cost: 100,
    reward_type: 'cashback',
    reward_value: 1,
    currency: 'EUR',
    is_active: true,
    max_redemptions: null,
    conditions: ''
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        points_cost: editingItem.points_cost || 100,
        reward_type: editingItem.reward_type || 'cashback',
        reward_value: editingItem.reward_value || 1,
        currency: editingItem.currency || 'EUR',
        is_active: editingItem.is_active !== false,
        max_redemptions: editingItem.max_redemptions || null,
        conditions: editingItem.conditions || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        points_cost: 100,
        reward_type: 'cashback',
        reward_value: 1,
        currency: 'EUR',
        is_active: true,
        max_redemptions: null,
        conditions: ''
      });
    }
  }, [editingItem, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Modifier l\'offre' : 'Nouvelle offre'}</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Modifiez les détails de l\'offre de récompense' : 'Créez une nouvelle offre de récompense'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="ex: Bonus 10€"
            />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Décrivez l'offre..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Coût en points</Label>
              <Input 
                type="number"
                value={formData.points_cost}
                onChange={(e) => setFormData({...formData, points_cost: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.reward_type} onValueChange={(v) => setFormData({...formData, reward_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valeur</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.reward_value}
                onChange={(e) => setFormData({...formData, reward_value: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="XOF">XOF (FCFA)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="PERCENT">Pourcentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Limite d'utilisation (optionnel)</Label>
            <Input 
              type="number"
              value={formData.max_redemptions || ''}
              onChange={(e) => setFormData({...formData, max_redemptions: e.target.value ? parseInt(e.target.value) : null})}
              placeholder="Illimité si vide"
            />
          </div>
          <div className="space-y-2">
            <Label>Conditions (optionnel)</Label>
            <Input 
              value={formData.conditions}
              onChange={(e) => setFormData({...formData, conditions: e.target.value})}
              placeholder="ex: Réservé aux membres Gold"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Offre active</Label>
            <Switch 
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({...formData, is_active: v})}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            {editingItem ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleDialog({ open, onClose, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    action_type: 'transaction',
    points_awarded: 1,
    multiplier: 1.0,
    min_amount: null,
    max_points_per_day: null,
    is_active: true
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        action_type: editingItem.action_type || 'transaction',
        points_awarded: editingItem.points_awarded || 1,
        multiplier: editingItem.multiplier || 1.0,
        min_amount: editingItem.min_amount || null,
        max_points_per_day: editingItem.max_points_per_day || null,
        is_active: editingItem.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        action_type: 'transaction',
        points_awarded: 1,
        multiplier: 1.0,
        min_amount: null,
        max_points_per_day: null,
        is_active: true
      });
    }
  }, [editingItem, open]);

  const handleSubmit = () => {
    if (!formData.name || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Modifier la règle' : 'Nouvelle règle'}</DialogTitle>
          <DialogDescription>
            {editingItem ? 'Modifiez les paramètres de la règle' : 'Définissez comment les points sont attribués'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="ex: Points par achat"
            />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Décrivez la règle..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type d'action</Label>
              <Select value={formData.action_type} onValueChange={(v) => setFormData({...formData, action_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Points attribués</Label>
              <Input 
                type="number"
                value={formData.points_awarded}
                onChange={(e) => setFormData({...formData, points_awarded: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Multiplicateur</Label>
              <Input 
                type="number"
                step="0.1"
                value={formData.multiplier}
                onChange={(e) => setFormData({...formData, multiplier: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Montant min. (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.min_amount || ''}
                onChange={(e) => setFormData({...formData, min_amount: e.target.value ? parseFloat(e.target.value) : null})}
                placeholder="Aucun"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Max points/jour</Label>
            <Input 
              type="number"
              value={formData.max_points_per_day || ''}
              onChange={(e) => setFormData({...formData, max_points_per_day: e.target.value ? parseInt(e.target.value) : null})}
              placeholder="Illimité si vide"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Règle active</Label>
            <Switch 
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({...formData, is_active: v})}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            {editingItem ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TierDialog({ open, onClose, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    name_fr: '',
    min_points: 0,
    cashback_rate: 0.5,
    color: '#CD7F32',
    benefits: []
  });
  const [newBenefit, setNewBenefit] = useState('');

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name_fr: editingItem.name_fr || editingItem.name || '',
        min_points: editingItem.min_points || 0,
        cashback_rate: editingItem.cashback_rate || 0.5,
        color: editingItem.color || '#CD7F32',
        benefits: editingItem.benefits || []
      });
    }
  }, [editingItem, open]);

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({...formData, benefits: [...formData.benefits, newBenefit.trim()]});
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (idx) => {
    setFormData({...formData, benefits: formData.benefits.filter((_, i) => i !== idx)});
  };

  const handleSubmit = () => {
    onSave(editingItem.id, formData);
  };

  if (!editingItem) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le niveau {editingItem.name}</DialogTitle>
          <DialogDescription>
            Ajustez les paramètres de ce niveau de fidélité
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom (FR)</Label>
            <Input 
              value={formData.name_fr}
              onChange={(e) => setFormData({...formData, name_fr: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Points minimum</Label>
              <Input 
                type="number"
                value={formData.min_points}
                onChange={(e) => setFormData({...formData, min_points: parseInt(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Taux cashback (%)</Label>
              <Input 
                type="number"
                step="0.1"
                value={formData.cashback_rate}
                onChange={(e) => setFormData({...formData, cashback_rate: parseFloat(e.target.value)})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2">
              <Input 
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="w-16 h-10 p-1"
              />
              <Input 
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Avantages</Label>
            <div className="flex gap-2">
              <Input 
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder="Ajouter un avantage..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
              />
              <Button type="button" onClick={handleAddBenefit} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1 mt-2">
              {formData.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted p-2 rounded">
                  <span className="text-sm">{benefit}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveBenefit(idx)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            Mettre à jour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AwardDialog({ open, onClose, onAward, user }) {
  const [points, setPoints] = useState(100);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setPoints(100);
      setDescription('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error('Veuillez entrer une description');
      return;
    }
    onAward(user.user_id, points, description);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attribuer des points</DialogTitle>
          <DialogDescription>
            Attribuez des points bonus à {user.user_name || user.user_email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Utilisateur</p>
            <p className="font-medium">{user.user_name}</p>
            <p className="text-sm text-muted-foreground">{user.user_email}</p>
            <p className="mt-2 text-sm">Points actuels: <span className="font-bold">{(user.points || 0).toLocaleString()}</span></p>
          </div>
          <div className="space-y-2">
            <Label>Points à attribuer</Label>
            <Input 
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value))}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez un nombre négatif pour retirer des points
            </p>
          </div>
          <div className="space-y-2">
            <Label>Raison *</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Bonus fidélité, Compensation, Promotion..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            Attribuer {points > 0 ? '+' : ''}{points} points
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
