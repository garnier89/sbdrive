import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Users, CreditCard, TrendingUp, Activity,
  ArrowRight, DollarSign, Euro, Landmark
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA' };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`);
      setStats(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
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
      title: 'Utilisateurs Actifs',
      value: stats?.active_users || 0,
      icon: Activity,
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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="admin-dashboard">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Tableau de bord Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de la plateforme SB Pay
          </p>
        </div>

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
            <div className="grid sm:grid-cols-3 gap-4">
              {Object.entries(stats?.volume_by_currency || {}).map(([currency, volume]) => (
                <div 
                  key={currency}
                  className="p-4 bg-muted rounded-lg"
                  data-testid={`admin-volume-${currency}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {currency === 'EUR' && <Euro className="w-4 h-4 text-muted-foreground" />}
                    {currency === 'USD' && <DollarSign className="w-4 h-4 text-muted-foreground" />}
                    {currency !== 'EUR' && currency !== 'USD' && <Landmark className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{currency}</span>
                  </div>
                  <p className="text-2xl font-bold font-['Manrope']">
                    {volume.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[currency] || currency}
                  </p>
                </div>
              ))}
              {Object.keys(stats?.volume_by_currency || {}).length === 0 && (
                <p className="text-muted-foreground col-span-3 text-center py-4">
                  Aucune donnée de volume disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
