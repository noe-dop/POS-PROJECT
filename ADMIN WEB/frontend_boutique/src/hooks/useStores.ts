import { useState, useEffect } from 'react';
import { api } from '@/services/api';

// Types basés sur votre modèle Django et vos logs API
export interface Store {
  id: number;
  name: string;
  slug: string;
  store_type?: number;
  store_type_details?: {
    id: number;
    name: string;
    code: string;
  };
  network?: number;
  network_details?: {
    id: number;
    name: string;
  };
  address?: number;
  address_details?: {
    id: number;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    full_address: string;
  };
  phone: string | null;
  email: string | null;
  opening_hours: Record<string, any>;
  is_active: boolean;
  logo: string | null;
  banner: string | null;
  slogan: string;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  total_employees?: number;
  total_products?: number;
}

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
  type?: string;
  address?: string;
  phone?: string | null;
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

  // ==================== RÉCUPÉRATION DES DONNÉES RÉELLES ====================

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

  // Récupérer tous les magasins - CORRECTION ICI
  const fetchStores = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, stores: true }));
      setError(null);
      
      console.log('🏪 Chargement des magasins depuis API...');
      
      // Utilisez getPaginated pour gérer la structure Django REST Framework
      const response = await api.getPaginated<Store>('/stores/', {
        page_size: 100, // Augmenté pour avoir plus de données
        ordering: 'name'
      });
      
      console.log(`✅ ${response.results?.length || 0} magasins chargés depuis API`);
      setStores(response.results || []);
      
    } catch (err: any) {
      console.error('❌ Erreur API stores:', err);
      
      // Alternative: essayer get normal si getPaginated échoue
      try {
        console.log('🔄 Tentative alternative avec api.get...');
        const alternativeResponse = await api.get<any>('/stores/', {
          page_size: 100,
          ordering: 'name'
        });
        
        // Gérer différentes structures de réponse
        let storesData: Store[] = [];
        
        if (Array.isArray(alternativeResponse)) {
          storesData = alternativeResponse;
        } else if (alternativeResponse && typeof alternativeResponse === 'object') {
          if (Array.isArray(alternativeResponse.results)) {
            storesData = alternativeResponse.results;
          } else if (Array.isArray(alternativeResponse.data)) {
            storesData = alternativeResponse.data;
          }
        }
        
        console.log(`✅ ${storesData.length} magasins chargés (alternative)`);
        setStores(storesData);
        
      } catch (altErr: any) {
        console.error('❌ Erreur alternative:', altErr);
        
        const errorMessage = altErr.response?.data?.detail || 
                            altErr.response?.data?.message || 
                            altErr.message || 
                            'Impossible de charger les magasins';
        
        setError(`Erreur magasins: ${errorMessage}`);
        setStores([]);
      }
      
    } finally {
      setLoading(prev => ({ ...prev, stores: false }));
    }
  };

  // Récupérer tous les entrepôts
  const fetchWarehouses = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, warehouses: true }));
      console.log('📦 Chargement des entrepôts depuis API...');
      
      let warehousesData: any[] = [];
      
      try {
        // Essayer d'abord avec getPaginated
        const paginatedResponse = await api.getPaginated<any>('/warehouses/', {
          page_size: 50,
          ordering: 'name'
        });
        warehousesData = paginatedResponse.results || [];
        console.log(`✅ ${warehousesData.length} entrepôts chargés depuis /warehouses/ (paginated)`);
      } catch (warehouseErr) {
        console.log('⚠️ Endpoint /warehouses/ non disponible avec pagination, tentative directe...');
        
        try {
          // Essayer un get direct
          const directResponse = await api.get<any[]>('/warehouses/', {
            page_size: 50,
            ordering: 'name'
          });
          
          // Gérer la structure de réponse
          if (Array.isArray(directResponse)) {
            warehousesData = directResponse;
          } else if (directResponse && typeof directResponse === 'object' && Array.isArray(directResponse.results)) {
            warehousesData = directResponse.results;
          }
          
          console.log(`✅ ${warehousesData.length} entrepôts chargés depuis /warehouses/ (direct)`);
        } catch (directErr) {
          console.log('⚠️ Endpoint /warehouses/ non disponible');
          warehousesData = [];
        }
      }
      
      // Formatter les données
      const formattedWarehouses: Warehouse[] = warehousesData.map((wh, index) => ({
        id: wh.id || index + 1,
        name: wh.name || `Entrepôt ${wh.id || index + 1}`,
        code: wh.code || `WH-${wh.id || index + 1}`,
        location: wh.location || wh.city || 'Non spécifié',
        store: wh.store,
        store_name: wh.store_name || wh.store_details?.name,
        is_active: wh.is_active !== false,
        created_at: wh.created_at || new Date().toISOString(),
        updated_at: wh.updated_at || new Date().toISOString()
      }));
      
      setWarehouses(formattedWarehouses);
      
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

  // Formatter les stores pour les options de sélection
  const getStoreOptions = (): StoreOption[] => {
    return stores
      .filter(store => store.is_active)
      .map(store => ({
        id: store.id,
        name: store.name,
        type: store.store_type_details?.name,
        address: store.address_details?.full_address,
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
    const type = store.store_type_details?.name;
    return type ? `${store.name} (${type})` : store.name;
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
    // Données brutes de l'API
    stores: stores.filter(store => store.is_active),
    allStores: stores,
    storeTypes,
    storeNetworks,
    warehouses: warehouses.filter(warehouse => warehouse.is_active),
    allWarehouses: warehouses,
    
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
    getWarehousesByStoreId,
    
    // Statistiques
    stats,
    
    // Gestion des erreurs
    clearError
  };
};

export default useStores;