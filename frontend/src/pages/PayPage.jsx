import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  CreditCard, Wallet, Smartphone, CheckCircle, XCircle, Clock,
  Lock, ArrowLeft, AlertCircle
} from 'lucide-react';
import axios from 'axios';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png";
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH', NGN: '₦' };

export default function PayPage() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);

  useEffect(() => {
    fetchPaymentLink();
    if (isAuthenticated) {
      fetchWallets();
    }
  }, [linkId, isAuthenticated]);

  const fetchPaymentLink = async () => {
    try {
      const res = await axios.get(`${API}/payment-links/${linkId}`);
      setLink(res.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Lien de paiement introuvable');
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await axios.get(`${API}/wallets`);
      setWallets(res.data || []);
      // Auto-select wallet with matching currency
      const matchingWallet = res.data?.find(w => w.currency === link?.currency);
      if (matchingWallet) {
        setSelectedWallet(matchingWallet);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const handlePayWithWallet = async () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour payer avec votre wallet');
      navigate(`/login?redirect=/pay/${linkId}`);
      return;
    }

    if (!selectedWallet) {
      toast.error('Veuillez sélectionner un wallet');
      return;
    }

    if (selectedWallet.balance < link.amount) {
      toast.error('Solde insuffisant');
      return;
    }

    setPaying(true);
    try {
      await axios.post(`${API}/payment-links/${linkId}/pay`, {
        method: 'wallet',
        wallet_currency: selectedWallet.currency
      });
      toast.success('Paiement effectué avec succès !');
      fetchPaymentLink(); // Refresh to show paid status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setPaying(false);
    }
  };

  const handlePayWithCard = async () => {
    // In real implementation, redirect to Stripe checkout
    toast.info('Redirection vers le paiement par carte...');
    // For demo, we would integrate with Stripe here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (link.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Paiement effectué</h2>
            <p className="text-muted-foreground mb-4">
              Ce lien de paiement a déjà été utilisé.
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-2xl font-bold text-green-700">
                {CURRENCY_SYMBOLS[link.currency] || link.currency} {link.amount.toLocaleString()}
              </p>
              <p className="text-sm text-green-600">{link.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (link.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 mx-auto text-gray-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Lien expiré</h2>
            <p className="text-muted-foreground mb-4">
              Ce lien de paiement a expiré.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (link.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Lien annulé</h2>
            <p className="text-muted-foreground mb-4">
              Ce lien de paiement a été annulé par le créateur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center border-b">
          <img src={LOGO_URL} alt="SB Money" className="w-16 h-16 mx-auto mb-2" />
          <CardTitle className="font-['Manrope']">Paiement SB Money</CardTitle>
          <CardDescription>Paiement sécurisé</CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Amount */}
          <div className="text-center bg-muted rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Montant à payer</p>
            <p className="text-4xl font-bold font-['Manrope'] text-primary">
              {CURRENCY_SYMBOLS[link.currency] || link.currency} {link.amount.toLocaleString()}
            </p>
            <p className="text-sm mt-2">{link.description}</p>
          </div>

          {/* Payment Methods */}
          <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="card" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Carte
              </TabsTrigger>
              <TabsTrigger value="wallet" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Wallet
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4 mt-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <CreditCard className="w-12 h-12 mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">
                  Vous serez redirigé vers une page de paiement sécurisée
                </p>
              </div>
              <Button onClick={handlePayWithCard} className="w-full" size="lg">
                <CreditCard className="w-4 h-4 mr-2" />
                Payer par carte
              </Button>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-4 mt-4">
              {!isAuthenticated ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Connectez-vous pour payer avec votre wallet SB Money
                  </p>
                  <Button 
                    onClick={() => navigate(`/login?redirect=/pay/${linkId}`)}
                    className="w-full"
                  >
                    Se connecter
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sélectionnez un wallet</p>
                    {wallets.filter(w => w.balance > 0).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun wallet avec solde disponible
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {wallets.filter(w => w.balance > 0).map(wallet => (
                          <div
                            key={wallet.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedWallet?.id === wallet.id 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedWallet(wallet)}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{wallet.currency}</span>
                              <span className={wallet.balance >= link.amount ? 'text-green-600' : 'text-red-500'}>
                                {CURRENCY_SYMBOLS[wallet.currency]} {wallet.balance.toLocaleString()}
                              </span>
                            </div>
                            {wallet.balance < link.amount && (
                              <p className="text-xs text-red-500 mt-1">Solde insuffisant</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handlePayWithWallet} 
                    className="w-full" 
                    size="lg"
                    disabled={paying || !selectedWallet || selectedWallet.balance < link.amount}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    {paying ? 'Paiement en cours...' : 'Payer avec Wallet'}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Paiement sécurisé par SB Money</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
