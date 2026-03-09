// src/types/stock.types.ts
// TYPES POUR LE STOCK ALIGNÉS SUR L'API

// =============================================================================
// TYPES DE BASE
// =============================================================================

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'over_stock';

// =============================================================================
// INTERFACE PRINCIPALE STOCK - ALIGNÉE SUR L'API
// =============================================================================

export interface Stock {
  // Métadonnées
  is_active: boolean;
  metadata: Record<string, any>;
  
  // Quantités - Attention: l'API utilise des nombres énormes (2147483647 = max int)
  quantity_package: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  
  // Seuils et paramètres
  ideal_stock_level: number;
  min_stock_threshold: number;
  qt_moy_appro: string; // L'API retourne une string pour les DecimalField
  stock_turnover_rate: number;
  
  // Dates
  last_restocked: string; // Format ISO
  
  // Statut
  stock_status: StockStatus;
  
  // Relations (IDs)
  product: number;
  store: number;
  warehouse: number;
  
  // ID (optionnel dans la création, présent dans la réponse)
  id?: number;
  
  // Champs de jointure (ajoutés par le frontend via expand)
  product_details?: {
    id: number;
    name: string;
    sku: string;
    cost_price?: number;
    base_price?: number;
  } | null;
  
  store_details?: {
    id: number;
    name: string;
  } | null;
  
  warehouse_details?: {
    id: number;
    name: string;
  } | null;
}

// =============================================================================
// STATISTIQUES
// =============================================================================

export interface StockStats {
  totalProducts: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
  inStock?: number;
  over_stock_count?: number;
  totalValue?: number;
  averageStockValue?: number;
  total_quantity?: number;
  average_turnover?: number;
}

// =============================================================================
// FILTRES
// =============================================================================

export interface StockFilters {
  product?: number;
  store?: number;
  warehouse?: number;
  stock_status?: string;
  is_active?: boolean;
  search?: string;
  min_quantity?: number;
  max_quantity?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
  expand?: string;
}

// =============================================================================
// CRUD - DONNÉES DE CRÉATION/MISE À JOUR - ALIGNÉES SUR L'API
// =============================================================================

export interface CreateStockData {
  // Champs obligatoires (avec valeurs par défaut possibles)
  is_active?: boolean;           // Default: true
  metadata?: Record<string, any>; // Default: {}
  
  quantity_package?: number;      // Default: 0
  quantity_on_hand: number;       // Requis
  quantity_reserved?: number;     // Default: 0
  quantity_available?: number;    // Calculé automatiquement
  
  ideal_stock_level?: number;     // Default: 0
  min_stock_threshold?: number;   // Default: 0
  qt_moy_appro?: string;          // Default: "0"
  stock_turnover_rate?: number;   // Default: 0
  
  last_restocked?: string;        // Default: now()
  stock_status?: StockStatus;      // Default: 'in_stock'
  
  // Relations (IDs) - Requis
  product: number;
  store: number;
  warehouse: number;
}

export interface UpdateStockData {
  is_active?: boolean;
  metadata?: Record<string, any>;
  quantity_package?: number;
  quantity_on_hand?: number;
  quantity_reserved?: number;
  quantity_available?: number;
  ideal_stock_level?: number;
  min_stock_threshold?: number;
  qt_moy_appro?: string;
  stock_turnover_rate?: number;
  last_restocked?: string;
  stock_status?: StockStatus;
  product?: number;
  store?: number;
  warehouse?: number;
}

// =============================================================================
// RÉPONSES PAGINÉES
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  page_size?: number;
  next?: string | null;
  previous?: string | null;
}

// =============================================================================
// CONFIGURATION DES STATUTS
// =============================================================================

export const STOCK_STATUS_CONFIG: Record<StockStatus, { color: string; text: string; icon: string; badgeClass: string }> = {
  'in_stock': {
    color: 'green',
    text: 'En stock',
    icon: '✅',
    badgeClass: 'bg-green-100 text-green-800 border-green-200'
  },
  'low_stock': {
    color: 'yellow',
    text: 'Stock bas',
    icon: '⚠️',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'out_of_stock': {
    color: 'red',
    text: 'Rupture',
    icon: '❌',
    badgeClass: 'bg-red-100 text-red-800 border-red-200'
  },
  'over_stock': {
    color: 'blue',
    text: 'Surstock',
    icon: '📦',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  }
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Calcule la quantité disponible
 */
export const calculateAvailable = (onHand: number, reserved: number): number => {
  return Math.max(0, onHand - reserved);
};

/**
 * Détermine le statut du stock en fonction des quantités
 */
export const determineStockStatus = (
  quantity: number,
  minThreshold: number,
  idealLevel: number
): StockStatus => {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity < minThreshold) return 'low_stock';
  if (quantity > idealLevel * 2) return 'over_stock';
  return 'in_stock';
};

/**
 * Vérifie si une quantité est valide (pas le max int)
 */
export const isValidQuantity = (quantity: number): boolean => {
  return quantity < 2147483647; // Max int de PostgreSQL
};

/**
 * Formate un stock pour l'affichage
 */
export const formatStockForDisplay = (stock: Stock) => {
  const config = STOCK_STATUS_CONFIG[stock.stock_status] || STOCK_STATUS_CONFIG.in_stock;
  
  const progressPercentage = stock.ideal_stock_level > 0 
    ? Math.min(100, (stock.quantity_available / stock.ideal_stock_level) * 100)
    : 0;

  return {
    statusColor: config.badgeClass,
    statusText: config.text,
    statusIcon: config.icon,
    needsRestock: stock.stock_status === 'low_stock' || stock.stock_status === 'out_of_stock',
    progressPercentage: Math.round(progressPercentage * 10) / 10,
    isOverStock: stock.stock_status === 'over_stock',
    isLowStock: stock.stock_status === 'low_stock',
    isOutOfStock: stock.stock_status === 'out_of_stock',
    isInStock: stock.stock_status === 'in_stock',
    hasValidQuantities: isValidQuantity(stock.quantity_on_hand) && isValidQuantity(stock.quantity_available)
  };
};

/**
 * Calcule le niveau de remplissage par rapport à l'idéal
 */
export const getStockLevelPercentage = (stock: Stock): number => {
  if (!stock.ideal_stock_level || stock.ideal_stock_level <= 0) return 0;
  return Math.min(100, (stock.quantity_available / stock.ideal_stock_level) * 100);
};

/**
 * Guard de type
 */
export const isValidStock = (obj: any): obj is Stock => {
  return (
    obj &&
    typeof obj.product === 'number' &&
    typeof obj.store === 'number' &&
    typeof obj.warehouse === 'number' &&
    typeof obj.quantity_on_hand === 'number' &&
    typeof obj.stock_status === 'string'
  );
};