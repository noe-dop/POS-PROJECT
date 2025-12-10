export const ROUTES = {
  // ====================
  // ROUTES PUBLIQUES
  // ====================
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  
  // ====================
  // ROUTES PROTÉGÉES
  // ====================
  
  // Page d'accueil - Dashboard
  DASHBOARD: '/',
  
  // Navigation principale
  SHOPS: '/shops',
  CASHIER: '/cashier', 
  EMPLOYEES: '/employees',
  PRODUCTS: '/products',
  INVENTORY: '/inventory',
  STATISTICS: '/statistics',
  SUBSCRIPTIONS: '/subscriptions',
  SUPPLY: '/supply',
  STOCK: '/stock',
  TYPES_PRODUITS: '/types-produits', // Ajouté ici
  
  // Paramètres avec sous-routes
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_PAYMENTS: '/settings/payments',
  SETTINGS_SECURITY: '/settings/security',
  
  // Routes de compatibilité (pour redirections)
  SALES: '/sales',
  CUSTOMERS: '/customers',
  SUPPLIERS: '/suppliers',
  REPORTS: '/reports',
  PROFILE: '/profile', // Ancienne route profil (redirigée)
};

// Routes accessibles sans authentification
export const PUBLIC_ROUTES = [
  ROUTES.LOGIN, 
  ROUTES.REGISTER, 
  ROUTES.FORGOT_PASSWORD
];

// Routes nécessitant une authentification
export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.SHOPS,
  ROUTES.CASHIER,
  ROUTES.EMPLOYEES,
  ROUTES.PRODUCTS,
  ROUTES.INVENTORY,
  ROUTES.STATISTICS,
  ROUTES.SUBSCRIPTIONS,
  ROUTES.SUPPLY,
  ROUTES.STOCK,
  ROUTES.TYPES_PRODUITS, // Ajouté ici
  ROUTES.SETTINGS,
  ROUTES.SETTINGS_PROFILE,
  ROUTES.SETTINGS_ACCOUNT,
  ROUTES.SETTINGS_PAYMENTS,
  ROUTES.SETTINGS_SECURITY,
];

// Routes de redirection (anciennes vers nouvelles)
export const REDIRECT_ROUTES = {
  [ROUTES.SALES]: ROUTES.CASHIER,              // /sales → /cashier
  [ROUTES.CUSTOMERS]: ROUTES.DASHBOARD,        // /customers → /
  [ROUTES.SUPPLIERS]: ROUTES.SUPPLY,           // /suppliers → /supply
  [ROUTES.REPORTS]: ROUTES.STATISTICS,         // /reports → /statistics
  [ROUTES.PROFILE]: ROUTES.SETTINGS_PROFILE,   // /profile → /settings/profile
  [ROUTES.SETTINGS]: ROUTES.SETTINGS_PROFILE,  // Ancien /settings → /settings/profile
};

// Routes pour la navigation dans la sidebar
export const SIDEBAR_NAVIGATION = {
  // Navigation principale
  DASHBOARD: ROUTES.DASHBOARD,
  SHOPS: ROUTES.SHOPS,
  CASHIER: ROUTES.CASHIER,
  EMPLOYEES: ROUTES.EMPLOYEES,
  PRODUCTS: ROUTES.PRODUCTS,
  INVENTORY: ROUTES.INVENTORY,
  STATISTICS: ROUTES.STATISTICS,
  SUBSCRIPTIONS: ROUTES.SUBSCRIPTIONS,
  SUPPLY: ROUTES.SUPPLY,
  STOCK: ROUTES.STOCK,
  TYPES_PRODUITS: ROUTES.TYPES_PRODUITS, // Ajouté ici
  SETTINGS: ROUTES.SETTINGS,
  
  // Sous-navigation des paramètres
  SETTINGS_PROFILE: ROUTES.SETTINGS_PROFILE,
  SETTINGS_ACCOUNT: ROUTES.SETTINGS_ACCOUNT,
  SETTINGS_PAYMENTS: ROUTES.SETTINGS_PAYMENTS,
  SETTINGS_SECURITY: ROUTES.SETTINGS_SECURITY,
};

// Vérification si une route est active (pour la navigation)
export const isRouteActive = (currentPath: string, targetRoute: string): boolean => {
  // Pour la route des paramètres, on vérifie toutes les sous-routes
  if (targetRoute === ROUTES.SETTINGS) {
    return currentPath.startsWith(ROUTES.SETTINGS);
  }
  
  // Pour les autres routes, vérification exacte
  return currentPath === targetRoute;
};

// Génération des breadcrumbs basée sur la route actuelle
export const getBreadcrumbs = (currentPath: string): Array<{ label: string; path: string }> => {
  const breadcrumbs = [];
  
  // Page d'accueil toujours présente
  breadcrumbs.push({ label: 'Accueil', path: ROUTES.DASHBOARD });
  
  // Analyse de la route actuelle
  if (currentPath.startsWith(ROUTES.SETTINGS)) {
    breadcrumbs.push({ label: 'Paramètres', path: ROUTES.SETTINGS });
    
    if (currentPath === ROUTES.SETTINGS_PROFILE) {
      breadcrumbs.push({ label: 'Profil', path: ROUTES.SETTINGS_PROFILE });
    } else if (currentPath === ROUTES.SETTINGS_ACCOUNT) {
      breadcrumbs.push({ label: 'Compte', path: ROUTES.SETTINGS_ACCOUNT });
    } else if (currentPath === ROUTES.SETTINGS_PAYMENTS) {
      breadcrumbs.push({ label: 'Paiements', path: ROUTES.SETTINGS_PAYMENTS });
    } else if (currentPath === ROUTES.SETTINGS_SECURITY) {
      breadcrumbs.push({ label: 'Sécurité', path: ROUTES.SETTINGS_SECURITY });
    }
  } else {
    // Breadcrumbs pour les autres pages
    const routeConfig = {
      [ROUTES.SHOPS]: 'Boutiques',
      [ROUTES.CASHIER]: 'Caisse',
      [ROUTES.EMPLOYEES]: 'Équipe',
      [ROUTES.PRODUCTS]: 'Catalogue',
      [ROUTES.INVENTORY]: 'Inventaire',
      [ROUTES.STATISTICS]: 'Statistiques',
      [ROUTES.SUBSCRIPTIONS]: 'Abonnements',
      [ROUTES.SUPPLY]: 'Approvisionnement',
      [ROUTES.STOCK]: 'Stock',
      [ROUTES.TYPES_PRODUITS]: 'Types de Produits', // Ajouté ici
    };
    
    const label = routeConfig[currentPath as keyof typeof routeConfig];
    if (label) {
      breadcrumbs.push({ label, path: currentPath });
    }
  }
  
  return breadcrumbs;
};

// Vérification des permissions par route (si nécessaire)
export const getRoutePermissions = (route: string): string[] => {
  const permissionsMap: { [key: string]: string[] } = {
    [ROUTES.EMPLOYEES]: ['manage_users'],
    [ROUTES.SUBSCRIPTIONS]: ['premium_features'],
    [ROUTES.SETTINGS]: ['admin_access'],
    [ROUTES.TYPES_PRODUITS]: ['manage_products'], // Ajouté ici
  };
  
  return permissionsMap[route] || [];
};