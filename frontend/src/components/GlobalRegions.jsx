import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Landmark, Smartphone, CreditCard, Building, QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Afrique Subsaharienne - 21 pays avec Mobile Money et leurs opérateurs
const AFRICAN_MOBILE_MONEY_COUNTRIES = [
  // Afrique de l'Ouest - Zone UEMOA (XOF)
  { 
    code: "SN", name: "Sénégal", flag: "🇸🇳", currency: "XOF",
    operators: ["Wave", "Orange Money", "Free Money", "E-Money"]
  },
  { 
    code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF",
    operators: ["Wave", "Orange Money", "MTN MoMo", "Moov Money"]
  },
  { 
    code: "ML", name: "Mali", flag: "🇲🇱", currency: "XOF",
    operators: ["Orange Money", "Moov Money", "Sama Money"]
  },
  { 
    code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "XOF",
    operators: ["Orange Money", "Moov Money", "Coris Money"]
  },
  { 
    code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "XOF",
    operators: ["MTN MoMo", "Moov Money", "Celtiis Cash"]
  },
  { 
    code: "TG", name: "Togo", flag: "🇹🇬", currency: "XOF",
    operators: ["T-Money (Togocel)", "Flooz (Moov)"]
  },
  { 
    code: "NE", name: "Niger", flag: "🇳🇪", currency: "XOF",
    operators: ["Airtel Money", "Orange Money", "Moov Money"]
  },
  { 
    code: "GW", name: "Guinée-Bissau", flag: "🇬🇼", currency: "XOF",
    operators: ["Orange Money", "MTN MoMo"]
  },
  // Afrique de l'Ouest - Autres devises
  { 
    code: "GN", name: "Guinée", flag: "🇬🇳", currency: "GNF",
    operators: ["Orange Money", "MTN MoMo", "Cellcom Money"]
  },
  { 
    code: "GH", name: "Ghana", flag: "🇬🇭", currency: "GHS",
    operators: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"]
  },
  { 
    code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN",
    operators: ["OPay", "PalmPay", "Kuda", "Moniepoint", "Paga"]
  },
  { 
    code: "SL", name: "Sierra Leone", flag: "🇸🇱", currency: "SLL",
    operators: ["Orange Money", "Africell Money"]
  },
  { 
    code: "LR", name: "Liberia", flag: "🇱🇷", currency: "LRD",
    operators: ["Orange Money", "Lonestar MTN MoMo"]
  },
  // Afrique Centrale - Zone CEMAC (XAF)
  { 
    code: "CM", name: "Cameroun", flag: "🇨🇲", currency: "XAF",
    operators: ["MTN MoMo", "Orange Money", "Express Union Mobile"]
  },
  { 
    code: "GA", name: "Gabon", flag: "🇬🇦", currency: "XAF",
    operators: ["Airtel Money", "Moov Money"]
  },
  { 
    code: "CG", name: "Congo-Brazzaville", flag: "🇨🇬", currency: "XAF",
    operators: ["MTN MoMo", "Airtel Money"]
  },
  { 
    code: "CD", name: "RD Congo", flag: "🇨🇩", currency: "CDF",
    operators: ["M-Pesa", "Orange Money", "Airtel Money"]
  },
  // Afrique de l'Est
  { 
    code: "KE", name: "Kenya", flag: "🇰🇪", currency: "KES",
    operators: ["M-Pesa (Safaricom)", "Airtel Money", "T-Kash"]
  },
  { 
    code: "TZ", name: "Tanzanie", flag: "🇹🇿", currency: "TZS",
    operators: ["M-Pesa", "Tigo Pesa", "Airtel Money", "Halotel"]
  },
  { 
    code: "UG", name: "Ouganda", flag: "🇺🇬", currency: "UGX",
    operators: ["MTN MoMo", "Airtel Money"]
  },
  { 
    code: "RW", name: "Rwanda", flag: "🇷🇼", currency: "RWF",
    operators: ["MTN MoMo", "Airtel Money"]
  },
  // Afrique Australe
  { 
    code: "ZM", name: "Zambie", flag: "🇿🇲", currency: "ZMW",
    operators: ["MTN MoMo", "Airtel Money", "Zamtel Kwacha"]
  },
  { 
    code: "ZW", name: "Zimbabwe", flag: "🇿🇼", currency: "ZWL",
    operators: ["EcoCash", "OneMoney", "Telecash"]
  },
  { 
    code: "MW", name: "Malawi", flag: "🇲🇼", currency: "MWK",
    operators: ["Airtel Money", "TNM Mpamba"]
  },
];

