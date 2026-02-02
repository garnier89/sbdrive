import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  FileText, CheckCircle, XCircle, Clock, User, Mail, 
  Search, Eye, Loader2, Shield, AlertTriangle, Download
} from 'lucide-react';
import axios from 'axios';

export default function AdminKYCPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchDocuments();
  }, [activeTab]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'pending' 
        ? `${API}/documents/admin/pending`
        : `${API}/documents/admin/all?status=${activeTab}`;
      
      const res = await axios.get(endpoint);
      setDocuments(res.data.documents || []);
      
      // Fetch stats
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        axios.get(`${API}/documents/admin/all?status=pending&limit=1`),
        axios.get(`${API}/documents/admin/all?status=approved&limit=1`),
        axios.get(`${API}/documents/admin/all?status=rejected&limit=1`)
      ]);
      
      setStats({
        pending: pendingRes.data.total || 0,
        approved: approvedRes.data.total || 0,
        rejected: rejectedRes.data.total || 0
      });
    } catch (error) {
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const res = await axios.get(`${API}/documents/${doc.id}`);
      setSelectedDoc(res.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Erreur lors du chargement du document');
    }
  };

  const handleReviewDocument = async (action) => {
    if (!selectedDoc) return;
    
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Veuillez indiquer la raison du rejet');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/documents/admin/review`, {
        document_id: selectedDoc.id,
        action: action,
        reason: action === 'reject' ? rejectReason : undefined
      });
      
      toast.success(action === 'approve' ? 'Document approuvé' : 'Document rejeté');
      setViewDialogOpen(false);
      setSelectedDoc(null);
      setRejectReason('');
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du traitement');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
    }
  };

  const getDocTypeLabel = (type) => {
    const labels = {
      'id_card': "Pièce d'identité",
      'passport': "Passeport",
      'driving_license': "Permis de conduire",
      'proof_of_address': "Justificatif de domicile",
      'selfie': "Photo selfie"
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="admin-kyc-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-['Manrope'] flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Vérification KYC
          </h1>
          <p className="text-muted-foreground">
            Gérer les documents d'identité des utilisateurs
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">En attente</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Approuvés</p>
                  <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Rejetés</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Documents soumis</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  En attente ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Approuvés
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Rejetés
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun document {activeTab === 'pending' ? 'en attente' : ''}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{getDocTypeLabel(doc.type)}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{doc.user_name || 'Utilisateur'}</span>
                              <span>•</span>
                              <Mail className="w-3 h-3" />
                              <span>{doc.user_email}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Soumis le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(doc.status)}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            data-testid={`view-doc-${doc.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Examiner
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* View Document Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Examen du document
              </DialogTitle>
              <DialogDescription>
                Vérifiez le document et approuvez ou rejetez la demande
              </DialogDescription>
            </DialogHeader>
            
            {selectedDoc && (
              <div className="space-y-4">
                {/* Document Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{getDocTypeLabel(selectedDoc.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    {getStatusBadge(selectedDoc.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fichier</p>
                    <p className="font-medium">{selectedDoc.original_filename}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taille</p>
                    <p className="font-medium">{(selectedDoc.file_size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                {/* Document Preview */}
                {selectedDoc.file_data && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2">Aperçu du document</p>
                    {selectedDoc.content_type?.startsWith('image/') ? (
                      <img 
                        src={`data:${selectedDoc.content_type};base64,${selectedDoc.file_data}`}
                        alt="Document"
                        className="max-h-96 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p>Document PDF - Télécharger pour visualiser</p>
                        <Button 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `data:${selectedDoc.content_type};base64,${selectedDoc.file_data}`;
                            link.download = selectedDoc.original_filename;
                            link.click();
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Reject Reason */}
                {selectedDoc.status === 'pending' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Raison du rejet (si applicable)</p>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex: Document illisible, date expirée, ne correspond pas au nom..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {selectedDoc?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReviewDocument('reject')}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Rejeter
                  </Button>
                  <Button
                    onClick={() => handleReviewDocument('approve')}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Approuver
                  </Button>
                </>
              )}
              {selectedDoc?.status !== 'pending' && (
                <Button onClick={() => setViewDialogOpen(false)}>
                  Fermer
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
