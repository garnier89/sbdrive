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
import { ArrowRight, RefreshCw, Smartphone, CheckCircle, AlertCircle, Loader2, Star, Trash2 } from 'lucide-react';

const COUNTRIES = [
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲' },
];

const OPERATOR_LOGOS = {
  wave: '🌊',
  orange_money: '🟠',
  mtn_momo: '🟡',
  moov: '🔵',
  free_money: '🟣',
};

export default function MobileMoneyTransferPage() {
  const [sourceCountry, setSourceCountry] = useState('SN');
  const [destCountry, setDestCountry] = useState('SN');
  const [sourceOperator, setSourceOperator] = useState('');
  const [destOperator, setDestOperator] = useState('');
  const [sourcePhone, setSourcePhone] = useState('');
  const [destPhone, setDestPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [operators, setOperators] = useState({});
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [step, setStep] = useState(1); // 1: Form, 2: Confirm, 3: Success

  useEffect(() => {
    fetchOperators();
    fetchTransfers();
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (sourceOperator && destOperator && amount && parseFloat(amount) > 0) {
      calculateFees();
    } else {
      setFees(null);
    }
  }, [sourceOperator, destOperator, amount]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API}/user/favorite-operators?category=transfer`);
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const addToFavorites = async (operatorCode, operatorName, country) => {
    try {
      await axios.post(`${API}/user/favorite-operators`, {
        operator_code: operatorCode,
        operator_name: operatorName,
        country: country,
        category: 'transfer'
      });
      toast.success('Ajouté aux favoris !');
      fetchFavorites();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout aux favoris');
    }
  };

  const removeFromFavorites = async (favoriteId) => {
    try {
      await axios.delete(`${API}/user/favorite-operators/${favoriteId}`);
      toast.success('Supprimé des favoris');
      fetchFavorites();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const selectFavorite = (fav) => {
    // Find the country for this operator
    const countryForOperator = Object.keys(operators).find(country => 
      operators[country]?.some(op => op.code === fav.operator_code)
    );
    
    if (countryForOperator) {
      setDestCountry(fav.country || countryForOperator);
      setDestOperator(fav.operator_code);
      toast.success(`${fav.operator_name} sélectionné`);
    }
  };

  const isFavorite = (operatorCode) => {
    return favorites.some(f => f.operator_code === operatorCode);
  };

  const fetchOperators = async () => {
    try {
      const response = await axios.get(`${API}/africa/mobile-money/operators`);
      setOperators(response.data.operators_by_country || {});
    } catch (error) {
      toast.error('Erreur lors du chargement des opérateurs');
    }
  };

  const fetchTransfers = async () => {
    try {
      const response = await axios.get(`${API}/africa/mobile-money/transfers`);
      setTransfers(response.data.transfers || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const calculateFees = async () => {
    setLoadingFees(true);
    try {
      const response = await axios.get(`${API}/africa/mobile-money/fees`, {
        params: {
          source_operator: sourceOperator,
          dest_operator: destOperator,
          amount: parseFloat(amount)
        }
      });
      setFees(response.data.fees);
    } catch (error) {
      toast.error('Erreur lors du calcul des frais');
    } finally {
      setLoadingFees(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validate and go to confirmation
      if (!sourceOperator || !destOperator || !sourcePhone || !destPhone || !amount) {
        toast.error('Veuillez remplir tous les champs');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      // Execute transfer
      setLoading(true);
      try {
        const response = await axios.post(`${API}/africa/mobile-money/transfer`, {
          source_operator: sourceOperator,
          source_phone: sourcePhone,
          dest_operator: destOperator,
          dest_phone: destPhone,
          dest_country: destCountry,
          amount: parseFloat(amount),
          currency: 'XOF'
        });
        
        toast.success('Transfert initié avec succès!');
        setStep(3);
        fetchTransfers();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Erreur lors du transfert');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setSourceOperator('');
    setDestOperator('');
    setSourcePhone('');
    setDestPhone('');
    setAmount('');
    setFees(null);
    setStep(1);
  };

  const sourceOps = operators[sourceCountry] || [];
  const destOps = operators[destCountry] || [];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope']">Transfert Mobile Money</h1>
            <p className="text-muted-foreground">Envoyez de l'argent entre différents opérateurs</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
            <RefreshCw className="w-4 h-4" />
            Interopérable
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Transfer Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  {step === 1 && 'Nouveau transfert'}
                  {step === 2 && 'Confirmer le transfert'}
                  {step === 3 && 'Transfert réussi'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 3 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Transfert en cours!</h3>
                    <p className="text-muted-foreground">
                      Votre transfert de {parseFloat(amount).toLocaleString()} XOF vers {destPhone} est en cours de traitement.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Le destinataire recevra {fees?.amount_received?.toLocaleString()} XOF
                    </p>
                    <Button onClick={resetForm} className="mt-4">
                      Nouveau transfert
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Source Section */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">Expéditeur</h4>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pays</Label>
                          <Select value={sourceCountry} onValueChange={(v) => { setSourceCountry(v); setSourceOperator(''); }}>
                            <SelectTrigger data-testid="source-country-select">
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
                        
                        <div className="space-y-2">
                          <Label>Opérateur</Label>
                          <Select value={sourceOperator} onValueChange={setSourceOperator} disabled={step === 2}>
                            <SelectTrigger data-testid="source-operator-select">
                              <SelectValue placeholder="Choisir l'opérateur" />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceOps.map(op => (
                                <SelectItem key={op.code} value={op.code}>
                                  {OPERATOR_LOGOS[op.code] || '📱'} {op.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Numéro de téléphone</Label>
                        <Input
                          type="tel"
                          placeholder="+221 77 XXX XX XX"
                          value={sourcePhone}
                          onChange={(e) => setSourcePhone(e.target.value)}
                          disabled={step === 2}
                          data-testid="source-phone-input"
                        />
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-primary rotate-90" />
                      </div>
                    </div>

                    {/* Destination Section */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase">Destinataire</h4>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pays</Label>
                          <Select value={destCountry} onValueChange={(v) => { setDestCountry(v); setDestOperator(''); }}>
                            <SelectTrigger data-testid="dest-country-select">
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
                        
                        <div className="space-y-2">
                          <Label>Opérateur</Label>
                          <Select value={destOperator} onValueChange={setDestOperator} disabled={step === 2}>
                            <SelectTrigger data-testid="dest-operator-select">
                              <SelectValue placeholder="Choisir l'opérateur" />
                            </SelectTrigger>
                            <SelectContent>
                              {destOps.map(op => (
                                <SelectItem key={op.code} value={op.code}>
                                  {OPERATOR_LOGOS[op.code] || '📱'} {op.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Numéro de téléphone</Label>
                        <Input
                          type="tel"
                          placeholder="+225 07 XXX XX XX"
                          value={destPhone}
                          onChange={(e) => setDestPhone(e.target.value)}
                          disabled={step === 2}
                          data-testid="dest-phone-input"
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label>Montant à envoyer</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="10000"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          disabled={step === 2}
                          className="pr-16 text-lg"
                          data-testid="amount-input"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          XOF
                        </span>
                      </div>
                    </div>

                    {/* Fees Display */}
                    {fees && (
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Montant envoyé</span>
                          <span>{parseFloat(amount).toLocaleString()} XOF</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Frais ({fees.percent}% + {fees.fixed} XOF)</span>
                          <span className="text-orange-600">-{fees.total.toLocaleString()} XOF</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>Le destinataire reçoit</span>
                          <span className="text-green-600">{fees.amount_received.toLocaleString()} XOF</span>
                        </div>
                      </div>
                    )}

                    {loadingFees && (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Calcul des frais...
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      {step === 2 && (
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                          Modifier
                        </Button>
                      )}
                      <Button 
                        type="submit" 
                        disabled={loading || (step === 1 && !fees)}
                        className="flex-1"
                        data-testid="submit-transfer-btn"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Traitement...
                          </>
                        ) : step === 1 ? (
                          'Continuer'
                        ) : (
                          'Confirmer le transfert'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Favorites & Recent Transfers */}
          <div className="space-y-6">
            {/* Favorites */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Favoris
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {favorites.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Aucun favori. Ajoutez des opérateurs pour un accès rapide.
                  </p>
                ) : (
                  favorites.map((fav) => (
                    <div 
                      key={fav.id} 
                      className="flex items-center justify-between p-2 bg-yellow-50 hover:bg-yellow-100 rounded-lg cursor-pointer transition-colors group"
                      onClick={() => selectFavorite(fav)}
                      data-testid={`favorite-${fav.operator_code}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{OPERATOR_LOGOS[fav.operator_code] || '📱'}</span>
                        <div>
                          <p className="text-sm font-medium">{fav.operator_name}</p>
                          <p className="text-xs text-muted-foreground">{fav.country}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); removeFromFavorites(fav.id); }}
                        data-testid={`remove-favorite-${fav.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
                
                {/* Add to favorites button for selected operator */}
                {destOperator && !isFavorite(destOperator) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    onClick={() => {
                      const op = destOps.find(o => o.code === destOperator);
                      if (op) addToFavorites(destOperator, op.name, destCountry);
                    }}
                    data-testid="add-favorite-btn"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Ajouter aux favoris
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recent Transfers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transferts récents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transfers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Aucun transfert</p>
                ) : (
                  transfers.slice(0, 5).map((transfer) => (
                    <div key={transfer.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {OPERATOR_LOGOS[transfer.source_operator]} → {OPERATOR_LOGOS[transfer.dest_operator]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          transfer.status === 'completed' 
                            ? 'bg-green-100 text-green-700' 
                            : transfer.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {transfer.status === 'completed' ? 'Réussi' : 
                           transfer.status === 'failed' ? 'Échoué' : 'En cours'}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transfer.dest_phone}
                      </div>
                      <div className="text-sm font-semibold">
                        {transfer.amount.toLocaleString()} {transfer.currency}
                      </div>
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
