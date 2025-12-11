// src/pages/SupplyPage.tsx
import React, { useState, useMemo } from 'react';
import { Plus, Search, Menu, X, AlertCircle } from 'lucide-react';
import { useSupplies, useSuppliers, useSupplyStats } from '../hooks/useSupply';
import { Supply as SupplyType, Supplier, CreateSupplyData } from '../services/supplyService';

// ============================================================================
// MODAL DE CRÉATION D'APPROVISIONNEMENT
// ============================================================================

interface CreateSupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (supplyData: CreateSupplyData) => Promise<void>;
  suppliers: Supplier[];
  loading?: boolean;
}

const CreateSupplyModal: React.FC<CreateSupplyModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreate, 
  suppliers,
  loading: externalLoading
}) => {
  const [formData, setFormData] = useState({
    ref_supply: '',
    supplier: '',
    store: '1',
    utilisateur: '1',
    total_command: 0,
    date_supply: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'received' | 'cancelled',
    notes: ''
  });

  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState('');

  const loading = externalLoading || internalLoading;

  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timestamp = now.getTime();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      
      setFormData({
        ref_supply: `SUP-${dateStr}-${timestamp.toString().slice(-6)}`,
        supplier: '',
        store: '1',
        utilisateur: '1',
        total_command: 0,
        date_supply: now.toISOString().split('T')[0],
        status: 'pending',
        notes: ''
      });
      setError('');
    }
  }, [isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalLoading(true);
    setError('');

    try {
      if (!formData.supplier) {
        throw new Error('Veuillez sélectionner un fournisseur');
      }

      const supplyData: CreateSupplyData = {
        ref_supply: formData.ref_supply,
        supplier: parseInt(formData.supplier),
        store: parseInt(formData.store),
        utilisateur: parseInt(formData.utilisateur),
        total_command: formData.total_command,
        date_supply: formData.date_supply,
        status: formData.status,
        notes: formData.notes,
        retail_items: []
      };

      await onCreate(supplyData);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création';
      setError(errorMessage);
      console.error('Erreur création approvisionnement:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Nouvel approvisionnement</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Créez une nouvelle commande</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Fermer"
            disabled={loading}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Référence
              </label>
              <input
                type="text"
                name="ref_supply"
                value={formData.ref_supply}
                readOnly
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Fournisseur <span className="text-red-500">*</span>
              </label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base"
                required
                disabled={loading}
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date_supply"
                  value={formData.date_supply}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Statut
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm sm:text-base"
                  required
                  disabled={loading}
                >
                  <option value="pending">En attente</option>
                  <option value="received">Reçu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-sm sm:text-base"
                placeholder="Informations supplémentaires, instructions spéciales..."
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                'Créer la commande'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANTS RÉUTILISABLES
// ============================================================================

const StatusBadge: React.FC<{ status: SupplyType['status'] }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'received':
        return { text: 'Livrée', className: 'text-green-600' };
      case 'pending':
        return { text: 'En attente', className: 'text-yellow-600' };
      case 'cancelled':
        return { text: 'Annulée', className: 'text-red-600' };
      default:
        return { text: status, className: 'text-gray-600' };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`font-medium text-sm sm:text-base ${config.className}`}>
      {config.text}
    </span>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number;
  subtitle: string;
  color: 'green' | 'blue' | 'red';
  loading?: boolean;
}> = ({ title, value, subtitle, color, loading = false }) => {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600'
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 animate-pulse">
        <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 sm:h-10 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 transition-all hover:shadow-sm">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mt-1 sm:mt-2">{value}</p>
      <p className={`text-xs sm:text-sm font-medium mt-1 sm:mt-2 ${colorClasses[color]}`}>
        {subtitle}
      </p>
    </div>
  );
};

const LoadingRow: React.FC<{ colSpan: number }> = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
        <span className="text-gray-600 text-sm sm:text-base">Chargement des commandes...</span>
      </div>
    </td>
  </tr>
);

const ErrorRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
      <div className="text-red-600">
        <div className="flex flex-col items-center">
          <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
          <p className="font-medium text-sm sm:text-base">Erreur de chargement</p>
          <p className="text-xs sm:text-sm mt-1 max-w-md">{message}</p>
        </div>
      </div>
    </td>
  </tr>
);

const EmptyRow: React.FC<{ colSpan: number; message?: string }> = ({ colSpan, message = 'Aucune commande trouvée' }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 sm:px-6 py-8 sm:py-12 text-center">
      <div className="text-gray-500">
        <p className="font-medium text-sm sm:text-base">{message}</p>
        <p className="text-xs sm:text-sm mt-1">Commencez par créer une nouvelle commande</p>
      </div>
    </td>
  </tr>
);

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

