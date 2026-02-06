// src/pages/Stock.tsx
// PAGE DE GESTION DES STOCKS - VERSION COMPLÈTE ET CORRIGÉE
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, Plus, AlertTriangle, Package, 
  TrendingUp, Bell, Download, X, Save, Edit, Trash2,
  DollarSign, Percent, Package2, MapPin, Tag, Hash, 
  Type, AlignLeft, Box, ChevronDown, Database, Layers,
  Store as StoreIcon, Warehouse as WarehouseIcon, RefreshCw, BarChart, Activity,
  Loader2, AlertCircle, BarChart3, Calendar,
  Eye, MoreVertical, CheckCircle, XCircle, Building2, ShoppingBag,
  ArrowUpDown, Info, Upload, FileText, Printer, Copy, Share2
} from 'lucide-react';
import { toast } from 'react-toastify';
import stockService from '@/services/StockService';
import productService from '@/services/productService';
import { Stock, StockStats, StockFilters } from '@/types/stock.types.ts';
import { Product } from '@/types/product';

// =============================================================================
// TYPES LOCAUX
// =============================================================================

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'over_stock';

interface SimpleStore {
  id: number;
  name: string;
}

interface SimpleWarehouse {
  id: number;
  name: string;
}

interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeAllFields: boolean;
  selectedFields: string[];
}

// =============================================================================
// HOOK PERSONNALISÉ POUR LES STOCKS (AMÉLIORÉ)
// =============================================================================

