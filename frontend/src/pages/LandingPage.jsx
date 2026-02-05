import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowRight, Smartphone, Shield, Zap, Globe, 
  CreditCard, Send, Users, CheckCircle, MessageCircle, Loader2, Mail,
  Phone, Wallet, Lock, Building, Repeat, Download, ChevronDown,
  MapPin, Clock, FileText, HelpCircle, Star, ArrowUpRight,
  Banknote, QrCode, RefreshCw, PiggyBank, BadgeCheck, Headphones,
  Eye, ShieldCheck, AlertTriangle, Award, Fingerprint, Scale, FileCheck,
  CreditCard as CardIcon, Landmark, ScanLine
} from 'lucide-react';
import TransferCalculator from '@/components/TransferCalculator';
import GlobalRegions from '@/components/GlobalRegions';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

// Custom illustrations
const HERO_ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/f6885a89-e935-404b-96ad-6649703cdda6/images/a508e46c9b56971ebd46b87b36a2394d827b3ddba0c7675b0c679a84d3c77d29.png";
const PAYMENT_WORLD_ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/f6885a89-e935-404b-96ad-6649703cdda6/images/f71cc9be23d7ea456eb91a218d0ef32376165d14ba7accbe7593a701bcf9fe50.png";
const SECURITY_ILLUSTRATION = "https://static.prod-images.emergentagent.com/jobs/f6885a89-e935-404b-96ad-6649703cdda6/images/608a5581e5942a8cdc9134590e0cc510417fb57959cb038755153b52ad65ecea.png";

// Payment Partners Logos
const paymentPartners = [
  { name: "Visa", logo: "💳" },
  { name: "Mastercard", logo: "💳" },
  { name: "SEPA", logo: "🇪🇺" },
  { name: "PayPal", logo: "🔵" },
  { name: "Alipay", logo: "🔷" },
  { name: "WeChat Pay", logo: "🟢" },
  { name: "Wave", logo: "🌊" },
  { name: "M-Pesa", logo: "🟢" },
  { name: "Orange Money", logo: "🟠" },
  { name: "MTN MoMo", logo: "🟡" },
];

// Features data
const mainFeatures = [
  {
    icon: Send,
    title: "Transferts Instantanés",
    description: "Envoyez de l'argent par téléphone, email, vers les banques ou Mobile Money en quelques secondes.",
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: CreditCard,
    title: "Cartes SBPAYGO",
    description: "Créez des cartes virtuelles personnalisées pour vos achats en ligne et paiements sans contact.",
    color: "from-purple-500 to-purple-600"
  },
  {
    icon: PiggyBank,
    title: "Coffre-fort Sécurisé",
    description: "Protégez votre argent avec un stockage multi-devises et accès biométrique.",
    color: "from-emerald-500 to-emerald-600"
  },
  {
    icon: Globe,
    title: "Mobile Money Afrique",
    description: "Interopérabilité complète : Wave, Orange Money, MTN, Moov, M-Pesa et plus dans 21+ pays.",
    color: "from-orange-500 to-orange-600"
  },
  {
    icon: Users,
    title: "Réseau d'Agents",
    description: "Réseau de partenaires pour retraits cash, dépôts et recharges Mobile Money.",
    color: "from-teal-500 to-teal-600"
  },
  {
    icon: Landmark,
    title: "Paiements Internationaux",
    description: "Connecté aux systèmes bancaires européens, américains et asiatiques (Alipay, WeChat Pay).",
    color: "from-rose-500 to-rose-600"
  }
];

// Stats
const stats = [
  { value: "500K+", label: "Utilisateurs Actifs", icon: Users },
  { value: "50M€", label: "Transactions/Mois", icon: Banknote },
  { value: "70+", label: "Pays disponibles", icon: Globe },
  { value: "99.9%", label: "Disponibilité", icon: Zap }
];

// How it works steps
const howItWorksSteps = [
  {
    step: "1",
    title: "Créez votre compte",
    description: "Inscription gratuite en quelques minutes avec votre email ou téléphone.",
    icon: Users
  },
  {
    step: "2", 
    title: "Vérifiez votre identité",
    description: "Processus KYC sécurisé pour protéger votre compte et vos fonds.",
    icon: ShieldCheck
  },
  {
    step: "3",
    title: "Ajoutez un moyen de paiement",
    description: "Carte bancaire, Mobile Money, Alipay, WeChat Pay, SEPA ou PayPal.",
    icon: CreditCard
  },
  {
    step: "4",
    title: "Envoyez et recevez",
    description: "Transférez de l'argent partout dans le monde en toute sécurité.",
    icon: Send
  }
];

