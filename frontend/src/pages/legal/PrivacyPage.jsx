import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

export default function PrivacyPage() {
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
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Politique de Confidentialité</h1>
              <p className="text-slate-500 text-sm">Dernière mise à jour : Février 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <h2>1. Introduction</h2>
            <p>
              SBPAYGO s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité 
              explique comment nous collectons, utilisons, stockons et protégeons vos données personnelles.
            </p>

            <h2>2. Données collectées</h2>
            <h3>2.1 Données d'identification</h3>
            <ul>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Date de naissance</li>
              <li>Adresse postale</li>
              <li>Pièce d'identité (pour la vérification KYC)</li>
            </ul>

            <h3>2.2 Données financières</h3>
            <ul>
              <li>Historique des transactions</li>
              <li>Informations de carte bancaire (tokenisées)</li>
              <li>Comptes Mobile Money liés</li>
              <li>Soldes et mouvements</li>
            </ul>

            <h3>2.3 Données techniques</h3>
            <ul>
              <li>Adresse IP</li>
              <li>Type d'appareil et navigateur</li>
              <li>Données de géolocalisation (avec consentement)</li>
              <li>Cookies et identifiants de session</li>
            </ul>

            <h2>3. Finalités du traitement</h2>
            <p>Nous utilisons vos données pour :</p>
            <ul>
              <li>Fournir nos services de paiement et transfert</li>
              <li>Vérifier votre identité (KYC/AML)</li>
              <li>Prévenir la fraude et sécuriser votre compte</li>
              <li>Améliorer nos services</li>
              <li>Vous contacter concernant votre compte</li>
              <li>Respecter nos obligations légales</li>
            </ul>

            <h2>4. Base légale du traitement</h2>
            <p>Nous traitons vos données sur les bases suivantes :</p>
            <ul>
              <li><strong>Exécution du contrat</strong> : pour fournir nos services</li>
              <li><strong>Obligation légale</strong> : conformité KYC/AML</li>
              <li><strong>Intérêt légitime</strong> : prévention de la fraude, amélioration des services</li>
              <li><strong>Consentement</strong> : pour certaines communications marketing</li>
            </ul>

            <h2>5. Partage des données</h2>
            <p>Vos données peuvent être partagées avec :</p>
            <ul>
              <li>Nos prestataires techniques (hébergement, sécurité)</li>
              <li>Les partenaires de paiement (banques, opérateurs Mobile Money)</li>
              <li>Les autorités compétentes (sur demande légale)</li>
            </ul>
            <p>
              Nous ne vendons jamais vos données personnelles à des tiers.
            </p>

            <h2>6. Sécurité des données</h2>
            <p>Nous protégeons vos données par :</p>
            <ul>
              <li>Chiffrement AES-256 des données sensibles</li>
              <li>Protocole HTTPS pour toutes les communications</li>
              <li>Contrôles d'accès stricts</li>
              <li>Surveillance continue des systèmes</li>
              <li>Audits de sécurité réguliers</li>
            </ul>

            <h2>7. Conservation des données</h2>
            <p>
              Nous conservons vos données pendant la durée de votre utilisation du service, 
              plus une période de conservation légale (généralement 5 à 10 ans selon les réglementations 
              financières applicables).
            </p>

            <h2>8. Vos droits</h2>
            <p>Conformément au RGPD et aux lois applicables, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format lisible</li>
              <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
              <li><strong>Droit de retrait du consentement</strong> : retirer votre consentement à tout moment</li>
            </ul>

            <h2>9. Cookies</h2>
            <p>
              Nous utilisons des cookies pour améliorer votre expérience. Vous pouvez gérer vos préférences 
              de cookies via les paramètres de votre navigateur.
            </p>

            <h2>10. Transferts internationaux</h2>
            <p>
              Vos données peuvent être transférées vers des pays en dehors de votre pays de résidence. 
              Nous nous assurons que ces transferts respectent les garanties appropriées.
            </p>

            <h2>11. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. Nous vous informerons de tout changement significatif 
              par email ou notification dans l'application.
            </p>

            <h2>12. Contact</h2>
            <p>Pour exercer vos droits ou pour toute question :</p>
            <ul>
              <li>Email : privacy@sbpaygo.com</li>
              <li>Adresse : [Adresse du DPO]</li>
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
