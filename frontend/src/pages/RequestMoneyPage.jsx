import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  HandCoins, Search, Send, Clock, CheckCircle, XCircle, 
  Mail, Phone, Hash, User, Loader2, ArrowRight, AlertCircle, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'XOF', symbol: 'CFA', name: 'Franc CFA' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollar US' },
];

const QUICK_AMOUNTS = {
  XOF: [1000, 5000, 10000, 25000, 50000, 100000],
  EUR: [5, 10, 25, 50, 100, 200],
  USD: [5, 10, 25, 50, 100, 200],
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Acceptée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expirée', color: 'bg-gray-100 text-gray-800', icon: Clock },
  cancelled: { label: 'Annulée', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function RequestMoneyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new');
  const [searchType, setSearchType] = useState('sbpaygo_id');
  const [searchValue, setSearchValue] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('XOF');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const [sentRes, receivedRes] = await Promise.all([
        axios.get(`${API}/money-requests/sent`),
        axios.get(`${API}/money-requests/received`)
      ]);
      setSentRequests(sentRes.data.requests);
      setReceivedRequests(receivedRes.data.requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Veuillez entrer une valeur de recherche');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const res = await axios.get(`${API}/money-requests/lookup`, {
        params: { type: searchType, value: searchValue }
      });
      setFoundUser(res.data);
      toast.success('Utilisateur trouvé !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Utilisateur non trouvé');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!foundUser) {
      toast.error('Veuillez d\'abord rechercher un utilisateur');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/money-requests/create`, {
        recipient_type: searchType,
        recipient_value: searchValue,
        amount: amountNum,
        currency,
        message: message || null
      });

      toast.success('Demande envoyée avec succès !');
      setFoundUser(null);
      setSearchValue('');
      setAmount('');
      setMessage('');
      fetchRequests();
      setActiveTab('sent');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (requestId, action) => {
    try {
      await axios.post(`${API}/money-requests/respond`, {
        request_id: requestId,
        action
      });
      toast.success(action === 'approve' ? 'Demande acceptée !' : 'Demande refusée');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await axios.post(`${API}/money-requests/cancel/${requestId}`);
      toast.success('Demande annulée');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, curr) => {
    const sym = CURRENCIES.find(c => c.code === curr)?.symbol || curr;
    return `${amount.toLocaleString()} ${sym}`;
  };

  const pendingReceived = receivedRequests.filter(r => r.status === 'pending');

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <BackButton />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
            <HandCoins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Demander de l'argent</h1>
            <p className="text-sm text-slate-500">Envoyez une demande de paiement</p>
          </div>
          
          {pendingReceived.length > 0 && (
            <Badge className="ml-auto bg-orange-500 hover:bg-orange-600">
              {pendingReceived.length} en attente
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="new" data-testid="tab-new">
              <Send className="w-4 h-4 mr-2" />
              Nouvelle
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">
              <Clock className="w-4 h-4 mr-2" />
              Envoyées ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="received" data-testid="tab-received">
              <HandCoins className="w-4 h-4 mr-2" />
              Reçues ({receivedRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* New Request Tab */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Créer une demande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search Type Selection */}
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">Rechercher par</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={searchType === 'sbpaygo_id' ? 'default' : 'outline'}
                      className={searchType === 'sbpaygo_id' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => { setSearchType('sbpaygo_id'); setFoundUser(null); }}
                      data-testid="search-type-id"
                    >
                      <Hash className="w-4 h-4 mr-1" />
                      ID SBPAYGO
                    </Button>
                    <Button
                      type="button"
                      variant={searchType === 'phone' ? 'default' : 'outline'}
                      className={searchType === 'phone' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => { setSearchType('phone'); setFoundUser(null); }}
                      data-testid="search-type-phone"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Téléphone
                    </Button>
                    <Button
                      type="button"
                      variant={searchType === 'email' ? 'default' : 'outline'}
                      className={searchType === 'email' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => { setSearchType('email'); setFoundUser(null); }}
                      data-testid="search-type-email"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>

                {/* Search Input */}
                <div>
                  <Label className="text-sm text-slate-600 mb-2 block">
                    {searchType === 'sbpaygo_id' && 'ID SBPAYGO (ex: SBP-XXXX-XXXX)'}
                    {searchType === 'phone' && 'Numéro de téléphone'}
                    {searchType === 'email' && 'Adresse email'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={
                        searchType === 'sbpaygo_id' ? 'SBP-XXXX-XXXX' :
                        searchType === 'phone' ? '+221 77 XXX XX XX' :
                        'email@example.com'
                      }
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      data-testid="search-input"
                    />
                    <Button 
                      onClick={handleSearch} 
                      disabled={searching}
                      className="bg-orange-500 hover:bg-orange-600"
                      data-testid="search-btn"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Found User */}
                {foundUser && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">{foundUser.name}</p>
                        <p className="text-sm text-green-600">{foundUser.sbpaygo_id}</p>
                      </div>
                      {foundUser.verified && (
                        <Badge className="ml-auto bg-blue-500">Vérifié</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Amount */}
                {foundUser && (
                  <>
                    <div>
                      <Label className="text-sm text-slate-600 mb-2 block">Montant</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="text-xl font-bold"
                          data-testid="amount-input"
                        />
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="px-3 py-2 border rounded-lg bg-white"
                          data-testid="currency-select"
                        >
                          {CURRENCIES.map(c => (
                            <option key={c.code} value={c.code}>{c.code}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick Amounts */}
                    <div className="flex flex-wrap gap-2">
                      {QUICK_AMOUNTS[currency]?.map(amt => (
                        <Button
                          key={amt}
                          variant="outline"
                          size="sm"
                          onClick={() => setAmount(amt.toString())}
                          className="text-sm"
                          data-testid={`quick-amount-${amt}`}
                        >
                          {amt.toLocaleString()} {CURRENCIES.find(c => c.code === currency)?.symbol}
                        </Button>
                      ))}
                    </div>

                    {/* Message */}
                    <div>
                      <Label className="text-sm text-slate-600 mb-2 block">Message (optionnel)</Label>
                      <Input
                        placeholder="Ex: Remboursement dîner"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        data-testid="message-input"
                      />
                    </div>

                    {/* Submit */}
                    <Button 
                      onClick={handleSubmit}
                      disabled={loading || !amount}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 py-6 text-lg"
                      data-testid="submit-request-btn"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Send className="w-5 h-5 mr-2" />
                      )}
                      Envoyer la demande
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Demandes envoyées</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={loadingRequests}>
                  <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande envoyée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map(req => {
                      const status = STATUS_CONFIG[req.status];
                      const StatusIcon = status?.icon || Clock;
                      return (
                        <div key={req.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors" data-testid={`sent-request-${req.id}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <User className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{req.recipient_name}</p>
                                <p className="text-xs text-slate-500">{formatDate(req.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatAmount(req.amount, req.currency)}</p>
                              <Badge className={status?.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status?.label}
                              </Badge>
                            </div>
                          </div>
                          {req.message && (
                            <p className="mt-2 text-sm text-slate-600 pl-13">"{req.message}"</p>
                          )}
                          {req.status === 'pending' && (
                            <div className="mt-3 flex justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleCancel(req.id)}
                                data-testid={`cancel-request-${req.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Annuler
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Received Requests Tab */}
          <TabsContent value="received">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Demandes reçues</CardTitle>
                <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={loadingRequests}>
                  <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <HandCoins className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune demande reçue</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map(req => {
                      const status = STATUS_CONFIG[req.status];
                      const StatusIcon = status?.icon || Clock;
                      const isPending = req.status === 'pending';
                      return (
                        <div 
                          key={req.id} 
                          className={`p-4 border rounded-lg transition-colors ${isPending ? 'border-orange-300 bg-orange-50/50' : 'hover:bg-slate-50'}`}
                          data-testid={`received-request-${req.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPending ? 'bg-orange-200' : 'bg-slate-100'}`}>
                                <User className={`w-5 h-5 ${isPending ? 'text-orange-600' : 'text-slate-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{req.requester_name}</p>
                                <p className="text-xs text-slate-500">{formatDate(req.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatAmount(req.amount, req.currency)}</p>
                              <Badge className={status?.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status?.label}
                              </Badge>
                            </div>
                          </div>
                          {req.message && (
                            <p className="mt-2 text-sm text-slate-600 pl-13">"{req.message}"</p>
                          )}
                          {isPending && (
                            <div className="mt-3 flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleRespond(req.id, 'reject')}
                                data-testid={`reject-request-${req.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Refuser
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => handleRespond(req.id, 'approve')}
                                data-testid={`approve-request-${req.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Payer {formatAmount(req.amount, req.currency)}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
