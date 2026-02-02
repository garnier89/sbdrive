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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  CreditCard, Wallet, Building2, Smartphone, Settings, Save, Eye, EyeOff,
  CheckCircle, XCircle, Globe, Link2, Key, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const GATEWAYS = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: CreditCard,
    description: 'Cartes bancaires et liens de paiement',
    color: 'bg-purple-500',
    fields: ['public_key', 'secret_key', 'webhook_secret'],
    currencies: ['EUR', 'USD', 'GBP', 'CAD', 'CHF']
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: Wallet,
    description: 'Paiements internationaux',
    color: 'bg-blue-500',
    fields: ['client_id', 'client_secret', 'webhook_id'],
    currencies: ['EUR', 'USD', 'GBP', 'CAD']
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    icon: Smartphone,
    description: 'Mobile Money - Afrique de l\'Ouest',
    color: 'bg-orange-500',
    fields: ['merchant_key', 'api_user', 'api_password'],
    currencies: ['XOF', 'XAF']
  },
  {
    id: 'mtn_momo',
    name: 'MTN Mobile Money',
    icon: Smartphone,
    description: 'Mobile Money - Afrique',
    color: 'bg-yellow-500',
    fields: ['subscription_key', 'api_user', 'api_key'],
    currencies: ['XOF', 'XAF', 'GHS', 'NGN']
  },
  {
    id: 'wave',
    name: 'Wave',
    icon: Smartphone,
    description: 'Mobile Money - Sénégal, Côte d\'Ivoire',
    color: 'bg-cyan-500',
    fields: ['api_key', 'webhook_secret'],
    currencies: ['XOF']
  },
  {
    id: 'moov_money',
    name: 'Moov Money',
    icon: Smartphone,
    description: 'Mobile Money - Afrique de l\'Ouest',
    color: 'bg-green-500',
    fields: ['merchant_id', 'api_key', 'api_secret'],
    currencies: ['XOF']
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    icon: Globe,
    description: 'Agrégateur de paiements Afrique',
    color: 'bg-amber-500',
    fields: ['public_key', 'secret_key', 'encryption_key'],
    currencies: ['NGN', 'GHS', 'KES', 'ZAR', 'XOF', 'USD']
  }
];

