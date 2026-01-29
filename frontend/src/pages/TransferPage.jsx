import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import axios from 'axios';

const CURRENCIES = ['EUR', 'USD', 'XOF'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA' };

export default function TransferPage() {
  const [step, setStep] = useState(1);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipient_email: '',
    amount: '',
    currency: 'EUR',
    description: ''
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
    
    if (!formData.recipient_email || !formData.amount) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (hasInsufficientFunds) {
      toast.error('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/transfers`, {
        recipient_email: formData.recipient_email,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description
      });
      setStep(3);
      toast.success('Transfert effectué avec succès!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du transfert');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount, currency) => {
    return `${parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[currency]}`;
  };

  const resetForm = () => {
    setFormData({ recipient_email: '', amount: '', currency: 'EUR', description: '' });
    setStep(1);
    fetchWallets();
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="transfer-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Envoyer de l'argent
          </h1>
          <p className="text-muted-foreground mt-1">
            Transférez de l'argent à vos proches instantanément
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Enter Details */}
        {step === 1 && (
          <Card data-testid="transfer-step-1">
            <CardHeader>
              <CardTitle className="font-['Manrope']">Détails du transfert</CardTitle>
              <CardDescription>
                Entrez les informations du destinataire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Email du destinataire *</Label>
                <Input
                  id="recipient"
                  type="email"
                  placeholder="destinataire@email.com"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  data-testid="transfer-recipient-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    data-testid="transfer-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger data-testid="transfer-currency-select">
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
                  Solde disponible: {formatAmount(selectedWallet.balance, selectedWallet.currency)}
                  {hasInsufficientFunds && ' - Solde insuffisant'}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Remboursement dîner"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="transfer-description-input"
                />
              </div>

              <Button 
                className="w-full"
                disabled={!formData.recipient_email || !formData.amount || hasInsufficientFunds}
                onClick={() => setStep(2)}
                data-testid="transfer-continue-btn"
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <Card data-testid="transfer-step-2">
            <CardHeader>
              <CardTitle className="font-['Manrope']">Confirmer le transfert</CardTitle>
              <CardDescription>
                Vérifiez les détails avant de confirmer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destinataire</span>
                  <span className="font-medium">{formData.recipient_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-bold text-xl text-primary">
                    {formatAmount(formData.amount, formData.currency)}
                  </span>
                </div>
                {formData.description && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium">{formData.description}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Retour
                </Button>
                <Button 
                  className="flex-1"
                  disabled={loading}
                  onClick={handleSubmit}
                  data-testid="transfer-confirm-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card data-testid="transfer-step-3">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
                Transfert réussi!
              </h2>
              <p className="text-muted-foreground mb-6">
                {formatAmount(formData.amount, formData.currency)} envoyé à {formData.recipient_email}
              </p>
              <Button onClick={resetForm} data-testid="transfer-new-btn">
                Nouveau transfert
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
