// src/pages/Inventory.tsx - VERSION CORRIGÉE
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Eye, CheckCircle, AlertTriangle, 
  Play, Plus, Search, RefreshCw,
  Package, FileText, Loader2, Store,
  AlertCircle, Calendar, Trash2,
  BarChart3, Filter, History, Clock,
  User, Download, ChevronDown, ChevronUp,
  Info, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  inventoryService, 
  InventoryUtils,
  type InventoryCount,
  type InventoryStats,
  type InventoryCountItem,
  type CreateInventoryPayload 
} from '../services/inventoryService';

// Types alignés avec le modèle Django
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

// Interface pour l'historique
interface HistoryRecord {
  id: number;
  action: 'created' | 'started' | 'completed' | 'cancelled' | 'updated' | 'item_added' | 'item_updated';
  action_label: string;
  inventory_reference: string;
  store_name: string;
  user_name: string;
  details?: string;
  timestamp: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
}

const InventoryPage: React.FC = () => {
  // États principaux
  const [inventories, setInventories] = useState<LocalInventoryCount[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    status: 'all' as 'all' | InventoryCount['status'],
    store: 'all'
  });

  // Liste des magasins
  const [stores, setStores] = useState<Store[]>([
    { id: 1, name: 'Magasin Principal' },
    { id: 2, name: 'Succursale Est' },
    { id: 3, name: 'Succursale Ouest' }
  ]);
  const [loadingStores, setLoadingStores] = useState(false);

  // État pour le nouveau inventaire
  const [newInventory, setNewInventory] = useState({
    reference: '',
    store: 0,
    count_date: new Date().toISOString().slice(0, 16),
    status: 'planned' as 'planned' | 'in_progress' | 'completed' | 'cancelled',
    notes: ''
  });

  // États pour les actions en cours
  const [actionLoading, setActionLoading] = useState({
    deletingId: null as number | null,
    startingId: null as number | null,
    completingId: null as number | null,
    creating: false,
    counting: null as number | null
  });

  // Message de succès
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // État pour l'historique
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  // Ref pour éviter les boucles infinies
  const hasLoaded = useRef(false);

  // ============================================
  // FONCTIONS DE CHARGEMENT
  // ============================================

  // Charger les magasins depuis l'API
  const loadStores = useCallback(async (): Promise<Store[]> => {
    try {
      setLoadingStores(true);
      const storesData = await inventoryService.getStores();
      
      const formattedStores: Store[] = storesData.map((store: any) => ({
        id: store.id || 0,
        name: store.name || 'Magasin inconnu',
        address: store.address || store.address_details?.full_address
      }));
      
      setStores(formattedStores);
      return formattedStores;
    } catch (err) {
      console.error('Erreur chargement magasins:', err);
      const defaultStores: Store[] = [
        { id: 1, name: 'Magasin Principal' },
        { id: 2, name: 'Succursale Est' },
        { id: 3, name: 'Succursale Ouest' }
      ];
      setStores(defaultStores);
      return defaultStores;
    } finally {
      setLoadingStores(false);
    }
  }, []);

  // Charger les inventaires
  const loadInventories = useCallback(async (): Promise<LocalInventoryCount[]> => {
    try {
      const inventoriesData = await inventoryService.getInventories();
      
      const inventoriesWithDetails = inventoriesData.map((inv) => ({
        ...inv,
        progress: InventoryUtils.getProgressPercentage(inv),
        store_name: inv.store_name || 'Non spécifié',
        total_items_counted: inv.total_items_counted || 0,
        total_discrepancies: inv.total_discrepancies || 0,
        discrepancy_value: inv.discrepancy_value || 0,
        items: []
      }));

      setInventories(inventoriesWithDetails);
      setError(null);
      return inventoriesWithDetails;
    } catch (err: any) {
      console.error('Erreur chargement inventaires:', err);
      const errorMsg = err.response?.status === 404 
        ? 'API non trouvée. Vérifiez l\'URL.'
        : err.message || 'Impossible de charger les inventaires';
      
      setError(errorMsg);
      setInventories([]);
      return [];
    }
  }, []);

  // Charger les statistiques
  const loadStats = useCallback(async (inventoriesData: LocalInventoryCount[]) => {
    try {
      setLoadingStats(true);
      
      try {
        const statsData = await inventoryService.getInventoryStats();
        setStats(statsData);
      } catch {
        const localStats: InventoryStats = {
          total_inventories: inventoriesData.length,
          in_progress_inventories: inventoriesData.filter(inv => inv.status === 'in_progress').length,
          completed_inventories: inventoriesData.filter(inv => inv.status === 'completed').length,
          planned_inventories: inventoriesData.filter(inv => inv.status === 'planned').length,
          cancelled_inventories: inventoriesData.filter(inv => inv.status === 'cancelled').length,
          total_discrepancies: inventoriesData.reduce((sum, inv) => sum + (inv.total_discrepancies || 0), 0),
          total_discrepancy_value: inventoriesData.reduce((sum, inv) => sum + (inv.discrepancy_value || 0), 0),
          average_discrepancy_rate: 0,
          recent_inventories_count: 0
        };
        setStats(localStats);
      }
    } catch (err) {
      console.error('Erreur stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Charger l'historique (simulé depuis les inventaires)
  const loadHistory = useCallback(async (inventoriesData: LocalInventoryCount[]) => {
    try {
      setLoadingHistory(true);
      
      // Générer un historique à partir des données d'inventaire
      const historyRecords: HistoryRecord[] = [];
      
      inventoriesData.forEach(inv => {
        // Date de création
        historyRecords.push({
          id: inv.id * 100 + 1,
          action: 'created',
          action_label: 'Création',
          inventory_reference: inv.reference,
          store_name: inv.store_name,
          user_name: inv.created_by ? `Utilisateur #${inv.created_by}` : 'Système',
          details: `Inventaire créé avec statut: ${inv.status}`,
          timestamp: inv.created_at,
          icon: <Plus className="h-3 w-3" />,
          color: 'green'
        });
        
        // Si démarré
        if (inv.started_at) {
          historyRecords.push({
            id: inv.id * 100 + 2,
            action: 'started',
            action_label: 'Démarrage',
            inventory_reference: inv.reference,
            store_name: inv.store_name,
            user_name: 'Opérateur',
            details: 'Comptage démarré',
            timestamp: inv.started_at,
            icon: <Play className="h-3 w-3" />,
            color: 'blue'
          });
        }
        
        // Si terminé
        if (inv.completed_at) {
          historyRecords.push({
            id: inv.id * 100 + 3,
            action: 'completed',
            action_label: 'Terminaison',
            inventory_reference: inv.reference,
            store_name: inv.store_name,
            user_name: 'Superviseur',
            details: inv.total_discrepancies 
              ? `${inv.total_discrepancies} écart(s) détecté(s)`
              : 'Aucun écart détecté',
            timestamp: inv.completed_at,
            icon: <CheckCircle className="h-3 w-3" />,
            color: inv.total_discrepancies ? 'red' : 'green'
          });
        }
        
        // Si annulé
        if (inv.status === 'cancelled') {
          historyRecords.push({
            id: inv.id * 100 + 4,
            action: 'cancelled',
            action_label: 'Annulation',
            inventory_reference: inv.reference,
            store_name: inv.store_name,
            user_name: 'Administrateur',
            details: 'Inventaire annulé',
            timestamp: inv.updated_at,
            icon: <AlertCircle className="h-3 w-3" />,
            color: 'yellow'
          });
        }
      });
      
      // Trier par date (plus récent en premier)
      historyRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Limiter à 20 entrées
      setHistory(historyRecords.slice(0, 20));
      
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Charger toutes les données
  const loadAllData = useCallback(async () => {
    if (hasLoaded.current) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const timeoutId = setTimeout(() => {
      if (hasLoaded.current === false) {
        setError('Le chargement prend trop de temps.');
        setLoading(false);
        hasLoaded.current = true;
      }
    }, 10000);

    try {
      const [loadedInventories] = await Promise.all([
        loadInventories().catch(() => []),
        loadStores().catch(() => stores)
      ]);
      
      await Promise.all([
        loadStats(loadedInventories),
        loadHistory(loadedInventories)
      ]);
      
      hasLoaded.current = true;
      
    } catch (err: any) {
      console.error('Erreur générale:', err);
      setError('Erreur de chargement: ' + (err.message || 'Erreur inconnue'));
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [loadStores, loadInventories, loadStats, loadHistory, stores]);

  // ============================================
  // USE EFFECTS
  // ============================================

  useEffect(() => {
    loadAllData();
    
    return () => {
      // Nettoyage
    };
  }, [loadAllData]);

  // ============================================
  // FONCTIONS D'ACTION
  // ============================================

  const handleRefresh = useCallback(async () => {
    hasLoaded.current = false;
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await loadAllData();
      setSuccessMessage('Données rafraîchies avec succès');
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err: any) {
      setError('Erreur lors du rafraîchissement');
    }
  }, [loadAllData]);

  const handleCreateInventory = async () => {
    if (!newInventory.reference.trim()) {
      alert('La référence est obligatoire');
      return;
    }

    if (newInventory.store === 0) {
      alert('Veuillez sélectionner un magasin');
      return;
    }

    setActionLoading(prev => ({ ...prev, creating: true }));

    try {
      const payload: CreateInventoryPayload = {
        reference: newInventory.reference.trim(),
        store: newInventory.store,
        status: newInventory.status,
        notes: newInventory.notes || '',
        count_date: new Date(newInventory.count_date).toISOString()
      };
      
      const created = await inventoryService.createInventory(payload);

      const newInv: LocalInventoryCount = {
        ...created,
        progress: InventoryUtils.getProgressPercentage(created),
        store_name: created.store_name || 'Non spécifié',
        total_items_counted: created.total_items_counted || 0,
        total_discrepancies: created.total_discrepancies || 0,
        discrepancy_value: created.discrepancy_value || 0,
        items: []
      };
      
      setInventories(prev => [newInv, ...prev]);
      
      // Ajouter à l'historique
      const historyRecord: HistoryRecord = {
        id: Date.now(),
        action: 'created',
        action_label: 'Création',
        inventory_reference: newInv.reference,
        store_name: newInv.store_name,
        user_name: 'Vous',
        details: `Nouvel inventaire créé (${newInv.status})`,
        timestamp: new Date().toISOString(),
        icon: <Plus className="h-3 w-3" />,
        color: 'green'
      };
      
      setHistory(prev => [historyRecord, ...prev.slice(0, 19)]);
      
      setNewInventory({
        reference: '',
        store: 0,
        count_date: new Date().toISOString().slice(0, 16),
        status: 'planned',
        notes: ''
      });

      setSuccessMessage('Inventaire créé avec succès !');
      
    } catch (error: any) {
      console.error('Erreur création:', error);
      alert(`Erreur: ${error.message || 'Erreur lors de la création'}`);
    } finally {
      setActionLoading(prev => ({ ...prev, creating: false }));
    }
  };

  const handleStartCounting = async (inventoryId: number) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return;
    
    setActionLoading(prev => ({ ...prev, counting: inventoryId }));
    
    try {
      await inventoryService.startInventory(inventoryId);
      
      setInventories(prev => prev.map(inv => 
        inv.id === inventoryId 
          ? { ...inv, status: 'in_progress', progress: 50 }
          : inv
      ));
      
      // Ajouter à l'historique
      const historyRecord: HistoryRecord = {
        id: Date.now(),
        action: 'started',
        action_label: 'Démarrage',
        inventory_reference: inventory.reference,
        store_name: inventory.store_name,
        user_name: 'Vous',
        details: 'Comptage démarré',
        timestamp: new Date().toISOString(),
        icon: <Play className="h-3 w-3" />,
        color: 'blue'
      };
      
      setHistory(prev => [historyRecord, ...prev.slice(0, 19)]);
      
      setSuccessMessage('Comptage démarré avec succès');
      
    } catch (error: any) {
      console.error('Erreur démarrage comptage:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, counting: null }));
    }
  };

  const handleCompleteInventory = async (inventoryId: number) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return;
    
    if (!window.confirm(`Terminer l'inventaire "${inventory.reference}" ?`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, completingId: inventoryId }));
    
    try {
      await inventoryService.completeInventory(inventoryId);
      
      // Simuler des écarts pour l'exemple
      const hasDiscrepancies = Math.random() > 0.5;
      const discrepancyCount = hasDiscrepancies ? Math.floor(Math.random() * 5) + 1 : 0;
      
      setInventories(prev => prev.map(inv => 
        inv.id === inventoryId 
          ? { 
              ...inv, 
              status: 'completed', 
              progress: 100,
              total_discrepancies: discrepancyCount,
              discrepancy_value: discrepancyCount * 10
            }
          : inv
      ));
      
      // Ajouter à l'historique
      const historyRecord: HistoryRecord = {
        id: Date.now(),
        action: 'completed',
        action_label: 'Terminaison',
        inventory_reference: inventory.reference,
        store_name: inventory.store_name,
        user_name: 'Vous',
        details: discrepancyCount 
          ? `${discrepancyCount} écart(s) détecté(s)`
          : 'Aucun écart détecté',
        timestamp: new Date().toISOString(),
        icon: <CheckCircle className="h-3 w-3" />,
        color: discrepancyCount ? 'red' : 'green'
      };
      
      setHistory(prev => [historyRecord, ...prev.slice(0, 19)]);
      
      setSuccessMessage('Inventaire terminé avec succès !');
    } catch (error: any) {
      console.error('Erreur validation:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, completingId: null }));
    }
  };

  const handleDeleteInventory = async (inventoryId: number) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return;
    
    if (!window.confirm(`Supprimer l'inventaire "${inventory.reference}" ?`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, deletingId: inventoryId }));
    
    try {
      await inventoryService.deleteInventory(inventoryId);
      
      setInventories(prev => prev.filter(inv => inv.id !== inventoryId));
      
      // Ajouter à l'historique
      const historyRecord: HistoryRecord = {
        id: Date.now(),
        action: 'cancelled',
        action_label: 'Suppression',
        inventory_reference: inventory.reference,
        store_name: inventory.store_name,
        user_name: 'Vous',
        details: 'Inventaire supprimé',
        timestamp: new Date().toISOString(),
        icon: <Trash2 className="h-3 w-3" />,
        color: 'yellow'
      };
      
      setHistory(prev => [historyRecord, ...prev.slice(0, 19)]);
      
      setSuccessMessage('Inventaire supprimé avec succès');
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, deletingId: null }));
    }
  };

  // ============================================
  // COMPOSANTS UI
  // ============================================

  const StatusBadge: React.FC<{ status: InventoryCount['status'] }> = ({ status }) => {
    const config = InventoryUtils.getStatusConfig(status);
    
    return (
      <div className="flex items-center gap-2" title={config.label}>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
          {config.label}
        </span>
      </div>
    );
  };

  const ProgressBar: React.FC<{ 
    progress: number;
    itemsCount?: number;
    discrepancies?: number;
  }> = ({ progress, itemsCount = 0, discrepancies = 0 }) => {
    return (
      <div className="w-40">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{progress}%</span>
          <span>{itemsCount} articles</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-green-500' : 
              progress >= 50 ? 'bg-blue-500' : 
              progress > 0 ? 'bg-yellow-500' : 
              'bg-gray-300'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {discrepancies > 0 && (
          <div className="text-xs text-red-600 mt-1">
            ⚠️ {discrepancies} écart(s)
          </div>
        )}
      </div>
    );
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  }> = ({ title, value, icon, description, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700'
    };

    return (
      <div className={`border rounded-lg p-4 ${colorClasses[color]} hover:shadow-sm transition-shadow`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-sm font-medium opacity-75">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="p-2 rounded-lg bg-white">
            {icon}
          </div>
        </div>
        {description && (
          <p className="text-xs opacity-75 mt-2">{description}</p>
        )}
      </div>
    );
  };

  // Composant pour une ligne d'historique
  const HistoryRow: React.FC<{ record: HistoryRecord }> = ({ record }) => {
    const colorClasses = {
      green: 'bg-green-50 text-green-700 border-green-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200'
    };

    const iconClasses = {
      green: 'text-green-600',
      blue: 'text-blue-600',
      red: 'text-red-600',
      yellow: 'text-yellow-600',
      purple: 'text-purple-600'
    };

    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colorClasses[record.color]}`}>
              <div className={`${iconClasses[record.color]}`}>
                {record.icon}
              </div>
            </div>
            <div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${colorClasses[record.color]}`}>
                {record.action_label}
              </span>
            </div>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="font-mono text-sm font-medium text-gray-900">
            {record.inventory_reference}
          </div>
          <div className="text-xs text-gray-500">{record.store_name}</div>
        </td>
        <td className="py-3 px-4">
          <div className="text-sm text-gray-900">{record.user_name}</div>
        </td>
        <td className="py-3 px-4">
          <div className="text-sm text-gray-900 max-w-xs truncate">{record.details}</div>
        </td>
        <td className="py-3 px-4">
          <div className="text-sm text-gray-900 flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            {InventoryUtils.formatDate(record.timestamp, true)}
          </div>
        </td>
      </tr>
    );
  };

  const LoadingState = () => (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="text-center max-w-md">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Chargement</h3>
        <p className="text-gray-600">Récupération des données...</p>
      </div>
    </div>
  );

  // Filtrer les inventaires
  const filteredInventories = inventories.filter(inv => {
    if (filters.search && 
        !inv.reference.toLowerCase().includes(filters.search.toLowerCase()) &&
        !inv.store_name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    if (filters.status !== 'all' && inv.status !== filters.status) {
      return false;
    }
    
    if (filters.store !== 'all' && inv.store.toString() !== filters.store) {
      return false;
    }
    
    return true;
  });

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

  if (loading && inventories.length === 0 && !error) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* En-tête */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Inventaires</h1>
            <p className="text-gray-600">
              {inventories.length} inventaire(s) chargé(s)
            </p>
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        {/* Statistiques - 3 cartes seulement */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tableau de bord</h2>
          
          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-gray-200 rounded-lg p-6 bg-white">
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mb-2 rounded"></div>
                  <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Inventaires"
                value={stats?.total_inventories || 0}
                icon={<FileText className="h-5 w-5" />}
                color="blue"
              />
              
              <StatCard
                title="En Cours"
                value={stats?.in_progress_inventories || 0}
                icon={<RefreshCw className="h-5 w-5" />}
                color="yellow"
              />
              
              <StatCard
                title="Terminés"
                value={stats?.completed_inventories || 0}
                icon={<CheckCircle className="h-5 w-5" />}
                color="green"
              />
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              >
                <option value="all">Tous statuts</option>
                <option value="planned">Planifié</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={filters.store}
                onChange={(e) => setFilters({ ...filters, store: e.target.value })}
                disabled={loadingStores}
              >
                <option value="all">Tous magasins</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id.toString()}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des inventaires */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">
                  Inventaires ({filteredInventories.length})
                </h2>
              </div>
            </div>

            {filteredInventories.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun inventaire trouvé</h3>
                <p className="text-gray-500 mb-6">
                  {inventories.length === 0 
                    ? "Créez votre premier inventaire pour commencer" 
                    : "Aucun inventaire ne correspond à vos filtres"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Référence</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Magasin</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progression</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredInventories.map((inventory) => (
                      <tr key={inventory.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <div className="font-mono text-sm font-semibold text-gray-900">{inventory.reference}</div>
                            {inventory.notes && (
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{inventory.notes}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{inventory.store_name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            {InventoryUtils.formatDate(inventory.count_date)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={inventory.status} />
                        </td>
                        <td className="py-4 px-6">
                          <ProgressBar 
                            progress={inventory.progress}
                            itemsCount={inventory.total_items_counted}
                            discrepancies={inventory.total_discrepancies}
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => window.location.href = `/inventory/${inventory.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {inventory.status === 'planned' && (
                              <button
                                onClick={() => handleStartCounting(inventory.id)}
                                disabled={actionLoading.counting === inventory.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Démarrer le comptage"
                              >
                                {actionLoading.counting === inventory.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {inventory.status === 'in_progress' && (
                              <button
                                onClick={() => handleCompleteInventory(inventory.id)}
                                disabled={actionLoading.completingId === inventory.id}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Terminer l'inventaire"
                              >
                                {actionLoading.completingId === inventory.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteInventory(inventory.id)}
                              disabled={actionLoading.deletingId === inventory.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              {actionLoading.deletingId === inventory.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Formulaire de création */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Nouvel Inventaire</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Référence *
                </label>
                <input
                  type="text"
                  placeholder="Ex: INV-2024-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={newInventory.reference}
                  onChange={(e) => setNewInventory({ ...newInventory, reference: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Magasin *
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                  value={newInventory.store}
                  onChange={(e) => setNewInventory({ ...newInventory, store: parseInt(e.target.value) })}
                  disabled={loadingStores}
                >
                  <option value={0}>Sélectionner un magasin</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début *
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={newInventory.count_date}
                  onChange={(e) => setNewInventory({ ...newInventory, count_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut initial
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                  value={newInventory.status}
                  onChange={(e) => setNewInventory({ ...newInventory, status: e.target.value as any })}
                >
                  <option value="planned">Planifié</option>
                  <option value="in_progress">En cours</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  placeholder="Description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={newInventory.notes}
                  onChange={(e) => setNewInventory({ ...newInventory, notes: e.target.value })}
                  rows={3}
                />
              </div>
              
              <button 
                onClick={handleCreateInventory}
                disabled={actionLoading.creating || !newInventory.reference.trim() || newInventory.store === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer l'inventaire
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
      TABLEAU D'HISTORIQUE EN BAS
      ============================================ */}
      <div className="mt-8">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* En-tête de l'historique */}
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {showHistory ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historique des Activités
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {history.length} activité(s) récente(s)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistory([])}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  title="Effacer l'historique"
                >
                  Effacer
                </button>
                <button
                  onClick={() => loadHistory(inventories)}
                  disabled={loadingHistory}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                  title="Actualiser l'historique"
                >
                  {loadingHistory ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Actualiser'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Contenu de l'historique */}
          {showHistory && (
            <>
              {loadingHistory ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Chargement de l'historique...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun historique</h3>
                  <p className="text-gray-500">
                    Les activités apparaîtront ici lorsque vous effectuerez des actions.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Inventaire
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Utilisateur
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Détails
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Heure
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {history.map((record) => (
                        <HistoryRow key={record.id} record={record} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Résumé de l'historique */}
              {history.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600">
                          Créations: {history.filter(h => h.action === 'created').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-gray-600">
                          Démarrages: {history.filter(h => h.action === 'started').length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <span className="text-xs text-gray-600">
                          Terminaisons: {history.filter(h => h.action === 'completed').length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Dernière activité: {history.length > 0 && InventoryUtils.formatDate(history[0].timestamp, true)}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pied de page */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <div>
            <p>© {new Date().getFullYear()} Système de Gestion d'Inventaire</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              En ligne
            </span>
            <span>
              {inventories.length} inventaire(s) • {history.length} activité(s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;