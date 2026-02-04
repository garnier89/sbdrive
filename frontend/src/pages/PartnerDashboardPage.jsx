import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Store, Wallet, Users, TrendingUp, ArrowDownLeft, ArrowUpRight,
  Search, CheckCircle2, XCircle, Clock, LogOut, Plus,
  Phone, QrCode, AlertCircle, Smartphone, ArrowUpCircle,
  RefreshCw, History, CreditCard
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MOBILE_MONEY_PROVIDERS = [
  { id: 'orange', name: 'Orange Money', color: 'bg-orange-500' },
  { id: 'wave', name: 'Wave', color: 'bg-blue-500' },
  { id: 'mtn', name: 'MTN Mobile Money', color: 'bg-yellow-500' },
  { id: 'moov', name: 'Moov Money', color: 'bg-cyan-500' },
  { id: 'free', name: 'Free Money', color: 'bg-green-500' },
];

export default function PartnerDashboardPage() {
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('withdrawal');
  
  // Withdrawal state
  const [withdrawalStep, setWithdrawalStep] = useState('search'); // search, confirm, otp
  const [searchInput, setSearchInput] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalData, setWithdrawalData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  
  // Cash In (Deposit) state
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositStep, setDepositStep] = useState('search'); // search, confirm, otp
  const [depositSearchInput, setDepositSearchInput] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositData, setDepositData] = useState(null);
  const [depositOtp, setDepositOtp] = useState('');
  const [processingDeposit, setProcessingDeposit] = useState(false);
  
  // Mobile Money recharge state
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeStep, setRechargeStep] = useState('search'); // search, confirm, otp
  const [rechargeProvider, setRechargeProvider] = useState('');
  const [rechargePhone, setRechargePhone] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeData, setRechargeData] = useState(null);
  const [rechargeOtp, setRechargeOtp] = useState('');
  const [processingRecharge, setProcessingRecharge] = useState(false);
  const [rechargeHistory, setRechargeHistory] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('sbpaygo_partner_token');
    const partnerData = localStorage.getItem('sbpaygo_partner');
    
    if (!token || !partnerData) {
      navigate('/partner/login');
      return;
    }
    
    setPartner(JSON.parse(partnerData));
    fetchDashboard(token);
  }, [navigate]);

  const fetchDashboard = async (token) => {
    try {
      const response = await axios.get(`${API}/partners/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        handleLogout();
      } else {
        toast.error('Erreur lors du chargement du dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sbpaygo_partner_token');
    localStorage.removeItem('sbpaygo_partner');
    navigate('/partner/login');
  };

  // ==================== CASH IN (DEPOSIT) FUNCTIONS ====================
  
  const handleInitiateDeposit = async () => {
    if (!depositSearchInput || !depositAmount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    setProcessingDeposit(true);
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      const response = await axios.post(`${API}/partners/deposit/initiate`, {
        client_identifier: depositSearchInput,
        amount: amount,
        currency: 'XOF'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDepositData(response.data);
      setDepositStep('otp');
      toast.success('Code OTP envoyé au client');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'initiation du dépôt');
    } finally {
      setProcessingDeposit(false);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!depositOtp || depositOtp.length !== 6) {
      toast.error('Veuillez entrer un code OTP valide (6 chiffres)');
      return;
    }
    
    setProcessingDeposit(true);
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      const response = await axios.post(`${API}/partners/deposit/confirm`, {
        deposit_id: depositData.deposit_id,
        otp_code: depositOtp
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Dépôt de ${response.data.amount_deposited} XOF effectué! Commission: ${response.data.commission} XOF`);
      setShowDepositDialog(false);
      resetDepositState();
      fetchDashboard(localStorage.getItem('sbpaygo_partner_token'));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la confirmation');
    } finally {
      setProcessingDeposit(false);
    }
  };

  const resetDepositState = () => {
    setDepositStep('search');
    setDepositSearchInput('');
    setDepositAmount('');
    setDepositData(null);
    setDepositOtp('');
  };

  // ==================== WITHDRAWAL FUNCTIONS ====================

  const handleInitiateWithdrawal = async () => {
    if (!searchInput || !withdrawalAmount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    setProcessingWithdrawal(true);
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      const response = await axios.post(`${API}/partners/withdrawal/initiate`, {
        client_identifier: searchInput,
        amount: amount,
        currency: 'EUR'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setWithdrawalData(response.data);
      setWithdrawalStep('otp');
      toast.success('Code OTP envoyé au client');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'initiation du retrait');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Veuillez entrer un code OTP valide (6 chiffres)');
      return;
    }
    
    setProcessingWithdrawal(true);
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      const response = await axios.post(`${API}/partners/withdrawal/confirm`, {
        withdrawal_id: withdrawalData.withdrawal_id,
        otp_code: otpCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Retrait de ${response.data.amount} ${response.data.currency} confirmé!`);
      setShowWithdrawalDialog(false);
      resetWithdrawalState();
      fetchDashboard(token);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code OTP incorrect');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const handleCancelWithdrawal = async () => {
    if (!withdrawalData?.withdrawal_id) return;
    
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      await axios.post(`${API}/partners/withdrawal/cancel/${withdrawalData.withdrawal_id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.info('Retrait annulé');
    } catch (error) {
      // Ignore error on cancel
    }
    
    resetWithdrawalState();
    setShowWithdrawalDialog(false);
  };

  const resetWithdrawalState = () => {
    setWithdrawalStep('search');
    setSearchInput('');
    setWithdrawalAmount('');
    setWithdrawalData(null);
    setOtpCode('');
  };

  // Mobile Money Recharge functions
  const handleInitiateRecharge = async () => {
    if (!rechargeProvider || !rechargePhone || !rechargeAmount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    setProcessingRecharge(true);
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      const response = await axios.post(`${API}/partners/mobile-money/recharge/initiate`, {
        provider: rechargeProvider,
        phone_number: rechargePhone,
        amount: amount,
        currency: 'XOF'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRechargeData(response.data);
      setRechargeStep('otp');
      toast.success('Code OTP envoyé au client (mode démo)');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la recharge');
    } finally {
      setProcessingRecharge(false);
    }
  };

  const handleConfirmRecharge = async () => {
    if (!rechargeOtp || rechargeOtp.length !== 6) {
      toast.error('Veuillez entrer un code OTP valide (6 chiffres)');
      return;
    }
    
    setProcessingRecharge(true);
    try {
      const token = localStorage.getItem('sbpaygo_partner_token');
      const response = await axios.post(`${API}/partners/mobile-money/recharge/confirm`, {
        recharge_id: rechargeData.recharge_id,
        otp_code: rechargeOtp
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Recharge de ${response.data.amount} XOF confirmée!`);
      setShowRechargeDialog(false);
      resetRechargeState();
      fetchDashboard(token);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code OTP incorrect');
    } finally {
      setProcessingRecharge(false);
    }
  };

  const resetRechargeState = () => {
    setRechargeStep('search');
    setRechargeProvider('');
    setRechargePhone('');
    setRechargeAmount('');
    setRechargeData(null);
    setRechargeOtp('');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
      pending_otp: { color: 'bg-amber-500/20 text-amber-400', icon: Clock },
      cancelled: { color: 'bg-slate-500/20 text-slate-400', icon: XCircle },
      failed: { color: 'bg-red-500/20 text-red-400', icon: XCircle },
      expired: { color: 'bg-red-500/20 text-red-400', icon: XCircle }
    };
    const config = statusConfig[status] || statusConfig.pending_otp;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-slate-400 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Store className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-white font-semibold">{partner?.business_name}</h1>
              <p className="text-sm text-slate-400">{partner?.partner_code}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-slate-400 hover:text-white"
            data-testid="partner-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Solde Agent</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.wallet_balance?.toLocaleString()} {dashboard?.wallet_currency}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Retraits aujourd'hui</p>
                  <p className="text-2xl font-bold text-white">{dashboard?.today_withdrawals || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <ArrowDownLeft className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Montant du jour</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.daily_withdrawn?.toLocaleString() || 0} {dashboard?.wallet_currency}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Limite journalière</p>
                  <p className="text-2xl font-bold text-white">
                    {dashboard?.daily_limit?.toLocaleString()} {dashboard?.wallet_currency}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Restant: {((dashboard?.daily_limit || 0) - (dashboard?.daily_withdrawn || 0)).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Services with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700">
            <TabsTrigger value="deposit" className="data-[state=active]:bg-orange-600" data-testid="tab-deposit">
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Dépôt Cash
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="data-[state=active]:bg-green-600" data-testid="tab-withdrawal">
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Retrait Cash
            </TabsTrigger>
            <TabsTrigger value="recharge" className="data-[state=active]:bg-blue-600" data-testid="tab-recharge">
              <Smartphone className="w-4 h-4 mr-2" />
              Recharge Mobile
            </TabsTrigger>
          </TabsList>
          
          {/* CASH IN (DEPOSIT) TAB */}
          <TabsContent value="deposit">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-orange-500" />
                  Dépôt espèces client
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Recevez des espèces et créditez le compte SBPAYGO du client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => setShowDepositDialog(true)}
                    className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
                    data-testid="new-deposit-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau dépôt
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertCircle className="w-4 h-4" />
                    Commission: {((dashboard?.commission_rate || 0.01) * 100).toFixed(1)}% par dépôt
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* WITHDRAWAL TAB */}
          <TabsContent value="withdrawal">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-green-500" />
                  Effectuer un retrait client
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Recherchez un client par numéro de téléphone ou scannez son QR code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowWithdrawalDialog(true)}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  data-testid="new-withdrawal-btn"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Nouveau retrait
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recharge">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  📱 Recharge Mobile Money
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Rechargez le compte Mobile Money d'un client (Orange, Wave, MTN...)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {MOBILE_MONEY_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setRechargeProvider(provider.id);
                        setShowRechargeDialog(true);
                      }}
                      className={`p-4 rounded-lg border-2 border-slate-600 hover:border-blue-500 transition-all flex flex-col items-center gap-2 ${
                        rechargeProvider === provider.id ? 'border-blue-500 bg-blue-500/10' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 ${provider.color} rounded-full flex items-center justify-center`}>
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white text-sm font-medium">{provider.name}</span>
                    </button>
                  ))}
                </div>
                <Button 
                  onClick={() => setShowRechargeDialog(true)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  data-testid="new-recharge-btn"
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Nouvelle recharge
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Withdrawals */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Retraits récents</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.recent_withdrawals?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recent_withdrawals.map((withdrawal) => (
                  <div 
                    key={withdrawal.id}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                        <ArrowDownLeft className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{withdrawal.client_name}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(withdrawal.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {withdrawal.amount?.toLocaleString()} {withdrawal.currency}
                      </p>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <ArrowDownLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun retrait effectué</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawalDialog} onOpenChange={(open) => {
        if (!open) handleCancelWithdrawal();
        else setShowWithdrawalDialog(true);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {withdrawalStep === 'search' ? 'Nouveau retrait' : 'Confirmation OTP'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {withdrawalStep === 'search' 
                ? 'Recherchez le client et entrez le montant'
                : 'Demandez le code OTP au client'
              }
            </DialogDescription>
          </DialogHeader>

          {withdrawalStep === 'search' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Numéro de téléphone ou ID client</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="+221 77 123 4567"
                    className="bg-slate-700 border-slate-600 text-white pl-10"
                    data-testid="withdrawal-client-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Montant du retrait</Label>
                <Input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="100"
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="withdrawal-amount-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowWithdrawalDialog(false)}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleInitiateWithdrawal}
                  disabled={processingWithdrawal}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="withdrawal-initiate-btn"
                >
                  {processingWithdrawal ? 'Recherche...' : 'Continuer'}
                </Button>
              </div>
            </div>
          )}

          {withdrawalStep === 'otp' && withdrawalData && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Client</span>
                  <span className="text-white font-medium">{withdrawalData.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Téléphone</span>
                  <span className="text-white">{withdrawalData.client_phone_masked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant</span>
                  <span className="text-green-400 font-bold">
                    {withdrawalData.amount} {withdrawalData.currency}
                  </span>
                </div>
              </div>

              {/* Demo OTP Notice */}
              {withdrawalData.demo_otp && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Mode DEMO</span>
                  </div>
                  <p className="text-amber-300 text-sm mt-1">
                    Code OTP: <span className="font-mono font-bold">{withdrawalData.demo_otp}</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Code OTP du client</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="bg-slate-700 border-slate-600 text-white text-center text-2xl tracking-widest"
                  data-testid="withdrawal-otp-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={handleCancelWithdrawal}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleConfirmWithdrawal}
                  disabled={processingWithdrawal || otpCode.length !== 6}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="withdrawal-confirm-btn"
                >
                  {processingWithdrawal ? 'Vérification...' : 'Confirmer le retrait'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cash In (Deposit) Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={(open) => {
        if (!open) resetDepositState();
        setShowDepositDialog(open);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-orange-500" />
              {depositStep === 'search' ? 'Nouveau dépôt espèces' : 'Confirmation OTP'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {depositStep === 'search' 
                ? 'Recherchez le client et entrez le montant à déposer'
                : 'Demandez le code OTP au client pour confirmer'
              }
            </DialogDescription>
          </DialogHeader>

          {depositStep === 'search' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Téléphone, Email ou ID SBPAYGO</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={depositSearchInput}
                    onChange={(e) => setDepositSearchInput(e.target.value)}
                    placeholder="+221 77 123 4567 ou SBP-XXXX-XXXX"
                    className="bg-slate-700 border-slate-600 text-white pl-10"
                    data-testid="deposit-client-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Montant du dépôt (XOF)</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="10000"
                  className="bg-slate-700 border-slate-600 text-white text-lg"
                  data-testid="deposit-amount-input"
                />
                <div className="flex gap-2 flex-wrap">
                  {[5000, 10000, 25000, 50000, 100000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowDepositDialog(false)}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleInitiateDeposit}
                  disabled={processingDeposit}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  data-testid="deposit-initiate-btn"
                >
                  {processingDeposit ? 'Recherche...' : 'Continuer'}
                </Button>
              </div>
            </div>
          )}

          {depositStep === 'otp' && depositData && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Client</span>
                  <span className="text-white font-medium">{depositData.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ID SBPAYGO</span>
                  <span className="text-orange-400 font-mono">{depositData.client_sbpaygo_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Téléphone</span>
                  <span className="text-white">{depositData.client_phone_masked}</span>
                </div>
                <div className="border-t border-slate-600 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant reçu</span>
                  <span className="text-orange-400 font-bold text-lg">
                    {depositData.amount?.toLocaleString()} {depositData.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Votre commission</span>
                  <span className="text-green-400">
                    +{depositData.commission?.toLocaleString()} {depositData.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Crédité au client</span>
                  <span className="text-white font-semibold">
                    {depositData.net_amount?.toLocaleString()} {depositData.currency}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Code OTP du client</Label>
                <Input
                  value={depositOtp}
                  onChange={(e) => setDepositOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="______"
                  maxLength={6}
                  className="bg-slate-700 border-slate-600 text-white text-center text-2xl tracking-widest"
                  data-testid="deposit-otp-input"
                />
                <p className="text-xs text-slate-400 text-center">
                  Le client a reçu un code de 6 chiffres
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={resetDepositState}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleConfirmDeposit}
                  disabled={processingDeposit || depositOtp.length !== 6}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  data-testid="deposit-confirm-btn"
                >
                  {processingDeposit ? 'Traitement...' : 'Confirmer le dépôt'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Money Recharge Dialog */}
      <Dialog open={showRechargeDialog} onOpenChange={(open) => {
        if (!open) resetRechargeState();
        setShowRechargeDialog(open);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {rechargeStep === 'search' ? '📱 Recharge Mobile Money' : 'Confirmation OTP'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {rechargeStep === 'search' 
                ? 'Rechargez le compte Mobile Money d\'un client'
                : 'Demandez le code OTP au client'
              }
            </DialogDescription>
          </DialogHeader>

          {rechargeStep === 'search' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Opérateur Mobile Money</Label>
                <Select value={rechargeProvider} onValueChange={setRechargeProvider}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Sélectionner un opérateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILE_MONEY_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Numéro de téléphone du client</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={rechargePhone}
                    onChange={(e) => setRechargePhone(e.target.value)}
                    placeholder="+221 77 123 4567"
                    className="bg-slate-700 border-slate-600 text-white pl-10"
                    data-testid="recharge-phone-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300">Montant à recharger (XOF)</Label>
                <Input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="5000"
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="recharge-amount-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowRechargeDialog(false)}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleInitiateRecharge}
                  disabled={processingRecharge || !rechargeProvider || !rechargePhone || !rechargeAmount}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  data-testid="recharge-initiate-btn"
                >
                  {processingRecharge ? 'Envoi...' : 'Continuer'}
                </Button>
              </div>
            </div>
          )}

          {rechargeStep === 'otp' && rechargeData && (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Opérateur</span>
                  <span className="text-white font-medium">
                    {MOBILE_MONEY_PROVIDERS.find(p => p.id === rechargeProvider)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Téléphone</span>
                  <span className="text-white">{rechargeData.phone_masked || rechargePhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant</span>
                  <span className="text-blue-400 font-bold">
                    {rechargeData.amount?.toLocaleString()} XOF
                  </span>
                </div>
              </div>

              {/* Demo OTP Notice */}
              {rechargeData.demo_otp && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Mode DEMO</span>
                  </div>
                  <p className="text-amber-300 text-sm mt-1">
                    Code OTP: <span className="font-mono font-bold">{rechargeData.demo_otp}</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Code OTP du client</Label>
                <Input
                  type="text"
                  maxLength={6}
                  value={rechargeOtp}
                  onChange={(e) => setRechargeOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="bg-slate-700 border-slate-600 text-white text-center text-2xl tracking-widest"
                  data-testid="recharge-otp-input"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={resetRechargeState}
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleConfirmRecharge}
                  disabled={processingRecharge || rechargeOtp.length !== 6}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  data-testid="recharge-confirm-btn"
                >
                  {processingRecharge ? 'Vérification...' : 'Confirmer la recharge'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
