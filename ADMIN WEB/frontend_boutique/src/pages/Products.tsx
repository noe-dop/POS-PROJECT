import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Filter, Edit, Trash2, Package, 
  Tag, AlertTriangle, Download, RefreshCw, 
  Image as ImageIcon, X, Check, Upload, Camera, Euro,
  Store as StoreIcon, MapPin, ShoppingBag, Users,
  Calendar, BarChart, Percent, Layers, Box, Eye,
  Info as InfoIcon, ChevronDown
} from 'lucide-react';
import productService from '../services/productService';
import { 
  Product, 
  ProductCategory, 
  ProductBrand, 
  ProductFormData,
  Supplier,
  ProductVariant,
  Store,
  StoreProduct
} from '../types/product';

// Cache simple en mémoire
const apiCache = {
  products: null as Product[] | null,
  categories: null as ProductCategory[] | null,
  brands: null as ProductBrand[] | null,
  suppliers: null as Supplier[] | null,
  stores: null as Store[] | null,
  
  getProducts(): Product[] | null {
    return this.products;
  },
  
  setProducts(products: Product[]): void {
    this.products = products;
  },
  
  getCategories(): ProductCategory[] | null {
    return this.categories;
  },
  
  setCategories(categories: ProductCategory[]): void {
    this.categories = categories;
  },
  
  getBrands(): ProductBrand[] | null {
    return this.brands;
  },
  
  setBrands(brands: ProductBrand[]): void {
    this.brands = brands;
  },
  
  getSuppliers(): Supplier[] | null {
    return this.suppliers;
  },
  
  setSuppliers(suppliers: Supplier[]): void {
    this.suppliers = suppliers;
  },
  
  getStores(): Store[] | null {
    return this.stores;
  },
  
  setStores(stores: Store[]): void {
    this.stores = stores;
  },
  
  clear(): void {
    this.products = null;
    this.categories = null;
    this.brands = null;
    this.suppliers = null;
    this.stores = null;
  }
};