// Security features detailed
const securityFeaturesDetailed = [
  {
    icon: Lock,
    title: "Chiffrement Bancaire",
    description: "Toutes vos données sont protégées par un chiffrement AES-256 de niveau bancaire."
  },
  {
    icon: Eye,
    title: "Surveillance 24/7",
    description: "Nos systèmes surveillent en permanence toute activité suspecte sur votre compte."
  },
  {
    icon: Fingerprint,
    title: "Authentification Biométrique",
    description: "Accédez à votre compte avec Face ID, Touch ID ou empreinte digitale."
  },
  {
    icon: AlertTriangle,
    title: "Détection Anti-Fraude",
    description: "Intelligence artificielle pour détecter et bloquer les transactions frauduleuses."
  },
  {
    icon: MapPin,
    title: "Protection Géographique",
    description: "Définissez une zone de sécurité pour autoriser uniquement les transactions dans votre périmètre."
  },
  {
    icon: FileCheck,
    title: "Traçabilité Complète",
    description: "Historique complet de toutes vos opérations avec reçus téléchargeables."
  }
];

// Compliance features
const complianceFeatures = [
  {
    icon: BadgeCheck,
    title: "KYC (Know Your Customer)",
    description: "Vérification d'identité obligatoire pour tous les utilisateurs afin de garantir la sécurité de la plateforme."
  },
  {
    icon: Scale,
    title: "AML (Anti-Money Laundering)",
    description: "Conformité stricte aux réglementations anti-blanchiment d'argent internationales."
  },
  {
    icon: ShieldCheck,
    title: "Audits Réguliers",
    description: "Contrôles internes et audits de sécurité effectués régulièrement par des partenaires certifiés."
  },
  {
    icon: FileText,
    title: "Transparence Totale",
    description: "Tarifs clairs, conditions générales accessibles et politique de confidentialité détaillée."
  }
];

// Transfer types
const transferTypes = [
  { icon: Phone, label: "Par numéro de téléphone" },
  { icon: Mail, label: "Par email" },
  { icon: Building, label: "Vers compte bancaire" },
  { icon: Smartphone, label: "Vers Mobile Money" },
  { icon: Users, label: "Entre utilisateurs SBPAYGO" },
  { icon: MapPin, label: "Via agents partenaires" }
];

// Card features
const cardFeatures = [
  "Choix de 8 couleurs personnalisées",
  "Afficher/masquer infos via PIN",
  "Modifier le code PIN",
  "Définir limites et plafonds",
  "Activer/bloquer instantanément",
  "Paiements en ligne & sans contact"
];

// Mobile Money Operators
const mobileMoneyOperators = [
  { name: "Wave", color: "bg-blue-500" },
  { name: "Orange Money", color: "bg-orange-500" },
  { name: "MTN MoMo", color: "bg-yellow-500" },
  { name: "M-Pesa", color: "bg-green-500" },
  { name: "Moov Money", color: "bg-cyan-500" },
  { name: "Free Money", color: "bg-red-500" }
];

