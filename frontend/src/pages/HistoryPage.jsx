import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  History, Search, Filter, TrendingUp, TrendingDown, 
  ArrowDownCircle, ArrowUpCircle, Receipt, Clock, Download, FileText, Loader2
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', CAD: 'C$', CHF: 'CHF' };

const TYPE_CONFIG = {
  transfer_in: { icon: TrendingUp, label: 'Reçu', color: 'bg-green-100 text-green-700' },
  transfer_out: { icon: TrendingDown, label: 'Envoyé', color: 'bg-red-100 text-red-700' },
  deposit: { icon: ArrowDownCircle, label: 'Dépôt', color: 'bg-blue-100 text-blue-700' },
  withdrawal: { icon: ArrowUpCircle, label: 'Retrait', color: 'bg-orange-100 text-orange-700' },
  bill_payment: { icon: Receipt, label: 'Facture', color: 'bg-purple-100 text-purple-700' }
};

const STATUS_CONFIG = {
  completed: { label: 'Complété', color: 'bg-green-100 text-green-700' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' }
};

export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all'
  });

  const limit = 20;

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/transactions?limit=${limit}&offset=${page * limit}`);
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
    } catch (error) {
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (transactionId) => {
    setDownloadingId(transactionId);
    try {
      const response = await axios.get(`${API}/receipts/transaction/${transactionId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_sbpay_${transactionId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Reçu téléchargé!');
    } catch (error) {
      toast.error('Erreur lors du téléchargement du reçu');
    } finally {
      setDownloadingId(null);
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
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        tx.description?.toLowerCase().includes(search) ||
        tx.recipient_email?.toLowerCase().includes(search) ||
        tx.sender_email?.toLowerCase().includes(search) ||
        tx.id.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="history-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Historique des transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultez toutes vos opérations
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                  data-testid="history-search-input"
                />
              </div>
              <Select 
                value={filters.type} 
                onValueChange={(v) => setFilters({ ...filters, type: v })}
              >
                <SelectTrigger className="w-full sm:w-48" data-testid="history-type-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="transfer_in">Reçu</SelectItem>
                  <SelectItem value="transfer_out">Envoyé</SelectItem>
                  <SelectItem value="deposit">Dépôt</SelectItem>
                  <SelectItem value="withdrawal">Retrait</SelectItem>
                  <SelectItem value="bill_payment">Facture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Transactions ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucune transaction trouvée
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredTransactions.map((tx) => {
                  const typeConfig = TYPE_CONFIG[tx.type] || { icon: Clock, label: tx.type, color: 'bg-gray-100 text-gray-700' };
                  const statusConfig = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <div 
                      key={tx.id} 
                      className="p-4 hover:bg-muted/50 transition-colors"
                      data-testid={`history-tx-${tx.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {tx.description || typeConfig.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(tx.created_at)}
                            </p>
                            {(tx.recipient_email || tx.sender_email) && (
                              <p className="text-sm text-muted-foreground">
                                {tx.recipient_email ? `À: ${tx.recipient_email}` : `De: ${tx.sender_email}`}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className={typeConfig.color}>
                                {typeConfig.label}
                              </Badge>
                              <Badge variant="secondary" className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-lg ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatAmount(tx.amount, tx.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            ID: {tx.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                data-testid="history-prev-btn"
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                data-testid="history-next-btn"
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
