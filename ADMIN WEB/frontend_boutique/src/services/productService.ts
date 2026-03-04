// src/services/productService.ts
import { 
  Product, 
  ProductCategory, 
  ProductBrand, 
  ProductStats, 
  ProductFilter,
  ProductFormData,
  Supplier,
  ProductVariant,
  Stock,
  ImportResult,
  PaginatedResponse,
  Store,
  StoreProduct
} from '../types/product';
import { api } from './api';

class ProductService {
  // === MÉTHODES DE BASE POUR LES PRODUITS ===

  // Récupérer tous les produits avec filtres optionnels
  async getAllProducts(filters?: ProductFilter): Promise<Product[]> {
    try {
      console.log('🔄 Chargement des produits...');
      const params: Record<string, any> = {};
      
      if (filters?.search) params.search = filters.search;
      if (filters?.category && filters.category !== 'all') params.category = filters.category;
      if (filters?.brand && filters.brand !== 'all') params.brand = filters.brand;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.low_stock) params.low_stock = true;
      if (filters?.store) params.store = filters.store;
      if (filters?.page) params.page = filters.page;
      if (filters?.page_size) params.page_size = filters.page_size;
      if (filters?.ordering) params.ordering = filters.ordering;

      const response = await api.getFullResponse<Product[] | PaginatedResponse<Product>>('/products/', { params });
      
      console.log('📊 Réponse API produits:', {
        status: response.status,
        dataType: typeof response.data,
        data: response.data
      });

      // Gestion des différents formats de réponse
      let products: Product[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Format simple : tableau direct
          products = response.data;
          console.log(`✅ ${products.length} produits chargés (format tableau)`);
        } else if (response.data.results && Array.isArray(response.data.results)) {
          // Format paginé Django
          products = response.data.results;
          console.log(`✅ ${products.length} produits chargés (format paginé)`);
        } else if (typeof response.data === 'object') {
          // Autre format d'objet
          products = [response.data as unknown as Product];
          console.log(`✅ 1 produit chargé (format objet)`);
        }
      }

      // Normaliser les données
      const normalizedProducts = products.map(product => this.normalizeProduct(product));
      
      console.log('📋 Premier produit normalisé:', normalizedProducts[0]);
      console.log('📋 Catégorie du premier produit:', normalizedProducts[0]?.category);
      console.log('📋 Marque du premier produit:', normalizedProducts[0]?.brand);
      console.log('📋 Fournisseur du premier produit:', normalizedProducts[0]?.supplier);
      
