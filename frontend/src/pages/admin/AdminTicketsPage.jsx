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
import { toast } from 'sonner';
import { 
  Headphones, Send, MessageSquare, Clock, CheckCircle, 
  Loader2, User, ChevronRight, AlertCircle, XCircle,
  Filter, Search, RefreshCw
} from 'lucide-react';
import axios from 'axios';

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

const PRIORITY_LABELS = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
};

const CATEGORY_ICONS = {
  technical: '🔧',
  transaction: '💳',
  account: '👤',
  security: '🔒',
  suggestion: '💡',
  other: '❓'
};

export default function AdminTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      
      const res = await axios.get(`${API}/contact/admin/tickets?${params.toString()}`);
      setTickets(res.data.tickets || []);
      setStats(res.data.stats || {});
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const res = await axios.get(`${API}/contact/admin/tickets/${ticketId}`);
      setTicketDetails(res.data.ticket);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error('Veuillez entrer un message');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/contact/admin/tickets/${selectedTicket}/reply`, {
        message: replyText
      });
      toast.success('Réponse envoyée');
      setReplyText('');
      fetchTicketDetails(selectedTicket);
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/contact/admin/tickets/${ticketId}/status`, {
        status: newStatus
      });
      toast.success(`Statut mis à jour: ${STATUS_LABELS[newStatus]}`);
      if (selectedTicket === ticketId) {
        fetchTicketDetails(ticketId);
      }
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.ticket_number?.toLowerCase().includes(query) ||
      t.subject?.toLowerCase().includes(query) ||
      t.user_name?.toLowerCase().includes(query) ||
      t.user_email?.toLowerCase().includes(query)
    );
  });

  if (loading && tickets.length === 0) {
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
      <div className="p-6 lg:p-8" data-testid="admin-tickets-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground flex items-center gap-3">
              <Headphones className="w-8 h-8 text-primary" />
              Gestion des Tickets
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les demandes de support des utilisateurs
            </p>
          </div>
          <Button variant="outline" onClick={fetchTickets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter('')}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setStatusFilter('open')}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.open || 0}</p>
              <p className="text-sm text-muted-foreground">Ouverts</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-yellow-500 transition-colors" onClick={() => setStatusFilter('in_progress')}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.in_progress || 0}</p>
              <p className="text-sm text-muted-foreground">En cours</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-500 transition-colors" onClick={() => setStatusFilter('resolved')}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.resolved || 0}</p>
              <p className="text-sm text-muted-foreground">Résolus</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-gray-500 transition-colors" onClick={() => setStatusFilter('closed')}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-600">{stats.closed || 0}</p>
              <p className="text-sm text-muted-foreground">Fermés</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Ticket, sujet, utilisateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-40">
                <Label className="text-xs">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous</SelectItem>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="closed">Fermé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="text-xs">Priorité</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toutes</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="normal">Normale</SelectItem>
                    <SelectItem value="low">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets List */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets ({filteredTickets.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun ticket trouvé
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTicket === ticket.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedTicket(ticket.id);
                        fetchTicketDetails(ticket.id);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[ticket.category]}</span>
                          <span className="font-medium text-sm">{ticket.ticket_number}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge className={STATUS_COLORS[ticket.status]} variant="outline">
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[ticket.priority]} variant="outline">
                            {PRIORITY_LABELS[ticket.priority]}
                          </Badge>
                        </div>
                      </div>
                      <p className="font-medium text-sm mb-1 line-clamp-1">{ticket.subject}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{ticket.user_name}</span>
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Détails du ticket</CardTitle>
            </CardHeader>
            <CardContent>
              {!ticketDetails ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Sélectionnez un ticket</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ticket Info */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{ticketDetails.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {ticketDetails.ticket_number} • {ticketDetails.category_name}
                        </p>
                      </div>
                      <Select 
                        value={ticketDetails.status}
                        onValueChange={(v) => handleStatusChange(ticketDetails.id, v)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Ouvert</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="resolved">Résolu</SelectItem>
                          <SelectItem value="closed">Fermé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Utilisateur:</span> {ticketDetails.user_name}</p>
                      <p><span className="text-muted-foreground">Email:</span> {ticketDetails.user_email}</p>
                      {ticketDetails.user_phone && (
                        <p><span className="text-muted-foreground">Téléphone:</span> {ticketDetails.user_phone}</p>
                      )}
                      <p><span className="text-muted-foreground">Créé le:</span> {new Date(ticketDetails.created_at).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {ticketDetails.messages?.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${
                          msg.sender_type === 'admin' 
                            ? 'bg-primary/10 ml-4' 
                            : 'bg-muted mr-4'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.sender_type === 'admin' ? (
                            <Headphones className="w-3 h-3 text-primary" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="font-medium text-xs">
                            {msg.sender_type === 'admin' ? 'Support' : msg.sender_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form */}
                  {ticketDetails.status !== 'closed' && (
                    <div className="space-y-3 pt-4 border-t">
                      <Textarea
                        placeholder="Répondre au ticket..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleReply}
                          disabled={submitting || !replyText.trim()}
                          className="flex-1"
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                          Répondre
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleStatusChange(ticketDetails.id, 'resolved')}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Résoudre
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
