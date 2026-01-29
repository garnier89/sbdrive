import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Receipt, Loader2, CheckCircle, Zap, Phone, Wifi, Droplet, Home } from 'lucide-react';
import axios from 'axios';

const BILL_TYPES = [
  { id: 'electricity', label: 'Électricité', icon: Zap },
  { id: 'phone', label: 'Téléphone', icon: Phone },
  { id: 'internet', label: 'Internet', icon: Wifi },
  { id: 'water', label: 'Eau', icon: Droplet },
  { id: 'rent', label: 'Loyer', icon: Home }
];

const CURRENCIES = ['EUR', 'USD', 'XOF'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA' };

export default function BillsPage() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    bill_type: '',
    bill_reference: '',
    amount: '',
    currency: 'EUR'
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

    if (!formData.bill_type || !formData.bill_reference || !formData.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (hasInsufficientFunds) {
      toast.error('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/bills/pay`, {
        bill_type: formData.bill_type,
        bill_reference: formData.bill_reference,
        amount: parseFloat(formData.amount),
        currency: formData.currency
      });
      setSuccess(true);
      toast.success('Facture payée avec succès!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ bill_type: '', bill_reference: '', amount: '', currency: 'EUR' });
    setSuccess(false);
    fetchWallets();
  };

  const selectedBillType = BILL_TYPES.find(b => b.id === formData.bill_type);

  if (success) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="bills-success">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
                Paiement effectué!
              </h2>
              <p className="text-muted-foreground mb-2">
                Votre facture {selectedBillType?.label} a été payée.
              </p>
              <p className="text-xl font-bold text-primary mb-6">
                {parseFloat(formData.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[formData.currency]}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Référence: {formData.bill_reference}
              </p>
              <Button onClick={resetForm}>
                Payer une autre facture
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="bills-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Paiement de factures
          </h1>
          <p className="text-muted-foreground mt-1">
            Payez vos factures en quelques clics
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Nouvelle facture
            </CardTitle>
            <CardDescription>
              Sélectionnez le type de facture et entrez les détails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bill Type Selection */}
              <div className="space-y-2">
                <Label>Type de facture</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {BILL_TYPES.map((type) => (
                    <Button
                      key={type.id}
                      type="button"
                      variant={formData.bill_type === type.id ? 'default' : 'outline'}
                      className="h-20 flex-col gap-2"
                      onClick={() => setFormData({ ...formData, bill_type: type.id })}
                      data-testid={`bill-type-${type.id}`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Numéro de référence / Contrat</Label>
                <Input
                  id="reference"
                  type="text"
                  placeholder="Ex: 123456789"
                  value={formData.bill_reference}
                  onChange={(e) => setFormData({ ...formData, bill_reference: e.target.value })}
                  data-testid="bill-reference-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    data-testid="bill-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger data-testid="bill-currency-select">
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

              <Button
                type="submit"
                className="w-full"
                disabled={!formData.bill_type || !formData.bill_reference || !formData.amount || hasInsufficientFunds || loading}
                data-testid="bill-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Paiement en cours...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4 mr-2" />
                    Payer la facture
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
