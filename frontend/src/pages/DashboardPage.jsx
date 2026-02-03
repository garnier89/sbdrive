import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Send, ArrowDownCircle, ArrowUpCircle, Receipt, 
  TrendingUp, TrendingDown, Clock, ArrowRight,
  Wallet, BarChart3
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  XOF: 'CFA',
  GBP: '£',
  CAD: 'C$',
  CHF: 'CHF'
};

const quickActions = [
  { icon: Send, label: 'Envoyer', href: '/transfer', color: 'bg-sky-500' },
  { icon: ArrowDownCircle, label: 'Dépôt', href: '/deposit', color: 'bg-emerald-500' },
  { icon: ArrowUpCircle, label: 'Retrait', href: '/withdraw', color: 'bg-orange-500' },
  { icon: Receipt, label: 'Factures', href: '/bills', color: 'bg-purple-500' }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletsRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/wallets`),
        axios.get(`${API}/transactions?limit=50`)
      ]);
      setWallets(walletsRes.data);
      setTransactions(transactionsRes.data.transactions);
      
      // Generate monthly spending data from transactions
      generateMonthlyData(transactionsRes.data.transactions);
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (txs) => {
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        month: d.toLocaleDateString('fr-FR', { month: 'short' }),
        year: d.getFullYear(),
        deposits: 0,
        withdrawals: 0
      });
    }
    
    txs.forEach(tx => {
      const txDate = new Date(tx.created_at);
      const monthIdx = last6Months.findIndex(m => {
        const monthDate = new Date(m.year, ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'].indexOf(m.month.replace('.', '') + '.'), 1);
        return txDate.getMonth() === monthDate.getMonth() && txDate.getFullYear() === monthDate.getFullYear();
      });
      
      if (monthIdx >= 0) {
        if (tx.amount > 0) {
          last6Months[monthIdx].deposits += Math.abs(tx.amount);
        } else {
          last6Months[monthIdx].withdrawals += Math.abs(tx.amount);
        }
      }
    });
    
    setMonthlyData(last6Months);
  };

  // Calculate spending by category
  const getSpendingByType = () => {
    const spending = {};
    transactions.filter(tx => tx.amount < 0).forEach(tx => {
      const type = tx.type || 'other';
      spending[type] = (spending[type] || 0) + Math.abs(tx.amount);
    });
    
    const colors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308'];
    const labels = {
      transfer_out: 'Transferts',
      withdrawal: 'Retraits',
      bill_payment: 'Factures',
      card_payment: 'Cartes',
      vault_deposit: 'Coffre-fort',
      vault_withdrawal: 'Retrait coffre',
      p2p_transfer_out: 'Transfert P2P',
      mobile_money: 'Mobile Money',
      airtime: 'Crédit téléphone',
      other: 'Autre'
    };
    
    return Object.entries(spending).map(([type, value], idx) => ({
      name: labels[type] || type,
      value: Math.round(value),
      color: colors[idx % colors.length]
    }));
  };

  const totalBalance = wallets.reduce((sum, w) => {
    // Convert to EUR for total
    const rates = { EUR: 1, USD: 0.93, XOF: 0.0015, GBP: 1.16, CAD: 0.68, CHF: 1.06 };
    return sum + (w.balance * (rates[w.currency] || 1));
  }, 0);

  const formatAmount = (amount, currency) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const formatted = Math.abs(amount).toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return `${amount < 0 ? '-' : ''}${formatted} ${symbol}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'transfer_in': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'transfer_out': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'deposit': return <ArrowDownCircle className="w-4 h-4 text-green-500" />;
      case 'withdrawal': return <ArrowUpCircle className="w-4 h-4 text-orange-500" />;
      case 'bill_payment': return <Receipt className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="dashboard-page">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-slate-800">
            Bonjour, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Voici un aperçu de vos finances
          </p>
        </div>

        {/* Total Balance Card */}
        <Card className="bg-gradient-to-br from-sky-500 via-sky-600 to-orange-500 text-white border-0 shadow-xl shadow-sky-500/25">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Solde Total (équiv. EUR)</p>
                <p className="text-3xl lg:text-4xl font-bold font-['Manrope']" data-testid="total-balance">
                  {totalBalance.toLocaleString('fr-FR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })} €
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto py-6 flex-col gap-3 hover-lift"
              onClick={() => navigate(action.href)}
              data-testid={`quick-action-${action.label.toLowerCase()}`}
            >
              <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium">{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Wallets Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold font-['Manrope']">Mes Portefeuilles</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="hover-lift" data-testid={`wallet-${wallet.currency}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">{CURRENCY_SYMBOLS[wallet.currency]}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{wallet.currency}</span>
                  </div>
                  <p className="text-2xl font-bold font-['Manrope']">
                    {formatAmount(wallet.balance, wallet.currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Monthly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Manrope'] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Activité Mensuelle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [`${value.toLocaleString('fr-FR')} €`, '']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="deposits" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Dépôts" />
                    <Area type="monotone" dataKey="withdrawals" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Dépenses" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Pas assez de données
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spending by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="font-['Manrope']">Répartition des Dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              {getSpendingByType().length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={getSpendingByType()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {getSpendingByType().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value.toLocaleString('fr-FR')} €`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {getSpendingByType().map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value.toLocaleString('fr-FR')} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                  Aucune dépense enregistrée
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold font-['Manrope']">Transactions Récentes</h2>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/history')}
              data-testid="view-all-transactions-btn"
            >
              Voir tout
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Aucune transaction récente
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {transactions.slice(0, 5).map((tx) => (
                    <div 
                      key={tx.id} 
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      data-testid={`transaction-${tx.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {tx.description || tx.type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatAmount(tx.amount, tx.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
