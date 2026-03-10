import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  User,
  Building,
  CreditCard,
  Users,
  Package,
  ClipboardList,
  BarChart3,
  Bell,
  Truck,
  FolderOpen,
  Shield,
  Activity,
  Zap,
  Crown,
  Settings,
  CreditCard as Payment,
  Tags // Ajouté ici
} from 'lucide-react';

// Types
interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'new' | 'hot' | 'beta';
  premium?: boolean;
  requiresPermission?: string;
}

interface UserStatus {
  online: boolean;
  lastActive?: Date;
}

// Fonction utilitaire pour les classes CSS
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Configuration de la navigation
const navigationConfig: NavigationItem[] = [
  { 
    name: 'Tableau de bord', 
    href: '/', 
    icon: BarChart3,
    badge: 'new'
  },
  { 
    name: 'Boutiques', 
    href: '/shops', 
    icon: Building 
  },
  { 
    name: 'Caisse', 
    href: '/cashier', 
    icon: CreditCard,
    badge: 'hot'
  },
  { 
    name: 'Équipe', 
    href: '/employees', 
    icon: Users 
  },
  { 
    name: 'Catalogue', 
    href: '/products', 
    icon: Package 
  },
  { 
    name: 'Types de Produits', 
    href: '/types-produits', // Ajouté ici
    icon: Tags,
    badge: 'beta'
  },
  { 
    name: 'Inventaire', 
    href: '/inventory', 
    icon: ClipboardList 
  },
  // { 
  //   name: 'Analytiques', 
  //   href: '/analytics', 
  //   icon: Activity 
  // },
  // { 
  //   name: 'Abonnements', 
  //   href: '/subscriptions', 
  //   icon: Bell,
  //   premium: true
  // },
  { 
    name: 'Approvisionnement', 
    href: '/supply', 
    icon: Truck 
  },
  { 
    name: 'Stock', 
    href: '/stock', 
    icon: FolderOpen 
  },
  { 
    name: 'Paramètres', 
    href: '/settings', 
    icon: Settings 
  },
];

// Sous-navigation pour les paramètres
const settingsNavigation: NavigationItem[] = [
  { 
    name: 'Profil', 
    href: '/settings/profile', 
    icon: User 
  },
  { 
    name: 'Compte', 
    href: '/settings/account', 
    icon: Settings 
  },
  { 
    name: 'Paiements', 
    href: '/settings/payments', 
    icon: Payment 
  },
  { 
    name: 'Sécurité', 
    href: '/settings/security', 
    icon: Shield 
  },
];

// Composant Badge
const Badge: React.FC<{ type: 'new' | 'hot' | 'beta'; compact?: boolean }> = ({ 
  type, 
  compact = false 
}) => {
  const config = {
    new: { label: 'Nouveau', className: 'bg-emerald-500 text-white' },
    hot: { label: 'Hot', className: 'bg-rose-500 text-white' },
    beta: { label: 'Beta', className: 'bg-blue-500 text-white' }
  };

  const { label, className } = config[type];

  return (
    <span className={cn(
      "inline-flex items-center justify-center font-semibold border border-white/30",
      compact 
        ? "px-1.5 py-0.5 text-[10px] rounded-md min-w-[18px] h-[18px]" 
        : "px-2 py-1 text-xs rounded-lg min-w-[20px]",
      className
    )}>
      {compact ? label.charAt(0) : label}
    </span>
  );
};

