import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { CreditCard, Plus, Trash2, Star, Shield, Loader2, CheckCircle } from 'lucide-react';

const CARD_LOGOS = {
  visa: '💳',
  mastercard: '🔶',
  amex: '💎',
  discover: '🔷',
  other: '💳'
};

const CARD_COLORS = {
  visa: 'from-blue-600 to-blue-800',
  mastercard: 'from-orange-500 to-red-600',
  amex: 'from-gray-600 to-gray-800',
  discover: 'from-orange-400 to-orange-600',
  other: 'from-slate-600 to-slate-800'
};

export default function SavedCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [formData, setFormData] = useState({
    card_number: '',
    card_holder_name: '',
    expiry_month: '',
    expiry_year: '',
    nickname: '',
    is_default: false
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API}/saved-cards/list`);
      setCards(response.data.cards || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    setAddingCard(true);

    try {
      await axios.post(`${API}/saved-cards/add`, formData);
      toast.success('Carte ajoutée avec succès !');
      setShowAddDialog(false);
      setFormData({
        card_number: '',
        card_holder_name: '',
        expiry_month: '',
        expiry_year: '',
        nickname: '',
        is_default: false
      });
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    } finally {
      setAddingCard(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) return;

    try {
      await axios.delete(`${API}/saved-cards/${cardId}`);
      toast.success('Carte supprimée');
      fetchCards();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (cardId) => {
    try {
      await axios.post(`${API}/saved-cards/${cardId}/set-default`);
      toast.success('Carte définie par défaut');
      fetchCards();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <BackButton />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Mes Cartes Bancaires</h1>
              <p className="text-sm text-slate-500">Gérez vos cartes enregistrées</p>
            </div>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600" data-testid="add-card-btn">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une carte
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter une carte bancaire</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-2">
                  <Label>Numéro de carte</Label>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    value={formData.card_number}
                    onChange={(e) => setFormData({...formData, card_number: formatCardNumber(e.target.value)})}
                    maxLength={19}
                    required
                    data-testid="card-number-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nom du titulaire</Label>
                  <Input
                    placeholder="JOHN DOE"
                    value={formData.card_holder_name}
                    onChange={(e) => setFormData({...formData, card_holder_name: e.target.value.toUpperCase()})}
                    required
                    data-testid="card-holder-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiration</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="MM"
                        value={formData.expiry_month}
                        onChange={(e) => setFormData({...formData, expiry_month: e.target.value.slice(0, 2)})}
                        maxLength={2}
                        className="w-16 text-center"
                        required
                        data-testid="expiry-month-input"
                      />
                      <span className="self-center text-slate-400">/</span>
                      <Input
                        placeholder="AA"
                        value={formData.expiry_year}
                        onChange={(e) => setFormData({...formData, expiry_year: e.target.value.slice(0, 2)})}
                        maxLength={2}
                        className="w-16 text-center"
                        required
                        data-testid="expiry-year-input"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Surnom (optionnel)</Label>
                    <Input
                      placeholder="Ma carte perso"
                      value={formData.nickname}
                      onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                      data-testid="nickname-input"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                    className="rounded border-slate-300"
                  />
                  <Label htmlFor="is_default" className="text-sm cursor-pointer">
                    Définir comme carte par défaut
                  </Label>
                </div>

                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  <Shield className="w-4 h-4" />
                  <span>Vos données sont chiffrées et sécurisées</span>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={addingCard} data-testid="submit-card-btn">
                    {addingCard ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Ajouter
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : cards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucune carte enregistrée</h3>
              <p className="text-slate-500 text-center mb-4">
                Ajoutez une carte pour effectuer des paiements plus rapidement
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter ma première carte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`relative rounded-2xl p-6 text-white bg-gradient-to-br ${CARD_COLORS[card.card_type] || CARD_COLORS.other} shadow-lg hover:shadow-xl transition-shadow`}
                data-testid={`card-${card.id}`}
              >
                {/* Card chip design */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  {card.is_default && (
                    <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400">
                      <Star className="w-3 h-3 mr-1" />
                      Défaut
                    </Badge>
                  )}
                  <span className="text-2xl">{CARD_LOGOS[card.card_type] || CARD_LOGOS.other}</span>
                </div>

                {/* Card number */}
                <div className="mt-8 mb-6">
                  <p className="text-xl tracking-widest font-mono">{card.masked_number}</p>
                </div>

                {/* Card details */}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-white/70 uppercase">Titulaire</p>
                    <p className="font-medium">{card.card_holder_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/70 uppercase">Expire</p>
                    <p className="font-medium">{card.expiry_month}/{card.expiry_year.slice(-2)}</p>
                  </div>
                </div>

                {/* Nickname */}
                {card.nickname && (
                  <p className="mt-4 text-sm text-white/80">{card.nickname}</p>
                )}

                {/* Actions */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  {!card.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/80 hover:text-white hover:bg-white/20"
                      onClick={() => handleSetDefault(card.id)}
                      data-testid={`set-default-${card.id}`}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/80 hover:text-red-300 hover:bg-red-500/20"
                    onClick={() => handleDeleteCard(card.id)}
                    data-testid={`delete-card-${card.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security info */}
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardContent className="flex items-start gap-4 py-4">
            <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-800">Sécurité de vos cartes</h4>
              <p className="text-sm text-green-700">
                Vos données bancaires sont chiffrées avec le standard PCI-DSS. 
                Nous ne stockons jamais le numéro complet de votre carte ni le CVV.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
