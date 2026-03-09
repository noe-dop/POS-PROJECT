import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, Edit, Trash2, Package, 
  Tag, AlertTriangle, Download, RefreshCw, 
  Image as ImageIcon, X, Check, Upload, Camera, Euro
} from 'lucide-react';
import productService from '../services/productService';
import { 
  Product, 
  ProductCategory, 
  ProductBrand, 
  ProductFormData,
  Supplier
} from '../types/product';

// Composant Modal pour créer/modifier un produit
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: ProductFormData | FormData) => Promise<void>;
  product?: Product | null;
  categories: ProductCategory[];
  brands: ProductBrand[];
  suppliers: Supplier[];
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
  brands,
  suppliers
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    description: '',
    category_id: 0,
    supplier_id: 0,
    brand_id: 0,
    cost_price: 0,
    base_price: 0,
    compare_at_price: 0,
    qt_item: 0,
    jour_ecart: 0,
    status: 'draft',
    photo: undefined,
    type: 'simple'
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

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
      setFormData({
        name: product.name,
        sku: product.sku || '',
        description: product.description || '',
        category_id: product.category?.id || 0,
        supplier_id: product.supplier?.id || 0,
        brand_id: product.brand?.id || 0,
        cost_price: product.cost_price || 0,
        base_price: product.base_price || 0,
        compare_at_price: product.compare_at_price || 0,
        qt_item: product.qt_item || 0,
        jour_ecart: product.jour_ecart || 0,
        status: product.status || 'draft',
        photo: undefined,
        type: product.type || 'simple'
      });
      setImagePreview(product.photo || null);
      setImageFile(null);
    } else if (isOpen) {
      // Générer un SKU aléatoire par défaut
      const randomSku = `PRD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      setFormData({
        name: '',
        sku: randomSku,
        description: '',
        category_id: categories[0]?.id || 0,
        supplier_id: suppliers[0]?.id || 0,
        brand_id: brands[0]?.id || 0,
        cost_price: 0,
        base_price: 0,
        compare_at_price: 0,
        qt_item: 0,
        jour_ecart: 0,
        status: 'draft',
        photo: undefined,
        type: 'simple'
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [product, categories, brands, suppliers, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let processedValue: any = value;
    
    if (name.includes('_price') || name.includes('_item') || name.includes('_ecart')) {
      processedValue = value === '' ? 0 : parseFloat(value) || 0;
    } else if (name === 'category_id' || name === 'supplier_id' || name === 'brand_id') {
      processedValue = value === '' ? 0 : parseInt(value) || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner un fichier image valide');
        return;
      }
      
      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Créer une URL pour l'aperçu
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Mettre à jour le formData avec le fichier
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Le nom du produit est requis');
    }
    
    if (!formData.sku.trim()) {
      errors.push('Le SKU est requis');
    }
    
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      // Créer FormData si une image est incluse
      let productDataToSend: ProductFormData | FormData;
      
      if (imageFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('sku', formData.sku);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('category_id', formData.category_id.toString());
        formDataToSend.append('supplier_id', formData.supplier_id.toString());
        formDataToSend.append('brand_id', formData.brand_id.toString());
        formDataToSend.append('cost_price', formData.cost_price.toString());
        formDataToSend.append('base_price', formData.base_price.toString());
        formDataToSend.append('compare_at_price', formData.compare_at_price.toString());
        formDataToSend.append('qt_item', formData.qt_item.toString());
        formDataToSend.append('jour_ecart', formData.jour_ecart.toString());
        formDataToSend.append('status', formData.status);
        formDataToSend.append('type', formData.type);
        formDataToSend.append('photo', imageFile);
        
        productDataToSend = formDataToSend;
      } else {
        productDataToSend = formData;
      }
      
      await onSave(productDataToSend);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du produit');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section Image du produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Image du produit
            </label>
            <div className="flex flex-col items-center">
              {/* Aperçu de l'image */}
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
                  <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                    <Camera className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Aucune image</span>
                  </div>
                )}
              </div>
              
              {/* Bouton de téléchargement */}
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

          {/* Nom de produit */}
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

          {/* SKU */}
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

          {/* Type de produit */}
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
              <option value="">Sélectionnez un type</option>
              <option value="simple">Simple</option>
              <option value="variable">Variable</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              name="category_id"
              value={formData.category_id}
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

          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm bg-white"
            >
              <option value="">Sélectionnez un fournisseur</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prix d'achat et Nombre item */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix d'achat (€)
              </label>
              <input
                type="number"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="2500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre item
              </label>
              <input
                type="number"
                name="qt_item"
                value={formData.qt_item}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="10"
              />
            </div>
          </div>

          {/* Prix de vente et Prix de comparaison */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix de vente (€)
              </label>
              <input
                type="number"
                name="base_price"
                value={formData.base_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="49.99"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix de comparaison (€)
              </label>
              <input
                type="number"
                name="compare_at_price"
                value={formData.compare_at_price}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
                placeholder="59.99"
              />
            </div>
          </div>

          {/* Marque */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marque
            </label>
            <div className="space-y-1 border border-gray-300 rounded-md p-2 max-h-40 overflow-y-auto">
              {brands.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">Aucune marque disponible</p>
              ) : (
                <>
                  <label className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-50 rounded">
                    <input
                      type="radio"
                      name="brand_id"
                      value={0}
                      checked={formData.brand_id === 0}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {formData.brand_id === 0 ? '✓ Aucune marque' : 'Aucune marque'}
                    </span>
                  </label>
                  {brands.map((brand) => (
                    <label 
                      key={brand.id} 
                      className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-50 rounded"
                    >
                      <input
                        type="radio"
                        name="brand_id"
                        value={brand.id}
                        checked={formData.brand_id === brand.id}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {formData.brand_id === brand.id ? `✓ ${brand.name}` : brand.name}
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Jour d'écart */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jour d'ecart
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm resize-none"
              placeholder="Entrez la description du produit"
            />
          </div>

          {/* Statut */}
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
              <option value="out_of_stock">En rupture</option>
            </select>
          </div>

          {/* Boutons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sauvegarde...' : product ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Interface pour les variantes de produit
interface ProductVariant {
  barcode: string;
  description: string;
  quantity: number;
  price1: number;
  price2: number;
  comparePrice: number;
  hasAction: boolean;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  
  // Données pour les variantes
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      barcode: '186000124558',
      description: 'Bonnet rouge sachet',
      quantity: 1,
      price1: 100,
      price2: 90,
      comparePrice: 125,
      hasAction: true
    },
    {
      barcode: '186000124999',
      description: 'Bonnet rouge sachet x11',
      quantity: 11,
      price1: 1000,
      price2: 950,
      comparePrice: 0,
      hasAction: false
    }
  ]);

  // Chargement des données initiales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtrage des produits
  useEffect(() => {
    applyFilters();
  }, [products, activeFilter, searchTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les données via l'API
      const [productsData, categoriesData, brandsData, suppliersData] = await Promise.all([
        productService.getAllProducts().catch(error => {
          console.error('Erreur produits:', error);
          return [];
        }),
        productService.getAllCategories().catch(error => {
          console.error('Erreur catégories:', error);
          return [];
        }),
        productService.getAllBrands().catch(error => {
          console.error('Erreur marques:', error);
          return [];
        }),
        productService.getAllSuppliers().catch(error => {
          console.error('Erreur fournisseurs:', error);
          return [];
        })
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setBrands(brandsData);
      setSuppliers(suppliersData);
      
      if (productsData.length > 0) {
        setSelectedProduct(productsData[0]);
      } else {
        setSelectedProduct(null);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      alert('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        filtered = filtered.filter(product => product.status === 'active');
      } else if (activeFilter === 'out') {
        filtered = filtered.filter(product => 
          product.status === 'out_of_stock' || 
          (product.stocks?.[0]?.quantity_available || 0) === 0
        );
      }
    }

    setFilteredProducts(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'out') => {
    setActiveFilter(filter);
  };

  // Gestionnaires pour la modale
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (productData: ProductFormData | FormData) => {
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, productData);
      } else {
        await productService.createProduct(productData);
      }
      
      // Recharger les données après sauvegarde
      await loadInitialData();
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du produit:', error);
      throw error;
    }
  };

  const handleRefresh = () => {
    loadInitialData();
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      const blob = await productService.exportProducts({});
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `produits_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export des produits');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        await productService.deleteProduct(productId);
        await loadInitialData();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du produit');
      }
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const getStatusText = (product: Product) => {
    if (product.status === 'out_of_stock' || (product.stocks?.[0]?.quantity_available || 0) === 0) {
      return 'En rupture';
    }
    return 'Actif';
  };

  const getStatusClass = (product: Product) => {
    if (product.status === 'out_of_stock' || (product.stocks?.[0]?.quantity_available || 0) === 0) {
      return 'status-out';
    }
    return 'status-active';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getProductImage = (product: Product) => {
    if (product.photo) {
      return (
        <img 
          src={product.photo} 
          alt={product.name}
          className="h-12 w-12 rounded-md object-cover"
        />
      );
    }
    return (
      <div className="h-12 w-12 bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs">
        <ImageIcon className="w-6 h-6" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Gestion des Produits
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez vos produits: ajoutez, modifiez, supprimez et consultez les détails.
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          {/* Search Bar */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-4 py-2 mb-4 max-w-md">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Rechercher des produits..."
              className="w-full outline-none text-sm"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-4 mb-4">
            <button
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleFilterChange('all')}
            >
              Tous
            </button>
            <button
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                activeFilter === 'active' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleFilterChange('active')}
            >
              Actif
            </button>
            <button
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                activeFilter === 'out' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleFilterChange('out')}
            >
              Rupture
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleCreateProduct}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Produit
            </button>
            
            <button 
              onClick={handleRefresh}
              className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </button>
            
            <button 
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {exportLoading ? 'Export...' : 'Exporter'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Products List */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-medium text-gray-900">
                  Produits ({filteredProducts.length})
                </h3>
                <span className="text-sm text-gray-500">
                  {filteredProducts.length} produits
                </span>
              </div>
              <div className="p-4 space-y-3">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {searchTerm ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                    </p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      {getProductImage(product)}
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {product.name}
                        </div>
                        <div className="flex items-center mt-1">
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            getStatusClass(product) === 'status-active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {getStatusText(product)}
                          </span>
                          <span className="ml-2 text-xs text-gray-500 font-mono">
                            {product.sku}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.base_price || 0)}
                          </span>
                          
                          {/* Statut de stock au lieu du bouton supprimer */}
                          <div className="flex items-center">
                            <div className={`text-xs px-2 py-1 rounded ${
                              product.qt_item > 10 
                                ? 'bg-green-100 text-green-800'
                                : product.qt_item > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.qt_item || 0} en stock
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProduct(product);
                              }}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Product Header */}
                <div className="flex items-start gap-6 mb-8 pb-6 border-b">
                  {selectedProduct.photo ? (
                    <img 
                      src={selectedProduct.photo} 
                      alt={selectedProduct.name}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center text-gray-500">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {selectedProduct.name}
                        </h2>
                        <div className="text-gray-500 font-mono text-sm mt-1">
                          {selectedProduct.sku}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(selectedProduct)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          <Edit className="w-4 h-4 inline mr-1" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(selectedProduct.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                        >
                          <Trash2 className="w-4 h-4 inline mr-1" />
                          Supprimer
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-3">
                      {selectedProduct.category && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Tag className="w-3 h-3 mr-1" />
                          {selectedProduct.category.name}
                        </span>
                      )}
                      {selectedProduct.brand && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Package className="w-3 h-3 mr-1" />
                          {selectedProduct.brand.name}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        getStatusClass(selectedProduct) === 'status-active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {getStatusText(selectedProduct)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-600">
                    {selectedProduct.description || "Aucune description disponible."}
                  </p>
                </div>

                {/* Pricing & Inventory */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Pricing */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tarification</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-500">Prix de vente:</div>
                        <div className="text-lg font-medium text-gray-900">
                          {formatCurrency(selectedProduct.base_price || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Coût par article:</div>
                        <div className="text-lg font-medium text-gray-900">
                          {formatCurrency(selectedProduct.cost_price || 0)}
                        </div>
                      </div>
                      {selectedProduct.compare_at_price && selectedProduct.compare_at_price > 0 && (
                        <div>
                          <div className="text-sm text-gray-500">Prix de comparaison:</div>
                          <div className="text-lg font-medium text-gray-500 line-through">
                            {formatCurrency(selectedProduct.compare_at_price)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inventory */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventaire</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-500">Stock actuel:</div>
                        <div className="text-lg font-medium text-gray-900">
                          {selectedProduct.qt_item || 0} unités
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Statut:</div>
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${
                            getStatusClass(selectedProduct) === 'status-active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {getStatusText(selectedProduct)}
                          </span>
                        </div>
                      </div>
                      {selectedProduct.jour_ecart > 0 && (
                        <div>
                          <div className="text-sm text-gray-500">Jour d'écart:</div>
                          <div className="text-lg font-medium text-gray-900">
                            {selectedProduct.jour_ecart} jours
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Type et Catégorie */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-500">Type de produit:</div>
                        <div className="text-lg font-medium text-gray-900">
                          {selectedProduct.type === 'simple' ? 'Simple' : 
                           selectedProduct.type === 'variable' ? 'Variable' : 
                           selectedProduct.type === 'digital' ? 'Digital' : 'Simple'}
                        </div>
                      </div>
                      {selectedProduct.supplier && (
                        <div>
                          <div className="text-sm text-gray-500">Fournisseur:</div>
                          <div className="text-lg font-medium text-gray-900">
                            {selectedProduct.supplier.name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates</h3>
                    <div className="space-y-3">
                      {selectedProduct.created_at && (
                        <div>
                          <div className="text-sm text-gray-500">Date de création:</div>
                          <div className="text-lg font-medium text-gray-900">
                            {new Date(selectedProduct.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      )}
                      {selectedProduct.updated_at && (
                        <div>
                          <div className="text-sm text-gray-500">Dernière mise à jour:</div>
                          <div className="text-lg font-medium text-gray-900">
                            {new Date(selectedProduct.updated_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Variants Table */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Variantes</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      + Ajouter une variante
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Code barre
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantité
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prix vente 1
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prix vente 2
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prix de comparaison
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {variants.map((variant, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {variant.barcode}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {variant.description}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {variant.quantity}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {variant.price1} €
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {variant.price2} €
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {variant.comparePrice > 0 ? `${variant.comparePrice} €` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {variant.hasAction ? (
                                <div className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center">
                                  <Check className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 border border-gray-300 rounded"></div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun produit sélectionné</h3>
                <p className="text-gray-500">Sélectionnez un produit dans la liste pour voir ses détails</p>
                {products.length === 0 && (
                  <button 
                    onClick={handleCreateProduct}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Créer votre premier produit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-gray-500 text-sm">
          <p>© 2025 GestPro Complet. Tous droits réservés.</p>
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
        />
      </div>
    </div>
  );
};

export default Products;