// Composant Tooltip corrigé
interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'left' | 'right';
  premium?: boolean;
  isDisabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  side = 'right', 
  premium,
  isDisabled = false 
}) => {
  if (isDisabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {children}
      <div className={cn(
        "absolute top-1/2 -translate-y-1/2 z-50",
        "px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg",
        "shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200",
        "pointer-events-none whitespace-nowrap",
        side === 'right' ? 'left-full ml-3' : 'right-full mr-3',
        "before:absolute before:content-[''] before:w-2 before:h-2 before:bg-gray-900 before:rotate-45",
        side === 'right' 
          ? 'before:-left-1 before:top-1/2 before:-translate-y-1/2' 
          : 'before:-right-1 before:top-1/2 before:-translate-y-1/2'
      )}>
        <div className="flex items-center gap-1">
          {content}
          {premium && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
        </div>
      </div>
    </div>
  );
};

// Composant Principal
export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // États
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['settings']));
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Dérivations
  const shouldShowExpanded = isCollapsed && isHovered;
  const isExpanded = !isCollapsed || shouldShowExpanded;
  const isSettingsActive = location.pathname.startsWith('/settings');

  // Fermeture du sidebar mobile au clic externe
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileOpen]);

  // Gestion de la déconnexion
  const handleLogout = useCallback(async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }
  }, [logout, navigate]);

  // Utilitaires utilisateur
  const getUserInitials = useCallback(() => {
    if (!user) return 'US';
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user.username?.substring(0, 2).toUpperCase() || 'US';
  }, [user]);

  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Utilisateur';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || 'Utilisateur';
  }, [user]);

  const getUserRole = useCallback(() => {
    return user?.role || 'Administrateur';
  }, [user]);

  const getUserStatus = useCallback((): UserStatus => {
    return {
      online: true,
      lastActive: new Date()
    };
  }, []);

  // Gestion des sections développées
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Filtrage de la navigation selon les permissions
  const filteredNavigation = navigationConfig.filter(item => {
    if (item.requiresPermission && user?.permissions) {
      return user.permissions.includes(item.requiresPermission);
    }
    return true;
  });

  // Composant de lien de navigation
  const NavItem: React.FC<{ 
    item: NavigationItem; 
    level?: number;
    isSubItem?: boolean;
  }> = ({ item, level = 0, isSubItem = false }) => {
    const isActive = location.pathname === item.href;
    const IconComponent = item.icon;
    const paddingLeft = isSubItem ? `pl-${8 + level * 4}` : 'pl-3';

    return (
      <Tooltip 
        content={item.name} 
        side="right"
        premium={item.premium}
        isDisabled={isExpanded}
      >
        <Link
          to={item.href}
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            "group relative flex items-center rounded-lg transition-all duration-200",
            "hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            isExpanded ? `${paddingLeft} pr-3 py-2.5 gap-3` : "justify-center px-2 py-2.5",
            isActive
              ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent",
            isSubItem && "ml-4 border-l-2 border-gray-200"
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          {/* Indicateur visuel d'activité */}
          {isActive && isExpanded && !isSubItem && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"></div>
          )}

          {/* Icône avec badge */}
          <div className="relative flex-shrink-0">
            <IconComponent className={cn(
              "transition-colors duration-200",
              isExpanded ? "w-4 h-4" : "w-5 h-5",
              isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700",
              item.premium && "text-amber-500"
            )} />
            
            {/* Badge compact pour état réduit */}
            {item.badge && !isExpanded && (
              <div className="absolute -top-1 -right-1">
                <Badge type={item.badge} compact />
              </div>
            )}
          </div>

          {/* Contenu texte */}
          {isExpanded && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className={cn(
                "font-medium text-sm transition-colors duration-200",
                isActive ? "text-blue-900" : "text-gray-700 group-hover:text-gray-900",
                isSubItem && "text-xs"
              )}>
                {item.name}
              </span>
              
              {/* Badges et indicateurs */}
              <div className="flex items-center gap-1.5">
                {item.badge && <Badge type={item.badge} />}
                {item.premium && (
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
              </div>
            </div>
          )}
        </Link>
      </Tooltip>
    );
  };

  return (
    <>
      {/* Bouton Menu Mobile */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        aria-label="Menu principal"
      >
        {isMobileOpen ? (
          <X className="w-5 h-5 text-gray-700" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700" />
        )}
      </button>

      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-white/97 backdrop-blur-xl border-r border-gray-200/60",
          "transition-all duration-300 ease-in-out flex flex-col",
          "shadow-xl lg:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-16" : "w-64",
          shouldShowExpanded && "w-64 shadow-xl"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        
        {/* En-tête avec informations utilisateur */}
        <header className={cn(
          "p-4 border-b border-gray-200/40",
          isCollapsed && !shouldShowExpanded && "flex justify-center"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed && !shouldShowExpanded ? "justify-center" : "gap-3"
          )}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-md ring-2 ring-white/20">
                {getUserInitials()}
              </div>
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                getUserStatus().online ? "bg-emerald-500" : "bg-gray-400"
              )} />
            </div>
            
            {/* Informations utilisateur */}
            {isExpanded && (
              <div className="min-w-0 flex-1 space-y-0.5">
                <h2 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {getUserDisplayName()}
                </h2>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-600 truncate">{getUserRole()}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  <span>En ligne</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Bouton de réduction/expansion */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "hidden lg:flex absolute -right-3 top-20 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-full p-1.5",
            "shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
          aria-label={isCollapsed ? "Développer le menu" : "Réduire le menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
          )}
        </button>

        {/* Navigation principale */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            if (item.href === '/settings') {
              return (
                <div key="settings-section" className="space-y-1">
                  {/* Section Paramètres avec sous-menu */}
                  <div
                    className={cn(
                      "group flex items-center rounded-lg transition-all duration-200 cursor-pointer",
                      "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      isExpanded ? "px-3 py-2.5 gap-3" : "justify-center px-2 py-2.5",
                      isSettingsActive && "bg-blue-50 text-blue-700 border border-blue-200"
                    )}
                    onClick={() => isExpanded && toggleSection('settings')}
                  >
                    <Settings className={cn(
                      "shrink-0 transition-colors duration-200",
                      isExpanded ? "w-4 h-4" : "w-5 h-5",
                      isSettingsActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                    )} />
                    
                    {isExpanded && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className={cn(
                          "font-medium text-sm",
                          isSettingsActive ? "text-blue-900" : "text-gray-700"
                        )}>
                          Paramètres
                        </span>
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform duration-200",
                          expandedSections.has('settings') && "rotate-90"
                        )} />
                      </div>
                    )}
                  </div>

                  {/* Sous-menu des paramètres */}
                  {isExpanded && expandedSections.has('settings') && (
                    <div className="space-y-1 ml-4 border-l-2 border-gray-200 pl-2">
                      {settingsNavigation.map((subItem) => (
                        <NavItem 
                          key={subItem.href} 
                          item={subItem} 
                          level={1}
                          isSubItem={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return <NavItem key={item.href} item={item} />;
          })}
        </nav>

        {/* Pied de page */}
        <footer className={cn(
          "p-4 border-t border-gray-200/40 space-y-3",
          isCollapsed && !shouldShowExpanded && "flex flex-col items-center"
        )}>
          {/* Bouton de déconnexion */}
          <Tooltip content="Déconnexion" side="right" isDisabled={isExpanded}>
            <button
              onClick={handleLogout}
              className={cn(
                "group w-full flex items-center rounded-lg text-gray-600 hover:bg-rose-50 hover:text-rose-600",
                "transition-all duration-200 border border-transparent hover:border-rose-200",
                "hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",
                isExpanded ? "px-3 py-2.5 gap-3" : "justify-center px-2 py-2.5"
              )}
            >
              <LogOut className={cn(
                "shrink-0 transition-all duration-200",
                isExpanded ? "w-4 h-4" : "w-5 h-5",
                "group-hover:text-rose-600"
              )} />
              
              {isExpanded && (
                <span className="font-medium text-sm">Déconnexion</span>
              )}
            </button>
          </Tooltip>
          
          {/* Branding */}
          <div className={cn(
            "bg-gradient-to-r from-gray-50/80 to-blue-50/50 rounded-lg border border-gray-200/60",
            "p-3 text-center",
            isExpanded ? "px-3" : "px-2"
          )}>
            <div className={cn(
              "font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700",
              "leading-tight",
              isExpanded ? "text-base" : "text-xs"
            )}>
              {isExpanded ? 'NSP POS PRO' : 'NSP'}
            </div>
            
            {isExpanded && (
              <>
                <div className="text-xs text-gray-600 font-medium mt -0.5">
                  Enterprise Edition
                </div>
                <div className="text-[10px] text-gray-500 font-semibold tracking-wide mt-0.5">
                  v2.1.0
                </div>
              </>
            )}
          </div>
        </footer>
      </aside>
    </>
  );
};