import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, RefreshCw, Globe, Zap, Shield, Calculator } from 'lucide-react';

// Regions and countries configuration
const REGIONS = {
  europe: {
    name: "Europe",
    flag: "🇪🇺",
    countries: [
      { code: "FR", name: "France", currency: "EUR", flag: "🇫🇷" },
      { code: "DE", name: "Allemagne", currency: "EUR", flag: "🇩🇪" },
      { code: "ES", name: "Espagne", currency: "EUR", flag: "🇪🇸" },
      { code: "IT", name: "Italie", currency: "EUR", flag: "🇮🇹" },
      { code: "BE", name: "Belgique", currency: "EUR", flag: "🇧🇪" },
      { code: "GB", name: "Royaume-Uni", currency: "GBP", flag: "🇬🇧" },
      { code: "CH", name: "Suisse", currency: "CHF", flag: "🇨🇭" },
    ],
    methods: ["SEPA", "Carte bancaire", "PayPal"],
    color: "from-blue-500 to-blue-600"
  },
  america: {
    name: "Amérique",
    flag: "🌎",
    countries: [
      { code: "US", name: "États-Unis", currency: "USD", flag: "🇺🇸" },
      { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
      { code: "BR", name: "Brésil", currency: "BRL", flag: "🇧🇷" },
      { code: "MX", name: "Mexique", currency: "MXN", flag: "🇲🇽" },
    ],
    methods: ["ACH", "Carte bancaire", "PayPal"],
    color: "from-red-500 to-red-600"
  },
  asia: {
    name: "Asie",
    flag: "🌏",
    countries: [
      { code: "CN", name: "Chine", currency: "CNY", flag: "🇨🇳" },
      { code: "HK", name: "Hong Kong", currency: "HKD", flag: "🇭🇰" },
      { code: "SG", name: "Singapour", currency: "SGD", flag: "🇸🇬" },
      { code: "JP", name: "Japon", currency: "JPY", flag: "🇯🇵" },
      { code: "KR", name: "Corée du Sud", currency: "KRW", flag: "🇰🇷" },
      { code: "IN", name: "Inde", currency: "INR", flag: "🇮🇳" },
    ],
    methods: ["Alipay", "WeChat Pay", "UnionPay", "Carte bancaire"],
    color: "from-green-500 to-green-600"
  },
  africa: {
    name: "Afrique",
    flag: "🌍",
    countries: [
      { code: "SN", name: "Sénégal", currency: "XOF", flag: "🇸🇳" },
      { code: "CI", name: "Côte d'Ivoire", currency: "XOF", flag: "🇨🇮" },
      { code: "CM", name: "Cameroun", currency: "XAF", flag: "🇨🇲" },
      { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
      { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
      { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
      { code: "MA", name: "Maroc", currency: "MAD", flag: "🇲🇦" },
    ],
    methods: ["Mobile Money", "Virement bancaire", "Cash Agent"],
    color: "from-orange-500 to-orange-600"
  }
};

// Exchange rates (demo)
const EXCHANGE_RATES = {
  EUR: { USD: 1.08, GBP: 0.86, CNY: 7.82, XOF: 655.96, XAF: 655.96, NGN: 1750, KES: 165, GHS: 16.5, CAD: 1.47, JPY: 162, INR: 90 },
  USD: { EUR: 0.93, GBP: 0.79, CNY: 7.24, XOF: 607, XAF: 607, NGN: 1620, KES: 153, GHS: 15.3, CAD: 1.36, JPY: 150, INR: 83 },
  CNY: { EUR: 0.13, USD: 0.14, XOF: 84, NGN: 224, KES: 21 },
  XOF: { EUR: 0.00152, USD: 0.00165, CNY: 0.012 },
  GBP: { EUR: 1.16, USD: 1.26, CNY: 9.1 }
};

// Fee structure
const FEES = {
  europe: { percent: 0.5, fixed: 0 },
  america: { percent: 1.5, fixed: 0.50 },
  asia: { percent: 2.0, fixed: 0 },
  africa: { percent: 1.5, fixed: 0 }
};

export default function TransferCalculator({ onStartTransfer }) {
  const [sourceRegion, setSourceRegion] = useState('europe');
  const [sourceCountry, setSourceCountry] = useState('FR');
  const [destRegion, setDestRegion] = useState('africa');
  const [destCountry, setDestCountry] = useState('SN');
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState(null);

  const getCountry = (regionKey, countryCode) => {
    return REGIONS[regionKey]?.countries.find(c => c.code === countryCode);
  };

  const getExchangeRate = (from, to) => {
    if (from === to) return 1;
    return EXCHANGE_RATES[from]?.[to] || EXCHANGE_RATES[to]?.[from] ? (1 / EXCHANGE_RATES[to][from]) : 1;
  };

  const calculateTransfer = () => {
    const source = getCountry(sourceRegion, sourceCountry);
    const dest = getCountry(destRegion, destCountry);
    
    if (!source || !dest || !amount) return;

    const rate = getExchangeRate(source.currency, dest.currency);
    const feeConfig = FEES[destRegion];
    const feePercent = amount * (feeConfig.percent / 100);
    const totalFee = feePercent + feeConfig.fixed;
    const convertedAmount = (amount - totalFee) * rate;

    setResult({
      sourceAmount: amount,
      sourceCurrency: source.currency,
      destAmount: convertedAmount.toFixed(2),
      destCurrency: dest.currency,
      rate: rate.toFixed(4),
      fee: totalFee.toFixed(2),
      feePercent: feeConfig.percent,
      deliveryTime: destRegion === 'africa' ? '1-24 heures' : 'Instantané',
      methods: REGIONS[destRegion].methods
    });
  };

  useEffect(() => {
    if (amount > 0) {
      calculateTransfer();
    }
  }, [sourceRegion, sourceCountry, destRegion, destCountry, amount]);

  const sourceCountryData = getCountry(sourceRegion, sourceCountry);
  const destCountryData = getCountry(destRegion, destCountry);

  return (
    <Card className="bg-white border-slate-200 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="w-6 h-6" />
          Simulez votre transfert
        </CardTitle>
        <p className="text-orange-100 text-sm">Calculez les frais et le montant reçu instantanément</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Source */}
          <div className="space-y-4">
            <Label className="text-slate-700 font-medium">Vous envoyez depuis</Label>
            <Select value={sourceRegion} onValueChange={(v) => { setSourceRegion(v); setSourceCountry(REGIONS[v].countries[0].code); }}>
              <SelectTrigger className="border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REGIONS).map(([key, region]) => (
                  <SelectItem key={key} value={key}>
                    {region.flag} {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceCountry} onValueChange={setSourceCountry}>
              <SelectTrigger className="border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS[sourceRegion].countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label className="text-slate-600 text-sm">Montant à envoyer</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="text-2xl font-bold pr-16 border-slate-200"
                  min="1"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                  {sourceCountryData?.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-4">
            <Label className="text-slate-700 font-medium">Destinataire reçoit en</Label>
            <Select value={destRegion} onValueChange={(v) => { setDestRegion(v); setDestCountry(REGIONS[v].countries[0].code); }}>
              <SelectTrigger className="border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REGIONS).map(([key, region]) => (
                  <SelectItem key={key} value={key}>
                    {region.flag} {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={destCountry} onValueChange={setDestCountry}>
              <SelectTrigger className="border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS[destRegion].countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {result && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <p className="text-slate-500 text-sm">Montant reçu</p>
                <p className="text-3xl font-bold text-green-600">
                  {parseFloat(result.destAmount).toLocaleString()} {result.destCurrency}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Result Details */}
        {result && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-500">Taux de change</p>
                <p className="font-bold text-slate-800">1 {result.sourceCurrency} = {result.rate} {result.destCurrency}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-500">Frais ({result.feePercent}%)</p>
                <p className="font-bold text-slate-800">{result.fee} {result.sourceCurrency}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-500">Délai</p>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  {result.deliveryTime}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-500">Méthodes</p>
                <p className="font-bold text-slate-800 text-xs">{result.methods.slice(0, 2).join(', ')}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                onClick={onStartTransfer}
              >
                Envoyer maintenant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" className="border-slate-300" onClick={calculateTransfer}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