// Composant Modal pour créer/modifier un produit
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData | FormData) => Promise<void>;
  product?: Product | null;
  categories: ProductCategory[];
  brands: ProductBrand[];
  suppliers: Supplier[];
  stores: Store[];
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
  brands,
  suppliers,
  stores
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    description: '',
    category: 0,
    supplier: 0,
    brand: 0,
    qt_item: 0,
    jour_ecart: 0,
    status: 'draft',
    photo: undefined,
    type: 'simple',
    store_products: [],
    is_active: false,
    metadata: {},
    additional_images: {}
  });

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showOtherSupplier, setShowOtherSupplier] = useState(false);
  const [otherSupplierName, setOtherSupplierName] = useState('');
  const [otherSupplierStoreName, setOtherSupplierStoreName] = useState('');
  
  // États pour la gestion des boutiques
  const [selectedStores, setSelectedStores] = useState<number[]>([]);
  const [storeProducts, setStoreProducts] = useState<Record<number, {
    store_base_price: number;
    store_cost_price?: number;
    store_compare_at_price?: number;
    qt_item: number;
    min_stock_threshold: number;
    reorder_quantity: number;
    status: string;
    dlv?: string;
    dlc?: string;
    dcr?: string;
  }>>({});

  // Nettoyage des URLs blob
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (product && isOpen) {
      console.log('📝 Édition du produit:', product);
      
      // Vérifier si le fournisseur existe dans la liste
      const supplierExists = product.supplier && 
        suppliers.some(s => s.id === product.supplier?.id);
      
      if (product.supplier && !supplierExists) {
        setFormData({
          name: product.name,
          sku: product.sku || '',
          description: product.description || '',
          category: product.category?.id || 0,
          supplier: -1,
          brand: product.brand?.id || 0,
          qt_item: product.qt_item || 0,
          jour_ecart: product.jour_ecart || 0,
          status: product.status || 'draft',
          photo: undefined,
          type: product.type || 'simple',
          store_products: [],
          is_active: product.status === 'active',
          metadata: {},
          additional_images: {}
        });
        setShowOtherSupplier(true);
        setOtherSupplierName(product.supplier.name || '');
        setOtherSupplierStoreName(product.supplier.store_name || '');
      } else {
        setFormData({
          name: product.name,
          sku: product.sku || '',
          description: product.description || '',
          category: product.category?.id || 0,
          supplier: product.supplier?.id || 0,
          brand: product.brand?.id || 0,
          qt_item: product.qt_item || 0,
          jour_ecart: product.jour_ecart || 0,
          status: product.status || 'draft',
          photo: undefined,
          type: product.type || 'simple',
          store_products: [],
          is_active: product.status === 'active',
          metadata: {},
          additional_images: {}
        });
        setShowOtherSupplier(false);
        setOtherSupplierName('');
        setOtherSupplierStoreName('');
      }
      
      // Initialiser les boutiques et prix
      if (product.store_products && product.store_products.length > 0) {
        console.log('🏪 Store products existants:', product.store_products);
        
        // Extraire les IDs des boutiques
        const selectedStoreIds = product.store_products.map(sp => {
          if (sp.store && typeof sp.store === 'object') {
            return sp.store.id;
          } else {
            return sp.store as number;
          }
        }).filter(id => id !== undefined) as number[];
        
        setSelectedStores(selectedStoreIds);
        
        const productsMap: Record<number, any> = {};
        product.store_products.forEach(sp => {
          const storeId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store as number;
          
          if (storeId) {
            productsMap[storeId] = {
              store_base_price: sp.store_base_price || 0,
              store_cost_price: sp.store_cost_price || 0,
              store_compare_at_price: sp.store_compare_at_price || 0,
              qt_item: sp.qt_item || 0,
              min_stock_threshold: sp.min_stock_threshold || 10,
              reorder_quantity: sp.reorder_quantity || 100,
              jour_ecart: sp.jour_ecart || 0,
              status: sp.status || 'draft',
              dlv: sp.dlv || '',
              dlc: sp.dlc || '',
              dcr: sp.dcr || ''
            };
          }
        });
        setStoreProducts(productsMap);
      } else {
        console.log('⚠️ Aucun store product trouvé pour ce produit');
        setSelectedStores([]);
        setStoreProducts({});
      }
      
      setImagePreview(product.photo || null);
      setImageFile(null);
    } else if (isOpen) {
      // Générer un SKU aléatoire par défaut
      const randomSku = `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      setFormData({
        name: '',
        sku: randomSku,
        description: '',
        category: categories[0]?.id || 0,
        supplier: suppliers[0]?.id || 0,
        brand: brands[0]?.id || 0,
        qt_item: 0,
        jour_ecart: 0,
        status: 'draft',
        photo: undefined,
        type: 'simple',
        store_products: [],
        is_active: false,
        metadata: {},
        additional_images: {}
      });
      setImagePreview(null);
      setImageFile(null);
      setShowOtherSupplier(false);
      setOtherSupplierName('');
      setOtherSupplierStoreName('');
      setSelectedStores([]);
      setStoreProducts({});
    }
  }, [product, categories, brands, suppliers, stores, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let processedValue: any = value;
    
    if (name.includes('_item') || name.includes('_ecart')) {
      processedValue = value === '' ? 0 : parseFloat(value) || 0;
    } else if (name === 'category' || name === 'supplier' || name === 'brand') {
      processedValue = value === '' ? 0 : parseInt(value) || 0;
    }
    
    if (name === 'supplier') {
      const supplierValue = parseInt(value);
      if (supplierValue === -1) {
        setShowOtherSupplier(true);
      } else {
        setShowOtherSupplier(false);
        setOtherSupplierName('');
        setOtherSupplierStoreName('');
      }
    }
    
    // Recalculer la répartition du stock si le stock total change
    if (name === 'qt_item') {
      const newTotalStock = parseFloat(value) || 0;
      if (selectedStores.length > 0) {
        const updatedStoreProducts = { ...storeProducts };
        const stockPerStore = Math.floor(newTotalStock / selectedStores.length);
        
        selectedStores.forEach(storeId => {
          if (updatedStoreProducts[storeId]) {
            updatedStoreProducts[storeId].qt_item = stockPerStore;
          }
        });
        
        setStoreProducts(updatedStoreProducts);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleOtherSupplierChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'otherSupplierName') {
      setOtherSupplierName(value);
    } else if (name === 'otherSupplierStoreName') {
      setOtherSupplierStoreName(value);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }
      
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setFormData(prev => ({
        ...prev,
        photo: file
      }));
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
    setFormData(prev => ({
      ...prev,
      photo: undefined
    }));
  };

  // Gestion des boutiques
  const handleStoreSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const newSelectedStores = selectedOptions.map(option => parseInt(option.value));
    setSelectedStores(newSelectedStores);
    
    // Mettre à jour les produits pour les nouvelles boutiques
    const updatedStoreProducts = { ...storeProducts };
    
    newSelectedStores.forEach(storeId => {
      if (!updatedStoreProducts[storeId]) {
        updatedStoreProducts[storeId] = {
          store_base_price: 0,
          store_cost_price: 0,
          store_compare_at_price: 0,
          qt_item: Math.floor(formData.qt_item / newSelectedStores.length),
          min_stock_threshold: 10,
          reorder_quantity: 100,
          status: 'draft',
          dlv: new Date().toISOString().split('T')[0],
          dlc: new Date().toISOString().split('T')[0],
          dcr: new Date().toISOString().split('T')[0]
        };
      }
    });
    
    // Supprimer les boutiques qui ne sont plus sélectionnées
    Object.keys(updatedStoreProducts).forEach(storeIdStr => {
      const storeId = parseInt(storeIdStr);
      if (!newSelectedStores.includes(storeId)) {
        delete updatedStoreProducts[storeId];
      }
    });
    
    // Répartir le stock équitablement
    if (newSelectedStores.length > 0) {
      const stockPerStore = Math.floor(formData.qt_item / newSelectedStores.length);
      newSelectedStores.forEach(storeId => {
        if (updatedStoreProducts[storeId]) {
          updatedStoreProducts[storeId].qt_item = stockPerStore;
        }
      });
    }
    
    setStoreProducts(updatedStoreProducts);
  };

  const handleStoreProductChange = (storeId: number, field: string, value: string | number) => {
    const numValue = typeof value === 'string' 
      ? field.includes('price') ? parseFloat(value) || 0 : parseInt(value) || 0
      : value;
    
    setStoreProducts(prev => ({
      ...prev,
      [storeId]: {
        ...prev[storeId],
        [field]: numValue
      }
    }));
  };

  const validateStoreProducts = (): string[] => {
    const errors: string[] = [];
    
    selectedStores.forEach(storeId => {
      const storeProduct = storeProducts[storeId];
      const store = stores.find(s => s.id === storeId);
      
      if (!storeProduct) {
        errors.push(`Les informations pour la boutique "${store?.name || storeId}" sont manquantes`);
        return;
      }
      
      if (storeProduct.qt_item === undefined || storeProduct.qt_item < 0) {
        errors.push(`Quantité invalide pour "${store?.name || storeId}"`);
      }
      
      if (storeProduct.store_base_price === undefined || storeProduct.store_base_price < 0) {
        errors.push(`Prix de vente invalide pour "${store?.name || storeId}"`);
      }
      
      if (storeProduct.min_stock_threshold <= 0) {
        errors.push(`Seuil de stock minimum invalide pour "${store?.name || storeId}"`);
      }
      
      if (storeProduct.reorder_quantity <= 0) {
        errors.push(`Quantité de réapprovisionnement invalide pour "${store?.name || storeId}"`);
      }
    });
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📦 Début de la soumission du formulaire');
    console.log('📊 Données du formulaire:', formData);
    console.log('🏪 Boutiques sélectionnées:', selectedStores);
    console.log('💰 Store products:', storeProducts);
    
    // Validation
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Le nom du produit est requis');
    }
    
    if (!formData.sku.trim()) {
      errors.push('Le SKU est requis');
    }
    
    if (selectedStores.length === 0) {
      errors.push('Veuillez sélectionner au moins une boutique');
    }
    
    if (formData.supplier === -1 && !otherSupplierName.trim()) {
      errors.push('Le nom du fournisseur est requis lorsque vous sélectionnez "Autres"');
    }
    
    // Validation des quantités
    let totalQuantity = 0;
    selectedStores.forEach(storeId => {
      const storeProduct = storeProducts[storeId];
      if (storeProduct) {
        totalQuantity += storeProduct.qt_item || 0;
      }
    });
    
    if (totalQuantity > formData.qt_item) {
      errors.push(`La quantité totale dans les boutiques (${totalQuantity}) dépasse le stock total (${formData.qt_item})`);
    }
    
    if (totalQuantity < formData.qt_item) {
      console.warn(`⚠️ Attention: Stock distribué (${totalQuantity}) inférieur au stock total (${formData.qt_item})`);
    }
    
    // Validation des store_products
    const storeProductErrors = validateStoreProducts();
    if (storeProductErrors.length > 0) {
      errors.push(...storeProductErrors);
    }
    
    if (errors.length > 0) {
      console.error('❌ Erreurs de validation:', errors);
      alert(errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      // Préparer les données de base selon le format de l'API
      const productBaseData: any = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description || '',
        is_active: formData.status === 'active',
        category: formData.category > 0 ? formData.category : null,
        brand: formData.brand > 0 ? formData.brand : null,
        metadata: {},
        additional_images: {},
        search_vector: '',
        qt_item: formData.qt_item,
        jour_ecart: formData.jour_ecart,
        status: formData.status,
        type: formData.type
      };

      // Ajouter le fournisseur si spécifié
      if (formData.supplier > 0) {
        productBaseData.supplier = formData.supplier;
      }

      // Préparer les données des store_products
      const storeProductsData = selectedStores.map(storeId => {
        const storeProduct = storeProducts[storeId];
        
        if (!storeProduct) {
          console.warn(`⚠️ Store product non trouvé pour la boutique ${storeId}, utilisation des valeurs par défaut`);
          return {
            store: storeId,
            store_base_price: '0',
            store_cost_price: '0',
            store_compare_at_price: '0',
            qt_item: 0,
            min_stock_threshold: 10,
            reorder_quantity: 100,
            jour_ecart: formData.jour_ecart,
            status: formData.status,
            dlv: new Date().toISOString().split('T')[0],
            dlc: new Date().toISOString().split('T')[0],
            dcr: new Date().toISOString().split('T')[0]
          };
        }
        
        return {
          store: storeId,
          store_base_price: (storeProduct.store_base_price || 0).toString(),
          store_cost_price: (storeProduct.store_cost_price || 0).toString(),
          store_compare_at_price: (storeProduct.store_compare_at_price || 0).toString(),
          qt_item: storeProduct.qt_item || 0,
          min_stock_threshold: storeProduct.min_stock_threshold || 10,
          reorder_quantity: storeProduct.reorder_quantity || 100,
          jour_ecart: storeProduct.jour_ecart || formData.jour_ecart,
          status: storeProduct.status || 'draft',
          dlv: storeProduct.dlv || new Date().toISOString().split('T')[0],
          dlc: storeProduct.dlc || new Date().toISOString().split('T')[0],
          dcr: storeProduct.dcr || new Date().toISOString().split('T')[0]
        };
      });

      console.log('📤 Données de base:', productBaseData);
      console.log('🏪 Données des store_products:', storeProductsData);

      // Créer FormData si une image est incluse
      let productDataToSend: ProductFormData | FormData;
      
      if (imageFile) {
        const formDataToSend = new FormData();
        
        // Ajouter les champs de base
        Object.entries(productBaseData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (typeof value === 'object') {
              formDataToSend.append(key, JSON.stringify(value));
            } else {
              formDataToSend.append(key, value.toString());
            }
          }
        });
        
        // Ajouter les store_products
        formDataToSend.append('store_products', JSON.stringify(storeProductsData));
        
        // Ajouter la photo
        formDataToSend.append('photo', imageFile);
        
        productDataToSend = formDataToSend;
      } else {
        const productData = {
          ...productBaseData,
          store_products: storeProductsData
        };
        
        console.log('📄 Données JSON préparées:', productData);
        productDataToSend = productData;
      }
      
      console.log('🚀 Envoi des données au serveur...');
      await onSave(productDataToSend);
      console.log('✅ Produit sauvegardé avec succès');
      onClose();
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du produit. Veuillez vérifier la console pour plus de détails.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction utilitaire pour formater les devises
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-800">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section Image du produit */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Image du produit
            </label>
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="Aperçu" 
                      className="w-40 h-40 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white">
                    <Camera className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Aucune image</span>
                  </div>
                )}
              </div>
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image"
                />
                <div className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    {imagePreview ? 'Changer l\'image' : 'Télécharger une image'}
                  </span>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Formats supportés: JPG, PNG, GIF • Max: 5MB
              </p>
            </div>
          </div>

          {/* Informations de base */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de produit *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Entrer un nom"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU *
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="Ex : PRD-8475"
              />
            </div>
          </div>

          {/* Catégorie et Marque */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marque
              </label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white"
              >
                <option value="">Sélectionnez une marque</option>
                <option value="0">Aucune marque</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <select
              name="supplier"
              value={formData.supplier}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Sélectionnez un fournisseur</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
              <option value="-1">Autres</option>
            </select>
            
            {showOtherSupplier && (
              <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Informations du nouveau fournisseur</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du fournisseur *
                  </label>
                  <input
                    type="text"
                    name="otherSupplierName"
                    value={otherSupplierName}
                    onChange={handleOtherSupplierChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Entrez le nom du fournisseur"
                    required={showOtherSupplier}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom Store
                  </label>
                  <input
                    type="text"
                    name="otherSupplierStoreName"
                    value={otherSupplierStoreName}
                    onChange={handleOtherSupplierChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="Nom de la boutique"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Configuration des Boutiques */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Configuration des Boutiques</h3>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock total *
                </label>
                <input
                  type="number"
                  name="qt_item"
                  value={formData.qt_item}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jour d'écart
                </label>
                <input
                  type="number"
                  name="jour_ecart"
                  value={formData.jour_ecart}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                  placeholder="15"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de produit
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white"
                >
                  <option value="simple">Produit simple</option>
                  <option value="variable">Produit variable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white"
                >
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </div>

            {/* Statut actif */}
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      is_active: e.target.checked,
                      status: e.target.checked ? 'active' : 'draft'
                    }));
                  }}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Produit actif
                </span>
              </label>
            </div>
          </div>

          {/* Boutiques */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Boutiques disponibles *
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez les boutiques où ce produit sera disponible
                </p>
              </div>
              <span className="text-xs font-medium text-blue-700">
                {selectedStores.length} sélectionnée(s)
              </span>
            </div>
            
            {/* Liste déroulante multiple */}
            <div className="relative">
              <select
                multiple
                value={selectedStores.map(String)}
                onChange={handleStoreSelect}
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white h-40"
              >
                <option value="" disabled className="text-gray-400 py-2">
                  ↓ Sélectionnez une ou plusieurs boutiques ↓
                </option>
                {stores
                  .filter(store => store.is_active)
                  .map(store => (
                    <option 
                      key={store.id} 
                      value={store.id}
                      className={`py-2 ${selectedStores.includes(store.id) ? 'bg-blue-50 text-blue-700' : ''}`}
                    >
                      <div className="flex items-center">
                        <StoreIcon className="w-4 h-4 mr-2" />
                        <span className="font-medium">{store.name}</span>
                        <span className="ml-auto text-xs text-gray-500">{store.address || 'Online'}</span>
                      </div>
                    </option>
                  ))
                }
              </select>
              
              {/* Instructions */}
              <div className="mt-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <InfoIcon className="w-3 h-3 mr-1" />
                  <span>Maintenez <strong>Ctrl</strong> (ou <strong>Cmd</strong> sur Mac) pour sélectionner plusieurs boutiques</span>
                </div>
              </div>
            </div>
            
            {/* Affichage des boutiques sélectionnées */}
            {selectedStores.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-gray-700">
                  Boutiques sélectionnées :
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedStores.map(storeId => {
                    const store = stores.find(s => s.id === storeId);
                    const storeProduct = storeProducts[storeId];
                    return (
                      <div
                        key={storeId}
                        className="inline-flex items-center px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm"
                      >
                        <div className="flex items-center">
                          <StoreIcon className="w-4 h-4 text-blue-500 mr-2" />
                          <div>
                            <div className="font-medium text-gray-900">{store?.name}</div>
                            <div className="text-xs text-gray-500">
                              Stock: {storeProduct?.qt_item || 0} • Prix: {formatCurrency(storeProduct?.store_base_price || 0)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStores(prev => prev.filter(id => id !== storeId));
                            const newStoreProducts = { ...storeProducts };
                            delete newStoreProducts[storeId];
                            setStoreProducts(newStoreProducts);
                          }}
                          className="ml-3 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {selectedStores.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-xs text-yellow-700">
                    ⚠️ Veuillez sélectionner au moins une boutique
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Store Products - AFFICHÉ SEULEMENT SI DES BOUTIQUES SONT SÉLECTIONNÉES */}
          {selectedStores.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <Euro className="w-4 h-4 mr-2 text-green-600" />
                  Store Products par Boutique
                </h3>
                <span className="text-xs text-green-700">
                  {selectedStores.length} boutique(s) configurée(s)
                </span>
              </div>
              
              <div className="space-y-4">
                {selectedStores.map(storeId => {
                  const store = stores.find(s => s.id === storeId);
                  const storeProduct = storeProducts[storeId] || {
                    store_base_price: 0,
                    store_cost_price: 0,
                    store_compare_at_price: 0,
                    qt_item: Math.floor(formData.qt_item / selectedStores.length),
                    min_stock_threshold: 10,
                    reorder_quantity: 100,
                    status: 'draft',
                    dlv: new Date().toISOString().split('T')[0],
                    dlc: new Date().toISOString().split('T')[0],
                    dcr: new Date().toISOString().split('T')[0]
                  };
                  
                  return (
                    <div key={storeId} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mr-3">
                            <StoreIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">{store?.name}</h4>
                            <p className="text-xs text-gray-500">{store?.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStores(prev => prev.filter(id => id !== storeId));
                            const newStoreProducts = { ...storeProducts };
                            delete newStoreProducts[storeId];
                            setStoreProducts(newStoreProducts);
                          }}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Retirer
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Prix de vente (€)*</label>
                          <input
                            type="number"
                            value={storeProduct.store_base_price}
                            onChange={(e) => handleStoreProductChange(storeId, 'store_base_price', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Quantité*</label>
                          <input
                            type="number"
                            value={storeProduct.qt_item}
                            onChange={(e) => handleStoreProductChange(storeId, 'qt_item', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            min="0"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Seuil minimum</label>
                          <input
                            type="number"
                            value={storeProduct.min_stock_threshold}
                            onChange={(e) => handleStoreProductChange(storeId, 'min_stock_threshold', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Qté réappro</label>
                          <input
                            type="number"
                            value={storeProduct.reorder_quantity}
                            onChange={(e) => handleStoreProductChange(storeId, 'reorder_quantity', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            min="1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Prix d'achat (€)</label>
                          <input
                            type="number"
                            value={storeProduct.store_cost_price || 0}
                            onChange={(e) => handleStoreProductChange(storeId, 'store_cost_price', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Prix comparé (€)</label>
                          <input
                            type="number"
                            value={storeProduct.store_compare_at_price || 0}
                            onChange={(e) => handleStoreProductChange(storeId, 'store_compare_at_price', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-1">Statut</label>
                        <select
                          value={storeProduct.status}
                          onChange={(e) => handleStoreProductChange(storeId, 'status', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                        >
                          <option value="draft">Brouillon</option>
                          <option value="active">Actif</option>
                          <option value="inactive">Inactif</option>
                          <option value="out_of_stock">En rupture</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
                
                {/* Résumé du stock */}
                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total stock distribué:</span>
                    <span className="font-semibold text-gray-900">
                      {
                        selectedStores.reduce((total, storeId) => {
                          return total + (storeProducts[storeId]?.qt_item || 0);
                        }, 0)
                      } / {formData.qt_item}
                    </span>
                  </div>
                  {formData.qt_item > 0 && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">Stock non distribué:</span>
                      <span className={`text-sm font-medium ${
                        formData.qt_item - selectedStores.reduce((total, storeId) => {
                          return total + (storeProducts[storeId]?.qt_item || 0);
                        }, 0) > 0 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {formData.qt_item - selectedStores.reduce((total, storeId) => {
                          return total + (storeProducts[storeId]?.qt_item || 0);
                        }, 0)} unités
                      </span>
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (selectedStores.reduce((total, storeId) => {
                            return total + (storeProducts[storeId]?.qt_item || 0);
                          }, 0) / formData.qt_item) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>Distribution du stock</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm resize-none"
              placeholder="Entrez la description détaillée du produit..."
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-between pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || selectedStores.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </span>
              ) : product ? 'Mettre à jour' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Fonction utilitaire pour formater les devises
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

// Fonction pour calculer la marge bénéficiaire
const calculateProfitMargin = (sellingPrice: number, costPrice: number) => {
  if (costPrice === 0 || !costPrice) return 0;
  return ((sellingPrice - costPrice) / costPrice) * 100;
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  
  // États pour la modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // État pour le produit sélectionné
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // États pour les filtres
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  
  // État pour les variantes
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Ref pour suivre le chargement initial
  const hasLoadedRef = useRef(false);

  // Chargement des données initiales
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Chargement des données initiales...');
        hasLoadedRef.current = true;
        
        // Vérifier d'abord le cache
        const cachedProducts = apiCache.getProducts();
        const cachedCategories = apiCache.getCategories();
        const cachedBrands = apiCache.getBrands();
        const cachedSuppliers = apiCache.getSuppliers();
        const cachedStores = apiCache.getStores();
        
        // Si toutes les données sont en cache, les utiliser
        if (cachedProducts && cachedCategories && cachedBrands && cachedSuppliers && cachedStores) {
          console.log('💾 Utilisation des données en cache');
          setProducts(cachedProducts);
          setCategories(cachedCategories);
          setBrands(cachedBrands);
          setSuppliers(cachedSuppliers);
          const activeStores = cachedStores.filter(store => store.is_active);
          setStores(activeStores);
          
          if (cachedProducts.length > 0) {
            const firstProduct = cachedProducts[0];
            setSelectedProduct(firstProduct);
            loadProductVariants(firstProduct.id);
          } else {
            setSelectedProduct(null);
            setVariants([]);
          }
          
          setLoading(false);
          return;
        }
        
        // Sinon, charger depuis l'API
        console.log('🌐 Chargement des données depuis l\'API...');
        const [productsData, categoriesData, brandsData, suppliersData, storesData] = await Promise.all([
          productService.getAllProducts().catch((error) => {
            console.error('❌ Erreur lors du chargement des produits:', error);
            return [];
          }),
          productService.getAllCategories().catch((error) => {
            console.error('❌ Erreur lors du chargement des catégories:', error);
            return [];
          }),
          productService.getAllBrands().catch((error) => {
            console.error('❌ Erreur lors du chargement des marques:', error);
            return [];
          }),
          productService.getAllSuppliers().catch((error) => {
            console.error('❌ Erreur lors du chargement des fournisseurs:', error);
            return [];
          }),
          productService.getAllStores().catch((error) => {
            console.error('❌ Erreur lors du chargement des boutiques:', error);
            return [];
          })
        ]);
        
        // Mettre en cache
        apiCache.setProducts(productsData);
        apiCache.setCategories(categoriesData);
        apiCache.setBrands(brandsData);
        apiCache.setSuppliers(suppliersData);
        apiCache.setStores(storesData);
        
        setProducts(productsData);
        setCategories(categoriesData);
        setBrands(brandsData);
        setSuppliers(suppliersData);
        const activeStores = storesData.filter(store => store.is_active);
        setStores(activeStores);
        
        console.log(`✅ Données chargées: ${productsData.length} produits, ${activeStores.length} boutiques`);
        
        if (productsData.length > 0) {
          const firstProduct = productsData[0];
          setSelectedProduct(firstProduct);
          console.log(`📦 Premier produit sélectionné: ${firstProduct.name} (ID: ${firstProduct.id})`);
          
          if (firstProduct.store_products && firstProduct.store_products.length > 0) {
            console.log(`🏪 Produit lié à ${firstProduct.store_products.length} boutiques`);
          } else {
            console.log('⚠️ Produit non lié à des boutiques');
          }
          
          loadProductVariants(firstProduct.id);
        } else {
          setSelectedProduct(null);
          setVariants([]);
          console.log('📭 Aucun produit trouvé');
        }
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        alert('Erreur lors du chargement des données. Veuillez réessayer.');
        hasLoadedRef.current = false;
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
    
    return () => {
      // Nettoyage si nécessaire
    };
  }, []);

  // Filtrage des produits
  useEffect(() => {
    applyFilters();
  }, [products, activeFilter, searchTerm, selectedStore]);

  const loadProductVariants = async (productId: number) => {
    try {
      setVariantsLoading(true);
      console.log(`🔄 Chargement des variantes pour le produit ${productId}...`);
      const variantsData = await productService.getProductVariants(productId);
      console.log(`✅ ${variantsData.length} variantes chargées`);
      setVariants(variantsData);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des variantes:', error);
      setVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = products;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        filtered = filtered.filter(product => product.status === 'active');
      } else if (activeFilter === 'out') {
        filtered = filtered.filter(product => 
          product.status === 'out_of_stock' || 
          (product.qt_item || 0) === 0
        );
      }
    }

    // Filtre par boutique
    if (selectedStore !== 'all') {
      filtered = filtered.filter(product => 
        product.store_products?.some(sp => {
          const storeId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store;
          return storeId === selectedStore;
        })
      );
    }

    console.log(`🔍 ${filtered.length} produits après filtrage`);
    setFilteredProducts(filtered);
  };

  const handleSearch = (value: string) => {
    console.log(`🔎 Recherche: "${value}"`);
    setSearchTerm(value);
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'out') => {
    console.log(`🎯 Filtre changé: ${filter}`);
    setActiveFilter(filter);
  };

  const handleStoreChange = (storeId: number | 'all') => {
    console.log(`🏪 Filtre boutique changé: ${storeId}`);
    setSelectedStore(storeId);
  };

  const handleCreateProduct = () => {
    console.log('➕ Création d\'un nouveau produit');
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    console.log(`✏️ Édition du produit: ${product.name} (ID: ${product.id})`);
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('❌ Fermeture de la modale');
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (productData: ProductFormData | FormData) => {
    try {
      console.log('💾 Sauvegarde du produit...');
      
      let response;
      if (editingProduct) {
        console.log(`🔄 Mise à jour du produit ${editingProduct.id}`);
        response = await productService.updateProductWithStorePrices(editingProduct.id, productData);
      } else {
        console.log('🆕 Création d\'un nouveau produit');
        response = await productService.createProductWithStorePrices(productData);
        console.log('✅ Produit créé avec réponse:', response);
      }
      
      // Invalider le cache des produits
      apiCache.products = null;
      
      console.log('🔄 Rechargement des données...');
      
      // Recharger les données
      await loadInitialData();
      
      const message = editingProduct 
        ? '✅ Produit mis à jour avec succès!'
        : '✅ Produit créé avec succès!';
      
      console.log(message);
      alert(message);
      
    } catch (error: any) {
      console.error('❌ Erreur détaillée lors de la sauvegarde:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        error: error
      });
      
      let errorMessage = 'Erreur lors de la sauvegarde du produit';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.errors) {
        errorMessage = Object.values(error.response.data.errors).flat().join('\n');
      }
      
      alert(`❌ Erreur: ${errorMessage}`);
      throw error;
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      hasLoadedRef.current = true;
      
      console.log('🔄 Rechargement complet des données...');
      
      const [productsData, categoriesData, brandsData, suppliersData, storesData] = await Promise.all([
        productService.getAllProducts().catch(() => []),
        productService.getAllCategories().catch(() => []),
        productService.getAllBrands().catch(() => []),
        productService.getAllSuppliers().catch(() => []),
        productService.getAllStores().catch(() => [])
      ]);
      
      // Mettre en cache
      apiCache.setProducts(productsData);
      apiCache.setCategories(categoriesData);
      apiCache.setBrands(brandsData);
      apiCache.setSuppliers(suppliersData);
      apiCache.setStores(storesData);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setBrands(brandsData);
      setSuppliers(suppliersData);
      setStores(storesData.filter(store => store.is_active));
      
      // Vérifier si le produit édité existe toujours
      if (editingProduct) {
        const updatedProduct = productsData.find(p => p.id === editingProduct.id);
        if (updatedProduct) {
          setSelectedProduct(updatedProduct);
          loadProductVariants(updatedProduct.id);
        }
      }
      
      if (productsData.length > 0 && !selectedProduct) {
        const firstProduct = productsData[0];
        setSelectedProduct(firstProduct);
        loadProductVariants(firstProduct.id);
      }
      
      console.log(`✅ Rechargement terminé: ${productsData.length} produits`);
      
    } catch (error) {
      console.error('❌ Erreur lors du rechargement:', error);
      alert('Erreur lors du rechargement des données. Veuillez réessayer.');
      hasLoadedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Rafraîchissement manuel');
    apiCache.clear();
    hasLoadedRef.current = false;
    setSelectedProduct(null);
    loadInitialData();
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      console.log('📤 Export des produits...');
      const blob = await productService.exportProducts({});
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('✅ Export terminé');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export des produits');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        console.log(`🗑️ Suppression du produit ${productId}...`);
        await productService.deleteProduct(productId);
        
        // Invalider le cache des produits
        apiCache.setProducts(null);
        
        // Mettre à jour l'état local immédiatement
        setProducts(prev => prev.filter(p => p.id !== productId));
        setFilteredProducts(prev => prev.filter(p => p.id !== productId));
        
        // Si le produit supprimé était sélectionné, sélectionner un autre
        if (selectedProduct?.id === productId) {
          const remainingProducts = products.filter(p => p.id !== productId);
          if (remainingProducts.length > 0) {
            setSelectedProduct(remainingProducts[0]);
            loadProductVariants(remainingProducts[0].id);
          } else {
            setSelectedProduct(null);
            setVariants([]);
          }
        }
        
        console.log('✅ Produit supprimé avec succès');
        alert('Produit supprimé avec succès!');
        
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du produit');
      }
    }
  };

  const handleSelectProduct = (product: Product) => {
    console.log(`📦 Sélection du produit: ${product.name} (ID: ${product.id})`);
    setSelectedProduct(product);
    loadProductVariants(product.id);
  };

  const getStatusText = (product: Product) => {
    if (product.status === 'out_of_stock' || (product.qt_item || 0) === 0) {
      return 'En rupture';
    }
    return 'Actif';
  };

  const getStatusClass = (product: Product) => {
    if (product.status === 'out_of_stock' || (product.qt_item || 0) === 0) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getProductImage = (product: Product) => {
    if (product.photo) {
      return (
        <img 
          src={product.photo} 
          alt={product.name}
          className="h-12 w-12 rounded-md object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-md flex items-center justify-center text-blue-600">
                <Package class="w-6 h-6" />
              </div>
            `;
          }}
        />
      );
    }
    return (
      <div className="h-12 w-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md flex items-center justify-center text-gray-400">
        <Package className="w-6 h-6" />
      </div>
    );
  };

  // Fonction utilitaire pour obtenir le prix dans une boutique
  const getStorePrice = (product: Product, storeId: number) => {
    const storeProduct = product.store_products?.find(sp => {
      const spStoreId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store;
      return spStoreId === storeId;
    });
    return storeProduct?.store_base_price || 0;
  };

  // Fonction utilitaire pour obtenir la quantité dans une boutique
  const getStoreQuantity = (product: Product, storeId: number) => {
    const storeProduct = product.store_products?.find(sp => {
      const spStoreId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store;
      return spStoreId === storeId;
    });
    return storeProduct?.qt_item || 0;
  };

  // Fonction utilitaire pour obtenir le prix d'achat dans une boutique
  const getStoreCostPrice = (product: Product, storeId: number) => {
    const storeProduct = product.store_products?.find(sp => {
      const spStoreId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store;
      return spStoreId === storeId;
    });
    return storeProduct?.store_cost_price || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Chargement des produits...</p>
          <p className="text-gray-400 text-sm mt-2">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Gestion des Produits
              </h1>
              <p className="text-gray-600 mt-1">
                Gérez vos produits: ajoutez, modifiez, supprimez et consultez les détails.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-2 bg-blue-50 rounded-lg">
                <StoreIcon className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <div className="text-xs text-blue-700">Boutiques actives</div>
                  <div className="font-semibold text-blue-900">{stores.length}</div>
                </div>
              </div>
              <div className="flex items-center px-3 py-2 bg-green-50 rounded-lg">
                <Package className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <div className="text-xs text-green-700">Produits</div>
                  <div className="font-semibold text-green-900">{products.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm mb-6 p-6 border border-gray-200">
          {/* Search Bar */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 py-3 mb-6 max-w-md hover:border-blue-400 transition-colors">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Rechercher des produits par nom, SKU ou description..."
              className="w-full outline-none text-sm placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Filtres Boutiques */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrer par boutique
              </label>
              <select
                value={selectedStore}
                onChange={(e) => handleStoreChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white hover:border-gray-400 transition-colors"
              >
                <option value="all">Toutes les boutiques</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtres Statut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statut du produit
              </label>
              <select
                value={activeFilter}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'active' | 'out')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white hover:border-gray-400 transition-colors"
              >
                <option value="all">Tous les produits</option>
                <option value="active">Actifs seulement</option>
                <option value="out">En rupture</option>
              </select>
            </div>

            {/* Statistiques */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Résultats
              </label>
              <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Produits trouvés:</span>
                  <span className="font-semibold text-gray-900">{filteredProducts.length}</span>
                </div>
                {selectedStore !== 'all' && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">Dans cette boutique:</span>
                    <span className="text-xs font-medium text-blue-600">
                      {filteredProducts.filter(p => 
                        p.store_products?.some(sp => {
                          const spStoreId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store;
                          return spStoreId === selectedStore;
                        })
                      ).length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleCreateProduct}
              className="flex items-center bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="font-medium">Ajouter un Produit</span>
            </button>
            
            <button 
              onClick={handleRefresh}
              className="flex items-center bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-300 hover:border-gray-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span className="font-medium">Actualiser</span>
            </button>
            
            <button 
              onClick={handleExport}
              disabled={exportLoading || products.length === 0}
              className="flex items-center bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="font-medium">
                {exportLoading ? 'Export en cours...' : 'Exporter les produits'}
              </span>
            </button>
            
            {selectedStore !== 'all' && (
              <div className="ml-auto flex items-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <StoreIcon className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-700">
                  {stores.find(s => s.id === selectedStore)?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Products List */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Liste des Produits
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedStore === 'all' 
                      ? 'Toutes les boutiques' 
                      : stores.find(s => s.id === selectedStore)?.name}
                  </p>
                </div>
                <div className="flex items-center px-3 py-1 bg-gray-100 rounded-full">
                  <Package className="w-4 h-4 text-gray-600 mr-1.5" />
                  <span className="text-sm font-medium text-gray-700">
                    {filteredProducts.length}
                  </span>
                </div>
              </div>
              <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-gray-900 font-medium mb-2">
                      {searchTerm ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                      {searchTerm 
                        ? 'Essayez avec d\'autres termes de recherche'
                        : 'Commencez par créer votre premier produit'}
                    </p>
                    {!searchTerm && (
                      <button 
                        onClick={handleCreateProduct}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter un produit
                      </button>
                    )}
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className={`flex items-start p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 last:mb-0 ${
                        selectedProduct?.id === product.id 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-25 border-2 border-blue-200 shadow-sm' 
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex-shrink-0">
                        {getProductImage(product)}
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(product)}`}>
                                {getStatusText(product)}
                              </span>
                              <span className="text-xs text-gray-500 font-mono truncate">
                                {product.sku}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProduct(product);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Modifier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(product.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Informations des boutiques */}
                        {selectedStore !== 'all' ? (
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-sm">
                                <StoreIcon className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                <span className="font-medium text-gray-700">
                                  {formatCurrency(getStorePrice(product, selectedStore))}
                                </span>
                              </div>
                              <div className={`text-xs px-2 py-1 rounded ${
                                getStoreQuantity(product, selectedStore) > 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {getStoreQuantity(product, selectedStore)} unités
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-sm">
                                <StoreIcon className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                <span className="text-gray-700">
                                  {product.store_products?.length || 0} boutiques
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className={`text-xs px-2 py-1 rounded ${
                                  (product.qt_item || 0) > 10
                                    ? 'bg-green-100 text-green-800'
                                    : (product.qt_item || 0) > 0
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {product.qt_item || 0} en stock
                                </div>
                                {product.store_products && product.store_products.length > 0 && (
                                  <div className="flex items-center text-xs text-blue-600">
                                    <Euro className="w-3 h-3 mr-1" />
                                    {product.store_products.length} prix
                                  </div>
                                )}
                              </div>
                            </div>
                            {product.store_products && product.store_products.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {product.store_products.slice(0, 3).map(sp => {
                                  const storeId = (sp.store && typeof sp.store === 'object') ? sp.store.id : sp.store;
                                  const storeName = stores.find(s => s.id === storeId)?.name;
                                  
                                  return (
                                    <span 
                                      key={sp.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100"
                                    >
                                      <StoreIcon className="w-2.5 h-2.5 mr-1" />
                                      {storeName || 'Boutique'}: {formatCurrency(sp.store_base_price || 0)}
                                    </span>
                                  );
                                })}
                                {product.store_products.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{product.store_products.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="lg:w-2/3">
            {selectedProduct ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Product Header */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                    <div className="flex-shrink-0">
                      {selectedProduct.photo ? (
                        <img 
                          src={selectedProduct.photo} 
                          alt={selectedProduct.name}
                          className="w-28 h-28 object-cover rounded-xl border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-28 h-28 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl border-2 border-white shadow-sm flex items-center justify-center">
                          <Package className="w-12 h-12 text-blue-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 truncate">
                            {selectedProduct.name}
                          </h2>
                          <div className="flex items-center mt-2 space-x-3">
                            <span className="text-gray-500 font-mono text-sm">
                              {selectedProduct.sku}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(selectedProduct)}`}>
                              {getStatusText(selectedProduct)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditProduct(selectedProduct)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(selectedProduct.id)}
                            className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedProduct.category && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            <Tag className="w-3.5 h-3.5 mr-1.5" />
                            {selectedProduct.category.name}
                          </span>
                        )}
                        {selectedProduct.brand && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                            <Package className="w-3.5 h-3.5 mr-1.5" />
                            {selectedProduct.brand.name}
                          </span>
                        )}
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          {selectedProduct.type === 'simple' ? 'Produit simple' : 'Produit variable'}
                        </span>
                        {selectedProduct.supplier && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                            <Users className="w-3.5 h-3.5 mr-1.5" />
                            {selectedProduct.supplier.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <InfoIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Description du Produit
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {selectedProduct.description ? (
                      <div className="text-gray-700">
                        <div className="whitespace-pre-line text-sm leading-relaxed">
                          {selectedProduct.description}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                          <InfoIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-400 text-sm">
                          Aucune description disponible pour ce produit
                        </p>
                        <button 
                          onClick={() => handleEditProduct(selectedProduct)}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ajouter une description
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations détaillées */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Informations de base */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-blue-600" />
                        Informations de Base
                      </h3>
                      <div className="space-y-3">
                        <InfoRow label="Catégorie" value={selectedProduct.category?.name || 'Non spécifiée'} />
                        <InfoRow label="Marque" value={selectedProduct.brand?.name || 'Non spécifiée'} />
                        <InfoRow label="Fournisseur" value={selectedProduct.supplier?.name || 'Non spécifié'} />
                        <InfoRow 
                          label="Stock total" 
                          value={`${selectedProduct.qt_item || 0} unités`}
                          valueClass={selectedProduct.qt_item > 10 ? 'text-green-600' : selectedProduct.qt_item > 0 ? 'text-yellow-600' : 'text-red-600'}
                        />
                        <InfoRow label="Jour d'écart" value={`${selectedProduct.jour_ecart || 0} jours`} />
                        <InfoRow 
                          label="Statut" 
                          value={
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(selectedProduct)}`}>
                              {getStatusText(selectedProduct)}
                            </span>
                          }
                        />
                        <InfoRow label="Type" value={selectedProduct.type === 'simple' ? 'Produit simple' : 'Produit variable'} />
                      </div>
                    </div>

                    {/* Informations sur les boutiques */}
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <StoreIcon className="w-5 h-5 mr-2 text-green-600" />
                        Informations Boutiques
                      </h3>
                      <div className="space-y-3">
                        <InfoRow 
                          label="Nombre de boutiques" 
                          value={`${selectedProduct.store_products?.length || 0}`}
                        />
                        <InfoRow 
                          label="Prix moyen" 
                          value={
                            selectedProduct.store_products && selectedProduct.store_products.length > 0
                              ? formatCurrency(
                                  selectedProduct.store_products.reduce((sum, sp) => sum + (sp.store_base_price || 0), 0) / 
                                  selectedProduct.store_products.length
                                )
                              : 'Non configuré'
                          }
                        />
                        <InfoRow 
                          label="Stock distribué" 
                          value={
                            selectedProduct.store_products && selectedProduct.store_products.length > 0
                              ? `${selectedProduct.store_products.reduce((sum, sp) => sum + (sp.qt_item || 0), 0)} unités`
                              : '0 unités'
                          }
                        />
                        <InfoRow 
                          label="Boutique avec plus de stock" 
                          value={
                            selectedProduct.store_products && selectedProduct.store_products.length > 0
                              ? (() => {
                                  const maxStore = selectedProduct.store_products.reduce((max, sp) => 
                                    (sp.qt_item || 0) > (max.qt_item || 0) ? sp : max
                                  );
                                  const storeId = (maxStore.store && typeof maxStore.store === 'object') ? maxStore.store.id : maxStore.store;
                                  const storeName = stores.find(s => s.id === storeId)?.name;
                                  return `${storeName || 'Boutique'} (${maxStore.qt_item || 0} unités)`;
                                })()
                              : 'Non disponible'
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Store Products par boutique */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <StoreIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Store Products par Boutique
                    </h3>
                    <span className="text-sm text-gray-500">
                      {selectedProduct.store_products?.length || 0} boutiques
                    </span>
                  </div>
                  
                  {selectedProduct.store_products && selectedProduct.store_products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedProduct.store_products.map(storeProduct => {
                        const storeId = (storeProduct.store && typeof storeProduct.store === 'object') 
                          ? storeProduct.store.id 
                          : storeProduct.store as number;
                        const store = stores.find(s => s.id === storeId);
                        
                        const profitMargin = calculateProfitMargin(
                          storeProduct.store_base_price, 
                          storeProduct.store_cost_price || 0
                        );
                        
                        return (
                          <div key={storeProduct.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow bg-white">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mr-3 border border-blue-100">
                                  <StoreIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">
                                    {store?.name || `Boutique ${storeId}`}
                                  </h4>
                                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {store?.email || ''}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                storeProduct.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : storeProduct.status === 'out_of_stock'
                                  ? 'bg-red-100 text-red-800'
                                  : storeProduct.status === 'low_stock'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {storeProduct.status === 'active' ? 'Actif' :
                                 storeProduct.status === 'out_of_stock' ? 'Rupture' :
                                 storeProduct.status === 'low_stock' ? 'Stock bas' : 'Inactif'}
                              </span>
                            </div>
                            
                            <div className="space-y-2.5">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Prix de vente:</span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(storeProduct.store_base_price || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Prix d'achat:</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(storeProduct.store_cost_price || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Stock:</span>
                                <span className={`font-medium ${
                                  storeProduct.qt_item <= storeProduct.min_stock_threshold
                                    ? 'text-yellow-600'
                                    : storeProduct.qt_item === 0
                                    ? 'text-red-600'
                                    : 'text-green-600'
                                }`}>
                                  {storeProduct.qt_item || 0} / {storeProduct.reorder_quantity || 100}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Marge:</span>
                                <span className={`font-medium ${
                                  profitMargin > 30
                                    ? 'text-green-600'
                                    : profitMargin > 15
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}>
                                  {profitMargin.toFixed(2)}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Seuil min:</span>
                                <span className="font-medium text-gray-900">
                                  {storeProduct.min_stock_threshold || 10}
                                </span>
                              </div>
                            </div>
                            
                            {storeProduct.dlv && (
                              <div className="mt-4 pt-3 border-t border-gray-100">
                                <div className="text-xs text-gray-500 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1.5" />
                                  DLV: {new Date(storeProduct.dlv).toLocaleDateString('fr-FR')}
                                </div>
                                {storeProduct.dlc && (
                                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1.5" />
                                    DLC: {new Date(storeProduct.dlc).toLocaleDateString('fr-FR')}
                                  </div>
                                )}
                                {storeProduct.dcr && (
                                  <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <Calendar className="w-3 h-3 mr-1.5" />
                                    DCR: {new Date(storeProduct.dcr).toLocaleDateString('fr-FR')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <StoreIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-gray-900 font-medium mb-2">Aucun store product</h4>
                      <p className="text-gray-500 text-sm mb-4">
                        Ce produit n'est actuellement lié à aucune boutique via store_products
                      </p>
                      <button 
                        onClick={() => handleEditProduct(selectedProduct)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter à des boutiques
                      </button>
                    </div>
                  )}
                </div>

                {/* Métriques */}
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Métriques du Produit
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      icon={<BarChart className="w-5 h-5" />}
                      title="Prix moyen"
                      value={
                        selectedProduct.store_products && selectedProduct.store_products.length > 0
                          ? formatCurrency(
                              selectedProduct.store_products.reduce((sum, sp) => sum + (sp.store_base_price || 0), 0) / 
                              selectedProduct.store_products.length
                            )
                          : 'Non configuré'
                      }
                      color="blue"
                    />
                    
                    <MetricCard
                      icon={<Box className="w-5 h-5" />}
                      title="Stock total"
                      value={`${selectedProduct.qt_item || 0} unités`}
                      color="green"
                    />
                    
                    <MetricCard
                      icon={<Percent className="w-5 h-5" />}
                      title="Marge moyenne"
                      value={
                        selectedProduct.store_products && selectedProduct.store_products.length > 0 
                          ? `${(
                              selectedProduct.store_products.reduce((sum, sp) => {
                                const margin = calculateProfitMargin(
                                  sp.store_base_price || 0, 
                                  sp.store_cost_price || 0
                                );
                                return sum + margin;
                              }, 0) / selectedProduct.store_products.length
                            ).toFixed(2)}%`
                          : '0%'
                      }
                      color="purple"
                    />
                    
                    <MetricCard
                      icon={<StoreIcon className="w-5 h-5" />}
                      title="Boutiques"
                      value={`${selectedProduct.store_products?.length || 0}`}
                      color="amber"
                    />
                  </div>
                </div>

                {/* Variantes */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Layers className="w-5 h-5 mr-2 text-blue-600" />
                      Variantes
                    </h3>
                    <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium">
                      <Plus className="w-4 h-4 mr-1.5" />
                      Ajouter une variante
                    </button>
                  </div>
                  
                  {variantsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                      <p className="text-gray-500">Chargement des variantes...</p>
                    </div>
                  ) : variants.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Code barre
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Nom
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Prix d'achat
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Prix de vente
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Boutiques
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {variants.map((variant) => (
                            <tr key={variant.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {variant.barcode || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {variant.name || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {variant.prix_achat ? formatCurrency(variant.prix_achat) : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {variant.prix_vente ? formatCurrency(variant.prix_vente) : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {variant.store_products && variant.store_products.length > 0 ? (
                                  <div className="flex items-center">
                                    <StoreIcon className="w-4 h-4 text-gray-400 mr-1.5" />
                                    <span className="text-gray-700">
                                      {variant.store_products.length}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div className="flex items-center space-x-2">
                                  <button 
                                    className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded"
                                    title="Modifier"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <Layers className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-gray-900 font-medium mb-2">Aucune variante</h4>
                      <p className="text-gray-500 text-sm mb-4">
                        Ce produit n'a pas encore de variantes
                      </p>
                      <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une variante
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-4">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit sélectionné</h3>
                <p className="text-gray-500 mb-6">Sélectionnez un produit dans la liste pour voir ses détails</p>
                {products.length === 0 && (
                  <button 
                    onClick={handleCreateProduct}
                    className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Créer votre premier produit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} GestPro Complet. Tous droits réservés.</p>
            <div className="mt-2 md:mt-0 flex items-center justify-center space-x-4">
              <span className="flex items-center">
                <Package className="w-3 h-3 mr-1.5" />
                {products.length} produits
              </span>
              <span className="flex items-center">
                <StoreIcon className="w-3 h-3 mr-1.5" />
                {stores.length} boutiques actives
              </span>
              <span className="flex items-center">
                <Users className="w-3 h-3 mr-1.5" />
                {suppliers.length} fournisseurs
              </span>
            </div>
          </div>
        </div>

        {/* Modale pour créer/modifier un produit */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveProduct}
          product={editingProduct}
          categories={categories}
          brands={brands}
          suppliers={suppliers}
          stores={stores}
        />
      </div>
    </div>
  );
};

// Composants utilitaires
const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}> = ({ label, value, valueClass = 'text-gray-900' }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600">{label}</span>
    <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}> = ({ icon, title, value, color }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600' },
  };

  return (
    <div className={`${colors[color].bg} rounded-lg p-4 border ${colors[color].border}`}>
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colors[color].bg} mr-3`}>
          <div className={colors[color].icon}>{icon}</div>
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Products;