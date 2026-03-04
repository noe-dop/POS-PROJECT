// src/hooks/useSupply.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback, useRef } from 'react';
import supplyService from '../services/supplyService';
import { 
  Supply, 
  Supplier, 
  Store,
  RetailSupply,
  CreateSupplyData,
  CreateSupplierData,
  CreateRetailSupplyData,
  UpdateSupplyData,
  SupplyStats,
  SupplyFilters as ServiceSupplyFilters
} from '../services/supplyService';

// ============================================================================
// TYPES
// ============================================================================

export interface SupplyFilters {
  status?: string;
  supplier?: number | 'all';
  store?: number | 'all';
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

export interface LocalSupply extends Supply {
  progress?: number;
  items_count?: number;
  items_received?: number;
}

export interface UseSuppliesReturn {
  supplies: LocalSupply[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createSupply: (data: CreateSupplyData) => Promise<Supply>;
  updateSupply: (id: number, data: UpdateSupplyData) => Promise<Supply>;
  updateSupplyStatus: (id: number, status: Supply['status']) => Promise<Supply>;
  deleteSupply: (id: number) => Promise<void>;
  // Méthodes pour RetailSupply
  createRetailSupply: (data: CreateRetailSupplyData) => Promise<RetailSupply>;
  createMultipleRetailSupplies: (supplyId: number, items: Omit<CreateRetailSupplyData, 'supply'>[]) => Promise<RetailSupply[]>;
  getRetailSupplies: (supplyId: number) => Promise<RetailSupply[]>;
  // Actions de chargement
  actionLoading: {
    creating: boolean;
    updating: number | null;
    deleting: number | null;
    addingItem: boolean;
    loadingItems: number | null;
  };
  // Messages
  successMessage: string | null;
  errorMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  // Utilitaires
  getSupplyById: (id: number) => LocalSupply | undefined;
  calculateProgress: (supply: Supply, items?: RetailSupply[]) => number;
}

export interface UseSuppliersReturn {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSupplier: (data: CreateSupplierData) => Promise<Supplier>;
  deleteSupplier: (id: number) => Promise<void>;
}

export interface UseStoresReturn {
  stores: Store[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getStoreById: (id: number) => Store | undefined;
  getStoreName: (id: number) => string;
}

export interface UseSupplyStatsReturn {
  stats: SupplyStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface CreateFullSupplyData {
  supply: CreateSupplyData;
  items: Omit<CreateRetailSupplyData, 'supply'>[];
}

// ============================================================================
// HOOK UTILITAIRE
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// HOOK POUR LES APPROVISIONNEMENTS
// ============================================================================

export const useSupplies = (initialFilters?: SupplyFilters): UseSuppliesReturn => {
  const [supplies, setSupplies] = useState<LocalSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // États de chargement des actions
  const [actionLoading, setActionLoading] = useState({
    creating: false,
    updating: null as number | null,
    deleting: null as number | null,
    addingItem: false,
    loadingItems: null as number | null
  });

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cache pour les items
  const itemsCache = useRef<Record<number, RetailSupply[]>>({});
  const filtersRef = useRef(initialFilters);
  const initialFetchDone = useRef(false);
  const isMounted = useRef(true);

  // Nettoyage
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================
  // RÉCUPÉRATION DES DONNÉES
  // ============================================
  const fetchSupplies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: Record<string, any> = {};
      const filters = filtersRef.current;
      
      if (filters?.search) params.search = filters.search;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.store && filters.store !== 'all' && filters.store !== 0) params.store = Number(filters.store);
      if (filters?.supplier && filters.supplier !== 'all') params.supplier = Number(filters.supplier);
      if (filters?.start_date) params.start_date = filters.start_date;
      if (filters?.end_date) params.end_date = filters.end_date;
      if (filters?.page) params.page = filters.page;
      if (filters?.pageSize) params.page_size = filters.pageSize;
      
      console.log('🔍 Chargement approvisionnements...', params);
      
      const response = await supplyService.getSupplies(params);
      
      let suppliesData: Supply[] = [];
      let count = 0;
      
