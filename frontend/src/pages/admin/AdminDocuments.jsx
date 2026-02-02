import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, MoreHorizontal, CheckCircle, XCircle, Clock, Filter, Eye } from 'lucide-react';
import axios from 'axios';

const DOC_TYPES = {
  id_card: "Carte d'identité",
  passport: "Passeport",
  proof_of_address: "Justificatif de domicile",
  bank_statement: "Relevé bancaire"
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: XCircle }
};

export default function AdminDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await axios.get(`${API}/admin/documents${params}`);
      setDocuments(res.data.documents);
    } catch (error) {
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentStatus = async (docId, status, reason = null) => {
    try {
      await axios.patch(`${API}/admin/documents/${docId}`, {
        status,
        rejection_reason: reason
      });
      toast.success('Statut mis à jour');
      fetchDocuments();
      setShowRejectDialog(false);
      setSelectedDoc(null);
      setRejectionReason('');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8" data-testid="admin-documents-page">
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Gestion des Documents KYC
          </h1>
          <p className="text-muted-foreground mt-1">
            Validez les documents d'identité des utilisateurs
          </p>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvés</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Manrope'] flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Aucun document à afficher
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => {
                      const statusConfig = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{doc.user_name}</p>
                              <p className="text-sm text-muted-foreground">{doc.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {DOC_TYPES[doc.document_type] || doc.document_type}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{doc.document_name}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusConfig.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                            {doc.rejection_reason && (
                              <p className="text-xs text-red-500 mt-1">{doc.rejection_reason}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(doc.uploaded_at)}
                          </TableCell>
                          <TableCell>
                            {doc.status === 'pending' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => updateDocumentStatus(doc.id, 'approved')}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approuver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedDoc(doc);
                                      setShowRejectDialog(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Rejeter
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rejeter le document</DialogTitle>
              <DialogDescription>
                Indiquez la raison du rejet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Raison du rejet</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: Document illisible, informations manquantes..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="flex-1">
                  Annuler
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => updateDocumentStatus(selectedDoc?.id, 'rejected', rejectionReason)}
                  className="flex-1"
                  disabled={!rejectionReason}
                >
                  Rejeter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
