import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { Zap, Droplets, Wifi, Tv, CheckCircle, Loader2, Receipt } from 'lucide-react';

const BILL_TYPES = [
  { code: 'electricity', name: 'Électricité', icon: Zap, color: 'text-yellow-500' },
  { code: 'water', name: 'Eau', icon: Droplets, color: 'text-blue-500' },
  { code: 'internet', name: 'Internet', icon: Wifi, color: 'text-purple-500' },
  { code: 'tv', name: 'TV / Abonnements', icon: Tv, color: 'text-red-500' },
];

const COUNTRIES = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
];

export default function BillPaymentPage() {
  const [country, setCountry] = useState('SN');
  const [billType, setBillType] = useState('');
  const [provider, setProvider] = useState('');
  const [customerRef, setCustomerRef] = useState('');
  const [amount, setAmount] = useState('');
  const [providers, setProviders] = useState({});
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [step, setStep] = useState(1);

  useEffect(() => {
    fetchProviders();
    fetchHistory();
  }, []);

  useEffect(() => {
    setProvider('');
  }, [country, billType]);

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API}/africa/bills/providers`);
      setProviders(response.data.providers || {});
    } catch (error) {
      toast.error('Erreur lors du chargement des fournisseurs');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/africa/bills/history`);
      setHistory(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!billType || !provider || !customerRef || !amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/africa/bills/pay`, {
        bill_type: billType,
        provider: provider,
        customer_ref: customerRef,
        amount: parseFloat(amount),
        currency: 'XOF',
        payment_method: 'wallet'
      });
      
      toast.success('Paiement effectué avec succès!');
      setStep(2);
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBillType('');
    setProvider('');
    setCustomerRef('');
    setAmount('');
    setStep(1);
  };

  const countryProviders = providers[country] || [];
  const filteredProviders = billType 
    ? countryProviders.filter(p => p.type === billType)
    : countryProviders;
  
  const fee = amount ? Math.max(100, Math.round(parseFloat(amount) * 0.01)) : 0;
  const total = amount ? parseFloat(amount) + fee : 0;

  const getRefPlaceholder = () => {
    switch (billType) {
      case 'electricity': return 'Numéro de compteur';
      case 'water': return 'Numéro d\'abonné';
      case 'internet': return 'Numéro de ligne';
      case 'tv': return 'Numéro d\'abonné';
      default: return 'Référence client';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Manrope']">Paiement de Factures</h1>
          <p className="text-muted-foreground">Payez vos factures d'électricité, eau, internet et abonnements</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  {step === 1 ? 'Payer une facture' : 'Paiement réussi'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 2 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Paiement effectué!</h3>
                    <p className="text-muted-foreground">
                      Votre facture de {parseFloat(amount).toLocaleString()} XOF a été payée.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Référence: {customerRef}
                    </p>
                    <Button onClick={resetForm} className="mt-4">
                      Nouveau paiement
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Country Selection */}
                    <div className="space-y-2">
                      <Label>Pays</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger data-testid="bill-country-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.flag} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bill Type Selection */}
                    <div className="space-y-2">
                      <Label>Type de facture</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {BILL_TYPES.map(type => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.code}
                              type="button"
                              onClick={() => setBillType(type.code)}
                              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                                billType === type.code 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                              data-testid={`bill-type-${type.code}`}
                            >
                              <Icon className={`w-6 h-6 ${type.color}`} />
                              <span className="text-sm font-medium">{type.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Provider Selection */}
                    {billType && (
                      <div className="space-y-2">
                        <Label>Fournisseur</Label>
                        <Select value={provider} onValueChange={setProvider}>
                          <SelectTrigger data-testid="bill-provider-select">
                            <SelectValue placeholder="Choisir le fournisseur" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredProviders.map(p => (
                              <SelectItem key={p.code} value={p.code}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Customer Reference */}
                    {provider && (
                      <div className="space-y-2">
                        <Label>{getRefPlaceholder()}</Label>
                        <Input
                          type="text"
                          placeholder={getRefPlaceholder()}
                          value={customerRef}
                          onChange={(e) => setCustomerRef(e.target.value)}
                          data-testid="bill-ref-input"
                        />
                      </div>
                    )}

                    {/* Amount */}
                    {provider && (
                      <div className="space-y-2">
                        <Label>Montant à payer</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="5000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pr-16"
                            data-testid="bill-amount-input"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                            XOF
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {amount && parseFloat(amount) > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Montant facture</span>
                          <span>{parseFloat(amount).toLocaleString()} XOF</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Frais de service (1%)</span>
                          <span className="text-orange-600">{fee.toLocaleString()} XOF</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{total.toLocaleString()} XOF</span>
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      disabled={loading || !billType || !provider || !customerRef || !amount}
                      className="w-full"
                      data-testid="submit-bill-btn"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        `Payer ${total.toLocaleString()} XOF`
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Paiements récents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucun paiement</p>
                ) : (
                  history.slice(0, 6).map((payment) => {
                    const typeInfo = BILL_TYPES.find(t => t.code === payment.bill_type);
                    const Icon = typeInfo?.icon || Receipt;
                    return (
                      <div key={payment.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${typeInfo?.color || 'text-muted-foreground'}`} />
                          <span className="text-sm font-medium">{payment.provider_name}</span>
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                            payment.status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {payment.status === 'completed' ? '✓' : '...'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{payment.customer_ref}</div>
                        <div className="text-sm font-semibold">{payment.amount.toLocaleString()} XOF</div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
