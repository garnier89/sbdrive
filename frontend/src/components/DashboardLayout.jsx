import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { useTheme } from '@/components/ThemeProvider';
import { 
  Home, Send, ArrowDownCircle, ArrowUpCircle, 
  History, User, LogOut, Shield, Menu, Settings, Bell, Link2,
  QrCode, Gift, Smartphone, Phone, Zap, CreditCard, FileText, Crown, BarChart3, AlertTriangle, Users, Lock, HelpCircle, Headphones, Moon, Sun, Store, Banknote, Globe, Percent, MapPin, Copy, HandCoins, ChevronDown, ChevronRight, Wallet, Building2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9e19f0cd-3f17-4ed6-9cf2-ef66d2aec5e9/artifacts/qhg0pnr1_1024x1024%20%281030%20x%201024%20px%29_20251125_175331_0000.png";

// Navigation sections with collapsible groups
const navigationSections = [
  {
    id: 'main',
    title: null,
    items: [
      { href: '/dashboard', icon: Home, label: 'Tableau de bord' },
    ]
  },
  {
    id: 'operations',
    title: 'Opérations',
    icon: Wallet,
    collapsible: true,
    items: [
      { href: '/deposit', icon: ArrowDownCircle, label: 'Dépôt' },
      { href: '/withdraw', icon: ArrowUpCircle, label: 'Retrait' },
      { href: '/transfer', icon: Send, label: 'Transfert' },
      { href: '/user-transfer', icon: Users, label: 'Entre Utilisateurs' },
      { href: '/request-money', icon: HandCoins, label: 'Demander Argent', badge: 'NEW' },
    ]
  },
  {
    id: 'cards',
    title: 'Cartes & Sécurité',
    icon: CreditCard,
    collapsible: true,
    items: [
      { href: '/virtual-cards', icon: CreditCard, label: 'Cartes Virtuelles' },
      { href: '/saved-cards', icon: CreditCard, label: 'Cartes Bancaires' },
      { href: '/vault', icon: Lock, label: 'Coffre-Fort' },
      { href: '/geo-security', icon: MapPin, label: 'Sécurité Géo' },
    ]
  },
  {
    id: 'payments',
    title: 'Paiements',
    icon: QrCode,
    collapsible: true,
    items: [
      { href: '/qr-payment', icon: QrCode, label: 'Paiement QR' },
      { href: '/payment-links', icon: Link2, label: 'Liens de Paiement' },
    ]
  },
  {
    id: 'agents',
    title: 'Réseau Agents',
    icon: Store,
    collapsible: true,
    items: [
      { href: '/cash-withdrawal', icon: Banknote, label: 'Retrait Cash' },
      { href: '/find-agent', icon: MapPin, label: 'Localiser Agent' },
    ]
  },
  {
    id: 'africa',
    title: 'Services Afrique',
    icon: Globe,
    collapsible: true,
    items: [
      { href: '/mobile-money-transfer', icon: Smartphone, label: 'Mobile Money' },
      { href: '/airtime', icon: Phone, label: 'Crédit Téléphone' },
      { href: '/bill-payment', icon: Zap, label: 'Factures' },
    ]
  },
  {
    id: 'account',
    title: 'Mon Compte',
    icon: User,
    collapsible: true,
    items: [
      { href: '/rewards', icon: Gift, label: 'Récompenses' },
      { href: '/history', icon: History, label: 'Historique' },
      { href: '/help', icon: HelpCircle, label: 'Centre d\'Aide' },
      { href: '/settings', icon: Settings, label: 'Paramètres' },
    ]
  },
];

// Admin sections
const adminSections = [
  {
    id: 'admin-main',
    title: 'Administration',
    icon: Shield,
    collapsible: true,
    adminOnly: true,
    items: [
      { href: '/admin', icon: Shield, label: 'Dashboard Admin' },
      { href: '/admin/super', icon: Crown, label: 'Super Admin' },
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/admin/anti-fraud', icon: AlertTriangle, label: 'Anti-Fraude', badge: 'NEW' },
    ]
  },
  {
    id: 'admin-users',
    title: 'Gestion Utilisateurs',
    icon: Users,
    collapsible: true,
    adminOnly: true,
    items: [
      { href: '/admin/users', icon: User, label: 'Utilisateurs' },
      { href: '/admin/kyc', icon: Shield, label: 'Vérification KYC' },
      { href: '/admin/staff', icon: Users, label: 'Personnel' },
      { href: '/admin/partners', icon: Store, label: 'Partenaires' },
    ]
  },
  {
    id: 'admin-config',
    title: 'Configuration',
    icon: Settings,
    collapsible: true,
    adminOnly: true,
    items: [
      { href: '/admin/zones-config', icon: Globe, label: 'Zones & Services' },
      { href: '/admin/mobile-money-config', icon: Smartphone, label: 'Mobile Money' },
      { href: '/admin/gateways', icon: Building2, label: 'Passerelles' },
      { href: '/admin/commissions', icon: Percent, label: 'Commissions' },
      { href: '/admin/limits', icon: Shield, label: 'Limites' },
    ]
  },
  {
    id: 'admin-tools',
    title: 'Outils',
    icon: FileText,
    collapsible: true,
    adminOnly: true,
    items: [
      { href: '/admin/transactions', icon: History, label: 'Transactions' },
      { href: '/admin/alerts', icon: AlertTriangle, label: 'Alertes' },
      { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
      { href: '/admin/tickets', icon: Headphones, label: 'Support' },
      { href: '/admin/card-approvals', icon: CreditCard, label: 'Cartes' },
      { href: '/admin/cms', icon: FileText, label: 'CMS' },
      { href: '/admin/admins', icon: Crown, label: 'Admins' },
    ]
  },
];

// NavLink Component
const NavLink = ({ item, isActive, onClick, isCompact = false }) => {
  return (
    <Link
      to={item.href}
      onClick={onClick}
      data-testid={`nav-${item.label.toLowerCase().replace(/[' ]/g, '-')}`}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative",
        isActive 
          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        isCompact && "px-2.5 py-1.5"
      )}
    >
      <item.icon className={cn(
        "w-4.5 h-4.5 flex-shrink-0 transition-transform group-hover:scale-110",
        isActive ? "text-white" : "text-slate-500 group-hover:text-orange-500"
      )} />
      <span className={cn("font-medium text-sm truncate", isCompact && "text-xs")}>{item.label}</span>
      {item.badge && (
        <span className={cn(
          "ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full",
          isActive 
            ? "bg-white/20 text-white" 
            : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
        )}>
          {item.badge}
        </span>
      )}
    </Link>
  );
};

