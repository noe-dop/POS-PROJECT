// src/services/productCategoryService.ts - VERSION CORRIGÉE (SANS api/ DOUBLON)
import api from './api';
import {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryFilter,
  PaginatedResponse
} from '../types/productTypes';

export const productCategoryService = {
  // ==================== CRUD PRINCIPAL ====================
  
  /**
   * Récupérer toutes les catégories - ✅ CORRIGÉ URL (SANS api/)
   */
  getAllCategories: async (filters?: ProductCategoryFilter): Promise<ProductCategory[]> => {
    try {
      console.log('📡 [Service] Récupération des catégories', filters);
      
      // ✅ CORRECTION: 'categories/' PAS 'api/categories/' !
      const response = await api.get<any>('categories/', filters);
      
      if (response && typeof response === 'object') {
        if ('results' in response && Array.isArray(response.results)) {
          console.log(`✅ [Service] ${response.results.length} catégories chargées (sur ${response.count})`);
          return response.results;
        }
        if (Array.isArray(response)) {
          console.log(`✅ [Service] ${response.length} catégories chargées`);
          return response;
        }
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ [Service] Erreur getAllCategories:', error);
      throw error;
    }
  },

  /**
   * Récupérer une catégorie par son ID
   */
  getCategoryById: async (id: number): Promise<ProductCategory> => {
    try {
      return await api.get<ProductCategory>(`categories/${id}/`);
    } catch (error) {
      console.error(`❌ [Service] Erreur getCategoryById(${id}):`, error);
      throw error;
    }
  },

  /**
   * ✅ CRÉATION CATÉGORIE - URL CORRIGÉE (SANS api/)
   */
  createCategory: async (data: CreateProductCategoryDto): Promise<ProductCategory> => {
    try {
      // ⭐ VALIDATION STRICTE
      if (!data.sub_category || data.sub_category.trim().length === 0) {
        throw new Error('Le champ "sub_category" est obligatoire');
      }

      // ✅ Générer le slug si non fourni
      const slug = data.slug?.trim() || generateSlug(data.name);
      
      const cleanData: any = {
        name: data.name?.trim(),
        sub_category: data.sub_category.trim(),
        slug: slug,
        description: data.description?.trim() || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        sort_order: data.sort_order ?? 0,
        metadata: data.metadata || {}
      };

      // ⭐ GESTION DU PARENT
      if (data.parent && data.parent !== null && data.parent !== 0) {
        cleanData.parent = Number(data.parent);
      }

      console.log('📤 [Service] Création catégorie:', cleanData);

      // ✅ CORRECTION: 'categories/' PAS 'api/categories/' !
      const response = await api.post<ProductCategory>('categories/', cleanData);
      return response;
      
    } catch (error: any) {
      console.error('❌ [Service] Erreur createCategory:', error);
      throw error;
    }
  },

  /**
   * ✅ MISE À JOUR CATÉGORIE - URL CORRIGÉE
   */
  updateCategory: async (id: number, data: UpdateProductCategoryDto): Promise<ProductCategory> => {
    try {
      const cleanData: any = {};

      if (data.name !== undefined) cleanData.name = data.name.trim();
      if (data.sub_category !== undefined) cleanData.sub_category = data.sub_category.trim();
      if (data.slug !== undefined) cleanData.slug = data.slug.trim();
      if (data.description !== undefined) cleanData.description = data.description.trim() || '';
      if (data.is_active !== undefined) cleanData.is_active = data.is_active;
      if (data.sort_order !== undefined) cleanData.sort_order = data.sort_order;
      if (data.metadata !== undefined) cleanData.metadata = data.metadata;

      // ⭐ Gestion du parent
      if (data.parent !== undefined) {
        if (data.parent && data.parent !== null && data.parent !== 0) {
          cleanData.parent = Number(data.parent);
        }
      }

      console.log(`📤 [Service] Mise à jour catégorie ${id}:`, cleanData);

      // ✅ CORRECTION: 'categories/' PAS 'api/categories/' !
      const response = await api.patch<ProductCategory>(`categories/${id}/`, cleanData);
      return response;
      
    } catch (error: any) {
      console.error(`❌ [Service] Erreur updateCategory(${id}):`, error);
      throw error;
    }
  },

  /**
   * Supprimer une catégorie
   */
  deleteCategory: async (id: number): Promise<void> => {
    try {
      await api.delete(`categories/${id}/`);
      console.log(`✅ [Service] Catégorie ${id} supprimée`);
    } catch (error: any) {
      console.error(`❌ [Service] Erreur deleteCategory(${id}):`, error);
      throw error;
    }
  },

  /**
   * ✅ Récupérer l'arborescence - URL CORRIGÉE
   */
  getCategoryTree: async (): Promise<ProductCategory[]> => {
    try {
      console.log('📡 [Service] Récupération arborescence');
      // ✅ CORRECTION: 'categories/tree/' PAS 'api/categories/tree/' !
      return await api.get<ProductCategory[]>('categories/tree/');
    } catch (error: any) {
      console.error('❌ [Service] Erreur getCategoryTree:', error);
      
      if (error.response?.status === 404) {
        console.log('⚠️ [Service] Endpoint tree non trouvé, construction locale');
        const categories = await productCategoryService.getAllCategories();
        return productCategoryService.buildCategoryTree(categories);
      }
      throw error;
    }
  },

  /**
   * ✅ Récupérer les statistiques - URL CORRIGÉE
   */
  getCategoryStats: async (): Promise<any> => {
    try {
      console.log('📡 [Service] Récupération statistiques');
      // ✅ CORRECTION: 'categories/stats/' PAS 'api/categories/stats/' !
      return await api.get<any>('categories/stats/');
    } catch (error: any) {
      console.error('❌ [Service] Erreur getCategoryStats:', error);
      
      if (error.response?.status === 404) {
        const categories = await productCategoryService.getAllCategories();
        return {
          total_categories: categories.length,
          active_categories: categories.filter(c => c.is_active).length,
          inactive_categories: categories.filter(c => !c.is_active).length,
          root_categories: categories.filter(c => !c.parent).length,
          subcategories: categories.filter(c => c.parent).length,
          total_products: categories.reduce((sum, c) => sum + (c.products_count || 0), 0)
        };
      }
      throw error;
    }
  },

  // ==================== MÉTHODES UTILITAIRES ====================

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

  validateCategoryData: (data: CreateProductCategoryDto | UpdateProductCategoryDto): string[] => {
    const errors: string[] = [];

    if ('name' in data && data.name !== undefined) {
      if (!data.name?.trim()) errors.push('Le nom est obligatoire');
      else if (data.name.length > 150) errors.push('Le nom ne doit pas dépasser 150 caractères');
    }

    if ('sub_category' in data && data.sub_category !== undefined) {
      if (!data.sub_category?.trim()) errors.push('Le champ "sub_category" est obligatoire');
      else if (data.sub_category.length > 150) errors.push('Le champ "sub_category" ne doit pas dépasser 150 caractères');
      else if (!/^[a-z0-9_]+$/.test(data.sub_category)) {
        errors.push('Le champ "sub_category" ne peut contenir que des lettres minuscules, chiffres et underscores');
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

  getCategoryAnalytics: async (): Promise<any> => {
    try {
      const categories = await productCategoryService.getAllCategories();
      return {
        total: categories.length,
        active: categories.filter(c => c.is_active).length,
        inactive: categories.filter(c => !c.is_active).length,
        with_products: categories.filter(c => (c.products_count || 0) > 0).length,
        without_products: categories.filter(c => (c.products_count || 0) === 0).length,
        root_categories: categories.filter(c => !c.parent).length,
        subcategories: categories.filter(c => c.parent).length,
        avg_products: categories.length > 0 
          ? categories.reduce((sum, c) => sum + (c.products_count || 0), 0) / categories.length 
          : 0,
        total_products: categories.reduce((sum, c) => sum + (c.products_count || 0), 0)
      };
    } catch (error) {
      console.error('❌ [Service] Erreur getCategoryAnalytics:', error);
      throw error;
    }
  }
};

// ==================== FONCTIONS UTILITAIRES EXPORTÉES ====================

export function generateSlug(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

export function generateSubCategory(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}

export default productCategoryService;