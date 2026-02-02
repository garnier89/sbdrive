import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, Users, CreditCard, DollarSign, 
  ArrowUpRight, ArrowDownRight, Activity, PieChart, BarChart3,
  Globe, Smartphone, Phone, RefreshCw, Loader2
} from 'lucide-react';

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

const formatCurrency = (amount, currency = 'XOF') => {
  return `${formatNumber(amount)} ${currency}`;
};

const GrowthIndicator = ({ value }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      {Math.abs(value).toFixed(1)}%
    </div>
  );
};

const ProgressBar = ({ value, max, color = 'bg-primary' }) => {
  const percentage = (value / max) * 100;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [mmStats, setMmStats] = useState(null);
  const [geoStats, setGeoStats] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, revenueRes, kpisRes, topUsersRes, mmRes, geoRes] = await Promise.all([
        axios.get(`${API}/analytics/overview?period=${period}`),
        axios.get(`${API}/analytics/revenue-by-source?period=${period}`),
        axios.get(`${API}/analytics/kpis`),
        axios.get(`${API}/analytics/top-users?limit=5`),
        axios.get(`${API}/analytics/mobile-money-stats?period=${period}`),
        axios.get(`${API}/analytics/geographic`)
      ]);
      
      setOverview(overviewRes.data);
      setRevenue(revenueRes.data);
      setKpis(kpisRes.data);
      setTopUsers(topUsersRes.data.top_users || []);
      setMmStats(mmRes.data);
      setGeoStats(geoRes.data);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const PERIOD_LABELS = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année"
  };

  const REVENUE_COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500',
    'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-red-500'
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope'] flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Analytics & KPIs
            </h1>
            <p className="text-muted-foreground">Tableau de bord des performances de la plateforme</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchAllData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Volume Total</span>
                <DollarSign className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(kpis?.this_month?.volume)}</p>
              <GrowthIndicator value={kpis?.growth?.volume || 0} />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Revenus (Frais)</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{formatCurrency(kpis?.this_month?.fees)}</p>
              <GrowthIndicator value={kpis?.growth?.fees || 0} />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <Activity className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">{formatNumber(kpis?.this_month?.transactions)}</p>
              <p className="text-xs text-muted-foreground">
                Moy: {formatCurrency(kpis?.this_month?.avg_transaction)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Nouveaux Utilisateurs</span>
                <Users className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{overview?.users?.new || 0}</p>
              <p className="text-xs text-muted-foreground">
                Total: {overview?.users?.total || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today Stats */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <span className="font-semibold">Aujourd'hui</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{kpis?.today?.transactions || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume</p>
                <p className="text-xl font-bold">{formatCurrency(kpis?.today?.volume)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenus</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(kpis?.today?.fees)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue by Source */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Revenus par Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenue?.breakdown?.map((item, index) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{item.count} txns</span>
                        <span className="font-semibold">{formatCurrency(item.fees)}</span>
                      </div>
                    </div>
                    <ProgressBar 
                      value={item.fees} 
                      max={revenue?.total_revenue || 1}
                      color={REVENUE_COLORS[index % REVENUE_COLORS.length]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.percentage}% • Volume: {formatCurrency(item.volume)}
                    </p>
                  </div>
                ))}
                
                {(!revenue?.breakdown || revenue.breakdown.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée disponible</p>
                )}
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Revenus</span>
                    <span className="text-green-600">{formatCurrency(revenue?.total_revenue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                      ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-primary/50'}`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(user.total_volume)}</p>
                      <p className="text-xs text-muted-foreground">{user.transactions_count} txns</p>
                    </div>
                  </div>
                ))}
                
                {topUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucun utilisateur</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Mobile Money Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-500" />
                Mobile Money - Corridors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mmStats?.by_corridor?.slice(0, 5).map((corridor, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">{corridor.corridor}</span>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(corridor.volume)}</p>
                      <p className="text-xs text-muted-foreground">{corridor.count} transferts</p>
                    </div>
                  </div>
                ))}
                
                {(!mmStats?.by_corridor || mmStats.by_corridor.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Aucun transfert Mobile Money</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-500" />
                Répartition Géographique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {geoStats?.users_by_country?.slice(0, 5).map((country, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm font-medium">{country.name}</span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{country.users}</p>
                        <p className="text-xs text-muted-foreground">utilisateurs</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!geoStats?.users_by_country || geoStats.users_by_country.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Aucune donnée géographique</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Balances Summary */}
        {overview?.wallets && Object.keys(overview.wallets).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Soldes Totaux par Devise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(overview.wallets).map(([currency, balance]) => (
                  <div key={currency} className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-lg font-bold">{formatNumber(balance)}</p>
                    <p className="text-sm text-muted-foreground">{currency}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