// Collapsible Section Component
const CollapsibleSection = ({ section, isOpen, onToggle, location, onNavClick, isCompact = false }) => {
  const hasActiveItem = section.items.some(item => location.pathname === item.href);
  
  return (
    <div className="mb-1">
      {section.title && (
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all",
            hasActiveItem ? "text-orange-600 bg-orange-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          {section.icon && <section.icon className="w-3.5 h-3.5" />}
          <span className="flex-1 text-left">{section.title}</span>
          {section.collapsible && (
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              isOpen ? "rotate-180" : ""
            )} />
          )}
        </button>
      )}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        (section.collapsible && !isOpen) ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
      )}>
        <div className={cn("space-y-0.5", section.title && "mt-1 ml-1")}>
          {section.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={location.pathname === item.href}
              onClick={onNavClick}
              isCompact={isCompact}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // State for collapsible sections - all open by default
  const [openSections, setOpenSections] = useState(() => {
    const sections = {};
    [...navigationSections, ...adminSections].forEach(s => {
      sections[s.id] = true;
    });
    return sections;
  });

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

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

  const sidebarContent = (mobile = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Header with Logo */}
      <div className="flex-shrink-0 p-4 border-b border-slate-100">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="sidebar-logo">
          <div className="relative">
            <img src={LOGO_URL} alt="SBPAYGO" className="w-10 h-10 object-contain" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <span className="text-lg font-bold font-['Manrope'] bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">SBPAYGO</span>
            <p className="text-[10px] text-slate-400 -mt-0.5">Super App Global</p>
          </div>
        </Link>
      </div>

      {/* User Card */}
      {user?.sbpaygo_id && (
        <div className="flex-shrink-0 mx-3 mt-3 p-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user?.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white/10 rounded-lg px-2.5 py-1.5">
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Mon ID</p>
              <p className="text-xs font-mono font-bold text-orange-400">{user.sbpaygo_id}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20"
              onClick={copyUserId}
              data-testid="copy-user-id-btn"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 min-h-0 px-2 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
        {/* Main Sections */}
        {navigationSections.map(section => (
          <CollapsibleSection
            key={section.id}
            section={section}
            isOpen={openSections[section.id]}
            onToggle={() => toggleSection(section.id)}
            location={location}
            onNavClick={() => mobile && setMobileOpen(false)}
          />
        ))}

        {/* Admin Sections */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            {adminSections.map(section => (
              <CollapsibleSection
                key={section.id}
                section={section}
                isOpen={openSections[section.id]}
                onToggle={() => toggleSection(section.id)}
                location={location}
                onNavClick={() => mobile && setMobileOpen(false)}
                isCompact
              />
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl"
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
        
        {/* Logout */}
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-100 shadow-sm">
        {sidebarContent(false)}
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={LOGO_URL} alt="SBPAYGO" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-['Manrope'] bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">SBPAYGO</span>
          </Link>
          
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 rounded-xl" data-testid="mobile-menu-btn">
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
