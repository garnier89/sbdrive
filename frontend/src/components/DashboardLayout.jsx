import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { 
  Home, Send, ArrowDownCircle, ArrowUpCircle, Receipt, 
  History, User, LogOut, Shield, Menu, X, Settings, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ce75e416-36f1-4b25-8491-7de5dd466427/artifacts/jsqaea98_1024x1024%20%281030%20x%201024%20px%29_20251125_175229_0000.png";

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/transfer', icon: Send, label: 'Transfert' },
  { href: '/deposit', icon: ArrowDownCircle, label: 'Dépôt' },
  { href: '/withdraw', icon: ArrowUpCircle, label: 'Retrait' },
  { href: '/bills', icon: Receipt, label: 'Factures' },
  { href: '/history', icon: History, label: 'Historique' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

const adminItems = [
  { href: '/admin', icon: Shield, label: 'Admin Dashboard' },
  { href: '/admin/users', icon: User, label: 'Utilisateurs' },
  { href: '/admin/transactions', icon: History, label: 'Transactions' },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        onClick={() => mobile && setMobileOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-primary text-primary-foreground shadow-md' 
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="sidebar-logo">
          <img src={LOGO_URL} alt="SB Pay" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold font-['Manrope'] text-foreground">SB Pay</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-4">
          Menu Principal
        </div>
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} mobile={mobile} />
        ))}
        
        {isAdmin && (
          <>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-8 mb-4 px-4">
              Administration
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} mobile={mobile} />
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-card border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={LOGO_URL} alt="SB Pay" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold font-['Manrope']">SB Pay</span>
          </Link>
          
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent mobile />
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
