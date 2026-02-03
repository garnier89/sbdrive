import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  History, Search, Filter, TrendingUp, TrendingDown, 
  ArrowDownCircle, ArrowUpCircle, Receipt, Clock, Download, FileText, Loader2,
  RotateCcw, AlertCircle, CheckCircle, XCircle, HelpCircle, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', CAD: 'C$', CHF: 'CHF' };

const TYPE_CONFIG = {
  transfer_in: { icon: TrendingUp, label: 'Reçu', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  transfer_out: { icon: TrendingDown, label: 'Envoyé', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', refundable: true },
  p2p_transfer_out: { icon: TrendingDown, label: 'Envoyé P2P', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', refundable: true },
  deposit: { icon: ArrowDownCircle, label: 'Dépôt', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  withdrawal: { icon: ArrowUpCircle, label: 'Retrait', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  bill_payment: { icon: Receipt, label: 'Facture', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  mobile_money_transfer: { icon: TrendingDown, label: 'Mobile Money', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', refundable: true },
  refund: { icon: RotateCcw, label: 'Remboursement', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
};

const STATUS_CONFIG = {
  completed: { label: 'Complété', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  processing: { label: 'En cours', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  refunded: { label: 'Remboursé', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: RotateCcw }
};

export default function HistoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  
  // Refund state
  const [refundRequests, setRefundRequests] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [refundEligibility, setRefundEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [refundReasons, setRefundReasons] = useState([]);
  const [refundForm, setRefundForm] = useState({ reason: '', details: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    type: 'all'
  });

  const limit = 20;

  useEffect(() => {
    fetchTransactions();
    fetchRefundReasons();
  }, [page]);

  useEffect(() => {
    if (activeTab === 'refunds') {
      fetchRefundRequests();
    }
  }, [activeTab]);

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

  const fetchRefundReasons = async () => {
    try {
      const res = await axios.get(`${API}/refunds/reasons`);
      setRefundReasons(res.data.reasons || []);
    } catch (error) {
      console.error('Error fetching refund reasons');
    }
  };

  const fetchRefundRequests = async () => {
    setLoadingRefunds(true);
    try {
      const res = await axios.get(`${API}/refunds/my-requests`);
      setRefundRequests(res.data.requests || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoadingRefunds(false);
    }
  };

  const checkRefundEligibility = async (transaction) => {
    setSelectedTransaction(transaction);
    setCheckingEligibility(true);
    setShowRefundDialog(true);
    setRefundEligibility(null);
    setRefundForm({ reason: '', details: '' });
    
    try {
      const res = await axios.get(`${API}/refunds/eligibility/${transaction.id}`);
      setRefundEligibility(res.data);
    } catch (error) {
      setRefundEligibility({
        eligible: false,
        reason: error.response?.data?.detail || 'Erreur lors de la vérification'
      });
    } finally {
      setCheckingEligibility(false);
    }
  };

  const submitRefundRequest = async () => {
    if (!refundForm.reason) {
      toast.error('Veuillez sélectionner une raison');
      return;
    }
    
    setSubmittingRefund(true);
    try {
      const res = await axios.post(`${API}/refunds/request`, {
        transaction_id: selectedTransaction.id,
        reason: refundForm.reason,
        details: refundForm.details
      });
      
      toast.success(res.data.message);
      setShowRefundDialog(false);
      fetchTransactions();
      fetchRefundRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la demande');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const cancelRefundRequest = async (refundId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;
    
    try {
      await axios.post(`${API}/refunds/cancel/${refundId}`);
      toast.success('Demande annulée');
      fetchRefundRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const downloadReceipt = async (transactionId) => {
    setDownloadingId(transactionId);
    try {
      const response = await axios.get(`${API}/receipts/transaction/${transactionId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recu_sbpaygo_${transactionId.slice(0, 8)}.pdf`);
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
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
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

  const isRefundable = (tx) => {
    const typeConfig = TYPE_CONFIG[tx.type];
    return typeConfig?.refundable && tx.status === 'completed' && tx.status !== 'refunded';
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

  const getRefundStatusBadge = (status) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'En attente' },
      processing: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'En cours' },
      approved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Approuvé' },
      completed: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Remboursé' },
      rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Rejeté' },
      cancelled: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', label: 'Annulé' }
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="history-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Historique des transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Consultez vos opérations et gérez vos demandes de remboursement
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="refunds" className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Remboursements ({refundRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Filters */}
            <Card>
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
                      <SelectItem value="refund">Remboursement</SelectItem>
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
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
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
                      const StatusIcon = statusConfig.icon;
                      const canRefund = isRefundable(tx);

                      return (
                        <div 
                          key={tx.id} 
                          className="p-4 hover:bg-muted/50 transition-colors"
                          data-testid={`history-tx-${tx.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                tx.status === 'refunded' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'
                              }`}>
                                <TypeIcon className={`w-5 h-5 ${
                                  tx.status === 'refunded' ? 'text-emerald-600' : 'text-muted-foreground'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {tx.description || typeConfig.label}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(tx.created_at)}
                                </p>
                                {(tx.recipient_email || tx.sender_email || tx.recipient_phone) && (
                                  <p className="text-sm text-muted-foreground">
                                    {tx.recipient_email ? `À: ${tx.recipient_email}` : 
                                     tx.recipient_phone ? `À: ${tx.recipient_phone}` :
                                     `De: ${tx.sender_email}`}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant="secondary" className={typeConfig.color}>
                                    {typeConfig.label}
                                  </Badge>
                                  <Badge variant="secondary" className={`${statusConfig.color} flex items-center gap-1`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`font-bold text-lg ${
                                tx.status === 'refunded' ? 'text-emerald-600 line-through' :
                                tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatAmount(tx.amount, tx.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono mt-1">
                                ID: {tx.id.slice(0, 8)}
                              </p>
                              <div className="flex flex-col gap-1 mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-primary hover:text-primary/80"
                                  onClick={() => downloadReceipt(tx.id)}
                                  disabled={downloadingId === tx.id}
                                  data-testid={`download-receipt-${tx.id}`}
                                >
                                  {downloadingId === tx.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                  ) : (
                                    <FileText className="w-4 h-4 mr-1" />
                                  )}
                                  Reçu
                                </Button>
                                {canRefund && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20"
                                    onClick={() => checkRefundEligibility(tx)}
                                    data-testid={`refund-btn-${tx.id}`}
                                  >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    Remboursement
                                  </Button>
                                )}
                              </div>
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
              <div className="flex items-center justify-between">
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
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-['Manrope'] flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-primary" />
                    Mes demandes de remboursement
                  </CardTitle>
                  <CardDescription>
                    Suivez l'état de vos demandes de remboursement
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRefundRequests}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </Button>
              </CardHeader>
              <CardContent>
                {loadingRefunds ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </div>
                ) : refundRequests.length === 0 ? (
                  <div className="p-8 text-center">
                    <RotateCcw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Aucune demande de remboursement</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous pouvez demander un remboursement depuis l'onglet Transactions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {refundRequests.map((req) => (
                      <div 
                        key={req.id}
                        className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {getRefundStatusBadge(req.status)}
                              {req.auto_approved && (
                                <Badge variant="outline" className="text-xs">Auto</Badge>
                              )}
                            </div>
                            <p className="font-medium">
                              {formatAmount(req.amount, req.currency).replace('+', '')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {req.reason_label}
                            </p>
                            {req.details && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{req.details}"
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Demandé le {formatDate(req.created_at)}
                            </p>
                            {req.admin_note && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">
                                <span className="font-medium">Note admin:</span> {req.admin_note}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-mono">
                              #{req.id.slice(0, 8)}
                            </p>
                            {req.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 text-red-600 hover:text-red-700"
                                onClick={() => cancelRefundRequest(req.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Annuler
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Refund Request Dialog */}
        <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-500" />
                Demande de remboursement
              </DialogTitle>
              <DialogDescription>
                Vérifiez l'éligibilité et soumettez votre demande
              </DialogDescription>
            </DialogHeader>

            {checkingEligibility ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                <p className="text-muted-foreground">Vérification en cours...</p>
              </div>
            ) : refundEligibility ? (
              <div className="space-y-4 py-4">
                {/* Transaction Summary */}
                {selectedTransaction && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Transaction</p>
                    <p className="font-medium">{selectedTransaction.description}</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(selectedTransaction.created_at)}
                    </p>
                  </div>
                )}

                {refundEligibility.eligible ? (
                  <>
                    {/* Time Remaining */}
                    {refundEligibility.time_remaining && (
                      <div className={`p-3 rounded-lg flex items-center gap-3 ${
                        refundEligibility.time_remaining.hours < 6 
                          ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
                          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      }`}>
                        <Clock className={`w-5 h-5 ${
                          refundEligibility.time_remaining.hours < 6 ? 'text-orange-600' : 'text-green-600'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">Délai de réclamation</p>
                          <p className="text-sm text-muted-foreground">
                            {refundEligibility.time_remaining.message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Auto-refund indicator */}
                    {refundEligibility.auto_refund_eligible && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            Remboursement automatique disponible
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {refundEligibility.auto_refund_message}
                        </p>
                      </div>
                    )}

                    {/* Reason Selection */}
                    <div className="space-y-2">
                      <Label>Raison du remboursement *</Label>
                      <Select 
                        value={refundForm.reason} 
                        onValueChange={(v) => setRefundForm({...refundForm, reason: v})}
                      >
                        <SelectTrigger data-testid="refund-reason-select">
                          <SelectValue placeholder="Sélectionnez une raison" />
                        </SelectTrigger>
                        <SelectContent>
                          {refundReasons.map((r) => (
                            <SelectItem key={r.code} value={r.code}>
                              {r.label}
                              {r.auto_eligible && " ⚡"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <Label>Détails supplémentaires (optionnel)</Label>
                      <Textarea
                        placeholder="Décrivez votre problème..."
                        value={refundForm.details}
                        onChange={(e) => setRefundForm({...refundForm, details: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">Non éligible</p>
                        <p className="text-sm text-muted-foreground">{refundEligibility.reason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                {refundEligibility?.eligible ? 'Annuler' : 'Fermer'}
              </Button>
              {refundEligibility?.eligible && (
                <Button 
                  onClick={submitRefundRequest}
                  disabled={submittingRefund || !refundForm.reason}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="submit-refund-btn"
                >
                  {submittingRefund ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Demander le remboursement
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
