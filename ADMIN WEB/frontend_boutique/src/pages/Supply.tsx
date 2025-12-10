import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Users,
  Package,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  MapPin,
  Mail,
  RefreshCw,
  Info,
  X,
  Minus,
  DollarSign,
  FileText,
  AlertCircle,
  Store,
  ShoppingCart
} from 'lucide-react';
import { useSupplies, useSuppliers, useSupplyStats, useSupplyProducts } from '../hooks/useSupply';
import { Supply as SupplyType, Supplier, CreateSupplyData, RetailSupply } from '../services/supplyService';

// Composant modal pour créer un nouvel approvisionnement
const CreateSupplyModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  onCreate: (supplyData: CreateSupplyData) => Promise<void>;
  suppliers: Supplier[];
}> = ({ isOpen, onClose, onCreate, suppliers }) => {
  const [formData, setFormData] = useState({
    ref_supply: '',
    supplier: '',
    store: '',
    utilisateur: '1', // ID de l'utilisateur connecté (à récupérer du contexte d'auth)
    total_command: 0,
    date_supply: new Date().toISOString().split('T')[0],
    status: 'pending' as 'pending' | 'received' | 'cancelled',
    notes: ''
  });

  const { products } = useSupplyProducts({});
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    id: number;
    product: number;
    product_name?: string;
    quantity: number;
    unit_cost: number;
    total: number;
  }>>([]);
  
  const [searchProduct, setSearchProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Générer une référence automatique selon le format de votre sérialiseur
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timestamp = now.getTime();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      setFormData(prev => ({
        ...prev,
        ref_supply: `SUP-${dateStr}-${timestamp.toString().slice(-6)}`
      }));
    }
  }, [isOpen]);

  // Réinitialiser le formulaire quand le modal s'ouvre
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timestamp = now.getTime();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      
      setFormData({
        ref_supply: `SUP-${dateStr}-${timestamp.toString().slice(-6)}`,
        supplier: '',
        store: '1', // ID du magasin par défaut
        utilisateur: '1', // ID de l'utilisateur connecté
        total_command: 0,
        date_supply: now.toISOString().split('T')[0],
        status: 'pending',
        notes: ''
      });
      setSelectedProducts([]);
      setSearchProduct('');
      setError('');
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProduct = (product: any) => {
    const existingProduct = selectedProducts.find(p => p.product === product.id);
    
    if (existingProduct) {
      setSelectedProducts(prev =>
        prev.map(p =>
          p.product === product.id
            ? { 
                ...p, 
                quantity: p.quantity + 1, 
                total: (p.quantity + 1) * p.unit_cost 
              }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          id: Date.now(), // ID temporaire pour la gestion frontend
          product: product.id,
          product_name: product.name,
          quantity: 1,
          unit_cost: product.cost_price || product.base_price || 0,
          total: product.cost_price || product.base_price || 0
        }
      ]);
    }
    
    setSearchProduct('');
    calculateTotal();
  };

  const handleRemoveProduct = (tempId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== tempId));
    calculateTotal();
  };

  const handleUpdateQuantity = (tempId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setSelectedProducts(prev =>
      prev.map(p =>
        p.id === tempId
          ? { ...p, quantity: newQuantity, total: newQuantity * p.unit_cost }
          : p
      )
    );
    calculateTotal();
  };

  const handleUpdateUnitCost = (tempId: number, newUnitCost: number) => {
    if (newUnitCost < 0) return;
    
    setSelectedProducts(prev =>
      prev.map(p =>
        p.id === tempId
          ? { ...p, unit_cost: newUnitCost, total: p.quantity * newUnitCost }
          : p
      )
    );
    calculateTotal();
  };

  const calculateTotal = () => {
    const total = selectedProducts.reduce((sum, product) => sum + product.total, 0);
    setFormData(prev => ({ ...prev, total_command: total }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation basée sur les contraintes du sérialiseur
      if (!formData.supplier) {
        throw new Error('Veuillez sélectionner un fournisseur');
      }

      if (selectedProducts.length === 0) {
        throw new Error('Veuillez ajouter au moins un produit');
      }

      if (!formData.ref_supply.trim()) {
        throw new Error('La référence est obligatoire');
      }

      // Préparer les données selon le sérialiseur Supply
      const supplyData: CreateSupplyData = {
        ref_supply: formData.ref_supply,
        supplier: parseInt(formData.supplier),
        store: parseInt(formData.store),
        utilisateur: parseInt(formData.utilisateur),
        total_command: formData.total_command,
        date_supply: formData.date_supply,
        status: formData.status,
        notes: formData.notes,
        // Préparer les retail_items selon le sérialiseur RetailSupply
        retail_items: selectedProducts.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          // Les autres champs comme batch_number peuvent être optionnels
          batch_number: `BATCH-${formData.ref_supply}-${item.product}`
        }))
      };

      await onCreate(supplyData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.reference?.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Nouvel approvisionnement</h2>
            <p className="text-sm text-gray-600">Créez une nouvelle commande d'approvisionnement</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Informations générales - alignées avec le sérialiseur Supply */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence *
              </label>
              <input
                type="text"
                name="ref_supply"
                value={formData.ref_supply}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="SUP-YYYYMMDD-XXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fournisseur *
              </label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un fournisseur</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.contact_person && `- ${supplier.contact_person}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Magasin *
              </label>
              <select
                name="store"
                value={formData.store}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="1">Magasin Principal</option>
                <option value="2">Succursale Ouest</option>
                <option value="3">Succursale Nord</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de commande *
              </label>
              <input
                type="date"
                name="date_supply"
                value={formData.date_supply}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="pending">En attente</option>
                <option value="received">Reçu</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant total
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={formData.total_command}
                  readOnly
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Informations supplémentaires, instructions spéciales..."
            />
          </div>

          {/* Produits - aligné avec RetailSupply */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Produits commandés</h3>
            
            {/* Recherche de produit */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ajouter un produit
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rechercher par nom, SKU ou référence..."
                />
              </div>

              {/* Suggestions de produits */}
              {searchProduct && filteredProducts.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.sku && `SKU: ${product.sku} • `}
                            {product.reference && `Ref: ${product.reference} • `}
                            Stock: {product.current_stock || 0}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'XOF',
                            minimumFractionDigits: 0
                          }).format(product.cost_price || product.base_price || 0)}
                        </p>
                        <Plus className="w-4 h-4 text-green-500 ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Liste des produits sélectionnés */}
            {selectedProducts.length > 0 ? (
              <div className="space-y-3">
                {selectedProducts.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{product.product_name}</p>
                          <p className="text-sm text-gray-500">ID Produit: {product.product}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Quantité
                          </label>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(product.id, product.quantity - 1)}
                              className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => handleUpdateQuantity(product.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                              min="1"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(product.id, product.quantity + 1)}
                              className="p-1 rounded border border-gray-300 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Prix unitaire (FCFA)
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="number"
                              value={product.unit_cost}
                              onChange={(e) => handleUpdateUnitCost(product.id, parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Total ligne
                          </label>
                          <p className="font-medium text-gray-900 text-lg">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'XOF',
                              minimumFractionDigits: 0
                            }).format(product.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Aucun produit ajouté</p>
                <p className="text-xs text-gray-400">Utilisez la recherche ci-dessus pour ajouter des produits à la commande</p>
              </div>
            )}

            {/* Total général */}
            {selectedProducts.length > 0 && (
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div>
                  <span className="text-lg font-semibold text-gray-900">Total général</span>
                  <p className="text-sm text-gray-500">{selectedProducts.length} produit(s)</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    minimumFractionDigits: 0
                  }).format(formData.total_command)}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || selectedProducts.length === 0 || !formData.supplier}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer l'approvisionnement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant principal
const SupplyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'supplies' | 'suppliers' | 'products'>('supplies');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received' | 'cancelled'>('all');
  
  const filters = useMemo(() => {
    const baseFilters: any = {};
    
    if (searchTerm.trim()) {
      baseFilters.search = searchTerm.trim();
    }
    
    if (statusFilter !== 'all') {
      baseFilters.status = statusFilter;
    }
    
    return Object.keys(baseFilters).length > 0 ? baseFilters : undefined;
  }, [searchTerm, statusFilter]);
  
  const { 
    supplies, 
    loading: suppliesLoading, 
    error: suppliesError,
    refetch: refetchSupplies,
    createSupply,
    updateSupplyStatus,
    deleteSupply
  } = useSupplies(filters);
  
  const { 
    suppliers, 
    loading: suppliersLoading,
    error: suppliersError,
    refetch: refetchSuppliers
  } = useSuppliers(searchTerm);
  
  const { stats, loading: statsLoading } = useSupplyStats();

  const [showCreateSupply, setShowCreateSupply] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<SupplyType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSupplies(),
        refetchSuppliers()
      ]);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: SupplyType['status']) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: SupplyType['status']) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: SupplyType['status']) => {
    switch (status) {
      case 'received':
        return 'Reçu';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleCreateSupply = async () => {
    setShowCreateSupply(true);
  };

  const handleCreateSupplier = async () => {
    setShowCreateSupplier(true);
  };

  const handleDeleteSupply = async (supplyId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet approvisionnement ? Cette action est irréversible.')) {
      try {
        await deleteSupply(supplyId);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const handleUpdateStatus = async (supplyId: number, newStatus: 'received' | 'cancelled') => {
    try {
      await updateSupplyStatus(supplyId, newStatus);
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const handleCreateNewSupply = async (supplyData: CreateSupplyData) => {
    await createSupply(supplyData);
  };

  // Modal simplifié pour créer un fournisseur (à développer)
  const CreateSupplierModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Nouveau fournisseur</h3>
          <button onClick={() => setShowCreateSupplier(false)}>
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <p className="text-gray-600 mb-4">Fonctionnalité en cours de développement...</p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={() => setShowCreateSupplier(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
          >
            Annuler
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );

  // Modal de détails d'approvisionnement
  const SupplyDetailModal = () => {
    if (!selectedSupply) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedSupply.ref_supply}</h3>
                <p className="text-gray-600">Détails de l'approvisionnement</p>
              </div>
              <button 
                onClick={() => setSelectedSupply(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Référence</label>
                <p className="font-semibold text-gray-900">{selectedSupply.ref_supply}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Fournisseur</label>
                <p className="font-semibold text-gray-900">
                  {selectedSupply.supplier_name || selectedSupply.supplier?.name || 'Non spécifié'}
                </p>
                {selectedSupply.supplier?.contact_person && (
                  <p className="text-sm text-gray-500">{selectedSupply.supplier.contact_person}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Magasin</label>
                <p className="font-semibold text-gray-900">
                  {selectedSupply.store_name || selectedSupply.store?.name || 'Non spécifié'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Statut</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSupply.status)}`}>
                  {getStatusIcon(selectedSupply.status)}
                  <span className="ml-1">{getStatusText(selectedSupply.status)}</span>
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Montant total</label>
                <p className="font-semibold text-gray-900">{formatCurrency(selectedSupply.total_command || 0)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <p className="font-semibold text-gray-900">{formatDate(selectedSupply.date_supply)}</p>
              </div>
              {selectedSupply.utilisateur_name && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Créé par</label>
                  <p className="font-semibold text-gray-900">{selectedSupply.utilisateur_name}</p>
                </div>
              )}
            </div>

            {/* Produits */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">Produits commandés</h4>
              <div className="space-y-3">
                {selectedSupply.retail_items && selectedSupply.retail_items.length > 0 ? (
                  selectedSupply.retail_items.map((item: RetailSupply) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product_name || 'Produit non spécifié'}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                          <span>Quantité: {item.quantity}</span>
                          {item.unit_cost && <span>Prix unitaire: {formatCurrency(item.unit_cost)}</span>}
                          {item.batch_number && <span>Lot: {item.batch_number}</span>}
                          {item.supply_reference && <span>Réf: {item.supply_reference}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency((item.quantity || 0) * (item.unit_cost || 0))}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">Aucun détail de produit disponible</p>
                )}
              </div>
            </div>

            {/* Notes et informations supplémentaires */}
            {selectedSupply.notes && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{selectedSupply.notes}</p>
              </div>
            )}

            {/* Métadonnées d'audit */}
            {(selectedSupply.created_at || selectedSupply.updated_at) && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Métadonnées</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500">
                  {selectedSupply.created_at && (
                    <p>Créé le: {formatDate(selectedSupply.created_at)}</p>
                  )}
                  {selectedSupply.updated_at && (
                    <p>Modifié le: {formatDate(selectedSupply.updated_at)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button 
                onClick={() => setSelectedSupply(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
              >
                Fermer
              </button>
              {selectedSupply.status === 'pending' && (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleUpdateStatus(selectedSupply.id, 'received')}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Marquer comme reçu
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedSupply.id, 'cancelled')}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestion des Approvisionnements</h1>
              <p className="text-gray-600 mt-2">
                Gérez les commandes fournisseurs et le suivi des stocks
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
              </button>
              <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </button>
              {activeTab === 'supplies' && (
                <button 
                  onClick={handleCreateSupply}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel Approvisionnement
                </button>
              )}
              {activeTab === 'suppliers' && (
                <button 
                  onClick={handleCreateSupplier}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau Fournisseur
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'supplies' as const, name: 'Approvisionnements', count: supplies.length },
                { id: 'suppliers' as const, name: 'Fournisseurs', count: suppliers.length },
                { id: 'products' as const, name: 'Produits', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'supplies' 
                      ? "Rechercher une référence, fournisseur..." 
                      : activeTab === 'suppliers'
                      ? "Rechercher un fournisseur..."
                      : "Rechercher un produit..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              {activeTab === 'supplies' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="received">Reçu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              )}
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                <Filter className="w-4 h-4 mr-2" />
                Plus de filtres
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        {!statsLoading && stats && activeTab === 'supplies' && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total des commandes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_supplies || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">En attente</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending_supplies || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Reçues</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.received_supplies || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Montant total</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(stats.total_amount || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contenu des onglets */}
        {activeTab === 'supplies' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {suppliesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Chargement des approvisionnements...</span>
              </div>
            ) : suppliesError ? (
              <div className="text-center py-12 text-red-600">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p>Erreur lors du chargement: {suppliesError}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Référence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fournisseur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Magasin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {supplies.map((supply) => (
                      <tr key={supply.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {supply.ref_supply}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {supply.supplier_name || supply.supplier?.name || 'Non spécifié'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {supply.supplier?.contact_person || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {supply.store_name || supply.store?.name || 'Non spécifié'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {supply.total_items || supply.retail_items?.length || 0} produit(s)
                          </div>
                          <div className="text-sm text-gray-500">
                            {supply.retail_items ? 
                              supply.retail_items.slice(0, 2).map(item => 
                                item.product_name || 'Produit'
                              ).join(', ') + 
                              (supply.retail_items.length > 2 ? '...' : '')
                              : 'Aucun détail'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(supply.total_command || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(supply.status)}`}>
                            {getStatusIcon(supply.status)}
                            <span className="ml-1">{getStatusText(supply.status)}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(supply.date_supply)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => setSelectedSupply(supply)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {supply.status === 'pending' && (
                              <>
                                <button 
                                  className="text-gray-600 hover:text-gray-900 p-1"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteSupply(supply.id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {supplies.length === 0 && !suppliesLoading && (
                  <div className="text-center py-12">
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun approvisionnement trouvé</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || statusFilter !== 'all' 
                        ? "Aucun approvisionnement ne correspond à vos critères de recherche." 
                        : "Commencez par créer un nouvel approvisionnement."
                      }
                    </p>
                    <button 
                      onClick={handleCreateSupply}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvel Approvisionnement
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {suppliersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Chargement des fournisseurs...</span>
              </div>
            ) : suppliersError ? (
              <div className="text-center py-12 text-red-600">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p>Erreur lors du chargement: {suppliersError}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                        <div className="flex items-center">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {supplier.total_supplies || 0} commandes
                          </span>
                          <button className="text-gray-400 hover:text-gray-600 ml-2">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          <span>{supplier.contact_person || 'Non spécifié'}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2" />
                          <span>{supplier.phone || supplier.num_supplier || 'Non spécifié'}</span>
                        </div>
                        {supplier.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            <span className="truncate">{supplier.email}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{supplier.address || supplier.emplacement || 'Non spécifié'}</span>
                        </div>
                        {supplier.store_name && (
                          <div className="flex items-center">
                            <Store className="w-4 h-4 mr-2" />
                            <span>Magasin: {supplier.store_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <button className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
                          Contacter
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('supplies');
                            handleCreateSupply();
                          }}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded text-sm hover:bg-gray-200"
                        >
                          Commander
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {suppliers.length === 0 && !suppliersLoading && (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun fournisseur trouvé</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm 
                        ? "Aucun fournisseur ne correspond à votre recherche." 
                        : "Commencez par ajouter un nouveau fournisseur."
                      }
                    </p>
                    <button 
                      onClick={handleCreateSupplier}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau Fournisseur
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gestion des Produits</h3>
              <p className="text-gray-600 mb-4">
                Cette section vous permettra de gérer les produits et leurs relations avec les fournisseurs.
              </p>
              <p className="text-sm text-gray-500">
                Fonctionnalité en cours de développement...
              </p>
            </div>
          </div>
        )}

        {/* Modals */}
        {showCreateSupply && (
          <CreateSupplyModal
            isOpen={showCreateSupply}
            onClose={() => setShowCreateSupply(false)}
            onCreate={handleCreateNewSupply}
            suppliers={suppliers}
          />
        )}
        {showCreateSupplier && <CreateSupplierModal />}
        {selectedSupply && <SupplyDetailModal />}
      </div>
    </div>
  );
};

export default SupplyPage;