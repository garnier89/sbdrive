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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Shield, Users, Store, Search, Plus, Edit, Trash2, 
  UserCheck, UserX, Wallet, TrendingUp, MapPin, 
  FileText, Eye, CheckCircle, XCircle, Clock,
  RefreshCw, Download, History, AlertTriangle,
  DollarSign, CreditCard, Globe, Activity, Lock
} from 'lucide-react';

const COUNTRIES = [
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'TG', name: 'Togo' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'FR', name: 'France' },
];

export default function SuperAdminPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  
  // Users & Partners state
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  // Dialogs
  const [showAddPartnerDialog, setShowAddPartnerDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showEditPartnerDialog, setShowEditPartnerDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [showLimitsDialog, setShowLimitsDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  
  // Form states
  const [newPartner, setNewPartner] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'SN',
    password: '',
    daily_limit: 500000,
    monthly_limit: 5000000
  });
  
  const [walletAction, setWalletAction] = useState({
    type: 'credit', // credit or debit
    amount: '',
    currency: 'XOF',
    reason: ''
  });
  
  const [limitsForm, setLimitsForm] = useState({
    daily_limit: 0,
    monthly_limit: 0,
    transaction_limit: 0
  });
  
  const [userActivities, setUserActivities] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchPartners();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users || res.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await axios.get(`${API}/partners/admin/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(res.data.partners || []);
    } catch (error) {
      console.error('Error fetching partners');
    }
  };

  // ==================== USER MANAGEMENT ====================

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await axios.put(`${API}/admin/users/${userId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`Compte ${newStatus === 'active' ? 'activé' : 'désactivé'}`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) return;
    
    try {
      await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setProcessing(true);
    try {
      await axios.put(`${API}/admin/users/${selectedUser.id}`, selectedUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Utilisateur mis à jour');
      setShowEditUserDialog(false);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  // ==================== PARTNER MANAGEMENT ====================

  const handleAddPartner = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/partners/admin/create`, newPartner, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Agent partenaire créé avec succès');
      setShowAddPartnerDialog(false);
      setNewPartner({
        business_name: '', owner_name: '', email: '', phone: '',
        address: '', city: '', country: 'SN', password: '',
        daily_limit: 500000, monthly_limit: 5000000
      });
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setProcessing(false);
    }
  };

  const handleTogglePartnerStatus = async (partnerId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await axios.put(`${API}/partners/admin/${partnerId}/status`, 
        { status: newStatus, reason: 'Modifié par Super Admin' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`Partenaire ${newStatus === 'active' ? 'activé' : 'désactivé'}`);
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('⚠️ Êtes-vous sûr de vouloir supprimer ce partenaire ?')) return;
    
    try {
      await axios.delete(`${API}/partners/admin/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Partenaire supprimé');
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleUpdatePartnerLimits = async () => {
    if (!selectedPartner) return;
    
    setProcessing(true);
    try {
      await axios.put(`${API}/partners/admin/${selectedPartner.id}/limits`, limitsForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Plafonds mis à jour');
      setShowLimitsDialog(false);
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  // ==================== WALLET MANAGEMENT ====================

  const handleWalletAction = async () => {
    if (!selectedUser && !selectedPartner) return;
    
    const targetId = selectedUser?.id || selectedPartner?.id;
    const targetType = selectedUser ? 'user' : 'partner';
    
    setProcessing(true);
    try {
      await axios.post(`${API}/admin/wallet/${walletAction.type}`, {
        target_id: targetId,
        target_type: targetType,
        amount: parseFloat(walletAction.amount),
        currency: walletAction.currency,
        reason: walletAction.reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${walletAction.type === 'credit' ? 'Crédit' : 'Débit'} effectué avec succès`);
      setShowWalletDialog(false);
      setWalletAction({ type: 'credit', amount: '', currency: 'XOF', reason: '' });
      fetchUsers();
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'opération');
    } finally {
      setProcessing(false);
    }
  };

  // ==================== LOCATION & ACTIVITY ====================

  const fetchUserActivity = async (userId) => {
    try {
      const res = await axios.get(`${API}/admin/users/${userId}/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserActivities(res.data.activities || []);
    } catch (error) {
      setUserActivities([]);
    }
  };

  const fetchUserDocuments = async (userId) => {
    try {
      const res = await axios.get(`${API}/admin/documents?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDocuments(res.data.documents || res.data || []);
    } catch (error) {
      setUserDocuments([]);
    }
  };

  const handleDocumentAction = async (docId, action) => {
    try {
      await axios.put(`${API}/admin/documents/${docId}/status`, 
        { status: action, reason: action === 'rejected' ? 'Rejeté par admin' : null },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`Document ${action === 'approved' ? 'approuvé' : 'rejeté'}`);
      if (selectedUser) fetchUserDocuments(selectedUser.id);
    } catch (error) {
      toast.error('Erreur');
    }
  };

  // Filter functions
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.includes(q)
    );
  });

  const filteredPartners = partners.filter(partner => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      partner.business_name?.toLowerCase().includes(q) ||
      partner.owner_name?.toLowerCase().includes(q) ||
      partner.email?.toLowerCase().includes(q) ||
      partner.partner_code?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Actif' },
      suspended: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Suspendu' },
      pending: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', label: 'En attente' },
      rejected: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', label: 'Rejeté' }
    };
    const c = config[status] || config.pending;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="super-admin-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">🛡️ Super Administrateur</h1>
              <p className="text-muted-foreground">Gestion complète du système SBPAYGO</p>
            </div>
          </div>
          <Button onClick={() => { fetchUsers(); fetchPartners(); }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Store className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Partenaires</p>
                  <p className="text-2xl font-bold">{partners.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.status === 'active').length + partners.filter(p => p.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">
                    {partners.filter(p => p.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, téléphone, code partenaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="super-admin-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs ({filteredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Partenaires ({filteredPartners.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Utilisateurs</CardTitle>
                <CardDescription>
                  Gérez les comptes utilisateurs, leurs wallets et documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Chargement...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>KYC</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone || '-'}</TableCell>
                            <TableCell>{getStatusBadge(user.status || 'active')}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {user.kyc_status || 'Non vérifié'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowEditUserDialog(true);
                                  }}
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setSelectedPartner(null);
                                    setShowWalletDialog(true);
                                  }}
                                  title="Wallet"
                                >
                                  <Wallet className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    fetchUserDocuments(user.id);
                                    setShowDocumentsDialog(true);
                                  }}
                                  title="Documents"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    fetchUserActivity(user.id);
                                    setShowActivityDialog(true);
                                  }}
                                  title="Activité"
                                >
                                  <Activity className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleToggleUserStatus(user.id, user.status || 'active')}
                                  title={user.status === 'active' ? 'Désactiver' : 'Activer'}
                                >
                                  {user.status === 'active' ? 
                                    <UserX className="w-4 h-4 text-red-500" /> : 
                                    <UserCheck className="w-4 h-4 text-green-500" />
                                  }
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Supprimer"
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Gestion des Partenaires</CardTitle>
                  <CardDescription>
                    Créez et gérez les agents partenaires
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddPartnerDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un agent
                </Button>
              </CardHeader>
              <CardContent>
                {filteredPartners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun partenaire trouvé
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entreprise</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Propriétaire</TableHead>
                          <TableHead>Localisation</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Plafond/jour</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPartners.map((partner) => (
                          <TableRow key={partner.id}>
                            <TableCell className="font-medium">{partner.business_name}</TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {partner.partner_code}
                              </code>
                            </TableCell>
                            <TableCell>{partner.owner_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {partner.city}, {partner.country}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(partner.status)}</TableCell>
                            <TableCell>
                              {(partner.daily_limit || 500000).toLocaleString()} XOF
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPartner(partner);
                                    setShowEditPartnerDialog(true);
                                  }}
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPartner(partner);
                                    setSelectedUser(null);
                                    setShowWalletDialog(true);
                                  }}
                                  title="Wallet"
                                >
                                  <Wallet className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPartner(partner);
                                    setLimitsForm({
                                      daily_limit: partner.daily_limit || 500000,
                                      monthly_limit: partner.monthly_limit || 5000000,
                                      transaction_limit: partner.transaction_limit || 100000
                                    });
                                    setShowLimitsDialog(true);
                                  }}
                                  title="Plafonds"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedPartner(partner);
                                    setShowLocationDialog(true);
                                  }}
                                  title="Localisation"
                                >
                                  <MapPin className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleTogglePartnerStatus(partner.id, partner.status)}
                                  title={partner.status === 'active' ? 'Désactiver' : 'Activer'}
                                >
                                  {partner.status === 'active' ? 
                                    <UserX className="w-4 h-4 text-red-500" /> : 
                                    <UserCheck className="w-4 h-4 text-green-500" />
                                  }
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeletePartner(partner.id)}
                                  title="Supprimer"
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Partner Dialog */}
        <Dialog open={showAddPartnerDialog} onOpenChange={setShowAddPartnerDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Ajouter un Agent Partenaire
              </DialogTitle>
              <DialogDescription>
                Créez un nouveau compte agent avec ses droits et plafonds
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'entreprise *</Label>
                <Input
                  value={newPartner.business_name}
                  onChange={(e) => setNewPartner({...newPartner, business_name: e.target.value})}
                  placeholder="Boutique ABC"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom du propriétaire *</Label>
                <Input
                  value={newPartner.owner_name}
                  onChange={(e) => setNewPartner({...newPartner, owner_name: e.target.value})}
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newPartner.email}
                  onChange={(e) => setNewPartner({...newPartner, email: e.target.value})}
                  placeholder="agent@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone *</Label>
                <Input
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner({...newPartner, phone: e.target.value})}
                  placeholder="+221 77 123 4567"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Adresse *</Label>
                <Input
                  value={newPartner.address}
                  onChange={(e) => setNewPartner({...newPartner, address: e.target.value})}
                  placeholder="123 Rue du Commerce"
                />
              </div>
              <div className="space-y-2">
                <Label>Ville *</Label>
                <Input
                  value={newPartner.city}
                  onChange={(e) => setNewPartner({...newPartner, city: e.target.value})}
                  placeholder="Dakar"
                />
              </div>
              <div className="space-y-2">
                <Label>Pays *</Label>
                <Select value={newPartner.country} onValueChange={(v) => setNewPartner({...newPartner, country: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mot de passe *</Label>
                <Input
                  type="password"
                  value={newPartner.password}
                  onChange={(e) => setNewPartner({...newPartner, password: e.target.value})}
                  placeholder="Minimum 8 caractères"
                />
              </div>
              <div className="space-y-2">
                <Label>Plafond journalier (XOF)</Label>
                <Input
                  type="number"
                  value={newPartner.daily_limit}
                  onChange={(e) => setNewPartner({...newPartner, daily_limit: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddPartnerDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddPartner} disabled={processing}>
                {processing ? 'Création...' : 'Créer le partenaire'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input
                    value={selectedUser.full_name || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={selectedUser.email || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut KYC</Label>
                  <Select 
                    value={selectedUser.kyc_status || 'unverified'} 
                    onValueChange={(v) => setSelectedUser({...selectedUser, kyc_status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unverified">Non vérifié</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="verified">Vérifié</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateUser} disabled={processing}>
                {processing ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Wallet Action Dialog */}
        <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Opération Wallet
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name || selectedPartner?.business_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type d'opération</Label>
                <Select value={walletAction.type} onValueChange={(v) => setWalletAction({...walletAction, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">💰 Créditer (ajouter)</SelectItem>
                    <SelectItem value="debit">📤 Débiter (retirer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input
                    type="number"
                    value={walletAction.amount}
                    onChange={(e) => setWalletAction({...walletAction, amount: e.target.value})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select value={walletAction.currency} onValueChange={(v) => setWalletAction({...walletAction, currency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XOF">XOF (CFA)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Raison / Commentaire</Label>
                <Textarea
                  value={walletAction.reason}
                  onChange={(e) => setWalletAction({...walletAction, reason: e.target.value})}
                  placeholder="Raison de l'opération..."
                />
              </div>
              
              {walletAction.type === 'debit' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Attention: Cette opération retire des fonds du compte</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWalletDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleWalletAction} 
                disabled={processing || !walletAction.amount}
                className={walletAction.type === 'debit' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {processing ? 'Traitement...' : `${walletAction.type === 'credit' ? 'Créditer' : 'Débiter'} le compte`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Limits Dialog */}
        <Dialog open={showLimitsDialog} onOpenChange={setShowLimitsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ajuster les plafonds
              </DialogTitle>
              <DialogDescription>
                {selectedPartner?.business_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Plafond journalier (XOF)</Label>
                <Input
                  type="number"
                  value={limitsForm.daily_limit}
                  onChange={(e) => setLimitsForm({...limitsForm, daily_limit: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Plafond mensuel (XOF)</Label>
                <Input
                  type="number"
                  value={limitsForm.monthly_limit}
                  onChange={(e) => setLimitsForm({...limitsForm, monthly_limit: parseInt(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Limite par transaction (XOF)</Label>
                <Input
                  type="number"
                  value={limitsForm.transaction_limit}
                  onChange={(e) => setLimitsForm({...limitsForm, transaction_limit: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLimitsDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdatePartnerLimits} disabled={processing}>
                {processing ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Location Dialog */}
        <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localisation
              </DialogTitle>
            </DialogHeader>
            {selectedPartner && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entreprise</span>
                    <span className="font-medium">{selectedPartner.business_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Adresse</span>
                    <span className="font-medium">{selectedPartner.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="font-medium">{selectedPartner.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pays</span>
                    <span className="font-medium">
                      {COUNTRIES.find(c => c.code === selectedPartner.country)?.name || selectedPartner.country}
                    </span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Zone géographique
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Ce partenaire opère dans la zone <strong>{selectedPartner.country}</strong> et peut effectuer des transactions Mobile Money avec les opérateurs locaux.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowLocationDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Documents Dialog */}
        <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents de {selectedUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {userDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun document soumis
                </div>
              ) : (
                <div className="space-y-3">
                  {userDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.document_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Soumis le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(doc.status)}
                        {doc.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleDocumentAction(doc.id, 'approved')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleDocumentAction(doc.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Rejeter
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowDocumentsDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity Dialog */}
        <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Historique d'activité
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name || selectedPartner?.business_name}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {userActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune activité enregistrée
                </div>
              ) : (
                <div className="space-y-2">
                  {userActivities.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      {activity.ip_address && (
                        <Badge variant="outline" className="text-xs">
                          {activity.ip_address}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowActivityDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
