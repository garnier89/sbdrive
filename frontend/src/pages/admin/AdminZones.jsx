import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Globe, Plus, Trash2, Edit, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';

const PAYMENT_METHODS = [
  { id: 'stripe', name: 'Carte bancaire (Stripe)' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'orange_money', name: 'Orange Money' },
  { id: 'mtn_momo', name: 'MTN Mobile Money' },
  { id: 'wave', name: 'Wave' },
  { id: 'moov_money', name: 'Moov Money' },
  { id: 'bank_transfer', name: 'Virement bancaire' }
];

const CURRENCIES = ['EUR', 'USD', 'XOF', 'GBP', 'MAD', 'NGN', 'GHS', 'KES'];

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'ES', name: 'Espagne' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'US', name: 'États-Unis' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'CM', name: 'Cameroun' },
  { code: 'MA', name: 'Maroc' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' }
];

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  
  const [formData, setFormData] = useState({
    zone_name: '',
    countries: [],
    currencies: [],
    payment_methods: [],
    transfer_fees_percent: 1.0,
    min_transfer_amount: 1,
    max_transfer_amount: 10000,
    partner_banks: []
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await axios.get(`${API}/zones`);
      setZones(res.data.zones);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      zone_name: '',
      countries: [],
      currencies: [],
      payment_methods: [],
      transfer_fees_percent: 1.0,
      min_transfer_amount: 1,
      max_transfer_amount: 10000,
      partner_banks: []
    });
    setEditingZone(null);
  };

  const handleSave = async () => {
    if (!formData.zone_name || formData.countries.length === 0) {
      toast.error('Nom et pays requis');
      return;
    }

    try {
      if (editingZone) {
        await axios.put(`${API}/admin/zones/${editingZone.id}`, formData);
        toast.success('Zone mise à jour');
      } else {
        await axios.post(`${API}/admin/zones`, formData);
        toast.success('Zone créée');
      }
      setShowDialog(false);
      resetForm();
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDelete = async (zoneId) => {
    if (!confirm('Supprimer cette zone?')) return;
    
    try {
      await axios.delete(`${API}/admin/zones/${zoneId}`);
      toast.success('Zone supprimée');
      fetchZones();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      zone_name: zone.zone_name,
      countries: zone.countries,
      currencies: zone.currencies,
      payment_methods: zone.payment_methods,
      transfer_fees_percent: zone.transfer_fees_percent,
      min_transfer_amount: zone.min_transfer_amount,
      max_transfer_amount: zone.max_transfer_amount,
      partner_banks: zone.partner_banks || []
    });
    setShowDialog(true);
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
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
      <div className="p-6 lg:p-8 space-y-6" data-testid="admin-zones-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
              Zones d'Activité
            </h1>
            <p className="text-muted-foreground mt-1">
              Configurez les zones géographiques et leurs paramètres
            </p>
          </div>
          
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingZone ? 'Modifier la zone' : 'Créer une zone'}
                </DialogTitle>
                <DialogDescription>
                  Définissez les paramètres de cette zone géographique
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label>Nom de la zone *</Label>
                  <Input
                    value={formData.zone_name}
                    onChange={(e) => setFormData({...formData, zone_name: e.target.value})}
                    placeholder="Ex: Europe de l'Ouest, Afrique de l'Ouest..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pays inclus *</Label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map(country => (
                      <Badge
                        key={country.code}
                        variant={formData.countries.includes(country.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData, 
                          countries: toggleArrayItem(formData.countries, country.code)
                        })}
                      >
                        {country.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Devises supportées</Label>
                  <div className="flex flex-wrap gap-2">
                    {CURRENCIES.map(curr => (
                      <Badge
                        key={curr}
                        variant={formData.currencies.includes(curr) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData, 
                          currencies: toggleArrayItem(formData.currencies, curr)
                        })}
                      >
                        {curr}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Moyens de paiement</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(pm => (
                      <Badge
                        key={pm.id}
                        variant={formData.payment_methods.includes(pm.id) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setFormData({
                          ...formData, 
                          payment_methods: toggleArrayItem(formData.payment_methods, pm.id)
                        })}
                      >
                        {pm.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Frais de transfert (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.transfer_fees_percent}
                      onChange={(e) => setFormData({...formData, transfer_fees_percent: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Montant min</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.min_transfer_amount}
                      onChange={(e) => setFormData({...formData, min_transfer_amount: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Montant max</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.max_transfer_amount}
                      onChange={(e) => setFormData({...formData, max_transfer_amount: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingZone ? 'Mettre à jour' : 'Créer la zone'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Zones List */}
        {zones.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucune zone configurée</h3>
              <p className="text-muted-foreground mb-4">
                Créez des zones pour personnaliser les paramètres par région
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {zones.map((zone) => (
              <Card key={zone.id} className="hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{zone.zone_name}</h3>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {zone.countries?.map(c => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              {COUNTRIES.find(x => x.code === c)?.name || c}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {zone.currencies?.map(c => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          Frais: {zone.transfer_fees_percent}% • 
                          Min: {zone.min_transfer_amount} • 
                          Max: {zone.max_transfer_amount}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(zone)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(zone.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
