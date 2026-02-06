// src/services/productCategoryService.ts
import api from './api';
import {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryFilter
} from '../types/productTypes';

export const productCategoryService = {
  // ==================== CRUD ====================
  
  getAllCategories: async (filters?: ProductCategoryFilter): Promise<ProductCategory[]> => {
    try {
      return await api.get<ProductCategory[]>('categories/', { params: filters });
    } catch (error) {
      console.error('❌ Service: Erreur getAllCategories', error);
      throw error;
    }
  },

  getCategoryById: async (id: number): Promise<ProductCategory> => {
    try {
      return await api.get<ProductCategory>(`categories/${id}/`);
    } catch (error) {
      console.error(`❌ Service: Erreur getCategoryById(${id})`, error);
      throw error;
    }
  },

  getCategoryTree: async (): Promise<ProductCategory[]> => {
    try {
      return await api.get<ProductCategory[]>('categories/tree/');
    } catch (error: any) {
      if (error.response?.status === 404) {
        const allCategories = await productCategoryService.getAllCategories();
        return productCategoryService.buildCategoryTree(allCategories);
      }
      console.error('❌ Service: Erreur getCategoryTree', error);
      throw error;
    }
  },

  getCategoryStats: async (): Promise<any> => {
    try {
      return await api.get<any>('categories/stats/');
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          total_categories: 0,
          active_categories: 0,
          categories_with_products: 0,
          average_products_per_category: 0
        };
      }
      console.error('❌ Service: Erreur getCategoryStats', error);
      throw error;
    }
  },

  getPopularCategories: async (limit: number = 5): Promise<ProductCategory[]> => {
    try {
      return await api.get<ProductCategory[]>('categories/popular/', {
        params: { limit }
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        const allCategories = await productCategoryService.getAllCategories();
        return allCategories
          .sort((a, b) => (b.products_count || 0) - (a.products_count || 0))
          .slice(0, limit);
      }
      console.error('❌ Service: Erreur getPopularCategories', error);
      throw error;
    }
  },

  // ⭐⭐ CORRECTION CRITIQUE ICI - createCategory
  createCategory: async (data: CreateProductCategoryDto): Promise<ProductCategory> => {
    try {
      // ⭐ VÉRIFICATION OBLIGATOIRE - sub_category doit être présent
      if (!data.sub_category || data.sub_category.trim().length === 0) {
        throw new Error('Le champ "sub_category" est obligatoire');
      }

      // Nettoyer les données avant l'envoi
      const cleanData: CreateProductCategoryDto = {
        ...data,
        name: data.name.trim(),
        sub_category: data.sub_category.trim(), // ⭐ CONSERVER ET NETTOYER
        description: data.description ? data.description.trim() : '',
        parent: data.parent || null,
        metadata: data.metadata || {},
        sort_order: data.sort_order || 0,
        is_active: data.is_active !== undefined ? data.is_active : true
      };

      console.log('📤 Service: Envoi création catégorie', cleanData);
      
      return await api.post<ProductCategory>('categories/', cleanData);
    } catch (error) {
      console.error('❌ Service: Erreur createCategory', error);
      throw error;
    }
  },

  // ⭐ CORRECTION AUSSI ICI - updateCategory
  updateCategory: async (id: number, data: UpdateProductCategoryDto): Promise<ProductCategory> => {
    try {
      // Nettoyer les données avant l'envoi
      const cleanData: UpdateProductCategoryDto = { ...data };
      
      // ⭐ Si sub_category est fourni, le nettoyer
      if (cleanData.sub_category !== undefined) {
        cleanData.sub_category = cleanData.sub_category.trim();
      }
      
      // ⭐ Si name est fourni, le nettoyer
      if (cleanData.name !== undefined) {
        cleanData.name = cleanData.name.trim();
      }
      
      // ⭐ Si description est fourni, le nettoyer
      if (cleanData.description !== undefined) {
        cleanData.description = cleanData.description.trim();
      }
      
      cleanData.metadata = cleanData.metadata || {};

      console.log(`📤 Service: Envoi mise à jour catégorie ${id}`, cleanData);
      
      return await api.patch<ProductCategory>(`categories/${id}/`, cleanData);
    } catch (error) {
      console.error(`❌ Service: Erreur updateCategory(${id})`, error);
      throw error;
    }
  },

  deleteCategory: async (id: number): Promise<void> => {
    try {
      await api.delete(`categories/${id}/`);
    } catch (error) {
      console.error(`❌ Service: Erreur deleteCategory(${id})`, error);
      throw error;
    }
  },

  // ==================== MÉTHODES UTILITAIRES ====================
  
  searchCategories: async (searchTerm: string): Promise<ProductCategory[]> => {
    try {
      return await productCategoryService.getAllCategories({ search: searchTerm });
    } catch (error) {
      console.error('❌ Service: Erreur searchCategories', error);
      throw error;
    }
  },

  getActiveCategories: async (): Promise<ProductCategory[]> => {
    try {
      return await productCategoryService.getAllCategories({ is_active: true });
    } catch (error) {
      console.error('❌ Service: Erreur getActiveCategories', error);
      throw error;
    }
  },

  getRootCategories: async (): Promise<ProductCategory[]> => {
    try {
      const categories = await productCategoryService.getAllCategories();
      return categories.filter(cat => !cat.parent);
    } catch (error) {
      console.error('❌ Service: Erreur getRootCategories', error);
      throw error;
    }
  },

  getSubcategories: async (parentId: number): Promise<ProductCategory[]> => {
    try {
      const categories = await productCategoryService.getAllCategories();
      return categories.filter(cat => cat.parent === parentId);
    } catch (error) {
      console.error(`❌ Service: Erreur getSubcategories(${parentId})`, error);
      throw error;
    }
  },

  getPossibleParents: async (excludeId?: number): Promise<ProductCategory[]> => {
    try {
      const categories = await productCategoryService.getAllCategories();
      return categories.filter(cat => 
        cat.id !== excludeId && 
        (!cat.parent || cat.parent !== excludeId)
      );
    } catch (error) {
      console.error('❌ Service: Erreur getPossibleParents', error);
      throw error;
    }
  },

  buildCategoryTree: (categories: ProductCategory[]): ProductCategory[] => {
    interface CategoryWithChildren extends ProductCategory {
      children?: CategoryWithChildren[];
    }

    const categoryMap = new Map<number, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id);
      if (categoryWithChildren) {
        if (category.parent && categoryMap.has(category.parent)) {
          const parent = categoryMap.get(category.parent);
          if (parent && parent.children) {
            parent.children.push(categoryWithChildren);
          }
        } else {
          rootCategories.push(categoryWithChildren);
        }
      }
    });

    return rootCategories as ProductCategory[];
  },

  getCategoryHierarchy: async (categoryId: number): Promise<ProductCategory[]> => {
    try {
      const categories = await productCategoryService.getAllCategories();
      const hierarchy: ProductCategory[] = [];
      let currentId: number | null = categoryId;

      while (currentId) {
        const category = categories.find(c => c.id === currentId);
        if (!category) break;
        
        hierarchy.unshift(category);
        currentId = category.parent;
      }

      return hierarchy;
    } catch (error) {
      console.error(`❌ Service: Erreur getCategoryHierarchy(${categoryId})`, error);
      throw error;
    }
  },

  // ⭐⭐ CORRECTION AUSSI ICI - validateCategoryData
  validateCategoryData: (data: CreateProductCategoryDto | UpdateProductCategoryDto): string[] => {
    const errors: string[] = [];

    // Validation pour la création
    if ('name' in data) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Le nom est obligatoire');
      } else if (data.name.length > 150) { // ⭐ 150 caractères max comme dans Django
        errors.push('Le nom ne doit pas dépasser 150 caractères');
      }
    }

    // ⭐ VALIDATION CRITIQUE - sub_category obligatoire pour création
    if ('sub_category' in data) {
      if (!data.sub_category || data.sub_category.trim().length === 0) {
        errors.push('Le type de catégorie (sub_category) est obligatoire');
      } else if (data.sub_category.length > 150) { // ⭐ 150 caractères max
        errors.push('Le type de catégorie ne doit pas dépasser 150 caractères');
      }
    }

    if (data.description && data.description.length > 500) {
      errors.push('La description ne doit pas dépasser 500 caractères');
    }

    if (data.sort_order !== undefined && (data.sort_order < 0 || data.sort_order > 999)) {
      errors.push("L'ordre d'affichage doit être compris entre 0 et 999");
    }

    return errors;
  },

  // ==================== STATISTIQUES AVANCÉES ====================
  
  getCategoryAnalytics: async (): Promise<any> => {
    try {
      const categories = await productCategoryService.getAllCategories();
      const stats = {
        total: categories.length,
        active: categories.filter(c => c.is_active).length,
        inactive: categories.filter(c => !c.is_active).length,
        with_products: categories.filter(c => (c.products_count || 0) > 0).length,
        root_categories: categories.filter(c => !c.parent).length,
        subcategories: categories.filter(c => c.parent).length,
        max_products: Math.max(...categories.map(c => c.products_count || 0)),
        min_products: Math.min(...categories.map(c => c.products_count || 0)),
        avg_products: categories.length > 0 
          ? categories.reduce((sum, c) => sum + (c.products_count || 0), 0) / categories.length 
          : 0
      };

      return stats;
    } catch (error) {
      console.error('❌ Service: Erreur getCategoryAnalytics', error);
      throw error;
    }
  },

  // ⭐ NOUVELLE MÉTHODE UTILE - Générer un slug cohérent
  generateSlug: (name: string, subCategory: string): string => {
    const base = `${name}-${subCategory}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    return base.substring(0, 50); // Limiter la longueur
  }
};