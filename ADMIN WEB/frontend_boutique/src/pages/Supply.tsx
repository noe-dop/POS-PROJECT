// src/pages/Supply.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, Search, Menu, X, AlertCircle, UserPlus, ChevronLeft, 
  ChevronRight, Eye, Trash2, Package, Clock, CheckCircle, 
  Truck, Box, Store as StoreIcon, Filter 
} from 'lucide-react';
import { 
  useSupplies, 
  useSuppliers, 
  useSupplyStats, 
  useStores 
} from '../hooks/useSupply';
import { useAuth } from '../hooks/useAuth';
import { 
  Supply as SupplyType, 
  Supplier, 
  Store, 
  CreateSupplyData, 
  CreateSupplierData 
} from '../services/supplyService';

// ============================================================================
// COMPOSANTS RÉUTILISABLES
// ============================================================================

const StatusBadge: React.FC<{ status: SupplyType['status'] }> = React.memo(({ status }) => {
  const getStatusConfig = useCallback(() => {
    switch (status) {
      case 'received':
        return { text: 'Livrée', className: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle };
      case 'pending':
        return { text: 'En attente', className: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock };
      case 'cancelled':
        return { text: 'Annulée', className: 'text-red-600 bg-red-50 border-red-200', icon: X };
      default:
        return { text: status, className: 'text-gray-600 bg-gray-50 border-gray-200', icon: Package };
    }
  }, [status]);

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`font-medium text-xs xs:text-sm ${config.className} flex items-center px-2 py-1 rounded-full border`}>
      <Icon className="w-3 h-3 xs:w-4 xs:h-4 mr-1 flex-shrink-0" />
      <span className="truncate">{config.text}</span>
    </span>
  );
});

