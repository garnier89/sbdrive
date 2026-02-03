import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  CreditCard, Plus, Lock, Unlock, Trash2, Settings, 
  Eye, EyeOff, Copy, Wifi, Globe, ShieldCheck, 
  Loader2, AlertTriangle, CheckCircle, History, Wallet,
  KeyRound, TrendingUp, Clock, RefreshCw, Zap
} from 'lucide-react';
import axios from 'axios';

const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'MAD'];
const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH' };

// Visibility timeout in seconds
const CARD_VISIBILITY_TIMEOUT = 60;

export default function VirtualCardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardDetails, setShowCardDetails] = useState(null);
  const [cardTransactions, setCardTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Settings dialogs
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  
  // Card reveal state (Afficher/Masquer)
  const [showRevealDialog, setShowRevealDialog] = useState(false);
  const [revealCardId, setRevealCardId] = useState(null);
  const [revealedCards, setRevealedCards] = useState({}); // {cardId: {details, expiresAt}}
  const [revealPin, setRevealPin] = useState('');
  const [revealCountdown, setRevealCountdown] = useState({});
  
  // PIN management
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Limits management
  const [tempLimits, setTempLimits] = useState({
    daily_limit: 100000,
    monthly_limit: 500000,
    transaction_limit: 50000
  });
  
  // Boost (temporary increase)
  const [boostAmount, setBoostAmount] = useState(50000);
  const [boostDuration, setBoostDuration] = useState('24h');
  
  // New card form
  const [newCard, setNewCard] = useState({
    currency: 'XOF',
    daily_limit: 100000,
    monthly_limit: 500000,
    transaction_limit: 50000,
    card_name: ''
  });
  
  // Created card details
  const [createdCardDetails, setCreatedCardDetails] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  // Countdown timer for revealed cards
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newCountdowns = {};
      const stillRevealed = {};
      
      Object.entries(revealedCards).forEach(([cardId, data]) => {
        const remaining = Math.max(0, Math.floor((data.expiresAt - now) / 1000));
        if (remaining > 0) {
          stillRevealed[cardId] = data;
          newCountdowns[cardId] = remaining;
        }
      });
      
      setRevealedCards(stillRevealed);
      setRevealCountdown(newCountdowns);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [revealedCards]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/virtual-card/list`);
      setCards(res.data.cards || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des cartes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async () => {
    setCreating(true);
    try {
      const res = await axios.post(`${API}/virtual-card/create`, newCard);
      setCreatedCardDetails(res.data.card);
      setShowCreateDialog(false);
      toast.success('Carte virtuelle créée avec succès!');
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleBlockCard = async (cardId, action) => {
    try {
      await axios.post(`${API}/virtual-card/block`, {
        card_id: cardId,
        action: action
      });
      toast.success(action === 'block' ? 'Carte bloquée' : 'Carte débloquée');
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette carte ? Cette action est irréversible.')) return;
    
    try {
      await axios.delete(`${API}/virtual-card/${cardId}`);
      toast.success('Carte supprimée');
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleToggleFeature = async (cardId, feature, enabled) => {
    try {
      await axios.post(`${API}/virtual-card/toggle-feature/${cardId}?feature=${feature}&enabled=${enabled}`);
      toast.success('Paramètre mis à jour');
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleUpdatePin = async () => {
    if (newPin.length !== 4 || !newPin.match(/^\d{4}$/)) {
      toast.error('Le PIN doit contenir exactement 4 chiffres');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Les PIN ne correspondent pas');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/virtual-card/update-pin/${selectedCard.id}`, {
        current_pin: currentPin,
        new_pin: newPin
      });
      toast.success('PIN mis à jour avec succès');
      setShowPinDialog(false);
      resetPinForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour du PIN');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateLimits = async () => {
    setProcessing(true);
    try {
      await axios.put(`${API}/virtual-card/limits/${selectedCard.id}`, tempLimits);
      toast.success('Limites mises à jour');
      setShowLimitsDialog(false);
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleBoostLimit = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/virtual-card/boost/${selectedCard.id}`, {
        amount: boostAmount,
        duration: boostDuration
      });
      toast.success(`Plafond augmenté de ${formatAmount(boostAmount, selectedCard.currency)} pour ${boostDuration}`);
      setShowBoostDialog(false);
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const fetchCardTransactions = async (cardId) => {
    setLoadingTransactions(true);
    try {
      const res = await axios.get(`${API}/virtual-card/transactions/${cardId}`);
      setCardTransactions(res.data.transactions || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié!`);
  };

  const formatAmount = (amount, currency) => {
    return `${parseFloat(amount).toLocaleString('fr-FR')} ${CURRENCY_SYMBOLS[currency] || currency}`;
  };

  const resetPinForm = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const openCardSettings = (card) => {
    setSelectedCard(card);
    setTempLimits({
      daily_limit: card.daily_limit,
      monthly_limit: card.monthly_limit || 500000,
      transaction_limit: card.transaction_limit
    });
    setShowSettingsDialog(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    const labels = { active: 'Active', blocked: 'Bloquée', frozen: 'Gelée' };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  const PinInput = ({ value, onChange, maxLength = 4 }) => (
    <div className="relative">
      <Input
        type={showPin ? "text" : "password"}
        maxLength={maxLength}
        placeholder={showPin ? "0000" : "••••"}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="text-center text-2xl tracking-[0.5em] font-mono pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPin(!showPin)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );

  const CardVisual = ({ card, showFull = false }) => {
    const isVisa = card.card_brand === 'visa';
    const gradientClass = isVisa 
      ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900'
      : 'bg-gradient-to-br from-orange-500 via-red-600 to-red-800';
    
    return (
      <div className={`relative w-full max-w-sm h-48 rounded-2xl p-6 text-white shadow-xl ${gradientClass}`}>
        <div className="absolute top-6 left-6 w-12 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md" />
        <div className="absolute top-6 right-6">
          <Wifi className="w-6 h-6 rotate-90 opacity-80" />
        </div>
        <div className="absolute bottom-20 left-6 right-6">
          <p className="text-lg font-mono tracking-widest">
            {showFull ? card.card_number : card.card_number_masked}
          </p>
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div>
            <p className="text-xs opacity-70">TITULAIRE</p>
            <p className="font-medium truncate max-w-[150px]">{card.card_name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">EXPIRE</p>
            <p className="font-medium">{card.expiry}</p>
          </div>
          {showFull && (
            <div className="text-right">
              <p className="text-xs opacity-70">CVV</p>
              <p className="font-medium">{card.cvv}</p>
            </div>
          )}
        </div>
        <div className="absolute bottom-4 right-4">
          <span className="text-2xl font-bold opacity-90">
            {isVisa ? 'VISA' : 'MC'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="virtual-cards-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary" />
              💳 Cartes Virtuelles
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez et gérez vos cartes virtuelles pour les paiements en ligne et sans contact
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="create-card-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle carte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer une carte virtuelle</DialogTitle>
                <DialogDescription>
                  Configurez votre nouvelle carte virtuelle avec vos limites personnalisées
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom de la carte</Label>
                  <Input
                    placeholder="Ex: Shopping en ligne"
                    value={newCard.card_name}
                    onChange={(e) => setNewCard({...newCard, card_name: e.target.value})}
                    data-testid="card-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select 
                    value={newCard.currency}
                    onValueChange={(v) => setNewCard({...newCard, currency: v})}
                  >
                    <SelectTrigger data-testid="card-currency-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c} value={c}>{c} ({CURRENCY_SYMBOLS[c]})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Limits Configuration */}
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Configuration des limites
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Limite par transaction</Label>
                      <span className="font-mono">{formatAmount(newCard.transaction_limit, newCard.currency)}</span>
                    </div>
                    <Slider
                      value={[newCard.transaction_limit]}
                      onValueChange={([v]) => setNewCard({...newCard, transaction_limit: v})}
                      max={200000}
                      min={5000}
                      step={5000}
                      className="py-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Limite journalière</Label>
                      <span className="font-mono">{formatAmount(newCard.daily_limit, newCard.currency)}</span>
                    </div>
                    <Slider
                      value={[newCard.daily_limit]}
                      onValueChange={([v]) => setNewCard({...newCard, daily_limit: v})}
                      max={500000}
                      min={10000}
                      step={10000}
                      className="py-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Label>Limite mensuelle</Label>
                      <span className="font-mono">{formatAmount(newCard.monthly_limit, newCard.currency)}</span>
                    </div>
                    <Slider
                      value={[newCard.monthly_limit]}
                      onValueChange={([v]) => setNewCard({...newCard, monthly_limit: v})}
                      max={2000000}
                      min={50000}
                      step={50000}
                      className="py-2"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateCard} disabled={creating} data-testid="confirm-create-btn">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Créer la carte
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Created Card Details Modal */}
        {createdCardDetails && (
          <Dialog open={!!createdCardDetails} onOpenChange={() => setCreatedCardDetails(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Carte créée avec succès!
                </DialogTitle>
                <DialogDescription>
                  Conservez ces informations en lieu sûr. Elles ne seront plus affichées.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <CardVisual card={createdCardDetails} showFull={true} />
                
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Numéro</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{createdCardDetails.card_number}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(createdCardDetails.card_number.replace(/\s/g, ''), 'Numéro')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">CVV</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{createdCardDetails.cvv}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(createdCardDetails.cvv, 'CVV')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">Expiration</span>
                    <span className="font-mono">{createdCardDetails.expiry}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">PIN par défaut</span>
                    <span className="font-mono font-bold text-primary">0000</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    PIN par défaut: 0000. Changez-le immédiatement dans les paramètres de la carte!
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreatedCardDetails(null)} className="w-full">
                  J'ai noté les informations
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : cards.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <CreditCard className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucune carte virtuelle</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre première carte virtuelle pour effectuer des paiements en ligne et sans contact
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer ma première carte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map((card) => (
              <Card key={card.id} className="overflow-hidden" data-testid={`card-${card.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{card.card_name}</CardTitle>
                      <CardDescription>•••• {card.last_four}</CardDescription>
                    </div>
                    {getStatusBadge(card.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mini card visual */}
                  <div className={`rounded-xl p-4 text-white ${
                    card.card_brand === 'visa' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-800'
                      : 'bg-gradient-to-r from-orange-500 to-red-700'
                  }`}>
                    <div className="flex justify-between items-center mb-4">
                      <Wifi className="w-5 h-5 rotate-90 opacity-70" />
                      <span className="font-bold">{card.card_brand === 'visa' ? 'VISA' : 'MC'}</span>
                    </div>
                    <p className="font-mono text-lg tracking-wider mb-2">{card.card_number_masked}</p>
                    <div className="flex justify-between text-sm">
                      <span>EXP: {card.expiry}</span>
                      <span>{card.currency}</span>
                    </div>
                  </div>
                  
                  {/* Card Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground">Solde wallet</p>
                      <p className="font-semibold">{formatAmount(card.wallet_balance, card.currency)}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground">Dépensé aujourd'hui</p>
                      <p className="font-semibold">{formatAmount(card.daily_spent || 0, card.currency)}</p>
                    </div>
                  </div>
                  
                  {/* Limits Progress */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Limite journalière</span>
                        <span>{formatAmount(card.daily_spent || 0, card.currency)} / {formatAmount(card.daily_limit, card.currency)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(((card.daily_spent || 0) / card.daily_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Limite mensuelle</span>
                        <span>{formatAmount(card.monthly_spent || 0, card.currency)} / {formatAmount(card.monthly_limit || 500000, card.currency)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(((card.monthly_spent || 0) / (card.monthly_limit || 500000)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Features toggles */}
                  <div className="flex gap-4 py-2 border-t">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <Switch 
                        checked={card.is_online_enabled}
                        onCheckedChange={(v) => handleToggleFeature(card.id, 'online', v)}
                        disabled={card.status !== 'active'}
                      />
                      <span className="text-xs">En ligne</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-muted-foreground" />
                      <Switch 
                        checked={card.is_contactless_enabled}
                        onCheckedChange={(v) => handleToggleFeature(card.id, 'contactless', v)}
                        disabled={card.status !== 'active'}
                      />
                      <span className="text-xs">Sans contact</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {card.status === 'active' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleBlockCard(card.id, 'block')}
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        Bloquer
                      </Button>
                    ) : card.status === 'blocked' ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleBlockCard(card.id, 'unblock')}
                      >
                        <Unlock className="w-4 h-4 mr-1" />
                        Débloquer
                      </Button>
                    ) : null}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openCardSettings(card)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Gérer
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedCard(card);
                        fetchCardTransactions(card.id);
                      }}
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Card Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Gérer la carte
              </DialogTitle>
              <DialogDescription>
                {selectedCard?.card_name} •••• {selectedCard?.last_four}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => { setShowSettingsDialog(false); setShowPinDialog(true); }}
              >
                <KeyRound className="w-4 h-4 mr-3" />
                Modifier le code PIN
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => { setShowSettingsDialog(false); setShowLimitsDialog(true); }}
              >
                <TrendingUp className="w-4 h-4 mr-3" />
                Configurer les limites
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => { setShowSettingsDialog(false); setShowBoostDialog(true); }}
              >
                <Zap className="w-4 h-4 mr-3" />
                Augmentation temporaire du plafond
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => { setShowSettingsDialog(false); handleDeleteCard(selectedCard?.id); }}
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Supprimer la carte
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update PIN Dialog */}
        <Dialog open={showPinDialog} onOpenChange={(open) => { setShowPinDialog(open); if (!open) resetPinForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Modifier le code PIN
              </DialogTitle>
              <DialogDescription>
                Entrez votre PIN actuel et choisissez un nouveau PIN à 4 chiffres
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>PIN actuel</Label>
                <PinInput value={currentPin} onChange={setCurrentPin} />
              </div>
              <div className="space-y-2">
                <Label>Nouveau PIN (4 chiffres)</Label>
                <PinInput value={newPin} onChange={setNewPin} />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le nouveau PIN</Label>
                <PinInput value={confirmPin} onChange={setConfirmPin} />
              </div>
              {newPin && confirmPin && newPin !== confirmPin && (
                <p className="text-sm text-destructive">Les PIN ne correspondent pas</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowPinDialog(false); resetPinForm(); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleUpdatePin}
                disabled={processing || currentPin.length !== 4 || newPin.length !== 4 || newPin !== confirmPin}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Mettre à jour
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Limits Dialog */}
        <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Configurer les limites
              </DialogTitle>
              <DialogDescription>
                Ajustez les limites de dépenses pour cette carte
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Limite par transaction</Label>
                  <span className="font-mono font-medium">{formatAmount(tempLimits.transaction_limit, selectedCard?.currency)}</span>
                </div>
                <Slider
                  value={[tempLimits.transaction_limit]}
                  onValueChange={([v]) => setTempLimits({...tempLimits, transaction_limit: v})}
                  max={200000}
                  min={5000}
                  step={5000}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Limite journalière</Label>
                  <span className="font-mono font-medium">{formatAmount(tempLimits.daily_limit, selectedCard?.currency)}</span>
                </div>
                <Slider
                  value={[tempLimits.daily_limit]}
                  onValueChange={([v]) => setTempLimits({...tempLimits, daily_limit: v})}
                  max={500000}
                  min={10000}
                  step={10000}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <Label>Limite mensuelle</Label>
                  <span className="font-mono font-medium">{formatAmount(tempLimits.monthly_limit, selectedCard?.currency)}</span>
                </div>
                <Slider
                  value={[tempLimits.monthly_limit]}
                  onValueChange={([v]) => setTempLimits({...tempLimits, monthly_limit: v})}
                  max={2000000}
                  min={50000}
                  step={50000}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLimitsDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateLimits} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Boost Limit Dialog */}
        <Dialog open={showBoostDialog} onOpenChange={setShowBoostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Augmentation temporaire
              </DialogTitle>
              <DialogDescription>
                Augmentez temporairement votre plafond pour un achat important
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Montant supplémentaire</Label>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Nouveau plafond journalier:</span>
                  <span className="font-mono font-bold text-primary">
                    {formatAmount((selectedCard?.daily_limit || 0) + boostAmount, selectedCard?.currency)}
                  </span>
                </div>
                <Slider
                  value={[boostAmount]}
                  onValueChange={([v]) => setBoostAmount(v)}
                  max={500000}
                  min={10000}
                  step={10000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  +{formatAmount(boostAmount, selectedCard?.currency)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Durée</Label>
                <Select value={boostDuration} onValueChange={setBoostDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 heure</SelectItem>
                    <SelectItem value="6h">6 heures</SelectItem>
                    <SelectItem value="24h">24 heures</SelectItem>
                    <SelectItem value="48h">48 heures</SelectItem>
                    <SelectItem value="7d">7 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Le plafond reviendra automatiquement à la normale après {boostDuration}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBoostDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleBoostLimit} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Activer le boost
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction History Dialog */}
        <Dialog open={!!selectedCard && !showSettingsDialog && !showPinDialog && !showLimitsDialog && !showBoostDialog} onOpenChange={() => setSelectedCard(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Historique des transactions</DialogTitle>
              <DialogDescription>
                Carte •••• {selectedCard?.last_four}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {loadingTransactions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : cardTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune transaction
                </div>
              ) : (
                <div className="space-y-3">
                  {cardTransactions.map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{tx.merchant_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('fr-FR')} • {tx.payment_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">
                          -{formatAmount(tx.amount, tx.currency)}
                        </p>
                        <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Sécurité maximale</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Bloquez votre carte instantanément et modifiez votre PIN
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4 flex items-start gap-3">
              <Wallet className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-200">Contrôle total</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Définissez vos limites quotidiennes et mensuelles
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4 flex items-start gap-3">
              <Zap className="w-8 h-8 text-amber-600" />
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200">Boost temporaire</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Augmentez vos plafonds pour les achats importants
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
