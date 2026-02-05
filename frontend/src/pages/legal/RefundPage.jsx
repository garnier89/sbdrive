import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-slate-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="SBPAYGO" className="h-8 w-8 rounded-lg" />
            <span className="font-bold text-orange-600">SBPAYGO</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Politique de Remboursement</h1>
              <p className="text-slate-500 text-sm">Dernière mise à jour : Février 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <h2>1. Principes généraux</h2>
            <p>
              SBPAYGO s'engage à traiter toutes les demandes de remboursement de manière équitable et transparente. 
              Cette politique définit les conditions et procédures applicables aux remboursements.
            </p>

            <h2>2. Cas éligibles au remboursement</h2>
            <h3>2.1 Erreurs de transfert</h3>
            <ul>
              <li>Transfert vers un mauvais destinataire (si non encore récupéré)</li>
              <li>Montant incorrect saisi par erreur</li>
              <li>Double facturation technique</li>
            </ul>

            <h3>2.2 Problèmes techniques</h3>
            <ul>
              <li>Transaction échouée mais montant débité</li>
              <li>Service non rendu (recharge non effectuée, facture non payée)</li>
              <li>Erreur système confirmée par nos équipes</li>
            </ul>

            <h3>2.3 Fraude</h3>
            <ul>
              <li>Transaction non autorisée sur votre compte (après investigation)</li>
              <li>Utilisation frauduleuse de votre carte virtuelle</li>
            </ul>

            <h2>3. Cas non éligibles</h2>
            <ul>
              <li>Transactions confirmées et reçues par le bénéficiaire</li>
              <li>Changement d'avis après un transfert réussi</li>
              <li>Litige commercial avec un marchand (à régler directement avec lui)</li>
              <li>Transactions effectuées depuis un compte compromis par négligence de l'utilisateur</li>
            </ul>

            <h2>4. Délais de réclamation</h2>
            <p>Les délais pour soumettre une demande de remboursement sont :</p>
            <ul>
              <li><strong>Transferts P2P</strong> : 24 heures après la transaction</li>
              <li><strong>Mobile Money</strong> : 48 heures après la transaction</li>
              <li><strong>Paiement par carte</strong> : 30 jours après la transaction</li>
              <li><strong>Fraude présumée</strong> : Dès découverte, sans délai maximum</li>
            </ul>

            <h2>5. Procédure de demande</h2>
            <h3>Étape 1 : Soumettre la demande</h3>
            <p>
              Rendez-vous dans l'historique de transactions, sélectionnez la transaction concernée 
              et cliquez sur "Demander un remboursement". Vous pouvez également contacter notre support.
            </p>

            <h3>Étape 2 : Fournir les justificatifs</h3>
            <p>Selon le cas, vous devrez fournir :</p>
            <ul>
              <li>Capture d'écran de la transaction</li>
              <li>Description détaillée du problème</li>
              <li>Preuve de non-réception (si applicable)</li>
            </ul>

            <h3>Étape 3 : Investigation</h3>
            <p>
              Notre équipe examine votre demande sous 5 jours ouvrés. Des informations 
              complémentaires peuvent vous être demandées.
            </p>

            <h3>Étape 4 : Décision</h3>
            <p>
              Vous recevez une notification avec la décision. En cas d'approbation, 
              le remboursement est effectué sous 3 à 10 jours ouvrés selon le mode de paiement original.
            </p>

            <h2>6. Montants remboursés</h2>
            <ul>
              <li><strong>Erreur utilisateur</strong> : Montant principal uniquement (frais non remboursés)</li>
              <li><strong>Erreur technique SBPAYGO</strong> : Montant total incluant les frais</li>
              <li><strong>Fraude confirmée</strong> : Montant total incluant les frais</li>
            </ul>

            <h2>7. Mode de remboursement</h2>
            <p>
              Le remboursement est effectué via le même mode de paiement utilisé pour la transaction originale, 
              sauf impossibilité technique (dans ce cas, crédité sur le portefeuille SBPAYGO).
            </p>

            <h2>8. Délais de traitement</h2>
            <ul>
              <li>Portefeuille SBPAYGO : Instantané</li>
              <li>Mobile Money : 1-3 jours ouvrés</li>
              <li>Carte bancaire : 5-10 jours ouvrés</li>
              <li>Virement bancaire : 3-5 jours ouvrés</li>
            </ul>

            <h2>9. Contestation d'une décision</h2>
            <p>
              Si vous n'êtes pas satisfait de la décision, vous pouvez faire appel dans les 15 jours 
              en envoyant un email à reclamations@sbpaygo.com avec de nouveaux éléments.
            </p>

            <h2>10. Protection contre la fraude</h2>
            <p>
              En cas de suspicion de fraude sur votre compte, signalez-le immédiatement via l'application 
              ou en contactant notre support. Nous bloquerons temporairement votre compte pour le protéger.
            </p>

            <h2>11. Contact</h2>
            <p>Pour toute demande de remboursement ou question :</p>
            <ul>
              <li>Email : support@sbpaygo.com</li>
              <li>Téléphone : +33 1 23 45 67 89</li>
              <li>Chat : Disponible dans l'application</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-400">
          <p>© 2026 SBPAYGO – Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}