const DeliveryStatusBadge: React.FC<{ supply: SupplyType }> = React.memo(({ supply }) => {
  const getDeliveryConfig = useCallback(() => {
    switch (supply.status) {
      case 'received':
        return { 
          text: 'Livré', 
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle 
        };
      case 'pending':
        const orderDate = new Date(supply.date_supply);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));
        
        if (daysDiff > 7) {
          return { 
            text: 'En retard', 
            className: 'bg-red-100 text-red-800 border-red-200',
            icon: AlertCircle 
          };
        } else if (daysDiff > 3) {
          return { 
            text: 'En transit', 
            className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            icon: Truck 
          };
        } else {
          return { 
            text: 'En préparation', 
            className: 'bg-blue-100 text-blue-800 border-blue-200',
            icon: Package 
          };
        }
      case 'cancelled':
        return { 
          text: 'Annulé', 
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: X 
        };
      default:
        return { 
          text: 'Inconnu', 
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: AlertCircle 
        };
    }
  }, [supply]);

  const config = getDeliveryConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 xs:px-3 xs:py-1 rounded-full text-xs font-medium border ${config.className} truncate`}>
      <Icon className="w-3 h-3 mr-1 flex-shrink-0" />
      <span className="truncate">{config.text}</span>
    </span>
  );
});

const StatCard: React.FC<{
  title: string;
  value: number;
  subtitle: string;
  color: 'green' | 'blue' | 'red';
  loading?: boolean;
}> = React.memo(({ title, value, subtitle, color, loading = false }) => {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600'
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 animate-pulse">
        <div className="h-3 xs:h-4 sm:h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-6 xs:h-8 sm:h-10 md:h-12 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 xs:p-4 sm:p-5 md:p-6 transition-all hover:shadow-sm h-full">
      <h3 className="text-xs xs:text-sm sm:text-base font-semibold text-gray-900 truncate mb-1">{title}</h3>
      <p className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 xs:mb-2">{value}</p>
      <p className={`text-xs xs:text-sm font-medium ${colorClasses[color]} truncate`}>
        {subtitle}
      </p>
    </div>
  );
});

// ============================================================================
// MODAL DE CRÉATION
// ============================================================================

interface CreateSupplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (supplyData: CreateSupplyData) => Promise<void>;
  onSupplierCreate: (supplierData: CreateSupplierData) => Promise<Supplier>;
  suppliers: Supplier[];
  stores: Store[];
  loading?: boolean;
}

const CreateSupplyModal: React.FC<CreateSupplyModalProps> = React.memo(({ 
  isOpen, 
  onClose, 
  onCreate, 
  onSupplierCreate,
  suppliers,
  stores,
  loading: externalLoading,
}) => {
  const [formData, setFormData] = useState({
    ref_supply: '',
    supplier: '',
    store: stores.length > 0 ? stores[0].id.toString() : '',
    total_command: '0',
    status: 'pending' as 'pending' | 'received' | 'cancelled',
  });

  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    num_supplier: '',
    email: '',
    emplacement: '',
    contact_person: '',
    payment_terms: '',
    store: stores.length > 0 ? stores[0].id : 1,
    address: '',
    phone: ''
  });

  const loading = externalLoading || internalLoading;

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timestamp = now.getTime();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      
      setFormData({
        ref_supply: `SUP-${dateStr}-${timestamp.toString().slice(-6)}`,
        supplier: '',
        store: stores.length > 0 ? stores[0].id.toString() : '',
        total_command: '0',
        status: 'pending',
      });
      setError('');
      setShowNewSupplierForm(false);
      setNewSupplierData({
        name: '',
        num_supplier: '',
        email: '',
        emplacement: '',
        contact_person: '',
        payment_terms: '',
        store: stores.length > 0 ? stores[0].id : 1,
        address: '',
        phone: ''
      });
    }
  }, [isOpen, stores]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'total_command') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleNewSupplierInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewSupplierData(prev => ({ 
      ...prev, 
      [name]: name === 'store' ? parseInt(value) : value 
    }));
  }, []);

  const handleAddNewSupplier = useCallback(async () => {
    if (!newSupplierData.name.trim()) {
      setError('Veuillez saisir le nom du fournisseur');
      return;
    }

    setInternalLoading(true);
    setError('');

    try {
      const newSupplier = await onSupplierCreate(newSupplierData);
      
      setFormData(prev => ({
        ...prev,
        supplier: newSupplier.id.toString()
      }));
      
      setError(`Fournisseur "${newSupplier.name}" ajouté avec succès`);
      setShowNewSupplierForm(false);
      
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du fournisseur';
      setError(errorMessage);
      console.error('Erreur création fournisseur:', err);
    } finally {
      setInternalLoading(false);
    }
  }, [newSupplierData, onSupplierCreate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setInternalLoading(true);
    setError('');

    try {
      if (!formData.store) {
        throw new Error('Veuillez sélectionner un magasin');
      }

      // Convertir les valeurs - NE PAS inclure utilisateur
      const supplyData: CreateSupplyData = {
        ref_supply: formData.ref_supply,
        supplier: formData.supplier ? parseInt(formData.supplier) : null,
        store: parseInt(formData.store),
        total_command: parseFloat(formData.total_command) || 0,
        status: formData.status,
      };

      console.log('📤 Données envoyées (sans utilisateur):', supplyData);
      await onCreate(supplyData);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création';
      setError(errorMessage);
      console.error('Erreur création approvisionnement:', err);
    } finally {
      setInternalLoading(false);
    }
  }, [formData, onCreate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 xs:p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-md mx-2 xs:mx-3 my-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-3 xs:p-4 sm:p-5">
            <div className="min-w-0">
              <h2 className="text-base xs:text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {showNewSupplierForm ? 'Nouveau Fournisseur' : 'Nouvel approvisionnement'}
              </h2>
              <p className="text-xs text-gray-600 mt-1 truncate">
                {showNewSupplierForm ? 'Ajoutez un nouveau fournisseur' : 'Créez une nouvelle commande'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 ml-2 flex-shrink-0"
              aria-label="Fermer"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 xs:p-4 sm:p-5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className={`mb-3 xs:mb-4 p-2 xs:p-3 rounded-lg ${error.includes('ajouté') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start">
                <AlertCircle className={`w-4 h-4 xs:w-5 xs:h-5 ${error.includes('ajouté') ? 'text-green-400' : 'text-red-400'} mt-0.5 mr-2 flex-shrink-0`} />
                <p className={`text-xs xs:text-sm ${error.includes('ajouté') ? 'text-green-700' : 'text-red-700'} break-words`}>{error}</p>
              </div>
            </div>
          )}

          {showNewSupplierForm ? (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                  Nom du fournisseur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={newSupplierData.name}
                  onChange={handleNewSupplierInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  required
                  placeholder="Ex: Tech Solutions"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                    Personne de contact
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    value={newSupplierData.contact_person}
                    onChange={handleNewSupplierInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="Ex: Jean Dupont"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                    Magasin
                  </label>
                  <select
                    name="store"
                    value={newSupplierData.store}
                    onChange={handleNewSupplierInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    disabled={loading || stores.length === 0}
                  >
                    <option value="">Sélectionner un magasin</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newSupplierData.email}
                    onChange={handleNewSupplierInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="contact@exemple.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={newSupplierData.phone}
                    onChange={handleNewSupplierInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="+33 1 23 45 67 89"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <textarea
                  name="address"
                  value={newSupplierData.address}
                  onChange={handleNewSupplierInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm resize-none"
                  placeholder="Adresse complète"
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                  Référence
                </label>
                <input
                  type="text"
                  name="ref_supply"
                  value={formData.ref_supply}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs xs:text-sm font-medium text-gray-700">
                    Fournisseur (optionnel)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplierForm(true)}
                    className="flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    disabled={loading}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    <span className="hidden xs:inline">Nouveau</span>
                    <span className="xs:hidden">+</span>
                  </button>
                </div>
                <select
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  disabled={loading}
                >
                  <option value="">Aucun fournisseur (optionnel)</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} {supplier.num_supplier && `(${supplier.num_supplier})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                    Magasin <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="store"
                    value={formData.store}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    required
                    disabled={loading || stores.length === 0}
                  >
                    <option value="">Sélectionner un magasin</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                    Total commande (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="total_command"
                    value={formData.total_command}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    placeholder="0.00"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs xs:text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  required
                  disabled={loading}
                >
                  <option value="pending">En attente</option>
                  <option value="received">Reçu</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-col xs:flex-row justify-end space-y-2 xs:space-y-0 xs:space-x-2 pt-4 border-t border-gray-200">
            {showNewSupplierForm ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowNewSupplierForm(false)}
                  className="w-full xs:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleAddNewSupplier}
                  disabled={loading || !newSupplierData.name.trim()}
                  className="w-full xs:w-auto px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full xs:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full xs:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création...
                    </>
                  ) : (
                    'Créer'
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
});

// ============================================================================
// MODAL DE DÉTAILS
// ============================================================================

interface SupplyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supply: SupplyType | null;
  stores: Store[];
  onUpdateStatus: (id: number, status: SupplyType['status']) => Promise<void>;
  updatingStatus: number | null;
}

const SupplyDetailsModal: React.FC<SupplyDetailsModalProps> = React.memo(({ 
  isOpen, 
  onClose, 
  supply,
  stores,
  onUpdateStatus,
  updatingStatus
}) => {
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  const handleStatusUpdate = useCallback(async (status: SupplyType['status']) => {
    if (!supply) return;
    await onUpdateStatus(supply.id, status);
  }, [supply, onUpdateStatus]);

  if (!isOpen || !supply) return null;

  const getDeliveryStatus = () => {
    if (supply.status === 'received') {
      return { text: 'Livré', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (supply.status === 'cancelled') {
      return { text: 'Annulé', icon: X, color: 'text-red-600', bgColor: 'bg-red-100' };
    } else {
      return { text: 'En transit', icon: Truck, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
  };

  const deliveryStatus = getDeliveryStatus();
  const Icon = deliveryStatus.icon;
  const store = stores.find(s => s.id === supply.store) || 
                supply.store_object || 
                { id: supply.store, name: supply.store_name || `Magasin ${supply.store}` };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 xs:p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-2 xs:mx-3 my-auto max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-3 xs:p-4 sm:p-5">
            <div className="min-w-0">
              <h2 className="text-base xs:text-lg sm:text-xl font-semibold text-gray-900 truncate">
                Détails de la commande
              </h2>
              <p className="text-xs text-gray-600 mt-1 truncate">
                {supply.ref_supply}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 ml-2 flex-shrink-0"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 xs:p-4 sm:p-5">
          <div className={`mb-4 p-3 xs:p-4 rounded-lg ${deliveryStatus.bgColor}`}>
            <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-0">
              <div className="flex items-center">
                <Icon className={`w-4 h-4 xs:w-5 xs:h-5 ${deliveryStatus.color} mr-2 flex-shrink-0`} />
                <div className="min-w-0">
                  <h3 className={`font-medium ${deliveryStatus.color} text-sm xs:text-base truncate`}>
                    Statut: {deliveryStatus.text}
                  </h3>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs xs:text-sm text-gray-600">
                <Clock className="w-3 h-3 xs:w-4 xs:h-4 text-gray-400 flex-shrink-0" />
                <span>Commandé le {formatDate(supply.date_supply)}</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {supply.status === 'pending' && (
                <button
                  onClick={() => handleStatusUpdate('received')}
                  disabled={updatingStatus === supply.id}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs xs:text-sm flex items-center justify-center"
                >
                  {updatingStatus === supply.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 xs:h-4 xs:w-4 border-b-2 border-white mr-2"></div>
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 xs:w-4 xs:h-4 mr-1 xs:mr-2" />
                      Marquer reçu
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={updatingStatus === supply.id || supply.status === 'cancelled'}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs xs:text-sm flex items-center justify-center"
              >
                {updatingStatus === supply.id ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 xs:h-4 xs:w-4 border-b-2 border-white mr-2"></div>
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 xs:w-4 xs:h-4 mr-1 xs:mr-2" />
                    Annuler commande
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-6 mb-4 xs:mb-6">
            <div>
              <h3 className="text-xs xs:text-sm font-medium text-gray-500 mb-2">Informations générales</h3>
              <div className="space-y-2 xs:space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Référence</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{supply.ref_supply}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <StatusBadge status={supply.status} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date de commande</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(supply.date_supply)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total commande</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(supply.total_command)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Magasin</p>
                  <div className="flex items-center">
                    <StoreIcon className="w-3 h-3 xs:w-4 xs:h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">{store.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs xs:text-sm font-medium text-gray-500 mb-2">Fournisseur</h3>
              <div className="space-y-2 xs:space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Nom</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {supply.supplier?.name || supply.supplier_name || 'Non spécifié'}
                  </p>
                </div>
                {supply.supplier?.email && (
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{supply.supplier.email}</p>
                  </div>
                )}
                {supply.supplier?.phone && (
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{supply.supplier.phone}</p>
                  </div>
                )}
                {supply.supplier?.address && (
                  <div>
                    <p className="text-xs text-gray-500">Adresse</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{supply.supplier.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Retirer la section notes car pas dans le modèle */}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200">
          <div className="px-3 xs:px-4 sm:px-6 py-3 xs:py-4">
            <div className="flex flex-col xs:flex-row justify-end space-y-2 xs:space-y-0 xs:space-x-2">
              <button
                onClick={() => handleStatusUpdate('received')}
                disabled={updatingStatus === supply.id || supply.status === 'received'}
                className="w-full xs:w-auto px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-xs xs:text-sm"
              >
                Marquer reçu
              </button>
              <button
                onClick={onClose}
                className="w-full xs:w-auto px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium text-xs xs:text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

const SupplyPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received' | 'cancelled'>('all');
  const [storeFilter, setStoreFilter] = useState<number | 'all'>('all');
  const [showCreateSupply, setShowCreateSupply] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<SupplyType | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Détection responsive simple
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 640);
      setIsTablet(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  useEffect(() => {
    setItemsPerPage(isMobile ? 5 : isTablet ? 8 : 10);
  }, [isMobile, isTablet]);
  
  const filters = useMemo(() => {
    const baseFilters: any = {};
    if (searchTerm.trim()) baseFilters.search = searchTerm.trim();
    if (statusFilter !== 'all') baseFilters.status = statusFilter;
    if (storeFilter !== 'all') baseFilters.store = storeFilter;
    return Object.keys(baseFilters).length > 0 ? baseFilters : undefined;
  }, [searchTerm, statusFilter, storeFilter]);
  
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
    createSupplier,
    refetch: refetchSuppliers 
  } = useSuppliers('');
  
  const { 
    stats, 
    loading: statsLoading,
    refetch: refetchStats
  } = useSupplyStats();

  const { 
    stores, 
    loading: storesLoading,
    refetch: refetchStores 
  } = useStores();

  const [creatingSupply, setCreatingSupply] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [deletingSupply, setDeletingSupply] = useState<number | null>(null);

  const totalPages = Math.ceil(supplies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSupplies = supplies.slice(startIndex, endIndex);

  const pendingSupplies = useMemo(() => 
    supplies.filter(s => s.status === 'pending'), 
    [supplies]
  );

  const overdueSupplies = useMemo(() => 
    pendingSupplies.filter(supply => {
      const orderDate = new Date(supply.date_supply);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 3600 * 24));
      return daysDiff > 7;
    }), 
    [pendingSupplies]
  );

  const handleCreateSupply = useCallback(async (supplyData: CreateSupplyData) => {
    setCreatingSupply(true);
    try {
      // Vérifier l'authentification
      if (!isAuthenticated) {
        throw new Error('Vous devez être connecté pour créer une commande. Veuillez vous reconnecter.');
      }
      
      console.log('🟡 Création en cours...');
      await createSupply(supplyData);
      await refetchSupplies();
      await refetchStats();
      setShowCreateSupply(false);
    } catch (error) {
      console.error('❌ Erreur création:', error);
      
      // Gérer les erreurs d'authentification
      if (error instanceof Error && (
        error.message.includes('authentification') || 
        error.message.includes('401') ||
        error.message.includes('non autorisé')
      )) {
        // Rediriger vers la page de connexion
        window.location.href = '/login';
        return;
      }
      
      throw error;
    } finally {
      setCreatingSupply(false);
    }
  }, [isAuthenticated, createSupply, refetchSupplies, refetchStats]);

  const handleCreateSupplier = useCallback(async (supplierData: CreateSupplierData) => {
    setCreatingSupplier(true);
    try {
      const newSupplier = await createSupplier(supplierData);
      await refetchSuppliers();
      return newSupplier;
    } catch (error) {
      console.error('Erreur création fournisseur:', error);
      throw error;
    } finally {
      setCreatingSupplier(false);
    }
  }, [createSupplier, refetchSuppliers]);

  const handleViewDetails = useCallback((supply: SupplyType) => {
    setSelectedSupply(supply);
    setShowDetailsModal(true);
  }, []);

  const handleUpdateStatus = useCallback(async (id: number, status: SupplyType['status']) => {
    setUpdatingStatus(id);
    try {
      await updateSupplyStatus(id, status);
      await refetchSupplies();
      await refetchStats();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    } finally {
      setUpdatingStatus(null);
    }
  }, [updateSupplyStatus, refetchSupplies, refetchStats]);

  const handleDeleteSupply = useCallback(async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      return;
    }

    setDeletingSupply(id);
    try {
      await deleteSupply(id);
      await refetchSupplies();
      await refetchStats();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression de la commande');
    } finally {
      setDeletingSupply(null);
    }
  }, [deleteSupply, refetchSupplies, refetchStats]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [totalPages, isMobile]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((filter: 'all' | 'pending' | 'received' | 'cancelled') => {
    setStatusFilter(filter);
    setCurrentPage(1);
    if (isMobile) {
      setShowFiltersDrawer(false);
    }
  }, [isMobile]);

  const handleStoreFilterChange = useCallback((filter: number | 'all') => {
    setStoreFilter(filter);
    setCurrentPage(1);
    if (isMobile) {
      setShowFiltersDrawer(false);
    }
  }, [isMobile]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setStoreFilter('all');
    setCurrentPage(1);
    if (isMobile) {
      setShowFiltersDrawer(false);
    }
  }, [isMobile]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }, []);

  const TableRow = useCallback(({ supply }: { supply: SupplyType }) => {
    const store = stores.find(s => s.id === supply.store) || 
                  supply.store_object || 
                  { id: supply.store, name: supply.store_name || `Magasin ${supply.store}` };

    return (
      <tr key={supply.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <span className="font-medium text-xs xs:text-sm block truncate max-w-[70px] xs:max-w-none">
            {isMobile && supply.ref_supply.length > 8 
              ? `${supply.ref_supply.substring(0, 6)}...` 
              : supply.ref_supply}
          </span>
        </td>
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <div className="max-w-[80px] xs:max-w-none">
            <span className="text-xs xs:text-sm block truncate">
              {isMobile && supply.supplier_name && supply.supplier_name.length > 12
                ? `${supply.supplier_name.substring(0, 10)}...`
                : supply.supplier_name || supply.supplier?.name || 'Non spécifié'}
            </span>
          </div>
        </td>
        {!isMobile && (
          <td className="px-2 xs:px-3 sm:px-4 py-3">
            <div className="flex items-center max-w-[80px] xs:max-w-none">
              <StoreIcon className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
              <span className="text-xs xs:text-sm truncate">{store.name}</span>
            </div>
          </td>
        )}
        {!isMobile && (
          <td className="px-2 xs:px-3 sm:px-4 py-3 text-xs xs:text-sm">
            {formatDate(supply.date_supply)}
          </td>
        )}
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <StatusBadge status={supply.status} />
        </td>
        {!isTablet && (
          <td className="px-2 xs:px-3 sm:px-4 py-3 text-xs xs:text-sm">
            <span className="font-medium">{formatCurrency(supply.total_command || 0)}</span>
          </td>
        )}
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleViewDetails(supply)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1"
              aria-label="Voir détails"
              title="Voir détails"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteSupply(supply.id)}
              disabled={deletingSupply === supply.id}
              className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1"
              aria-label="Supprimer"
              title="Supprimer"
            >
              {deletingSupply === supply.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </td>
      </tr>
    );
  }, [stores, formatDate, formatCurrency, handleViewDetails, handleDeleteSupply, isMobile, isTablet]);

  const TrackingTableRow = useCallback(({ supply }: { supply: SupplyType }) => {
    const store = stores.find(s => s.id === supply.store) || 
                  supply.store_object || 
                  { id: supply.store, name: supply.store_name || `Magasin ${supply.store}` };

    return (
      <tr key={supply.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <div className="flex items-center">
            <Package className="w-3 h-3 xs:w-4 xs:h-4 text-gray-400 mr-1 xs:mr-2 flex-shrink-0" />
            <span className="font-medium text-xs xs:text-sm block truncate max-w-[60px] xs:max-w-none">
              {isMobile && supply.ref_supply.length > 8 
                ? `${supply.ref_supply.substring(0, 6)}...` 
                : supply.ref_supply}
            </span>
          </div>
        </td>
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <span className="text-xs xs:text-sm block truncate max-w-[70px] xs:max-w-none">
            {isMobile && supply.supplier_name && supply.supplier_name.length > 12
              ? `${supply.supplier_name.substring(0, 10)}...`
              : supply.supplier_name || supply.supplier?.name || 'Non spécifié'}
          </span>
        </td>
        {!isMobile && (
          <td className="px-2 xs:px-3 sm:px-4 py-3">
            <div className="flex items-center max-w-[60px] xs:max-w-none">
              <StoreIcon className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
              <span className="text-xs xs:text-sm truncate">{store.name}</span>
            </div>
          </td>
        )}
        {!isMobile && (
          <td className="px-2 xs:px-3 sm:px-4 py-3 text-xs xs:text-sm">
            {formatDate(supply.date_supply)}
          </td>
        )}
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <DeliveryStatusBadge supply={supply} />
        </td>
        <td className="px-2 xs:px-3 sm:px-4 py-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleViewDetails(supply)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1"
              aria-label="Voir détails"
              title="Voir détails"
            >
              <Eye className="w-4 h-4" />
            </button>
            {supply.status === 'pending' && (
              <button
                onClick={() => handleUpdateStatus(supply.id, 'received')}
                disabled={updatingStatus === supply.id}
                className="text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1"
                aria-label="Marquer comme reçu"
                title="Marquer comme reçu"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }, [stores, formatDate, handleViewDetails, handleUpdateStatus, updatingStatus, isMobile]);

  const LoadingRow = useCallback(({ colSpan }: { colSpan: number }) => (
    <tr>
      <td colSpan={colSpan} className="px-3 xs:px-4 py-6 xs:py-8 text-center">
        <div className="flex flex-col xs:flex-row justify-center items-center space-y-2 xs:space-y-0 xs:space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 xs:h-6 xs:w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 text-sm xs:text-base">Chargement des commandes...</span>
        </div>
      </td>
    </tr>
  ), []);

  const ErrorRow = useCallback(({ colSpan, message }: { colSpan: number; message: string }) => (
    <tr>
      <td colSpan={colSpan} className="px-3 xs:px-4 py-6 xs:py-8 text-center">
        <div className="text-red-600">
          <div className="flex flex-col items-center">
            <AlertCircle className="w-8 h-8 xs:w-10 xs:h-10 mb-2 xs:mb-3 text-red-400" />
            <p className="font-medium text-sm xs:text-base">Erreur de chargement</p>
            <p className="text-xs xs:text-sm mt-1 max-w-md text-center px-4">{message}</p>
          </div>
        </div>
      </td>
    </tr>
  ), []);

  const EmptyRow = useCallback(({ colSpan, message = 'Aucune commande trouvée' }: { colSpan: number; message?: string }) => (
    <tr>
      <td colSpan={colSpan} className="px-3 xs:px-4 py-6 xs:py-8 text-center">
        <div className="text-gray-500">
          <p className="font-medium text-sm xs:text-base">{message}</p>
          <p className="text-xs xs:text-sm mt-1">Commencez par créer une nouvelle commande</p>
        </div>
      </td>
    </tr>
  ), []);

  const renderTableHeaders = useCallback(() => (
    <>
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        RÉFÉRENCE
      </th>
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        FOURNISSEUR
      </th>
      {!isMobile && (
        <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
          MAGASIN
        </th>
      )}
      {!isMobile && (
        <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
          DATE
        </th>
      )}
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        STATUT
      </th>
      {!isTablet && (
        <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
          TOTAL
        </th>
      )}
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        ACTIONS
      </th>
    </>
  ), [isMobile, isTablet]);

  const renderTrackingTableHeaders = useCallback(() => (
    <>
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        RÉFÉRENCE
      </th>
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        FOURNISSEUR
      </th>
      {!isMobile && (
        <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
          MAGASIN
        </th>
      )}
      {!isMobile && (
        <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
          DATE
        </th>
      )}
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        STATUT
      </th>
      <th className="px-2 xs:px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 text-xs xs:text-sm whitespace-nowrap">
        ACTIONS
      </th>
    </>
  ), [isMobile]);

  return (
    <div className="min-h-screen bg-gray-50 p-2 xs:p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header de la page */}
        <header className="mb-3 xs:mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 xs:gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="min-w-0">
                <h1 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  Gestion des Approvisionnements
                </h1>
                <p className="text-gray-600 mt-1 text-xs xs:text-sm hidden sm:block">
                  Suivez et gérez vos commandes fournisseurs
                </p>
              </div>
              
              <button
                onClick={toggleMobileMenu}
                className="sm:hidden text-gray-600 hover:text-gray-900 ml-2"
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
                className="w-full sm:w-auto flex items-center justify-center px-3 xs:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm xs:text-base shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={suppliersLoading || storesLoading || creatingSupply || creatingSupplier}
              >
                <Plus className="w-4 h-4 xs:w-5 xs:h-5 mr-1 xs:mr-2" />
                <span className="hidden xs:inline">
                  {suppliersLoading || storesLoading ? 'Chargement...' : 'Nouvelle Commande'}
                </span>
                <span className="xs:hidden">Nouveau</span>
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mt-1 text-xs xs:text-sm sm:hidden">
            Suivez et gérez vos commandes fournisseurs
          </p>
        </header>

        {/* Cartes de statistiques */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4 mb-3 xs:mb-4 sm:mb-6">
          <StatCard
            title="Commandes en cours"
            value={stats?.total_pending || 0}
            subtitle="En attente de livraison"
            color="blue"
            loading={statsLoading}
          />
          <StatCard
            title="Commandes livrées"
            value={stats?.total_received || 0}
            subtitle="Total"
            color="green"
            loading={statsLoading}
          />
          <StatCard
            title="Commandes annulées"
            value={stats?.total_cancelled || 0}
            subtitle="Total"
            color="red"
            loading={statsLoading}
          />
        </section>

        {/* Barre de recherche et filtres */}
        <section className="bg-white border border-gray-200 rounded-xl p-2 xs:p-3 sm:p-4 mb-3 xs:mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row gap-2 xs:gap-3 md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 xs:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 xs:w-5 xs:h-5" />
                <input
                  type="text"
                  placeholder="Rechercher une commande..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-8 xs:pl-10 pr-2 xs:pr-3 py-2 xs:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm xs:text-base"
                />
              </div>
            </div>
            
            <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
              <div className="flex flex-wrap gap-1 xs:gap-2">
                <button
                  onClick={() => handleStatusFilterChange('all')}
                  className={`px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg text-xs xs:text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Tous
                </button>
                <button
                  onClick={() => handleStatusFilterChange('pending')}
                  className={`px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg text-xs xs:text-sm font-medium transition-colors ${statusFilter === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  En attente
                </button>
                <button
                  onClick={() => handleStatusFilterChange('received')}
                  className={`px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg text-xs xs:text-sm font-medium transition-colors ${statusFilter === 'received' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Reçues
                </button>
                {isMobile && (
                  <button
                    onClick={() => setShowFiltersDrawer(true)}
                    className="px-2 xs:px-3 py-1.5 xs:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs xs:text-sm font-medium flex items-center"
                  >
                    <Filter className="w-3 h-3 mr-1" />
                    Filtres
                  </button>
                )}
              </div>
              
              {!isMobile && (
                <>
                  <div className="flex flex-wrap gap-1 xs:gap-2">
                    <button
                      onClick={() => handleStoreFilterChange('all')}
                      className={`px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg text-xs xs:text-sm font-medium transition-colors ${storeFilter === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Tous les magasins
                    </button>
                  </div>
                  
                  <button
                    onClick={handleResetFilters}
                    className="px-2 xs:px-3 py-1.5 xs:py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs xs:text-sm font-medium"
                  >
                    Réinitialiser
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Section Suivi des livraisons */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3 xs:mb-4 sm:mb-6">
          <div className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 border-b border-gray-200">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 xs:gap-0">
              <div className="min-w-0">
                <div className="flex items-center">
                  <Truck className="w-4 h-4 xs:w-5 xs:h-5 text-blue-600 mr-1 xs:mr-2 flex-shrink-0" />
                  <h2 className="text-sm xs:text-base font-semibold text-gray-900 truncate">
                    Suivi des livraisons
                  </h2>
                </div>
                <p className="text-gray-600 text-xs xs:text-sm mt-1 truncate">
                  Commandes en cours de livraison
                </p>
              </div>
              <div className="flex items-center space-x-1 xs:space-x-2 mt-2 xs:mt-0">
                {overdueSupplies.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {overdueSupplies.length}
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                  <Package className="w-3 h-3 mr-1" />
                  {pendingSupplies.length}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 xs:-mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {renderTrackingTableHeaders()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suppliesLoading || storesLoading ? (
                    <LoadingRow colSpan={isMobile ? 4 : 6} />
                  ) : suppliesError ? (
                    <ErrorRow colSpan={isMobile ? 4 : 6} message={suppliesError} />
                  ) : pendingSupplies.length === 0 ? (
                    <EmptyRow colSpan={isMobile ? 4 : 6} message="Aucune commande en cours de livraison" />
                  ) : (
                    pendingSupplies
                      .sort((a, b) => new Date(a.date_supply).getTime() - new Date(b.date_supply).getTime())
                      .slice(0, isMobile ? 3 : 5)
                      .map(supply => <TrackingTableRow key={supply.id} supply={supply} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {pendingSupplies.length > (isMobile ? 3 : 5) && (
            <div className="px-2 xs:px-3 py-2 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-center">
                <button
                  onClick={() => handleStatusFilterChange('pending')}
                  className="text-blue-600 hover:text-blue-700 text-xs xs:text-sm font-medium flex items-center"
                >
                  Voir toutes ({pendingSupplies.length})
                  <ChevronRight className="w-3 h-3 xs:w-4 xs:h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Tableau principal des commandes */}
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3 xs:mb-4 sm:mb-6">
          <div className="px-2 xs:px-3 sm:px-4 py-2 xs:py-3 border-b border-gray-200">
            <h2 className="text-sm xs:text-base font-semibold text-gray-900">
              Toutes les commandes ({supplies.length})
            </h2>
            <p className="text-gray-600 text-xs xs:text-sm mt-1">
              Liste complète des commandes
            </p>
          </div>

          <div className="overflow-x-auto -mx-2 xs:-mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {renderTableHeaders()}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suppliesLoading || storesLoading ? (
                    <LoadingRow colSpan={isMobile ? 4 : (isTablet ? 5 : 7)} />
                  ) : suppliesError ? (
                    <ErrorRow colSpan={isMobile ? 4 : (isTablet ? 5 : 7)} message={suppliesError} />
                  ) : currentSupplies.length === 0 ? (
                    <EmptyRow colSpan={isMobile ? 4 : (isTablet ? 5 : 7)} />
                  ) : (
                    currentSupplies.map(supply => <TableRow key={supply.id} supply={supply} />)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && !suppliesLoading && !suppliesError && !storesLoading && (
            <div className="px-2 xs:px-3 py-2 xs:py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col xs:flex-row items-center justify-between gap-2 xs:gap-0">
                <div className="text-xs xs:text-sm text-gray-600">
                  {startIndex + 1}-{Math.min(endIndex, supplies.length)} sur {supplies.length}
                </div>
                
                <div className="flex items-center space-x-1 xs:space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 xs:p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="w-3 h-3 xs:w-4 xs:h-4" />
                  </button>
                  
                  {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
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
                        className={`w-6 h-6 xs:w-8 xs:h-8 rounded-lg text-xs xs:text-sm font-medium transition-colors ${
                          currentPage === pageNum 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 xs:p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="w-3 h-3 xs:w-4 xs:h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <CreateSupplyModal
        isOpen={showCreateSupply}
        onClose={() => setShowCreateSupply(false)}
        onCreate={handleCreateSupply}
        onSupplierCreate={handleCreateSupplier}
        suppliers={suppliers}
        stores={stores}
        loading={suppliersLoading || storesLoading || creatingSupply || creatingSupplier}
      />

      <SupplyDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedSupply(null);
        }}
        supply={selectedSupply}
        stores={stores}
        onUpdateStatus={handleUpdateStatus}
        updatingStatus={updatingStatus}
      />

      {/* Drawer de filtres mobile */}
      {isMobile && showFiltersDrawer && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowFiltersDrawer(false)} />
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
                <button
                  onClick={() => setShowFiltersDrawer(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Statut</h4>
                <div className="space-y-2">
                  {(['all', 'pending', 'received', 'cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilterChange(status)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${statusFilter === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {status === 'all' && 'Tous les statuts'}
                      {status === 'pending' && 'En attente'}
                      {status === 'received' && 'Reçues'}
                      {status === 'cancelled' && 'Annulées'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Magasin</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => handleStoreFilterChange('all')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${storeFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Tous les magasins
                  </button>
                  {stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => handleStoreFilterChange(store.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${storeFilter === store.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {store.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleResetFilters}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyPage;