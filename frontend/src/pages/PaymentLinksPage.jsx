import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Link2, Plus, Copy, ExternalLink, Clock, CheckCircle, XCircle, 
  Trash2, QrCode, Share2, DollarSign
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH', NGN: '₦' };

export default function PaymentLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  
  const [newLink, setNewLink] = useState({
    amount: '',
    currency: 'EUR',
    description: '',
    expires_in_hours: 24
  });

  useEffect(() => {
    fetchLinks();
    fetchCurrencies();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await axios.get(`${API}/payment-links`);
      setLinks(res.data.links || []);
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get(`${API}/currencies`);
      setCurrencies(res.data.currencies || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const handleCreateLink = async () => {
    if (!newLink.amount || parseFloat(newLink.amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    if (!newLink.description) {
      toast.error('Veuillez entrer une description');
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post(`${API}/payment-links`, {
        amount: parseFloat(newLink.amount),
        currency: newLink.currency,
        description: newLink.description,
        expires_in_hours: newLink.expires_in_hours
      });
      
      toast.success('Lien de paiement créé !');
      setShowCreateDialog(false);
      setNewLink({ amount: '', currency: 'EUR', description: '', expires_in_hours: 24 });
      fetchLinks();
      
      // Copy link to clipboard
      const fullUrl = `${window.location.origin}/pay/${res.data.short_code}`;
      navigator.clipboard.writeText(fullUrl);
      toast.info('Lien copié dans le presse-papier');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = (shortCode) => {
    const fullUrl = `${window.location.origin}/pay/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Lien copié !');
  };

  const handleCancelLink = async (linkId) => {
    try {
      await axios.delete(`${API}/payment-links/${linkId}`);
      toast.success('Lien annulé');
      fetchLinks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-500', icon: CheckCircle, text: 'Actif' },
      paid: { color: 'bg-blue-500', icon: CheckCircle, text: 'Payé' },
      expired: { color: 'bg-gray-500', icon: Clock, text: 'Expiré' },
      cancelled: { color: 'bg-red-500', icon: XCircle, text: 'Annulé' }
    };
    const c = config[status] || config.active;
    return (
      <Badge className={`${c.color} text-white`}>
        <c.icon className="w-3 h-3 mr-1" />
        {c.text}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
      <div className="p-6 lg:p-8 space-y-8" data-testid="payment-links-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
              Liens de Paiement
            </h1>
            <p className="text-muted-foreground mt-1">
              Créez et partagez des liens pour recevoir des paiements
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="create-link-btn">
                <Plus className="w-4 h-4 mr-2" />
                Créer un lien
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un lien de paiement</DialogTitle>
                <DialogDescription>
                  Générez un lien partageable pour recevoir un paiement
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Montant *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newLink.amount}
                      onChange={(e) => setNewLink({...newLink, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select
                      value={newLink.currency}
                      onValueChange={(v) => setNewLink({...newLink, currency: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(curr => (
                          <SelectItem key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={newLink.description}
                    onChange={(e) => setNewLink({...newLink, description: e.target.value})}
                    placeholder="Ex: Paiement facture #123, Achat produit..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expiration</Label>
                  <Select
                    value={String(newLink.expires_in_hours)}
                    onValueChange={(v) => setNewLink({...newLink, expires_in_hours: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 heure</SelectItem>
                      <SelectItem value="24">24 heures</SelectItem>
                      <SelectItem value="72">3 jours</SelectItem>
                      <SelectItem value="168">7 jours</SelectItem>
                      <SelectItem value="720">30 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleCreateLink} className="w-full" disabled={creating}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Créer le lien
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{links.filter(l => l.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Liens actifs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{links.filter(l => l.status === 'paid').length}</p>
                <p className="text-sm text-muted-foreground">Liens payés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{links.length}</p>
                <p className="text-sm text-muted-foreground">Total liens</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links List */}
        <Card>
          <CardHeader>
            <CardTitle>Mes liens de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun lien de paiement créé</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer votre premier lien
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {links.map(link => (
                  <div 
                    key={link.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted rounded-lg gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg">
                          {CURRENCY_SYMBOLS[link.currency] || link.currency} {link.amount.toLocaleString()}
                        </p>
                        {getStatusBadge(link.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{link.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Code: <span className="font-mono font-bold">{link.short_code}</span>
                        {' '} • Expire: {formatDate(link.expires_at)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyLink(link.short_code)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/pay/${link.short_code}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {link.status === 'active' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleCancelLink(link.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
