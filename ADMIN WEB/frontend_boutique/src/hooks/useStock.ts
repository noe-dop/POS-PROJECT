// src/hooks/useStock.ts
// HOOK RÉEL POUR LA GESTION DES STOCKS AVEC L'API
import { useState, useEffect, useCallback, useRef } from 'react';
import StockService, { Stock, StockStats, StockFilters } from '@/services/StockService';

export interface UseStockOptions {
  storeId?: number;
  warehouseId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialLoad?: boolean;
}

export interface UseStockReturn {
  // Données
  stocks: Stock[];
  stockStats: StockStats | null;
  
  // États
  loading: {
    stocks: boolean;
    stats: boolean;
    all: boolean;
  };
  error: {
    message: string;
    details?: any;
    timestamp?: string;
  } | null;
  apiStatus: string;
  hasData: boolean;
  lastUpdated: string | null;
  
  // Actions
  fetchStocks: (filters?: StockFilters) => Promise<void>;
  fetchStats: (params?: { storeId?: number; warehouseId?: number }) => Promise<StockStats>;
  refreshAll: () => Promise<void>;
  resetError: () => void;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  
  // Utilitaires
  getLowStockProducts: () => Stock[];
  getProductStock: (productId: number) => Stock | undefined;
  calculateStockValue: () => number;
  
  // États dérivés
  isLoading: boolean;
  hasError: boolean;
}