      return normalizedProducts;
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits:', error);
      return [];
    }
  }

  // Normaliser un produit pour garantir la structure
  private normalizeProduct(product: any): Product {
    return {
      id: product.id || 0,
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      cost_price: product.cost_price ? parseFloat(product.cost_price) : 0,
      base_price: product.base_price ? parseFloat(product.base_price) : 0,
      compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : 0,
      qt_item: product.qt_item || 0,
      jour_ecart: product.jour_ecart || 0,
      status: product.status || (product.is_active ? 'active' : 'draft'),
      type: product.type || 'simple',
      photo: product.photo || null,
      created_at: product.created_at || '',
      updated_at: product.updated_at || '',
      is_active: product.is_active !== undefined ? product.is_active : true,
      
      // Normaliser la catégorie
      category: product.category ? {
        id: product.category.id || product.category,
        name: product.category.name || 'Catégorie',
        description: product.category.description || '',
        is_active: product.category.is_active !== undefined ? product.category.is_active : true
      } : null,
      
      // Normaliser la marque
      brand: product.brand ? {
        id: product.brand.id || product.brand,
        name: product.brand.name || 'Marque',
        description: product.brand.description || '',
        is_active: product.brand.is_active !== undefined ? product.brand.is_active : true
      } : null,
      
      // Normaliser le fournisseur
      supplier: product.supplier ? {
        id: product.supplier.id || product.supplier,
        name: product.supplier.name || 'Fournisseur',
        store_name: product.supplier.store_name || '',
        email: product.supplier.email || '',
        phone: product.supplier.phone || '',
        is_active: product.supplier.is_active !== undefined ? product.supplier.is_active : true
      } : null,
      
      // Normaliser les produits par boutique
      store_products: product.store_products ? 
        (Array.isArray(product.store_products) ? 
          product.store_products.map((sp: any) => this.normalizeStoreProduct(sp)) : 
          [this.normalizeStoreProduct(product.store_products)]) : 
        []
    };
  }

  // Normaliser un produit de boutique
  private normalizeStoreProduct(storeProduct: any): StoreProduct {
    return {
      id: storeProduct.id || 0,
      store: storeProduct.store ? {
        id: storeProduct.store.id || storeProduct.store,
        name: storeProduct.store.name || 'Boutique',
        email: storeProduct.store.email || '',
        phone: storeProduct.store.phone || '',
        address: storeProduct.store.address || '',
        is_active: storeProduct.store.is_active !== undefined ? storeProduct.store.is_active : true
      } : { id: 0, name: 'Boutique', email: '', phone: '', address: '', is_active: true },
      
      store_base_price: storeProduct.store_base_price ? parseFloat(storeProduct.store_base_price) : 0,
      store_cost_price: storeProduct.store_cost_price ? parseFloat(storeProduct.store_cost_price) : 0,
      store_compare_at_price: storeProduct.store_compare_at_price ? parseFloat(storeProduct.store_compare_at_price) : 0,
      qt_item: storeProduct.qt_item || storeProduct.quantity || 0,
      min_stock_threshold: storeProduct.min_stock_threshold || 10,
      reorder_quantity: storeProduct.reorder_quantity || 100,
      jour_ecart: storeProduct.jour_ecart || 0,
      status: storeProduct.status || 'draft',
      is_active: storeProduct.is_active !== undefined ? storeProduct.is_active : true,
      display_order: storeProduct.display_order || 0,
      dlv: storeProduct.dlv || '',
      dlc: storeProduct.dlc || '',
      dcr: storeProduct.dcr || '',
      created_at: storeProduct.created_at || '',
      updated_at: storeProduct.updated_at || ''
    };
  }

  // Récupérer un produit par son ID
  async getProductById(id: number): Promise<Product | null> {
    try {
      console.log(`🔄 Chargement du produit ${id}...`);
      const product = await api.get<Product>(`/products/${id}/`);
      console.log(`✅ Produit ${id} chargé:`, product);
      return this.normalizeProduct(product);
    } catch (error) {
      console.error(`❌ Erreur lors du chargement du produit ${id}:`, error);
      return null;
    }
  }

  // Créer un nouveau produit
  async createProduct(productData: any): Promise<Product> {
    try {
      console.log('🔄 Création produit - Type:', productData instanceof FormData ? 'FormData' : 'Object');
      
      let dataToSend: any;
      
      if (productData instanceof FormData) {
        dataToSend = productData;
      } else {
        const formData = productData as ProductFormData;
        
        console.log('📋 Données produit brutes:', formData);
        
        // Validation
        if (!formData.name?.trim()) {
          throw new Error('Le nom du produit est requis');
        }
        if (!formData.category) {
          throw new Error('La catégorie est requise');
        }
        
        // Construction des données selon le format de votre API
        dataToSend = {
          name: formData.name,
          sku: formData.sku || '',
          description: formData.description || '',
          category: formData.category,
          cost_price: formData.cost_price?.toString() || '0',
          base_price: formData.base_price?.toString() || '0',
          compare_at_price: formData.compare_at_price?.toString() || '0',
          qt_item: formData.qt_item || 0,
          jour_ecart: formData.jour_ecart || 0,
          status: formData.status || 'draft',
          is_active: formData.is_active !== undefined ? formData.is_active : false,
          metadata: formData.metadata || {},
          additional_images: formData.additional_images || {},
          search_vector: ''
        };
        
        // Champs optionnels
        if (formData.brand && formData.brand > 0) {
          dataToSend.brand = formData.brand;
        }
        
        // Gestion du fournisseur
        if (formData.supplier && formData.supplier > 0) {
          dataToSend.supplier = formData.supplier;
        }
        
        // Type de produit
        if (formData.type) {
          dataToSend.type = formData.type;
        }
        
        // Gestion des produits par boutique
        if (formData.store_products && formData.store_products.length > 0) {
          dataToSend.store_products = formData.store_products.map(sp => ({
            store: sp.store,
            store_base_price: (sp.store_base_price || 0).toString(),
            store_cost_price: (sp.store_cost_price || 0).toString(),
            store_compare_at_price: (sp.store_compare_at_price || 0).toString(),
            qt_item: sp.qt_item || 0,
            min_stock_threshold: sp.min_stock_threshold || 10,
            reorder_quantity: sp.reorder_quantity || 100,
            jour_ecart: sp.jour_ecart || 0,
            status: sp.status || 'draft',
            is_active: sp.is_active !== undefined ? sp.is_active : true,
            display_order: sp.display_order || 0,
            dlv: sp.dlv || new Date().toISOString().split('T')[0],
            dlc: sp.dlc || new Date().toISOString().split('T')[0],
            dcr: sp.dcr || new Date().toISOString().split('T')[0]
          }));
        }
        
        console.log('📤 Données finales pour API:', dataToSend);
      }
      
      const product = await api.post<Product>('/products/', dataToSend);
      console.log('✅ Produit créé avec succès:', product);
      return this.normalizeProduct(product);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la création du produit:', error);
      
      if (error.response?.data) {
        console.error('📋 Détails erreur API:', error.response.data);
        const errorMessage = this.extractErrorMessage(error.response.data);
        throw new Error(errorMessage);
      }
      
      throw new Error(error.message || 'Impossible de créer le produit');
    }
  }

  // Mettre à jour un produit
  async updateProduct(productId: number, productData: any): Promise<Product> {
    try {
      console.log(`🔄 Mise à jour produit ${productId}`);
      
      let dataToSend: any;
      
      if (productData instanceof FormData) {
        dataToSend = productData;
      } else {
        const formData = productData as ProductFormData;
        
        dataToSend = {};
        
        // Champs obligatoires et optionnels
        if (formData.name !== undefined) dataToSend.name = formData.name;
        if (formData.description !== undefined) dataToSend.description = formData.description;
        if (formData.sku !== undefined) dataToSend.sku = formData.sku;
        if (formData.category !== undefined) dataToSend.category = formData.category;
        
        if (formData.cost_price !== undefined) dataToSend.cost_price = formData.cost_price.toString();
        if (formData.base_price !== undefined) dataToSend.base_price = formData.base_price.toString();
        if (formData.compare_at_price !== undefined) dataToSend.compare_at_price = formData.compare_at_price.toString();
        
        if (formData.qt_item !== undefined) dataToSend.qt_item = formData.qt_item;
        if (formData.jour_ecart !== undefined) dataToSend.jour_ecart = formData.jour_ecart;
        if (formData.status !== undefined) dataToSend.status = formData.status;
        if (formData.type !== undefined) dataToSend.type = formData.type;
        if (formData.is_active !== undefined) dataToSend.is_active = formData.is_active;
        
        if (formData.brand !== undefined) {
          dataToSend.brand = formData.brand > 0 ? formData.brand : null;
        }
        
        // Gestion du fournisseur
        if (formData.supplier !== undefined) {
          dataToSend.supplier = formData.supplier > 0 ? formData.supplier : null;
        }
        
        // Métadata et images
        if (formData.metadata !== undefined) dataToSend.metadata = formData.metadata;
        if (formData.additional_images !== undefined) dataToSend.additional_images = formData.additional_images;
        
        // Gestion des produits par boutique
        if (formData.store_products !== undefined) {
          dataToSend.store_products = formData.store_products.map(sp => ({
            store: sp.store,
            store_base_price: (sp.store_base_price || 0).toString(),
            store_cost_price: (sp.store_cost_price || 0).toString(),
            store_compare_at_price: (sp.store_compare_at_price || 0).toString(),
            qt_item: sp.qt_item || 0,
            min_stock_threshold: sp.min_stock_threshold || 10,
            reorder_quantity: sp.reorder_quantity || 100,
            jour_ecart: sp.jour_ecart || 0,
            status: sp.status || 'draft',
            is_active: sp.is_active !== undefined ? sp.is_active : true,
            display_order: sp.display_order || 0,
            dlv: sp.dlv || new Date().toISOString().split('T')[0],
            dlc: sp.dlc || new Date().toISOString().split('T')[0],
            dcr: sp.dcr || new Date().toISOString().split('T')[0]
          }));
        }
        
        console.log('📤 Données de mise à jour:', dataToSend);
      }
      
      const product = await api.patch<Product>(`/products/${productId}/`, dataToSend);
      console.log('✅ Produit mis à jour:', product);
      return this.normalizeProduct(product);
      
    } catch (error: any) {
      console.error(`❌ Erreur lors de la mise à jour du produit ${productId}:`, error);
      
      if (error.response?.data) {
        console.error('📋 Détails erreur API:', error.response.data);
        const errorMessage = this.extractErrorMessage(error.response.data);
        throw new Error(errorMessage);
      }
      
      throw new Error(error.message || 'Impossible de mettre à jour le produit');
    }
  }

  // Supprimer un produit
  async deleteProduct(productId: number): Promise<void> {
    try {
      await api.delete(`/products/${productId}/`);
      console.log(`✅ Produit ${productId} supprimé`);
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression du produit ${productId}:`, error);
      throw new Error('Impossible de supprimer le produit');
    }
  }

  // === CATÉGORIES, MARQUES ET FOURNISSEURS ===

  // Récupérer toutes les catégories
  async getAllCategories(): Promise<ProductCategory[]> {
    try {
      console.log('🔄 Chargement des catégories...');
      const response = await api.getFullResponse<ProductCategory[] | PaginatedResponse<ProductCategory>>('/categories/');
      
      let categories: ProductCategory[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          categories = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          categories = response.data.results;
        }
      }
      
      console.log(`✅ ${categories.length} catégories chargées`);
      return categories.map(category => ({
        id: category.id || 0,
        name: category.name || 'Catégorie',
        description: category.description || '',
        is_active: category.is_active !== undefined ? category.is_active : true
      }));
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des catégories:', error);
      return [];
    }
  }

  // Récupérer toutes les marques
  async getAllBrands(): Promise<ProductBrand[]> {
    try {
      console.log('🔄 Chargement des marques...');
      const response = await api.getFullResponse<ProductBrand[] | PaginatedResponse<ProductBrand>>('/product-brands/');
      
      let brands: ProductBrand[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          brands = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          brands = response.data.results;
        }
      }
      
      console.log(`✅ ${brands.length} marques chargées`);
      return brands.map(brand => ({
        id: brand.id || 0,
        name: brand.name || 'Marque',
        description: brand.description || '',
        is_active: brand.is_active !== undefined ? brand.is_active : true
      }));
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des marques:', error);
      return [];
    }
  }

  // Récupérer tous les fournisseurs
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      console.log('🔄 Chargement des fournisseurs...');
      const response = await api.getFullResponse<Supplier[] | PaginatedResponse<Supplier>>('/suppliers/');
      
      let suppliers: Supplier[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          suppliers = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          suppliers = response.data.results;
        }
      }
      
      console.log(`✅ ${suppliers.length} fournisseurs chargés`);
      return suppliers.map(supplier => ({
        id: supplier.id || 0,
        name: supplier.name || 'Fournisseur',
        store_name: supplier.store_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        is_active: supplier.is_active !== undefined ? supplier.is_active : true
      }));
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des fournisseurs:', error);
      return [];
    }
  }

  // === BOUTIQUES ===

  // Récupérer toutes les boutiques
  async getAllStores(): Promise<Store[]> {
    try {
      console.log('🔄 Chargement des boutiques...');
      const response = await api.getFullResponse<Store[] | PaginatedResponse<Store>>('/stores/');
      
      let stores: Store[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          stores = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          stores = response.data.results;
        }
      }
      
      console.log(`✅ ${stores.length} boutiques chargées`);
      return stores.map(store => ({
        id: store.id || 0,
        name: store.name || 'Boutique',
        email: store.email || '',
        phone: store.phone || '',
        address: store.address || '',
        is_active: store.is_active !== undefined ? store.is_active : true
      }));
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des boutiques:', error);
      return [];
    }
  }

  // === VARIANTES ===

  // Récupérer les variantes d'un produit
  async getProductVariants(productId: number): Promise<ProductVariant[]> {
    try {
      console.log(`🔄 Chargement des variantes du produit ${productId}...`);
      const response = await api.getFullResponse<ProductVariant[] | PaginatedResponse<ProductVariant>>('/product-variants/', {
        params: { product: productId }
      });
      
      let variants: ProductVariant[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          variants = response.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          variants = response.data.results;
        }
      }
      
      console.log(`✅ ${variants.length} variantes chargées`);
      return variants;
      
    } catch (error) {
      console.error(`❌ Erreur lors du chargement des variantes du produit ${productId}:`, error);
      return [];
    }
  }

  // === AUTRES FONCTIONNALITÉS ===

  // Créer un produit avec prix par boutique
  async createProductWithStorePrices(productData: any): Promise<Product> {
    try {
      console.log('🔄 Création produit avec boutiques...');
      return await this.createProduct(productData);
    } catch (error) {
      console.error('❌ Erreur lors de la création du produit avec boutiques:', error);
      throw error;
    }
  }

  // Mettre à jour un produit avec prix par boutique
  async updateProductWithStorePrices(id: number, productData: any): Promise<Product> {
    try {
      console.log(`🔄 Mise à jour produit ${id} avec boutiques...`);
      return await this.updateProduct(id, productData);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du produit ${id} avec boutiques:`, error);
      throw error;
    }
  }

  // === MÉTHODES UTILITAIRES ===

  // Extraire un message d'erreur lisible de la réponse API
  private extractErrorMessage(errorData: any): string {
    if (typeof errorData === 'string') {
      return errorData;
    }
    
    if (errorData.detail) {
      return errorData.detail;
    }
    
    if (errorData.message) {
      return errorData.message;
    }
    
    if (typeof errorData === 'object') {
      // Afficher les erreurs de validation
      const errors: string[] = [];
      
      Object.entries(errorData).forEach(([field, fieldErrors]) => {
        if (Array.isArray(fieldErrors)) {
          errors.push(`${field}: ${fieldErrors.join(', ')}`);
        } else if (typeof fieldErrors === 'string') {
          errors.push(`${field}: ${fieldErrors}`);
        } else {
          errors.push(`${field}: ${JSON.stringify(fieldErrors)}`);
        }
      });
      
      if (errors.length > 0) {
        return `Erreurs de validation:\n${errors.join('\n')}`;
      }
    }
    
    return 'Erreur inconnue';
  }

  // === MÉTHODES SPÉCIFIQUES POUR LES STORES ===

  async getProductsByStore(storeId: number): Promise<Product[]> {
    try {
      const products = await api.get<Product[]>(`/stores/${storeId}/products/`);
      return products.map(product => this.normalizeProduct(product));
    } catch (error) {
      console.error(`❌ Erreur lors du chargement des produits de la boutique ${storeId}:`, error);
      return [];
    }
  }

  async addProductToStore(
    productId: number,
    storeId: number,
    storeProductData: {
      store_base_price?: number;
      store_cost_price?: number;
      store_compare_at_price?: number;
      min_stock_threshold?: number;
      reorder_quantity?: number;
      is_active?: boolean;
      display_order?: number;
    }
  ): Promise<StoreProduct> {
    try {
      const data = {
        product: productId,
        store: storeId,
        store_base_price: storeProductData.store_base_price?.toString() || '0',
        store_cost_price: storeProductData.store_cost_price?.toString() || '0',
        store_compare_at_price: storeProductData.store_compare_at_price?.toString() || '0',
        min_stock_threshold: storeProductData.min_stock_threshold || 10,
        reorder_quantity: storeProductData.reorder_quantity || 100,
        is_active: storeProductData.is_active !== undefined ? storeProductData.is_active : true,
        display_order: storeProductData.display_order || 0
      };
      
      const response = await api.post<StoreProduct>('/store-products/', data);
      return this.normalizeStoreProduct(response);
    } catch (error) {
      console.error(`❌ Erreur lors de l'ajout du produit ${productId} à la boutique ${storeId}:`, error);
      throw new Error('Impossible d\'ajouter le produit à la boutique');
    }
  }

  async updateProductInStore(
    productId: number,
    storeId: number,
    storeProductData: any
  ): Promise<StoreProduct> {
    try {
      const storeProducts = await api.get<StoreProduct[]>('/store-products/', {
        params: { product: productId, store: storeId }
      });
      
      if (storeProducts.length === 0) {
        throw new Error('Produit non trouvé dans cette boutique');
      }
      
      const storeProductId = storeProducts[0].id;
      
      // Convertir les prix en strings si nécessaire
      const dataToSend: any = {};
      Object.keys(storeProductData).forEach(key => {
        if (key.includes('_price') && typeof storeProductData[key] === 'number') {
          dataToSend[key] = storeProductData[key].toString();
        } else {
          dataToSend[key] = storeProductData[key];
        }
      });
      
      const response = await api.patch<StoreProduct>(
        `/store-products/${storeProductId}/`,
        dataToSend
      );
      return this.normalizeStoreProduct(response);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du produit ${productId} dans la boutique ${storeId}:`, error);
      throw new Error('Impossible de mettre à jour le produit dans la boutique');
    }
  }

  async getStoreProducts(productId: number): Promise<StoreProduct[]> {
    try {
      const response = await api.get<StoreProduct[]>(
        '/store-products/',
        { params: { product: productId } }
      );
      return response.map(sp => this.normalizeStoreProduct(sp));
    } catch (error) {
      console.error(`❌ Erreur lors du chargement des produits du magasin pour ${productId}:`, error);
      return [];
    }
  }

  async removeProductFromStore(productId: number, storeId: number): Promise<void> {
    try {
      const storeProducts = await api.get<StoreProduct[]>('/store-products/', {
        params: { product: productId, store: storeId }
      });
      
      if (storeProducts.length === 0) {
        throw new Error('Produit non trouvé dans cette boutique');
      }
      
      const storeProductId = storeProducts[0].id;
      await api.delete(`/store-products/${storeProductId}/`);
      console.log(`✅ Produit ${productId} retiré de la boutique ${storeId}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression du produit ${productId} de la boutique ${storeId}:`, error);
      throw new Error('Impossible de supprimer le produit de la boutique');
    }
  }

  async getProductStats(): Promise<ProductStats> {
    try {
      const stats = await api.get<ProductStats>('/analytics/');
      return stats;
    } catch {
      const products = await this.getAllProducts();
      
      return {
        total_products: products.length,
        active_products: products.filter(p => p.status === 'active').length,
        low_stock_products: products.filter(p => (p.qt_item || 0) <= 10).length,
        out_of_stock_products: products.filter(p => (p.qt_item || 0) === 0).length,
        average_margin: 0,
        total_inventory_value: 0
      };
    }
  }

  async exportProducts(filters?: ProductFilter): Promise<Blob> {
    try {
      const products = await this.getAllProducts(filters);
      
      const headers = [
        'ID', 'Nom', 'SKU', 'Description', 
        'Catégorie', 'Marque', 'Fournisseur',
        'Prix d\'achat', 'Prix de vente', 'Prix comparé',
        'Quantité', 'Statut', 'Actif'
      ];
      
      const rows = products.map(product => [
        product.id,
        product.name,
        product.sku || '',
        product.description || '',
        product.category?.name || '',
        product.brand?.name || '',
        product.supplier?.name || '',
        product.cost_price || 0,
        product.base_price || 0,
        product.compare_at_price || 0,
        product.qt_item || 0,
        product.status,
        product.is_active ? 'Oui' : 'Non'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => 
          `"${String(cell).replace(/"/g, '""')}"`
        ).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return blob;
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'export des produits:', error);
      throw new Error('Impossible d\'exporter les produits');
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const products = await api.get<Product[]>('/products/', { 
        params: { search: query } 
      });
      return products.map(product => this.normalizeProduct(product));
    } catch (error) {
      console.error('❌ Erreur lors de la recherche des produits:', error);
      return [];
    }
  }

  async updateProductStatus(productId: number, status: string): Promise<Product> {
    try {
      const is_active = status === 'active';
      const product = await api.patch<Product>(`/products/${productId}/`, { 
        status, 
        is_active 
      });
      return this.normalizeProduct(product);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du statut du produit ${productId}:`, error);
      throw new Error('Impossible de mettre à jour le statut');
    }
  }

  async adjustStock(productId: number, quantity: number, movementType: string, notes?: string): Promise<Stock> {
    try {
      const stock = await api.post<Stock>(`/products/${productId}/adjust-stock/`, {
        quantity,
        movement_type: movementType,
        notes
      });
      
      return stock;
    } catch (error) {
      console.error(`❌ Erreur lors de l'ajustement du stock pour le produit ${productId}:`, error);
      throw new Error('Impossible d\'ajuster le stock');
    }
  }

  async getLowStockProducts(threshold: number = 10): Promise<Product[]> {
    try {
      const products = await this.getAllProducts();
      return products.filter(p => (p.qt_item || 0) <= threshold && (p.qt_item || 0) > 0);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits en stock faible:', error);
      return [];
    }
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    try {
      const products = await this.getAllProducts();
      return products.filter(p => (p.qt_item || 0) === 0);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits en rupture de stock:', error);
      return [];
    }
  }

  async createSupplier(supplierData: {
    name: string;
    store_name?: string;
  }): Promise<Supplier> {
    try {
      const data = {
        name: supplierData.name,
        store_name: supplierData.store_name || '',
        contact_person: '',
        payment_terms: '',
        status: 'active'
      };
      
      console.log('🔄 Création fournisseur:', data);
      
      const supplier = await api.post<Supplier>('/suppliers/', data);
      console.log('✅ Fournisseur créé:', supplier);
      return supplier;
      
    } catch (error: any) {
      console.error('❌ Erreur création fournisseur:', error);
      throw new Error('Impossible de créer le fournisseur');
    }
  }
}

export default new ProductService();