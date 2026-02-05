import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Banknote, CheckCircle } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

export default function PricingPage() {
  const pricingCategories = [
    {
      title: "Transferts entre utilisateurs SBPAYGO",
      items: [
        { service: "Transfert instant", fee: "Gratuit", note: "Entre comptes SBPAYGO" },
        { service: "Demande d'argent", fee: "Gratuit", note: "" },
      ]
    },
    {
      title: "Mobile Money",
      items: [
        { service: "Dépôt via Mobile Money", fee: "1%", note: "Min. 100 XOF" },
        { service: "Retrait vers Mobile Money", fee: "1.5%", note: "Min. 150 XOF" },
        { service: "Transfert inter-opérateurs", fee: "2%", note: "Ex: Wave → Orange Money" },
      ]
    },
    {
      title: "Cartes bancaires",
      items: [
        { service: "Dépôt par carte", fee: "2.5%", note: "Visa, Mastercard" },
        { service: "Retrait vers carte", fee: "1.5% + 2€", note: "Délai: 1-3 jours" },
      ]
    },
    {
      title: "Virements bancaires",
      items: [
        { service: "Dépôt par virement", fee: "Gratuit", note: "SEPA, SWIFT" },
        { service: "Retrait vers compte bancaire", fee: "0.5% + 1€", note: "Min. 1€, Max. 15€" },
        { service: "Transfert international", fee: "3% + 3€", note: "Hors zone SEPA" },
      ]
    },
    {
      title: "Cartes virtuelles SBPAYGO",
      items: [
        { service: "Création de carte", fee: "500 XOF / 0.75€", note: "Par carte" },
        { service: "Paiement en ligne", fee: "Gratuit", note: "" },
        { service: "Recharge de carte", fee: "Gratuit", note: "Depuis portefeuille SBPAYGO" },
      ]
    },
    {
      title: "Paiements & Services",
      items: [
        { service: "Paiement de factures", fee: "1%", note: "Électricité, eau, internet..." },
        { service: "Recharge téléphonique", fee: "0.5%", note: "Selon opérateur" },
        { service: "Paiement QR Code", fee: "Gratuit", note: "Chez les marchands partenaires" },
      ]
    },
    {
      title: "Coffre-fort",
      items: [
        { service: "Dépôt dans le coffre", fee: "Gratuit", note: "" },
        { service: "Retrait du coffre", fee: "Gratuit", note: "Vers portefeuille principal" },
      ]
    },
    {
      title: "Agents partenaires",
      items: [
        { service: "Dépôt en espèces (agent)", fee: "1%", note: "Variable selon l'agent" },
        { service: "Retrait en espèces (agent)", fee: "1.5%", note: "Variable selon l'agent" },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
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
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-4">
            <Banknote className="w-5 h-5 text-orange-600" />
            <span className="text-orange-600 text-sm font-medium">Tarification transparente</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Tarifs & Commissions</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Chez SBPAYGO, nous croyons en la transparence. Voici nos tarifs clairs et compétitifs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {pricingCategories.map((category, idx) => (
            <Card key={idx} className="bg-white border-slate-200">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-lg text-slate-800">{category.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    {category.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.service}</div>
                          {item.note && <div className="text-xs text-slate-500">{item.note}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${item.fee === 'Gratuit' ? 'text-green-600' : 'text-orange-600'}`}>
                            {item.fee}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Notes importantes</h2>
          <ul className="space-y-3">
            {[
              "Les frais affichés sont indicatifs et peuvent varier selon le pays et la devise.",
              "Des frais de change peuvent s'appliquer pour les transactions en devise étrangère.",
              "Les limites de transaction dépendent de votre niveau de vérification KYC.",
              "Les tarifs des agents partenaires peuvent varier selon leur localisation.",
              "SBPAYGO se réserve le droit de modifier ses tarifs avec un préavis de 30 jours.",
              "Pour les entreprises, des tarifs spécifiques peuvent être négociés."
            ].map((note, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">{note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="text-center mt-12">
          <p className="text-slate-600 mb-4">Des questions sur nos tarifs ?</p>
          <Link to="/">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              Contactez-nous
            </Button>
          </Link>
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