// Afrique du Nord - Maghreb
const MAGHREB_COUNTRIES = [
  { 
    code: "MA", name: "Maroc", flag: "🇲🇦", currency: "MAD",
    paymentMethods: ["CIH Bank", "Attijariwafa", "BMCE", "Inwi Money", "Orange Money", "Maroc Telecom Pay"],
    banks: ["Attijariwafa Bank", "BMCE Bank", "Banque Populaire", "CIH Bank", "Crédit du Maroc"]
  },
  { 
    code: "DZ", name: "Algérie", flag: "🇩🇿", currency: "DZD",
    paymentMethods: ["CIB (Carte Interbancaire)", "Edahabia (Algérie Poste)", "BaridiMob", "Mobilis", "Djezzy", "Ooredoo"],
    banks: ["BNA", "BEA", "CPA", "BADR", "BDL", "Société Générale Algérie"]
  },
  { 
    code: "TN", name: "Tunisie", flag: "🇹🇳", currency: "TND",
    paymentMethods: ["D17", "Flouci", "Sobflous", "Click to Pay", "MobiFlouss", "Orange Money"],
    banks: ["BIAT", "Amen Bank", "Attijari Bank", "BH Bank", "STB", "UIB"]
  },
  { 
    code: "LY", name: "Libye", flag: "🇱🇾", currency: "LYD",
    paymentMethods: ["Sadad", "MobiCash", "Libyana Cash"],
    banks: ["Central Bank of Libya", "Sahara Bank", "Wahda Bank", "Jumhouria Bank"]
  },
  { 
    code: "MR", name: "Mauritanie", flag: "🇲🇷", currency: "MRU",
    paymentMethods: ["Bankily", "Masrvi", "Sedad", "Mobicash"],
    banks: ["BNM", "BMCI", "Chinguetti Bank", "BIM"]
  },
  { 
    code: "EG", name: "Égypte", flag: "🇪🇬", currency: "EGP",
    paymentMethods: ["Vodafone Cash", "Orange Cash", "Etisalat Cash", "Fawry", "InstaPay", "Meeza"],
    banks: ["NBE", "Banque Misr", "CIB Egypt", "QNB Alahli", "Arab African Bank"]
  },
];

