import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useLanguage, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Loader2, Shield, Zap, Smartphone } from 'lucide-react';
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

const MOBILE_MONEY_CURRENCIES = [
  { code: 'XOF', symbol: 'CFA', name: 'Franc CFA' }
];

const MOBILE_MONEY_PROVIDERS = [
  { id: 'orange_money', name: 'Orange Money', color: 'bg-orange-500', icon: '🍊' },
  { id: 'mtn_momo', name: 'MTN Mobile Money', color: 'bg-yellow-500', icon: '📱' },
  { id: 'wave', name: 'Wave', color: 'bg-blue-500', icon: '🌊' },
  { id: 'moov_money', name: 'Moov Money', color: 'bg-purple-500', icon: '💜' }
];

export default function DepositPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  
  // Mobile Money state
  const [mobileProvider, setMobileProvider] = useState('');
  const [mobilePhoneNumber, setMobilePhoneNumber] = useState('');
  const [mobileCurrency, setMobileCurrency] = useState('XOF');
  const [mobileAmount, setMobileAmount] = useState('');
  const [pendingMobilePayment, setPendingMobilePayment] = useState(null);

  const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const depositAmount = selectedPackage?.id === 'custom' 
    ? parseFloat(customAmount) || 0 
    : selectedPackage?.amount || 0;

  const handleStripeDeposit = async () => {
    if (depositAmount < 1) {
      toast.error(`Le montant minimum est de 1 ${selectedCurrency.symbol}`);
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

  const handlePayPalDeposit = async () => {
    if (depositAmount < 1) {
      toast.error(`Le montant minimum est de 1 ${selectedCurrency.symbol}`);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/deposits/paypal`, {
        amount: depositAmount,
        currency: currency,
        origin_url: window.location.origin
      });

      // For demo, simulate PayPal payment
      if (response.data.demo_mode) {
        toast.success('Mode démo: Simulation PayPal');
        // Auto-capture the payment after a delay
        setTimeout(async () => {
          try {
            await axios.post(`${API}/deposits/paypal/capture/${response.data.order_id}`);
            toast.success('Paiement PayPal simulé avec succès!');
            navigate('/dashboard');
          } catch (err) {
            console.error(err);
          }
        }, 2000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur PayPal');
    } finally {
      setLoading(false);
    }
  };

  const handleMobileMoneyDeposit = async () => {
    if (!mobileProvider || !mobilePhoneNumber || !mobileAmount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const amount = parseFloat(mobileAmount);
    if (amount < 100) {
      toast.error('Le montant minimum est de 100 CFA');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/mobile-money/deposit`, {
        amount: amount,
        currency: mobileCurrency,
        provider: mobileProvider,
        phone_number: mobilePhoneNumber
      });

      setPendingMobilePayment(response.data);
      toast.success(`Instructions envoyées à ${mobilePhoneNumber}`);

      // For demo, auto-confirm after delay
      if (response.data.demo_mode) {
        setTimeout(async () => {
          try {
            await axios.post(`${API}/mobile-money/confirm/${response.data.reference}`);
            toast.success('Paiement Mobile Money confirmé!');
            setPendingMobilePayment(null);
            navigate('/dashboard');
          } catch (err) {
            console.error(err);
          }
        }, 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur Mobile Money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto" data-testid="deposit-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            {t('addFunds')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ajoutez des fonds à votre portefeuille
          </p>
        </div>

        <Tabs defaultValue="card" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="card" data-testid="tab-card">
              <CreditCard className="w-4 h-4 mr-2" />
              Carte
            </TabsTrigger>
            <TabsTrigger value="paypal" data-testid="tab-paypal">
              <span className="mr-2">🅿️</span>
              PayPal
            </TabsTrigger>
            <TabsTrigger value="mobile" data-testid="tab-mobile">
              <Smartphone className="w-4 h-4 mr-2" />
              Mobile Money
            </TabsTrigger>
          </TabsList>

          {/* Stripe/Card Tab */}
          <TabsContent value="card">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Manrope'] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Dépôt par carte
                  <Badge variant="secondary">Stripe</Badge>
                </CardTitle>
                <CardDescription>
                  Paiement sécurisé via Stripe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Currency Selection */}
                <div className="space-y-2">
                  <Label>{t('currency')}</Label>
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
                  <Label>{t('amount')}</Label>
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
                    <p className="font-medium text-foreground">{t('securePayment')}</p>
                    <p className="text-muted-foreground">
                      Vos informations de paiement sont protégées par le cryptage SSL de Stripe.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full h-12"
                  disabled={!selectedPackage || depositAmount < 1 || loading}
                  onClick={handleStripeDeposit}
                  data-testid="deposit-stripe-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Payer par carte
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PayPal Tab */}
          <TabsContent value="paypal">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Manrope'] flex items-center gap-2">
                  <span className="text-2xl">🅿️</span>
                  PayPal
                  <Badge className="bg-primary">{t('demo')}</Badge>
                </CardTitle>
                <CardDescription>
                  Paiement via PayPal (mode démo)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Currency Selection */}
                <div className="space-y-2">
                  <Label>{t('currency')}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
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
                  <Label>{t('amount')}</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {DEPOSIT_PACKAGES.map((pkg) => (
                      <Button
                        key={pkg.id}
                        type="button"
                        variant={selectedPackage?.id === pkg.id ? 'default' : 'outline'}
                        className="h-14"
                        onClick={() => setSelectedPackage(pkg)}
                      >
                        {pkg.id === 'custom' ? 'Autre' : `${pkg.amount} ${selectedCurrency.symbol}`}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedPackage?.id === 'custom' && (
                  <div className="space-y-2">
                    <Label>Montant personnalisé</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  </div>
                )}

                {depositAmount > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 dark:text-blue-300">Montant PayPal</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {depositAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {selectedCurrency.symbol}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-12 bg-[#0070ba] hover:bg-[#005ea6]"
                  disabled={!selectedPackage || depositAmount < 1 || loading}
                  onClick={handlePayPalDeposit}
                  data-testid="deposit-paypal-btn"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <span className="mr-2">🅿️</span>
                  )}
                  Payer avec PayPal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mobile Money Tab */}
          <TabsContent value="mobile">
            <Card>
              <CardHeader>
                <CardTitle className="font-['Manrope'] flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Mobile Money
                  <Badge className="bg-primary">{t('demo')}</Badge>
                </CardTitle>
                <CardDescription>
                  Orange Money, MTN, Wave, Moov (mode démo)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {pendingMobilePayment ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-yellow-600" />
                      <p className="font-medium text-yellow-700 dark:text-yellow-400">
                        Paiement en attente...
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-500">
                        Référence: {pendingMobilePayment.reference}
                      </p>
                      <p className="text-xs text-yellow-500 mt-2">
                        (Confirmation automatique en mode démo)
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Provider Selection */}
                    <div className="space-y-2">
                      <Label>Opérateur</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {MOBILE_MONEY_PROVIDERS.map((provider) => (
                          <Button
                            key={provider.id}
                            type="button"
                            variant={mobileProvider === provider.id ? 'default' : 'outline'}
                            className="h-16 flex-col gap-1"
                            onClick={() => setMobileProvider(provider.id)}
                            data-testid={`mobile-provider-${provider.id}`}
                          >
                            <span className="text-xl">{provider.icon}</span>
                            <span className="text-xs">{provider.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label>{t('phoneNumber')}</Label>
                      <Input
                        type="tel"
                        placeholder="+221 77 123 45 67"
                        value={mobilePhoneNumber}
                        onChange={(e) => setMobilePhoneNumber(e.target.value)}
                        data-testid="mobile-phone-input"
                      />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label>{t('amount')} (CFA)</Label>
                      <Input
                        type="number"
                        min="100"
                        step="100"
                        placeholder="5000"
                        value={mobileAmount}
                        onChange={(e) => setMobileAmount(e.target.value)}
                        data-testid="mobile-amount-input"
                      />
                      <p className="text-xs text-muted-foreground">Minimum: 100 CFA</p>
                    </div>

                    {parseFloat(mobileAmount) > 0 && (
                      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700 dark:text-green-300">Montant</span>
                          <span className="text-2xl font-bold text-green-600">
                            {parseFloat(mobileAmount).toLocaleString('fr-FR')} CFA
                          </span>
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full h-12"
                      disabled={!mobileProvider || !mobilePhoneNumber || !mobileAmount || loading}
                      onClick={handleMobileMoneyDeposit}
                      data-testid="deposit-mobile-btn"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Smartphone className="w-4 h-4 mr-2" />
                      )}
                      Payer par Mobile Money
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
