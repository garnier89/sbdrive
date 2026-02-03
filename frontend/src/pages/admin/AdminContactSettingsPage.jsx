import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, MessageCircle, Mail, Phone, Save, Loader2, Globe } from 'lucide-react';
import axios from 'axios';

export default function AdminContactSettingsPage() {
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    show_whatsapp: true,
    support_email: '',
    show_email: false,
    tawkto_property_id: '',
    tawkto_widget_id: '',
    show_tawkto: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/support/settings`);
      if (res.data) {
        setSettings({
          whatsapp_number: res.data.whatsapp_number || '',
          show_whatsapp: res.data.enabled !== false,
          support_email: res.data.support_email || '',
          show_email: !!res.data.support_email,
          tawkto_property_id: res.data.tawkto_property_id || '',
          tawkto_widget_id: res.data.tawkto_widget_id || '',
          show_tawkto: !!res.data.tawkto_property_id
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/support/settings`, {
        whatsapp_number: settings.whatsapp_number,
        whatsapp_message: "Bonjour, j'ai une question concernant SBPAYGO.",
        support_email: settings.support_email,
        tawkto_property_id: settings.tawkto_property_id,
        tawkto_widget_id: settings.tawkto_widget_id,
        enabled: settings.show_whatsapp
      });
      toast.success('Paramètres de contact mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="admin-contact-settings">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-['Manrope'] flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Paramètres de Contact
          </h1>
          <p className="text-muted-foreground">
            Configurez les moyens de contact affichés sur le site
          </p>
        </div>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              WhatsApp
            </CardTitle>
            <CardDescription>
              Configurez le numéro WhatsApp affiché sur le site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-whatsapp">Afficher WhatsApp sur le site</Label>
              <Switch
                id="show-whatsapp"
                checked={settings.show_whatsapp}
                onCheckedChange={(checked) => setSettings({...settings, show_whatsapp: checked})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">Numéro WhatsApp</Label>
              <Input
                id="whatsapp-number"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Format international avec indicatif pays (ex: +33612345678)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Email de Support
            </CardTitle>
            <CardDescription>
              Adresse email de support (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-email">Afficher l'email sur le site</Label>
              <Switch
                id="show-email"
                checked={settings.show_email}
                onCheckedChange={(checked) => setSettings({...settings, show_email: checked})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="support-email">Email de support</Label>
              <Input
                id="support-email"
                type="email"
                placeholder="support@votredomaine.com"
                value={settings.support_email}
                onChange={(e) => setSettings({...settings, support_email: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tawk.to Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              Tawk.to Live Chat
            </CardTitle>
            <CardDescription>
              Widget de chat en direct Tawk.to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-tawkto">Activer le chat Tawk.to</Label>
              <Switch
                id="show-tawkto"
                checked={settings.show_tawkto}
                onCheckedChange={(checked) => setSettings({...settings, show_tawkto: checked})}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tawkto-property">Property ID</Label>
                <Input
                  id="tawkto-property"
                  placeholder="5f3e..."
                  value={settings.tawkto_property_id}
                  onChange={(e) => setSettings({...settings, tawkto_property_id: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tawkto-widget">Widget ID</Label>
                <Input
                  id="tawkto-widget"
                  placeholder="1e8..."
                  value={settings.tawkto_widget_id}
                  onChange={(e) => setSettings({...settings, tawkto_widget_id: e.target.value})}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Trouvez ces IDs dans votre tableau de bord Tawk.to → Administration → Chat Widget
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
