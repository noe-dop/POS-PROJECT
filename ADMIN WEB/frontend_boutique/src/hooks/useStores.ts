import { useState, useEffect } from 'react';
import { api } from '@/services/api';

// ============================================
// TYPES UNIFIÉS - CORRESPONDANCE EXACTE AVEC L'API
// ============================================

// ✅ Ce que l'API renvoie réellement (structure plate)
export interface ApiStore {
  id: number;
  name: string;
  phone: string;
  email: string;
  slogan: string;
  store_type: number;
  network: number;
  is_active: boolean;
  configuration: Record<string, any>;
  opening_hours: Record<string, any>;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ Interface utilisée par le frontend (identique à l'API)
export interface Store {
  id: number;
  name: string;
  phone: string;
  email: string;
  slogan: string;
  store_type: number;
  network: number;
  is_active: boolean;
  configuration: Record<string, any>;
  opening_hours: Record<string, any>;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  created_at?: string;
  updated_at?: string;
}

// ✅ Types pour les endpoints supplémentaires
export interface StoreType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreNetwork {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  location?: string;
  store?: number;
  store_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreOption {
  id: number;
  name: string;
  city: string;
  country: string;
  phone?: string;
}

export interface WarehouseOption {
  id: number;
  name: string;
  location?: string;
}

interface UseStoresReturn {
  // Données
  stores: Store[];
  allStores: Store[];
  storeTypes: StoreType[];
  storeNetworks: StoreNetwork[];
  warehouses: Warehouse[];
  storeOptions: StoreOption[];
  warehouseOptions: WarehouseOption[];
  
  // États
  loading: {
    stores: boolean;
    storeTypes: boolean;
    storeNetworks: boolean;
    warehouses: boolean;
  };
  error: string | null;
  hasData: boolean;
  
  // Actions
  refetch: () => Promise<void>;
  fetchStores: () => Promise<void>;
  fetchStoreTypes: () => Promise<void>;
  fetchStoreNetworks: () => Promise<void>;
  fetchWarehouses: () => Promise<void>;
  
  // Utilitaires
  getStoreById: (id: number) => Store | undefined;
  getStoreDisplayName: (store: Store) => string;
  getFullAddress: (store: Store) => string;
  getCoordinates: (store: Store) => string | null;
  getWarehousesByStoreId: (storeId: number) => Warehouse[];
  
  // Statistiques
  stats: {
    totalStores: number;
    activeStores: number;
    storeTypesCount: number;
    storeNetworksCount: number;
    totalWarehouses: number;
  };
  
  // Gestion des erreurs
  clearError: () => void;
}

export const useStores = (): UseStoresReturn => {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeTypes, setStoreTypes] = useState<StoreType[]>([]);
  const [storeNetworks, setStoreNetworks] = useState<StoreNetwork[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [loading, setLoading] = useState({ 
    stores: false, 
    storeTypes: false,
    storeNetworks: false,
    warehouses: false
  });
  
  const [error, setError] = useState<string | null>(null);

  // ==================== RÉCUPÉRATION DES DONNÉES ====================

  // Récupérer les types de magasins
  const fetchStoreTypes = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, storeTypes: true }));
      console.log('🏪 Chargement des types de magasins depuis API...');
      
