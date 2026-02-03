import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, CreditCard, TrendingUp, Activity,
  ArrowRight, DollarSign, Euro, Landmark, FileText,
  Globe, AlertCircle, Plus, Minus, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH', NGN: '₦' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showDebitDialog, setShowDebitDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [creditDebitData, setCreditDebitData] = useState({
    user_id: '',
    amount: '',
    currency: 'EUR',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/users?limit=100`)
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleCredit = async () => {
    if (!creditDebitData.user_id || !creditDebitData.amount || !creditDebitData.description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      await axios.post(`${API}/admin/credit`, {
        user_id: creditDebitData.user_id,
        amount: parseFloat(creditDebitData.amount),
        currency: creditDebitData.currency,
        description: creditDebitData.description
      });
      toast.success('Compte crédité avec succès');
      setShowCreditDialog(false);
      setCreditDebitData({ user_id: '', amount: '', currency: 'EUR', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDebit = async () => {
    if (!creditDebitData.user_id || !creditDebitData.amount || !creditDebitData.description) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      await axios.post(`${API}/admin/debit`, {
        user_id: creditDebitData.user_id,
        amount: parseFloat(creditDebitData.amount),
        currency: creditDebitData.currency,
        description: creditDebitData.description
      });
      toast.success('Compte débité avec succès');
      setShowDebitDialog(false);
      setCreditDebitData({ user_id: '', amount: '', currency: 'EUR', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: 'Utilisateurs Total',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/users'
    },
    {
      title: 'Utilisateurs Vérifiés',
      value: stats?.verified_users || 0,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      title: 'Transactions Total',
      value: stats?.total_transactions || 0,
      icon: CreditCard,
      color: 'bg-purple-500',
      href: '/admin/transactions'
    },
    {
      title: 'Transactions (24h)',
      value: stats?.recent_transactions_24h || 0,
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  const alertCards = [
    {
      title: 'Retraits en attente',
      value: stats?.pending_withdrawals || 0,
      icon: AlertCircle,
      color: 'text-orange-500',
      href: '/admin/transactions'
    },
    {
      title: 'Documents à valider',
      value: stats?.pending_documents || 0,
      icon: FileText,
      color: 'text-yellow-500',
      href: '/admin/documents'
    }
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="admin-dashboard">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Tableau de bord Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de la plateforme SBPAYGO
          </p>
        </div>

        {/* Alerts */}
        {(stats?.pending_withdrawals > 0 || stats?.pending_documents > 0) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {alertCards.filter(a => a.value > 0).map((alert, index) => (
              <Card 
                key={index}
                className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 cursor-pointer hover-lift"
                onClick={() => navigate(alert.href)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <alert.icon className={`w-8 h-8 ${alert.color}`} />
                  <div>
                    <p className="font-bold text-2xl">{alert.value}</p>
                    <p className="text-sm text-muted-foreground">{alert.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card 
              key={index} 
              className={`hover-lift ${stat.href ? 'cursor-pointer' : ''}`}
              onClick={() => stat.href && navigate(stat.href)}
              data-testid={`admin-stat-${index}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.href && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold font-['Manrope'] text-foreground">
                  {stat.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Volume by Currency */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              Volume par Devise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats?.volume_by_currency || {}).map(([currency, volume]) => (
                <div 
                  key={currency}
                  className="p-4 bg-muted rounded-lg text-center"
                  data-testid={`admin-volume-${currency}`}
                >
                  <p className="text-sm text-muted-foreground mb-1">{currency}</p>
                  <p className="text-xl font-bold font-['Manrope']">
                    {volume.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{CURRENCY_SYMBOLS[currency] || currency}</p>
                </div>
              ))}
              {Object.keys(stats?.volume_by_currency || {}).length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-4">
                  Aucune donnée de volume disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Credit Account */}
          <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Plus className="w-6 h-6 text-green-500" />
                <span>Créditer un compte</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créditer un compte</DialogTitle>
                <DialogDescription>
                  Ajouter de l'argent au portefeuille d'un utilisateur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Utilisateur</Label>
                  <Select 
                    value={creditDebitData.user_id} 
                    onValueChange={(v) => setCreditDebitData({...creditDebitData, user_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={creditDebitData.amount}
                      onChange={(e) => setCreditDebitData({...creditDebitData, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select 
                      value={creditDebitData.currency} 
                      onValueChange={(v) => setCreditDebitData({...creditDebitData, currency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CURRENCY_SYMBOLS).map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motif *</Label>
                  <Textarea
                    value={creditDebitData.description}
                    onChange={(e) => setCreditDebitData({...creditDebitData, description: e.target.value})}
                    placeholder="Ex: Bonus de bienvenue, Remboursement..."
                  />
                </div>
                <Button onClick={handleCredit} className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Créditer le compte
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Debit Account */}
          <Dialog open={showDebitDialog} onOpenChange={setShowDebitDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <Minus className="w-6 h-6 text-red-500" />
                <span>Débiter un compte</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Débiter un compte</DialogTitle>
                <DialogDescription>
                  Retirer de l'argent du portefeuille d'un utilisateur
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Utilisateur</Label>
                  <Select 
                    value={creditDebitData.user_id} 
                    onValueChange={(v) => setCreditDebitData({...creditDebitData, user_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un utilisateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={creditDebitData.amount}
                      onChange={(e) => setCreditDebitData({...creditDebitData, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select 
                      value={creditDebitData.currency} 
                      onValueChange={(v) => setCreditDebitData({...creditDebitData, currency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CURRENCY_SYMBOLS).map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motif *</Label>
                  <Textarea
                    value={creditDebitData.description}
                    onChange={(e) => setCreditDebitData({...creditDebitData, description: e.target.value})}
                    placeholder="Ex: Frais de service, Pénalité..."
                  />
                </div>
                <Button onClick={handleDebit} className="w-full bg-red-600 hover:bg-red-700">
                  <Minus className="w-4 h-4 mr-2" />
                  Débiter le compte
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quick Links */}
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/admin/documents')}
          >
            <FileText className="w-6 h-6 text-primary" />
            <span>Documents KYC</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/admin/zones')}
          >
            <Globe className="w-6 h-6 text-primary" />
            <span>Zones d'activité</span>
          </Button>
        </div>

        {/* Quick Navigation */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-16 justify-start px-6"
            onClick={() => navigate('/admin/users')}
            data-testid="admin-go-users-btn"
          >
            <Users className="w-5 h-5 mr-4" />
            <div className="text-left">
              <p className="font-medium">Gestion des Utilisateurs</p>
              <p className="text-xs text-muted-foreground">Activer/Désactiver des comptes</p>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="h-16 justify-start px-6"
            onClick={() => navigate('/admin/transactions')}
            data-testid="admin-go-transactions-btn"
          >
            <CreditCard className="w-5 h-5 mr-4" />
            <div className="text-left">
              <p className="font-medium">Toutes les Transactions</p>
              <p className="text-xs text-muted-foreground">Voir et gérer les opérations</p>
            </div>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
