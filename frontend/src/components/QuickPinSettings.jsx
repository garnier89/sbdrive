import React, { useState, useEffect } from 'react';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Fingerprint, Loader2, Eye, EyeOff, Shield, Clock, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const DEVICE_TOKEN_KEY = 'sbpaygo_device_token';

export default function QuickPinSettings() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form states
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/auth/quick-pin/status`);
      setStatus(res.data);
    } catch (error) {
      setStatus({ enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      toast.error('Le PIN doit contenir 4 à 6 chiffres');
      return;
    }
    
    if (pin !== confirmPin) {
      toast.error('Les PIN ne correspondent pas');
      return;
    }
    
    if (!password) {
      toast.error('Mot de passe requis');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await axios.post(`${API}/auth/quick-pin/setup`, {
        pin: pin,
        password: password
      });
      
      // Store device token securely
      localStorage.setItem(DEVICE_TOKEN_KEY, res.data.device_token);
      
      toast.success('PIN rapide activé! Vous pouvez maintenant vous connecter rapidement.');
      setShowSetupDialog(false);
      resetForms();
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      toast.error('Le PIN doit contenir 4 à 6 chiffres');
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/auth/quick-pin/change`, {
        current_pin: currentPin,
        new_pin: newPin
      });
      
      toast.success('PIN modifié avec succès');
      setShowChangeDialog(false);
      resetForms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisablePin = async () => {
    setProcessing(true);
    try {
      await axios.post(`${API}/auth/quick-pin/disable`, {
        pin: pin
      });
      
      // Remove device token
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      
      toast.success('PIN rapide désactivé');
      setShowDisableDialog(false);
      resetForms();
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const resetForms = () => {
    setPassword('');
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setNewPin('');
  };

  const PinInput = ({ value, onChange, placeholder = "••••••" }) => (
    <div className="relative">
      <Input
        type={showPin ? "text" : "password"}
        maxLength={6}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="text-center text-xl tracking-[0.3em] font-mono pr-10"
      />
      <button
        type="button"
        onClick={() => setShowPin(!showPin)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="quick-pin-settings">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Connexion Rapide par PIN</CardTitle>
                <CardDescription>
                  Connectez-vous rapidement avec un code PIN à 4-6 chiffres
                </CardDescription>
              </div>
            </div>
            {status?.enabled && (
              <Badge className="bg-green-100 text-green-800">Activé</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.enabled ? (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">PIN rapide activé</span>
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expire le {new Date(status.expires_at).toLocaleDateString('fr-FR')}
                  </p>
                  {status.last_used && (
                    <p>Dernière utilisation: {new Date(status.last_used).toLocaleString('fr-FR')}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowChangeDialog(true)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Changer le PIN
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDisableDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Désactiver
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Avantages du PIN rapide :</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Connexion en quelques secondes</li>
                  <li>✓ Plus besoin de taper votre email et mot de passe</li>
                  <li>✓ Sécurisé avec verrouillage après 5 tentatives</li>
                  <li>✓ Fonctionne sur cet appareil uniquement</li>
                </ul>
              </div>
              
              <Button 
                className="w-full"
                onClick={() => setShowSetupDialog(true)}
                data-testid="setup-pin-btn"
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Activer le PIN rapide
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup PIN Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5" />
              Configurer le PIN rapide
            </DialogTitle>
            <DialogDescription>
              Choisissez un code PIN à 4-6 chiffres pour vous connecter rapidement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mot de passe actuel (vérification)</Label>
              <Input
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nouveau PIN (4-6 chiffres)</Label>
              <PinInput value={pin} onChange={setPin} />
            </div>
            <div className="space-y-2">
              <Label>Confirmer le PIN</Label>
              <PinInput value={confirmPin} onChange={setConfirmPin} />
            </div>
            {pin && confirmPin && pin !== confirmPin && (
              <p className="text-sm text-destructive">Les PIN ne correspondent pas</p>
            )}
            
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Ce PIN sera lié à cet appareil uniquement. Mémorisez-le bien!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSetupDialog(false); resetForms(); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleSetupPin}
              disabled={processing || pin.length < 4 || pin !== confirmPin || !password}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change PIN Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>PIN actuel</Label>
              <PinInput value={currentPin} onChange={setCurrentPin} />
            </div>
            <div className="space-y-2">
              <Label>Nouveau PIN</Label>
              <PinInput value={newPin} onChange={setNewPin} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowChangeDialog(false); resetForms(); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleChangePin}
              disabled={processing || currentPin.length < 4 || newPin.length < 4}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable PIN Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Désactiver le PIN rapide</DialogTitle>
            <DialogDescription>
              Vous devrez utiliser votre email et mot de passe pour vous connecter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Entrez votre PIN pour confirmer</Label>
              <PinInput value={pin} onChange={setPin} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDisableDialog(false); resetForms(); }}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisablePin}
              disabled={processing || pin.length < 4}
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
