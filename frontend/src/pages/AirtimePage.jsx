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
import { Phone, CheckCircle, Loader2, History, Zap } from 'lucide-react';

const COUNTRIES = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', prefix: '+221' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', prefix: '+225' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', prefix: '+223' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', prefix: '+226' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', prefix: '+237' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

export default function AirtimePage() {
  const [country, setCountry] = useState('SN');
  const [operator, setOperator] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [operators, setOperators] = useState({});
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [step, setStep] = useState(1); // 1: Form, 2: Success

  useEffect(() => {
    fetchOperators();
    fetchHistory();
  }, []);

  useEffect(() => {
    setOperator('');
  }, [country]);

  const fetchOperators = async () => {
    try {
      const response = await axios.get(`${API}/africa/airtime/operators`);
      setOperators(response.data.operators_by_country || {});
    } catch (error) {
      toast.error('Erreur lors du chargement des opérateurs');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/africa/airtime/history`);
      setHistory(response.data.topups || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!operator || !phoneNumber || !amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const numAmount = parseFloat(amount);
    const selectedOp = (operators[country] || []).find(op => op.code === operator);
    
    if (selectedOp && (numAmount < selectedOp.min || numAmount > selectedOp.max)) {
      toast.error(`Le montant doit être entre ${selectedOp.min} et ${selectedOp.max} XOF`);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/africa/airtime/topup`, {
        phone_number: phoneNumber,
        operator: operator,
        country: country,
        amount: numAmount,
        currency: 'XOF',
        payment_method: 'wallet'
      });
      
      toast.success('Recharge effectuée avec succès!');
      setStep(2);
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la recharge');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOperator('');
    setPhoneNumber('');
    setAmount('');
    setStep(1);
  };

  const countryOps = operators[country] || [];
  const selectedOp = countryOps.find(op => op.code === operator);
  const countryInfo = COUNTRIES.find(c => c.code === country);
  const fee = amount ? Math.round(parseFloat(amount) * 0.02) : 0;
  const total = amount ? parseFloat(amount) + fee : 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope']">Recharge Crédit</h1>
            <p className="text-muted-foreground">Achetez du crédit téléphonique pour tous les opérateurs</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <Zap className="w-4 h-4" />
            Instantané
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recharge Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  {step === 1 ? 'Nouvelle recharge' : 'Recharge réussie'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 2 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Recharge effectuée!</h3>
                    <p className="text-muted-foreground">
                      {parseFloat(amount).toLocaleString()} XOF ont été envoyés au {phoneNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Opérateur: {selectedOp?.name}
                    </p>
                    <Button onClick={resetForm} className="mt-4">
                      Nouvelle recharge
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Country Selection */}
                    <div className="space-y-2">
                      <Label>Pays</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger data-testid="airtime-country-select">
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

                    {/* Operator Selection with logos */}
                    <div className="space-y-2">
                      <Label>Opérateur</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {countryOps.map(op => (
                          <button
                            key={op.code}
                            type="button"
                            onClick={() => setOperator(op.code)}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              operator === op.code 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            data-testid={`operator-${op.code}`}
                          >
                            <div className="text-2xl mb-1">📱</div>
                            <div className="text-sm font-medium">{op.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {op.min.toLocaleString()} - {op.max.toLocaleString()} XOF
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <Label>Numéro de téléphone</Label>
                      <div className="flex gap-2">
                        <div className="w-24 flex items-center justify-center bg-muted rounded-md text-sm font-medium">
                          {countryInfo?.prefix}
                        </div>
                        <Input
                          type="tel"
                          placeholder="77 XXX XX XX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="flex-1"
                          data-testid="airtime-phone-input"
                        />
                      </div>
                    </div>

                    {/* Quick Amounts */}
                    <div className="space-y-2">
                      <Label>Montant</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                        {QUICK_AMOUNTS.map(amt => (
                          <Button
                            key={amt}
                            type="button"
                            variant={amount === String(amt) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAmount(String(amt))}
                            className="text-sm"
                          >
                            {amt.toLocaleString()}
                          </Button>
                        ))}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Autre montant"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pr-16"
                          data-testid="airtime-amount-input"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          XOF
                        </span>
                      </div>
                      {selectedOp && (
                        <p className="text-xs text-muted-foreground">
                          Min: {selectedOp.min.toLocaleString()} XOF | Max: {selectedOp.max.toLocaleString()} XOF
                        </p>
                      )}
                    </div>

                    {/* Summary */}
                    {amount && parseFloat(amount) > 0 && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Crédit envoyé</span>
                          <span>{parseFloat(amount).toLocaleString()} XOF</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Frais (2%)</span>
                          <span className="text-orange-600">{fee.toLocaleString()} XOF</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Total à payer</span>
                          <span>{total.toLocaleString()} XOF</span>
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      disabled={loading || !operator || !phoneNumber || !amount}
                      className="w-full"
                      data-testid="submit-airtime-btn"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        `Recharger ${total.toLocaleString()} XOF`
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucune recharge</p>
                ) : (
                  history.slice(0, 8).map((topup) => (
                    <div key={topup.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{topup.operator_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          topup.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : topup.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {topup.status === 'completed' ? '✓' : 
                           topup.status === 'failed' ? '✗' : '...'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{topup.phone_number}</div>
                      <div className="text-sm font-semibold">{topup.amount.toLocaleString()} XOF</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
