import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function DepositSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('checking');
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    if (attempts >= 10) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API}/deposits/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === 'paid' || data.status === 'complete') {
        setStatus('success');
        setPaymentInfo(data);
        toast.success('Dépôt effectué avec succès!');
      } else if (data.status === 'expired') {
        setStatus('expired');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempts < 5) {
        setAttempts(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      } else {
        setStatus('error');
      }
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
              Vérification du paiement...
            </h2>
            <p className="text-muted-foreground mb-6">
              Veuillez patienter pendant que nous confirmons votre dépôt.
            </p>
          </>
        );

      case 'success':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
              Dépôt réussi!
            </h2>
            <p className="text-muted-foreground mb-2">
              Votre compte a été crédité avec succès.
            </p>
            {paymentInfo && (
              <p className="text-2xl font-bold text-primary mb-6">
                +{paymentInfo.amount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {paymentInfo.currency}
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/deposit')}>
                Nouveau dépôt
              </Button>
              <Button onClick={() => navigate('/dashboard')} data-testid="go-dashboard-btn">
                Mon tableau de bord
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        );

      case 'expired':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
              Session expirée
            </h2>
            <p className="text-muted-foreground mb-6">
              La session de paiement a expiré. Veuillez réessayer.
            </p>
            <Button onClick={() => navigate('/deposit')}>
              Réessayer
            </Button>
          </>
        );

      case 'timeout':
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
              Vérification en cours
            </h2>
            <p className="text-muted-foreground mb-6">
              La confirmation prend plus de temps que prévu. 
              Vérifiez votre tableau de bord dans quelques minutes.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Aller au tableau de bord
            </Button>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold font-['Manrope'] mb-2">
              Erreur de paiement
            </h2>
            <p className="text-muted-foreground mb-6">
              Une erreur s'est produite lors de la vérification du paiement.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/deposit')}>
                Réessayer
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Tableau de bord
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-lg mx-auto" data-testid="deposit-success-page">
        <Card>
          <CardContent className="p-8 text-center">
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