const GLOBAL_REGIONS = [
  {
    id: 'europe',
    name: 'Europe',
    flag: '🇪🇺',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    countries: ['France', 'Allemagne', 'Espagne', 'Italie', 'Belgique', 'Portugal', 'Pays-Bas', 'Suisse', 'UK'],
    paymentMethods: [
      { name: 'SEPA', icon: Building, desc: 'Virements gratuits zone Euro' },
      { name: 'Carte bancaire', icon: CreditCard, desc: 'Visa, Mastercard' },
      { name: 'PayPal', icon: Globe, desc: 'Paiement express' },
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
    countries: ['États-Unis', 'Canada', 'Brésil', 'Mexique', 'Argentine', 'Colombie'],
    paymentMethods: [
      { name: 'ACH Transfer', icon: Building, desc: 'Virement bancaire US' },
      { name: 'Carte bancaire', icon: CreditCard, desc: 'Credit/Debit' },
      { name: 'PayPal', icon: Globe, desc: 'Express checkout' },
    ],
    stats: { countries: 15, currencies: ['USD', 'CAD', 'BRL', 'MXN'] }
  },
  {
    id: 'asia',
    name: 'Asie',
    flag: '🌏',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    countries: ['Chine', 'Hong Kong', 'Singapour', 'Japon', 'Corée du Sud', 'Inde', 'Thaïlande'],
    paymentMethods: [
      { name: 'Alipay 支付宝', icon: QrCode, desc: 'Paiement QR instantané' },
      { name: 'WeChat Pay 微信', icon: Smartphone, desc: 'Super app paiement' },
      { name: 'UnionPay 银联', icon: CreditCard, desc: 'Carte internationale' },
    ],
    stats: { countries: 20, currencies: ['CNY', 'JPY', 'SGD', 'KRW', 'INR'] }
  },
  {
    id: 'maghreb',
    name: 'Maghreb',
    flag: '🏜️',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    countries: MAGHREB_COUNTRIES.map(c => c.name),
    paymentMethods: [
      { name: 'Virement bancaire', icon: Building, desc: 'Banques locales' },
      { name: 'Paiement mobile', icon: Smartphone, desc: 'Flouci, D17, BaridiMob' },
      { name: 'Carte CIB/Edahabia', icon: CreditCard, desc: 'Cartes locales' },
    ],
    stats: { countries: 6, currencies: ['MAD', 'DZD', 'TND', 'EGP', 'LYD'] },
    isNew: true
  },
  {
    id: 'africa',
    name: 'Afrique Subsaharienne',
    flag: '🌍',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    countries: ['Sénégal', 'Côte d\'Ivoire', 'Cameroun', 'Nigeria', 'Kenya', 'Ghana', 'RD Congo'],
    paymentMethods: [
      { name: 'Mobile Money', icon: Smartphone, desc: 'Wave, Orange, MTN, M-Pesa' },
      { name: 'Virement bancaire', icon: Building, desc: 'Banques locales' },
      { name: 'Agent partenaire', icon: Landmark, desc: 'Retrait cash' },
    ],
    stats: { countries: 24, currencies: ['XOF', 'XAF', 'NGN', 'KES', 'GHS'] }
  }
];

export default function GlobalRegions() {
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [showAllCountries, setShowAllCountries] = useState(false);

  const toggleRegion = (regionId) => {
    setExpandedRegion(expandedRegion === regionId ? null : regionId);
  };

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
            SBPAYGO connecte 5 régions avec les meilleurs moyens de paiement locaux. 
            Europe, Amérique, Asie, Maghreb et Afrique Subsaharienne.
          </p>
        </div>

        {/* Region Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {GLOBAL_REGIONS.map((region) => (
            <Card 
              key={region.id}
              className={`${region.bgColor} ${region.borderColor} border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-102 ${expandedRegion === region.id ? 'ring-2 ring-orange-500 shadow-xl' : ''}`}
              onClick={() => toggleRegion(region.id)}
            >
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{region.flag}</span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {region.name}
                        {region.isNew && (
                          <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500">{region.stats.countries} pays</p>
                    </div>
                  </div>
                  {expandedRegion === region.id ? 
                    <ChevronUp className="w-5 h-5 text-slate-400" /> : 
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  }
                </div>

                {/* Payment Methods */}
                <div className="space-y-1.5">
                  {region.paymentMethods.slice(0, 2).map((method, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
                      <method.icon className="w-4 h-4 text-slate-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{method.name}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Currencies */}
                <div className="mt-3 pt-3 border-t border-white/50">
                  <p className="text-[10px] text-slate-500">Devises : {region.stats.currencies.slice(0, 3).join(', ')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expanded Details for Maghreb */}
        {expandedRegion === 'maghreb' && (
          <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 animate-in slide-in-from-top">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              🏜️ Afrique du Nord - Maghreb
              <span className="text-sm font-normal text-slate-500">({MAGHREB_COUNTRIES.length} pays)</span>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MAGHREB_COUNTRIES.map((country) => (
                <div key={country.code} className="bg-white rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{country.flag}</span>
                    <div>
                      <h4 className="font-bold text-slate-800">{country.name}</h4>
                      <p className="text-xs text-slate-500">{country.currency}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Paiements mobiles</p>
                      <div className="flex flex-wrap gap-1">
                        {country.paymentMethods.slice(0, 4).map((method, idx) => (
                          <span key={idx} className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase mb-1">Banques</p>
                      <p className="text-xs text-slate-600">{country.banks.slice(0, 3).join(', ')}...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Details for Africa */}
        {expandedRegion === 'africa' && (
          <div className="mt-8 bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 animate-in slide-in-from-top">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                🌍 Afrique Subsaharienne - Mobile Money
                <span className="text-sm font-normal text-slate-500">({AFRICAN_MOBILE_MONEY_COUNTRIES.length} pays)</span>
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowAllCountries(!showAllCountries); }}
                className="text-orange-600 border-orange-300"
              >
                {showAllCountries ? 'Voir moins' : 'Voir tous les pays'}
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(showAllCountries ? AFRICAN_MOBILE_MONEY_COUNTRIES : AFRICAN_MOBILE_MONEY_COUNTRIES.slice(0, 8)).map((country) => (
                <div key={country.code} className="bg-white rounded-xl p-3 border border-orange-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{country.name}</h4>
                      <p className="text-[10px] text-slate-500">{country.currency}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase mb-1">Opérateurs Mobile Money</p>
                    <div className="flex flex-wrap gap-1">
                      {country.operators.map((op, idx) => (
                        <span key={idx} className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {op}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Money Operators Legend */}
            <div className="mt-6 pt-4 border-t border-orange-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Opérateurs Mobile Money principaux :</h4>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: "Wave", color: "bg-blue-500" },
                  { name: "Orange Money", color: "bg-orange-500" },
                  { name: "MTN MoMo", color: "bg-yellow-500" },
                  { name: "M-Pesa", color: "bg-green-500" },
                  { name: "Moov Money", color: "bg-red-500" },
                  { name: "Airtel Money", color: "bg-pink-500" },
                  { name: "Free Money", color: "bg-blue-600" },
                  { name: "OPay", color: "bg-teal-500" },
                ].map((op, idx) => (
                  <div key={idx} className={`${op.color} text-white px-3 py-1 rounded-full text-xs font-medium`}>
                    {op.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Stats */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-6 bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">92+</p>
              <p className="text-xs text-slate-500">Pays</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">50+</p>
              <p className="text-xs text-slate-500">Devises</p>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">100+</p>
              <p className="text-xs text-slate-500">Opérateurs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
