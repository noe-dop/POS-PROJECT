// src/hooks/useInventory.ts - VERSION COMPLÈTE FONCTIONNELLE
import { useState, useEffect, useCallback } from 'react';
import { 
  inventoryService, 
  InventoryUtils,
  type InventoryCount,
  type InventoryStats,
  type InventoryCountItem,
  type CreateInventoryPayload,
  type UpdateInventoryPayload,
  type InventoryStatus
} from '../services/inventoryService';

// =============================================================================
// TYPES
// =============================================================================

export interface LocalInventoryCount extends InventoryCount {
  progress: number;
  store_name: string;
  items?: InventoryCountItem[];
  notes?: string;
}

export interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

export interface UseInventoryReturn {
  // État
  inventories: LocalInventoryCount[];
  stats: InventoryStats | null;
  stores: Store[];
  loading: boolean;
  error: string | null;
  
  // Filtres
  filters: {
    status: InventoryStatus | 'all';
    store: number | 'all';
    search: string;
  };
  setFilters: (filters: Partial<{
    status: InventoryStatus | 'all';
    store: number | 'all';
    search: string;
  }>) => void;
  resetFilters: () => void;
  
  // Actions
  refresh: () => Promise<void>;
  createInventory: (payload: CreateInventoryPayload) => Promise<LocalInventoryCount>;
  updateInventory: (id: number, payload: UpdateInventoryPayload) => Promise<LocalInventoryCount>;
  startCounting: (inventoryId: number) => Promise<void>;
  completeInventory: (inventoryId: number) => Promise<void>;
  cancelInventory: (inventoryId: number) => Promise<void>;
  deleteInventory: (inventoryId: number) => Promise<void>;
  
  // Items
  loadInventoryItems: (inventoryId: number) => Promise<InventoryCountItem[]>;
  updateInventoryItem: (itemId: number, countedQuantity: number) => Promise<InventoryCountItem>;
  
  // Utilitaires
  getInventoryById: (id: number) => LocalInventoryCount | undefined;
  getInventoryItems: (inventoryId: number) => InventoryCountItem[];
  
  // États de chargement
  actionLoading: {
    deletingId: number | null;
    startingId: number | null;
    completingId: number | null;
    cancellingId: number | null;
    updatingId: number | null;
    creating: boolean;
    counting: number | null;
    loadingItems: number | null;
  };
  
