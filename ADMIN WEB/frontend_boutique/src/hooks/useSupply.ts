// src/hooks/useSupply.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Supply, 
  Supplier, 
  Store,
  CreateSupplyData,
  CreateSupplierData
} from '../services/supplyService';
import { supplyService } from '../services/supplyService';

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
  store?: number | string;
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
      
      console.log('🔍 Chargement avec filtres:', stableFilters);
      
      // CORRECTION : Toujours utiliser searchSupplies qui gère tous les filtres
      const data = await supplyService.searchSupplies(
        stableFilters?.search || '', 
        stableFilters?.status,
        stableFilters?.store
      );
      
      console.log(`📦 ${data.length} approvisionnement(s) trouvé(s)`);
      
      setSupplies(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des approvisionnements';
      setError(errorMessage);
      console.error('❌ Erreur useSupplies:', err);
      setSupplies([]);
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
      console.log('🟡 Création en cours...');
      console.log('📤 Données envoyées:', supplyData);
      const newSupply = await supplyService.createSupply(supplyData);
      console.log('✅ Approvisionnement créé');
      
      // Rafraîchir les données
      await fetchSupplies();
      return newSupply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création';
      console.error('❌ Erreur création:', err);
      throw new Error(errorMessage);
    }
  };

  // CORRECTION : Changement de signature pour accepter Partial<CreateSupplyData>
  const updateSupply = async (id: number, supplyData: Partial<CreateSupplyData>): Promise<Supply> => {
    try {
      console.log('🔄 Mise à jour de la commande:', { id, supplyData });
      const updatedSupply = await supplyService.updateSupply(id, supplyData);
      await fetchSupplies();
      return updatedSupply;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      console.error('❌ Erreur updateSupply:', err);
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
      
      console.log(`📞 ${data.length} fournisseur(s) chargé(s)`);
      
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des fournisseurs';
      setError(errorMessage);
      console.error('❌ Erreur useSuppliers:', err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, lastFetchTime]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const createSupplier = async (supplierData: CreateSupplierData): Promise<Supplier> => {
    try {
      // Validation des données requises
      if (!supplierData.name || !supplierData.name.trim()) {
        throw new Error('Le nom du fournisseur est requis');
      }
      
      if (!supplierData.store) {
        throw new Error('Le magasin est requis');
      }
      
      const newSupplier = await supplyService.createSupplier(supplierData);
      await fetchSuppliers();
      return newSupplier;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création du fournisseur';
      throw new Error(errorMessage);
    }
  };

  const deleteSupplier = async (id: number): Promise<void> => {
    try {
      await supplyService.deleteSupplier(id);
      await fetchSuppliers();
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

// Hook pour les magasins
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
      
      console.log(`🏪 ${data.length} magasin(s) chargé(s)`);
      
      setStores(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des magasins';
      setError(errorMessage);
      console.error('❌ Erreur useStores:', err);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return { 
    stores, 
    loading, 
    error, 
    refetch: fetchStores
  };
};

// Hook pour les statistiques
export const useSupplyStats = () => {
  const [stats, setStats] = useState<{
    total_pending: number;
    total_received: number;
    total_cancelled: number;
    total_supplies: number;
    total_amount: number;
    monthly_trend: number;
  }>({ 
    total_pending: 0, 
    total_received: 0, 
    total_cancelled: 0,
    total_supplies: 0,
    total_amount: 0,
    monthly_trend: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsData = await supplyService.getSupplyStats();
      
      // Validation et transformation des données
      const formattedStats = {
        total_pending: Number(statsData.total_pending) || 0,
        total_received: Number(statsData.total_received) || 0,
        total_cancelled: Number(statsData.total_cancelled) || 0,
        total_supplies: Number(statsData.total_supplies) || 0,
        total_amount: Number(statsData.total_amount) || 0,
        monthly_trend: Number(statsData.monthly_trend) || 0
      };
      
      console.log('📊 Statistiques chargées:', formattedStats);
      setStats(formattedStats);
    } catch (err) {
      console.error('Erreur fetchStats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des statistiques';
      setError(errorMessage);
      
      // Valeurs par défaut en cas d'erreur
      setStats({ 
        total_pending: 0, 
        total_received: 0, 
        total_cancelled: 0,
        total_supplies: 0,
        total_amount: 0,
        monthly_trend: 0
      });
    } finally {
      setLoading(false);
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