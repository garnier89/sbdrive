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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  HelpCircle, Send, MessageSquare, Clock, CheckCircle, 
  Loader2, Plus, ChevronRight, AlertCircle, User, Headphones
} from 'lucide-react';
import axios from 'axios';

const CATEGORY_ICONS = {
  technical: '🔧',
  transaction: '💳',
  account: '👤',
  security: '🔒',
  suggestion: '💡',
  other: '❓'
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

const STATUS_LABELS = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

export default function HelpCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({});
  const [tickets, setTickets] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'technical',
    message: '',
    priority: 'normal'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/contact/categories`),
        axios.get(`${API}/contact/tickets`)
      ]);
      setCategories(catRes.data.categories || {});
      setTickets(ticketsRes.data.tickets || []);
      setStatusCounts(ticketsRes.data.status_counts || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await axios.get(`${API}/contact/tickets/${ticketId}`);
      setTicketDetails(res.data.ticket);
    } catch (error) {
      toast.error('Erreur lors du chargement du ticket');
    }
  };

  const handleSubmitTicket = async () => {
    if (!newTicket.subject || !newTicket.message) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/contact/submit`, newTicket);
      toast.success(`Ticket ${res.data.ticket_number} créé avec succès`);
      setShowNewTicketDialog(false);
      setNewTicket({ subject: '', category: 'technical', message: '', priority: 'normal' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error('Veuillez entrer un message');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/contact/tickets/${selectedTicket}/reply`, {
        message: replyText
      });
      toast.success('Réponse envoyée');
      setReplyText('');
      fetchTicketDetails(selectedTicket);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
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
      <div className="p-6 lg:p-8" data-testid="help-center-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground flex items-center gap-3">
              <Headphones className="w-8 h-8 text-primary" />
              Centre d'Aide
            </h1>
            <p className="text-muted-foreground mt-1">
              Besoin d'aide ? Contactez notre équipe support
            </p>
          </div>
          <Button onClick={() => setShowNewTicketDialog(true)} data-testid="new-ticket-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{statusCounts.open || 0}</p>
              <p className="text-sm text-muted-foreground">Ouverts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{statusCounts.in_progress || 0}</p>
              <p className="text-sm text-muted-foreground">En cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{statusCounts.resolved || 0}</p>
              <p className="text-sm text-muted-foreground">Résolus</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">{statusCounts.closed || 0}</p>
              <p className="text-sm text-muted-foreground">Fermés</p>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List or Details */}
        {selectedTicket && ticketDetails ? (
          /* Ticket Details View */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedTicket(null); setTicketDetails(null); }}
                    className="mb-2"
                  >
                    ← Retour
                  </Button>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">{CATEGORY_ICONS[ticketDetails.category]}</span>
                    {ticketDetails.subject}
                  </CardTitle>
                  <CardDescription>
                    {ticketDetails.ticket_number} • Créé le {new Date(ticketDetails.created_at).toLocaleDateString('fr-FR')}
                  </CardDescription>
                </div>
                <Badge className={STATUS_COLORS[ticketDetails.status]}>
                  {STATUS_LABELS[ticketDetails.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Messages */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {ticketDetails.messages?.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.sender_type === 'admin' 
                        ? 'bg-primary/10 ml-8' 
                        : 'bg-muted mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {msg.sender_type === 'admin' ? (
                        <Headphones className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      <span className="font-medium text-sm">
                        {msg.sender_type === 'admin' ? 'Support SB Money' : msg.sender_name || 'Vous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              {ticketDetails.status !== 'closed' && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>Ajouter une réponse</Label>
                  <Textarea
                    placeholder="Écrivez votre message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleReply}
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Envoyer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Tickets List View */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Mes tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-12">
                  <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun ticket</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous n'avez pas encore créé de ticket de support
                  </p>
                  <Button onClick={() => setShowNewTicketDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un ticket
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedTicket(ticket.id);
                        fetchTicketDetails(ticket.id);
                      }}
                      data-testid={`ticket-${ticket.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{CATEGORY_ICONS[ticket.category]}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{ticket.subject}</p>
                            <Badge className={STATUS_COLORS[ticket.status]} variant="outline">
                              {STATUS_LABELS[ticket.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{ticket.ticket_number}</span>
                            <span>•</span>
                            <span>{ticket.category_name}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FAQ Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Questions fréquentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { q: "Comment effectuer un dépôt ?", a: "Allez dans 'Dépôt', choisissez votre méthode de paiement (Carte bancaire, Mobile Money), et suivez les instructions." },
                { q: "Comment transférer de l'argent ?", a: "Utilisez 'Transfert' pour envoyer à un email ou 'Entre Utilisateurs' pour un numéro de téléphone." },
                { q: "Comment sécuriser mon compte ?", a: "Activez l'authentification 2FA dans les paramètres et définissez un PIN pour votre coffre-fort." },
                { q: "Comment contacter le support ?", a: "Créez un ticket via cette page ou utilisez le chat WhatsApp en bas de page." }
              ].map((faq, i) => (
                <div key={i} className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* New Ticket Dialog */}
        <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nouveau ticket
              </DialogTitle>
              <DialogDescription>
                Décrivez votre problème et notre équipe vous répondra rapidement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Sujet *</Label>
                <Input
                  placeholder="Ex: Problème de transfert"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  data-testid="ticket-subject"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select 
                    value={newTicket.category}
                    onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
                  >
                    <SelectTrigger data-testid="ticket-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categories).map(([key, cat]) => (
                        <SelectItem key={key} value={key}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select 
                    value={newTicket.priority}
                    onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}
                  >
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
              </div>
              <div className="space-y-2">
                <Label>Description du problème *</Label>
                <Textarea
                  placeholder="Décrivez votre problème en détail..."
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={5}
                  data-testid="ticket-message"
                />
                <p className="text-xs text-muted-foreground">{newTicket.message.length}/2000</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTicketDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSubmitTicket}
                disabled={submitting || !newTicket.subject || !newTicket.message}
                data-testid="submit-ticket-btn"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