export const useStock = (options: UseStockOptions = {}): UseStockReturn => {
  const { 
    storeId, 
    warehouseId,
    autoRefresh = false, 
    refreshInterval = 60000, // 60 secondes
    initialLoad = true 
  } = options;

  // Références
  const isInitialMount = useRef(true);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // États
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockStats, setStockStats] = useState<StockStats | null>(null);
  
  const [loading, setLoading] = useState({
    stocks: false,
    stats: false,
    all: false
  });

  const [error, setError] = useState<{ 
    message: string; 
    details?: any;
    timestamp?: string;
  } | null>(null);

  const [apiStatus, setApiStatus] = useState<string>('Connexion en cours...');
  const [hasData, setHasData] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // ==================== FONCTIONS API ====================

  const fetchStocks = useCallback(async (filters?: StockFilters): Promise<void> => {
    if (!mountedRef.current) return;
    
    setLoading(prev => ({ ...prev, stocks: true }));
    setError(null);
    
    try {
      const baseFilters: StockFilters = {
        ...filters,
        store: storeId,
        warehouse: warehouseId,
        page_size: 100
      };

      const result = await StockService.getStocks(baseFilters);
      
      if (mountedRef.current) {
        setStocks(result.data);
        setHasData(result.data.length > 0);
        setLastUpdated(new Date().toISOString());
        
        if (result.data.length === 0) {
          console.log('⚠️ Aucun stock trouvé avec les filtres:', baseFilters);
        }
      }
      
    } catch (err: any) {
      console.error('❌ Erreur fetchStocks:', err);
      
      if (mountedRef.current) {
        setError({ 
          message: 'Impossible de charger les stocks',
          details: err.message,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(prev => ({ ...prev, stocks: false }));
      }
    }
  }, [storeId, warehouseId]);

  const fetchStats = useCallback(async (params?: { 
    storeId?: number; 
    warehouseId?: number 
  }): Promise<StockStats> => {
    if (!mountedRef.current) {
      return {
        totalProducts: 0,
        totalStock: 0,
        outOfStock: 0,
        lowStock: 0
      };
    }
    
    setLoading(prev => ({ ...prev, stats: true }));
    
    try {
      const stats = await StockService.getStats({
        store: params?.storeId || storeId,
        warehouse: params?.warehouseId || warehouseId
      });
      
      if (mountedRef.current) {
        setStockStats(stats);
      }
      
      return stats;
      
    } catch (err: any) {
      console.error('❌ Erreur fetchStats:', err);
      
      // Fallback: calculer localement
      const localStats: StockStats = {
        totalProducts: stocks.length,
        totalStock: stocks.reduce((sum, stock) => sum + (stock.quantity_on_hand || 0), 0),
        outOfStock: stocks.filter(s => s.stock_status === 'out_of_stock').length,
        lowStock: stocks.filter(s => s.stock_status === 'low_stock').length
      };
      
      if (mountedRef.current) {
        setStockStats(localStats);
      }
      
      return localStats;
      
    } finally {
      if (mountedRef.current) {
        setLoading(prev => ({ ...prev, stats: false }));
      }
    }
  }, [storeId, warehouseId, stocks]);

  // ==================== GESTION CONNEXION ====================

  const testConnection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await StockService.testConnection();
      setApiStatus(result.message);
      return result;
    } catch (err: any) {
      const message = 'Impossible de contacter le serveur';
      setApiStatus(message);
      return { success: false, message };
    }
  }, []);

  const loadInitialData = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    
    setLoading(prev => ({ ...prev, all: true }));
    setError(null);
    setApiStatus('Chargement des données...');
    
    try {
      const connection = await testConnection();
      
      if (!connection.success) {
        setApiStatus('Connexion limitée à l\'API');
        return;
      }

      await Promise.all([
        fetchStocks(),
        fetchStats()
      ]);
      
      if (mountedRef.current) {
        setApiStatus(`Connecté - ${stocks.length} stocks chargés`);
      }
      
    } catch (err: any) {
      console.error('💥 Erreur loadInitialData:', err);
      
      if (mountedRef.current) {
        setError({
          message: 'Erreur lors du chargement des données',
          details: err.message,
          timestamp: new Date().toISOString()
        });
        setApiStatus('Erreur de chargement');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(prev => ({ ...prev, all: false }));
      }
    }
  }, [fetchStocks, fetchStats, testConnection, stocks.length]);

  const refreshAll = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;
    
    setApiStatus('Rafraîchissement...');
    setError(null);
    
    try {
      await Promise.all([
        fetchStocks(),
        fetchStats()
      ]);
      
      if (mountedRef.current) {
        setApiStatus(`Rafraîchi - ${stocks.length} stocks`);
        setLastUpdated(new Date().toISOString());
      }
      
    } catch (err: any) {
      console.error('❌ Erreur refreshAll:', err);
      
      if (mountedRef.current) {
        setApiStatus('Erreur de rafraîchissement');
      }
    }
  }, [fetchStocks, fetchStats, stocks.length]);

  // ==================== UTILITAIRES ====================

  const getLowStockProducts = useCallback((): Stock[] => {
    return stocks.filter(stock => 
      stock.stock_status === 'low_stock' || 
      stock.stock_status === 'out_of_stock' ||
      (stock.quantity_available <= stock.min_stock_threshold)
    );
  }, [stocks]);

  const getProductStock = useCallback((productId: number): Stock | undefined => {
    return stocks.find(stock => stock.product === productId);
  }, [stocks]);

  const calculateStockValue = useCallback((): number => {
    return stocks.reduce((total, stock) => {
      let costPrice = 0;
      
      if (stock.product_details?.cost_price) {
        costPrice = stock.product_details.cost_price;
      }
      
      const quantity = stock.quantity_on_hand || 0;
      return total + (quantity * costPrice);
    }, 0);
  }, [stocks]);

  const resetError = useCallback((): void => {
    setError(null);
  }, []);

  // ==================== EFFETS ====================

  // Nettoyage
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  // Chargement initial
  useEffect(() => {
    if (initialLoad && isInitialMount.current && mountedRef.current) {
      loadInitialData();
      isInitialMount.current = false;
    }
  }, [initialLoad, loadInitialData]);

  // Rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh && hasData && mountedRef.current) {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
      
      autoRefreshRef.current = setInterval(() => {
        if (mountedRef.current) {
          fetchStocks();
          fetchStats();
        }
      }, refreshInterval);
      
      return () => {
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
          autoRefreshRef.current = null;
        }
      };
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, [autoRefresh, refreshInterval, hasData, fetchStocks, fetchStats]);

  // Rechargement quand storeId ou warehouseId change
  useEffect(() => {
    if (!isInitialMount.current && mountedRef.current) {
      refreshAll();
    }
  }, [storeId, warehouseId, refreshAll]);

  // ==================== RETURN ====================

  return {
    // Données
    stocks,
    stockStats,
    
    // États
    loading,
    error,
    apiStatus,
    hasData,
    lastUpdated,
    
    // Actions
    fetchStocks,
    fetchStats,
    refreshAll,
    resetError,
    testConnection,
    
    // Utilitaires
    getLowStockProducts,
    getProductStock,
    calculateStockValue,
    
    // États dérivés
    isLoading: loading.all || loading.stocks || loading.stats,
    hasError: error !== null
  };
};

export default useStock;