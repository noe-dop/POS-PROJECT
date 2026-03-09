import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Supply, 
  Supplier, 
  RetailSupply,
  Store
} from '../services/supplyService';
import { supplyService } from '../services/supplyService';

// Types pour les produits
export interface Product {
  id: number;
  name: string;
  sku?: string;
  reference?: string;
  category?: number;
  category_name?: string;
  current_stock?: number;
  minimum_stock?: number;
  supplier?: number;
  supplier_name?: string;
  cost_price?: number;
  base_price?: number;
  is_active?: boolean;
}

// Types pour la création
export interface CreateSupplyData {
  ref_supply: string;
  supplier: number;
  store: number;
  utilisateur: number;
  total_command: number;
  date_supply: string;
  status?: 'pending' | 'received' | 'cancelled';
  notes?: string;
  retail_items?: Partial<RetailSupply>[];
}

export interface CreateSupplierData {
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person?: string;
  payment_terms?: string;
  store: number;
  address?: string;
  phone?: string;
}

// Hook useDebounce personnalisé
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook pour les approvisionnements
export const useSupplies = (filters?: {
  status?: string;
  supplier?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  store?: number;
}) => {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Utiliser useMemo pour stabiliser les filtres
  const stableFilters = useMemo(() => filters, [
    filters?.status, 
    filters?.search, 
    filters?.supplier, 
    filters?.start_date, 
    filters?.end_date,
    filters?.store
  ]);

  const fetchSupplies = useCallback(async () => {
    // Éviter les appels trop rapprochés
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    setLastFetchTime(now);

    try {
      setLoading(true);
      setError(null);
      
      let data: Supply[];
      
      if (stableFilters?.search || stableFilters?.status || stableFilters?.store) {
        data = await supplyService.searchSupplies(
          stableFilters.search || '', 
          stableFilters.status,
          stableFilters.store
        );
      } else {
        data = await supplyService.getSupplies(stableFilters);
      }
      
      console.log('📦 Approvisionnements chargés:', data.length);
      setSupplies(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des approvisionnements';
      setError(errorMessage);
      console.error('❌ Erreur useSupplies:', err);
    } finally {
      setLoading(false);
    }
  }, [stableFilters, lastFetchTime]);

  // Déclencher le fetch seulement quand les filtres changent
  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  const createSupply = async (supplyData: CreateSupplyData): Promise<Supply> => {
    try {
      const newSupply = await supplyService.createSupply(supplyData);
      await fetchSupplies();
      return newSupply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
      throw new Error(errorMessage);
    }
  };

  const updateSupply = async (id: number, supplyData: Partial<Supply>): Promise<Supply> => {
    try {
      const updatedSupply = await supplyService.updateSupply(id, supplyData);
      await fetchSupplies();
      return updatedSupply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      throw new Error(errorMessage);
    }
  };

  const updateSupplyStatus = async (id: number, status: 'pending' | 'received' | 'cancelled'): Promise<Supply> => {
    try {
      const updatedSupply = await supplyService.updateSupplyStatus(id, status);
      await fetchSupplies();
      return updatedSupply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut';
      throw new Error(errorMessage);
    }
  };

  const deleteSupply = async (id: number): Promise<void> => {
    try {
      await supplyService.deleteSupply(id);
      await fetchSupplies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      throw new Error(errorMessage);
    }
  };

  return { 
    supplies, 
    loading, 
    error, 
    refetch: fetchSupplies,
    createSupply,
    updateSupply,
    updateSupplyStatus,
    deleteSupply
  };
};

// Hook pour les fournisseurs
export const useSuppliers = (search?: string) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Debounce la recherche
  const debouncedSearch = useDebounce(search, 300);

  const fetchSuppliers = useCallback(async () => {
    // Éviter les appels trop rapprochés
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    setLastFetchTime(now);

    try {
      setLoading(true);
      setError(null);
      
      const params = debouncedSearch ? { search: debouncedSearch } : undefined;
      const data = await supplyService.getSuppliers(params);
      console.log('📞 Fournisseurs chargés:', data.length);
      setSuppliers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des fournisseurs';
      setError(errorMessage);
      console.error('❌ Erreur useSuppliers:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, lastFetchTime]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const createSupplier = async (supplierData: CreateSupplierData): Promise<Supplier> => {
    try {
      const newSupplier = await supplyService.createSupplier(supplierData);
      await fetchSuppliers(); // Recharger la liste
      return newSupplier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création du fournisseur';
      throw new Error(errorMessage);
    }
  };

  const deleteSupplier = async (id: number): Promise<void> => {
    try {
      await supplyService.deleteSupplier(id);
      await fetchSuppliers(); // Recharger la liste
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      throw new Error(errorMessage);
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

// Hook pour les magasins - NOUVEAU HOOK
export const useStores = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchStores = useCallback(async () => {
    // Éviter les appels trop rapprochés
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    setLastFetchTime(now);

    try {
      setLoading(true);
      setError(null);
      
      const data = await supplyService.getStores();
      console.log('🏪 Magasins chargés:', data.length);
      setStores(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des magasins';
      setError(errorMessage);
      console.error('❌ Erreur useStores:', err);
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const createStore = async (storeData: Omit<Store, 'id'>): Promise<Store> => {
    try {
      // Note: Vous devrez créer cette méthode dans supplyService
      const newStore = await supplyService.createStore(storeData);
      await fetchStores(); // Recharger la liste
      return newStore;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création du magasin';
      throw new Error(errorMessage);
    }
  };

  const deleteStore = async (id: number): Promise<void> => {
    try {
      // Note: Vous devrez créer cette méthode dans supplyService
      await supplyService.deleteStore(id);
      await fetchStores(); // Recharger la liste
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      throw new Error(errorMessage);
    }
  };

  return { 
    stores, 
    loading, 
    error, 
    refetch: fetchStores,
    createStore,
    deleteStore
  };
};

// Hook pour les produits
export const useSupplyProducts = (filters?: {
  search?: string;
  category?: number;
  supplier?: number;
  low_stock?: boolean;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce la recherche
  const debouncedSearch = useDebounce(filters?.search, 300);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulation temporaire - À remplacer par un vrai service quand disponible
      const mockProducts: Product[] = [
        {
          id: 1,
          name: 'Riz Basmati 5kg',
          sku: 'RIZ-BASMATI-5KG',
          reference: 'RIZ-001',
          current_stock: 45,
          minimum_stock: 20,
          supplier: 1,
          supplier_name: 'Fournisseur Principal',
          cost_price: 20000,
          base_price: 25000,
          is_active: true
        },
        {
          id: 2,
          name: 'Huile végétale 2L',
          sku: 'HUI-VEG-2L',
          reference: 'HUI-001',
          current_stock: 15,
          minimum_stock: 25,
          supplier: 2,
          supplier_name: 'Distributeur Ouest',
          cost_price: 12000,
          base_price: 15000,
          is_active: true
        }
      ];
      
      let filteredProducts = mockProducts;
      
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.sku?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters?.supplier) {
        filteredProducts = filteredProducts.filter(p => p.supplier === filters.supplier);
      }
      
      if (filters?.low_stock) {
        filteredProducts = filteredProducts.filter(p => 
          p.current_stock && p.minimum_stock && p.current_stock <= p.minimum_stock
        );
      }
      
      console.log('📊 Produits chargés:', filteredProducts.length);
      setProducts(filteredProducts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des produits';
      setError(errorMessage);
      console.error('❌ Erreur useSupplyProducts:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters?.supplier, filters?.low_stock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { 
    products, 
    loading, 
    error, 
    refetch: fetchProducts
  };
};

// Hook pour les statistiques - CORRIGÉ
export const useSupplyStats = () => {
  const [stats, setStats] = useState<{
    total_pending: number;
    total_received: number;
    total_cancelled: number;
  }>({ total_pending: 0, total_received: 0, total_cancelled: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      console.log('🟡 Début fetchStats...');
      setLoading(true);
      setError(null);
      
      const statsData = await supplyService.getSupplyStats();
      console.log('📊 Stats brutes reçues du service:', statsData);
      
      // Assurer que nous avons les bonnes propriétés
      const formattedStats = {
        total_pending: statsData.total_pending || 0,
        total_received: statsData.total_received || 0,
        total_cancelled: statsData.total_cancelled || 0
      };
      
      console.log('✅ Stats formatées:', formattedStats);
      setStats(formattedStats);
      
    } catch (err) {
      console.error('🔴 Erreur fetchStats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      // Valeurs par défaut en cas d'erreur
      setStats({ total_pending: 0, total_received: 0, total_cancelled: 0 });
    } finally {
      setLoading(false);
      console.log('⚪ Fin fetchStats');
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { 
    stats, 
    loading, 
    error, 
    refetch: fetchStats 
  };
};

// Hook pour les alertes
export const useSupplyAlerts = () => {
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const pendingSupplies = await supplyService.getSupplies({ status: 'pending' });
      
      // Simulation des produits en faible stock
      const lowStockProducts: Product[] = [
        {
          id: 2,
          name: 'Huile végétale 2L',
          sku: 'HUI-VEG-2L',
          current_stock: 15,
          minimum_stock: 25,
          supplier: 2,
          supplier_name: 'Distributeur Ouest'
        }
      ];
      
      setAlerts({
        low_stock_products: lowStockProducts,
        pending_supplies: pendingSupplies,
        critical_alerts: lowStockProducts.length + pendingSupplies.length
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des alertes';
      setError(errorMessage);
      console.error('❌ Erreur useSupplyAlerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { 
    alerts, 
    loading, 
    error, 
    refetch: fetchAlerts
  };
};