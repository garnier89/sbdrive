import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, Smartphone, Shield, Zap, Globe, 
  CreditCard, Send, Users, CheckCircle 
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png";

const features = [
  {
    icon: Send,
    title: "Transferts Instantanés",
    description: "Envoyez de l'argent à vos proches en quelques secondes, partout dans le monde."
  },
  {
    icon: Shield,
    title: "Sécurité Maximale",
    description: "Vos transactions sont protégées par un cryptage de niveau bancaire."
  },
  {
    icon: Globe,
    title: "Multi-Devises",
    description: "Gérez vos comptes en EUR, USD, XOF et bien plus encore."
  },
  {
    icon: CreditCard,
    title: "Paiements Faciles",
    description: "Payez vos factures et abonnements en un seul clic."
  }
];

const stats = [
  { value: "500K+", label: "Utilisateurs Actifs" },
  { value: "50M€", label: "Transactions Mensuelles" },
  { value: "150+", label: "Pays Couverts" },
  { value: "99.9%", label: "Disponibilité" }
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3" data-testid="landing-logo">
              <img src={LOGO_URL} alt="SB Pay" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold font-['Manrope'] text-foreground">SB Pay</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Fonctionnalités
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
                À propos
              </a>
              <a href="#download" className="text-muted-foreground hover:text-foreground transition-colors">
                Télécharger
              </a>
            </nav>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Button onClick={() => navigate('/dashboard')} data-testid="go-to-dashboard-btn">
                  Mon Espace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate('/login')} data-testid="login-nav-btn">
                    Connexion
                  </Button>
                  <Button onClick={() => navigate('/register')} data-testid="register-nav-btn">
                    Créer un compte
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeIn">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Nouveau: Transferts gratuits vers l'Afrique
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-['Manrope'] text-foreground leading-tight mb-6">
                L'argent se déplace.
                <span className="text-primary"> Rapidement.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                SB Pay révolutionne vos paiements. Envoyez, recevez et gérez votre argent 
                en toute simplicité, où que vous soyez dans le monde.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-10">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={() => navigate('/register')}
                  data-testid="hero-cta-btn"
                >
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6"
                  onClick={() => navigate('/login')}
                >
                  Se connecter
                </Button>
              </div>

              {/* App Store Badges */}
              <div className="flex flex-wrap gap-4" id="download">
                <a 
                  href="https://play.google.com/store/apps/details?id=com.sbpay.app" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-105 flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl"
                  data-testid="google-play-badge"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-80">Télécharger sur</div>
                    <div className="text-lg font-semibold -mt-1">Google Play</div>
                  </div>
                </a>
                <a 
                  href="https://apps.apple.com/app/sbpay/id000000000" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-transform hover:scale-105 flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl"
                  data-testid="app-store-badge"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider opacity-80">Télécharger sur</div>
                    <div className="text-lg font-semibold -mt-1">App Store</div>
                  </div>
                </a>
              </div>
              
              {/* Coming Soon Badge */}
              <p className="text-sm text-muted-foreground mt-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Applications mobiles bientôt disponibles
              </p>
            </div>

            {/* Hero Image */}
            <div className="relative animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className="relative z-10">
                <img 
                  src="https://images.pexels.com/photos/4199583/pexels-photo-4199583.jpeg"
                  alt="Paiement mobile SB Pay"
                  className="rounded-2xl shadow-2xl w-full object-cover"
                  style={{ maxHeight: '500px' }}
                />
              </div>
              {/* Decorative Elements */}
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/20 rounded-2xl -z-10"></div>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/10 rounded-full -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-3xl sm:text-4xl font-bold font-['Manrope'] text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Manrope'] text-foreground mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              SB Pay offre une gamme complète de services financiers pour simplifier votre vie quotidienne.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="hover-lift border-border"
                data-testid={`feature-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold font-['Manrope'] text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.pexels.com/photos/6612710/pexels-photo-6612710.jpeg"
                alt="Solution Business SB Pay"
                className="rounded-2xl shadow-xl w-full object-cover"
                style={{ maxHeight: '400px' }}
              />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold font-['Manrope'] text-foreground mb-6">
                Conçu pour les particuliers et les entreprises
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Que vous soyez un particulier qui souhaite envoyer de l'argent à sa famille 
                ou une entreprise qui gère des paiements internationaux, SB Pay s'adapte à vos besoins.
              </p>
              
              <div className="space-y-4">
                {[
                  "Transferts internationaux à faible coût",
                  "Portefeuille multi-devises intégré",
                  "Paiement de factures automatisé",
                  "Support client 24/7"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-12 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold font-['Manrope'] mb-4">
              Prêt à simplifier vos finances?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Rejoignez des milliers d'utilisateurs qui font confiance à SB Pay pour leurs 
              transactions quotidiennes.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
              onClick={() => navigate('/register')}
              data-testid="cta-register-btn"
            >
              Créer mon compte gratuit
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="SB Pay" className="w-10 h-10 object-contain" />
                <span className="text-xl font-bold font-['Manrope']">SB Pay</span>
              </div>
              <p className="text-muted-foreground text-sm">
                La solution de paiement moderne pour tous vos besoins financiers.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold font-['Manrope'] mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Transferts</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Portefeuille</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Factures</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Entreprises</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold font-['Manrope'] mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
                <li>
                  <a 
                    href="https://wa.me/33612345678?text=Bonjour%2C%20j%27ai%20une%20question%20concernant%20SB%20Pay."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors inline-flex items-center gap-2"
                    data-testid="whatsapp-contact-link"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                </li>
                <li><a href="mailto:support@sbpay.com" className="hover:text-foreground transition-colors">support@sbpay.com</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold font-['Manrope'] mb-4">Télécharger</h4>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://play.google.com/store/apps/details?id=com.sbpay.app" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                  </svg>
                  Google Play
                </a>
                <a 
                  href="https://apps.apple.com/app/sbpay/id000000000" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  App Store
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SB Pay. Tous droits réservés.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
              <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