      if (Array.isArray(response)) {
        suppliesData = response;
        count = response.length;
      } else if (response && typeof response === 'object' && 'results' in response) {
        const paginated = response as { results: Supply[]; count: number };
        suppliesData = paginated.results || [];
        count = paginated.count || 0;
      }
      
      // Ajouter la progression
      const suppliesWithProgress: LocalSupply[] = suppliesData.map(supply => {
        const items = itemsCache.current[supply.id] || [];
        const totalItems = items.length;
        const receivedItems = items.filter(i => i.qt_add > 0).length;
        
        return {
          ...supply,
          progress: totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0,
          items_count: totalItems,
          items_received: receivedItems
        };
      });
      
      if (isMounted.current) {
        setSupplies(suppliesWithProgress);
        setTotalCount(count);
      }
      
    } catch (err) {
      console.error('❌ Erreur useSupplies:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
        setSupplies([]);
        setTotalCount(0);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchSupplies();
    }
  }, [fetchSupplies]);

  // Mise à jour des filtres
  useEffect(() => {
    filtersRef.current = initialFilters;
  }, [initialFilters]);

  // Rechargement quand les filtres changent
  useEffect(() => {
    if (initialFetchDone.current) {
      fetchSupplies();
    }
  }, [initialFilters?.status, initialFilters?.store, initialFilters?.supplier, initialFilters?.search]);

  // ============================================
  // MÉTHODES POUR SUPPLY
  // ============================================
  const createSupply = async (data: CreateSupplyData): Promise<Supply> => {
    setActionLoading(prev => ({ ...prev, creating: true }));
    setErrorMessage(null);
    
    try {
      console.log('📤 Création supply:', data);
      
      const cleanedData = {
        ...data,
        store: Number(data.store),
        utilisateur: Number(data.utilisateur),
        total_command: Number(data.total_command),
        supplier: data.supplier && data.supplier > 0 ? Number(data.supplier) : null
      };
      
      const result = await supplyService.createSupply(cleanedData);
      await fetchSupplies();
      
      setSuccessMessage('Approvisionnement créé avec succès');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return result;
    } catch (err) {
      console.error('❌ Erreur createSupply:', err);
      const message = err instanceof Error ? err.message : 'Erreur création';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setActionLoading(prev => ({ ...prev, creating: false }));
    }
  };

  const updateSupply = async (id: number, data: UpdateSupplyData): Promise<Supply> => {
    setActionLoading(prev => ({ ...prev, updating: id }));
    setErrorMessage(null);
    
    try {
      const result = await supplyService.updateSupply(id, data);
      await fetchSupplies();
      
      setSuccessMessage('Approvisionnement mis à jour');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur mise à jour';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setActionLoading(prev => ({ ...prev, updating: null }));
    }
  };

