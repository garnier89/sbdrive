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
  Banknote, QrCode, RefreshCw, PiggyBank, BadgeCheck, Headphones
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png";

// Mobile Money Operators
const mobileMoneyOperators = [
  { name: "Wave", color: "bg-blue-500" },
  { name: "Orange Money", color: "bg-orange-500" },
  { name: "MTN MoMo", color: "bg-yellow-500" },
  { name: "Moov Money", color: "bg-cyan-500" },
  { name: "Free Money", color: "bg-red-500" }
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
    title: "SBPAYGO Cards",
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
    description: "Interopérabilité complète : Wave, Orange Money, MTN, Moov et plus encore.",
    color: "from-orange-500 to-orange-600"
  },
  {
    icon: Users,
    title: "SBPAYGO Partners",
    description: "Réseau d'agents pour retraits cash, dépôts et recharges Mobile Money.",
    color: "from-teal-500 to-teal-600"
  },
  {
    icon: RefreshCw,
    title: "Remboursements",
    description: "Récupération automatique des fonds en cas d'erreur avec délai de réclamation.",
    color: "from-rose-500 to-rose-600"
  }
];

// Stats
const stats = [
  { value: "500K+", label: "Utilisateurs Actifs", icon: Users },
  { value: "50M€", label: "Transactions/Mois", icon: Banknote },
  { value: "15+", label: "Pays Africains", icon: Globe },
  { value: "99.9%", label: "Disponibilité", icon: Zap }
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

// Transfer types
const transferTypes = [
  { icon: Phone, label: "Par numéro de téléphone" },
  { icon: Mail, label: "Par email" },
  { icon: Building, label: "Vers compte bancaire" },
  { icon: Smartphone, label: "Vers Mobile Money" },
  { icon: Users, label: "Entre utilisateurs SBPAYGO" },
  { icon: MapPin, label: "Via partenaires SBPAYGO" }
];

// Security features
const securityFeatures = [
  { icon: Lock, label: "Authentification biométrique" },
  { icon: Shield, label: "Cryptage niveau bancaire" },
  { icon: BadgeCheck, label: "Vérification KYC complète" },
  { icon: Clock, label: "Surveillance 24/7" }
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
      const sections = ['features', 'transfers', 'cards', 'mobile-money', 'partners', 'security'];
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 text-slate-800">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-sky-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="SBPAYGO" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">
                SBPAYGO
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              {[
                { id: 'features', label: 'Fonctionnalités' },
                { id: 'transfers', label: 'Transferts' },
                { id: 'cards', label: 'Cartes' },
                { id: 'mobile-money', label: 'Mobile Money' },
                { id: 'partners', label: 'Partenaires' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-medium transition-colors ${
                    activeSection === item.id ? 'text-orange-500' : 'text-slate-600 hover:text-sky-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="text-slate-700 hover:bg-sky-50">
                  Connexion
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white border-0">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-400/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/20 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-100 to-orange-100 border border-sky-200 mb-8">
              <span className="text-sky-600 text-sm font-medium">🌍 La Fintech #1 en Afrique</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight text-slate-800">
              Votre argent,{' '}
              <span className="bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
                partout
              </span>
              , en toute{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
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
                <Button size="lg" className="bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-sky-500/25">
                  Créer un compte gratuit
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-sky-300 text-sky-700 hover:bg-sky-50 px-8 py-6 text-lg rounded-xl"
                onClick={() => scrollToSection('features')}
              >
                <Download className="mr-2 w-5 h-5" />
                Télécharger l'app
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center p-4 rounded-2xl bg-white/80 border border-sky-100 shadow-sm">
                  <stat.icon className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl sm:text-3xl font-bold text-slate-800">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-sky-400" />
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-sky-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Pourquoi choisir{' '}
              <span className="bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">
                SBPAYGO
              </span>
              ?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Transferts rapides. Paiements sécurisés. Contrôle total.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainFeatures.map((feature, i) => (
              <Card key={i} className="bg-white border-sky-100 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-slate-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Transfers Section */}
      <section id="transfers" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 mb-6">
                <Send className="w-4 h-4 text-sky-600" />
                <span className="text-sky-600 text-sm font-medium">Transferts d'argent</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-800">
                Envoyez de l'argent en{' '}
                <span className="bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
                  quelques secondes
                </span>
              </h2>
              <p className="text-slate-600 mb-8">
                Avec SBPAYGO, vous pouvez envoyer de l'argent de multiples façons, 
                avec vérification du destinataire et possibilité de remboursement en cas d'erreur.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {transferTypes.map((type, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 border border-sky-100">
                    <type.icon className="w-5 h-5 text-sky-600" />
                    <span className="text-sm text-slate-700">{type.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
                <RefreshCw className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="font-medium text-slate-800">Remboursement garanti</p>
                  <p className="text-sm text-slate-600">Récupérez vos fonds en cas d'erreur (délai 48h)</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400/20 to-orange-400/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white rounded-3xl p-8 border border-sky-100 shadow-xl shadow-sky-100/50">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Envoyer à</span>
                    <span className="text-slate-800 font-medium">+221 77 123 4567</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Montant</span>
                    <span className="text-3xl font-bold text-slate-800">50 000 CFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Frais</span>
                    <span className="text-emerald-600">250 CFA</span>
                  </div>
                  <div className="h-px bg-sky-100" />
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total</span>
                    <span className="text-xl font-bold text-orange-500">50 250 CFA</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white py-6 rounded-xl">
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer maintenant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cards Section */}
      <section id="cards" className="py-20 px-4 bg-gradient-to-b from-white to-sky-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400/20 to-orange-400/20 rounded-3xl blur-3xl" />
              <div className="relative space-y-4">
                {/* Card Preview */}
                <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-orange-500 rounded-2xl p-6 shadow-2xl shadow-sky-500/30 max-w-sm mx-auto">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-12 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md" />
                    <span className="text-white/80 text-xs">SBPAYGO Cards</span>
                  </div>
                  <div className="text-xl tracking-widest font-mono text-white mb-6">
                    •••• •••• •••• 4589
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-white/60">TITULAIRE</p>
                      <p className="text-white font-medium">AMADOU DIALLO</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/60">EXPIRE</p>
                      <p className="text-white font-medium">12/28</p>
                    </div>
                    <span className="text-2xl font-bold text-white/90">VISA</span>
                  </div>
                </div>
                
                {/* Color options */}
                <div className="flex justify-center gap-2">
                  {['bg-sky-500', 'bg-red-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-slate-700', 'bg-amber-500', 'bg-teal-500'].map((color, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${color} ${i === 0 ? 'ring-2 ring-sky-400 ring-offset-2' : ''} shadow-md`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 mb-6">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span className="text-orange-600 text-sm font-medium">SBPAYGO Cards</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-800">
                Votre carte,{' '}
                <span className="bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">
                  votre contrôle
                </span>
              </h2>
              <p className="text-slate-600 mb-8">
                Créez des cartes virtuelles personnalisées pour vos achats en ligne 
                et paiements sans contact. Choisissez parmi 8 couleurs pour différencier 
                vos usages.
              </p>
              
              <div className="space-y-3 mb-8">
                {cardFeatures.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-sky-500" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to="/register">
                <Button className="bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white px-6 py-5 rounded-xl">
                  Créer ma première carte
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Money Section */}
      <section id="mobile-money" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 mb-6">
              <Smartphone className="w-4 h-4 text-orange-600" />
              <span className="text-orange-600 text-sm font-medium">Mobile Money</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Connecté à toute{' '}
              <span className="bg-gradient-to-r from-orange-500 to-sky-500 bg-clip-text text-transparent">
                l'Afrique
              </span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              SBPAYGO permet l'envoi et la réception via tous les principaux 
              opérateurs Mobile Money du continent.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4 mb-12">
            {mobileMoneyOperators.map((op, i) => (
              <Card key={i} className="bg-white border-sky-100 hover:border-sky-200 hover:shadow-lg transition-all">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-2xl ${op.color} mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-medium text-slate-800">{op.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-sky-50 border border-sky-100 text-center">
              <Repeat className="w-10 h-10 text-sky-600 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 mb-2">Transfert inter-opérateurs</h3>
              <p className="text-sm text-slate-600">Wave ⇄ Orange ⇄ MTN ⇄ Moov</p>
            </div>
            <div className="p-6 rounded-2xl bg-orange-50 border border-orange-100 text-center">
              <Phone className="w-10 h-10 text-orange-600 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 mb-2">Crédit téléphonique</h3>
              <p className="text-sm text-slate-600">Rechargez tous les opérateurs</p>
            </div>
            <div className="p-6 rounded-2xl bg-sky-50 border border-sky-100 text-center">
              <MapPin className="w-10 h-10 text-sky-600 mx-auto mb-4" />
              <h3 className="font-bold text-slate-800 mb-2">Recharge via partenaires</h3>
              <p className="text-sm text-slate-600">Réseau d'agents partout</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-20 px-4 bg-gradient-to-b from-sky-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 mb-6">
                <Users className="w-4 h-4 text-sky-600" />
                <span className="text-sky-600 text-sm font-medium">SBPAYGO Partners</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-slate-800">
                Devenez agent{' '}
                <span className="bg-gradient-to-r from-sky-500 to-orange-500 bg-clip-text text-transparent">
                  SBPAYGO
                </span>
              </h2>
              <p className="text-slate-600 mb-8">
                Rejoignez notre réseau de partenaires et offrez des services financiers 
                à votre communauté. Gagnez des commissions sur chaque transaction.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  { icon: QrCode, text: "Scanner le QR code client" },
                  { icon: Banknote, text: "Retirer du cash pour les clients" },
                  { icon: Smartphone, text: "Recharger Mobile Money" },
                  { icon: Wallet, text: "Gérer votre wallet partenaire" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-sky-600" />
                    </div>
                    <span className="text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>

              <Link to="/partner/register">
                <Button className="bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600 text-white px-6 py-5 rounded-xl">
                  Devenir partenaire
                  <ArrowUpRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400/20 to-orange-400/20 rounded-3xl blur-3xl" />
              <div className="relative bg-white rounded-3xl p-8 border border-sky-100 shadow-xl shadow-sky-100/50">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-orange-500 mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Espace Partenaire</h3>
                  <p className="text-slate-500 text-sm">Agent ID: AG-7X9K2M4P</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 rounded-xl bg-sky-50">
                    <span className="text-slate-600">Solde wallet</span>
                    <span className="font-bold text-slate-800">1 250 000 CFA</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-sky-50">
                    <span className="text-slate-600">Transactions/jour</span>
                    <span className="font-bold text-emerald-600">47</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-xl bg-orange-50">
                    <span className="text-slate-600">Commissions</span>
                    <span className="font-bold text-orange-600">25 000 CFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 mb-6">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-600 text-sm font-medium">Sécurité</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-slate-800">
              Plateforme{' '}
              <span className="bg-gradient-to-r from-emerald-500 to-sky-500 bg-clip-text text-transparent">
                hautement sécurisée
              </span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Vos fonds et données personnelles sont protégés par les technologies 
              de sécurité les plus avancées.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-b from-sky-50 to-white border border-sky-100 text-center hover:shadow-lg hover:shadow-sky-100/50 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 mx-auto mb-4 flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <p className="font-medium text-slate-800">{feature.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-sky-500 via-sky-600 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
            Prêt à rejoindre SBPAYGO ?
          </h2>
          <p className="text-sky-100 mb-8 text-lg">
            Créez votre compte gratuitement et commencez à envoyer de l'argent 
            partout dans le monde en quelques minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-white text-sky-600 hover:bg-sky-50 px-8 py-6 text-lg rounded-xl shadow-lg">
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

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-800 text-white border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="SBPAYGO" className="h-10 w-10 rounded-xl" />
                <span className="text-xl font-bold text-white">SBPAYGO</span>
              </div>
              <p className="text-slate-400 text-sm">
                La plateforme fintech qui connecte l'Afrique au monde.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Produits</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => scrollToSection('transfers')} className="hover:text-sky-400">Transferts</button></li>
                <li><button onClick={() => scrollToSection('cards')} className="hover:text-sky-400">Cartes virtuelles</button></li>
                <li><button onClick={() => scrollToSection('mobile-money')} className="hover:text-sky-400">Mobile Money</button></li>
                <li><Link to="/login" className="hover:text-sky-400">Coffre-fort</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Entreprise</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => scrollToSection('partners')} className="hover:text-sky-400">Devenir partenaire</button></li>
                <li><button onClick={() => setShowContactDialog(true)} className="hover:text-sky-400">Contact</button></li>
                <li><Link to="/help" className="hover:text-sky-400">Centre d'aide</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-sky-400">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-sky-400">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-sky-400">Conformité KYC/AML</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © 2026 SBPAYGO. Tous droits réservés.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm">sbpaygo.com</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="bg-white border-sky-100 text-slate-800">
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
                className="border-sky-200 focus:border-sky-400"
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
                className="border-sky-200 focus:border-sky-400"
                placeholder="votre@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Sujet</Label>
              <Select value={contactForm.subject} onValueChange={(v) => setContactForm({...contactForm, subject: v})}>
                <SelectTrigger className="border-sky-200">
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
                className="border-sky-200 focus:border-sky-400"
                placeholder="Votre message..."
                rows={4}
              />
            </div>
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-gradient-to-r from-sky-500 to-orange-500 hover:from-sky-600 hover:to-orange-600"
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