// African countries
const africanCountries = [
  "Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso", "Bénin", "Togo",
  "Niger", "Guinée", "Ghana", "Nigeria", "Cameroun", "Kenya",
  "Tanzanie", "Ouganda", "Rwanda", "RD Congo", "Gabon", "Zimbabwe", "Zambie"
];

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '', email: '', subject: 'general', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Scroll spy for navigation
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['features', 'how-it-works', 'security', 'compliance', 'mobile-money', 'partners'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/contact/submit`, contactForm);
      toast.success('Message envoyé avec succès!');
      setShowContactDialog(false);
      setContactForm({ name: '', email: '', subject: 'general', message: '' });
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/50 text-slate-800">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src={LOGO_URL} alt="SBPAYGO" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                SBPAYGO
              </span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-6">
              {[
                { id: 'features', label: 'Services' },
                { id: 'how-it-works', label: 'Comment ça marche' },
                { id: 'security', label: 'Sécurité' },
                { id: 'mobile-money', label: 'Mobile Money' },
                { id: 'partners', label: 'Partenaires' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-colors ${
                    activeSection === item.id ? 'text-orange-600' : 'text-slate-600 hover:text-orange-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-300/15 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-8">
              <span className="text-orange-600 text-sm font-medium">🌍 Plateforme fintech panafricaine & internationale</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-slate-800">
              Votre argent,{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                partout
              </span>
              , en toute{' '}
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                sécurité
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              SBPAYGO est la plateforme digitale qui vous permet d'envoyer, recevoir, 
              stocker et gérer votre argent facilement — entre proches, vers les banques 
              et vers les services Mobile Money.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-orange-500/30">
                  Créer un compte gratuit
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-300 hover:bg-slate-50 px-8 py-6 text-lg rounded-xl">
                <Download className="mr-2 w-5 h-5" />
                Télécharger l'app
              </Button>
            </div>

            {/* Quick Features */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Rapide</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Sécurisé</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">24+ pays</span>
              </div>
            </div>

            {/* Payment Partners */}
            <div className="mt-8">
              <p className="text-sm text-slate-500 mb-4">Nos partenaires de paiement :</p>
              <div className="flex flex-wrap justify-center items-center gap-6">
                {paymentPartners.map((partner, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="text-2xl">{partner.logo}</span>
                    <span className="text-sm font-medium">{partner.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-y border-orange-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl mb-3">
                  <stat.icon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-slate-800">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Nos Services Principaux
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Une plateforme complète pour tous vos besoins financiers, locaux et internationaux.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainFeatures.map((feature, idx) => (
              <Card key={idx} className="bg-white border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all group">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-slate-800">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Comment ça marche ?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Envoyer de l'argent n'a jamais été aussi simple. Suivez ces 4 étapes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorksSteps.map((step, idx) => (
              <div key={idx} className="text-center relative">
                {idx < 3 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-orange-200" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                    <span className="text-2xl font-bold text-white">{step.step}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-800">{step.title}</h3>
                  <p className="text-slate-600 text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/register">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                Commencer maintenant
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 mb-6">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm font-medium">Sécurité Maximale</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Votre sécurité est notre priorité absolue
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Nous utilisons des technologies de pointe pour garantir la protection 
              de vos données et de votre argent.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeaturesDetailed.map((feature, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-800 transition-colors">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-6">
              <Scale className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 text-sm font-medium">Conformité & Réglementation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Une plateforme conforme aux standards internationaux
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              SBPAYGO applique des procédures strictes pour assurer un environnement 
              financier sûr et transparent.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {complianceFeatures.map((feature, idx) => (
              <Card key={idx} className="bg-white border-slate-200 hover:border-blue-300 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-slate-800">{feature.title}</h3>
                  <p className="text-slate-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Money Section */}
      <section id="mobile-money" className="py-20 px-4 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Mobile Money dans 24+ Pays Africains
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Connecté aux principaux opérateurs Mobile Money du continent africain.
            </p>
          </div>
          
          {/* Operators Grid */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {mobileMoneyOperators.map((op, idx) => (
              <div key={idx} className={`${op.color} text-white px-6 py-3 rounded-xl font-medium shadow-lg`}>
                {op.name}
              </div>
            ))}
          </div>

          {/* Countries */}
          <div className="bg-white rounded-2xl p-8 border border-orange-200 shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-slate-800 text-center">Pays disponibles :</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {africanCountries.map((country, idx) => (
                <span key={idx} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                  🌍 {country}
                </span>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <ArrowRight className="w-6 h-6 text-green-600 rotate-90" />
              </div>
              <h4 className="font-bold text-slate-800 mb-2">Dépôts</h4>
              <p className="text-slate-600 text-sm">Approvisionnez votre compte via Mobile Money</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <ArrowRight className="w-6 h-6 text-blue-600 -rotate-90" />
              </div>
              <h4 className="font-bold text-slate-800 mb-2">Retraits</h4>
              <p className="text-slate-600 text-sm">Retirez vers votre compte Mobile Money</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Repeat className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-bold text-slate-800 mb-2">Transferts</h4>
              <p className="text-slate-600 text-sm">Envoyez de l'argent entre opérateurs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Réseau d'Agents Partenaires
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Trouvez un agent SBPAYGO près de vous pour vos opérations en espèces.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Banknote, title: "Dépôts Cash", desc: "Déposez de l'argent sur votre compte" },
              { icon: Wallet, title: "Retraits Cash", desc: "Retirez de l'argent en espèces" },
              { icon: Smartphone, title: "Recharge Mobile", desc: "Rechargez votre téléphone" },
              { icon: Headphones, title: "Assistance", desc: "Obtenez de l'aide personnalisée" }
            ].map((item, idx) => (
              <div key={idx} className="bg-orange-50 p-6 rounded-xl text-center hover:bg-orange-100 transition-colors">
                <div className="w-14 h-14 mx-auto bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                  <item.icon className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/partner/register">
              <Button size="lg" variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                Devenir agent partenaire
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose SBPAYGO */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-orange-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Pourquoi choisir SBPAYGO ?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: "Compatible Mobile Money & Banques", desc: "Connecté aux principaux opérateurs et systèmes bancaires" },
              { icon: Zap, title: "Transferts Rapides", desc: "Envoyez de l'argent en quelques secondes" },
              { icon: Shield, title: "Paiements Sécurisés", desc: "Protection maximale de vos transactions" },
              { icon: Wallet, title: "Portefeuille Numérique", desc: "Gérez toutes vos devises en un seul endroit" },
              { icon: Globe, title: "Gestion Multi-pays", desc: "Disponible dans 24+ pays africains" },
              { icon: Headphones, title: "Support Client Réactif", desc: "Une équipe disponible pour vous aider" }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="w-10 h-10 flex-shrink-0 bg-orange-100 rounded-lg flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Prêt à rejoindre SBPAYGO ?
          </h2>
          <p className="text-orange-100 mb-8 text-lg">
            Créez votre compte gratuitement et commencez à envoyer de l'argent 
            partout dans le monde en quelques minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 px-8 py-6 text-lg rounded-xl shadow-lg">
                Créer un compte gratuit
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/50 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
              onClick={() => setShowContactDialog(true)}
            >
              <Headphones className="mr-2 w-5 h-5" />
              Contactez-nous
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Complete Legal */}
      <footer className="py-16 px-4 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="SBPAYGO" className="h-12 w-12 rounded-xl" />
                <span className="text-2xl font-bold text-white">SBPAYGO</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Plateforme digitale de services financiers connectant l'Afrique au monde.
              </p>
              <div className="text-slate-400 text-sm space-y-1">
                <p>📧 support@sbpaygo.com</p>
                <p>📞 +33 1 23 45 67 89</p>
              </div>
            </div>
            
            {/* Products */}
            <div>
              <h4 className="font-bold text-white mb-4">Produits</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-orange-400 transition-colors">Transferts</button></li>
                <li><Link to="/login" className="hover:text-orange-400 transition-colors">Cartes virtuelles</Link></li>
                <li><button onClick={() => scrollToSection('mobile-money')} className="hover:text-orange-400 transition-colors">Mobile Money</button></li>
                <li><Link to="/login" className="hover:text-orange-400 transition-colors">Coffre-fort</Link></li>
                <li><Link to="/login" className="hover:text-orange-400 transition-colors">Paiement factures</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-bold text-white mb-4">Entreprise</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => scrollToSection('partners')} className="hover:text-orange-400 transition-colors">Devenir partenaire</button></li>
                <li><button onClick={() => setShowContactDialog(true)} className="hover:text-orange-400 transition-colors">Contact</button></li>
                <li><Link to="/help" className="hover:text-orange-400 transition-colors">Centre d'aide</Link></li>
                <li><Link to="/find-agent" className="hover:text-orange-400 transition-colors">Trouver un agent</Link></li>
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h4 className="font-bold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/legal/terms" className="hover:text-orange-400 transition-colors">Conditions Générales</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-orange-400 transition-colors">Politique de Confidentialité</Link></li>
                <li><Link to="/legal/kyc-aml" className="hover:text-orange-400 transition-colors">Politique KYC/AML</Link></li>
                <li><Link to="/legal/pricing" className="hover:text-orange-400 transition-colors">Tarifs & Commissions</Link></li>
                <li><Link to="/legal/refund" className="hover:text-orange-400 transition-colors">Politique de Remboursement</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Payment Methods */}
          <div className="border-t border-slate-800 pt-8 mb-8">
            <p className="text-slate-500 text-sm text-center mb-4">Moyens de paiement acceptés :</p>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {paymentPartners.map((partner, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-500">
                  <span className="text-xl">{partner.logo}</span>
                  <span className="text-xs">{partner.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Legal Notice */}
          <div className="border-t border-slate-800 pt-8">
            <div className="text-center text-slate-500 text-xs space-y-2">
              <p>
                SBPAYGO est une plateforme digitale de services financiers. 
                L'utilisation du service implique l'acceptation de nos conditions générales.
              </p>
              <p>
                © 2026 SBPAYGO – Tous droits réservés | sbpaygo.com
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="bg-white border-slate-200 text-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Contactez-nous</DialogTitle>
            <DialogDescription className="text-slate-500">
              Notre équipe vous répondra dans les plus brefs délais.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Nom</Label>
              <Input
                required
                value={contactForm.name}
                onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                className="border-slate-200 focus:border-orange-400"
                placeholder="Votre nom"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Email</Label>
              <Input
                type="email"
                required
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                className="border-slate-200 focus:border-orange-400"
                placeholder="votre@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Sujet</Label>
              <Select value={contactForm.subject} onValueChange={(v) => setContactForm({...contactForm, subject: v})}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Question générale</SelectItem>
                  <SelectItem value="support">Support technique</SelectItem>
                  <SelectItem value="partnership">Partenariat</SelectItem>
                  <SelectItem value="complaint">Réclamation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Message</Label>
              <Textarea
                required
                value={contactForm.message}
                onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                className="border-slate-200 focus:border-orange-400"
                placeholder="Votre message..."
                rows={4}
              />
            </div>
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
