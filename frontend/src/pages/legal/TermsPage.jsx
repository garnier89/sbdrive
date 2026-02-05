import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

export default function TermsPage() {
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
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Conditions Générales d'Utilisation</h1>
              <p className="text-slate-500 text-sm">Dernière mise à jour : Février 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <h2>1. Objet</h2>
            <p>
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme SBPAYGO, 
              accessible via le site web sbpaygo.com et les applications mobiles associées.
            </p>
            <p>
              SBPAYGO est une plateforme de services financiers numériques permettant les transferts d'argent, 
              la gestion de portefeuilles électroniques, les paiements et autres services financiers.
            </p>

            <h2>2. Acceptation des conditions</h2>
            <p>
              En créant un compte ou en utilisant nos services, vous acceptez d'être lié par ces CGU. 
              Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser nos services.
            </p>

            <h2>3. Inscription et compte utilisateur</h2>
            <h3>3.1 Éligibilité</h3>
            <p>Pour utiliser SBPAYGO, vous devez :</p>
            <ul>
              <li>Avoir au moins 18 ans</li>
              <li>Être capable juridiquement de conclure un contrat</li>
              <li>Fournir des informations exactes et complètes</li>
              <li>Ne pas avoir été précédemment suspendu ou exclu de nos services</li>
            </ul>

            <h3>3.2 Vérification d'identité (KYC)</h3>
            <p>
              Conformément aux réglementations anti-blanchiment, nous procédons à une vérification d'identité 
              de tous nos utilisateurs. Vous devez fournir les documents demandés dans les délais impartis.
            </p>

            <h3>3.3 Sécurité du compte</h3>
            <p>
              Vous êtes responsable de la confidentialité de vos identifiants de connexion. 
              Toute activité réalisée depuis votre compte est de votre responsabilité.
            </p>

            <h2>4. Services proposés</h2>
            <p>SBPAYGO propose les services suivants :</p>
            <ul>
              <li>Transferts d'argent nationaux et internationaux</li>
              <li>Portefeuille électronique multi-devises</li>
              <li>Cartes virtuelles prépayées</li>
              <li>Paiement de factures</li>
              <li>Recharges téléphoniques</li>
              <li>Coffre-fort sécurisé</li>
              <li>Intégration Mobile Money</li>
            </ul>

            <h2>5. Tarifs et frais</h2>
            <p>
              Les frais applicables à chaque service sont détaillés dans notre grille tarifaire, 
              accessible sur la page "Tarifs & Commissions". SBPAYGO se réserve le droit de modifier 
              ses tarifs avec un préavis de 30 jours.
            </p>

            <h2>6. Limites de transaction</h2>
            <p>
              Des limites de transaction s'appliquent en fonction de votre niveau de vérification. 
              Ces limites sont visibles dans les paramètres de votre compte.
            </p>

            <h2>7. Responsabilités de l'utilisateur</h2>
            <p>Vous vous engagez à :</p>
            <ul>
              <li>Utiliser nos services conformément à la loi</li>
              <li>Ne pas utiliser notre plateforme pour des activités illégales</li>
              <li>Maintenir vos informations à jour</li>
              <li>Signaler toute activité suspecte sur votre compte</li>
            </ul>

            <h2>8. Interdictions</h2>
            <p>Il est strictement interdit de :</p>
            <ul>
              <li>Créer plusieurs comptes</li>
              <li>Utiliser les services pour le blanchiment d'argent</li>
              <li>Effectuer des transactions frauduleuses</li>
              <li>Contourner les systèmes de sécurité</li>
            </ul>

            <h2>9. Suspension et résiliation</h2>
            <p>
              SBPAYGO peut suspendre ou résilier votre compte en cas de violation des présentes CGU, 
              d'activité suspecte ou frauduleuse, ou pour se conformer à une obligation légale.
            </p>

            <h2>10. Protection des données</h2>
            <p>
              Vos données personnelles sont traitées conformément à notre Politique de Confidentialité. 
              En utilisant nos services, vous consentez à ce traitement.
            </p>

            <h2>11. Propriété intellectuelle</h2>
            <p>
              Tous les éléments de la plateforme SBPAYGO (logo, marque, contenu, interface) 
              sont protégés par le droit de la propriété intellectuelle.
            </p>

            <h2>12. Limitation de responsabilité</h2>
            <p>
              SBPAYGO ne peut être tenu responsable des dommages indirects résultant de l'utilisation 
              ou de l'impossibilité d'utiliser nos services, dans les limites autorisées par la loi.
            </p>

            <h2>13. Modification des CGU</h2>
            <p>
              SBPAYGO se réserve le droit de modifier ces CGU. Les utilisateurs seront informés 
              par email ou notification dans l'application au moins 30 jours avant l'entrée en vigueur.
            </p>

            <h2>14. Droit applicable</h2>
            <p>
              Les présentes CGU sont régies par le droit applicable dans le pays d'enregistrement de SBPAYGO. 
              Tout litige sera soumis à la juridiction compétente.
            </p>

            <h2>15. Contact</h2>
            <p>
              Pour toute question relative à ces CGU, vous pouvez nous contacter à :
            </p>
            <ul>
              <li>Email : support@sbpaygo.com</li>
              <li>Téléphone : +33 1 23 45 67 89</li>
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
