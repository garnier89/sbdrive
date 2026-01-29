import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  CreditCard, Search, MoreHorizontal, CheckCircle, XCircle, 
  Filter, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Receipt
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', CAD: 'C$', CHF: 'CHF' };

const TYPE_CONFIG = {
  transfer_in: { label: 'Reçu', color: 'bg-green-100 text-green-700' },
  transfer_out: { label: 'Envoyé', color: 'bg-red-100 text-red-700' },
  deposit: { label: 'Dépôt', color: 'bg-blue-100 text-blue-700' },
  withdrawal: { label: 'Retrait', color: 'bg-orange-100 text-orange-700' },
  bill_payment: { label: 'Facture', color: 'bg-purple-100 text-purple-700' }
};

const STATUS_CONFIG = {
  completed: { label: 'Complété', color: 'bg-green-100 text-green-700' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' }
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all'
  });

  const limit = 20;

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/transactions?limit=${limit}&offset=${page * limit}`);
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async (transactionId, status) => {
    try {
      await axios.patch(`${API}/admin/transactions/${transactionId}/status?status=${status}`);
      toast.success('Statut mis à jour');
      fetchTransactions();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const formatAmount = (amount, currency) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const formatted = Math.abs(amount).toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return `${amount < 0 ? '-' : '+'}${formatted} ${symbol}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filters.status !== 'all' && tx.status !== filters.status) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      return (
        tx.user_email?.toLowerCase().includes(s) ||
        tx.user_name?.toLowerCase().includes(s) ||
        tx.id?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="admin-transactions-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Toutes les Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualisez et gérez toutes les opérations de la plateforme
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par utilisateur ou ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                  data-testid="admin-tx-search"
                />
              </div>
              <Select 
                value={filters.status} 
                onValueChange={(v) => setFilters({ ...filters, status: v })}
              >
                <SelectTrigger className="w-full sm:w-48" data-testid="admin-tx-status-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">Complété</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Transactions ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => {
                      const typeConfig = TYPE_CONFIG[tx.type] || { label: tx.type, color: 'bg-gray-100 text-gray-700' };
                      const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;

                      return (
                        <TableRow key={tx.id} data-testid={`admin-tx-${tx.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.user_name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">{tx.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={typeConfig.color}>
                              {typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatAmount(tx.amount, tx.currency)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(tx.created_at)}
                          </TableCell>
                          <TableCell>
                            {tx.status === 'pending' && tx.type === 'withdrawal' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`admin-tx-actions-${tx.id}`}>
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => updateTransactionStatus(tx.id, 'completed')}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approuver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => updateTransactionStatus(tx.id, 'rejected')}
                                    className="text-red-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Rejeter
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
