import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Landmark, Smartphone, CreditCard, Building, QrCode } from 'lucide-react';

const GLOBAL_REGIONS = [
  {
    id: 'europe',
    name: 'Europe',
    flag: '🇪🇺',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    countries: ['France', 'Allemagne', 'Espagne', 'Italie', 'Belgique', 'UK', 'Suisse'],
    paymentMethods: [
      { name: 'SEPA', icon: Building, desc: 'Virements gratuits' },
      { name: 'Carte bancaire', icon: CreditCard, desc: 'Visa, Mastercard' },
      { name: 'PayPal', icon: Globe, desc: 'Paiement sécurisé' },
    ],
    stats: { countries: 27, currencies: ['EUR', 'GBP', 'CHF'] }
  },
  {
    id: 'america',
    name: 'Amérique',
    flag: '🌎',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    countries: ['États-Unis', 'Canada', 'Brésil', 'Mexique'],
    paymentMethods: [
      { name: 'ACH Transfer', icon: Building, desc: 'Virement bancaire' },
      { name: 'Carte bancaire', icon: CreditCard, desc: 'Credit/Debit' },
      { name: 'PayPal', icon: Globe, desc: 'Express checkout' },
    ],
    stats: { countries: 10, currencies: ['USD', 'CAD', 'BRL'] }
  },
  {
    id: 'asia',
    name: 'Asie',
    flag: '🌏',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    countries: ['Chine', 'Hong Kong', 'Singapour', 'Japon', 'Corée', 'Inde'],
    paymentMethods: [
      { name: 'Alipay 支付宝', icon: QrCode, desc: 'Paiement QR instantané' },
      { name: 'WeChat Pay 微信', icon: Smartphone, desc: 'Super app paiement' },
      { name: 'UnionPay 银联', icon: CreditCard, desc: 'Carte internationale' },
    ],
    stats: { countries: 15, currencies: ['CNY', 'JPY', 'SGD'] }
  },
  {
    id: 'africa',
    name: 'Afrique',
    flag: '🌍',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    countries: ['Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Nigeria', 'Kenya', 'Ghana'],
    paymentMethods: [
      { name: 'Mobile Money', icon: Smartphone, desc: 'Wave, Orange, MTN, M-Pesa' },
      { name: 'Virement bancaire', icon: Building, desc: 'Banques locales' },
      { name: 'Agent partenaire', icon: Landmark, desc: 'Retrait cash' },
    ],
    stats: { countries: 24, currencies: ['XOF', 'XAF', 'NGN', 'KES'] }
  }
];

export default function GlobalRegions() {
  const [activeRegion, setActiveRegion] = useState(null);

  return (
    <div className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-blue-100 border border-orange-200 mb-6">
            <Globe className="w-5 h-5 text-orange-600" />
            <span className="text-slate-700 text-sm font-medium">Couverture Mondiale</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
            Envoyez de l'argent dans le monde entier
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            SBPAYGO connecte 4 continents avec les meilleurs moyens de paiement locaux. 
            Europe, Amérique, Asie et Afrique — tout en une seule plateforme.
          </p>
        </div>

        {/* Region Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {GLOBAL_REGIONS.map((region) => (
            <Card 
              key={region.id}
              className={`${region.bgColor} ${region.borderColor} border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${activeRegion === region.id ? 'ring-2 ring-orange-500 shadow-xl' : ''}`}
              onClick={() => setActiveRegion(activeRegion === region.id ? null : region.id)}
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{region.flag}</span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{region.name}</h3>
                    <p className="text-sm text-slate-500">{region.stats.countries} pays</p>
                  </div>
                </div>

                {/* Countries */}
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-2">Pays populaires :</p>
                  <div className="flex flex-wrap gap-1">
                    {region.countries.slice(0, 4).map((country, idx) => (
                      <span key={idx} className="text-xs bg-white/70 px-2 py-1 rounded-full text-slate-600">
                        {country}
                      </span>
                    ))}
                    {region.countries.length > 4 && (
                      <span className="text-xs bg-white/70 px-2 py-1 rounded-full text-slate-500">
                        +{region.countries.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Moyens de paiement :</p>
                  {region.paymentMethods.map((method, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
                      <method.icon className="w-4 h-4 text-slate-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{method.name}</p>
                        <p className="text-xs text-slate-500 truncate">{method.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Currencies */}
                <div className="mt-4 pt-4 border-t border-white/50">
                  <p className="text-xs text-slate-500">Devises : {region.stats.currencies.join(', ')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-500 mb-4">
            + de <span className="font-bold text-orange-600">70 pays</span> et <span className="font-bold text-orange-600">40 devises</span> disponibles
          </p>
        </div>
      </div>
    </div>
  );
}