  // Messages
  successMessage: string | null;
  errorMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export const useInventory = (): UseInventoryReturn => {
  // États
  const [inventories, setInventories] = useState<LocalInventoryCount[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres
  const [filters, setFiltersState] = useState({
    status: 'all' as InventoryStatus | 'all',
    store: 'all' as number | 'all',
    search: ''
  });

  // Actions en cours
  const [actionLoading, setActionLoading] = useState({
    deletingId: null as number | null,
    startingId: null as number | null,
    completingId: null as number | null,
    cancellingId: null as number | null,
    updatingId: null as number | null,
    creating: false,
    counting: null as number | null,
    loadingItems: null as number | null
  });

  // Messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cache pour les items
  const [itemsCache, setItemsCache] = useState<Record<number, InventoryCountItem[]>>({});

  // ===========================================================================
  // CHARGEMENT DES DONNÉES
  // ===========================================================================

  const loadStores = useCallback(async () => {
    try {
      const storesData = await inventoryService.getStores();
      setStores(storesData);
    } catch (err) {
      console.error('Erreur chargement magasins:', err);
    }
  }, []);

  const loadInventories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Appliquer les filtres
      const apiFilters: any = {};
      if (filters.status !== 'all') apiFilters.status = filters.status;
      if (filters.store !== 'all') apiFilters.store = filters.store;
      if (filters.search) apiFilters.search = filters.search;
      
      const inventoriesData = await inventoryService.getInventories(apiFilters);
      
      // Transformer les données
      const inventoriesWithDetails: LocalInventoryCount[] = inventoriesData.map(inv => ({
        ...inv,
        progress: InventoryUtils.getProgressPercentage(inv, itemsCache[inv.id]),
        store_name: inv.store_name || 'Magasin inconnu',
        items: itemsCache[inv.id] || [],
        notes: inv.metadata?.notes || ''
      }));
      
      setInventories(inventoriesWithDetails);
      
    } catch (err: any) {
      console.error('Erreur chargement inventaires:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filters, itemsCache]);

  const loadStats = useCallback(async () => {
    try {
      const statsData = await inventoryService.getInventoryStats();
      setStats(statsData);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadStores(),
      loadInventories(),
      loadStats()
    ]);
  }, [loadStores, loadInventories, loadStats]);

  // Chargement initial
  useEffect(() => {
    loadAllData();
  }, []);

  // Rechargement quand les filtres changent
  useEffect(() => {
    if (!loading) {
      loadInventories();
    }
  }, [filters.status, filters.store, filters.search]);

  // ===========================================================================
  // GESTION DES FILTRES
  // ===========================================================================

  const setFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      status: 'all',
      store: 'all',
      search: ''
    });
    setSuccessMessage('Filtres réinitialisés');
    setTimeout(() => setSuccessMessage(null), 2000);
  }, []);

  // ===========================================================================
  // ACTIONS SUR LES INVENTAIRES
  // ===========================================================================

  const refresh = useCallback(async () => {
    setItemsCache({});
    await loadAllData();
    setSuccessMessage('Données rafraîchies');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [loadAllData]);

  const createInventory = useCallback(async (payload: CreateInventoryPayload) => {
    setActionLoading(prev => ({ ...prev, creating: true }));
    setErrorMessage(null);
    
    try {
      const created = await inventoryService.createInventory(payload);
      
      const newInventory: LocalInventoryCount = {
        ...created,
        progress: 0,
        store_name: created.store_name || 'Magasin inconnu',
        items: [],
        notes: created.metadata?.notes || ''
      };
      
      setInventories(prev => [newInventory, ...prev]);
      setSuccessMessage('Inventaire créé');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return newInventory;
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, creating: false }));
    }
  }, []);

  const updateInventory = useCallback(async (id: number, payload: UpdateInventoryPayload) => {
    setActionLoading(prev => ({ ...prev, updatingId: id }));
    setErrorMessage(null);
    
    try {
      const updated = await inventoryService.updateInventory(id, payload);
      
      const transformed = {
        ...updated,
        progress: InventoryUtils.getProgressPercentage(updated, itemsCache[id]),
        store_name: updated.store_name || 'Magasin inconnu',
        items: itemsCache[id] || [],
        notes: updated.metadata?.notes || ''
      };
      
      setInventories(prev => prev.map(i => i.id === id ? transformed : i));
      setSuccessMessage('Inventaire modifié');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      return transformed;
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, updatingId: null }));
    }
  }, [itemsCache]);

  const startCounting = useCallback(async (id: number) => {
    setActionLoading(prev => ({ ...prev, startingId: id }));
    setErrorMessage(null);
    
    try {
      const updated = await inventoryService.startInventory(id);
      setInventories(prev => prev.map(i => i.id === id ? { 
        ...i, 
        status: updated.status,
        started_at: updated.started_at,
        progress: 50 
      } : i));
      setSuccessMessage('Comptage démarré');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, startingId: null }));
    }
  }, []);

  const completeInventory = useCallback(async (id: number) => {
    setActionLoading(prev => ({ ...prev, completingId: id }));
    setErrorMessage(null);
    
    try {
      const updated = await inventoryService.completeInventory(id);
      setInventories(prev => prev.map(i => i.id === id ? { 
        ...i, 
        status: updated.status,
        completed_at: updated.completed_at,
        progress: 100 
      } : i));
      setSuccessMessage('Inventaire terminé');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, completingId: null }));
    }
  }, []);

  const cancelInventory = useCallback(async (id: number) => {
    setActionLoading(prev => ({ ...prev, cancellingId: id }));
    setErrorMessage(null);
    
    try {
      const updated = await inventoryService.cancelInventory(id);
      setInventories(prev => prev.map(i => i.id === id ? { 
        ...i, 
        status: updated.status,
        progress: 0 
      } : i));
      setSuccessMessage('Inventaire annulé');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, cancellingId: null }));
    }
  }, []);

  const deleteInventory = useCallback(async (id: number) => {
    setActionLoading(prev => ({ ...prev, deletingId: id }));
    setErrorMessage(null);
    
    try {
      await inventoryService.deleteInventory(id);
      setInventories(prev => prev.filter(i => i.id !== id));
      setItemsCache(prev => {
        const newCache = { ...prev };
        delete newCache[id];
        return newCache;
      });
      setSuccessMessage('Inventaire supprimé');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, deletingId: null }));
    }
  }, []);

  // ===========================================================================
  // ACTIONS SUR LES ITEMS
  // ===========================================================================

  const loadInventoryItems = useCallback(async (inventoryId: number) => {
    if (itemsCache[inventoryId]) {
      return itemsCache[inventoryId];
    }
    
    setActionLoading(prev => ({ ...prev, loadingItems: inventoryId }));
    
    try {
      const items = await inventoryService.getInventoryItems(inventoryId);
      
      setItemsCache(prev => ({ ...prev, [inventoryId]: items }));
      
      setInventories(prev => prev.map(i => i.id === inventoryId ? {
        ...i,
        items,
        progress: InventoryUtils.getProgressPercentage(i, items),
        total_items_counted: items.filter(it => it.counted_quantity !== null).length,
        total_discrepancies: items.filter(it => it.discrepancy !== 0).length
      } : i));
      
      return items;
    } catch (err) {
      console.error('Erreur chargement items:', err);
      return [];
    } finally {
      setActionLoading(prev => ({ ...prev, loadingItems: null }));
    }
  }, [itemsCache]);

  const updateInventoryItem = useCallback(async (itemId: number, countedQuantity: number) => {
    setActionLoading(prev => ({ ...prev, counting: itemId }));
    setErrorMessage(null);
    
    try {
      const updated = await inventoryService.updateInventoryItem(itemId, countedQuantity);
      
      // Mettre à jour le cache
      setItemsCache(prev => {
        const newCache = { ...prev };
        for (const invId in newCache) {
          const idx = newCache[invId].findIndex(i => i.id === itemId);
          if (idx >= 0) {
            newCache[invId][idx] = updated;
            
            // Mettre à jour l'inventaire correspondant
            setInventories(inv => inv.map(i => i.id === Number(invId) ? {
              ...i,
              items: newCache[invId],
              progress: InventoryUtils.getProgressPercentage(i, newCache[invId]),
              total_items_counted: newCache[invId].filter(it => it.counted_quantity !== null).length,
              total_discrepancies: newCache[invId].filter(it => it.discrepancy !== 0).length
            } : i));
            break;
          }
        }
        return newCache;
      });
      
      setSuccessMessage('Article mis à jour');
      setTimeout(() => setSuccessMessage(null), 2000);
      return updated;
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setActionLoading(prev => ({ ...prev, counting: null }));
    }
  }, []);

  // ===========================================================================
  // UTILITAIRES
  // ===========================================================================

  const getInventoryById = useCallback((id: number) => {
    return inventories.find(i => i.id === id);
  }, [inventories]);

  const getInventoryItems = useCallback((inventoryId: number) => {
    return itemsCache[inventoryId] || [];
  }, [itemsCache]);

  // ===========================================================================
  // RETOUR
  // ===========================================================================

  return {
    // État
    inventories,
    stats,
    stores,
    loading,
    error,
    
    // Filtres
    filters,
    setFilters,
    resetFilters,
    
    // Actions
    refresh,
    createInventory,
    updateInventory,
    startCounting,
    completeInventory,
    cancelInventory,
    deleteInventory,
    loadInventoryItems,
    updateInventoryItem,
    
    // Utilitaires
    getInventoryById,
    getInventoryItems,
    
    // États de chargement
    actionLoading,
    
    // Messages
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage
  };
};