export default function AdminGateways() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [gateways, setGateways] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [zones, setZones] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchGateways();
    fetchReferenceData();
  }, [isAdmin, navigate]);

  const fetchGateways = async () => {
    try {
      const res = await axios.get(`${API}/admin/payment-gateways`);
      const gatewayMap = {};
      (res.data.gateways || []).forEach(g => {
        gatewayMap[g.gateway_id] = g;
      });
      setGateways(gatewayMap);
    } catch (error) {
      console.error('Error fetching gateways:', error);
      // Initialize with empty config
      const defaultGateways = {};
      GATEWAYS.forEach(g => {
        defaultGateways[g.id] = {
          gateway_id: g.id,
          enabled: false,
          config: {},
          supported_currencies: g.currencies,
          allowed_zones: []
        };
      });
      setGateways(defaultGateways);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [zonesRes, currRes] = await Promise.all([
        axios.get(`${API}/zones`),
        axios.get(`${API}/currencies`)
      ]);
      setZones(zonesRes.data.zones || []);
      setCurrencies(currRes.data.currencies || []);
    } catch (error) {
      console.error('Error fetching reference data:', error);
    }
  };

  const handleToggleGateway = async (gatewayId, enabled) => {
    const updatedGateways = {
      ...gateways,
      [gatewayId]: {
        ...gateways[gatewayId],
        gateway_id: gatewayId,
        enabled
      }
    };
    setGateways(updatedGateways);
    
    try {
      await axios.put(`${API}/admin/payment-gateways/${gatewayId}`, {
        enabled,
        config: gateways[gatewayId]?.config || {}
      });
      toast.success(`${GATEWAYS.find(g => g.id === gatewayId)?.name} ${enabled ? 'activé' : 'désactivé'}`);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveGateway = async (gatewayId) => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/payment-gateways/${gatewayId}`, gateways[gatewayId]);
      toast.success('Configuration sauvegardée');
      setSelectedGateway(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const updateGatewayConfig = (gatewayId, field, value) => {
    setGateways({
      ...gateways,
      [gatewayId]: {
        ...gateways[gatewayId],
        gateway_id: gatewayId,
        config: {
          ...(gateways[gatewayId]?.config || {}),
          [field]: value
        }
      }
    });
  };

  const updateGatewayField = (gatewayId, field, value) => {
    setGateways({
      ...gateways,
      [gatewayId]: {
        ...gateways[gatewayId],
        gateway_id: gatewayId,
        [field]: value
      }
    });
  };

  const toggleShowSecret = (gatewayId, field) => {
    setShowSecrets({
      ...showSecrets,
      [`${gatewayId}_${field}`]: !showSecrets[`${gatewayId}_${field}`]
    });
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
      <div className="p-6 lg:p-8 space-y-8" data-testid="admin-gateways">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Passerelles de Paiement
          </h1>
          <p className="text-muted-foreground mt-1">
            Configurez et gérez vos intégrations de paiement
          </p>
        </div>

        {/* Gateway Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GATEWAYS.map(gateway => {
            const config = gateways[gateway.id] || { enabled: false, config: {} };
            const isConfigured = gateway.fields.some(f => config.config?.[f]);
            
            return (
              <Card key={gateway.id} className={`relative ${config.enabled ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${gateway.color} flex items-center justify-center`}>
                        <gateway.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{gateway.name}</CardTitle>
                        <CardDescription className="text-xs">{gateway.description}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) => handleToggleGateway(gateway.id, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {gateway.currencies.slice(0, 4).map(curr => (
                      <Badge key={curr} variant="outline" className="text-xs">
                        {curr}
                      </Badge>
                    ))}
                    {gateway.currencies.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{gateway.currencies.length - 4}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isConfigured ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Configuré
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="w-3 h-3 mr-1" />
                          Non configuré
                        </Badge>
                      )}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedGateway(gateway)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configurer
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <gateway.icon className="w-5 h-5" />
                            Configuration {gateway.name}
                          </DialogTitle>
                          <DialogDescription>
                            Entrez vos clés API pour activer cette passerelle
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 mt-4">
                          {/* API Keys */}
                          {gateway.fields.map(field => (
                            <div key={field} className="space-y-2">
                              <Label className="capitalize">
                                {field.replace(/_/g, ' ')}
                              </Label>
                              <div className="relative">
                                <Input
                                  type={showSecrets[`${gateway.id}_${field}`] ? 'text' : 'password'}
                                  value={config.config?.[field] || ''}
                                  onChange={(e) => updateGatewayConfig(gateway.id, field, e.target.value)}
                                  placeholder={`Entrez votre ${field.replace(/_/g, ' ')}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => toggleShowSecret(gateway.id, field)}
                                >
                                  {showSecrets[`${gateway.id}_${field}`] ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* Webhook URL */}
                          <div className="space-y-2">
                            <Label>URL Webhook</Label>
                            <div className="flex gap-2">
                              <Input
                                value={`${window.location.origin}/api/webhook/${gateway.id}`}
                                readOnly
                                className="bg-muted"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${gateway.id}`);
                                  toast.success('URL copiée');
                                }}
                              >
                                <Link2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Supported Currencies */}
                          <div className="space-y-2">
                            <Label>Devises supportées</Label>
                            <div className="flex flex-wrap gap-2">
                              {gateway.currencies.map(curr => (
                                <Badge key={curr} variant="outline">
                                  {curr}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Save Button */}
                          <Button 
                            onClick={() => handleSaveGateway(gateway.id)} 
                            className="w-full"
                            disabled={saving}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Sauvegarder la configuration
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Key className="w-8 h-8 text-primary mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Sécurité des clés API</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Les clés API sont stockées de manière sécurisée et chiffrées</li>
                  <li>• Utilisez des clés de test pendant le développement</li>
                  <li>• Configurez les webhooks pour recevoir les notifications de paiement</li>
                  <li>• Restreignez l'accès aux clés de production</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
