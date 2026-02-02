import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { 
  CreditCard, CheckCircle, XCircle, AlertTriangle, 
  Shield, Clock, User, MapPin, Loader2, RefreshCw 
} from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  blocked: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS = {
  pending: 'En attente',
  active: 'Active',
  rejected: 'Refusée',
  blocked: 'Bloquée',
};

const BRAND_ICONS = {
  visa: '💳',
  mastercard: '💳',
  amex: '💳',
};

export default function AdminCardApprovalsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchCards();
  }, [filter]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending' 
        ? `${API}/admin/cards/pending`
        : `${API}/admin/cards/all?status=${filter}`;
      const response = await axios.get(endpoint);
      setCards(response.data.cards || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des cartes');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (cardId, action) => {
    setActionLoading(cardId);
    try {
      await axios.post(`${API}/admin/cards/approve`, {
        card_id: cardId,
        action: action,
        reason: action === 'reject' ? 'Non conforme' : null
      });
      toast.success(`Carte ${action === 'approve' ? 'approuvée' : action === 'reject' ? 'refusée' : 'bloquée'}`);
      fetchCards();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'action');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope']">Approbation des Cartes</h1>
            <p className="text-muted-foreground">Validez les nouvelles cartes ajoutées par les utilisateurs</p>
          </div>
          <Button variant="outline" onClick={fetchCards}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${filter === 'pending' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cards.filter(c => c.approval_status === 'pending').length || '-'}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${filter === 'active' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilter('active')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Actives</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${filter === 'rejected' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Refusées</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-all ${filter === 'blocked' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setFilter('blocked')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Bloquées</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Cartes {STATUS_LABELS[filter] || 'Toutes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune carte {STATUS_LABELS[filter]?.toLowerCase()}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <div 
                    key={card.id} 
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Card Icon */}
                        <div className="w-14 h-10 rounded-md bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center text-white text-xs font-bold">
                          {card.brand?.toUpperCase().slice(0, 4)}
                        </div>
                        
                        {/* Card Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              •••• •••• •••• {card.last4}
                            </span>
                            <Badge className={STATUS_COLORS[card.approval_status]}>
                              {STATUS_LABELS[card.approval_status]}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {card.user?.email || 'N/A'}
                            </span>
                            <span>Exp: {card.expiry}</span>
                            {card.added_country && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {card.added_country}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            Ajoutée le {formatDate(card.created_at)}
                            {card.added_ip && ` • IP: ${card.added_ip}`}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      {card.approval_status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAction(card.id, 'approve')}
                            disabled={actionLoading === card.id}
                          >
                            {actionLoading === card.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approuver
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAction(card.id, 'reject')}
                            disabled={actionLoading === card.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      )}
                      
                      {card.approval_status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => handleAction(card.id, 'block')}
                          disabled={actionLoading === card.id}
                        >
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Bloquer
                        </Button>
                      )}
                    </div>
                    
                    {/* Approval Info */}
                    {card.approved_at && (
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                        {card.approval_status === 'active' ? 'Approuvée' : 
                         card.approval_status === 'rejected' ? 'Refusée' : 'Bloquée'} le {formatDate(card.approved_at)}
                        {card.approval_reason && ` • Raison: ${card.approval_reason}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
