// src/hooks/useStock.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback } from 'react';
import StockService from '@/services/StockService';
import { 
  Stock, 
  StockMovement, 
  InventoryCount,
  ReorderRule,
  Warehouse,
  Batch,
  StockStats
} from '@/types/stock.types';

interface UseStockOptions {
  storeId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useStock = (options: UseStockOptions = {}) => {
  const { storeId, autoRefresh = false, refreshInterval = 30000 } = options;

  // États pour les données
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockStats, setStockStats] = useState<StockStats | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);
  const [reorderRules, setReorderRules] = useState<ReorderRule[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // États pour le chargement et les erreurs
  const [loading, setLoading] = useState({
    stocks: false,
    stats: false,
    movements: false,
    inventoryCounts: false,
    reorderRules: false,
    warehouses: false,
    batches: false,
    alerts: false,
  });
  
  const [error, setError] = useState<{ message: string; details?: any } | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('🟡 Connexion en cours...');
  const [availableEndpoints, setAvailableEndpoints] = useState<string[]>([]);

  // ==================== FONCTIONS DE RÉCUPÉRATION ROBUSTES ====================

  const fetchStocks = useCallback(async (params?: any) => {
    setLoading(prev => ({ ...prev, stocks: true }));
    
    try {
      const result = await StockService.getStocks({ 
        store_id: storeId,
        ...params 
      });
      setStocks(result.data);
      
      if (result.data.length > 0) {
        setAvailableEndpoints(prev => [...new Set([...prev, '/stocks/'])]);
      }
      
      return result;
    } catch (err: any) {
      console.warn('⚠️ Erreur récupération stocks:', err.message);
      // Ne pas afficher d'erreur pour cette requête
      return { data: [], total: 0 };
    } finally {
      setLoading(prev => ({ ...prev, stocks: false }));
    }
  }, [storeId]);

  const fetchStockStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    
    try {
      const stats = await StockService.getStockStats(storeId);
      setStockStats(stats);
      
      if (stats.totalProducts > 0) {
        setAvailableEndpoints(prev => [...new Set([...prev, '/stocks/stats/'])]);
      }
      
      return stats;
    } catch (err: any) {
      console.warn('⚠️ Erreur récupération stats:', err.message);
      // Calculer les stats localement
      return {
        totalProducts: stocks.length,
        totalStock: stocks.reduce((sum, stock) => sum + (stock.quantity_available || 0), 0),
        outOfStock: stocks.filter(s => s.stock_status === 'out_of_stock').length,
        lowStock: stocks.filter(s => s.stock_status === 'low_stock').length,
        totalValue: stocks.reduce((sum, stock) => 
          sum + ((stock.quantity_on_hand || 0) * (stock.product?.cost_price || 0)), 0
        ),
        averageStockValue: 0
      };
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, [storeId, stocks]);

  const fetchMovements = useCallback(async (params?: any) => {
    setLoading(prev => ({ ...prev, movements: true }));
    
    try {
      const result = await StockService.getStockMovements({ 
        store_id: storeId,
        ...params 
      });
      setMovements(result.data);
      
      if (result.data.length > 0) {
        setAvailableEndpoints(prev => [...new Set([...prev, '/stock-movements/'])]);
      }
      
      return result;
    } catch (err: any) {
      console.warn('⚠️ Endpoint mouvements non disponible');
      // Retourner des données vides
      return { data: [], total: 0 };
    } finally {
      setLoading(prev => ({ ...prev, movements: false }));
    }
  }, [storeId]);

  // Fonctions avec gestion d'erreurs silencieuse pour endpoints optionnels
  const fetchOptionalData = useCallback(async (endpoint: string, fetchFunction: Function) => {
    try {
      const result = await fetchFunction();
      if (result.data?.length > 0 || result.length > 0) {
        setAvailableEndpoints(prev => [...new Set([...prev, endpoint])]);
      }
      return result;
    } catch (err: any) {
      // Ignorer silencieusement les erreurs 404 pour les endpoints optionnels
      if (err.response?.status === 404) {
        console.log(`ℹ️ Endpoint ${endpoint} non disponible (optionnel)`);
      } else {
        console.warn(`⚠️ Erreur ${endpoint}:`, err.message);
      }
      return { data: [], total: 0 };
    }
  }, []);

  // ==================== CHARGEMENT INITIAL INTELLIGENT ====================

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🔄 Démarrage chargement données stock...');
      
      try {
        // Tester la connexion API d'abord
        const testResult = await StockService.testConnection();
        setApiStatus(testResult.message);
        
        if (!testResult.success) {
          setError({ message: testResult.message });
          return;
        }

        // Charger les données essentielles
        const essentialPromises = [
          fetchStocks({ page_size: 100 }),
          fetchMovements({ page_size: 20 }),
          fetchStockStats()
        ];

        // Charger les données optionnelles (sans bloquer)
        const optionalPromises = [
          fetchOptionalData('/warehouses/', () => StockService.getWarehouses({ store_id: storeId })),
          fetchOptionalData('/inventory-counts/', () => StockService.getInventoryCounts({ store_id: storeId })),
          fetchOptionalData('/reorder-rules/', () => StockService.getReorderRules({ store_id: storeId })),
          fetchOptionalData('/batches/', () => StockService.getBatches({ store_id: storeId })),
          fetchOptionalData('/stock-alerts/', () => StockService.getStockAlerts({ store_id: storeId }))
        ];

        await Promise.all(essentialPromises);
        
        // Lancer les optionnelles en arrière-plan
        Promise.allSettled(optionalPromises).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              const endpoint = [
                '/warehouses/',
                '/inventory-counts/',
                '/reorder-rules/',
                '/batches/',
                '/stock-alerts/'
              ][index];
              console.log(`✅ Données ${endpoint} chargées (optionnel)`);
            }
          });
        });

        console.log('✅ Données essentielles chargées avec succès');
        console.log('📋 Endpoints disponibles:', availableEndpoints);
        
        // Mettre à jour le statut
        if (stocks.length > 0) {
          setApiStatus(`🟢 Connecté - ${stocks.length} produits chargés`);
        } else {
          setApiStatus('🟡 Connecté - Aucun produit trouvé');
        }

      } catch (err: any) {
        console.error('💥 Erreur critique lors du chargement:', err);
        
        // Ne pas afficher d'erreur pour les endpoints manquants
        if (!err.message?.includes('404')) {
          setError({ 
            message: 'Impossible de charger les données essentielles',
            details: err 
          });
        }
        
        setApiStatus('🔴 Erreur de connexion');
      }
    };

    loadInitialData();
  }, []); // Exécuter une seule fois au montage

  // ==================== UTILITAIRES POUR L'UI ====================

  const getLowStockProducts = useCallback(() => {
    return stocks.filter(stock => 
      stock.stock_status === 'low_stock' || stock.stock_status === 'out_of_stock'
    );
  }, [stocks]);

  const getProductStock = useCallback((productId: number) => {
    return stocks.find(stock => stock.product?.id === productId);
  }, [stocks]);

  const calculateStockValue = useCallback(() => {
    return stocks.reduce((total, stock) => {
      const costPrice = stock.product?.cost_price || 0;
      return total + ((stock.quantity_on_hand || 0) * costPrice);
    }, 0);
  }, [stocks]);

  // ==================== ACTIONS AVEC GESTION D'ERREURS ====================

  const createStockMovement = useCallback(async (movementData: any) => {
    setError(null);
    
    try {
      const result = await StockService.createStockMovement({
        ...movementData,
        store_id: storeId || movementData.store_id
      });
      
      // Rafraîchir les données après création
      await fetchStocks();
      await fetchMovements();
      
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de la création du mouvement';
      setError({ message: errorMsg, details: err });
      throw err;
    }
  }, [storeId, fetchStocks, fetchMovements]);

  // ==================== RECHARGEMENT AUTOMATIQUE ====================

  useEffect(() => {
    if (autoRefresh && stocks.length > 0) {
      const interval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des données');
        fetchStocks();
        fetchMovements();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchStocks, fetchMovements, stocks.length]);

  // ==================== VALEURS RETOURNÉES ====================

  return {
    // Données principales
    stocks,
    stockStats,
    movements,
    
    // Données optionnelles
    inventoryCounts,
    reorderRules,
    warehouses,
    batches,
    alerts,
    
    // Métadonnées
    loading,
    error,
    apiStatus,
    availableEndpoints,
    
    // Actions principales
    fetchStocks,
    fetchStockStats,
    fetchMovements,
    createStockMovement,
    
    // Utilitaires pour l'UI
    getLowStockProducts,
    getProductStock,
    calculateStockValue,
    
    // État global
    isLoading: loading.stocks || loading.stats || loading.movements,
    hasError: error !== null,
    hasData: stocks.length > 0,
    
    // Réinitialisation
    resetError: () => setError(null),
    refreshAll: async () => {
      console.log('🔄 Rafraîchissement manuel des données');
      await Promise.all([
        fetchStocks(),
        fetchStockStats(),
        fetchMovements()
      ]);
    }
  };
};