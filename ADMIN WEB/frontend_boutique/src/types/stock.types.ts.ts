// src/types/stock.types.ts
// TYPES POUR LE STOCK ALIGNÉS SUR VOTRE MODÈLE DJANGO

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'over_stock';

export interface Stock {
  warehouse_details: any;
  warehouse_details: any;
  store_details: any;
  id: number;
  is_active: boolean;
  metadata: Record<string, any>;
  quantity_package: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  ideal_stock_level: number;
  min_stock_threshold: number;
  qt_moy_appro: string;
  stock_turnover_rate: number;
  last_restocked: string;
  stock_status: StockStatus;
  product: number;
  store: number;
  warehouse: number;
  
  // Champs de jointure pour affichage
  product_name?: string;
  product_sku?: string;
  store_name?: string;
  warehouse_name?: string;
  product_details?: {
    name: string;
    sku: string;
    category?: string;
    cost_price?: number;
    base_price?: number;
    unit?: string;
  };
}

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
}

export interface CreateStockData {
  product: number;
  store: number;
  warehouse: number;
  quantity_on_hand: number;
  quantity_reserved?: number;
  quantity_package?: number;
  ideal_stock_level?: number;
  min_stock_threshold?: number;
  qt_moy_appro?: string;
  stock_turnover_rate?: number;
  last_restocked?: string;
  stock_status?: StockStatus;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateStockData {
  quantity_on_hand?: number;
  quantity_reserved?: number;
  quantity_package?: number;
  ideal_stock_level?: number;
  min_stock_threshold?: number;
  qt_moy_appro?: string;
  stock_turnover_rate?: number;
  last_restocked?: string;
  stock_status?: StockStatus;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  page_size?: number;
  next?: string | null;
  previous?: string | null;
}

// Fonction utilitaire pour formater l'affichage
export const formatStockForDisplay = (stock: Stock) => {
  const statusConfigs = {
    'out_of_stock': { color: 'red', text: 'Rupture', icon: '❌' },
    'low_stock': { color: 'yellow', text: 'Stock bas', icon: '⚠️' },
    'in_stock': { color: 'green', text: 'En stock', icon: '✅' },
    'over_stock': { color: 'blue', text: 'Surstock', icon: '📦' }
  };

  const config = statusConfigs[stock.stock_status] || statusConfigs.in_stock;
  
  const progressPercentage = stock.ideal_stock_level > 0 
    ? Math.min(100, (stock.quantity_available / stock.ideal_stock_level) * 100)
    : 0;

  return {
    statusColor: `bg-${config.color}-100 text-${config.color}-800 border border-${config.color}-200`,
    statusText: config.text,
    statusIcon: config.icon,
    needsRestock: stock.stock_status === 'low_stock' || stock.stock_status === 'out_of_stock',
    progressPercentage: Math.round(progressPercentage * 10) / 10
  };
};