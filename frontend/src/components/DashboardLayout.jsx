import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { useTheme } from '@/components/ThemeProvider';
import { 
  Home, Send, ArrowDownCircle, ArrowUpCircle, 
  History, User, LogOut, Shield, Menu, Settings, Bell, Link2,
  QrCode, Gift, Smartphone, Phone, Zap, CreditCard, FileText, Crown, BarChart3, AlertTriangle, Users, Lock, HelpCircle, Headphones, Moon, Sun, Store, Banknote, Globe, Percent, MapPin, Copy, HandCoins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

// Reorganized Navigation Structure
const mainNavItems = [
  { href: '/dashboard', icon: Home, label: 'Tableau de bord' },
];

// Money Operations Section
const moneyOperationsItems = [
  { href: '/deposit', icon: ArrowDownCircle, label: 'Dépôt' },
  { href: '/withdraw', icon: ArrowUpCircle, label: 'Retrait' },
  { href: '/transfer', icon: Send, label: 'Transfert' },
  { href: '/user-transfer', icon: Users, label: 'Entre Utilisateurs' },
  { href: '/request-money', icon: HandCoins, label: 'Demander Argent', isNew: true },
];

// Cards & Vault Section
const securityItems = [
  { href: '/virtual-cards', icon: CreditCard, label: 'Cartes Virtuelles' },
  { href: '/vault', icon: Lock, label: 'Coffre-Fort' },
];

// Payments Section
const paymentsItems = [
  { href: '/qr-payment', icon: QrCode, label: 'Paiement QR' },
  { href: '/payment-links', icon: Link2, label: 'Liens de Paiement' },
];

// Agent Network Section
const agentItems = [
  { href: '/cash-withdrawal', icon: Banknote, label: 'Retrait Cash' },
  { href: '/find-agent', icon: MapPin, label: 'Localiser Agent' },
];

// Africa Module items
const africaItems = [
  { href: '/mobile-money-transfer', icon: Smartphone, label: 'Mobile Money' },
  { href: '/airtime', icon: Phone, label: 'Crédit Téléphone' },
  { href: '/bill-payment', icon: Zap, label: 'Factures' },
];

// User section items
const userItems = [
  { href: '/rewards', icon: Gift, label: 'Récompenses' },
  { href: '/history', icon: History, label: 'Historique' },
  { href: '/help', icon: HelpCircle, label: 'Centre d\'Aide' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

const adminItems = [
  { href: '/admin', icon: Shield, label: 'Admin Dashboard' },
  { href: '/admin/super', icon: Crown, label: 'Super Admin' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics & KPIs' },
  { href: '/admin/alerts', icon: AlertTriangle, label: 'Alertes & Seuils' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications Zone' },
  { href: '/admin/tickets', icon: Headphones, label: 'Tickets Support' },
  { href: '/admin/partners', icon: Store, label: 'Partenaires/Agents' },
  { href: '/admin/mobile-money-config', icon: Smartphone, label: 'Mobile Money Config' },
  { href: '/admin/rewards', icon: Gift, label: 'Récompenses' },
  { href: '/admin/zones-config', icon: Globe, label: 'Zones & Services' },
  { href: '/admin/staff', icon: Users, label: 'Personnel Admin' },
  { href: '/admin/commissions', icon: Percent, label: 'Commissions' },
  { href: '/admin/limits', icon: Shield, label: 'Limites & Anti-Fraude' },
  { href: '/admin/kyc', icon: Shield, label: 'Vérification KYC' },
  { href: '/admin/contact-settings', icon: Settings, label: 'Paramètres Contact' },
  { href: '/admin/users', icon: User, label: 'Utilisateurs' },
  { href: '/admin/transactions', icon: History, label: 'Transactions' },
  { href: '/admin/card-approvals', icon: CreditCard, label: 'Approbation Cartes' },
  { href: '/admin/zones', icon: Shield, label: 'Zones' },
  { href: '/admin/gateways', icon: Settings, label: 'Passerelles' },
  { href: '/admin/payment-rules', icon: Shield, label: 'Sécurité & Capture' },
  { href: '/admin/cms', icon: FileText, label: 'CMS Contenu' },
  { href: '/admin/admins', icon: Crown, label: 'Gestion Admins' },
];

// NavLink Component - defined outside DashboardLayout
const NavLink = ({ item, isActive, onClick }) => {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25' 
          : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700'
        }`}
      data-testid={`nav-${item.label.toLowerCase().replace(/[' ]/g, '-')}`}
    >
      <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
      <span className="font-medium text-sm">{item.label}</span>
      {item.isNew && (
        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded">NEW</span>
      )}
    </Link>
  );
};

// SectionTitle Component - defined outside DashboardLayout
const SectionTitle = ({ children, emoji }) => (
  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-4 mb-2 px-4 flex items-center gap-2">
    {emoji && <span>{emoji}</span>}
    {children}
  </div>
);

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const copyUserId = () => {
    if (user?.sbpaygo_id) {
      navigator.clipboard.writeText(user.sbpaygo_id);
      toast.success('ID copié !');
    }
  };

  const renderNavItems = (items, mobile = false) => {
    return items.map((item) => (
      <NavLink 
        key={item.href} 
        item={item} 
        isActive={location.pathname === item.href}
        onClick={() => mobile && setMobileOpen(false)}
      />
    ));
  };

  const sidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="p-4 border-b border-orange-100">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="sidebar-logo">
          <img src={LOGO_URL} alt="SBPAYGO" className="w-9 h-9 object-contain" />
          <span className="text-lg font-bold font-['Manrope'] bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">SBPAYGO</span>
        </Link>
      </div>

      {/* User ID Card */}
      {user?.sbpaygo_id && (
        <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mon ID SBPAYGO</p>
              <p className="text-sm font-bold text-orange-600 font-mono">{user.sbpaygo_id}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-500 hover:bg-orange-200/50"
              onClick={copyUserId}
              data-testid="copy-user-id-btn"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {/* Main */}
        {renderNavItems(mainNavItems, mobile)}
        
        {/* Money Operations */}
        <SectionTitle emoji="💰">Opérations</SectionTitle>
        {renderNavItems(moneyOperationsItems, mobile)}
        
        {/* Cards & Security */}
        <SectionTitle emoji="🔐">Cartes & Sécurité</SectionTitle>
        {renderNavItems(securityItems, mobile)}
        
        {/* Payments */}
        <SectionTitle emoji="💳">Paiements</SectionTitle>
        {renderNavItems(paymentsItems, mobile)}
        
        {/* Agent Network */}
        <SectionTitle emoji="🏪">Réseau Agents</SectionTitle>
        {renderNavItems(agentItems, mobile)}
        
        {/* Africa Module Section */}
        <SectionTitle emoji="🌍">Afrique</SectionTitle>
        {renderNavItems(africaItems, mobile)}
        
        {/* User Section */}
        <SectionTitle emoji="👤">Mon Compte</SectionTitle>
        {renderNavItems(userItems, mobile)}
        
        {isAdmin && (
          <>
            <SectionTitle emoji="⚙️">Administration</SectionTitle>
            {renderNavItems(adminItems, mobile)}
          </>
        )}
      </nav>

      {/* User Section Footer */}
      <div className="p-3 border-t border-orange-100 bg-orange-50/50">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-slate-600 hover:bg-orange-100 hover:text-orange-700 mb-2"
          onClick={toggleTheme}
          data-testid="theme-toggle-btn"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 mr-2" />
              Mode sombre
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 mr-2" />
              Mode clair
            </>
          )}
        </Button>
        
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-slate-800">{user?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-orange-100 shadow-sm">
        {sidebarContent(false)}
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-orange-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={LOGO_URL} alt="SBPAYGO" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-['Manrope'] bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">SBPAYGO</span>
          </Link>
          
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-orange-50" data-testid="mobile-menu-btn">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              {sidebarContent(true)}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
