import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Gift, Star, Trophy, Users, Copy, Share2, Zap, 
  TrendingUp, Clock, CheckCircle, Crown, Sparkles
} from 'lucide-react';
import axios from 'axios';

const TIER_CONFIG = {
  bronze: { name: 'Bronze', color: 'bg-amber-600', minPoints: 0, cashbackRate: 0.5 },
  silver: { name: 'Argent', color: 'bg-gray-400', minPoints: 1000, cashbackRate: 1.0 },
  gold: { name: 'Or', color: 'bg-yellow-500', minPoints: 5000, cashbackRate: 1.5 },
  platinum: { name: 'Platine', color: 'bg-purple-500', minPoints: 20000, cashbackRate: 2.0 },
  diamond: { name: 'Diamant', color: 'bg-cyan-400', minPoints: 50000, cashbackRate: 3.0 }
};

export default function RewardsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState(null);
  const [history, setHistory] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchRewards();
    fetchHistory();
    fetchReferrals();
  }, []);

  const fetchRewards = async () => {
    try {
      const res = await axios.get(`${API}/rewards/me`);
      setRewards(res.data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      // Set default rewards
      setRewards({
        points: 0,
        tier: 'bronze',
        total_earned: 0,
        total_redeemed: 0,
        referral_code: user?.id?.slice(0, 8).toUpperCase() || 'SBPAY123',
        referral_count: 0,
        cashback_earned: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/rewards/history`);
      setHistory(res.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchReferrals = async () => {
    try {
      const res = await axios.get(`${API}/rewards/referrals`);
      setReferrals(res.data.referrals || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const handleRedeemPoints = async (amount) => {
    try {
      await axios.post(`${API}/rewards/redeem`, { points: amount });
      toast.success(`${amount} points convertis en solde !`);
      fetchRewards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la conversion');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(rewards?.referral_code || '');
    toast.success('Code de parrainage copié !');
  };

  const shareReferral = async () => {
    const shareData = {
      title: 'Rejoignez SB Pay !',
      text: `Utilisez mon code ${rewards?.referral_code} pour obtenir un bonus de bienvenue sur SB Pay !`,
      url: `${window.location.origin}/register?ref=${rewards?.referral_code}`
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  };

  const getCurrentTier = () => {
    const points = rewards?.points || 0;
    const tiers = Object.entries(TIER_CONFIG).reverse();
    for (const [key, config] of tiers) {
      if (points >= config.minPoints) {
        return { key, ...config };
      }
    }
    return { key: 'bronze', ...TIER_CONFIG.bronze };
  };

  const getNextTier = () => {
    const points = rewards?.points || 0;
    const tiers = Object.entries(TIER_CONFIG);
    for (const [key, config] of tiers) {
      if (points < config.minPoints) {
        return { key, ...config };
      }
    }
    return null;
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progressToNext = nextTier 
    ? ((rewards?.points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="rewards-page">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Programme de Récompenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Gagnez des points et profitez d'avantages exclusifs
          </p>
        </div>

        {/* Tier Card */}
        <Card className={`${currentTier.color} text-white`}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Votre niveau</p>
                  <p className="text-2xl font-bold">{currentTier.name}</p>
                  <p className="text-sm opacity-80">{currentTier.cashbackRate}% cashback sur les transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{(rewards?.points || 0).toLocaleString()}</p>
                <p className="text-sm opacity-80">points disponibles</p>
              </div>
            </div>
            
            {nextTier && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progression vers {nextTier.name}</span>
                  <span>{nextTier.minPoints - (rewards?.points || 0)} points restants</span>
                </div>
                <Progress value={progressToNext} className="h-2 bg-white/20" />
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="earn">Gagner</TabsTrigger>
            <TabsTrigger value="redeem">Utiliser</TabsTrigger>
            <TabsTrigger value="referral">Parrainage</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(rewards?.total_earned || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Points gagnés</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(rewards?.total_redeemed || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Points utilisés</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">€{(rewards?.cashback_earned || 0).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Cashback total</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{rewards?.referral_count || 0}</p>
                    <p className="text-sm text-muted-foreground">Filleuls actifs</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent History */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Historique récent</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Aucune activité récente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 5).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.points > 0 ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {item.points > 0 ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <Gift className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.points > 0 ? '+' : ''}{item.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earn Tab */}
          <TabsContent value="earn" className="mt-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Gagnez 1 point pour chaque euro de transaction
                  </p>
                  <Badge className="bg-green-500">Actif</Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Parrainage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Gagnez 500 points pour chaque filleul actif
                  </p>
                  <Badge className="bg-green-500">Actif</Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-purple-500" />
                    Première transaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Bonus de 100 points à votre première transaction
                  </p>
                  <Badge variant="outline">Bonus unique</Badge>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-orange-500" />
                    KYC Validé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Bonus de 200 points après validation KYC
                  </p>
                  <Badge variant="outline">Bonus unique</Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Redeem Tab */}
          <TabsContent value="redeem" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Convertir vos points</CardTitle>
                <CardDescription>
                  100 points = 1€ crédité sur votre wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Points disponibles</p>
                  <p className="text-3xl font-bold">{(rewards?.points || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    = €{((rewards?.points || 0) / 100).toFixed(2)}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[500, 1000, 2500, 5000].map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => handleRedeemPoints(amount)}
                      disabled={(rewards?.points || 0) < amount}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="font-bold">{amount} pts</span>
                      <span className="text-xs text-muted-foreground">= €{(amount / 100).toFixed(0)}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Votre code de parrainage</CardTitle>
                  <CardDescription>
                    Partagez ce code et gagnez 500 points par filleul
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-3xl font-mono font-bold tracking-widest">
                      {rewards?.referral_code || 'SBPAY123'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={copyReferralCode} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                    <Button onClick={shareReferral} variant="outline" className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      Partager
                    </Button>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Avantages parrainage
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Vous : 500 points par filleul actif</li>
                      <li>• Votre filleul : 200 points de bienvenue</li>
                      <li>• Bonus : 100 points si KYC validé sous 7 jours</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vos filleuls ({referrals.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {referrals.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Aucun filleul pour le moment
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Partagez votre code pour commencer !
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {referrals.map((referral, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{referral.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Inscrit le {new Date(referral.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <Badge className={referral.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                            {referral.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
