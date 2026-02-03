import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import {
  Globe, Smartphone, Send, ArrowLeftRight, CreditCard,
  Store, FileText, Search, ChevronRight, ArrowRight,
  Shield, Zap, Users, MapPin, Check, Star
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SERVICE_ICONS = {
  transfer_p2p: Send,
  transfer_inter: ArrowLeftRight,
  mobile_recharge: Smartphone,
  cash_out: CreditCard,
  merchant_payment: Store,
  bill_payment: FileText
};

const SERVICE_LABELS = {
  transfer_p2p: 'Transfert P2P',
  transfer_inter: 'Inter-opérateurs',
  mobile_recharge: 'Recharge Mobile',
  cash_out: 'Cash-out',
  merchant_payment: 'Marchands',
  bill_payment: 'Factures'
};

export default function MobileMoneyPage() {
  const [countries, setCountries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [countriesRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/mobile-money-config/countries/active`),
        axios.get(`${API}/api/mobile-money-config/stats`)
      ]);
      setCountries(countriesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group countries by region (simplified based on currency zones)
  const regions = {
    'all': 'Tous les pays',
    'xof': 'Zone CFA Ouest (XOF)',
    'xaf': 'Zone CFA Central (XAF)',
    'east': 'Afrique de l\'Est',
    'south': 'Afrique Australe'
  };

  const getRegion = (country) => {
    if (country.currency === 'XOF') return 'xof';
    if (country.currency === 'XAF') return 'xaf';
    if (['KE', 'TZ', 'UG', 'RW', 'ET'].includes(country.code)) return 'east';
    if (['ZA', 'ZW', 'ZM', 'BW'].includes(country.code)) return 'south';
    return 'other';
  };

  const displayedCountries = selectedRegion === 'all' 
    ? filteredCountries 
    : filteredCountries.filter(c => getRegion(c) === selectedRegion);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-slate-800">SBPAYGO</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-slate-600 hover:text-orange-600">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Mobile Money <span className="text-orange-200">Afrique</span>
          </h1>
          <p className="text-xl text-orange-100 max-w-3xl mx-auto mb-8">
            Transferts, recharges et cash-out dans plus de 20 pays africains.
            Connectez-vous à tous les opérateurs Mobile Money du continent.
          </p>
          
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold text-white">{stats.active_countries}+</p>
                <p className="text-orange-200 text-sm">Pays</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold text-white">{stats.active_operators}+</p>
                <p className="text-orange-200 text-sm">Opérateurs</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold text-white">6</p>
                <p className="text-orange-200 text-sm">Services</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-3xl font-bold text-white">24/7</p>
                <p className="text-orange-200 text-sm">Disponible</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-4">
            Services disponibles
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
            Tous les services essentiels du Mobile Money accessibles depuis SBPAYGO
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(SERVICE_LABELS).map(([key, label]) => {
              const Icon = SERVICE_ICONS[key];
              return (
                <Card key={key} className="border-orange-100 hover:border-orange-300 transition-all hover:shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="font-medium text-slate-700">{label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Countries Section */}
      <section className="py-16 bg-orange-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-4">
            Pays et opérateurs
          </h2>
          <p className="text-center text-slate-500 mb-8 max-w-2xl mx-auto">
            Découvrez tous les pays et opérateurs Mobile Money supportés par SBPAYGO
          </p>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Rechercher un pays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-orange-200 focus:border-orange-400"
              />
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {Object.entries(regions).map(([key, label]) => (
                <Button
                  key={key}
                  variant={selectedRegion === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRegion(key)}
                  className={selectedRegion === key ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-200 text-slate-600'}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Countries Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 mt-4">Chargement...</p>
            </div>
          ) : displayedCountries.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto text-orange-300 mb-4" />
              <p className="text-slate-500">Aucun pays trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCountries.map((country) => (
                <Card key={country.id} className="border-orange-100 hover:border-orange-300 transition-all hover:shadow-lg overflow-hidden">
                  <CardContent className="p-0">
                    {/* Country Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{country.flag_emoji}</span>
                        <div className="text-white">
                          <h3 className="font-bold text-lg">{country.name}</h3>
                          <p className="text-orange-200 text-sm">
                            {country.currency} ({country.currency_symbol}) • {country.phone_prefix}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Operators */}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-orange-500" />
                        {country.operators?.length || 0} Opérateur(s)
                      </p>
                      <div className="space-y-2">
                        {country.operators?.map((operator) => (
                          <div key={operator.code} className="flex items-center justify-between bg-orange-50 rounded-lg p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-white border border-orange-200 flex items-center justify-center">
                                <Smartphone className="w-4 h-4 text-orange-500" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-700 text-sm">{operator.name}</p>
                                {operator.ussd_code && (
                                  <p className="text-xs text-slate-500">{operator.ussd_code}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs bg-white">
                              {operator.fees_percent}%
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Services */}
                      <div className="mt-4 pt-4 border-t border-orange-100">
                        <p className="text-sm font-semibold text-slate-600 mb-2">Services disponibles</p>
                        <div className="flex flex-wrap gap-1">
                          {country.operators?.[0]?.services && Object.entries(country.operators[0].services).map(([key, enabled]) => {
                            if (!enabled) return null;
                            const Icon = SERVICE_ICONS[key];
                            return (
                              <div key={key} className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                                <Icon className="w-3 h-3" />
                                <span>{SERVICE_LABELS[key]}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à utiliser le Mobile Money ?
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
            Créez votre compte SBPAYGO et accédez à tous les services Mobile Money
            en Afrique. Transferts instantanés, recharges, et bien plus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8">
                Créer un compte gratuit
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="font-semibold text-white">SBPAYGO</span>
            </div>
            <p className="text-sm">
              © 2026 SBPAYGO. La Fintech #1 en Afrique. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <Link to="/terms" className="text-sm hover:text-orange-400">Conditions</Link>
              <Link to="/privacy" className="text-sm hover:text-orange-400">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
