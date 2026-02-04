import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { 
  Shield, AlertTriangle, Users, Ban, CheckCircle, XCircle,
  Search, Loader2, Eye, UserX, RefreshCw, TrendingUp
} from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { label: 'Critique', color: 'bg-red-600', textColor: 'text-red-600' },
  high: { label: 'Élevé', color: 'bg-orange-500', textColor: 'text-orange-500' },
  medium: { label: 'Moyen', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  low: { label: 'Faible', color: 'bg-green-500', textColor: 'text-green-500' }
};

const ALERT_TYPES = {
  duplicate_device: 'Appareil dupliqué',
  duplicate_phone: 'Téléphone dupliqué',
  manual_report: 'Signalement manuel',
  suspicious_activity: 'Activité suspecte'
};

export default function AdminAntiFraudPage() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, [activeTab]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? 'all' : activeTab;
      const response = await axios.get(`${API}/security/anti-fraud/alerts?status=${status}`);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/security/anti-fraud/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleResolve = async (alertId, action) => {
    setProcessingAction(true);
    try {
      await axios.post(`${API}/security/anti-fraud/alerts/${alertId}/resolve?action=${action}`);
      toast.success('Action effectuée avec succès');
      setShowDetailDialog(false);
      fetchAlerts();
      fetchStats();
    } catch (error) {
      toast.error('Erreur lors du traitement');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCheckRisk = async () => {
    if (!searchUserId.trim()) {
      toast.error('Veuillez entrer un ID utilisateur');
      return;
    }
    
    try {
      const response = await axios.get(`${API}/security/anti-fraud/user/${searchUserId}/risk-score`);
      setRiskData(response.data);
      setShowRiskDialog(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Utilisateur non trouvé');
    }
  };

  const formatDate = (dateStr) => {
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
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Anti-Fraude</h1>
              <p className="text-sm text-slate-500">Détection et gestion des comptes suspects</p>
            </div>
          </div>
          <Button onClick={() => { fetchAlerts(); fetchStats(); }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Alertes en attente</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.pending_alerts}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Comptes bloqués</p>
                    <p className="text-2xl font-bold text-red-600">{stats.blocked_users}</p>
                  </div>
                  <Ban className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Alertes 7j</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.recent_alerts_7d}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Taux de fraude</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.fraud_rate}%</p>
                  </div>
                  <Users className="w-8 h-8 text-slate-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Risk Check */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-slate-500">Vérifier le risque d&apos;un utilisateur</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="ID utilisateur"
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button onClick={handleCheckRisk}>
                    <Search className="w-4 h-4 mr-2" />
                    Analyser
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              En attente ({alerts.filter(a => a.status === 'pending').length || stats?.pending_alerts || 0})
            </TabsTrigger>
            <TabsTrigger value="actioned">Traité</TabsTrigger>
            <TabsTrigger value="dismissed">Ignoré</TabsTrigger>
            <TabsTrigger value="all">Tout</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700">Aucune alerte</h3>
                  <p className="text-slate-500">Aucune alerte de fraude dans cette catégorie</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => {
                  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
                  return (
                    <Card key={alert.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${severity.color}/10`}>
                              <AlertTriangle className={`w-5 h-5 ${severity.textColor}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{ALERT_TYPES[alert.type] || alert.type}</h4>
                                <Badge className={severity.color}>{severity.label}</Badge>
                                {alert.status === 'pending' && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    En attente
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 mb-2">
                                {formatDate(alert.created_at)}
                              </p>
                              {alert.user && (
                                <div className="text-sm">
                                  <span className="text-slate-500">Utilisateur: </span>
                                  <span className="font-medium">{alert.user.full_name}</span>
                                  <span className="text-slate-400 ml-2">({alert.user.email})</span>
                                </div>
                              )}
                              {alert.related_user && (
                                <div className="text-sm">
                                  <span className="text-slate-500">Lié à: </span>
                                  <span className="font-medium">{alert.related_user.full_name}</span>
                                  <span className="text-slate-400 ml-2">({alert.related_user.email})</span>
                                </div>
                              )}
                              {alert.reason && (
                                <p className="text-sm text-slate-600 mt-1">
                                  <span className="font-medium">Raison:</span> {alert.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Détails
                            </Button>
                            {alert.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => handleResolve(alert.id, 'dismiss')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => handleResolve(alert.id, 'block_user')}
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détails de l&apos;alerte</DialogTitle>
              <DialogDescription>
                {selectedAlert && ALERT_TYPES[selectedAlert.type]}
              </DialogDescription>
            </DialogHeader>
            {selectedAlert && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type</span>
                    <span className="font-medium">{ALERT_TYPES[selectedAlert.type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sévérité</span>
                    <Badge className={SEVERITY_CONFIG[selectedAlert.severity]?.color}>
                      {SEVERITY_CONFIG[selectedAlert.severity]?.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span>{formatDate(selectedAlert.created_at)}</span>
                  </div>
                </div>

                {selectedAlert.user && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Utilisateur principal</h4>
                    <p><span className="text-slate-500">Nom:</span> {selectedAlert.user.full_name}</p>
                    <p><span className="text-slate-500">Email:</span> {selectedAlert.user.email}</p>
                    <p><span className="text-slate-500">Tél:</span> {selectedAlert.user.phone}</p>
                  </div>
                )}

                {selectedAlert.related_user && (
                  <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <h4 className="font-semibold mb-2 text-orange-700">Compte lié (suspect)</h4>
                    <p><span className="text-slate-500">Nom:</span> {selectedAlert.related_user.full_name}</p>
                    <p><span className="text-slate-500">Email:</span> {selectedAlert.related_user.email}</p>
                    <p><span className="text-slate-500">Tél:</span> {selectedAlert.related_user.phone}</p>
                  </div>
                )}

                {selectedAlert.status === 'pending' && (
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleResolve(selectedAlert.id, 'dismiss')}
                      disabled={processingAction}
                    >
                      Ignorer
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleResolve(selectedAlert.id, 'block_user')}
                      disabled={processingAction}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Bloquer l&apos;utilisateur
                    </Button>
                    {selectedAlert.related_user && (
                      <Button
                        variant="destructive"
                        onClick={() => handleResolve(selectedAlert.id, 'block_both')}
                        disabled={processingAction}
                      >
                        Bloquer les deux
                      </Button>
                    )}
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Risk Dialog */}
        <Dialog open={showRiskDialog} onOpenChange={setShowRiskDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Analyse de risque</DialogTitle>
            </DialogHeader>
            {riskData && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-slate-50 rounded-lg">
                  <div className={`text-5xl font-bold mb-2 ${
                    riskData.risk_level === 'critical' ? 'text-red-600' :
                    riskData.risk_level === 'high' ? 'text-orange-500' :
                    riskData.risk_level === 'medium' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    {riskData.risk_score}
                  </div>
                  <Badge className={SEVERITY_CONFIG[riskData.risk_level]?.color || 'bg-green-500'}>
                    Risque {SEVERITY_CONFIG[riskData.risk_level]?.label || 'Faible'}
                  </Badge>
                </div>

                {riskData.risk_factors.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Facteurs de risque</h4>
                    <ul className="space-y-1">
                      {riskData.risk_factors.map((factor, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Recommandation:</span> {riskData.recommendation}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
