// src/hooks/useProducts.ts
import { useState, useEffect, useCallback } from 'react';
import { Product, ProductCategory, ProductBrand, Supplier, ProductVariant, ProductStats, ProductFormData } from '../types/product';
import productService from '../services/productService';

export const useProducts = () => {
  // États des données
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    total_products: 0,
    active_products: 0,
    low_stock_products: 0,
    out_of_stock_products: 0,
    average_margin: 0,
    total_inventory_value: 0
  });

  // États UI
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'out'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Charger les produits
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setStatsLoading(true);
      
      const [productsData, categoriesData, brandsData, suppliersData, statsData] = await Promise.all([
        productService.getAllProducts(),
        productService.getAllCategories(),
        productService.getAllBrands(),
        productService.getAllSuppliers(),
        productService.getProductStats()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setBrands(brandsData);
      setSuppliers(suppliersData);
      setStats(statsData);
      
      if (productsData.length > 0 && !selectedProduct) {
        setSelectedProduct(productsData[0]);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [selectedProduct]);

  // Charger les variantes d'un produit
  const loadProductVariants = useCallback(async (productId: number) => {
    try {
      const variantsData = await productService.getProductVariants(productId);
      setVariants(variantsData);
    } catch (error) {
      console.error('Erreur lors du chargement des variantes:', error);
      setVariants([]);
    }
  }, []);

  // Filtrer les produits
  useEffect(() => {
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
  }, [products, activeFilter, searchTerm]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (filter: 'all' | 'active' | 'out') => {
    setActiveFilter(filter);
  };

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

  const handleSaveProduct = async (productData: ProductFormData) => {
    try {
      let savedProduct: Product;
      
      if (editingProduct) {
        savedProduct = await productService.updateProduct(editingProduct.id, productData);
      } else {
        savedProduct = await productService.createProduct(productData);
      }
      
      await loadProducts();
      
      if (!editingProduct) {
        setSelectedProduct(savedProduct);
      }
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du produit:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    await loadProducts();
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      const exportFilters = {
        search: searchTerm,
        ...(activeFilter === 'active' && { status: 'active' }),
        ...(activeFilter === 'out' && { low_stock: true })
      };
      
      const blob = await productService.exportProducts(exportFilters);
      
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
        await loadProducts();
        
        if (selectedProduct?.id === productId && products.length > 1) {
          const remainingProducts = products.filter(p => p.id !== productId);
          if (remainingProducts.length > 0) {
            setSelectedProduct(remainingProducts[0]);
          } else {
            setSelectedProduct(null);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du produit');
      }
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleStatusChange = async (productId: number, newStatus: 'draft' | 'active' | 'archived') => {
    try {
      await productService.updateProductStatus(productId, newStatus);
      await loadProducts();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleAdjustStock = async (productId: number, quantity: number) => {
    try {
      await productService.adjustStock(productId, quantity, 'adjustment', 'Ajustement manuel');
      await loadProducts();
    } catch (error) {
      console.error('Erreur lors de l\'ajustement du stock:', error);
      alert('Erreur lors de l\'ajustement du stock');
    }
  };

  return {
    // États
    products,
    filteredProducts,
    categories,
    brands,
    suppliers,
    selectedProduct,
    variants,
    loading,
    exportLoading,
    statsLoading,
    stats,
    activeFilter,
    searchTerm,
    isModalOpen,
    editingProduct,
    
    // Méthodes
    loadProducts,
    loadProductVariants,
    handleSearch,
    handleFilterChange,
    handleCreateProduct,
    handleEditProduct,
    handleCloseModal,
    handleSaveProduct,
    handleRefresh,
    handleExport,
    handleDeleteProduct,
    handleSelectProduct,
    handleStatusChange,
    handleAdjustStock
  };
};