import { useState, useEffect } from 'react';
import { api } from '@/services/api';

// ============================================
// TYPES DOUBLES (API + Frontend)
// ============================================

// ✅ Ce que l'API renvoie réellement (avec address_details)
export interface ApiStore {
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
  address_details?: {  // ⚠️ L'API renvoie ça !
    id: number;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    full_address: string;
    latitude?: string | null;  // ⚠️ La géoloc est dans address_details
    longitude?: string | null;
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

// ✅ Ce que le frontend utilise (structure plate pour StoreCreate)
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
  // ✅ Champs plats pour le frontend
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
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
  city?: string | null;
  country?: string | null;
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

  // ✅ Récupérer tous les magasins - PRÉSERVE LES LOGS API
  const fetchStores = async (): Promise<void> => {
    try {
      setLoading(prev => ({ ...prev, stores: true }));
      setError(null);
      
      console.log('🏪 Chargement des magasins depuis API...');
      
      // 🔥 L'API renvoie bien /api/stores/?page_size=200 (comme dans les logs)
      const response = await api.getPaginated<ApiStore>('/stores/', {
        page_size: 200,  // ⚠️ Gardé à 200 comme dans les logs
        ordering: 'name'
      });
      
      console.log(`✅ ${response.results?.length || 0} magasins chargés depuis API`);
      
      // Transformer les données API (imbriquées) en données frontend (plates)
      const transformedStores: Store[] = (response.results || []).map((apiStore: ApiStore) => {
        const address = apiStore.address_details || {};
        
        return {
          id: apiStore.id,
          name: apiStore.name,
          slug: apiStore.slug,
          store_type: apiStore.store_type,
          store_type_details: apiStore.store_type_details,
          network: apiStore.network,
          network_details: apiStore.network_details,
          // ✅ Extraire les champs de address_details
          address_line1: address.address_line1 || null,
          address_line2: address.address_line2 || null,
          city: address.city || null,
          state: address.state || null,
          postal_code: address.postal_code || null,
          country: address.country || null,
          latitude: address.latitude || null,
          longitude: address.longitude || null,
          phone: apiStore.phone || null,
          email: apiStore.email || null,
          opening_hours: apiStore.opening_hours || {},
          is_active: apiStore.is_active !== false,
          logo: apiStore.logo || null,
          banner: apiStore.banner || null,
          slogan: apiStore.slogan || '',
          configuration: apiStore.configuration || {
            currency: 'EUR',
            timezone: 'Europe/Paris',
            tax_rate: 20.0
          },
          created_at: apiStore.created_at,
          updated_at: apiStore.updated_at,
          total_employees: apiStore.total_employees || 0,
          total_products: apiStore.total_products || 0
        };
      });
      
      console.log(`✅ ${transformedStores.length} magasins transformés pour le frontend`);
      setStores(transformedStores);
      
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
      
      let warehousesData: any[] = [];
      
      try {
        const paginatedResponse = await api.getPaginated<any>('/warehouses/', {
          page_size: 50,
          ordering: 'name'
        });
        warehousesData = paginatedResponse.results || [];
        console.log(`✅ ${warehousesData.length} entrepôts chargés`);
      } catch (warehouseErr) {
        console.log('⚠️ Endpoint /warehouses/ non disponible');
        warehousesData = [];
      }
      
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
        type: store.store_type_details?.name,
        address: getFullAddress(store),
        phone: store.phone,
        city: store.city,
        country: store.country
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