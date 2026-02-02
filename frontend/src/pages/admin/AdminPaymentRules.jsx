import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  Shield, CreditCard, Lock, AlertTriangle, CheckCircle, Clock,
  Settings, Save, RefreshCw, Eye, Ban, Globe, Smartphone,
  DollarSign, TrendingUp, Activity, Bell
} from 'lucide-react';
import axios from 'axios';

export default function AdminPaymentRules() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [pendingCaptures, setPendingCaptures] = useState([]);

  // Security Rules
  const [securityRules, setSecurityRules] = useState({
    require_3d_secure: true,
    require_cvv: true,
    require_avs: true,
    block_vpn: true,
    block_tor: true,
    velocity_check: true,
    velocity_max_transactions: 10,
    velocity_time_window: 60, // minutes
    geo_restriction_enabled: false,
    blocked_countries: [],
    require_kyc_above: 1000,
    max_daily_deposit: 10000,
    max_single_transaction: 5000,
    fraud_score_threshold: 70
  });

  // Capture Rules
  const [captureRules, setCaptureRules] = useState({
    capture_mode: 'automatic', // automatic, manual, delayed
    capture_delay_hours: 0,
    manual_review_threshold: 500,
    auto_capture_below: 100,
    hold_suspicious: true,
    notify_admin_above: 1000
  });

  // 3D Secure Settings
  const [secure3DSettings, setSecure3DSettings] = useState({
    enabled: true,
    challenge_threshold: 0, // Always challenge
    exemption_amount: 30, // Below this, may skip 3DS
    preferred_version: '2',
    fallback_to_v1: true
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchSettings();
    fetchPendingCaptures();
  }, [isAdmin, navigate]);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/admin/payment-rules`);
      if (res.data.security) setSecurityRules(res.data.security);
      if (res.data.capture) setCaptureRules(res.data.capture);
      if (res.data.secure3d) setSecure3DSettings(res.data.secure3d);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCaptures = async () => {
    try {
      const res = await axios.get(`${API}/admin/pending-captures`);
      setPendingCaptures(res.data.captures || []);
    } catch (error) {
      console.error('Error fetching pending captures:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/payment-rules`, {
        security: securityRules,
        capture: captureRules,
        secure3d: secure3DSettings
      });
      toast.success('Paramètres de sécurité sauvegardés');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCapture = async (transactionId) => {
    try {
      await axios.post(`${API}/admin/capture/${transactionId}`);
      toast.success('Paiement capturé');
      fetchPendingCaptures();
    } catch (error) {
      toast.error('Erreur lors de la capture');
    }
  };

  const handleVoidTransaction = async (transactionId) => {
    try {
      await axios.post(`${API}/admin/void/${transactionId}`);
      toast.success('Transaction annulée');
      fetchPendingCaptures();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="admin-payment-rules">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
              Sécurité & Capture des Paiements
            </h1>
            <p className="text-muted-foreground mt-1">
              Configurez les règles de sécurité et la capture des transactions
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Sécurité</span>
            </TabsTrigger>
            <TabsTrigger value="3dsecure" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">3D Secure</span>
            </TabsTrigger>
            <TabsTrigger value="capture" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Capture</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">En attente</span>
              {pendingCaptures.length > 0 && (
                <Badge className="ml-1 bg-red-500">{pendingCaptures.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Security Rules Tab */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Règles de Sécurité Carte
                </CardTitle>
                <CardDescription>
                  Activez les vérifications de sécurité pour les paiements par carte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">3D Secure obligatoire</p>
                      <p className="text-sm text-muted-foreground">Authentification forte</p>
                    </div>
                    <Switch
                      checked={securityRules.require_3d_secure}
                      onCheckedChange={(v) => setSecurityRules({...securityRules, require_3d_secure: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">CVV obligatoire</p>
                      <p className="text-sm text-muted-foreground">Code de sécurité carte</p>
                    </div>
                    <Switch
                      checked={securityRules.require_cvv}
                      onCheckedChange={(v) => setSecurityRules({...securityRules, require_cvv: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Vérification AVS</p>
                      <p className="text-sm text-muted-foreground">Address Verification System</p>
                    </div>
                    <Switch
                      checked={securityRules.require_avs}
                      onCheckedChange={(v) => setSecurityRules({...securityRules, require_avs: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Bloquer VPN</p>
                      <p className="text-sm text-muted-foreground">Refuser connexions VPN</p>
                    </div>
                    <Switch
                      checked={securityRules.block_vpn}
                      onCheckedChange={(v) => setSecurityRules({...securityRules, block_vpn: v})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Anti-Fraude & Vélocité
                </CardTitle>
                <CardDescription>
                  Détection des comportements suspects
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Contrôle de vélocité</p>
                    <p className="text-sm text-muted-foreground">
                      Limite de {securityRules.velocity_max_transactions} transactions / {securityRules.velocity_time_window} min
                    </p>
                  </div>
                  <Switch
                    checked={securityRules.velocity_check}
                    onCheckedChange={(v) => setSecurityRules({...securityRules, velocity_check: v})}
                  />
                </div>

                {securityRules.velocity_check && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max transactions</Label>
                      <Input
                        type="number"
                        value={securityRules.velocity_max_transactions}
                        onChange={(e) => setSecurityRules({...securityRules, velocity_max_transactions: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fenêtre (minutes)</Label>
                      <Input
                        type="number"
                        value={securityRules.velocity_time_window}
                        onChange={(e) => setSecurityRules({...securityRules, velocity_time_window: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Score de fraude maximum (0-100)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Transactions avec un score supérieur seront bloquées
                  </p>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[securityRules.fraud_score_threshold]}
                      onValueChange={([v]) => setSecurityRules({...securityRules, fraud_score_threshold: v})}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Badge variant="outline" className="w-16 justify-center">
                      {securityRules.fraud_score_threshold}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  Limites de Transaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction max (€)</Label>
                    <Input
                      type="number"
                      value={securityRules.max_single_transaction}
                      onChange={(e) => setSecurityRules({...securityRules, max_single_transaction: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dépôt journalier max (€)</Label>
                    <Input
                      type="number"
                      value={securityRules.max_daily_deposit}
                      onChange={(e) => setSecurityRules({...securityRules, max_daily_deposit: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KYC obligatoire au-delà de (€)</Label>
                    <Input
                      type="number"
                      value={securityRules.require_kyc_above}
                      onChange={(e) => setSecurityRules({...securityRules, require_kyc_above: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3D Secure Tab */}
          <TabsContent value="3dsecure" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-500" />
                  Configuration 3D Secure
                </CardTitle>
                <CardDescription>
                  Paramètres d'authentification forte pour les cartes bancaires
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">3D Secure activé</p>
                    <p className="text-sm text-muted-foreground">Authentification via la banque du client</p>
                  </div>
                  <Switch
                    checked={secure3DSettings.enabled}
                    onCheckedChange={(v) => setSecure3DSettings({...secure3DSettings, enabled: v})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Version 3D Secure préférée</Label>
                  <Select
                    value={secure3DSettings.preferred_version}
                    onValueChange={(v) => setSecure3DSettings({...secure3DSettings, preferred_version: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">3D Secure 2.0 (Recommandé)</SelectItem>
                      <SelectItem value="1">3D Secure 1.0 (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    3DS 2.0 offre une meilleure expérience utilisateur et moins de frictions
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Fallback vers 3DS 1.0</p>
                    <p className="text-sm text-muted-foreground">Si 3DS 2.0 non supporté par la banque</p>
                  </div>
                  <Switch
                    checked={secure3DSettings.fallback_to_v1}
                    onCheckedChange={(v) => setSecure3DSettings({...secure3DSettings, fallback_to_v1: v})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Montant exemption (€)</Label>
                  <Input
                    type="number"
                    value={secure3DSettings.exemption_amount}
                    onChange={(e) => setSecure3DSettings({...secure3DSettings, exemption_amount: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Transactions inférieures peuvent être exemptées de 3DS (selon la banque)
                  </p>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Protection contre la fraude
                  </h4>
                  <ul className="mt-2 text-sm text-purple-700 dark:text-purple-300 space-y-1">
                    <li>• 3D Secure transfère la responsabilité de la fraude à la banque</li>
                    <li>• Réduction des chargebacks jusqu'à 70%</li>
                    <li>• Conformité PSD2/SCA pour l'Europe</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Capture Rules Tab */}
          <TabsContent value="capture" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  Mode de Capture
                </CardTitle>
                <CardDescription>
                  Définissez quand les fonds sont effectivement débités
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Mode de capture</Label>
                  <Select
                    value={captureRules.capture_mode}
                    onValueChange={(v) => setCaptureRules({...captureRules, capture_mode: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Automatique - Capture immédiate
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-500" />
                          Manuel - Validation admin requise
                        </div>
                      </SelectItem>
                      <SelectItem value="delayed">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          Différé - Capture après délai
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {captureRules.capture_mode === 'delayed' && (
                  <div className="space-y-2">
                    <Label>Délai de capture (heures)</Label>
                    <Input
                      type="number"
                      value={captureRules.capture_delay_hours}
                      onChange={(e) => setCaptureRules({...captureRules, capture_delay_hours: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum 7 jours (168 heures) selon Stripe
                    </p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capture auto en dessous de (€)</Label>
                    <Input
                      type="number"
                      value={captureRules.auto_capture_below}
                      onChange={(e) => setCaptureRules({...captureRules, auto_capture_below: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Petits montants capturés automatiquement
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Revue manuelle au-delà de (€)</Label>
                    <Input
                      type="number"
                      value={captureRules.manual_review_threshold}
                      onChange={(e) => setCaptureRules({...captureRules, manual_review_threshold: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gros montants nécessitent validation
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Bloquer transactions suspectes</p>
                    <p className="text-sm text-muted-foreground">
                      Mise en attente automatique si fraude détectée
                    </p>
                  </div>
                  <Switch
                    checked={captureRules.hold_suspicious}
                    onCheckedChange={(v) => setCaptureRules({...captureRules, hold_suspicious: v})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notifier admin au-delà de (€)</Label>
                  <Input
                    type="number"
                    value={captureRules.notify_admin_above}
                    onChange={(e) => setCaptureRules({...captureRules, notify_admin_above: parseInt(e.target.value)})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Activity className="w-8 h-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                      Flux de Capture des Paiements
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Badge className="bg-yellow-500">Autorisation</Badge>
                      <span>→</span>
                      <Badge className="bg-blue-500">Hold (7 jours max)</Badge>
                      <span>→</span>
                      <Badge className="bg-green-500">Capture</Badge>
                      <span>ou</span>
                      <Badge className="bg-red-500">Annulation</Badge>
                    </div>
                    <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                      Les fonds sont réservés lors de l'autorisation et débités lors de la capture.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Captures Tab */}
          <TabsContent value="pending" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Transactions en Attente de Capture
                </CardTitle>
                <CardDescription>
                  Validez ou annulez les paiements en attente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingCaptures.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">Aucune transaction en attente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingCaptures.map(capture => (
                      <div 
                        key={capture.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-lg">
                              €{capture.amount.toLocaleString()}
                            </p>
                            <Badge className="bg-yellow-500">En attente</Badge>
                            {capture.fraud_score > 50 && (
                              <Badge className="bg-red-500">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Risque: {capture.fraud_score}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {capture.user_email} • Carte •••• {capture.card_last4}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(capture.created_at).toLocaleString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleCapture(capture.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Capturer
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleVoidTransaction(capture.id)}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Annuler
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
      </div>
    </DashboardLayout>
  );
}
