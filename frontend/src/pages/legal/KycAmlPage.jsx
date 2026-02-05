import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BadgeCheck } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

export default function KycAmlPage() {
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
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <BadgeCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Politique KYC/AML</h1>
              <p className="text-slate-500 text-sm">Dernière mise à jour : Février 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <h2>1. Introduction</h2>
            <p>
              SBPAYGO s'engage à respecter les réglementations internationales en matière de lutte contre 
              le blanchiment d'argent (AML - Anti-Money Laundering) et de connaissance du client (KYC - Know Your Customer).
            </p>
            <p>
              Cette politique décrit nos procédures pour prévenir l'utilisation de notre plateforme 
              à des fins de blanchiment d'argent, de financement du terrorisme ou d'autres activités illégales.
            </p>

            <h2>2. Cadre réglementaire</h2>
            <p>Notre politique est conforme aux :</p>
            <ul>
              <li>Recommandations du GAFI (Groupe d'Action Financière)</li>
              <li>Directives européennes anti-blanchiment</li>
              <li>Réglementations locales des pays où nous opérons</li>
              <li>Standards internationaux de l'industrie financière</li>
            </ul>

            <h2>3. Procédure KYC</h2>
            <h3>3.1 Niveau 1 - Vérification de base</h3>
            <p>Requis pour créer un compte :</p>
            <ul>
              <li>Nom complet</li>
              <li>Adresse email vérifiée</li>
              <li>Numéro de téléphone vérifié</li>
              <li>Date de naissance</li>
              <li>Pays de résidence</li>
            </ul>
            <p>Limites : Transactions limitées à 500€/jour</p>

            <h3>3.2 Niveau 2 - Vérification d'identité</h3>
            <p>Documents requis :</p>
            <ul>
              <li>Pièce d'identité valide (CNI, passeport ou permis de conduire)</li>
              <li>Selfie avec la pièce d'identité</li>
            </ul>
            <p>Limites : Transactions jusqu'à 5 000€/jour</p>

            <h3>3.3 Niveau 3 - Vérification avancée</h3>
            <p>Documents supplémentaires :</p>
            <ul>
              <li>Justificatif de domicile de moins de 3 mois</li>
              <li>Justificatif de revenus (si nécessaire)</li>
            </ul>
            <p>Limites : Transactions jusqu'à 50 000€/jour</p>

            <h2>4. Surveillance des transactions</h2>
            <p>Nous surveillons en continu les transactions pour détecter :</p>
            <ul>
              <li>Les montants inhabituellement élevés</li>
              <li>Les schémas de transactions suspects</li>
              <li>Les transferts vers/depuis des pays à risque</li>
              <li>Les tentatives de fractionnement (structuring)</li>
              <li>Les incohérences avec le profil utilisateur</li>
            </ul>

            <h2>5. Personnes politiquement exposées (PPE)</h2>
            <p>
              Nous effectuons une vérification renforcée pour les personnes politiquement exposées, 
              leurs proches et associés. Une documentation supplémentaire et une approbation de la direction 
              peuvent être requises.
            </p>

            <h2>6. Liste des pays restreints</h2>
            <p>
              SBPAYGO n'opère pas dans les pays faisant l'objet de sanctions internationales 
              ou présentant un risque élevé de blanchiment d'argent. La liste est régulièrement mise à jour.
            </p>

            <h2>7. Signalement des activités suspectes</h2>
            <p>
              Conformément à nos obligations légales, nous signalons toute activité suspecte aux autorités 
              compétentes (cellule de renseignement financier). Nous sommes tenus de ne pas informer 
              l'utilisateur concerné de ce signalement.
            </p>

            <h2>8. Conservation des données</h2>
            <p>
              Nous conservons les documents KYC et les enregistrements de transactions pendant une période 
              minimale de 5 ans après la fin de la relation d'affaires, conformément aux exigences réglementaires.
            </p>

            <h2>9. Formation du personnel</h2>
            <p>
              Tous nos employés suivent une formation régulière sur les procédures KYC/AML, 
              la détection des transactions suspectes et les obligations de signalement.
            </p>

            <h2>10. Refus et suspension de compte</h2>
            <p>SBPAYGO se réserve le droit de :</p>
            <ul>
              <li>Refuser l'ouverture d'un compte sans justification</li>
              <li>Demander des informations supplémentaires à tout moment</li>
              <li>Suspendre ou fermer un compte en cas de suspicion</li>
              <li>Geler des fonds sur demande des autorités</li>
            </ul>

            <h2>11. Vos obligations</h2>
            <p>En utilisant SBPAYGO, vous vous engagez à :</p>
            <ul>
              <li>Fournir des informations exactes et complètes</li>
              <li>Mettre à jour vos informations en cas de changement</li>
              <li>Ne pas utiliser notre plateforme pour des activités illégales</li>
              <li>Ne pas tenter de contourner nos contrôles</li>
            </ul>

            <h2>12. Contact</h2>
            <p>Pour toute question relative à notre politique KYC/AML :</p>
            <ul>
              <li>Email : compliance@sbpaygo.com</li>
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
