import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { API } from '@/App';
import axios from 'axios';
import { MapPin, Shield, AlertTriangle, CheckCircle, Loader2, Navigation, History, XCircle } from 'lucide-react';

export default function GeoSecurityPage() {
  const [settings, setSettings] = useState({
    enabled: false,
    home_latitude: null,
    home_longitude: null,
    allowed_radius_km: 50,
    notify_on_block: true,
    home_address: null
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/security/geo/settings`);
      setSettings(response.data.settings || settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/security/geo/logs?limit=10`);
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setSettings(prev => ({
          ...prev,
          home_latitude: latitude,
          home_longitude: longitude
        }));
        
        // Try to get address (reverse geocoding would need an external API)
        toast.success('Position récupérée avec succès !');
        setGettingLocation(false);
      },
      (error) => {
        let message = 'Impossible de récupérer votre position';
        if (error.code === 1) message = 'Accès à la localisation refusé';
        else if (error.code === 2) message = 'Position non disponible';
        else if (error.code === 3) message = 'Délai d\'attente dépassé';
        
        toast.error(message);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (settings.enabled && (!settings.home_latitude || !settings.home_longitude)) {
      toast.error('Veuillez définir votre position de référence');
      return;
    }

    setSaving(true);

    try {
      await axios.post(`${API}/security/geo/settings`, settings);
      toast.success(settings.enabled ? 'Sécurité géographique activée' : 'Paramètres enregistrés');
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    try {
      await axios.delete(`${API}/security/geo/settings`);
      setSettings(prev => ({ ...prev, enabled: false }));
      toast.success('Sécurité géographique désactivée');
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <BackButton />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/20">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sécurité Géographique</h1>
            <p className="text-sm text-slate-500">Limitez vos transactions à une zone géographique</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enable/Disable Card */}
            <Card className={settings.enabled ? 'border-green-300 bg-green-50/50' : ''}>
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${settings.enabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Shield className={`w-6 h-6 ${settings.enabled ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">Protection géographique</h3>
                      <p className="text-sm text-slate-500">
                        {settings.enabled 
                          ? 'Vos transactions sont protégées' 
                          : 'Activez pour sécuriser vos paiements'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
                    data-testid="geo-security-toggle"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Location Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-500" />
                  Position de référence
                </CardTitle>
                <CardDescription>
                  Définissez le centre de votre zone autorisée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  variant="outline"
                  className="w-full"
                  data-testid="get-location-btn"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  Utiliser ma position actuelle
                </Button>

                {settings.home_latitude && settings.home_longitude && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Position enregistrée</span>
                    </div>
                    <p className="text-sm text-blue-600 font-mono">
                      {settings.home_latitude.toFixed(6)}, {settings.home_longitude.toFixed(6)}
                    </p>
                  </div>
                )}

                {/* Radius Slider */}
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center">
                    <Label>Rayon autorisé</Label>
                    <Badge variant="secondary" className="font-mono">
                      {settings.allowed_radius_km} km
                    </Badge>
                  </div>
                  <Slider
                    value={[settings.allowed_radius_km]}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, allowed_radius_km: value[0] }))}
                    min={1}
                    max={500}
                    step={5}
                    className="w-full"
                    data-testid="radius-slider"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>1 km</span>
                    <span>500 km</span>
                  </div>
                </div>

                {/* Notify on block */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium text-sm">Notification de blocage</p>
                    <p className="text-xs text-slate-500">Recevoir une alerte si une transaction est bloquée</p>
                  </div>
                  <Switch
                    checked={settings.notify_on_block}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_on_block: checked }))}
                  />
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  data-testid="save-geo-settings-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Enregistrer les paramètres
                </Button>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="flex items-start gap-4 py-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-800">Attention</h4>
                  <p className="text-sm text-yellow-700">
                    Lorsque la sécurité géographique est activée, toute transaction effectuée 
                    en dehors de votre zone sera automatiquement bloquée. Assurez-vous de 
                    désactiver cette protection si vous voyagez.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Logs */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500" />
                  Activité récente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-center text-slate-500 py-4 text-sm">
                    Aucune activité enregistrée
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg text-sm ${
                        log.is_allowed 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {log.is_allowed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={log.is_allowed ? 'text-green-700' : 'text-red-700'}>
                          {log.is_allowed ? 'Autorisé' : 'Bloqué'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {log.distance_km} km • {log.transaction_type}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDate(log.checked_at)}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
