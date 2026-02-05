import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, RefreshCw, Globe, Zap, Calculator, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

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
      { code: "PT", name: "Portugal", currency: "EUR", flag: "🇵🇹" },
      { code: "NL", name: "Pays-Bas", currency: "EUR", flag: "🇳🇱" },
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
      { code: "AR", name: "Argentine", currency: "ARS", flag: "🇦🇷" },
      { code: "CO", name: "Colombie", currency: "COP", flag: "🇨🇴" },
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
      { code: "TH", name: "Thaïlande", currency: "THB", flag: "🇹🇭" },
    ],
    methods: ["Alipay", "WeChat Pay", "UnionPay", "Carte bancaire"],
    color: "from-green-500 to-green-600"
  },
  maghreb: {
    name: "Maghreb",
    flag: "🏜️",
    countries: [
      { code: "MA", name: "Maroc", currency: "MAD", flag: "🇲🇦" },
      { code: "DZ", name: "Algérie", currency: "DZD", flag: "🇩🇿" },
      { code: "TN", name: "Tunisie", currency: "TND", flag: "🇹🇳" },
      { code: "EG", name: "Égypte", currency: "EGP", flag: "🇪🇬" },
      { code: "LY", name: "Libye", currency: "LYD", flag: "🇱🇾" },
      { code: "MR", name: "Mauritanie", currency: "MRU", flag: "🇲🇷" },
    ],
    methods: ["Virement bancaire", "Paiement mobile", "CIB/Edahabia"],
    color: "from-amber-500 to-amber-600"
  },
  africa: {
    name: "Afrique Subsaharienne",
    flag: "🌍",
    countries: [
      { code: "SN", name: "Sénégal", currency: "XOF", flag: "🇸🇳" },
      { code: "CI", name: "Côte d'Ivoire", currency: "XOF", flag: "🇨🇮" },
      { code: "ML", name: "Mali", currency: "XOF", flag: "🇲🇱" },
      { code: "BF", name: "Burkina Faso", currency: "XOF", flag: "🇧🇫" },
      { code: "CM", name: "Cameroun", currency: "XAF", flag: "🇨🇲" },
      { code: "NG", name: "Nigeria", currency: "NGN", flag: "🇳🇬" },
      { code: "GH", name: "Ghana", currency: "GHS", flag: "🇬🇭" },
      { code: "KE", name: "Kenya", currency: "KES", flag: "🇰🇪" },
      { code: "TZ", name: "Tanzanie", currency: "TZS", flag: "🇹🇿" },
      { code: "UG", name: "Ouganda", currency: "UGX", flag: "🇺🇬" },
      { code: "RW", name: "Rwanda", currency: "RWF", flag: "🇷🇼" },
      { code: "CD", name: "RD Congo", currency: "CDF", flag: "🇨🇩" },
    ],
    methods: ["Mobile Money", "Virement bancaire", "Cash Agent"],
    color: "from-orange-500 to-orange-600"
  }
};

// Fallback exchange rates (used if API fails)
const FALLBACK_RATES = {
  EUR: 1, USD: 1.08, GBP: 0.86, CNY: 7.82, XOF: 655.96, XAF: 655.96, 
  NGN: 1750, KES: 165, GHS: 16.5, CAD: 1.47, JPY: 162, INR: 90,
  MAD: 10.85, DZD: 145.5, TND: 3.35, EGP: 33.2, LYD: 5.2, MRU: 42.5,
  TZS: 2700, UGX: 4050, RWF: 1350, CDF: 2750, CHF: 0.94
};

// Fee structure
const FEES = {
  europe: { percent: 0.5, fixed: 0 },
  america: { percent: 1.5, fixed: 0.50 },
  asia: { percent: 2.0, fixed: 0 },
  maghreb: { percent: 1.2, fixed: 0 },
  africa: { percent: 1.5, fixed: 0 }
};

export default function TransferCalculator({ onStartTransfer }) {
  const [sourceRegion, setSourceRegion] = useState('europe');
  const [sourceCountry, setSourceCountry] = useState('FR');
  const [destRegion, setDestRegion] = useState('africa');
  const [destCountry, setDestCountry] = useState('SN');
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState(null);
  const [liveRates, setLiveRates] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const getCountry = (regionKey, countryCode) => {
    return REGIONS[regionKey]?.countries.find(c => c.code === countryCode);
  };

  // Fetch live exchange rates from API
  const fetchLiveRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/exchange-rates/latest`);
      if (response.data.success) {
        setLiveRates(response.data.rates);
        setIsLive(!response.data.cached || response.data.provider !== 'fallback');
        setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
      }
    } catch (error) {
      console.error('Failed to fetch live rates:', error);
      setLiveRates(FALLBACK_RATES);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch rates on mount
  useEffect(() => {
    fetchLiveRates();
  }, [fetchLiveRates]);

  const getExchangeRate = (from, to) => {
    if (from === to) return 1;
    
    const rates = liveRates || FALLBACK_RATES;
    
    // Convert through EUR as base
    const fromRate = from === 'EUR' ? 1 : (rates[from] || FALLBACK_RATES[from] || 1);
    const toRate = to === 'EUR' ? 1 : (rates[to] || FALLBACK_RATES[to] || 1);
    
    return toRate / fromRate;
  };

  const calculateTransfer = useCallback(() => {
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
      deliveryTime: destRegion === 'africa' || destRegion === 'maghreb' ? '1-24 heures' : 'Instantané',
      methods: REGIONS[destRegion].methods,
      isLive: isLive
    });
  }, [sourceRegion, sourceCountry, destRegion, destCountry, amount, liveRates, isLive]);

  useEffect(() => {
    if (amount > 0 && liveRates) {
      calculateTransfer();
    }
  }, [calculateTransfer, amount, liveRates]);

  const sourceCountryData = getCountry(sourceRegion, sourceCountry);
  const destCountryData = getCountry(destRegion, destCountry);

  return (
    <Card className="bg-white border-slate-200 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="w-6 h-6" />
              Simulez votre transfert
            </CardTitle>
            <p className="text-orange-100 text-sm">Calculez les frais et le montant reçu instantanément</p>
          </div>
          {/* Live Rate Indicator */}
          <div className="flex items-center gap-2">
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-orange-200" />
            ) : isLive ? (
              <div className="flex items-center gap-1.5 bg-green-500/20 px-3 py-1.5 rounded-full">
                <Wifi className="w-4 h-4 text-green-300" />
                <span className="text-xs text-green-200 font-medium">Taux en direct</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-orange-400/20 px-3 py-1.5 rounded-full">
                <WifiOff className="w-4 h-4 text-orange-200" />
                <span className="text-xs text-orange-200">Mode hors ligne</span>
              </div>
            )}
          </div>
        </div>
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
                {isLive && <p className="text-[10px] text-green-600 mt-1">📡 En direct</p>}
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

            {/* Last update info */}
            {lastUpdate && (
              <p className="text-center text-xs text-slate-400 mt-4">
                Dernière mise à jour : {lastUpdate} • Source : ExchangeRate-API
              </p>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                onClick={onStartTransfer}
              >
                Envoyer maintenant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                className="border-slate-300" 
                onClick={fetchLiveRates}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Chargement...' : 'Actualiser les taux'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
