import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  QrCode, Scan, Download, Share2, Copy, CheckCircle, 
  Wallet, ArrowRight, RefreshCw, Camera
} from 'lucide-react';
import axios from 'axios';

const CURRENCY_SYMBOLS = { EUR: '€', USD: '$', XOF: 'CFA', GBP: '£', MAD: 'DH', NGN: '₦' };
const LOGO_URL = "https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png";

export default function QRPaymentPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('receive');
  const [currencies, setCurrencies] = useState([]);
  const [wallets, setWallets] = useState([]);
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);
  
  // Receive QR State
  const [receiveData, setReceiveData] = useState({
    amount: '',
    currency: 'EUR',
    description: ''
  });
  const [generatedQR, setGeneratedQR] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Scan QR State
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchCurrencies();
    fetchWallets();
    
    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear();
      }
    };
  }, []);

  const fetchCurrencies = async () => {
    try {
      const res = await axios.get(`${API}/currencies`);
      setCurrencies(res.data.currencies || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await axios.get(`${API}/wallets`);
      setWallets(res.data || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const generateQRCode = async () => {
    if (!receiveData.amount || parseFloat(receiveData.amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    setQrLoading(true);
    try {
      const res = await axios.post(`${API}/qr/generate`, {
        amount: parseFloat(receiveData.amount),
        currency: receiveData.currency,
        description: receiveData.description
      });
      
      setGeneratedQR(res.data);
      toast.success('QR Code généré !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la génération');
    } finally {
      setQrLoading(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    
    setTimeout(() => {
      if (scannerRef.current && !html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        
        html5QrcodeScannerRef.current.render(onScanSuccess, onScanError);
      }
    }, 100);
  };

  const stopScanning = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
      html5QrcodeScannerRef.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    stopScanning();
    
    try {
      // Parse QR data
      const qrData = JSON.parse(decodedText);
      
      if (qrData.type === 'sbpaygo_payment') {
        // Fetch QR details from backend
        const res = await axios.get(`${API}/qr/${qrData.code}`);
        setScannedData(res.data);
        setShowPayDialog(true);
      } else {
        toast.error('QR Code non reconnu');
      }
    } catch (error) {
      toast.error('QR Code invalide');
    }
  };

  const onScanError = (error) => {
    // Ignore scan errors (normal when no QR in view)
  };

  const handlePayQR = async () => {
    if (!scannedData) return;
    
    const wallet = wallets.find(w => w.currency === scannedData.currency);
    if (!wallet || wallet.balance < scannedData.amount) {
      toast.error('Solde insuffisant');
      return;
    }

    setPaying(true);
    try {
      await axios.post(`${API}/qr/${scannedData.code}/pay`);
      toast.success('Paiement effectué !');
      setShowPayDialog(false);
      setScannedData(null);
      fetchWallets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
    } finally {
      setPaying(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `sbpaygo-qr-${generatedQR?.code || 'code'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareQR = async () => {
    if (!generatedQR) return;
    
    const shareData = {
      title: 'Paiement SBPAYGO',
      text: `Payez ${receiveData.amount} ${receiveData.currency} via SBPAYGO`,
      url: `${window.location.origin}/pay/qr/${generatedQR.code}`
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast.success('Lien copié !');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="qr-payment-page">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
            Paiement QR Code
          </h1>
          <p className="text-muted-foreground mt-1">
            Recevez ou envoyez de l'argent instantanément avec un QR Code
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="receive" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              Recevoir
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Scanner
            </TabsTrigger>
          </TabsList>

          {/* Receive Tab */}
          <TabsContent value="receive" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Generate Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Générer un QR Code</CardTitle>
                  <CardDescription>
                    Créez un QR Code pour recevoir un paiement
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Montant</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={receiveData.amount}
                        onChange={(e) => setReceiveData({...receiveData, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Devise</Label>
                      <Select
                        value={receiveData.currency}
                        onValueChange={(v) => setReceiveData({...receiveData, currency: v})}
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
                    <Label>Description (optionnel)</Label>
                    <Input
                      value={receiveData.description}
                      onChange={(e) => setReceiveData({...receiveData, description: e.target.value})}
                      placeholder="Ex: Remboursement dîner"
                    />
                  </div>

                  <Button 
                    onClick={generateQRCode} 
                    className="w-full" 
                    disabled={qrLoading}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {qrLoading ? 'Génération...' : 'Générer le QR Code'}
                  </Button>
                </CardContent>
              </Card>

              {/* QR Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Votre QR Code</CardTitle>
                  <CardDescription>
                    Montrez ce code pour recevoir le paiement
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {generatedQR ? (
                    <>
                      <div className="bg-white p-4 rounded-xl shadow-lg">
                        <QRCodeSVG
                          id="qr-code-svg"
                          value={JSON.stringify({
                            type: 'sbpaygo_payment',
                            code: generatedQR.code,
                            amount: parseFloat(receiveData.amount),
                            currency: receiveData.currency
                          })}
                          size={200}
                          level="H"
                          includeMargin={true}
                          imageSettings={{
                            src: LOGO_URL,
                            x: undefined,
                            y: undefined,
                            height: 40,
                            width: 40,
                            excavate: true,
                          }}
                        />
                      </div>
                      
                      <div className="mt-4 text-center">
                        <p className="text-2xl font-bold text-primary">
                          {CURRENCY_SYMBOLS[receiveData.currency]} {parseFloat(receiveData.amount).toLocaleString()}
                        </p>
                        {receiveData.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {receiveData.description}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-2">
                          Code: {generatedQR.code}
                        </Badge>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={downloadQR}>
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger
                        </Button>
                        <Button variant="outline" size="sm" onClick={shareQR}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Partager
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/pay/qr/${generatedQR.code}`);
                            toast.success('Lien copié !');
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copier
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <QrCode className="w-24 h-24 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        Entrez un montant et générez votre QR Code
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scan Tab */}
          <TabsContent value="scan" className="mt-6">
            <Card className="max-w-lg mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="w-5 h-5" />
                  Scanner un QR Code
                </CardTitle>
                <CardDescription>
                  Scannez le QR Code pour effectuer un paiement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!scanning ? (
                  <div className="text-center py-8">
                    <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Activez la caméra pour scanner un QR Code
                    </p>
                    <Button onClick={startScanning}>
                      <Camera className="w-4 h-4 mr-2" />
                      Activer la caméra
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div 
                      id="qr-reader" 
                      ref={scannerRef}
                      className="w-full rounded-lg overflow-hidden"
                    />
                    <Button variant="outline" onClick={stopScanning} className="w-full">
                      Arrêter le scan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Pay Dialog */}
        <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer le paiement</DialogTitle>
              <DialogDescription>
                Vérifiez les détails avant de payer
              </DialogDescription>
            </DialogHeader>
            
            {scannedData && (
              <div className="space-y-4 mt-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-primary">
                    {CURRENCY_SYMBOLS[scannedData.currency]} {scannedData.amount.toLocaleString()}
                  </p>
                  {scannedData.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {scannedData.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Destinataire</span>
                  <span className="font-medium">{scannedData.recipient_email}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Votre solde</span>
                  <span className={`font-medium ${
                    (wallets.find(w => w.currency === scannedData.currency)?.balance || 0) >= scannedData.amount 
                      ? 'text-green-600' 
                      : 'text-red-500'
                  }`}>
                    {CURRENCY_SYMBOLS[scannedData.currency]} {(wallets.find(w => w.currency === scannedData.currency)?.balance || 0).toLocaleString()}
                  </span>
                </div>

                <Button 
                  onClick={handlePayQR} 
                  className="w-full" 
                  size="lg"
                  disabled={paying || (wallets.find(w => w.currency === scannedData.currency)?.balance || 0) < scannedData.amount}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {paying ? 'Paiement...' : 'Confirmer le paiement'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