const useStock = (options: { autoRefresh?: boolean; refreshInterval?: number; initialLoad?: boolean } = {}) => {
  const { autoRefresh = false, refreshInterval = 60000, initialLoad = true } = options;
  
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockStats, setStockStats] = useState<StockStats | null>(null);
  const [loading, setLoading] = useState({
    stocks: false,
    stats: false,
    all: false,
    products: false
  });
  const [error, setError] = useState<{ message: string; details?: any } | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('Connexion en cours...');
  const [totalCount, setTotalCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<SimpleStore[]>([]);
  const [warehouses, setWarehouses] = useState<SimpleWarehouse[]>([]);

  // Charger les données complémentaires
  const loadAdditionalData = useCallback(async () => {
    try {
      // Charger les produits
      setLoading(prev => ({ ...prev, products: true }));
      const productsData = await productService.getAllProducts({ 
        page_size: 1000,
        ordering: 'name'
      });
      
      if (Array.isArray(productsData)) {
        setProducts(productsData);
        console.log(`✅ ${productsData.length} produits chargés`);
      }
      
      // Simuler les magasins et entrepôts
      const mockStores: SimpleStore[] = [
        { id: 1, name: 'Magasin Principal - Paris' },
        { id: 2, name: 'Boutique Centre-Ville - Lyon' },
        { id: 3, name: 'Supermarché Électronique - Marseille' },
        { id: 4, name: 'Boutique Premium - Lille' },
        { id: 5, name: 'Dépôt Vente - Bordeaux' },
      ];
      setStores(mockStores);
      
      const mockWarehouses: SimpleWarehouse[] = [
        { id: 1, name: 'Entrepôt Principal - IDF' },
        { id: 3, name: 'Dépôt Logistique - Est' },
        { id: 4, name: 'Centre de Distribution - Ouest' },
        { id: 5, name: 'Stock Froid - Nord' },
      ];
      setWarehouses(mockWarehouses);
      
    } catch (error) {
      console.error('Erreur chargement données complémentaires:', error);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  }, []);

  const fetchStocks = useCallback(async (filters?: StockFilters) => {
    setLoading(prev => ({ ...prev, stocks: true }));
    setError(null);
    
    try {
      const result = await stockService.getStocks(filters);
      setStocks(result.data);
      setTotalCount(result.total);
      console.log('📊 Stocks chargés:', result.data.length, 'sur', result.total);
      
      // Debug: vérifier les données reçues
      if (result.data.length > 0) {
        const sample = result.data[0];
        console.log('🔍 Exemple de données reçues:', {
          productId: sample.product,
          productName: sample.product_details?.name || 'NON DISPONIBLE',
          storeName: sample.store_details?.name || 'NON DISPONIBLE',
          warehouseName: sample.warehouse_details?.name || 'NON DISPONIBLE',
          hasProductDetails: !!sample.product_details,
          hasStoreDetails: !!sample.store_details,
          hasWarehouseDetails: !!sample.warehouse_details
        });
      }
    } catch (err: any) {
      setError({ 
        message: 'Impossible de charger les stocks',
        details: err.message
      });
      toast.error('Erreur lors du chargement des stocks');
    } finally {
      setLoading(prev => ({ ...prev, stocks: false }));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(prev => ({ ...prev, stats: true }));
    
    try {
      const stats = await stockService.getStats();
      setStockStats(stats);
    } catch (err: any) {
      console.error('Erreur stats:', err);
      // Ne pas afficher d'erreur toast car stats est optionnel
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  }, []);

  const testConnection = useCallback(async () => {
    try {
      const result = await stockService.testConnection();
      setApiStatus(result.message);
      return result;
    } catch (err: any) {
      setApiStatus('Impossible de se connecter');
      return { success: false, message: 'Erreur connexion' };
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setApiStatus('Rafraîchissement...');
    setError(null);
    
    try {
      await Promise.all([fetchStocks(), fetchStats()]);
      setApiStatus(`Connecté - ${stocks.length} stocks`);
      toast.success('Données rafraîchies avec succès');
    } catch (err: any) {
      setApiStatus('Erreur rafraîchissement');
      toast.error('Erreur lors du rafraîchissement');
    }
  }, [fetchStocks, fetchStats, stocks.length]);

  const getLowStockProducts = useCallback(() => {
    return stocks.filter(stock => 
      stock.stock_status === 'low_stock' || 
      stock.stock_status === 'out_of_stock' ||
      (stock.quantity_available <= stock.min_stock_threshold)
    );
  }, [stocks]);

  const calculateStockValue = useCallback(() => {
    return stocks.reduce((total, stock) => {
      const costPrice = stock.product_details?.cost_price || 0;
      return total + (stock.quantity_on_hand * costPrice);
    }, 0);
  }, [stocks]);

  const getProductName = useCallback((productId: number) => {
    const product = products.find(p => p.id === productId);
    return product?.name || `Produit #${productId}`;
  }, [products]);

  const getStoreName = useCallback((storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    return store?.name || `Magasin #${storeId}`;
  }, [stores]);

  const getWarehouseName = useCallback((warehouseId: number) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse?.name || `Entrepôt #${warehouseId}`;
  }, [warehouses]);

  useEffect(() => {
    if (initialLoad) {
      refreshAll();
      testConnection();
      loadAdditionalData();
    }
  }, [initialLoad, refreshAll, testConnection, loadAdditionalData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const intervalId = setInterval(() => {
      if (!loading.all) {
        refreshAll();
      }
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, loading.all, refreshAll]);

  return {
    stocks,
    stockStats,
    products,
    stores,
    warehouses,
    loading,
    error,
    apiStatus,
    totalCount,
    fetchStocks,
    fetchStats,
    refreshAll,
    testConnection,
    getLowStockProducts,
    calculateStockValue,
    getProductName,
    getStoreName,
    getWarehouseName,
    loadAdditionalData
  };
};

// =============================================================================
// COMPOSANT MODAL POUR AJOUTER/MODIFIER UN STOCK (CORRIGÉ)
// =============================================================================

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: Stock;
  isEditing?: boolean;
  products: Product[];
  stores: SimpleStore[];
  warehouses: SimpleWarehouse[];
}

const StockModal: React.FC<StockModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  isEditing = false,
  products,
  stores,
  warehouses
}) => {
  const [formData, setFormData] = useState({
    product: '',
    store: '',
    warehouse: '',
    quantity_on_hand: '0',
    quantity_reserved: '0',
    quantity_package: '0',
    ideal_stock_level: '50',
    min_stock_threshold: '10',
    qt_moy_appro: '5',
    stock_turnover_rate: '0',
    last_restocked: new Date().toISOString().slice(0, 16),
    stock_status: 'in_stock' as StockStatus,
    is_active: true,
    metadata: '{}'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const [selectedWarehouseName, setSelectedWarehouseName] = useState('');

  const stockStatusOptions = [
    { value: 'in_stock', label: 'En stock', color: 'green' },
    { value: 'low_stock', label: 'Stock bas', color: 'orange' },
    { value: 'out_of_stock', label: 'Rupture', color: 'red' },
    { value: 'over_stock', label: 'Surstock', color: 'blue' },
  ];

  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setFormData({
          product: initialData.product?.toString() || '',
          store: initialData.store?.toString() || '',
          warehouse: initialData.warehouse?.toString() || '',
          quantity_on_hand: initialData.quantity_on_hand?.toString() || '0',
          quantity_reserved: initialData.quantity_reserved?.toString() || '0',
          quantity_package: initialData.quantity_package?.toString() || '0',
          ideal_stock_level: initialData.ideal_stock_level?.toString() || '50',
          min_stock_threshold: initialData.min_stock_threshold?.toString() || '10',
          qt_moy_appro: initialData.qt_moy_appro?.toString() || '5',
          stock_turnover_rate: (initialData.stock_turnover_rate || 0).toString(),
          last_restocked: initialData.last_restocked ? 
            new Date(initialData.last_restocked).toISOString().slice(0, 16) : 
            new Date().toISOString().slice(0, 16),
          stock_status: initialData.stock_status || 'in_stock',
          is_active: initialData.is_active ?? true,
          metadata: JSON.stringify(initialData.metadata || {}, null, 2)
        });
        
        const onHand = parseInt(initialData.quantity_on_hand?.toString() || '0');
        const reserved = parseInt(initialData.quantity_reserved?.toString() || '0');
        const available = Math.max(0, onHand - reserved);
        setAvailableQuantity(available);
        
        // Mettre à jour les noms
        if (initialData.product) {
          setSelectedProductName(initialData.product_details?.name || 
            products.find(p => p.id === initialData.product)?.name || 
            `Produit #${initialData.product}`);
        }
        if (initialData.store) {
          setSelectedStoreName(initialData.store_details?.name || 
            stores.find(s => s.id === initialData.store)?.name || 
            `Magasin #${initialData.store}`);
        }
        if (initialData.warehouse) {
          setSelectedWarehouseName(initialData.warehouse_details?.name || 
            warehouses.find(w => w.id === initialData.warehouse)?.name || 
            `Entrepôt #${initialData.warehouse}`);
        }
      } else {
        // Définir des valeurs par défaut
        const defaultWarehouse = warehouses.length > 0 ? warehouses[0].id.toString() : '1';
        const defaultStore = stores.length > 0 ? stores[0].id.toString() : '1';
        
        setFormData({
          product: '',
          store: defaultStore,
          warehouse: defaultWarehouse,
          quantity_on_hand: '0',
          quantity_reserved: '0',
          quantity_package: '0',
          ideal_stock_level: '50',
          min_stock_threshold: '10',
          qt_moy_appro: '5',
          stock_turnover_rate: '0',
          last_restocked: new Date().toISOString().slice(0, 16),
          stock_status: 'in_stock',
          is_active: true,
          metadata: '{}'
        });
        setAvailableQuantity(0);
        setSelectedProductName('');
        setSelectedStoreName(stores.find(s => s.id === parseInt(defaultStore))?.name || '');
        setSelectedWarehouseName(warehouses.find(w => w.id === parseInt(defaultWarehouse))?.name || '');
      }
      setErrors({});
    }
  }, [isOpen, isEditing, initialData, warehouses, stores, products]);

  const calculateAvailable = (onHand: number, reserved: number) => {
    return Math.max(0, onHand - reserved);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Mettre à jour les noms
    if (name === 'product') {
      const selectedProduct = products.find(p => p.id === parseInt(value));
      setSelectedProductName(selectedProduct?.name || `Produit #${value}`);
    } else if (name === 'store') {
      const selectedStore = stores.find(s => s.id === parseInt(value));
      setSelectedStoreName(selectedStore?.name || `Magasin #${value}`);
    } else if (name === 'warehouse') {
      const selectedWarehouse = warehouses.find(w => w.id === parseInt(value));
      setSelectedWarehouseName(selectedWarehouse?.name || `Entrepôt #${value}`);
    }

    if (name === 'quantity_on_hand' || name === 'quantity_reserved') {
      const onHand = name === 'quantity_on_hand' ? parseInt(value) || 0 : parseInt(formData.quantity_on_hand) || 0;
      const reserved = name === 'quantity_reserved' ? parseInt(value) || 0 : parseInt(formData.quantity_reserved) || 0;
      const available = calculateAvailable(onHand, reserved);
      setAvailableQuantity(available);
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.product) {
      newErrors.product = 'Le produit est requis';
    } else if (parseInt(formData.product) <= 0) {
      newErrors.product = 'ID produit invalide';
    }
    
    if (!formData.store) {
      newErrors.store = 'Le magasin est requis';
    } else if (parseInt(formData.store) <= 0) {
      newErrors.store = 'ID magasin invalide';
    }
    
    if (!formData.warehouse) {
      newErrors.warehouse = 'L\'entrepôt est requis';
    } else if (parseInt(formData.warehouse) <= 0) {
      newErrors.warehouse = 'ID entrepôt invalide';
    }
    
    const quantityOnHand = parseInt(formData.quantity_on_hand);
    if (isNaN(quantityOnHand) || quantityOnHand < 0 || quantityOnHand > 2147483647) {
      newErrors.quantity_on_hand = 'Quantité invalide (0-2147483647)';
    }
    
    const quantityReserved = parseInt(formData.quantity_reserved);
    if (isNaN(quantityReserved) || quantityReserved < 0 || quantityReserved > 2147483647) {
      newErrors.quantity_reserved = 'Quantité réservée invalide (0-2147483647)';
    }
    
    if (quantityReserved > quantityOnHand) {
      newErrors.quantity_reserved = 'Ne peut pas dépasser la quantité en stock';
    }
    
    const quantityPackage = parseInt(formData.quantity_package);
    if (isNaN(quantityPackage) || quantityPackage < 0 || quantityPackage > 2147483647) {
      newErrors.quantity_package = 'Quantité par package invalide (0-2147483647)';
    }
    
    const minThreshold = parseInt(formData.min_stock_threshold);
    if (isNaN(minThreshold) || minThreshold < 0 || minThreshold > 2147483647) {
      newErrors.min_stock_threshold = 'Seuil minimum invalide (0-2147483647)';
    }
    
    const idealLevel = parseInt(formData.ideal_stock_level);
    if (isNaN(idealLevel) || idealLevel <= 0 || idealLevel > 2147483647) {
      newErrors.ideal_stock_level = 'Niveau idéal invalide (1-2147483647)';
    }
    
    if (idealLevel <= minThreshold) {
      newErrors.ideal_stock_level = 'Doit être supérieur au seuil minimum';
    }
    
    const qtMoyAppro = parseFloat(formData.qt_moy_appro);
    if (isNaN(qtMoyAppro) || qtMoyAppro < 0) {
      newErrors.qt_moy_appro = 'Quantité moyenne doit être un nombre positif';
    }
    
    const turnoverRate = parseFloat(formData.stock_turnover_rate);
    if (isNaN(turnoverRate) || turnoverRate < 0) {
      newErrors.stock_turnover_rate = 'Taux de rotation invalide';
    }
    
    if (formData.metadata && formData.metadata !== '{}') {
      try {
        JSON.parse(formData.metadata);
      } catch (err) {
        newErrors.metadata = 'JSON invalide';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const stockData = {
        product: parseInt(formData.product),
        store: parseInt(formData.store),
        warehouse: parseInt(formData.warehouse),
        quantity_on_hand: parseInt(formData.quantity_on_hand),
        quantity_reserved: parseInt(formData.quantity_reserved),
        quantity_package: parseInt(formData.quantity_package) || 0,
        ideal_stock_level: parseInt(formData.ideal_stock_level),
        min_stock_threshold: parseInt(formData.min_stock_threshold),
        qt_moy_appro: parseFloat(formData.qt_moy_appro) || 0,
        stock_turnover_rate: parseFloat(formData.stock_turnover_rate) || 0,
        last_restocked: formData.last_restocked + ':00.000Z',
        stock_status: formData.stock_status,
        is_active: formData.is_active,
        metadata: formData.metadata && formData.metadata !== '{}' ? JSON.parse(formData.metadata) : {}
      };
      
      console.log('📤 Données envoyées à l\'API:', stockData);
      
      await onSubmit(stockData);
    } catch (error: any) {
      console.error('❌ Erreur lors de la soumission:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isEditing ? 'Modifier le stock' : 'Ajouter un nouveau stock'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {availableQuantity} unités disponibles (calculé automatiquement)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fermer"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Colonne gauche */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Package className="w-4 h-4" />
                  Informations produit
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produit *
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="product"
                      value={formData.product}
                      onChange={handleChange}
                      disabled={isSubmitting || products.length === 0}
                      className={`pl-10 pr-10 py-3 w-full border ${errors.product ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100`}
                    >
                      <option value="">Sélectionner un produit...</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          #{product.id} - {product.name} {product.sku ? `(${product.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.product && <p className="mt-1 text-sm text-red-600">{errors.product}</p>}
                  
                  {/* Affichage du produit sélectionné */}
                  {formData.product && selectedProductName && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600" />
                        <div className="text-sm">
                          <span className="font-medium">Produit sélectionné : </span>
                          <span className="text-blue-700">
                            {selectedProductName}
                          </span>
                          <span className="ml-2 text-gray-600">
                            (ID: {formData.product})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qté en stock *
                    </label>
                    <input
                      type="number"
                      name="quantity_on_hand"
                      value={formData.quantity_on_hand}
                      onChange={handleChange}
                      min="0"
                      max="2147483647"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.quantity_on_hand ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {errors.quantity_on_hand && <p className="mt-1 text-sm text-red-600">{errors.quantity_on_hand}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qté réservée *
                    </label>
                    <input
                      type="number"
                      name="quantity_reserved"
                      value={formData.quantity_reserved}
                      onChange={handleChange}
                      min="0"
                      max="2147483647"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.quantity_reserved ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {errors.quantity_reserved && <p className="mt-1 text-sm text-red-600">{errors.quantity_reserved}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qté disponible
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                      <span className="font-bold text-gray-800">
                        {availableQuantity}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qté par package
                    </label>
                    <input
                      type="number"
                      name="quantity_package"
                      value={formData.quantity_package}
                      onChange={handleChange}
                      min="0"
                      max="2147483647"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.quantity_package ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {errors.quantity_package && <p className="mt-1 text-sm text-red-600">{errors.quantity_package}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qté moy. appro. *
                    </label>
                    <input
                      type="number"
                      name="qt_moy_appro"
                      value={formData.qt_moy_appro}
                      onChange={handleChange}
                      min="0"
                      step="0.1"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.qt_moy_appro ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {errors.qt_moy_appro && <p className="mt-1 text-sm text-red-600">{errors.qt_moy_appro}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <BarChart className="w-4 h-4" />
                  Seuils de stock
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seuil minimum *
                    </label>
                    <input
                      type="number"
                      name="min_stock_threshold"
                      value={formData.min_stock_threshold}
                      onChange={handleChange}
                      min="0"
                      max="2147483647"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.min_stock_threshold ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {errors.min_stock_threshold && <p className="mt-1 text-sm text-red-600">{errors.min_stock_threshold}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Niveau idéal *
                    </label>
                    <input
                      type="number"
                      name="ideal_stock_level"
                      value={formData.ideal_stock_level}
                      onChange={handleChange}
                      min="1"
                      max="2147483647"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.ideal_stock_level ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {errors.ideal_stock_level && <p className="mt-1 text-sm text-red-600">{errors.ideal_stock_level}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rotation de stock
                  </label>
                  <input
                    type="number"
                    name="stock_turnover_rate"
                    value={formData.stock_turnover_rate}
                    onChange={handleChange}
                    min="0"
                    step="0.1"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-3 border ${errors.stock_turnover_rate ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.stock_turnover_rate && <p className="mt-1 text-sm text-red-600">{errors.stock_turnover_rate}</p>}
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  Localisation
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Magasin *
                  </label>
                  <div className="relative">
                    <StoreIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="store"
                      value={formData.store}
                      onChange={handleChange}
                      disabled={isSubmitting || stores.length === 0}
                      className={`pl-10 pr-10 py-3 w-full border ${errors.store ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white`}
                    >
                      <option value="">Sélectionner un magasin...</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>
                          #{store.id} - {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.store && <p className="mt-1 text-sm text-red-600">{errors.store}</p>}
                  
                  {formData.store && selectedStoreName && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm">
                        <span className="font-medium">Magasin : </span>
                        <span className="text-green-700">{selectedStoreName}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entrepôt *
                  </label>
                  <div className="relative">
                    <WarehouseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="warehouse"
                      value={formData.warehouse}
                      onChange={handleChange}
                      disabled={isSubmitting || warehouses.length === 0}
                      className={`pl-10 pr-10 py-3 w-full border ${errors.warehouse ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white`}
                    >
                      <option value="">Sélectionner un entrepôt...</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          #{warehouse.id} - {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.warehouse && <p className="mt-1 text-sm text-red-600">{errors.warehouse}</p>}
                  
                  {formData.warehouse && selectedWarehouseName && (
                    <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-sm">
                        <span className="font-medium">Entrepôt : </span>
                        <span className="text-purple-700">{selectedWarehouseName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Activity className="w-4 h-4" />
                  Statut
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut du stock
                  </label>
                  <div className="relative">
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="stock_status"
                      value={formData.stock_status}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    >
                      {stockStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date dernier réappro.
                  </label>
                  <input
                    type="datetime-local"
                    name="last_restocked"
                    value={formData.last_restocked}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Métadonnées (JSON optionnel)
                  </label>
                  <textarea
                    name="metadata"
                    value={formData.metadata}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    rows={3}
                    className={`w-full px-4 py-3 border ${errors.metadata ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm`}
                    placeholder='{"emplacement": "A1", "fournisseur": "XYZ"}'
                  />
                  {errors.metadata && <p className="mt-1 text-sm text-red-600">{errors.metadata}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Format JSON valide. Exemple: {"{\"key\": \"value\"}"}
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Stock actif
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu des seuils */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Aperçu des seuils</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Quantité actuelle:</span>
                <span className="font-medium">{formData.quantity_on_hand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Seuil minimum:</span>
                <span className="text-orange-600 font-medium">{formData.min_stock_threshold}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Niveau idéal:</span>
                <span className="text-green-600 font-medium">{formData.ideal_stock_level}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full ${
                    parseInt(formData.quantity_on_hand) >= parseInt(formData.ideal_stock_level) ? 'bg-green-500' :
                    parseInt(formData.quantity_on_hand) > parseInt(formData.min_stock_threshold) ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (parseInt(formData.quantity_on_hand) / parseInt(formData.ideal_stock_level)) * 100)}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Min: {formData.min_stock_threshold}</span>
                <span>Actuel: {formData.quantity_on_hand}</span>
                <span>Idéal: {formData.ideal_stock_level}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || products.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Mettre à jour' : 'Créer le stock'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// COMPOSANT DE MODAL D'EXPORT
// =============================================================================

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  selectedCount: number;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, selectedCount }) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeAllFields: true,
    selectedFields: [
      'id', 'product_name', 'product_sku', 'store_name', 'warehouse_name',
      'quantity_on_hand', 'quantity_reserved', 'quantity_available',
      'stock_status', 'last_restocked'
    ]
  });

  const [isExporting, setIsExporting] = useState(false);
  
  const allFields = [
    { id: 'id', label: 'ID Stock', category: 'identification' },
    { id: 'product', label: 'ID Produit', category: 'identification' },
    { id: 'product_name', label: 'Nom produit', category: 'produit' },
    { id: 'product_sku', label: 'SKU Produit', category: 'produit' },
    { id: 'store', label: 'ID Magasin', category: 'localisation' },
    { id: 'store_name', label: 'Nom magasin', category: 'localisation' },
    { id: 'warehouse', label: 'ID Entrepôt', category: 'localisation' },
    { id: 'warehouse_name', label: 'Nom entrepôt', category: 'localisation' },
    { id: 'quantity_on_hand', label: 'Qté en stock', category: 'quantités' },
    { id: 'quantity_reserved', label: 'Qté réservée', category: 'quantités' },
    { id: 'quantity_available', label: 'Qté disponible', category: 'quantités' },
    { id: 'quantity_package', label: 'Qté par package', category: 'quantités' },
    { id: 'ideal_stock_level', label: 'Niveau idéal', category: 'seuils' },
    { id: 'min_stock_threshold', label: 'Seuil minimum', category: 'seuils' },
    { id: 'qt_moy_appro', label: 'Qté moyenne appro', category: 'seuils' },
    { id: 'stock_turnover_rate', label: 'Rotation stock', category: 'performance' },
    { id: 'stock_status', label: 'Statut', category: 'statut' },
    { id: 'last_restocked', label: 'Dernier réappro', category: 'historique' },
    { id: 'is_active', label: 'Actif', category: 'statut' },
  ];

  const handleFieldToggle = (fieldId: string) => {
    setExportOptions(prev => {
      if (prev.selectedFields.includes(fieldId)) {
        return {
          ...prev,
          selectedFields: prev.selectedFields.filter(id => id !== fieldId)
        };
      } else {
        return {
          ...prev,
          selectedFields: [...prev.selectedFields, fieldId]
        };
      }
    });
  };

  const handleSubmit = async () => {
    if (exportOptions.selectedFields.length === 0 && !exportOptions.includeAllFields) {
      toast.error('Veuillez sélectionner au moins un champ à exporter');
      return;
    }

    setIsExporting(true);
    try {
      await onExport(exportOptions);
      toast.success('Export terminé avec succès');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Exporter des stocks</h2>
                <p className="text-sm text-gray-600">
                  {selectedCount} stock(s) sélectionné(s)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Format d'export */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Format d'export</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'csv', label: 'CSV', desc: 'Excel, LibreOffice' },
                  { id: 'excel', label: 'Excel', desc: 'Format .xlsx' },
                  { id: 'json', label: 'JSON', desc: 'Format API' }
                ].map(format => (
                  <button
                    key={format.id}
                    onClick={() => setExportOptions(prev => ({ ...prev, format: format.id as 'csv' | 'excel' | 'json' }))}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      exportOptions.format === format.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{format.label}</div>
                    <div className="text-sm text-gray-600">{format.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAllFields}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeAllFields: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Inclure tous les champs</div>
                    <div className="text-sm text-gray-600">
                      Exporter toutes les données disponibles
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isExporting || (exportOptions.selectedFields.length === 0 && !exportOptions.includeAllFields)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Export en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Exporter
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPOSANT PRINCIPAL DE LA PAGE STOCK (COMPLET)
// =============================================================================

const StockPage: React.FC = () => {
  // États locaux
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStocks, setSelectedStocks] = useState<number[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [stockToDelete, setStockToDelete] = useState<Stock | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Utilisation du hook amélioré
  const { 
    stocks, 
    stockStats, 
    products,
    stores,
    warehouses,
    loading, 
    error, 
    apiStatus,
    totalCount,
    fetchStocks,
    fetchStats,
    refreshAll,
    testConnection,
    getLowStockProducts,
    calculateStockValue,
    getProductName,
    getStoreName,
    getWarehouseName
  } = useStock({
    autoRefresh: true,
    refreshInterval: 30000,
    initialLoad: true
  });

  // Constantes
  const itemsPerPage = 20;
  
  // Gestionnaires d'événements
  const handleSelectStock = (stockId: number) => {
    setSelectedStocks(prev => {
      if (prev.includes(stockId)) {
        return prev.filter(id => id !== stockId);
      } else {
        return [...prev, stockId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStocks.length === filteredStocks.length) {
      setSelectedStocks([]);
    } else {
      setSelectedStocks(filteredStocks.map(stock => stock.id));
    }
  };

  const handleAddStock = () => {
    setEditingStock(null);
    setShowStockModal(true);
  };

  const handleEditStock = (stock: Stock) => {
    console.log('✏️ Édition stock:', {
      id: stock.id,
      productId: stock.product,
      productName: stock.product_details?.name || 'Non disponible',
      stock
    });
    setEditingStock(stock);
    setShowStockModal(true);
  };

  const handleDeleteStock = async (stockId: number) => {
    try {
      await stockService.deleteStock(stockId);
      await fetchStocks();
      toast.success('Stock supprimé avec succès !');
      setShowDeleteModal(false);
      setStockToDelete(null);
    } catch (err: any) {
      console.error('Erreur suppression stock:', err);
      toast.error(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedStocks.length === 0) return;
    
    try {
      const promises = selectedStocks.map(id => stockService.deleteStock(id));
      await Promise.all(promises);
      setSelectedStocks([]);
      await fetchStocks();
      toast.success(`${selectedStocks.length} stock(s) supprimé(s) avec succès !`);
    } catch (err: any) {
      console.error('Erreur suppression multiple:', err);
      toast.error(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
    }
  };

  const handleStockSubmit = async (stockData: any) => {
    try {
      console.log('🎯 Données soumises pour validation:', stockData);
      
      if (editingStock) {
        console.log('🔄 Mise à jour du stock:', editingStock.id);
        await stockService.updateStock(editingStock.id, stockData);
        toast.success('Stock mis à jour avec succès !');
      } else {
        console.log('➕ Création d\'un nouveau stock');
        await stockService.createStock(stockData);
        toast.success('Nouveau stock créé avec succès !');
      }
      
      setShowStockModal(false);
      await fetchStocks();
      await fetchStats();
    } catch (err: any) {
      console.error('❌ Erreur enregistrement stock:', err);
      toast.error(err.message || 'Erreur lors de l\'enregistrement');
      throw err;
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      let data: any;
      
      if (selectedStocks.length > 0) {
        // Exporter seulement les stocks sélectionnés
        const stocksToExport = stocks.filter(stock => selectedStocks.includes(stock.id));
        data = stocksToExport;
      } else {
        // Exporter tous les stocks
        data = stocks;
      }

      // Filtrer les champs si nécessaire
      if (!options.includeAllFields && options.selectedFields.length > 0) {
        data = data.map((stock: any) => {
          const filteredStock: any = {};
          options.selectedFields.forEach(field => {
            if (stock[field] !== undefined) {
              filteredStock[field] = stock[field];
            }
          });
          return filteredStock;
        });
      }

      // Convertir selon le format
      let blob: Blob;
      let filename: string;
      const dateStr = new Date().toISOString().split('T')[0];

      if (options.format === 'json') {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `stocks_export_${dateStr}.json`;
      } else if (options.format === 'csv') {
        // Convertir en CSV
        const headers = Object.keys(data[0] || {});
        const csvRows = [
          headers.join(','),
          ...data.map((row: any) => 
            headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value);
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
          )
        ];
        blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        filename = `stocks_export_${dateStr}.csv`;
      } else {
        // Pour Excel, on utilise JSON pour l'exemple
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        filename = `stocks_export_${dateStr}.json`;
      }

      // Télécharger le fichier
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportModal(false);
      setSelectedStocks([]);
    } catch (error) {
      console.error('Erreur export:', error);
      throw error;
    }
  };

  const handleTestConnection = async () => {
    const result = await testConnection();
    toast.info(result.message);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
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

  const getStockStatusInfo = (stock: Stock) => {
    const statusConfigs: Record<StockStatus, { color: string; text: string; icon: React.ReactNode }> = {
      'out_of_stock': { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        text: 'Rupture', 
        icon: <XCircle className="w-3 h-3" />
      },
      'low_stock': { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        text: 'Stock bas', 
        icon: <AlertTriangle className="w-3 h-3" />
      },
      'in_stock': { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        text: 'En stock', 
        icon: <CheckCircle className="w-3 h-3" />
      },
      'over_stock': { 
        color: 'bg-blue-100 text-blue-800 border-blue-200', 
        text: 'Surstock', 
        icon: <Package className="w-3 h-3" />
      }
    };

    return statusConfigs[stock.stock_status] || statusConfigs.in_stock;
  };

  // Filtrer les stocks
  const filteredStocks = stocks.filter(stock => {
    // Recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        getProductName(stock.product).toLowerCase().includes(searchLower) ||
        (stock.product_details?.sku?.toLowerCase() || '').includes(searchLower) ||
        getStoreName(stock.store).toLowerCase().includes(searchLower) ||
        getWarehouseName(stock.warehouse).toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Filtre par statut
    if (selectedFilter === 'tous') return true;
    if (selectedFilter === 'sous-seuil') return stock.stock_status === 'low_stock';
    if (selectedFilter === 'en-rupture') return stock.stock_status === 'out_of_stock';
    if (selectedFilter === 'en-stock') return stock.stock_status === 'in_stock';
    if (selectedFilter === 'surstock') return stock.stock_status === 'over_stock';
    if (selectedFilter === 'inactifs') return !stock.is_active;
    
    return true;
  });

  const currentStocks = filteredStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  // Calculer les statistiques
  const stockValue = calculateStockValue();
  const lowStockCount = getLowStockProducts().length;
  const outOfStockCount = stocks.filter(s => s.stock_status === 'out_of_stock').length;
  const totalQuantity = stocks.reduce((sum, s) => sum + (s.quantity_on_hand || 0), 0);
  const averageTurnover = stocks.length > 0 
    ? stocks.reduce((acc, stock) => acc + (stock.stock_turnover_rate || 0), 0) / stocks.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              Gestion des Stocks
            </h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <span className={`px-2 py-1 rounded-full ${apiStatus.includes('Connecté') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {apiStatus}
              </span>
              <span>•</span>
              <span>{stocks.length} stock(s) total</span>
              {loading.stocks && <span>(Chargement...)</span>}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2 transition-colors"
            >
              <Activity size={18} />
              Tester API
            </button>
            
            <button
              onClick={refreshAll}
              disabled={loading.all}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading.all ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques améliorées */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Aperçu du Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Valeur du stock</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stockValue)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Quantité totale</p>
                <p className="text-2xl font-bold text-gray-800">
                  {totalQuantity.toLocaleString()} unités
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stocks.length} produits
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Stock bas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {lowStockCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Nécessitent réapprovisionnement
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">En rupture</p>
                <p className="text-2xl font-bold text-red-600">
                  {outOfStockCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Produits indisponibles
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des Stocks */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Liste des Stocks
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-gray-600">
                    {filteredStocks.length} stock(s) filtré(s) sur {stocks.length}
                  </span>
                  {selectedStocks.length > 0 && (
                    <span className="text-sm text-blue-600 font-medium">
                      {selectedStocks.length} sélectionné(s)
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher produit, SKU ou magasin..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} className="text-gray-400" />
                  </div>
                  <select
                    value={selectedFilter}
                    onChange={(e) => {
                      setSelectedFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[140px]"
                  >
                    <option value="tous">Tous les stocks</option>
                    <option value="en-stock">En stock</option>
                    <option value="sous-seuil">Sous seuil</option>
                    <option value="en-rupture">En rupture</option>
                    <option value="surstock">Surstock</option>
                    <option value="inactifs">Inactifs</option>
                  </select>
                </div>
              </div>
            </div>
            
            {loading.stocks ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">Chargement des stocks...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="py-12 text-center">
                <Package2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {stocks.length === 0 ? 'Aucun stock disponible' : 'Aucun stock correspond aux filtres'}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {stocks.length === 0 
                    ? 'Commencez par ajouter votre premier stock' 
                    : `Vous avez ${stocks.length} stock(s) mais aucun ne correspond à votre recherche`}
                </p>
                <button
                  onClick={handleAddStock}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Plus size={16} className="inline mr-2" />
                  Ajouter un stock
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                      {selectedStocks.length === filteredStocks.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                    </button>
                    {selectedStocks.length > 0 && (
                      <button
                        onClick={() => setSelectedStocks([])}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Effacer la sélection
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantités
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seuils
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Localisation
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStocks.map((stock) => {
                        const statusInfo = getStockStatusInfo(stock);
                        const productName = getProductName(stock.product);
                        const storeName = getStoreName(stock.store);
                        const warehouseName = getWarehouseName(stock.warehouse);
                        
                        return (
                          <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className={`w-4 h-4 rounded border ${selectedStocks.includes(stock.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'} cursor-pointer flex items-center justify-center`}
                                  onClick={() => handleSelectStock(stock.id)}
                                >
                                  {selectedStocks.includes(stock.id) && (
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-gray-400" />
                                    {productName}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">
                                      ID: {stock.product}
                                    </span>
                                    {stock.product_details?.sku && (
                                      <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-700">
                                        SKU: {stock.product_details.sku}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Total:</span>
                                  <span className="font-medium">{stock.quantity_on_hand}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Réservé:</span>
                                  <span className="font-medium text-orange-600">{stock.quantity_reserved}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Disponible:</span>
                                  <span className={`font-bold ${
                                    stock.quantity_available === 0 ? 'text-red-600' :
                                    stock.quantity_available <= stock.min_stock_threshold ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {stock.quantity_available}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Minimum:</span>
                                  <span className="font-medium">{stock.min_stock_threshold}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Idéal:</span>
                                  <span className="font-medium">{stock.ideal_stock_level}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Rotation:</span>
                                  <span className="font-medium">{(stock.stock_turnover_rate || 0).toFixed(1)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                <div className="text-sm flex items-center gap-1">
                                  <StoreIcon className="w-3 h-3 text-gray-400" />
                                  {storeName}
                                </div>
                                <div className="text-sm flex items-center gap-1">
                                  <WarehouseIcon className="w-3 h-3 text-gray-400" />
                                  {warehouseName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDate(stock.last_restocked)}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color} border`}>
                                  {statusInfo.icon}
                                  <span>{statusInfo.text}</span>
                                </span>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  {stock.is_active ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                      Actif
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 text-red-500" />
                                      Inactif
                                    </>
                                  )}
                                </div>
                                {stock.qt_moy_appro && (
                                  <div className="text-xs text-gray-500">
                                    Qté moy: {stock.qt_moy_appro}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleEditStock(stock)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setStockToDelete(stock);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    // Copier les informations
                                    const text = `Produit: ${productName}\nStock: ${stock.quantity_available}/${stock.ideal_stock_level}\nStatut: ${statusInfo.text}\nLocalisation: ${storeName} - ${warehouseName}`;
                                    navigator.clipboard.writeText(text);
                                    toast.success('Informations copiées');
                                  }}
                                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                                  title="Copier les informations"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination améliorée */}
                {filteredStocks.length > itemsPerPage && (
                  <div className="px-4 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-700">
                        Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredStocks.length)} sur {filteredStocks.length} résultats
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Lignes:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setCurrentPage(1);
                            }}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ← Précédent
                          </button>
                          
                          <div className="flex items-center gap-1">
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
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-8 h-8 rounded-lg ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            {totalPages > 5 && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Suivant →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides améliorées */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAddStock}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Ajouter un Stock
          </button>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 transition-colors"
          >
            <Download size={18} />
            Exporter
          </button>
          
          <button
            onClick={refreshAll}
            disabled={loading.all}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading.all ? 'animate-spin' : ''} />
            Actualiser
          </button>
          
          {selectedStocks.length > 0 && (
            <>
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 font-medium flex items-center gap-2 transition-colors ml-auto"
              >
                <Trash2 size={18} />
                Supprimer ({selectedStocks.length})
              </button>
              
              <button
                onClick={() => {
                  // Action groupée : Marquer comme actif
                  toast.info(`Action groupée sur ${selectedStocks.length} stocks`);
                }}
                className="px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-lg hover:bg-green-200 font-medium flex items-center gap-2 transition-colors"
              >
                <CheckCircle size={18} />
                Activer ({selectedStocks.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alertes stock bas */}
      {getLowStockProducts().length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900">Alertes Stock</h4>
              <p className="text-sm text-yellow-800">
                {getLowStockProducts().length} produit(s) ont un niveau de stock critique. 
                Pensez à réapprovisionner.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedFilter('sous-seuil');
              }}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Voir les alertes
            </button>
          </div>
        </div>
      )}

      {/* Modal d'ajout/modification */}
      <StockModal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setEditingStock(null);
        }}
        onSubmit={handleStockSubmit}
        initialData={editingStock || undefined}
        isEditing={!!editingStock}
        products={products}
        stores={stores}
        warehouses={warehouses}
      />

      {/* Modal d'export */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        selectedCount={selectedStocks.length}
      />

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && stockToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Supprimer le stock</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Êtes-vous sûr de vouloir supprimer le stock du produit{' '}
                <span className="font-medium">{getProductName(stockToDelete.product)}</span> 
                {' '}dans le magasin{' '}
                <span className="font-medium">{getStoreName(stockToDelete.store)}</span> ?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setStockToDelete(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteStock(stockToDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPage;