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
  ProductVariantFormData,
  ImportResult,
  PaginatedResponse
} from '../types/product';
import { api } from './api';

class ProductService {
  // Récupérer tous les produits avec filtres optionnels
  async getAllProducts(filters?: ProductFilter): Promise<Product[]> {
    try {
      const params: Record<string, any> = {};
      
      if (filters?.search) params.search = filters.search;
      if (filters?.category && filters.category !== 'all') params.category = filters.category;
      if (filters?.brand && filters.brand !== 'all') params.brand = filters.brand;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.low_stock) params.low_stock = true;
      if (filters?.page) params.page = filters.page;
      if (filters?.page_size) params.page_size = filters.page_size;
      if (filters?.ordering) params.ordering = filters.ordering;

      const response = await api.getFullResponse<PaginatedResponse<Product>>('/products/', params);
      
      if (response?.data?.results) {
        return response.data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      throw new Error('Impossible de charger les produits');
    }
  }

  // Récupérer un produit par son ID
  async getProductById(id: number): Promise<Product | null> {
    try {
      const product = await api.get<Product>(`/products/${id}/`);
      return product;
    } catch (error) {
      console.error(`Erreur lors du chargement du produit ${id}:`, error);
      return null;
    }
  }

  // Récupérer toutes les catégories
  async getAllCategories(): Promise<ProductCategory[]> {
    try {
      const categories = await api.get<ProductCategory[]>('/categories/');
      return categories;
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      return [];
    }
  }

  // Récupérer toutes les marques
  async getAllBrands(): Promise<ProductBrand[]> {
    try {
      const brands = await api.get<ProductBrand[]>('/product-brands/');
      return brands;
    } catch (error) {
      console.error('Erreur lors du chargement des marques:', error);
      return [];
    }
  }

  // Récupérer tous les fournisseurs
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const suppliers = await api.get<Supplier[]>('/suppliers/');
      return suppliers;
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error);
      return [];
    }
  }

  // Récupérer les statistiques des produits
  async getProductStats(): Promise<ProductStats> {
    try {
      try {
        const stats = await api.get<ProductStats>('/analytics/');
        return stats;
      } catch {
        const products = await this.getAllProducts();
        const total_products = products.length;
        const active_products = products.filter(p => p.status === 'active').length;
        
        const low_stock_products = products.filter(p => {
          const stock = p.stocks?.[0];
          return stock && stock.quantity_available <= stock.min_stock_threshold;
        }).length;
        
        const out_of_stock_products = products.filter(p => {
          const stock = p.stocks?.[0];
          return stock && stock.quantity_available === 0;
        }).length;
        
        const total_margin = products.reduce((sum, p) => {
          if (p.cost_price && p.cost_price > 0 && p.base_price) {
            return sum + ((p.base_price - p.cost_price) / p.cost_price) * 100;
          }
          return sum;
        }, 0);
        
        const average_margin = total_products > 0 ? total_margin / total_products : 0;
        
        const total_inventory_value = products.reduce((sum, p) => {
          const stock = p.stocks?.[0];
          const quantity = stock?.quantity_available || 0;
          return sum + ((p.cost_price || 0) * quantity);
        }, 0);

        return {
          total_products,
          active_products,
          low_stock_products,
          out_of_stock_products,
          average_margin,
          total_inventory_value
        };
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      return {
        total_products: 0,
        active_products: 0,
        low_stock_products: 0,
        out_of_stock_products: 0,
        average_margin: 0,
        total_inventory_value: 0
      };
    }
  }

  // Créer un nouveau produit
  async createProduct(productData: ProductFormData): Promise<Product> {
    try {
      const data: Record<string, any> = {
        name: productData.name,
        description: productData.description || '',
        category: productData.category_id,
        supplier: productData.supplier_id,
        cost_price: productData.cost_price,
        base_price: productData.base_price,
        status: productData.status || 'draft'
      };

      if (productData.brand_id && productData.brand_id > 0) {
        data.brand = productData.brand_id;
      }

      if (productData.sku) data.sku = productData.sku;
      if (productData.compare_at_price) data.compare_at_price = productData.compare_at_price;
      if (productData.qt_item) data.qt_item = productData.qt_item;
      if (productData.jour_ecart) data.jour_ecart = productData.jour_ecart;
      if (productData.type) data.type = productData.type;

      if (productData.photo instanceof File) {
        const formData = new FormData();
        
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
            formData.append(key, data[key].toString());
          }
        });
        
        formData.append('photo', productData.photo);
        
        const product = await api.post<Product>('/products/', formData);
        return product;
      } else {
        const product = await api.post<Product>('/products/', data);
        return product;
      }
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      throw new Error('Impossible de créer le produit');
    }
  }

  // Mettre à jour un produit
  async updateProduct(productId: number, productData: Partial<ProductFormData>): Promise<Product> {
    try {
      const data: Record<string, any> = {};
      
      if (productData.name) data.name = productData.name;
      if (productData.description !== undefined) data.description = productData.description;
      if (productData.category_id) data.category = productData.category_id;
      if (productData.supplier_id) data.supplier = productData.supplier_id;
      if (productData.cost_price !== undefined) data.cost_price = productData.cost_price;
      if (productData.base_price !== undefined) data.base_price = productData.base_price;
      
      if (productData.brand_id !== undefined) {
        if (productData.brand_id > 0) {
          data.brand = productData.brand_id;
        } else {
          data.brand = null;
        }
      }
      
      if (productData.compare_at_price !== undefined) data.compare_at_price = productData.compare_at_price;
      if (productData.qt_item !== undefined) data.qt_item = productData.qt_item;
      if (productData.jour_ecart !== undefined) data.jour_ecart = productData.jour_ecart;
      if (productData.status) data.status = productData.status;
      if (productData.sku !== undefined) data.sku = productData.sku;
      if (productData.type !== undefined) data.type = productData.type;

      if (productData.photo !== undefined) {
        const formData = new FormData();
        
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
            formData.append(key, data[key].toString());
          }
        });
        
        if (productData.photo instanceof File) {
          formData.append('photo', productData.photo);
        } else if (productData.photo === null) {
          formData.append('photo', '');
        }
        
        const product = await api.patch<Product>(`/products/${productId}/`, formData);
        return product;
      } else {
        const product = await api.patch<Product>(`/products/${productId}/`, data);
        return product;
      }
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du produit ${productId}:`, error);
      throw new Error('Impossible de mettre à jour le produit');
    }
  }

  // Supprimer un produit
  async deleteProduct(productId: number): Promise<void> {
    try {
      await api.delete(`/products/${productId}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du produit ${productId}:`, error);
      throw new Error('Impossible de supprimer le produit');
    }
  }

  // Exporter les produits
  async exportProducts(filters?: ProductFilter): Promise<Blob> {
    try {
      const params: Record<string, any> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.category && filters.category !== 'all') params.category = filters.category;
      if (filters?.brand && filters.brand !== 'all') params.brand = filters.brand;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.low_stock) params.low_stock = true;

      try {
        const response = await api.getFullResponse<Blob>('/exports/products/', {
          params,
          responseType: 'blob'
        });
        
        return response.data;
      } catch {
        const products = await this.getAllProducts(filters);
        const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
        return blob;
      }
    } catch (error) {
      console.error('Erreur lors de l\'export des produits:', error);
      throw new Error('Impossible d\'exporter les produits');
    }
  }

  // Rechercher des produits
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const products = await api.get<Product[]>('/products/', { search: query });
      return products;
    } catch (error) {
      console.error('Erreur lors de la recherche des produits:', error);
      throw new Error('Impossible de rechercher les produits');
    }
  }

  // Récupérer les variantes d'un produit
  async getProductVariants(productId: number): Promise<ProductVariant[]> {
    try {
      const variants = await api.get<ProductVariant[]>('/product-variants/', {
        params: { product: productId }
      });
      return variants;
    } catch (error) {
      console.error(`Erreur lors du chargement des variantes du produit ${productId}:`, error);
      return [];
    }
  }

  // Mettre à jour le statut d'un produit
  async updateProductStatus(productId: number, status: 'draft' | 'active' | 'archived'): Promise<Product> {
    try {
      const product = await api.patch<Product>(`/products/${productId}/`, { status });
      return product;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du statut du produit ${productId}:`, error);
      throw new Error('Impossible de mettre à jour le statut');
    }
  }

  // Ajuster le stock d'un produit
  async adjustStock(productId: number, quantity: number, movementType: 'inbound' | 'outbound' | 'adjustment', notes?: string): Promise<Stock> {
    try {
      const stock = await api.post<Stock>(`/products/${productId}/adjust-stock/`, {
        quantity,
        movement_type: movementType,
        notes
      });
      
      return stock;
    } catch (error) {
      console.error(`Erreur lors de l'ajustement du stock pour le produit ${productId}:`, error);
      throw new Error('Impossible d\'ajuster le stock');
    }
  }
}

export default new ProductService();