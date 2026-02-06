// src/hooks/useInventory.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  inventoryService, 
  InventoryUtils,
  type InventoryCount,
  type InventoryStats,
  type InventoryCountItem,
  type CreateInventoryPayload 
} from '../services/inventoryService';

interface LocalInventoryCount extends InventoryCount {
  progress: number;
  store_name: string;
  total_items_counted?: number;
  total_discrepancies?: number;
  discrepancy_value?: number;
  items?: InventoryCountItem[];
}

interface Store {
  id: number;
  name: string;
  address?: string;
}

interface InventoryState {
  inventories: LocalInventoryCount[];
  stats: InventoryStats | null;
  stores: Store[];
  loading: boolean;
  loadingStats: boolean;
  loadingStores: boolean;
  error: string | null;
  statsError: string | null;
}

interface ActionLoadingState {
  deletingId: number | null;
  startingId: number | null;
  completingId: number | null;
  creating: boolean;
  counting: number | null;
}

interface UseInventoryReturn extends InventoryState {
  // Actions
  refresh: () => Promise<void>;
  createInventory: (payload: CreateInventoryPayload) => Promise<LocalInventoryCount>;
  startCounting: (inventoryId: number) => Promise<void>;
  completeInventory: (inventoryId: number) => Promise<void>;
  deleteInventory: (inventoryId: number) => Promise<void>;
  
  // Actions de chargement
  actionLoading: ActionLoadingState;
  
  // Messages
  successMessage: string | null;
  setSuccessMessage: (message: string | null) => void;
  
  // Méthodes utilitaires
  getInventoryById: (id: number) => LocalInventoryCount | undefined;
  getInventoryItems: (inventoryId: number) => Promise<InventoryCountItem[]>;
}

