import React, { useState, useEffect } from 'react';
import { useAuth, useLanguage, API } from '@/App';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Building2, Plus, Trash2, Star, CheckCircle, Clock, 
  AlertCircle, Loader2, ArrowRight, Send
} from 'lucide-react';
import axios from 'axios';

export default function BankAccountsPage() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [wallets, setWallets] = useState([]);
  
  const [newAccount, setNewAccount] = useState({
    account_holder_name: '',
    iban: '',
    account_number: '',
    swift_bic: '',
    bank_name: '',
    bank_country: '',
    currency: 'EUR',
    is_default: false
  });
  
  const [transferData, setTransferData] = useState({
    amount: '',
    currency: 'EUR',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsRes, banksRes, countriesRes, walletsRes] = await Promise.all([
        axios.get(`${API}/bank-accounts`),
        axios.get(`${API}/banks`),
        axios.get(`${API}/banks/countries`),
        axios.get(`${API}/wallets`)
      ]);
      setAccounts(accountsRes.data.accounts);
      setBanks(banksRes.data.banks);
      setCountries(countriesRes.data.countries);
      setWallets(walletsRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.bank_name || !newAccount.account_holder_name || (!newAccount.iban && !newAccount.account_number)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await axios.post(`${API}/bank-accounts`, newAccount);
      toast.success('Compte bancaire ajouté');
      setShowAddDialog(false);
      setNewAccount({
        account_holder_name: '',
        iban: '',
        account_number: '',
        swift_bic: '',
        bank_name: '',
        bank_country: '',
        currency: 'EUR',
        is_default: false
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!confirm('Supprimer ce compte bancaire?')) return;
    
    try {
      await axios.delete(`${API}/bank-accounts/${accountId}`);
      toast.success('Compte supprimé');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSetDefault = async (accountId) => {
    try {
      await axios.post(`${API}/bank-accounts/${accountId}/set-default`);
      toast.success('Compte par défaut défini');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleBankTransfer = async () => {
    if (!selectedAccount || !transferData.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await axios.post(`${API}/bank-transfers`, {
        bank_account_id: selectedAccount.id,
        amount: parseFloat(transferData.amount),
        currency: transferData.currency,
        description: transferData.description
      });
      
      toast.success(`Virement initié! Frais: ${response.data.fees} ${transferData.currency}`);
      setShowTransferDialog(false);
      setTransferData({ amount: '', currency: 'EUR', description: '' });
      setSelectedAccount(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    }
  };

  const filteredBanks = newAccount.bank_country 
    ? banks.filter(b => b.country === newAccount.bank_country)
    : banks;

  const selectedWallet = wallets.find(w => w.currency === transferData.currency);

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
      <div className="p-6 lg:p-8 space-y-6" data-testid="bank-accounts-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-['Manrope'] text-foreground">
              Comptes Bancaires
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos comptes bancaires liés
            </p>
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="add-bank-account-btn">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un compte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ajouter un compte bancaire</DialogTitle>
                <DialogDescription>
                  Liez un nouveau compte pour les virements
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Pays de la banque</Label>
                  <Select 
                    value={newAccount.bank_country} 
                    onValueChange={(v) => setNewAccount({...newAccount, bank_country: v, bank_name: '', swift_bic: ''})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Banque</Label>
                  <Select 
                    value={newAccount.bank_name} 
                    onValueChange={(v) => {
                      const bank = banks.find(b => b.name === v);
                      setNewAccount({
                        ...newAccount, 
                        bank_name: v,
                        swift_bic: bank?.swift || '',
                        currency: bank?.currency || 'EUR'
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une banque" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBanks.map(b => (
                        <SelectItem key={b.name} value={b.name}>
                          {b.name} ({b.swift})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Titulaire du compte *</Label>
                  <Input
                    value={newAccount.account_holder_name}
                    onChange={(e) => setNewAccount({...newAccount, account_holder_name: e.target.value})}
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={newAccount.iban}
                    onChange={(e) => setNewAccount({...newAccount, iban: e.target.value.toUpperCase()})}
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>N° de compte (si pas d'IBAN)</Label>
                    <Input
                      value={newAccount.account_number}
                      onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code SWIFT/BIC</Label>
                    <Input
                      value={newAccount.swift_bic}
                      onChange={(e) => setNewAccount({...newAccount, swift_bic: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>

                <Button onClick={handleAddAccount} className="w-full">
                  Ajouter le compte
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucun compte bancaire</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez un compte bancaire pour effectuer des virements
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un compte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => (
              <Card key={account.id} className="hover-lift" data-testid={`bank-account-${account.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{account.bank_name}</h3>
                          {account.is_default && (
                            <Badge className="bg-primary">
                              <Star className="w-3 h-3 mr-1" />
                              Par défaut
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className={
                              account.verification_status === 'verified' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }
                          >
                            {account.verification_status === 'verified' ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Vérifié</>
                            ) : (
                              <><Clock className="w-3 h-3 mr-1" /> En attente</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {account.account_holder_name}
                        </p>
                        <p className="text-sm font-mono mt-1">
                          {account.iban || account.account_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SWIFT: {account.swift_bic} • {account.currency}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {account.verification_status === 'verified' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAccount(account);
                            setTransferData({...transferData, currency: account.currency});
                            setShowTransferDialog(true);
                          }}
                          data-testid={`transfer-to-${account.id}`}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Virement
                        </Button>
                      )}
                      {!account.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefault(account.id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteAccount(account.id)}
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

        {/* Bank Transfer Dialog */}
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Virement bancaire</DialogTitle>
              <DialogDescription>
                Transférer des fonds vers {selectedAccount?.bank_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Compte destination</p>
                <p className="font-semibold">{selectedAccount?.account_holder_name}</p>
                <p className="text-sm font-mono">{selectedAccount?.iban || selectedAccount?.account_number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select 
                    value={transferData.currency} 
                    onValueChange={(v) => setTransferData({...transferData, currency: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.map(w => (
                        <SelectItem key={w.currency} value={w.currency}>
                          {w.currency} ({w.balance.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedWallet && (
                <p className="text-sm text-muted-foreground">
                  Solde disponible: {selectedWallet.balance.toFixed(2)} {selectedWallet.currency}
                </p>
              )}

              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Input
                  value={transferData.description}
                  onChange={(e) => setTransferData({...transferData, description: e.target.value})}
                  placeholder="Motif du virement"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">Frais de virement</p>
                  <p className="text-yellow-600 dark:text-yellow-500">
                    Des frais de 1% seront appliqués. Délai: 1-3 jours ouvrés.
                  </p>
                </div>
              </div>

              <Button onClick={handleBankTransfer} className="w-full">
                <ArrowRight className="w-4 h-4 mr-2" />
                Effectuer le virement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
