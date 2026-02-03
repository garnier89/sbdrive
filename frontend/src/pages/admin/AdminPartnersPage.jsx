import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import axios from 'axios';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { 
  Store, Users, CheckCircle2, XCircle, Clock, Search,
  Eye, MapPin, Phone, Mail, Calendar, TrendingUp,
  AlertCircle, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-500/20 text-amber-400', label: 'En attente', icon: Clock },
  active: { color: 'bg-green-500/20 text-green-400', label: 'Actif', icon: CheckCircle2 },
  suspended: { color: 'bg-red-500/20 text-red-400', label: 'Suspendu', icon: XCircle },
  rejected: { color: 'bg-slate-500/20 text-slate-400', label: 'Rejeté', icon: XCircle }
};

export default function AdminPartnersPage() {
  const { token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState({ pending: 0, active: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({ status: '', reason: '' });
  const [updating, setUpdating] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await axios.get(`${API}/partners/admin/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(response.data.partners || []);
      setStats(response.data.stats || { pending: 0, active: 0, suspended: 0 });
    } catch (error) {
      toast.error('Erreur lors du chargement des partenaires');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const viewPartnerDetails = async (partnerId) => {
    try {
      const response = await axios.get(`${API}/partners/admin/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedPartner(response.data);
      setShowDetailDialog(true);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const openStatusDialog = (partner) => {
    setSelectedPartner(partner);
    setStatusUpdateData({ status: partner.status, reason: '' });
    setShowStatusDialog(true);
  };

  const updatePartnerStatus = async () => {
    if (!statusUpdateData.status) {
      toast.error('Veuillez sélectionner un statut');
      return;
    }
    
    setUpdating(true);
    try {
      await axios.put(`${API}/partners/admin/${selectedPartner.id}/status`, {
        status: statusUpdateData.status,
        reason: statusUpdateData.reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Statut mis à jour avec succès');
      setShowStatusDialog(false);
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredPartners = partners.filter(partner => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      partner.business_name?.toLowerCase().includes(query) ||
      partner.owner_name?.toLowerCase().includes(query) ||
      partner.email?.toLowerCase().includes(query) ||
      partner.partner_code?.toLowerCase().includes(query) ||
      partner.city?.toLowerCase().includes(query)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des Partenaires</h1>
            <p className="text-muted-foreground">Gérez les agents et points de retrait</p>
          </div>
          <Button onClick={fetchPartners} variant="outline" data-testid="refresh-partners-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                  <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Suspendus</p>
                  <p className="text-2xl font-bold text-foreground">{stats.suspended}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Store className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{partners.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="partner-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="partner-status-filter">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="suspended">Suspendus</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Partners List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Liste des partenaires ({filteredPartners.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Chargement...</p>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun partenaire trouvé</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPartners.map((partner) => (
                  <div 
                    key={partner.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{partner.business_name}</p>
                        <p className="text-sm text-muted-foreground">{partner.owner_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">{partner.partner_code}</span>
                          <span>•</span>
                          <span>{partner.city}, {partner.country}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-16 sm:ml-0">
                      {getStatusBadge(partner.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewPartnerDetails(partner.id)}
                        data-testid={`view-partner-${partner.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openStatusDialog(partner)}
                        data-testid={`edit-partner-${partner.id}`}
                      >
                        Modifier statut
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partner Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du partenaire</DialogTitle>
          </DialogHeader>
          
          {selectedPartner && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="stats">Statistiques</TabsTrigger>
                <TabsTrigger value="withdrawals">Retraits</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Nom de l'entreprise</Label>
                    <p className="font-medium">{selectedPartner.business_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Propriétaire</Label>
                    <p className="font-medium">{selectedPartner.owner_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Mail className="w-4 h-4" /> Email
                    </Label>
                    <p className="font-medium">{selectedPartner.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Phone className="w-4 h-4" /> Téléphone
                    </Label>
                    <p className="font-medium">{selectedPartner.phone}</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> Adresse
                    </Label>
                    <p className="font-medium">
                      {selectedPartner.address}, {selectedPartner.city}, {selectedPartner.country}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Code partenaire</Label>
                    <p className="font-mono font-bold text-primary">{selectedPartner.partner_code}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> Inscrit le
                    </Label>
                    <p className="font-medium">
                      {new Date(selectedPartner.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total retraits</p>
                          <p className="text-xl font-bold">{selectedPartner.total_withdrawals || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <Store className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Montant total</p>
                          <p className="text-xl font-bold">
                            {selectedPartner.total_amount_withdrawn?.toLocaleString() || 0} {selectedPartner.wallet_currency}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Limite journalière</p>
                          <p className="text-xl font-bold">
                            {selectedPartner.daily_limit?.toLocaleString() || 0} {selectedPartner.wallet_currency}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Store className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Solde actuel</p>
                          <p className="text-xl font-bold">
                            {selectedPartner.wallet_balance?.toLocaleString() || 0} {selectedPartner.wallet_currency}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="withdrawals">
                {selectedPartner.withdrawals?.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedPartner.withdrawals.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{w.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(w.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{w.amount?.toLocaleString()} {w.currency}</p>
                          {getStatusBadge(w.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Aucun retrait</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
            <DialogDescription>
              Partenaire: {selectedPartner?.business_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouveau statut</Label>
              <Select 
                value={statusUpdateData.status} 
                onValueChange={(value) => setStatusUpdateData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger data-testid="partner-new-status">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(statusUpdateData.status === 'suspended' || statusUpdateData.status === 'rejected') && (
              <div className="space-y-2">
                <Label>Raison (obligatoire)</Label>
                <Textarea
                  value={statusUpdateData.reason}
                  onChange={(e) => setStatusUpdateData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Expliquez la raison de cette décision..."
                  data-testid="partner-status-reason"
                />
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={updatePartnerStatus}
                disabled={updating}
                className="flex-1"
                data-testid="partner-update-status-btn"
              >
                {updating ? 'Mise à jour...' : 'Confirmer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