const SupplyPage: React.FC = () => {
  // États locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received' | 'cancelled'>('all');
  const [showCreateSupply, setShowCreateSupply] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filtres pour l'API
  const filters = useMemo(() => {
    const baseFilters: any = {};
    if (searchTerm.trim()) baseFilters.search = searchTerm.trim();
    if (statusFilter !== 'all') baseFilters.status = statusFilter;
    return Object.keys(baseFilters).length > 0 ? baseFilters : undefined;
  }, [searchTerm, statusFilter]);
  
  // Données de l'API réelle via vos hooks
  const { 
    supplies, 
    loading: suppliesLoading, 
    error: suppliesError,
    refetch: refetchSupplies,
    createSupply
  } = useSupplies(filters);
  
  const { 
    suppliers, 
    loading: suppliersLoading 
  } = useSuppliers('');
  
  const { 
    stats, 
    loading: statsLoading,
    refetch: refetchStats
  } = useSupplyStats();

  // États de chargement pour la création
  const [creatingSupply, setCreatingSupply] = useState(false);

  // Pagination
  const totalPages = Math.ceil(supplies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSupplies = supplies.slice(startIndex, endIndex);

  // Handlers
  const handleCreateSupply = async (supplyData: CreateSupplyData) => {
    setCreatingSupply(true);
    try {
      await createSupply(supplyData);
      await refetchSupplies(); // Rafraîchir les données après création
      await refetchStats(); // Rafraîchir les statistiques
      setShowCreateSupply(false);
    } catch (error) {
      console.error('Erreur création:', error);
      throw error;
    } finally {
      setCreatingSupply(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const calculateDeliveryDate = (orderDate: string) => {
    try {
      const date = new Date(orderDate);
      date.setDate(date.getDate() + 7);
      return formatDate(date.toISOString());
    } catch {
      return formatDate(orderDate);
    }
  };

  // Rendu des en-têtes du tableau (responsive)
  const renderTableHeaders = (isTrackingTable = false) => {
    if (isTrackingTable) {
      return (
        <>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
            ID COMMANDE
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
            FOURNISSEUR
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
            PRODUIT
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
            QUANTITÉ
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">
            DATE COMMANDE
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap hidden xl:table-cell">
            DATE LIVRAISON
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
            STATUT
          </th>
          <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
            ACTIONS
          </th>
        </>
      );
    }

    return (
      <>
        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
          ID COMMANDE
        </th>
        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
          FOURNISSEUR
        </th>
        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
          DATE
        </th>
        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
          STATUT
        </th>
        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">
          TOTAL
        </th>
        <th className="px-3 sm:px-4 lg:px-6 py-3 text-left font-semibold text-gray-700 text-xs sm:text-sm whitespace-nowrap">
          ACTIONS
        </th>
      </>
    );
  };

  // Rendu d'une ligne de tableau
  const renderTableRow = (supply: SupplyType, isTrackingTable = false) => {
    if (isTrackingTable) {
      return (
        <tr key={supply.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap">
            <span className="font-medium text-xs sm:text-sm">{supply.ref_supply}</span>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm">
            {supply.supplier_name || supply.supplier?.name || 'Non spécifié'}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 text-xs sm:text-sm">
            <span className="line-clamp-1">{supply.retail_items?.[0]?.product_name || 'Produit non spécifié'}</span>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm">
            {supply.retail_items?.[0]?.quantity || '-'}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">
            {formatDate(supply.date_supply)}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm hidden xl:table-cell">
            {calculateDeliveryDate(supply.date_supply)}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
            <StatusBadge status={supply.status} />
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
            <button 
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Actions"
              title="Actions"
            >
              <span className="text-lg">⋯</span>
            </button>
          </td>
        </tr>
      );
    }

    return (
      <tr key={supply.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
        <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap">
          <span className="font-medium text-xs sm:text-sm">{supply.ref_supply}</span>
        </td>
        <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm">
          <span className="line-clamp-1">{supply.supplier_name || supply.supplier?.name || 'Non spécifié'}</span>
        </td>
        <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm">
          {formatDate(supply.date_supply)}
        </td>
        <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
          <StatusBadge status={supply.status} />
        </td>
        <td className="px-3 sm:px-4 lg:px-6 py-3 text-gray-900 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">
          <span className="font-medium">{formatCurrency(supply.total_command || 0)}</span>
        </td>
        <td className="px-3 sm:px-4 lg:px-6 py-3 whitespace-nowrap">
          <button 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Actions"
            title="Actions"
          >
            <span className="text-lg">⋯</span>
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header de la page */}
        <header className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Gestion des Approvisionnements
                </h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm md:text-base hidden sm:block">
                  Suivez et gérez vos commandes fournisseurs
                </p>
              </div>
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden text-gray-600 hover:text-gray-900"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} sm:block w-full sm:w-auto`}>
              <button 
                onClick={() => setShowCreateSupply(true)}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2.5 sm:px-5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={suppliersLoading || creatingSupply}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {suppliersLoading ? 'Chargement...' : 'Nouvelle Commande'}
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mt-2 text-xs sm:text-sm md:text-base sm:hidden">
            Suivez et gérez vos commandes fournisseurs
          </p>
        </header>

        {/* Cartes de statistiques */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <StatCard
            title="Commandes en Cours"
            value={stats?.pending_supplies || 0}
            subtitle="+2 nouvelles ce mois-ci"
            color="green"
            loading={statsLoading}
          />
          <StatCard
            title="En Attente de Réception"
            value={supplies.filter(s => s.status === 'pending').length}
            subtitle="3 livraisons prévues cette semaine"
            color="blue"
            loading={suppliesLoading}
          />
          <StatCard
            title="Retards de Livraison"
            value={supplies.filter(s => s.status === 'pending' && new Date(s.date_supply) < new Date()).length}
            subtitle="Urgence sur la commande TRK004"
            color="red"
            loading={suppliesLoading}
          />
        </section>

        {/* Section Commandes Récentes */}
        <section className="bg-white rounded-lg sm:rounded-xl border border-gray-200 mb-4 sm:mb-6 md:mb-8 overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Commandes Récentes</h2>
            <p className="text-gray-600 mt-1 text-xs sm:text-sm">Historique des 5 dernières commandes</p>
          </div>
          
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full min-w-[640px] sm:min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {renderTableHeaders(false)}
                </tr>
              </thead>
              <tbody>
                {suppliesLoading ? (
                  <LoadingRow colSpan={6} />
                ) : suppliesError ? (
                  <ErrorRow colSpan={6} message={suppliesError} />
                ) : supplies.slice(0, 5).length === 0 ? (
                  <EmptyRow colSpan={6} message="Aucune commande récente" />
                ) : (
                  supplies.slice(0, 5).map(supply => renderTableRow(supply, false))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section Suivi et Historique */}
        <section className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                Suivi et Historique des Approvisionnements
              </h2>
              <p className="text-gray-600 mt-1 text-xs sm:text-sm">Suivi des Commandes</p>
              <p className="text-gray-500 text-xs mt-2 hidden sm:block">Historique des Réceptions</p>
            </div>
            
            {/* Barre de recherche */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="RECHERCHEMENT PAR I/D, fournisseur, produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 placeholder-gray-500 uppercase tracking-wide focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={suppliesLoading}
              />
            </div>
          </div>

          {/* Tableau de suivi */}
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full min-w-[800px] lg:min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {renderTableHeaders(true)}
                </tr>
              </thead>
              <tbody>
                {suppliesLoading ? (
                  <LoadingRow colSpan={8} />
                ) : suppliesError ? (
                  <ErrorRow colSpan={8} message={suppliesError} />
                ) : currentSupplies.length === 0 ? (
                  <EmptyRow colSpan={8} />
                ) : (
                  currentSupplies.map(supply => renderTableRow(supply, true))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
              <div className="text-xs sm:text-sm text-gray-600">
                Affichage {startIndex + 1}-{Math.min(endIndex, supplies.length)} sur {supplies.length} commande(s)
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-4 sm:mt-6 md:mt-8 text-center">
          <p className="text-gray-500 text-xs sm:text-sm">
            Made with <span className="font-bold text-gray-700">Visilg</span>
          </p>
        </footer>
      </div>

      {/* Bouton flottant pour mobile */}
      <button 
        onClick={() => setShowCreateSupply(true)}
        className="sm:hidden fixed bottom-4 right-4 z-40 flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Nouvelle commande"
        disabled={suppliersLoading || creatingSupply}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal de création */}
      {showCreateSupply && (
        <CreateSupplyModal
          isOpen={showCreateSupply}
          onClose={() => setShowCreateSupply(false)}
          onCreate={handleCreateSupply}
          suppliers={suppliers}
          loading={suppliersLoading || creatingSupply}
        />
      )}
    </div>
  );
};

export default SupplyPage;