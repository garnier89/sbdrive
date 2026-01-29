import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowUpCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const CURRENCIES = ['EUR', 'USD', 'XOF'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA' };

export default function WithdrawPage() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'EUR',
    bank_account: ''
  });

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const res = await axios.get(`${API}/wallets`);
      setWallets(res.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des portefeuilles');
    }
  };

  const selectedWallet = wallets.find(w => w.currency === formData.currency);
  const hasInsufficientFunds = selectedWallet && parseFloat(formData.amount || 0) > selectedWallet.balance;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    if (hasInsufficientFunds) {
      toast.error('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/withdrawals`, {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        bank_account: formData.bank_account
      });
      setSuccess(true);
      toast.success('Demande de retrait soumise!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du retrait');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ amount: '', currency: 'EUR', bank_account: '' });
    setSuccess(false);
    fetchWallets();
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="withdraw-success">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
                Demande soumise!
              </h2>
              <p className="text-muted-foreground mb-2">
                Votre demande de retrait a été enregistrée.
              </p>
              <p className="text-xl font-bold text-primary mb-6">
                {parseFloat(formData.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[formData.currency]}
              </p>
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Le retrait sera traité sous 1-3 jours ouvrés après validation par notre équipe.
                  </p>
                </div>
              </div>
              <Button onClick={resetForm}>
                Nouveau retrait
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="withdraw-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Retirer des fonds
          </h1>
          <p className="text-muted-foreground mt-1">
            Transférez de l'argent vers votre compte bancaire
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              Demande de retrait
            </CardTitle>
            <CardDescription>
              Les retraits sont traités sous 1-3 jours ouvrés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    data-testid="withdraw-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger data-testid="withdraw-currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedWallet && (
                <p className={`text-sm ${hasInsufficientFunds ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Solde disponible: {selectedWallet.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[selectedWallet.currency]}
                  {hasInsufficientFunds && ' - Solde insuffisant'}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="bank_account">IBAN / Compte bancaire</Label>
                <Input
                  id="bank_account"
                  type="text"
                  placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  data-testid="withdraw-bank-input"
                />
                <p className="text-xs text-muted-foreground">
                  Entrez votre IBAN pour recevoir les fonds
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!formData.amount || hasInsufficientFunds || loading}
                data-testid="withdraw-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Demander le retrait
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
