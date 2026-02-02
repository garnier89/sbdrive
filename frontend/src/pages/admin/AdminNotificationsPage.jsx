import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Bell, Send, Users, Globe, Calendar, Clock, 
  Loader2, CheckCircle, AlertCircle, MapPin, 
  Mail, MessageSquare, Smartphone, History, 
  BarChart3, XCircle, Eye, Filter
} from 'lucide-react';
import axios from 'axios';

export default function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [zones, setZones] = useState({});
  const [channels, setChannels] = useState({});
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [recipientCount, setRecipientCount] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    title: '',
    message: '',
    target_countries: [],
    target_zones: [],
    target_user_types: [],
    channels: ['push'],
    priority: 'normal',
    link_url: '',
    scheduled_at: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [zonesRes, historyRes, statsRes] = await Promise.all([
        axios.get(`${API}/notifications/zones`),
        axios.get(`${API}/notifications/history`),
        axios.get(`${API}/notifications/stats/overview`)
      ]);
      setZones(zonesRes.data.countries || {});
      setChannels(zonesRes.data.channels || {});
      setHistory(historyRes.data.notifications || []);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipientCount = async () => {
    if (form.target_countries.length === 0) {
      setRecipientCount(null);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/notifications/filter-users`, {
        params: {
          countries: form.target_countries.join(','),
          zones: form.target_zones.join(','),
          user_types: form.target_user_types.join(',')
        }
      });
      setRecipientCount(res.data.total_recipients);
    } catch (error) {
      console.error('Error fetching recipient count');
    }
  };

  useEffect(() => {
    fetchRecipientCount();
  }, [form.target_countries, form.target_zones, form.target_user_types]);

  const handleSendNotification = async () => {
    if (!form.title || !form.message) {
      toast.error('Titre et message requis');
      return;
    }
    
    if (form.target_countries.length === 0) {
      toast.error('Sélectionnez au moins un pays');
      return;
    }
    
    if (form.channels.length === 0) {
      toast.error('Sélectionnez au moins un canal');
      return;
    }
    
    setSending(true);
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at || null
      };
      
      const res = await axios.post(`${API}/notifications/send`, payload);
      toast.success(`Notification envoyée à ${res.data.recipients_count} utilisateurs!`);
      
      // Reset form
      setForm({
        title: '',
        message: '',
        target_countries: [],
        target_zones: [],
        target_user_types: [],
        channels: ['push'],
        priority: 'normal',
        link_url: '',
        scheduled_at: ''
      });
      setRecipientCount(null);
      
      // Refresh data
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleCancelNotification = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/cancel/${notificationId}`);
      toast.success('Notification annulée');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const toggleCountry = (countryCode) => {
    const updated = form.target_countries.includes(countryCode)
      ? form.target_countries.filter(c => c !== countryCode)
      : [...form.target_countries, countryCode];
    setForm({ ...form, target_countries: updated });
  };

  const toggleChannel = (channel) => {
    const updated = form.channels.includes(channel)
      ? form.channels.filter(c => c !== channel)
      : [...form.channels, channel];
    setForm({ ...form, channels: updated });
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800'
    };
    const labels = {
      sent: 'Envoyé',
      scheduled: 'Programmé',
      sending: 'En cours',
      cancelled: 'Annulé',
      failed: 'Échoué'
    };
    return <Badge className={styles[status] || styles.sent}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[priority] || styles.normal}>{priority}</Badge>;
  };

  const channelIcons = {
    push: Smartphone,
    sms: MessageSquare,
    email: Mail,
    whatsapp: MessageSquare
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
      <div className="p-6 lg:p-8" data-testid="admin-notifications-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Notifications par Zone
          </h1>
          <p className="text-muted-foreground mt-1">
            Envoyez des notifications ciblées à vos utilisateurs par pays et zone géographique
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Send className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_campaigns}</p>
                    <p className="text-sm text-muted-foreground">Campagnes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.by_status?.sent || 0}</p>
                    <p className="text-sm text-muted-foreground">Envoyées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.by_status?.scheduled || 0}</p>
                    <p className="text-sm text-muted-foreground">Programmées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_recipients_reached?.toLocaleString() || 0}</p>
                    <p className="text-sm text-muted-foreground">Utilisateurs atteints</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">Nouvelle notification</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* Create Notification Tab */}
          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contenu de la notification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titre *</Label>
                      <Input
                        placeholder="Ex: Promo spéciale"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        maxLength={100}
                        data-testid="notification-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message *</Label>
                      <Textarea
                        placeholder="Ex: Réduction de 10% sur les transferts cette semaine!"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        maxLength={500}
                        rows={4}
                        data-testid="notification-message"
                      />
                      <p className="text-xs text-muted-foreground">{form.message.length}/500 caractères</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Lien (optionnel)</Label>
                      <Input
                        placeholder="https://..."
                        value={form.link_url}
                        onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priorité</Label>
                        <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Basse</SelectItem>
                            <SelectItem value="normal">Normale</SelectItem>
                            <SelectItem value="high">Haute</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Programmer (optionnel)</Label>
                        <Input
                          type="datetime-local"
                          value={form.scheduled_at}
                          onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Target Countries */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Ciblage géographique
                    </CardTitle>
                    <CardDescription>
                      Sélectionnez les pays cibles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(zones).map(([code, country]) => (
                        <div
                          key={code}
                          onClick={() => toggleCountry(code)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            form.target_countries.includes(code)
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground'
                          }`}
                          data-testid={`country-${code}`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox checked={form.target_countries.includes(code)} />
                            <div>
                              <p className="font-medium text-sm">{country.name}</p>
                              <p className="text-xs text-muted-foreground">{code}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Channels */}
                <Card>
                  <CardHeader>
                    <CardTitle>Canaux de diffusion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(channels).map(([key, channel]) => {
                        const Icon = channelIcons[key] || Bell;
                        return (
                          <div
                            key={key}
                            onClick={() => toggleChannel(key)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                              form.channels.includes(key)
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-muted-foreground'
                            }`}
                            data-testid={`channel-${key}`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Icon className={`w-6 h-6 ${form.channels.includes(key) ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-sm font-medium">{channel.name}</span>
                              {channel.demo && (
                                <Badge variant="outline" className="text-xs">Demo</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview & Send */}
              <div className="space-y-6">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle>Aperçu & Envoi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Preview */}
                    {form.title && (
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary rounded-lg">
                            <Bell className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{form.title || 'Titre'}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {form.message || 'Message...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Target Summary */}
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pays ciblés</span>
                        <span className="font-medium">{form.target_countries.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Canaux</span>
                        <span className="font-medium">{form.channels.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Priorité</span>
                        {getPriorityBadge(form.priority)}
                      </div>
                      {form.scheduled_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Programmé</span>
                          <span className="font-medium text-xs">
                            {new Date(form.scheduled_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Recipient Count */}
                    {recipientCount !== null && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {recipientCount.toLocaleString()}
                            </p>
                            <p className="text-sm text-green-600">destinataires</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Demo Warning */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Mode démo: SMS/Email/WhatsApp sont simulés
                      </p>
                    </div>

                    {/* Send Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={sending || !form.title || !form.message || form.target_countries.length === 0}
                      onClick={handleSendNotification}
                      data-testid="send-notification-btn"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : form.scheduled_at ? (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Programmer
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer maintenant
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historique des notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune notification envoyée
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{notif.title}</p>
                            {getStatusBadge(notif.status)}
                            {getPriorityBadge(notif.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{notif.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {notif.sent_count || notif.recipient_count} destinataires
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {notif.target_countries?.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(notif.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {notif.status === 'scheduled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelNotification(notif.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedNotification(notif)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Notification Details Dialog */}
        <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détails de la notification</DialogTitle>
            </DialogHeader>
            {selectedNotification && (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-lg">{selectedNotification.title}</p>
                  <p className="text-muted-foreground">{selectedNotification.message}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Statut</p>
                    <p>{getStatusBadge(selectedNotification.status)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priorité</p>
                    <p>{getPriorityBadge(selectedNotification.priority)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Destinataires</p>
                    <p className="font-medium">{selectedNotification.recipient_count?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Envoyés</p>
                    <p className="font-medium">{selectedNotification.sent_count?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pays ciblés</p>
                    <p className="font-medium">{selectedNotification.target_countries?.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Canaux</p>
                    <p className="font-medium">{selectedNotification.channels?.join(', ')}</p>
                  </div>
                </div>
                {selectedNotification.link_url && (
                  <div>
                    <p className="text-muted-foreground text-sm">Lien</p>
                    <a href={selectedNotification.link_url} className="text-primary text-sm" target="_blank" rel="noopener noreferrer">
                      {selectedNotification.link_url}
                    </a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