  const updateSupplyStatus = async (id: number, status: Supply['status']): Promise<Supply> => {
    setActionLoading(prev => ({ ...prev, updating: id }));
    setErrorMessage(null);
    
    try {
      const result = await supplyService.updateSupplyStatus(id, status);
      await fetchSupplies();
      
      setSuccessMessage(`Statut mis à jour: ${status}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur mise à jour statut';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setActionLoading(prev => ({ ...prev, updating: null }));
    }
  };

  const deleteSupply = async (id: number): Promise<void> => {
    setActionLoading(prev => ({ ...prev, deleting: id }));
    setErrorMessage(null);
    
    try {
      await supplyService.deleteSupply(id);
      delete itemsCache.current[id];
      await fetchSupplies();
      
      setSuccessMessage('Approvisionnement supprimé');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur suppression';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setActionLoading(prev => ({ ...prev, deleting: null }));
    }
  };

  // ============================================
  // MÉTHODES POUR RETAIL SUPPLY
  // ============================================
  const createRetailSupply = async (data: CreateRetailSupplyData): Promise<RetailSupply> => {
    setActionLoading(prev => ({ ...prev, addingItem: true }));
    setErrorMessage(null);
    
    try {
      console.log('📦 Création retail supply:', data);
      
      const cleanedData = {
        ...data,
        ref: Number(data.ref),
        qt_add: Number(data.qt_add),
        total_pdx: Number(data.total_pdx),
        supply: Number(data.supply)
      };
      
      const result = await supplyService.createRetailSupply(cleanedData);
      
      // Mettre à jour le cache
      const currentItems = itemsCache.current[data.supply] || [];
      itemsCache.current[data.supply] = [...currentItems, result];
      
      // Mettre à jour la progression
      setSupplies(prev => prev.map(s => {
        if (s.id === data.supply) {
          const newItems = itemsCache.current[data.supply];
          const received = newItems.filter(i => i.qt_add > 0).length;
          return {
            ...s,
            progress: Math.round((received / newItems.length) * 100),
            items_count: newItems.length,
            items_received: received
          };
        }
        return s;
      }));
      
      setSuccessMessage('Article ajouté');
      setTimeout(() => setSuccessMessage(null), 2000);
      
      return result;
    } catch (err) {
      console.error('❌ Erreur createRetailSupply:', err);
      const message = err instanceof Error ? err.message : 'Erreur création produit lié';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setActionLoading(prev => ({ ...prev, addingItem: false }));
    }
  };

  const createMultipleRetailSupplies = async (
    supplyId: number, 
    items: Omit<CreateRetailSupplyData, 'supply'>[]
  ): Promise<RetailSupply[]> => {
    setActionLoading(prev => ({ ...prev, addingItem: true }));
    setErrorMessage(null);
    
    try {
      console.log(`📦 Création de ${items.length} produits liés pour supply ${supplyId}`);
      
      const results: RetailSupply[] = [];
      
      for (const item of items) {
        const retailSupply = await supplyService.createRetailSupply({
          ...item,
          supply: supplyId
        });
        results.push(retailSupply);
      }
      
      // Mettre à jour le cache
      itemsCache.current[supplyId] = results;
      
      // Mettre à jour la progression
      setSupplies(prev => prev.map(s => {
        if (s.id === supplyId) {
          const received = results.filter(i => i.qt_add > 0).length;
          return {
            ...s,
            progress: Math.round((received / results.length) * 100),
            items_count: results.length,
            items_received: received
          };
        }
        return s;
      }));
      
      setSuccessMessage(`${results.length} article(s) ajouté(s)`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return results;
    } catch (err) {
      console.error('❌ Erreur createMultipleRetailSupplies:', err);
      const message = err instanceof Error ? err.message : 'Erreur création multiple';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setActionLoading(prev => ({ ...prev, addingItem: false }));
    }
  };

  const getRetailSupplies = async (supplyId: number): Promise<RetailSupply[]> => {
    // Vérifier le cache
    if (itemsCache.current[supplyId]) {
      return itemsCache.current[supplyId];
    }
    
    setActionLoading(prev => ({ ...prev, loadingItems: supplyId }));
    
    try {
      console.log(`📋 Chargement des produits liés pour supply ${supplyId}`);
      const result = await supplyService.getRetailSupplies(supplyId);
      
      itemsCache.current[supplyId] = result;
      
      // Mettre à jour la progression
      setSupplies(prev => prev.map(s => {
        if (s.id === supplyId) {
          const received = result.filter(i => i.qt_add > 0).length;
          return {
            ...s,
            progress: Math.round((received / result.length) * 100),
            items_count: result.length,
            items_received: received
          };
        }
        return s;
      }));
      
      return result;
    } catch (err) {
      console.error('❌ Erreur getRetailSupplies:', err);
      throw new Error(err instanceof Error ? err.message : 'Erreur chargement produits liés');
    } finally {
      setActionLoading(prev => ({ ...prev, loadingItems: null }));
    }
  };

  // ============================================
  // UTILITAIRES
  // ============================================

  const getSupplyById = useCallback((id: number): LocalSupply | undefined => {
    return supplies.find(s => s.id === id);
  }, [supplies]);

  const calculateProgress = useCallback((supply: Supply, items?: RetailSupply[]) => {
    const itemsList = items || itemsCache.current[supply.id] || [];
    if (itemsList.length === 0) return 0;
    const received = itemsList.filter(i => i.qt_add > 0).length;
    return Math.round((received / itemsList.length) * 100);
  }, []);

  return {
    supplies,
    loading,
    error,
    totalCount,
    refetch: fetchSupplies,
    createSupply,
    updateSupply,
    updateSupplyStatus,
    deleteSupply,
    createRetailSupply,
    createMultipleRetailSupplies,
    getRetailSupplies,
    actionLoading,
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage,
    getSupplyById,
    calculateProgress
  };
};

// ============================================================================
// HOOK POUR LES FOURNISSEURS
// ============================================================================

export const useSuppliers = (search?: string, storeId?: number): UseSuppliersReturn => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedSearch = useDebounce(search, 300);
  const initialFetchDone = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: Record<string, any> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (storeId) params.store = Number(storeId);
      
      console.log('📞 Chargement fournisseurs...', params);
      
      const data = await supplyService.getSuppliers(params);
      
      if (isMounted.current) {
        setSuppliers(Array.isArray(data) ? data : []);
      }
      
    } catch (err) {
      console.error('❌ Erreur useSuppliers:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erreur chargement');
        setSuppliers([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, storeId]);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchSuppliers();
    }
  }, [fetchSuppliers]);

  const createSupplier = async (data: CreateSupplierData): Promise<Supplier> => {
    try {
      const result = await supplyService.createSupplier({
        ...data,
        store: Number(data.store)
      });
      await fetchSuppliers();
      return result;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur création');
    }
  };

  const deleteSupplier = async (id: number): Promise<void> => {
    try {
      await supplyService.deleteSupplier(id);
      await fetchSuppliers();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erreur suppression');
    }
  };

  return {
    suppliers,
    loading,
    error,
    refetch: fetchSuppliers,
    createSupplier,
    deleteSupplier
  };
};

// ============================================================================
// HOOK POUR LES MAGASINS
// ============================================================================

export const useStores = (): UseStoresReturn => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const initialFetchDone = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏪 Chargement magasins...');
      
      const data = await supplyService.getStores();
      
      if (isMounted.current) {
        setStores(Array.isArray(data) ? data : []);
      }
      
    } catch (err) {
      console.error('❌ Erreur useStores:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erreur chargement');
        setStores([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchStores();
    }
  }, [fetchStores]);

  const getStoreById = (id: number): Store | undefined => {
    return stores.find(s => s.id === id);
  };

  const getStoreName = (id: number): string => {
    const store = getStoreById(id);
    return store?.name || `Magasin ${id}`;
  };

  return {
    stores,
    loading,
    error,
    refetch: fetchStores,
    getStoreById,
    getStoreName
  };
};

// ============================================================================
// HOOK POUR LES STATISTIQUES
// ============================================================================

export const useSupplyStats = (autoFetch: boolean = true): UseSupplyStatsReturn => {
  const [stats, setStats] = useState<SupplyStats>({
    total_pending: 0,
    total_received: 0,
    total_cancelled: 0,
    total_supplies: 0,
    total_amount: 0,
    monthly_trend: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const initialFetchDone = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await supplyService.getSupplyStats();
      
      if (isMounted.current) {
        setStats(data);
      }
      
    } catch (err) {
      console.error('Erreur stats:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (autoFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchStats();
    }
  }, [autoFetch, fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

// ============================================================================
// HOOK COMBINÉ POUR UN APPROVISIONNEMENT COMPLET
// ============================================================================

export const useCreateFullSupply = () => {
  const { createSupply, createMultipleRetailSupplies } = useSupplies();

  const createFullSupply = useCallback(async (data: CreateFullSupplyData) => {
    try {
      console.log('🚀 Création approvisionnement complet:', data);
      
      // 1. Créer le Supply
      const newSupply = await createSupply(data.supply);
      
      // 2. Créer les RetailSupply
      const retailItems = await createMultipleRetailSupplies(newSupply.id, data.items);
      
      console.log('✅ Approvisionnement complet créé avec succès');
      
      return {
        supply: newSupply,
        retailItems
      };
    } catch (err) {
      console.error('❌ Erreur createFullSupply:', err);
      throw err;
    }
  }, [createSupply, createMultipleRetailSupplies]);

  return { createFullSupply };
};