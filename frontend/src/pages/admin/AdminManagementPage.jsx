import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { 
  Crown, Users, Shield, Plus, Trash2, Edit2, 
  CheckCircle, XCircle, Loader2, Key, UserCheck
} from 'lucide-react';

const ROLE_INFO = {
  super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: Crown, level: 1 },
  admin: { label: 'Administrateur', color: 'bg-blue-100 text-blue-700', icon: Shield, level: 2 },
  support: { label: 'Support', color: 'bg-green-100 text-green-700', icon: UserCheck, level: 3 },
};

const PERMISSION_GROUPS = {
  'Utilisateurs': ['users_view', 'users_manage', 'users_delete'],
  'Transactions': ['transactions_view', 'transactions_manage'],
  'Wallets': ['wallets_credit', 'wallets_debit'],
  'Cartes': ['cards_approve'],
  'Documents KYC': ['documents_view', 'documents_approve'],
  'Configuration': ['zones_manage', 'gateways_manage', 'settings_manage'],
  'CMS': ['cms_view', 'cms_edit'],
  'Administration': ['admins_view', 'admins_manage', 'roles_manage'],
  'Système': ['logs_view', 'platform_suspend'],
};

const PERMISSION_LABELS = {
  users_view: 'Voir utilisateurs',
  users_manage: 'Gérer utilisateurs',
  users_delete: 'Supprimer utilisateurs',
  transactions_view: 'Voir transactions',
  transactions_manage: 'Gérer transactions',
  wallets_credit: 'Créditer wallets',
  wallets_debit: 'Débiter wallets',
  cards_approve: 'Approuver cartes',
  documents_view: 'Voir documents',
  documents_approve: 'Approuver documents',
  zones_manage: 'Gérer zones',
  gateways_manage: 'Gérer passerelles',
  settings_manage: 'Paramètres système',
  cms_view: 'Voir CMS',
  cms_edit: 'Modifier CMS',
  admins_view: 'Voir admins',
  admins_manage: 'Gérer admins',
  roles_manage: 'Gérer rôles',
  logs_view: 'Voir logs',
  platform_suspend: 'Suspendre plateforme',
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // New admin form
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin',
    permissions: {}
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, rolesRes] = await Promise.all([
        axios.get(`${API}/admin/admins`),
        axios.get(`${API}/admin/roles`)
      ]);
      setAdmins(adminsRes.data.admins || []);
      setRoles(rolesRes.data.roles || []);
      setAvailablePermissions(rolesRes.data.available_permissions || []);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Accès réservé au Super Admin');
      } else {
        toast.error('Erreur lors du chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.full_name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/admin/admins`, newAdmin);
      toast.success('Administrateur créé');
      setShowAddForm(false);
      setNewAdmin({ email: '', password: '', full_name: '', role: 'admin', permissions: {} });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdmin = async (adminId, updates) => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/admins/${adminId}`, updates);
      toast.success('Administrateur mis à jour');
      setEditingAdmin(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Désactiver cet administrateur ?')) return;
    
    try {
      await axios.delete(`${API}/admin/admins/${adminId}`);
      toast.success('Administrateur désactivé');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const togglePermission = (permission, currentPermissions = {}) => {
    return {
      ...currentPermissions,
      [permission]: !currentPermissions[permission]
    };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope'] flex items-center gap-2">
              <Crown className="w-6 h-6 text-purple-600" />
              Gestion des Administrateurs
            </h1>
            <p className="text-muted-foreground">Super Admin - Contrôle total de la plateforme</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel Admin
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(ROLE_INFO).map(([role, info]) => {
            const count = admins.filter(a => a.role === role).length;
            const Icon = info.icon;
            return (
              <Card key={role}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${info.color.split(' ')[0]} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${info.color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{info.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Admins List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Administrateurs ({admins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {admins.map((admin) => {
                const roleInfo = ROLE_INFO[admin.role] || ROLE_INFO.admin;
                const Icon = roleInfo.icon;
                
                return (
                  <div 
                    key={admin.id}
                    className={`p-4 border rounded-lg ${admin.is_active === false ? 'opacity-50 bg-muted' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full ${roleInfo.color.split(' ')[0]} flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${roleInfo.color.split(' ')[1]}`} />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{admin.full_name}</span>
                            <Badge className={roleInfo.color}>{roleInfo.label}</Badge>
                            {admin.is_active === false && (
                              <Badge variant="outline" className="text-red-600">Inactif</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                          
                          {editingAdmin === admin.id && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Rôle</Label>
                                  <Select
                                    value={admin.role}
                                    onValueChange={(v) => {
                                      const updated = admins.map(a => 
                                        a.id === admin.id ? { ...a, role: v } : a
                                      );
                                      setAdmins(updated);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Administrateur</SelectItem>
                                      <SelectItem value="support">Support</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Statut</Label>
                                  <div className="flex items-center gap-2 pt-2">
                                    <Switch
                                      checked={admin.is_active !== false}
                                      onCheckedChange={(checked) => {
                                        const updated = admins.map(a => 
                                          a.id === admin.id ? { ...a, is_active: checked } : a
                                        );
                                        setAdmins(updated);
                                      }}
                                    />
                                    <span className="text-sm">
                                      {admin.is_active !== false ? 'Actif' : 'Inactif'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Permissions personnalisées</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                                    <div key={group} className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">{group}</p>
                                      {perms.map(perm => (
                                        <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={admin.permissions?.[perm] || false}
                                            onChange={() => {
                                              const updated = admins.map(a => 
                                                a.id === admin.id 
                                                  ? { ...a, permissions: togglePermission(perm, a.permissions) } 
                                                  : a
                                              );
                                              setAdmins(updated);
                                            }}
                                            className="rounded border-gray-300"
                                          />
                                          {PERMISSION_LABELS[perm] || perm}
                                        </label>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleUpdateAdmin(admin.id, {
                                    role: admin.role,
                                    is_active: admin.is_active,
                                    permissions: admin.permissions
                                  })}
                                  disabled={saving}
                                >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sauvegarder'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setEditingAdmin(null);
                                    fetchData();
                                  }}
                                >
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {admin.role !== 'super_admin' && editingAdmin !== admin.id && (
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setEditingAdmin(admin.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteAdmin(admin.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add Admin Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Nouvel Administrateur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom complet *</Label>
                  <Input
                    placeholder="Jean Dupont"
                    value={newAdmin.full_name}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="admin@sbmoney.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Mot de passe *</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select 
                    value={newAdmin.role} 
                    onValueChange={(v) => setNewAdmin(prev => ({ ...prev, role: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateAdmin} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