export const useInventory = (): UseInventoryReturn => {
  // États principaux
  const [state, setState] = useState<InventoryState>({
    inventories: [],
    stats: null,
    stores: [],
    loading: true,
    loadingStats: true,
    loadingStores: false,
    error: null,
    statsError: null
  });

  // États pour les actions en cours
  const [actionLoading, setActionLoading] = useState<ActionLoadingState>({
    deletingId: null,
    startingId: null,
    completingId: null,
    creating: false,
    counting: null
  });

  // Message de succès
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ref pour éviter les boucles infinies
  const hasLoaded = useRef(false);
  const isMounted = useRef(true);

  // Nettoyage à la destruction
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ============================================
  // MÉTHODES DE CHARGEMENT
  // ============================================

  const loadStores = useCallback(async (): Promise<Store[]> => {
    try {
      setState(prev => ({ ...prev, loadingStores: true }));
      
      const storesData = await inventoryService.getStores();
      
      // Transformer les données de l'API en format Store
      const stores: Store[] = storesData.map((store: any) => ({
        id: store.id,
        name: store.name,
        address: store.address || store.address_details?.full_address
      }));
      
      if (isMounted.current) {
        setState(prev => ({ ...prev, stores, loadingStores: false }));
      }
      
      return stores;
    } catch (err) {
      console.error('Erreur chargement magasins:', err);
      
      // Fallback minimal
      const fallbackStores: Store[] = [
        { id: 1, name: 'Magasin Principal' },
        { id: 2, name: 'Succursale Est' },
        { id: 3, name: 'Succursale Ouest' }
      ];
      
      if (isMounted.current) {
        setState(prev => ({ ...prev, stores: fallbackStores, loadingStores: false }));
      }
      
      return fallbackStores;
    }
  }, []);

  const loadInventories = useCallback(async (): Promise<LocalInventoryCount[]> => {
    try {
      console.log('🔄 Chargement des inventaires...');
      const inventoriesData = await inventoryService.getInventories();
      
      console.log(`📦 ${inventoriesData.length} inventaires récupérés`);
      
      // Transformer les données sans charger les items immédiatement
      const inventoriesWithDetails = inventoriesData.map((inv): LocalInventoryCount => {
        // Calculer la progression sans items
        const progress = InventoryUtils.getProgressPercentage(inv);
        
        return {
          ...inv,
          progress,
          store_name: inv.store_name || 'Non spécifié',
          total_items_counted: inv.total_items_counted || 0,
          total_discrepancies: inv.total_discrepancies || 0,
          discrepancy_value: inv.discrepancy_value || 0,
          items: [] // Chargé à la demande
        };
      });

      if (isMounted.current) {
        setState(prev => ({ ...prev, inventories: inventoriesWithDetails }));
        console.log(`✅ ${inventoriesWithDetails.length} inventaires transformés`);
      }
      
      return inventoriesWithDetails;
    } catch (err: any) {
      console.error('❌ Erreur chargement inventaires:', err);
      
      if (isMounted.current) {
        setState(prev => ({ 
          ...prev, 
          error: 'Impossible de charger les inventaires: ' + (err.message || 'Erreur inconnue')
        }));
      }
      
      return [];
    }
  }, []);

  const loadStats = useCallback(async (inventoriesData: LocalInventoryCount[]) => {
    if (!isMounted.current) return;
    
    setState(prev => ({ ...prev, loadingStats: true, statsError: null }));
    
    try {
      console.log('📊 Chargement des statistiques...');
      const statsData = await inventoryService.getInventoryStats();
      
      if (isMounted.current) {
        setState(prev => ({ ...prev, stats: statsData, loadingStats: false }));
        console.log('✅ Stats chargées');
      }
    } catch (statsErr: any) {
      console.warn('⚠️ Stats API non disponible, calcul local...');
      
      // Calculer les stats localement
      const inProgress = inventoriesData.filter(inv => inv.status === 'in_progress').length;
      const planned = inventoriesData.filter(inv => inv.status === 'planned').length;
      const completed = inventoriesData.filter(inv => inv.status === 'completed').length;
      const cancelled = inventoriesData.filter(inv => inv.status === 'cancelled').length;
      
      const totalDiscrepancies = inventoriesData.reduce(
        (sum, inv) => sum + (inv.total_discrepancies || 0), 0
      );
      
      const totalDiscrepancyValue = inventoriesData.reduce(
        (sum, inv) => sum + (inv.discrepancy_value || 0), 0
      );
      
      const localStats: InventoryStats = {
        total_inventories: inventoriesData.length,
        in_progress_inventories: inProgress,
        completed_inventories: completed,
        planned_inventories: planned,
        cancelled_inventories: cancelled,
        total_discrepancies: totalDiscrepancies,
        total_discrepancy_value: totalDiscrepancyValue,
        average_discrepancy_rate: totalDiscrepancies > 0 ? 
          (totalDiscrepancies / inventoriesData.length) : 0,
        recent_inventories_count: 0
      };
      
      if (isMounted.current) {
        setState(prev => ({ 
          ...prev, 
          stats: localStats, 
          statsError: 'Statistiques calculées localement',
          loadingStats: false 
        }));
        console.log('✅ Stats calculées localement');
      }
    }
  }, []);

  // ============================================
  // CHARGEMENT GLOBAL
  // ============================================

  const loadAllData = useCallback(async () => {
    // Éviter les appels multiples
    if (hasLoaded.current && isMounted.current) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    if (!isMounted.current) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    setSuccessMessage(null);

    try {
      console.log('🚀 Démarrage chargement données...');
      
      // Charger les magasins et inventaires en parallèle
      const [loadedInventories] = await Promise.all([
        loadInventories(),
        loadStores()
      ]);
      
      // Charger les stats après
      await loadStats(loadedInventories);
      
      hasLoaded.current = true;
      console.log('✅ Chargement initial terminé');
      
    } catch (err: any) {
      console.error('❌ Erreur générale:', err);
      if (isMounted.current) {
        setState(prev => ({ 
          ...prev, 
          error: err.message || 'Impossible de charger les données'
        }));
      }
    } finally {
      if (isMounted.current) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [loadStores, loadInventories, loadStats]);

  // ============================================
  // ACTIONS PRINCIPALES
  // ============================================

  const refresh = useCallback(async () => {
    console.log('🔄 Rafraîchissement manuel');
    
    // Réinitialiser le flag de chargement pour forcer le rechargement
    hasLoaded.current = false;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const loadedInventories = await loadInventories();
      await Promise.all([
        loadStats(loadedInventories),
        loadStores()
      ]);
      
      setSuccessMessage('Données rafraîchies avec succès');
      
      // Supprimer le message après 3 secondes
      setTimeout(() => {
        if (isMounted.current) {
          setSuccessMessage(null);
        }
      }, 3000);
      
    } catch (err: any) {
      console.error('❌ Erreur rafraîchissement:', err);
      if (isMounted.current) {
        setState(prev => ({ 
          ...prev, 
          error: 'Erreur lors du rafraîchissement: ' + (err.message || 'Erreur inconnue')
        }));
      }
    } finally {
      if (isMounted.current) {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  }, [loadStores, loadInventories, loadStats]);

  const createInventory = useCallback(async (payload: CreateInventoryPayload): Promise<LocalInventoryCount> => {
    setActionLoading(prev => ({ ...prev, creating: true }));
    
    try {
      console.log('📤 Création inventaire:', payload);
      
      // Appel API
      const createdInventory = await inventoryService.createInventory(payload);
      
      // Transformer l'inventaire créé
      const localInventory: LocalInventoryCount = {
        ...createdInventory,
        progress: InventoryUtils.getProgressPercentage(createdInventory),
        store_name: createdInventory.store_name || 'Non spécifié',
        total_items_counted: createdInventory.total_items_counted || 0,
        total_discrepancies: createdInventory.total_discrepancies || 0,
        discrepancy_value: createdInventory.discrepancy_value || 0,
        items: []
      };
      
      // Ajouter à la liste locale
      setState(prev => ({
        ...prev,
        inventories: [localInventory, ...prev.inventories]
      }));
      
      // Mettre à jour les stats
      await loadStats([localInventory, ...state.inventories]);
      
      setSuccessMessage('Inventaire créé avec succès !');
      
      return localInventory;
    } catch (error: any) {
      console.error('❌ Erreur création:', error);
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, creating: false }));
    }
  }, [state.inventories, loadStats]);

  const startCounting = useCallback(async (inventoryId: number) => {
    setActionLoading(prev => ({ ...prev, counting: inventoryId }));
    
    try {
      console.log(`▶️ Démarrage comptage inventaire #${inventoryId}`);
      
      await inventoryService.startInventory(inventoryId);
      
      // Mettre à jour l'état local
      setState(prev => ({
        ...prev,
        inventories: prev.inventories.map(inv => 
          inv.id === inventoryId 
            ? { ...inv, status: 'in_progress', progress: 50 }
            : inv
        )
      }));
      
      setSuccessMessage('Comptage démarré avec succès');
      
    } catch (error: any) {
      console.error('❌ Erreur démarrage comptage:', error);
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, counting: null }));
    }
  }, []);

  const completeInventory = useCallback(async (inventoryId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir terminer cet inventaire ?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, completingId: inventoryId }));
    
    try {
      console.log(`✅ Terminaison inventaire #${inventoryId}`);
      
      await inventoryService.completeInventory(inventoryId);
      
      // Mettre à jour l'état local
      setState(prev => ({
        ...prev,
        inventories: prev.inventories.map(inv => 
          inv.id === inventoryId 
            ? { ...inv, status: 'completed', progress: 100 }
            : inv
        )
      }));
      
      // Recharger les stats
      await loadStats(state.inventories);
      
      setSuccessMessage('Inventaire terminé avec succès !');
      
    } catch (error: any) {
      console.error('❌ Erreur validation:', error);
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, completingId: null }));
    }
  }, [state.inventories, loadStats]);

  const deleteInventory = useCallback(async (inventoryId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet inventaire ?')) {
      return;
    }

    setActionLoading(prev => ({ ...prev, deletingId: inventoryId }));
    
    try {
      console.log(`🗑️ Suppression inventaire #${inventoryId}`);
      
      await inventoryService.deleteInventory(inventoryId);
      
      // Retirer de la liste locale
      setState(prev => ({
        ...prev,
        inventories: prev.inventories.filter(inv => inv.id !== inventoryId)
      }));
      
      // Recharger les stats
      await loadStats(state.inventories.filter(inv => inv.id !== inventoryId));
      
      setSuccessMessage('Inventaire supprimé avec succès');
      
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      throw error;
    } finally {
      setActionLoading(prev => ({ ...prev, deletingId: null }));
    }
  }, [state.inventories, loadStats]);

  // ============================================
  // MÉTHODES UTILITAIRES
  // ============================================

  const getInventoryById = useCallback((id: number): LocalInventoryCount | undefined => {
    return state.inventories.find(inv => inv.id === id);
  }, [state.inventories]);

  const getInventoryItems = useCallback(async (inventoryId: number): Promise<InventoryCountItem[]> => {
    try {
      console.log(`📋 Chargement items inventaire #${inventoryId}`);
      
      const items = await inventoryService.getInventoryItems(inventoryId);
      
      // Mettre à jour l'inventaire local avec les items
      setState(prev => ({
        ...prev,
        inventories: prev.inventories.map(inv => 
          inv.id === inventoryId 
            ? { ...inv, items, progress: InventoryUtils.getProgressPercentage(inv, items) }
            : inv
        )
      }));
      
      return items;
    } catch (error) {
      console.error('❌ Erreur chargement items:', error);
      return [];
    }
  }, []);

  // ============================================
  // INITIALISATION
  // ============================================

  useEffect(() => {
    console.log('🏁 Hook useInventory initialisé');
    loadAllData();
    
    return () => {
      console.log('🗑️ Hook useInventory nettoyé');
    };
  }, [loadAllData]);

  // ============================================
  // RETOUR DU HOOK
  // ============================================

  return {
    // État
    inventories: state.inventories,
    stats: state.stats,
    stores: state.stores,
    loading: state.loading,
    loadingStats: state.loadingStats,
    loadingStores: state.loadingStores,
    error: state.error,
    statsError: state.statsError,
    
    // Actions
    refresh,
    createInventory,
    startCounting,
    completeInventory,
    deleteInventory,
    
    // Actions de chargement
    actionLoading,
    
    // Messages
    successMessage,
    setSuccessMessage,
    
    // Méthodes utilitaires
    getInventoryById,
    getInventoryItems
  };
};