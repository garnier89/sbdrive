import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Shield, 
  Eye, EyeOff, Loader2, AlertTriangle, CheckCircle,
  History, Settings, KeyRound, Wallet, TrendingUp, TrendingDown,
  Plus, Globe, Fingerprint, ShieldCheck, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const AVAILABLE_CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'MAD', 'NGN'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH', NGN: '₦' };
const CURRENCY_FLAGS = { XOF: '🇸🇳', EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', MAD: '🇲🇦', NGN: '🇳🇬' };

export default function VaultPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vaultBalances, setVaultBalances] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('XOF');
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  
  // Dialogs
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showSetPinDialog, setShowSetPinDialog] = useState(false);
  const [showAddCurrencyDialog, setShowAddCurrencyDialog] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newCurrency, setNewCurrency] = useState('');
  
  // Vault status
  const [vaultStatus, setVaultStatus] = useState({
    has_pin: false,
    is_locked: false,
    locked_until: null,
    kyc_status: 'unverified',
    biometric_enabled: false
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedCurrency) {
      fetchTransactions(selectedCurrency);
    }
  }, [selectedCurrency]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [walletsRes, vaultRes] = await Promise.all([
        axios.get(`${API}/wallets`),
        axios.get(`${API}/vault/balances`)
      ]);
      
      setWallets(walletsRes.data);
      
      // Handle vault balances
      if (vaultRes.data.balances) {
        setVaultBalances(vaultRes.data.balances);
        setVaultStatus({
          has_pin: vaultRes.data.has_pin,
          is_locked: vaultRes.data.is_locked,
          locked_until: vaultRes.data.locked_until,
          kyc_status: vaultRes.data.kyc_status || 'unverified',
          biometric_enabled: vaultRes.data.biometric_enabled || false
        });
      } else {
        // Fallback to single currency
        const singleRes = await axios.get(`${API}/vault/balance?currency=XOF`);
        setVaultBalances([{ currency: 'XOF', ...singleRes.data }]);
        setVaultStatus({
          has_pin: singleRes.data.has_pin,
          is_locked: singleRes.data.is_locked,
          locked_until: singleRes.data.locked_until,
          kyc_status: singleRes.data.kyc_status || 'unverified',
          biometric_enabled: false
        });
      }
    } catch (error) {
      // If multi-currency endpoint doesn't exist, try single
      try {
        const singleRes = await axios.get(`${API}/vault/balance?currency=XOF`);
        setVaultBalances([{ currency: 'XOF', ...singleRes.data }]);
        setVaultStatus({
          has_pin: singleRes.data.has_pin,
          is_locked: singleRes.data.is_locked,
          locked_until: singleRes.data.locked_until,
          kyc_status: singleRes.data.kyc_status || 'unverified',
          biometric_enabled: false
        });
      } catch (e) {
        console.error('Error loading vault:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (currency) => {
    try {
      const res = await axios.get(`${API}/vault/transactions?currency=${currency}`);
      setTransactions(res.data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getCurrentVault = () => {
    return vaultBalances.find(v => v.currency === selectedCurrency) || { balance: 0, currency: selectedCurrency };
  };

  const getWalletBalance = (currency) => {
    const wallet = wallets.find(w => w.currency === currency);
    return wallet?.balance || 0;
  };

  const getTotalBalance = () => {
    // Convert all to XOF for display (simplified)
    const rates = { XOF: 1, EUR: 655.96, USD: 600, GBP: 750, MAD: 60, NGN: 0.8 };
    return vaultBalances.reduce((total, v) => total + (v.balance * (rates[v.currency] || 1)), 0);
  };

  const handleSetPin = async () => {
    if (newPin.length !== 6 || !newPin.match(/^\d{6}$/)) {
      toast.error('Le PIN doit contenir exactement 6 chiffres');
      return;
    }
    
    if (newPin !== confirmPin) {
      toast.error('Les PIN ne correspondent pas');
      return;
    }
    
    if (vaultStatus.has_pin && currentPin.length !== 6) {
      toast.error('PIN actuel requis');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/vault/set-pin`, {
        new_pin: newPin,
        current_pin: vaultStatus.has_pin ? currentPin : null
      });
      toast.success('PIN défini avec succès');
      setShowSetPinDialog(false);
      resetPinForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    if (pin.length !== 6) {
      toast.error('PIN requis (6 chiffres)');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/vault/deposit`, {
        amount: parseFloat(amount),
        currency: selectedCurrency,
        pin: pin
      });
      toast.success(`${formatAmount(amount, selectedCurrency)} déposé dans le coffre-fort`);
      setShowDepositDialog(false);
      resetForm();
      fetchAllData();
      fetchTransactions(selectedCurrency);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du dépôt');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    if (pin.length !== 6) {
      toast.error('PIN requis (6 chiffres)');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/vault/withdraw`, {
        amount: parseFloat(amount),
        currency: selectedCurrency,
        pin: pin,
        destination: 'wallet'
      });
      toast.success(`${formatAmount(amount, selectedCurrency)} retiré vers votre wallet`);
      setShowWithdrawDialog(false);
      resetForm();
      fetchAllData();
      fetchTransactions(selectedCurrency);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du retrait');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCurrency = async () => {
    if (!newCurrency) {
      toast.error('Sélectionnez une devise');
      return;
    }
    
    // Check if already exists
    if (vaultBalances.find(v => v.currency === newCurrency)) {
      toast.error('Cette devise existe déjà dans votre coffre-fort');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/vault/add-currency`, {
        currency: newCurrency
      });
      toast.success(`Devise ${newCurrency} ajoutée au coffre-fort`);
      setShowAddCurrencyDialog(false);
      setNewCurrency('');
      fetchAllData();
    } catch (error) {
      // If endpoint doesn't exist, just add locally
      setVaultBalances([...vaultBalances, { currency: newCurrency, balance: 0 }]);
      toast.success(`Devise ${newCurrency} ajoutée`);
      setShowAddCurrencyDialog(false);
      setNewCurrency('');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (value, currency = 'XOF') => {
    return `${parseFloat(value).toLocaleString('fr-FR')} ${CURRENCY_SYMBOLS[currency] || currency}`;
  };

  const resetForm = () => {
    setAmount('');
    setPin('');
  };

  const resetPinForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const PinInput = ({ value, onChange, showToggle = true }) => (
    <div className="relative">
      <Input
        type={showPin ? "text" : "password"}
        maxLength={6}
        placeholder="••••••"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="text-center text-2xl tracking-[0.5em] font-mono pr-10"
        data-testid="pin-input"
      />
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    </div>
  );

  const currentVault = getCurrentVault();
  const availableCurrencies = AVAILABLE_CURRENCIES.filter(c => !vaultBalances.find(v => v.currency === c));

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
      <div className="p-6 lg:p-8 max-w-5xl mx-auto" data-testid="vault-page">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
                🔐 Coffre-Fort
              </h1>
              <p className="text-muted-foreground">
                Sécurisez votre argent avec un code PIN • Multi-devises
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {!vaultStatus.has_pin && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Configuration requise</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Définissez un code PIN à 6 chiffres pour activer votre coffre-fort.
              </p>
              <Button 
                size="sm" 
                className="mt-2"
                onClick={() => setShowSetPinDialog(true)}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Définir mon PIN
              </Button>
            </div>
          </div>
        )}

        {vaultStatus.is_locked && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Coffre-fort verrouillé</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Trop de tentatives échouées. Verrouillé jusqu'à {new Date(vaultStatus.locked_until).toLocaleTimeString('fr-FR')}.
              </p>
            </div>
          </div>
        )}

        {/* Multi-Currency Overview */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-amber-100">Valeur totale sécurisée</span>
              </div>
              <Badge className="bg-white/20 text-white border-0">
                {vaultBalances.length} devise{vaultBalances.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-4xl font-bold mb-6" data-testid="vault-total">
              ≈ {formatAmount(getTotalBalance())}
            </p>
            
            {/* Currency Balances */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {vaultBalances.map((vault) => (
                <button
                  key={vault.currency}
                  onClick={() => setSelectedCurrency(vault.currency)}
                  className={`p-3 rounded-lg text-left transition-all ${
                    selectedCurrency === vault.currency 
                      ? 'bg-white/30 ring-2 ring-white' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{CURRENCY_FLAGS[vault.currency]}</span>
                    <span className="font-medium">{vault.currency}</span>
                  </div>
                  <p className="font-bold">{formatAmount(vault.balance || 0, vault.currency)}</p>
                </button>
              ))}
              
              {/* Add Currency Button */}
              {availableCurrencies.length > 0 && (
                <button
                  onClick={() => setShowAddCurrencyDialog(true)}
                  className="p-3 rounded-lg border-2 border-dashed border-white/30 hover:border-white/50 transition-all flex flex-col items-center justify-center"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-sm">Ajouter</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Actions for selected currency */}
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Devise sélectionnée</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <span>{CURRENCY_FLAGS[selectedCurrency]}</span>
                  {formatAmount(currentVault.balance || 0, selectedCurrency)}
                </p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="default"
                  disabled={!vaultStatus.has_pin || vaultStatus.is_locked}
                  onClick={() => setShowDepositDialog(true)}
                  data-testid="deposit-btn"
                >
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Déposer
                </Button>
                <Button 
                  variant="outline"
                  disabled={!vaultStatus.has_pin || vaultStatus.is_locked || (currentVault.balance || 0) <= 0}
                  onClick={() => setShowWithdrawDialog(true)}
                  data-testid="withdraw-btn"
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Retirer
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowSetPinDialog(true)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {vaultStatus.has_pin ? 'PIN' : 'Définir PIN'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Wallet className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Wallet {selectedCurrency}</p>
              <p className="font-semibold">{formatAmount(getWalletBalance(selectedCurrency), selectedCurrency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-muted-foreground">Total déposé</p>
              <p className="font-semibold">{formatAmount(currentVault.total_deposited || 0, selectedCurrency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-muted-foreground">Total retiré</p>
              <p className="font-semibold">{formatAmount(currentVault.total_withdrawn || 0, selectedCurrency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="w-6 h-6 mx-auto mb-2 text-amber-600" />
              <p className="text-sm text-muted-foreground">Statut KYC</p>
              <Badge variant={vaultStatus.kyc_status === 'verified' ? 'default' : 'secondary'}>
                {vaultStatus.kyc_status === 'verified' ? 'Vérifié' : 'Non vérifié'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Security Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Sécurité renforcée
            </CardTitle>
            <CardDescription>
              Protégez votre coffre-fort avec des options de sécurité avancées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Code PIN</p>
                    <p className="text-sm text-muted-foreground">
                      {vaultStatus.has_pin ? 'Configuré' : 'Non configuré'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowSetPinDialog(true)}>
                  {vaultStatus.has_pin ? 'Modifier' : 'Définir'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Biométrie</p>
                    <p className="text-sm text-muted-foreground">
                      {vaultStatus.biometric_enabled ? 'Activée' : 'Disponible sur mobile'}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Bientôt</Badge>
              </div>
            </div>
            
            {vaultStatus.kyc_status !== 'verified' && (
              <p className="mt-4 text-sm text-muted-foreground">
                💡 Complétez votre vérification KYC pour augmenter vos limites et accéder à plus de fonctionnalités.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique {selectedCurrency}
              </CardTitle>
              <CardDescription>
                Transactions du coffre-fort en {selectedCurrency}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => fetchTransactions(selectedCurrency)}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune transaction en {selectedCurrency}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {tx.type === 'deposit' ? (
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <ArrowDownCircle className="w-5 h-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <ArrowUpCircle className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {tx.type === 'deposit' ? 'Dépôt' : 'Retrait'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{formatAmount(tx.amount, tx.currency)}
                      </p>
                      <Badge variant="outline" className="text-xs">{tx.reference}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Set PIN Dialog */}
        <Dialog open={showSetPinDialog} onOpenChange={setShowSetPinDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                {vaultStatus.has_pin ? 'Changer le PIN' : 'Définir le PIN'}
              </DialogTitle>
              <DialogDescription>
                Choisissez un code PIN à 6 chiffres pour sécuriser votre coffre-fort
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {vaultStatus.has_pin && (
                <div className="space-y-2">
                  <Label>PIN actuel</Label>
                  <PinInput value={currentPin} onChange={setCurrentPin} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Nouveau PIN (6 chiffres)</Label>
                <PinInput value={newPin} onChange={setNewPin} />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le PIN</Label>
                <PinInput value={confirmPin} onChange={setConfirmPin} />
              </div>
              {newPin && confirmPin && newPin !== confirmPin && (
                <p className="text-sm text-destructive">Les PIN ne correspondent pas</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowSetPinDialog(false); resetPinForm(); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleSetPin}
                disabled={processing || newPin.length !== 6 || newPin !== confirmPin}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deposit Dialog */}
        <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-green-600" />
                Déposer en {selectedCurrency}
              </DialogTitle>
              <DialogDescription>
                Wallet disponible: {formatAmount(getWalletBalance(selectedCurrency), selectedCurrency)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Montant ({CURRENCY_SYMBOLS[selectedCurrency]})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="deposit-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Code PIN</Label>
                <PinInput value={pin} onChange={setPin} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDepositDialog(false); resetForm(); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleDeposit}
                disabled={processing || !amount || pin.length !== 6}
                data-testid="confirm-deposit-btn"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Déposer {amount ? formatAmount(amount, selectedCurrency) : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-red-600" />
                Retirer en {selectedCurrency}
              </DialogTitle>
              <DialogDescription>
                Coffre-fort: {formatAmount(currentVault.balance || 0, selectedCurrency)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Montant ({CURRENCY_SYMBOLS[selectedCurrency]})</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="withdraw-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Code PIN</Label>
                <PinInput value={pin} onChange={setPin} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowWithdrawDialog(false); resetForm(); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleWithdraw}
                disabled={processing || !amount || pin.length !== 6}
                data-testid="confirm-withdraw-btn"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Retirer {amount ? formatAmount(amount, selectedCurrency) : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Currency Dialog */}
        <Dialog open={showAddCurrencyDialog} onOpenChange={setShowAddCurrencyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Ajouter une devise
              </DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle devise à votre coffre-fort
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map(c => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span>{CURRENCY_FLAGS[c]}</span>
                          {c} ({CURRENCY_SYMBOLS[c]})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddCurrencyDialog(false); setNewCurrency(''); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleAddCurrency}
                disabled={processing || !newCurrency}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
