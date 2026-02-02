import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { 
  Bell, AlertTriangle, CheckCircle, Info, Plus, Trash2, 
  RefreshCw, Loader2, Settings, TrendingUp, Eye, EyeOff,
  Mail, MessageSquare, Monitor, Activity
} from 'lucide-react';

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  critical: 'bg-red-100 text-red-700',
};

const SEVERITY_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  critical: AlertTriangle,
};

const METRIC_LABELS = {
  daily_volume: "Volume journalier",
  daily_transactions: "Transactions journalières",
  failed_transactions: "Transactions échouées",
  new_users: "Nouveaux utilisateurs",
  pending_cards: "Cartes en attente",
  suspicious_activity: "Activités suspectes",
  single_transaction: "Transaction unitaire",
};

const OPERATOR_LABELS = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

export default function AdminAlertsPage() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [thresholds, setThresholds] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New threshold form
  const [newThreshold, setNewThreshold] = useState({
    name: '',
    metric: 'daily_volume',
    operator: 'gte',
    value: 10000000,
    currency: 'XOF',
    notify_email: true,
    notify_sms: false,
    notify_dashboard: true,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifRes, threshRes, metricsRes] = await Promise.all([
        axios.get(`${API}/alerts/notifications`),
        axios.get(`${API}/alerts/thresholds`),
        axios.get(`${API}/alerts/current-metrics`)
      ]);
      
      setNotifications(notifRes.data.notifications || []);
      setUnreadCount(notifRes.data.unread_count || 0);
      setThresholds(threshRes.data.thresholds || []);
      setMetrics(metricsRes.data.metrics || {});
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await axios.put(`${API}/alerts/notifications/${notificationId}/read`);
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${API}/alerts/notifications/mark-all-read`);
      toast.success('Toutes les notifications marquées comme lues');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleCheckThresholds = async () => {
    try {
      const response = await axios.get(`${API}/alerts/check`);
      toast.success(`${response.data.alerts_generated} alertes générées`);
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleCreateThreshold = async () => {
    if (!newThreshold.name || !newThreshold.value) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/alerts/thresholds`, newThreshold);
      toast.success('Seuil d\'alerte créé');
      setShowAddForm(false);
      setNewThreshold({
        name: '', metric: 'daily_volume', operator: 'gte', value: 10000000,
        currency: 'XOF', notify_email: true, notify_sms: false, notify_dashboard: true, is_active: true
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleThreshold = async (threshold) => {
    try {
      await axios.put(`${API}/alerts/thresholds/${threshold.id}`, {
        is_active: !threshold.is_active
      });
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteThreshold = async (thresholdId) => {
    if (!confirm('Supprimer ce seuil d\'alerte ?')) return;
    
    try {
      await axios.delete(`${API}/alerts/thresholds/${thresholdId}`);
      toast.success('Seuil supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope'] flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Alertes & Seuils
            </h1>
            <p className="text-muted-foreground">Notifications automatiques et configuration des seuils</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCheckThresholds}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Vérifier maintenant
            </Button>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} non lues
              </Badge>
            )}
          </div>
        </div>

        {/* Current Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Object.entries(metrics).map(([key, data]) => (
            <Card key={key} className="bg-gradient-to-br from-muted/50 to-background">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{METRIC_LABELS[key] || key}</p>
                <p className="text-lg font-bold">
                  {formatNumber(data.value)}
                  {data.currency && <span className="text-xs text-muted-foreground ml-1">{data.currency}</span>}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Seuils d'alerte
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Notifications récentes</CardTitle>
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                    <Eye className="w-4 h-4 mr-2" />
                    Tout marquer comme lu
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune notification</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => {
                      const SeverityIcon = SEVERITY_ICONS[notif.severity] || Info;
                      return (
                        <div 
                          key={notif.id}
                          className={`p-4 border rounded-lg ${!notif.read ? 'bg-primary/5 border-primary/20' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${SEVERITY_COLORS[notif.severity]}`}>
                              <SeverityIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{notif.threshold_name}</span>
                                <Badge className={SEVERITY_COLORS[notif.severity]}>
                                  {notif.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{formatDate(notif.created_at)}</span>
                                <div className="flex items-center gap-2">
                                  {notif.notify_email && <Mail className="w-3 h-3" />}
                                  {notif.notify_sms && <MessageSquare className="w-3 h-3" />}
                                  {notif.notify_dashboard && <Monitor className="w-3 h-3" />}
                                </div>
                              </div>
                            </div>
                            {!notif.read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleMarkRead(notif.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Configuration des seuils</CardTitle>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau seuil
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {thresholds.map((threshold, index) => (
                    <div 
                      key={threshold.id || index}
                      className={`p-4 border rounded-lg ${!threshold.is_active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{threshold.name}</span>
                            {threshold.severity && (
                              <Badge className={SEVERITY_COLORS[threshold.severity]}>
                                {threshold.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {METRIC_LABELS[threshold.metric] || threshold.metric} {OPERATOR_LABELS[threshold.operator] || threshold.operator} {formatNumber(threshold.value)} {threshold.currency}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {threshold.notify_email && (
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                            )}
                            {threshold.notify_sms && (
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> SMS</span>
                            )}
                            {threshold.notify_dashboard && (
                              <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> Dashboard</span>
                            )}
                          </div>
                          {threshold.last_triggered && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Dernière alerte: {formatDate(threshold.last_triggered)} ({threshold.trigger_count || 0} fois)
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={threshold.is_active !== false}
                            onCheckedChange={() => handleToggleThreshold(threshold)}
                          />
                          {threshold.id && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeleteThreshold(threshold.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Threshold Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Nouveau seuil d'alerte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de l'alerte</Label>
                  <Input
                    placeholder="Ex: Volume journalier critique"
                    value={newThreshold.name}
                    onChange={(e) => setNewThreshold(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Métrique</Label>
                    <Select 
                      value={newThreshold.metric} 
                      onValueChange={(v) => setNewThreshold(prev => ({ ...prev, metric: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(METRIC_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Opérateur</Label>
                    <Select 
                      value={newThreshold.operator} 
                      onValueChange={(v) => setNewThreshold(prev => ({ ...prev, operator: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label} ({key})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Valeur seuil</Label>
                  <Input
                    type="number"
                    placeholder="10000000"
                    value={newThreshold.value}
                    onChange={(e) => setNewThreshold(prev => ({ ...prev, value: parseFloat(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-3 pt-2">
                  <Label>Notifications</Label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </span>
                    <Switch
                      checked={newThreshold.notify_email}
                      onCheckedChange={(v) => setNewThreshold(prev => ({ ...prev, notify_email: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> SMS
                    </span>
                    <Switch
                      checked={newThreshold.notify_sms}
                      onCheckedChange={(v) => setNewThreshold(prev => ({ ...prev, notify_sms: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-2">
                      <Monitor className="w-4 h-4" /> Dashboard
                    </span>
                    <Switch
                      checked={newThreshold.notify_dashboard}
                      onCheckedChange={(v) => setNewThreshold(prev => ({ ...prev, notify_dashboard: v }))}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateThreshold} disabled={saving}>
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
