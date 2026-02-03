import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Users, Shield, Plus, Edit, Trash2, RefreshCw, Search,
  UserPlus, Key, History, Eye, EyeOff, Check, X, Clock,
  ChevronRight, Activity, Settings, Globe
} from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

const ROLE_COLORS = {
  super_admin: 'bg-red-500',
  admin_country: 'bg-blue-500',
  finance: 'bg-green-500',
  support: 'bg-yellow-500',
  kyc_validator: 'bg-purple-500',
  agent_manager: 'bg-orange-500'
};

export default function AdminStaffPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('staff');
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [logs, setLogs] = useState([]);
  const [logsStats, setLogsStats] = useState(null);
  
  // Dialog states
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    initializeAndFetch();
  }, []);

  const initializeAndFetch = async () => {
    try {
      await axios.post(`${API}/admin/staff/init`);
    } catch (error) {}
    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStaff(),
      fetchRoles(),
      fetchPermissions(),
      fetchLogs(),
      fetchLogsStats()
    ]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    try {
      const params = new URLSearchParams();
      if (filterRole !== 'all') params.append('role_id', filterRole);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await axios.get(`${API}/admin/staff/members?${params}`);
      setStaff(res.data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/admin/staff/roles`);
      setRoles(res.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await axios.get(`${API}/admin/staff/permissions`);
      setPermissions(res.data.permissions || {});
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API}/admin/staff/logs?limit=50`);
      setLogs(res.data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchLogsStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/staff/logs/stats`);
      setLogsStats(res.data);
    } catch (error) {
      console.error('Error fetching logs stats:', error);
    }
  };

  // Staff CRUD
  const handleSaveStaff = async (data) => {
    try {
      if (editingStaff) {
        await axios.put(`${API}/admin/staff/members/${editingStaff.id}`, data);
        toast.success('Membre mis à jour');
      } else {
        await axios.post(`${API}/admin/staff/members`, data);
        toast.success('Membre créé');
      }
      setShowStaffDialog(false);
      setEditingStaff(null);
      fetchStaff();
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleToggleStaff = async (staffId) => {
    try {
      const res = await axios.put(`${API}/admin/staff/members/${staffId}/toggle`);
      toast.success(res.data.message);
      fetchStaff();
      fetchLogs();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;
    try {
      await axios.delete(`${API}/admin/staff/members/${staffId}`);
      toast.success('Membre supprimé');
      fetchStaff();
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  // Role CRUD
  const handleSaveRole = async (data) => {
    try {
      if (editingRole) {
        await axios.put(`${API}/admin/staff/roles/${editingRole.id}`, data);
        toast.success('Rôle mis à jour');
      } else {
        await axios.post(`${API}/admin/staff/roles`, data);
        toast.success('Rôle créé');
      }
      setShowRoleDialog(false);
      setEditingRole(null);
      fetchRoles();
      fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) return;
    try {
      await axios.delete(`${API}/admin/staff/roles/${roleId}`);
      toast.success('Rôle supprimé');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  // Permissions
  const handleSavePermissions = async (staffId, permissions) => {
    try {
      await axios.put(`${API}/admin/staff/members/${staffId}/permissions`, permissions);
      toast.success('Permissions mises à jour');
      setShowPermissionsDialog(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6" data-testid="admin-staff-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8 text-orange-500" />
              Gestion du Personnel Admin
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les agents, rôles et permissions
            </p>
          </div>
          <Button onClick={fetchAllData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{staff.length}</p>
                  <p className="text-sm text-blue-600">Membres</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-700">{roles.length}</p>
                  <p className="text-sm text-purple-600">Rôles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Check className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{staff.filter(s => s.is_active).length}</p>
                  <p className="text-sm text-green-600">Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{logsStats?.total_logs || 0}</p>
                  <p className="text-sm text-orange-600">Actions logées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="staff">👥 Personnel</TabsTrigger>
            <TabsTrigger value="roles">🛡️ Rôles</TabsTrigger>
            <TabsTrigger value="logs">📋 Historique</TabsTrigger>
          </TabsList>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchStaff()}
                    className="pl-10"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filtrer par rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={fetchStaff} variant="outline">Filtrer</Button>
              </div>
              <Button onClick={() => { setEditingStaff(null); setShowStaffDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
                <UserPlus className="h-4 w-4" />
                Nouveau membre
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Membre</th>
                        <th className="text-left p-4 font-medium">Rôle</th>
                        <th className="text-left p-4 font-medium">Pays assignés</th>
                        <th className="text-center p-4 font-medium">Statut</th>
                        <th className="text-center p-4 font-medium">Dernière connexion</th>
                        <th className="text-center p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id} className={`border-t hover:bg-muted/30 ${!member.is_active ? 'opacity-60' : ''}`}>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{member.first_name} {member.last_name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                              {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`${ROLE_COLORS[member.role_id] || 'bg-gray-500'} text-white`}>
                              {member.role?.name_fr || member.role_id}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {member.country_ids?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {member.country_ids.slice(0, 3).map(c => (
                                  <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                                ))}
                                {member.country_ids.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{member.country_ids.length - 3}</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Tous</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant={member.is_active ? 'default' : 'secondary'}>
                              {member.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </td>
                          <td className="p-4 text-center text-sm text-muted-foreground">
                            {member.last_login ? new Date(member.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setSelectedStaff(member); setShowPermissionsDialog(true); }}
                                title="Permissions"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setEditingStaff(member); setShowStaffDialog(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={member.is_active}
                                onCheckedChange={() => handleToggleStaff(member.id)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={() => handleDeleteStaff(member.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {staff.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            Aucun membre trouvé
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingRole(null); setShowRoleDialog(true); }} className="gap-2 bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4" />
                Nouveau rôle
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Card key={role.id} className={role.is_system ? 'border-2 border-blue-200' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${ROLE_COLORS[role.id] || 'bg-gray-500'}`} />
                          {role.name_fr}
                        </CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                      </div>
                      {!role.is_system && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingRole(role); setShowRoleDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteRole(role.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Niveau</span>
                        <Badge variant="outline">{role.level}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Permissions</span>
                        <Badge>{role.permissions?.includes('*') ? 'Toutes' : role.permissions?.length || 0}</Badge>
                      </div>
                      {role.is_system && (
                        <Badge variant="secondary" className="w-full justify-center mt-2">
                          Rôle système
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            {logsStats && (
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Par module</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(logsStats.by_module || {}).slice(0, 5).map(([module, count]) => (
                        <div key={module} className="flex justify-between text-sm">
                          <span className="capitalize">{module}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Top actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(logsStats.top_actions || []).slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.action}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Plus actifs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(logsStats.top_admins || []).slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="truncate max-w-[150px]">{item.email}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Historique d'activité</CardTitle>
                <CardDescription>Actions récentes des administrateurs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-3 border rounded-lg hover:bg-muted/50">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Activity className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.admin_email}</span>
                          <Badge variant="outline" className="text-xs">{log.module}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{log.action}</p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(log.details)}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Aucune activité enregistrée</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Staff Dialog */}
        <StaffDialog
          open={showStaffDialog}
          onClose={() => { setShowStaffDialog(false); setEditingStaff(null); }}
          onSave={handleSaveStaff}
          editingStaff={editingStaff}
          roles={roles}
        />

        {/* Role Dialog */}
        <RoleDialog
          open={showRoleDialog}
          onClose={() => { setShowRoleDialog(false); setEditingRole(null); }}
          onSave={handleSaveRole}
          editingRole={editingRole}
          permissions={permissions}
        />

        {/* Permissions Dialog */}
        <PermissionsDialog
          open={showPermissionsDialog}
          onClose={() => { setShowPermissionsDialog(false); setSelectedStaff(null); }}
          onSave={handleSavePermissions}
          staff={selectedStaff}
          permissions={permissions}
        />
      </div>
    </DashboardLayout>
  );
}

// Staff Dialog Component
function StaffDialog({ open, onClose, onSave, editingStaff, roles }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '',
    country_ids: [],
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editingStaff) {
      setFormData({
        first_name: editingStaff.first_name || '',
        last_name: editingStaff.last_name || '',
        email: editingStaff.email || '',
        phone: editingStaff.phone || '',
        password: '',
        role_id: editingStaff.role_id || '',
        country_ids: editingStaff.country_ids || [],
        is_active: editingStaff.is_active !== false
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        role_id: '',
        country_ids: [],
        is_active: true
      });
    }
  }, [editingStaff, open]);

  const handleSubmit = () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.role_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!editingStaff && !formData.password) {
      toast.error('Le mot de passe est obligatoire');
      return;
    }
    
    const data = { ...formData };
    if (!data.password) delete data.password;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingStaff ? 'Modifier le membre' : 'Nouveau membre'}</DialogTitle>
          <DialogDescription>
            {editingStaff ? 'Modifiez les informations du membre' : 'Créez un nouveau compte administrateur'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={!!editingStaff}
            />
          </div>
          <div className="space-y-2">
            <Label>Téléphone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>{editingStaff ? 'Nouveau mot de passe' : 'Mot de passe *'}</Label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={editingStaff ? 'Laisser vide pour ne pas changer' : ''}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rôle *</Label>
            <Select value={formData.role_id} onValueChange={(v) => setFormData({...formData, role_id: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name_fr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Compte actif</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(v) => setFormData({...formData, is_active: v})}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            {editingStaff ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Role Dialog Component
function RoleDialog({ open, onClose, onSave, editingRole, permissions }) {
  const [formData, setFormData] = useState({
    name: '',
    name_fr: '',
    description: '',
    level: 5,
    permissions: []
  });

  useEffect(() => {
    if (editingRole) {
      setFormData({
        name: editingRole.name || '',
        name_fr: editingRole.name_fr || '',
        description: editingRole.description || '',
        level: editingRole.level || 5,
        permissions: editingRole.permissions || []
      });
    } else {
      setFormData({
        name: '',
        name_fr: '',
        description: '',
        level: 5,
        permissions: []
      });
    }
  }, [editingRole, open]);

  const togglePermission = (permId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.name_fr) {
      toast.error('Veuillez remplir le nom du rôle');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom (EN)</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom (FR) *</Label>
              <Input
                value={formData.name_fr}
                onChange={(e) => setFormData({...formData, name_fr: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Niveau (1=Super Admin, 10=Basique)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}
            />
          </div>
          <div className="space-y-4">
            <Label>Permissions</Label>
            <div className="grid gap-4">
              {Object.entries(permissions).map(([module, data]) => (
                <div key={module} className="border rounded-lg p-3">
                  <h4 className="font-medium mb-2">{data.label}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {data.permissions.map(perm => (
                      <div key={perm.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.permissions.includes(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <span className="text-sm">{perm.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600">
            {editingRole ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Permissions Dialog Component
function PermissionsDialog({ open, onClose, onSave, staff, permissions }) {
  const [selectedPerms, setSelectedPerms] = useState([]);

  useEffect(() => {
    if (staff) {
      setSelectedPerms(staff.custom_permissions || []);
    }
  }, [staff, open]);

  const togglePermission = (permId) => {
    setSelectedPerms(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissions de {staff.first_name} {staff.last_name}</DialogTitle>
          <DialogDescription>
            Rôle: {staff.role?.name_fr} • Permissions supplémentaires personnalisées
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Permissions du rôle:</strong>{' '}
              {staff.role?.permissions?.includes('*') ? 'Toutes' : (staff.role?.permissions?.length || 0)}
            </p>
          </div>
          <div className="grid gap-4">
            {Object.entries(permissions).map(([module, data]) => (
              <div key={module} className="border rounded-lg p-3">
                <h4 className="font-medium mb-2">{data.label}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {data.permissions.map(perm => {
                    const hasFromRole = staff.role?.permissions?.includes('*') || staff.role?.permissions?.includes(perm.id);
                    return (
                      <div key={perm.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPerms.includes(perm.id) || hasFromRole}
                          disabled={hasFromRole}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                        <span className={`text-sm ${hasFromRole ? 'text-muted-foreground' : ''}`}>
                          {perm.label}
                          {hasFromRole && ' (rôle)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(staff.id, selectedPerms)} className="bg-orange-500 hover:bg-orange-600">
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
