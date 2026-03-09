// src/pages/Inventory.tsx
import React, { useState, useEffect } from 'react';
import { 
  Eye, Edit, Trash2, CheckCircle, AlertTriangle, 
  Download, Play, Plus, Search, RefreshCw, Calendar,
  Package, FileText, Loader2, Store, User, Filter
} from 'lucide-react';
import { 
  inventoryService, 
  InventoryUtils,
  type InventoryCount,
  type InventoryStats 
} from '../services/inventoryService';

// Type pour les données locales
interface LocalInventoryCount extends InventoryCount {
  progress: number;
  store_name: string;
}

// Type pour les magasins
interface Store {
  id: number;
  name: string;
}

const InventoryPage: React.FC = () => {
  // États principaux
  const [inventories, setInventories] = useState<LocalInventoryCount[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  
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

  // États pour le nouveau inventaire
  const [newInventory, setNewInventory] = useState({
    name: '',
    store_id: 0,
    count_date: new Date().toISOString().split('T')[0],
    notes: '',
    type: 'cyclic'
  });

  // États pour les actions en cours
  const [actionLoading, setActionLoading] = useState({
    deletingId: null as number | null,
    startingId: null as number | null,
    completingId: null as number | null,
    creating: false
  });

  // États pour les alertes
  const [alerts, setAlerts] = useState<Array<{
    message: string;
    product_name: string;
    discrepancy: number;
    impact: 'Élevé' | 'Moyen' | 'Faible';
  }>>([]);

  // États pour l'historique
  const [history, setHistory] = useState<LocalInventoryCount[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Message de succès
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Charger les inventaires
  const loadInventories = async () => {
    try {
      console.log('🔄 Chargement des inventaires...');
      const inventoriesData = await inventoryService.getInventories();
      
      // Transformer les données
      const transformedInventories = inventoriesData.map(inv => ({
        ...inv,
        progress: InventoryUtils.getProgressPercentage(inv),
        store_name: inv.store_name || 'Non spécifié'
      }));

      setInventories(transformedInventories);
      console.log('✅ Inventaires chargés:', transformedInventories.length);
    } catch (err: any) {
      console.error('❌ Erreur chargement inventaires:', err);
      setError('Impossible de charger les inventaires');
      throw err;
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    setLoadingStats(true);
    setStatsError(null);
    
    try {
      console.log('📊 Chargement des statistiques...');
      const statsData = await inventoryService.getInventoryStats();
      setStats(statsData);
      console.log('✅ Stats chargées:', statsData);
    } catch (statsErr: any) {
      console.error('❌ Erreur stats:', statsErr);
      setStatsError('Impossible de charger les statistiques');
      
      // Calculer les stats basiques depuis les inventaires
      const currentInventories = inventories;
      if (currentInventories.length > 0) {
        const inProgress = currentInventories.filter(inv => inv.status === 'in_progress').length;
        const planned = currentInventories.filter(inv => inv.status === 'planned').length;
        const completed = currentInventories.filter(inv => inv.status === 'completed').length;
        
        setStats({
          total_inventories: currentInventories.length,
          in_progress_inventories: inProgress,
          completed_inventories: completed,
          planned_inventories: planned,
          total_discrepancies: 0,
          total_discrepancy_value: 0
        });
      }
    } finally {
      setLoadingStats(false);
    }
  };

  // Charger l'historique
  const loadHistory = async () => {
    setLoadingHistory(true);
    
    try {
      console.log('📜 Chargement de l\'historique...');
      const allInventories = await inventoryService.getInventories();
      const completedInventories = allInventories
        .filter(inv => inv.status === 'completed')
        .slice(0, 5); // Limiter à 5 pour l'historique
      
      const transformedHistory = completedInventories.map(inv => ({
        ...inv,
        progress: 100,
        store_name: inv.store_name || 'Non spécifié'
      }));
      
      setHistory(transformedHistory);
      console.log('✅ Historique chargé:', transformedHistory.length);
    } catch (historyErr) {
      console.error('❌ Erreur historique:', historyErr);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Charger toutes les données
  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      await loadInventories();
      await loadStats();
      await loadHistory();
      loadAlerts();
    } catch (err: any) {
      console.error('❌ Erreur générale:', err);
      setError(err.message || 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  // Charger les alertes (pas de mock)
  const loadAlerts = async () => {
    try {
      // Pour l'instant, pas d'alertes mockées
      // Vous pourrez implémenter un endpoint API plus tard
      setAlerts([]);
    } catch (err) {
      console.error('Erreur chargement alertes:', err);
      setAlerts([]);
    }
  };

  // Initialisation
  useEffect(() => {
    loadAllData();
  }, []);

  // Filtrer les inventaires
  const filteredInventories = inventories.filter(inv => {
    // Filtre par recherche
    if (filters.search && 
        !inv.reference.toLowerCase().includes(filters.search.toLowerCase()) &&
        !inv.name?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    // Filtre par statut
    if (filters.status !== 'all' && inv.status !== filters.status) {
      return false;
    }
    
    // Filtre par magasin (si vous avez l'info)
    if (filters.store !== 'all' && inv.store_name !== filters.store) {
      return false;
    }
    
    return true;
  });

  // Inventaires en cours (non terminés)
  const ongoingInventories = filteredInventories.filter(inv => 
    inv.status !== 'completed' && inv.status !== 'cancelled'
  );

  // Inventaires terminés
  const completedInventories = filteredInventories.filter(inv => 
    inv.status === 'completed'
  );

  // Gestionnaires d'événements
  const handleViewInventory = (inventory: LocalInventoryCount) => {
    console.log('Voir inventaire:', inventory);
    // Navigation vers la page de détails
    window.location.href = `/inventory/${inventory.id}`;
  };

  const handleEditInventory = (inventory: LocalInventoryCount) => {
    console.log('Éditer inventaire:', inventory);
    // Ouvrir un modal d'édition
    alert(`Édition de l'inventaire ${inventory.reference} - À implémenter`);
  };

  const handleDeleteInventory = async (inventory: LocalInventoryCount) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'inventaire "${inventory.name}" ?`)) {
      return;
    }

    setActionLoading(prev => ({ ...prev, deletingId: inventory.id }));
    
    try {
      await inventoryService.deleteInventory(inventory.id);
      await loadAllData();
      setSuccessMessage('Inventaire supprimé avec succès');
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, deletingId: null }));
    }
  };

  const handleValidateInventory = async (inventory: LocalInventoryCount) => {
    setActionLoading(prev => ({ ...prev, completingId: inventory.id }));
    
    try {
      await inventoryService.completeInventory(inventory.id);
      await loadAllData();
      setSuccessMessage('Inventaire validé avec succès');
    } catch (error: any) {
      console.error('Erreur validation:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, completingId: null }));
    }
  };

  const handleStartInventory = async (inventory: LocalInventoryCount) => {
    setActionLoading(prev => ({ ...prev, startingId: inventory.id }));
    
    try {
      await inventoryService.startInventory(inventory.id);
      await loadAllData();
      setSuccessMessage('Inventaire démarré avec succès');
    } catch (error: any) {
      console.error('Erreur démarrage:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, startingId: null }));
    }
  };

  const handleDownloadReport = async (inventory: LocalInventoryCount) => {
    try {
      const blob = await inventoryService.exportInventory(inventory.id, 'pdf');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventaire-${inventory.reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Rapport téléchargé avec succès');
    } catch (error: any) {
      console.error('Erreur téléchargement:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  const handleCreateInventory = async () => {
    // Validation
    if (!newInventory.name.trim()) {
      alert('Veuillez saisir un nom pour l\'inventaire');
      return;
    }

    if (newInventory.store_id === 0) {
      alert('Veuillez sélectionner un magasin');
      return;
    }

    setActionLoading(prev => ({ ...prev, creating: true }));

    try {
      await inventoryService.createInventory({
        store_id: newInventory.store_id,
        count_date: newInventory.count_date,
        name: newInventory.name,
        notes: newInventory.notes
      });

      // Recharger les données
      await loadAllData();
      
      // Réinitialiser le formulaire
      setNewInventory({
        name: '',
        store_id: 0,
        count_date: new Date().toISOString().split('T')[0],
        notes: '',
        type: 'cyclic'
      });

      setSuccessMessage('Inventaire créé avec succès !');
    } catch (error: any) {
      console.error('Erreur création:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, creating: false }));
    }
  };

  // Composants UI
  const StatusBadge: React.FC<{ status: InventoryCount['status'] }> = ({ status }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'planned':
          return { label: 'Planifié', color: 'bg-yellow-100 text-yellow-800', icon: Calendar };
        case 'in_progress':
          return { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: RefreshCw };
        case 'completed':
          return { label: 'Terminé', color: 'bg-green-100 text-green-800', icon: CheckCircle };
        case 'cancelled':
          return { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
        default:
          return { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText };
      }
    };

    const { label, color, icon: Icon } = getStatusConfig();
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
    return (
      <div className="w-32">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full ${
              progress === 100 ? 'bg-green-500' : 
              progress >= 50 ? 'bg-blue-500' : 
              progress > 0 ? 'bg-yellow-500' : 
              'bg-gray-300'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 mt-1">{progress}%</div>
      </div>
    );
  };

  // États de chargement
  if (loading && inventories.length === 0) {
    return (
      <div className="min-h-screen bg-white p-6 font-sans flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chargement des données</h3>
          <p className="text-gray-600">Connexion à la base de données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      {/* En-tête avec bouton rafraîchir */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Inventaires</h1>
            <p className="text-gray-600">
              Lancez et suivez vos inventaires physiques, validez les quantités et corrigez les écarts.
            </p>
          </div>
          <button
            onClick={loadAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </div>

        {/* Messages de succès */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Messages d'erreur */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Synthèse */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Synthèse de l'Inventaire</h2>
          <p className="text-gray-500 text-sm mb-4">Données en temps réel depuis votre base de données</p>
          
          {loadingStats ? (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-gray-200 rounded-lg p-6 text-center">
                  <div className="animate-pulse bg-gray-200 h-8 w-16 mx-auto mb-2 rounded"></div>
                  <div className="animate-pulse bg-gray-200 h-4 w-24 mx-auto rounded"></div>
                </div>
              ))}
            </div>
          ) : statsError ? (
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700">{statsError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-sm transition-shadow">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stats?.total_inventories || 0}
                </div>
                <div className="text-gray-500">Inventaires totaux</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-sm transition-shadow">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stats?.in_progress_inventories || 0}
                </div>
                <div className="text-gray-500">En cours</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-sm transition-shadow">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {stats?.total_discrepancies || 0}
                </div>
                <div className="text-gray-500">Écarts détectés</div>
              </div>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filtres:</span>
            </div>
            
            <div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              >
                <option value="all">Tous les statuts</option>
                <option value="planned">Planifié</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Rechercher par référence ou nom..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Colonne gauche (2/3) */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Inventaires en Cours ({ongoingInventories.length})
          </h2>
          
          {ongoingInventories.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun inventaire en cours</h3>
              <p className="text-gray-500">Créez votre premier inventaire pour commencer</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Référence</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Nom</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Magasin</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Date</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Statut</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Progression</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ongoingInventories.map((inventory) => (
                      <tr key={inventory.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{inventory.reference}</td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-gray-900">{inventory.name}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Store className="h-3 w-3" />
                            {inventory.store_name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {InventoryUtils.formatDate(inventory.count_date)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={inventory.status} />
                        </td>
                        <td className="py-3 px-4">
                          <ProgressBar progress={inventory.progress} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewInventory(inventory)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleEditInventory(inventory)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Éditer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            {inventory.status === 'planned' && (
                              <button
                                onClick={() => handleStartInventory(inventory)}
                                disabled={actionLoading.startingId === inventory.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                title="Démarrer l'inventaire"
                              >
                                {actionLoading.startingId === inventory.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {inventory.status === 'in_progress' && (
                              <button
                                onClick={() => handleValidateInventory(inventory)}
                                disabled={actionLoading.completingId === inventory.id}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
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
                              onClick={() => handleDownloadReport(inventory)}
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title="Télécharger le rapport"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteInventory(inventory)}
                              disabled={actionLoading.deletingId === inventory.id}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
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
            </div>
          )}
        </div>

        {/* Colonne droite (1/3) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Nouvel Inventaire */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Lancer un Nouvel Inventaire</h2>
            <p className="text-gray-500 text-sm mb-6">Créez un nouvel inventaire dans votre base de données</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Nom de l'Inventaire *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Inventaire Annuel 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={newInventory.name}
                  onChange={(e) => setNewInventory({ ...newInventory, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Magasin *
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={newInventory.store_id}
                  onChange={(e) => setNewInventory({ ...newInventory, store_id: parseInt(e.target.value) })}
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Type d'inventaire
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={newInventory.type}
                  onChange={(e) => setNewInventory({ ...newInventory, type: e.target.value })}
                >
                  <option value="cyclic">Cyclique</option>
                  <option value="annual">Annuel</option>
                  <option value="partial">Partiel</option>
                  <option value="spot">Spot</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Date de comptage *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={newInventory.count_date}
                  onChange={(e) => setNewInventory({ ...newInventory, count_date: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Notes (optionnel)
                </label>
                <textarea
                  placeholder="Notes supplémentaires..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={newInventory.notes}
                  onChange={(e) => setNewInventory({ ...newInventory, notes: e.target.value })}
                  rows={2}
                />
              </div>
              
              <button 
                onClick={handleCreateInventory}
                disabled={actionLoading.creating}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {actionLoading.creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer dans la base de données
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Alertes */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Alertes et Discrépances</h2>
            <p className="text-gray-500 text-sm mb-6">Écarts détectés dans vos inventaires</p>
            
            {alerts.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-gray-600">Aucun écart détecté</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertTriangle className={`h-4 w-4 ${
                        alert.impact === 'Élevé' ? 'text-red-500' :
                        alert.impact === 'Moyen' ? 'text-orange-500' :
                        'text-yellow-500'
                      }`} />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-800">{alert.message}</p>
                      <p className={`text-xs mt-1 ${
                        alert.impact === 'Élevé' ? 'text-red-600' :
                        alert.impact === 'Moyen' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        - Impact {alert.impact}
                      </p>
                      <button 
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        onClick={() => console.log('Voir détail:', alert)}
                      >
                        Voir le détail →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Historique des Inventaires Terminés</h2>
            <span className="text-sm text-gray-500">
              {completedInventories.length} inventaire(s) terminé(s)
            </span>
          </div>
        </div>
        
        {loadingHistory ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-500 mt-2">Chargement de l'historique...</p>
          </div>
        ) : completedInventories.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucun inventaire terminé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Référence</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Inventaire</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Magasin</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Articles</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedInventories.slice(0, 5).map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{item.reference}</td>
                    <td className="py-3 px-4 text-sm font-medium">{item.name}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        {item.store_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {InventoryUtils.formatDate(item.count_date)}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">
                      {item.items_count?.toLocaleString() || '0'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewInventory(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Voir l'historique"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadReport(item)}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          title="Télécharger le rapport"
                        >
                          <Download className="h-4 w-4" />
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

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200 text-center">
        <p className="text-gray-500">
          Données en direct depuis votre base de données • {new Date().toLocaleDateString('fr-FR')}
        </p>
        <div className="mt-2 text-sm text-gray-400">
          {inventories.length} inventaire(s) • {ongoingInventories.length} en cours • {stats?.total_discrepancies || 0} écart(s) détecté(s)
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;