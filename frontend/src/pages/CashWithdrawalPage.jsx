import React, { useState } from 'react';
import { useAuth, API } from '@/App';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Store, QrCode, ArrowDownLeft, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function CashWithdrawalPage() {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrData = JSON.stringify({
    type: 'sbpay_withdrawal',
    user_id: user?.id,
    name: user?.full_name,
    timestamp: new Date().toISOString()
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(user?.id || '');
    setCopied(true);
    toast.success('ID copié!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshQR = () => {
    setShowQR(false);
    setTimeout(() => setShowQR(true), 100);
    toast.success('QR code actualisé');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Retrait Cash</h1>
          <p className="text-muted-foreground mt-2">
            Retirez de l'argent chez un agent partenaire SB Pay
          </p>
        </div>

        {/* Instructions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-green-500" />
              Comment ça marche?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <p className="font-medium text-foreground">Trouvez un agent partenaire</p>
                  <p className="text-sm text-muted-foreground">
                    Rendez-vous chez un point de retrait SB Pay près de chez vous
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <p className="font-medium text-foreground">Montrez votre QR code ou ID</p>
                  <p className="text-sm text-muted-foreground">
                    L'agent scannera votre QR code ou entrera votre numéro de téléphone
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <p className="font-medium text-foreground">Confirmez avec le code OTP</p>
                  <p className="text-sm text-muted-foreground">
                    Vous recevrez un code SMS à communiquer à l'agent pour confirmer
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <div>
                  <p className="font-medium text-foreground">Recevez votre argent</p>
                  <p className="text-sm text-muted-foreground">
                    L'agent vous remet l'argent en espèces après confirmation
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* QR Code Section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Mon QR Code de Retrait
            </CardTitle>
            <CardDescription>
              Présentez ce code à l'agent pour effectuer votre retrait
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showQR ? (
              <div className="text-center">
                <div className="inline-block p-4 bg-white rounded-xl">
                  <QRCodeSVG 
                    value={qrData}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Ce QR code est valide pour une utilisation unique
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshQR}
                  className="mt-2"
                  data-testid="refresh-qr-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser le QR code
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Button 
                  onClick={() => setShowQR(true)}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="show-qr-btn"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Afficher mon QR Code
                </Button>
              </div>
            )}

            {/* Alternative: User ID */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Ou donnez votre numéro de téléphone à l'agent:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-sm">
                  {user?.phone || user?.email || 'Non configuré'}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyId}
                  data-testid="copy-id-btn"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Store className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Trouver un agent</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les agents partenaires SB Pay sont disponibles dans les boutiques, 
                  tabacs et points de vente affichant le logo SB Pay.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
