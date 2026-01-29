import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CreditCard, Loader2, Shield, Zap } from 'lucide-react';
import axios from 'axios';

const DEPOSIT_PACKAGES = [
  { id: 'small', amount: 10, label: '10' },
  { id: 'medium', amount: 25, label: '25' },
  { id: 'large', amount: 50, label: '50' },
  { id: 'xlarge', amount: 100, label: '100' },
  { id: 'custom', amount: 0, label: 'Personnalisé' }
];

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dollar US' }
];

export default function DepositPage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency);
  const depositAmount = selectedPackage?.id === 'custom' 
    ? parseFloat(customAmount) || 0 
    : selectedPackage?.amount || 0;

  const handleDeposit = async () => {
    if (depositAmount < 1) {
      toast.error('Le montant minimum est de 1 ' + selectedCurrency.symbol);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/deposits/checkout`, {
        amount: depositAmount,
        currency: currency.toLowerCase(),
        origin_url: window.location.origin
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error('Erreur lors de la création de la session de paiement');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du dépôt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="deposit-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Approvisionner mon compte
          </h1>
          <p className="text-muted-foreground mt-1">
            Ajoutez des fonds à votre portefeuille via carte bancaire
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Dépôt par carte
            </CardTitle>
            <CardDescription>
              Paiement sécurisé via Stripe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-testid="deposit-currency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Selection */}
            <div className="space-y-2">
              <Label>Montant</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {DEPOSIT_PACKAGES.map((pkg) => (
                  <Button
                    key={pkg.id}
                    type="button"
                    variant={selectedPackage?.id === pkg.id ? 'default' : 'outline'}
                    className="h-14"
                    onClick={() => setSelectedPackage(pkg)}
                    data-testid={`deposit-package-${pkg.id}`}
                  >
                    {pkg.id === 'custom' ? 'Autre' : `${pkg.amount} ${selectedCurrency.symbol}`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount Input */}
            {selectedPackage?.id === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customAmount">Montant personnalisé</Label>
                <div className="relative">
                  <Input
                    id="customAmount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pr-12"
                    data-testid="deposit-custom-amount-input"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {selectedCurrency.symbol}
                  </span>
                </div>
              </div>
            )}

            {/* Summary */}
            {depositAmount > 0 && (
              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Montant à déposer</span>
                  <span className="text-2xl font-bold text-primary">
                    {depositAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {selectedCurrency.symbol}
                  </span>
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Paiement sécurisé</p>
                <p className="text-muted-foreground">
                  Vos informations de paiement sont protégées par le cryptage SSL de Stripe.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12"
              disabled={!selectedPackage || depositAmount < 1 || loading}
              onClick={handleDeposit}
              data-testid="deposit-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Continuer vers le paiement
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