      const response = await api.get<StoreType[]>('/store-types/');
      console.log(`✅ ${response.length} types de magasins chargés`);
      setStoreTypes(Array.isArray(response) ? response : []);
      
    } catch (err: any) {
      console.error('❌ Erreur API store types:', err);
      setStoreTypes([]);
    } finally {
      setLoading(prev => ({ ...prev, storeTypes: false }));
    }
  };

  // Récupérer les réseaux de magasins
  const fetchStoreNetworks = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, storeNetworks: true }));
      console.log('🏪 Chargement des réseaux de magasins depuis API...');
      
      const response = await api.get<StoreNetwork[]>('/store-networks/');
      console.log(`✅ ${response.length} réseaux de magasins chargés`);
      setStoreNetworks(Array.isArray(response) ? response : []);
      
    } catch (err: any) {
      console.error('❌ Erreur API store networks:', err);
      setStoreNetworks([]);
    } finally {
      setLoading(prev => ({ ...prev, storeNetworks: false }));
    }
  };

  // ✅ Récupérer tous les magasins - STRUCTURE PLATE
  const fetchStores = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, stores: true }));
      setError(null);
      
      console.log('🏪 Chargement des magasins depuis API...');
      
      const response = await api.getPaginated<ApiStore>('/stores/', {
        page_size: 200,
        ordering: 'name'
      });
      
      console.log(`✅ ${response.results?.length || 0} magasins chargés depuis API`);
      
      // ✅ Plus besoin de transformation complexe - structure directe
      const storesData: Store[] = (response.results || []).map((apiStore: ApiStore) => ({
        id: apiStore.id,
        name: apiStore.name,
        phone: apiStore.phone,
        email: apiStore.email,
        slogan: apiStore.slogan,
        store_type: apiStore.store_type,
        network: apiStore.network,
        is_active: apiStore.is_active,
        configuration: apiStore.configuration || {},
        opening_hours: apiStore.opening_hours || {},
        address_line1: apiStore.address_line1 || '',
        address_line2: apiStore.address_line2 || '',
        city: apiStore.city || '',
        state: apiStore.state || '',
        postal_code: apiStore.postal_code || '',
        country: apiStore.country || '',
        latitude: apiStore.latitude || '',
        longitude: apiStore.longitude || '',
        created_at: apiStore.created_at,
        updated_at: apiStore.updated_at
      }));
      
      console.log(`✅ ${storesData.length} magasins prêts pour le frontend`);
      setStores(storesData);
      
    } catch (err: any) {
      console.error('❌ Erreur API stores:', err);
      
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Impossible de charger les magasins';
      
      setError(`Erreur magasins: ${errorMessage}`);
      setStores([]);
      
    } finally {
      setLoading(prev => ({ ...prev, stores: false }));
    }
  };

  // Récupérer tous les entrepôts
  const fetchWarehouses = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, warehouses: true }));
      console.log('📦 Chargement des entrepôts depuis API...');
      
      try {
        const paginatedResponse = await api.getPaginated<any>('/warehouses/', {
          page_size: 50,
          ordering: 'name'
        });
        const warehousesData = paginatedResponse.results || [];
        console.log(`✅ ${warehousesData.length} entrepôts chargés`);
        
        const formattedWarehouses: Warehouse[] = warehousesData.map((wh: any) => ({
          id: wh.id,
          name: wh.name || `Entrepôt ${wh.id}`,
          code: wh.code || `WH-${wh.id}`,
          location: wh.location || wh.city || 'Non spécifié',
          store: wh.store,
          store_name: wh.store_name,
          is_active: wh.is_active !== false,
          created_at: wh.created_at || new Date().toISOString(),
          updated_at: wh.updated_at || new Date().toISOString()
        }));
        
        setWarehouses(formattedWarehouses);
      } catch (warehouseErr) {
        console.log('⚠️ Endpoint /warehouses/ non disponible');
        setWarehouses([]);
      }
      
    } catch (err: any) {
      console.error('❌ Erreur chargement entrepôts:', err);
      setWarehouses([]);
    } finally {
      setLoading(prev => ({ ...prev, warehouses: false }));
    }
  };

  // Récupérer toutes les données
  const refetch = async (): Promise<void> => {
    console.log('🔄 Rafraîchissement des données magasins...');
    setError(null);
    
    try {
      await Promise.all([
        fetchStoreTypes(),
        fetchStoreNetworks(),
        fetchStores(),
        fetchWarehouses()
      ]);
      console.log('✅ Données magasins rafraîchies');
    } catch (err) {
      console.error('❌ Erreur lors du rafraîchissement:', err);
    }
  };

  // ==================== FONCTIONS UTILITAIRES ====================

  // ✅ Obtenir l'adresse complète formatée
  const getFullAddress = (store: Store): string => {
    const parts = [
      store.address_line1,
      store.address_line2,
      [store.postal_code, store.city].filter(Boolean).join(' '),
      store.state,
      store.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Adresse non définie';
  };

  // ✅ Obtenir les coordonnées formatées
  const getCoordinates = (store: Store): string | null => {
    if (store.latitude && store.longitude) {
      return `${store.latitude}, ${store.longitude}`;
    }
    return null;
  };

  // ✅ Formatter les stores pour les options de sélection
  const getStoreOptions = (): StoreOption[] => {
    return stores
      .filter(store => store.is_active)
      .map(store => ({
        id: store.id,
        name: store.name,
        city: store.city,
        country: store.country,
        phone: store.phone
      }));
  };

  // Formatter les entrepôts pour les options de sélection
  const getWarehouseOptions = (): WarehouseOption[] => {
    return warehouses
      .filter(warehouse => warehouse.is_active)
      .map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.location
      }));
  };

  // Récupérer un magasin par ID
  const getStoreById = (id: number): Store | undefined => {
    return stores.find(store => store.id === id);
  };

  // Récupérer le nom complet d'un magasin
  const getStoreDisplayName = (store: Store): string => {
    return store.name;
  };

  // Récupérer les entrepôts d'un magasin spécifique
  const getWarehousesByStoreId = (storeId: number): Warehouse[] => {
    return warehouses.filter(warehouse => warehouse.store === storeId);
  };

  // Gestion des erreurs
  const clearError = (): void => {
    setError(null);
  };

  // ==================== EFFET DE CHARGEMENT INITIAL ====================

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('🚀 Initialisation du hook useStores...');
      await refetch();
    };

    loadInitialData();
  }, []);

  // ==================== STATISTIQUES ====================

  const stats = {
    totalStores: stores.length,
    activeStores: stores.filter(store => store.is_active).length,
    storeTypesCount: storeTypes.length,
    storeNetworksCount: storeNetworks.length,
    totalWarehouses: warehouses.length
  };

  // ==================== RETURN ====================

  return {
    // Données brutes
    stores: stores.filter(store => store.is_active),
    allStores: stores,
    storeTypes,
    storeNetworks,
    warehouses: warehouses.filter(warehouse => warehouse.is_active),
    
    // Données formatées pour les selects
    storeOptions: getStoreOptions(),
    warehouseOptions: getWarehouseOptions(),
    
    // États
    loading,
    error,
    hasData: stores.length > 0 || warehouses.length > 0,
    
    // Actions
    refetch,
    fetchStores,
    fetchStoreTypes,
    fetchStoreNetworks,
    fetchWarehouses,
    
    // Utilitaires
    getStoreById,
    getStoreDisplayName,
    getFullAddress,
    getCoordinates,
    getWarehousesByStoreId,
    
    // Statistiques
    stats,
    
    // Gestion des erreurs
    clearError
  };
};

export default useStores;