import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Shield, 
  Eye, EyeOff, Loader2, AlertTriangle, CheckCircle,
  History, Settings, KeyRound, Wallet, TrendingUp, TrendingDown
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA' };

export default function VaultPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vaultData, setVaultData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Dialogs
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showSetPinDialog, setShowSetPinDialog] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchVaultData();
    fetchWalletBalance();
  }, []);

  const fetchVaultData = async () => {
    try {
      setLoading(true);
      const [balanceRes, txRes] = await Promise.all([
        axios.get(`${API}/vault/balance?currency=XOF`),
        axios.get(`${API}/vault/transactions?currency=XOF`)
      ]);
      setVaultData(balanceRes.data);
      setTransactions(txRes.data.transactions || []);
    } catch (error) {
      console.error('Error loading vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await axios.get(`${API}/wallets`);
      const xofWallet = res.data.find(w => w.currency === 'XOF');
      setWalletBalance(xofWallet?.balance || 0);
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
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
    
    if (vaultData?.has_pin && currentPin.length !== 6) {
      toast.error('PIN actuel requis');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/vault/set-pin`, {
        new_pin: newPin,
        current_pin: vaultData?.has_pin ? currentPin : null
      });
      toast.success('PIN défini avec succès');
      setShowSetPinDialog(false);
      setNewPin('');
      setConfirmPin('');
      setCurrentPin('');
      fetchVaultData();
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
      const res = await axios.post(`${API}/vault/deposit`, {
        amount: parseFloat(amount),
        currency: 'XOF',
        pin: pin
      });
      toast.success(`${parseFloat(amount).toLocaleString()} CFA déposé dans le coffre-fort`);
      setShowDepositDialog(false);
      setAmount('');
      setPin('');
      fetchVaultData();
      fetchWalletBalance();
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
      const res = await axios.post(`${API}/vault/withdraw`, {
        amount: parseFloat(amount),
        currency: 'XOF',
        pin: pin,
        destination: 'wallet'
      });
      toast.success(`${parseFloat(amount).toLocaleString()} CFA retiré vers votre wallet`);
      setShowWithdrawDialog(false);
      setAmount('');
      setPin('');
      fetchVaultData();
      fetchWalletBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du retrait');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (value, currency = 'XOF') => {
    return `${parseFloat(value).toLocaleString('fr-FR')} ${CURRENCY_SYMBOLS[currency] || currency}`;
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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto" data-testid="vault-page">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
                Coffre-Fort
              </h1>
              <p className="text-muted-foreground">
                Sécurisez votre argent avec un code PIN
              </p>
            </div>
          </div>
        </div>

        {/* Vault Status Alert */}
        {!vaultData?.has_pin && (
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

        {vaultData?.is_locked && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Coffre-fort verrouillé</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Trop de tentatives échouées. Verrouillé jusqu'à {new Date(vaultData.locked_until).toLocaleTimeString('fr-FR')}.
              </p>
            </div>
          </div>
        )}

        {/* Main Vault Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-8 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5" />
              <span className="text-amber-100">Solde sécurisé</span>
            </div>
            <p className="text-4xl font-bold mb-4" data-testid="vault-balance">
              {formatAmount(vaultData?.balance || 0)}
            </p>
            <div className="flex gap-3">
              <Button 
                variant="secondary"
                disabled={!vaultData?.has_pin || vaultData?.is_locked}
                onClick={() => setShowDepositDialog(true)}
                data-testid="deposit-btn"
              >
                <ArrowDownCircle className="w-4 h-4 mr-2" />
                Déposer
              </Button>
              <Button 
                variant="secondary"
                disabled={!vaultData?.has_pin || vaultData?.is_locked || vaultData?.balance <= 0}
                onClick={() => setShowWithdrawDialog(true)}
                data-testid="withdraw-btn"
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Retirer
              </Button>
              <Button 
                variant="secondary"
                onClick={() => setShowSetPinDialog(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                {vaultData?.has_pin ? 'Changer PIN' : 'Définir PIN'}
              </Button>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Wallet className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Solde Wallet</p>
                <p className="font-semibold">{formatAmount(walletBalance)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-muted-foreground">Total déposé</p>
                <p className="font-semibold">{formatAmount(vaultData?.total_deposited || 0)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
                <p className="text-sm text-muted-foreground">Total retiré</p>
                <p className="font-semibold">{formatAmount(vaultData?.total_withdrawn || 0)}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Shield className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                <p className="text-sm text-muted-foreground">Retrait restant/jour</p>
                <p className="font-semibold">{formatAmount(vaultData?.limits?.daily_withdraw_remaining || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Limites ({vaultData?.kyc_status || 'unverified'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Solde max</p>
                <p className="font-semibold">{formatAmount(vaultData?.limits?.max_balance || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dépôt max/opération</p>
                <p className="font-semibold">{formatAmount(vaultData?.limits?.max_single_deposit || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retrait max/opération</p>
                <p className="font-semibold">{formatAmount(vaultData?.limits?.max_single_withdraw || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retrait max/jour</p>
                <p className="font-semibold">{formatAmount(vaultData?.limits?.daily_withdraw_limit || 0)}</p>
              </div>
            </div>
            {vaultData?.kyc_status !== 'verified' && (
              <p className="mt-4 text-sm text-muted-foreground">
                💡 Complétez votre vérification KYC pour augmenter vos limites.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-3">
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
                {vaultData?.has_pin ? 'Changer le PIN' : 'Définir le PIN'}
              </DialogTitle>
              <DialogDescription>
                Choisissez un code PIN à 6 chiffres pour sécuriser votre coffre-fort
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {vaultData?.has_pin && (
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
              <Button variant="outline" onClick={() => setShowSetPinDialog(false)}>
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
                Déposer dans le coffre-fort
              </DialogTitle>
              <DialogDescription>
                Solde wallet disponible: {formatAmount(walletBalance)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Montant (CFA)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="deposit-amount"
                />
                <p className="text-xs text-muted-foreground">
                  Max: {formatAmount(Math.min(walletBalance, vaultData?.limits?.max_single_deposit || 0))}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Code PIN</Label>
                <PinInput value={pin} onChange={setPin} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDepositDialog(false); setAmount(''); setPin(''); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleDeposit}
                disabled={processing || !amount || pin.length !== 6}
                data-testid="confirm-deposit-btn"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Déposer {amount ? formatAmount(amount) : ''}
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
                Retirer du coffre-fort
              </DialogTitle>
              <DialogDescription>
                Solde coffre-fort: {formatAmount(vaultData?.balance || 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Montant (CFA)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="withdraw-amount"
                />
                <p className="text-xs text-muted-foreground">
                  Max: {formatAmount(Math.min(
                    vaultData?.balance || 0, 
                    vaultData?.limits?.max_single_withdraw || 0,
                    vaultData?.limits?.daily_withdraw_remaining || 0
                  ))}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Code PIN</Label>
                <PinInput value={pin} onChange={setPin} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowWithdrawDialog(false); setAmount(''); setPin(''); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleWithdraw}
                disabled={processing || !amount || pin.length !== 6}
                data-testid="confirm-withdraw-btn"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Retirer {amount ? formatAmount(amount) : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
