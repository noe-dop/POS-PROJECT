// src/hooks/useProductCategories.ts - VERSION CORRIGÉE
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './useToast';
import {
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  ProductCategoryFilter,
  generateSubCategory,
  generateSlug,
  validateCategoryData,
  prepareCategoryForApi,
  categoryFormToDto,
  PaginatedResponse
} from '../types/productTypes';
import { productCategoryService } from '../services/productCategoryService';

export const useProductCategories = (filters?: ProductCategoryFilter) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<ProductCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<any>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { showToast } = useToast();
  const isInitialized = useRef(false);
  const previousSearchRef = useRef<string | undefined>('');
  const isLoadingCategoriesRef = useRef(false);

  // ==================== FONCTIONS API ====================

  const loadCategories = useCallback(async (filterParams?: ProductCategoryFilter) => {
    if (isLoadingCategoriesRef.current) return;
    isLoadingCategoriesRef.current = true;
    setIsLoadingCategories(true);
    
    console.log('📡 Chargement des catégories...');
    
    try {
      const data = await productCategoryService.getAllCategories(filterParams || filters);
      setCategories(data);
      console.log(`✅ ${data.length} catégories chargées`);
    } catch (error: any) {
      console.error('❌ Erreur chargement catégories:', error);
      
      let errorMessage = 'Impossible de charger les catégories';
      
      if (error?.response?.status === 404) {
        errorMessage = 'Endpoint /api/categories/ non trouvé';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Erreur serveur';
      } else if (error?.message?.includes('Network Error')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Non autorisé. Connectez-vous.';
      }
      
      showToast({
        title: 'Erreur',
        description: errorMessage,
        type: 'error',
      });
      
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
      isLoadingCategoriesRef.current = false;
    }
  }, [filters, showToast]);

  const loadCategoryTree = useCallback(async () => {
    setIsLoadingTree(true);
    
    try {
      const tree = await productCategoryService.getCategoryTree();
      setCategoryTree(tree);
    } catch (error: any) {
      console.error('❌ Erreur chargement arbre:', error);
      
      if (error?.response?.status === 404) {
        if (categories.length > 0) {
          const buildTree = (parentId: number | null): ProductCategory[] => {
            return categories
              .filter(cat => cat.parent === parentId)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map(cat => ({
                ...cat,
                children: buildTree(cat.id)
              }));
          };
          setCategoryTree(buildTree(null));
        }
      }
    } finally {
      setIsLoadingTree(false);
    }
  }, [categories]);

  const loadCategoryStats = useCallback(async () => {
    setIsLoadingStats(true);
    
    try {
      const stats = await productCategoryService.getCategoryStats();
      setCategoryStats(stats);
    } catch (error: any) {
      console.error('❌ Erreur chargement stats:', error);
      
      if (error?.response?.status === 404) {
        const localStats = {
          total: categories.length,
          active: categories.filter(c => c.is_active).length,
          inactive: categories.filter(c => !c.is_active).length,
          root: categories.filter(c => !c.parent).length,
          subcategories: categories.filter(c => !!c.parent).length,
          totalProducts: categories.reduce((sum, cat) => sum + (cat.products_count || 0), 0),
          updated_at: new Date().toISOString()
        };
        setCategoryStats(localStats);
      }
    } finally {
      setIsLoadingStats(false);
    }
  }, [categories]);

  // ==================== CRUD CORRIGÉES POUR DJANGO ====================

  /**
   * ✅ CRÉATION CATÉGORIE - Utilise les fonctions de conversion
   */
  const createCategory = async (data: CreateProductCategoryDto) => {
    // ⭐ VALIDATION STRICTE
    const validationErrors = validateCategoryData(data);
    if (validationErrors.length > 0) {
      showToast({
        title: 'Erreur de validation',
        description: validationErrors.join('. '),
        type: 'error',
      });
      throw new Error(validationErrors.join('. '));
    }

    // ✅ S'assurer que sub_category est présent
    if (!data.sub_category) {
      showToast({
        title: 'Erreur de validation',
        description: 'Le champ "sub_category" est obligatoire',
        type: 'error',
      });
      throw new Error('Le champ "sub_category" est obligatoire');
    }

    // ✅ S'assurer que slug est présent
    if (!data.slug) {
      showToast({
        title: 'Erreur de validation',
        description: 'Le champ "slug" est obligatoire',
        type: 'error',
      });
      throw new Error('Le champ "slug" est obligatoire');
    }

    setIsCreating(true);
    
    try {
      // ⭐⭐ CORRECTION CRITIQUE : Nettoyer les données avant envoi
      const cleanData: CreateProductCategoryDto = {
        name: data.name.trim(),
        sub_category: data.sub_category.trim(), // ⭐ OBLIGATOIRE
        slug: data.slug.trim(),                // ⭐ OBLIGATOIRE
        description: data.description?.trim() || '',
        is_active: data.is_active ?? true,
        sort_order: data.sort_order ?? 0,
        metadata: data.metadata || {}
      };

      // ⭐ Gestion du parent
      if (data.parent && data.parent !== 0) {
        cleanData.parent = Number(data.parent);
      }
      // ❌ NE PAS envoyer parent pour catégorie racine

      console.log('🎯 Création catégorie (hook):', cleanData);
      
      const newCategory = await productCategoryService.createCategory(cleanData);
      
      showToast({
        title: 'Succès',
        description: `Catégorie "${cleanData.name}" créée avec succès`,
        type: 'success',
        duration: 3000,
      });
      
      await loadCategories();
      return newCategory;
    } catch (error: any) {
      console.error('❌ Erreur création catégorie:', error);
      
      let errorMessage = 'Échec de la création';
      let errorDetails = '';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'object') {
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorDetails += `• ${field}: ${messages.join(', ')}\n`;
            } else {
              errorDetails += `• ${field}: ${messages}\n`;
            }
          });
        } else {
          errorDetails = errorData;
        }
        
        errorMessage = 'Erreurs de validation Django';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast({
        title: 'Erreur de création',
        description: errorDetails || errorMessage,
        type: 'error',
        duration: 5000,
      });
      
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * ✅ MISE À JOUR CATÉGORIE
   */
  const updateCategory = async ({ id, data }: { id: number; data: UpdateProductCategoryDto }) => {
    const cleanData: UpdateProductCategoryDto = {};

    // ⭐ Copier uniquement les champs modifiés
    if (data.name !== undefined) {
      cleanData.name = data.name.trim();
    }

    if (data.sub_category !== undefined) {
      cleanData.sub_category = data.sub_category.trim();
    }

    if (data.slug !== undefined) {
      cleanData.slug = data.slug.trim();
    }

    if (data.description !== undefined) {
      cleanData.description = data.description.trim() || '';
    }

    if (data.is_active !== undefined) {
      cleanData.is_active = data.is_active;
    }

    if (data.sort_order !== undefined) {
      cleanData.sort_order = data.sort_order;
    }

    // ⭐ Gestion du parent
    if (data.parent !== undefined) {
      if (data.parent && data.parent !== 0) {
        cleanData.parent = Number(data.parent);
      }
      // Si parent === null, on ne l'envoie PAS
    }

    if (data.metadata !== undefined) {
      cleanData.metadata = data.metadata;
    }

    // Validation
    const validationErrors = validateCategoryData(cleanData);
    if (validationErrors.length > 0) {
      showToast({
        title: 'Erreur de validation',
        description: validationErrors.join('. '),
        type: 'error',
      });
      throw new Error(validationErrors.join('. '));
    }

    // Ne rien envoyer si aucun changement
    if (Object.keys(cleanData).length === 0) {
      showToast({
        title: 'Information',
        description: 'Aucune modification détectée',
        type: 'info',
      });
      return;
    }

    setIsUpdating(true);
    console.log(`🎯 Mise à jour catégorie ${id}:`, cleanData);
    
    try {
      const updatedCategory = await productCategoryService.updateCategory(id, cleanData);
      
      showToast({
        title: 'Succès',
        description: 'Catégorie mise à jour avec succès',
        type: 'success',
      });
      
      await loadCategories();
      return updatedCategory;
    } catch (error: any) {
      console.error('❌ Erreur mise à jour catégorie:', error);
      
      let errorMessage = 'Échec de la mise à jour';
      let errorDetails = '';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              errorDetails += `• ${field}: ${messages.join(', ')}\n`;
            } else {
              errorDetails += `• ${field}: ${messages}\n`;
            }
          });
        } else {
          errorDetails = errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast({
        title: 'Erreur de mise à jour',
        description: errorDetails || errorMessage,
        type: 'error',
      });
      
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCategory = async (id: number) => {
    setIsDeleting(true);
    try {
      const categoryToDelete = categories.find(c => c.id === id);
      if (!categoryToDelete) {
        throw new Error('Catégorie non trouvée');
      }

      const hasSubcategories = categories.some(cat => cat.parent === id);
      const hasProducts = (categoryToDelete.products_count || 0) > 0;
      
      let confirmMessage = `Supprimer la catégorie "${categoryToDelete.name}" ?`;
      
      if (hasSubcategories) {
        confirmMessage += '\n⚠️ Cette catégorie a des sous-catégories qui seront aussi supprimées.';
      }
      
      if (hasProducts) {
        confirmMessage += '\n⚠️ Cette catégorie contient des produits.';
      }
      
      if (!window.confirm(confirmMessage)) {
        setIsDeleting(false);
        return;
      }

      await productCategoryService.deleteCategory(id);
      
      showToast({
        title: 'Succès',
        description: 'Catégorie supprimée avec succès',
        type: 'success',
      });
      
      await loadCategories();
    } catch (error: any) {
      console.error('❌ Erreur suppression catégorie:', error);
      
      let errorMessage = 'Échec de la suppression';
      
      if (error?.response?.status === 404) {
        errorMessage = 'Catégorie non trouvée';
      } else if (error?.response?.status === 400) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          errorMessage = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
        } else {
          errorMessage = errorData || 'Impossible de supprimer : catégorie utilisée par des produits';
        }
      } else if (error?.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast({
        title: 'Erreur de suppression',
        description: errorMessage,
        type: 'error',
      });
      
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  // ==================== MÉTHODES UTILITAIRES ====================

  const getSubcategories = useCallback((parentId: number): ProductCategory[] => {
    return categories.filter(cat => cat.parent === parentId);
  }, [categories]);

  const getPossibleParents = useCallback((excludeId?: number): ProductCategory[] => {
    if (!excludeId) return categories;
    return categories.filter(cat => 
      cat.id !== excludeId && 
      (!cat.parent || cat.parent !== excludeId)
    );
  }, [categories]);

  const getCategoryHierarchy = useCallback(async (categoryId: number): Promise<ProductCategory[]> => {
    try {
      return await productCategoryService.getCategoryHierarchy(categoryId);
    } catch (error) {
      const hierarchy: ProductCategory[] = [];
      let currentId: number | null = categoryId;
      
      while (currentId) {
        const category = categories.find(c => c.id === currentId);
        if (!category) break;
        hierarchy.unshift(category);
        currentId = category.parent;
      }
      return hierarchy;
    }
  }, [categories]);

  const getRootCategories = useCallback((): ProductCategory[] => {
    return categories.filter(cat => !cat.parent);
  }, [categories]);

  const searchCategories = useCallback(async (searchTerm: string): Promise<ProductCategory[]> => {
    try {
      return await productCategoryService.searchCategories(searchTerm);
    } catch (error) {
      const term = searchTerm.toLowerCase();
      return categories.filter(cat => 
        cat.name.toLowerCase().includes(term) ||
        (cat.description && cat.description.toLowerCase().includes(term)) ||
        cat.sub_category?.toLowerCase().includes(term) ||
        cat.slug?.toLowerCase().includes(term)
      );
    }
  }, [categories]);

  // ==================== EFFETS ====================

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const initialize = async () => {
      try {
        await loadCategories();
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
      }
    };
    
    initialize();
  }, [loadCategories]);

  useEffect(() => {
    if (!isInitialized.current) return;
    
    const currentSearch = filters?.search;
    if (currentSearch === previousSearchRef.current) return;
    
    previousSearchRef.current = currentSearch;
    
    const timer = setTimeout(() => {
      loadCategories();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters?.search, loadCategories]);

  useEffect(() => {
    if (categories.length > 0 && isInitialized.current) {
      loadCategoryTree();
      loadCategoryStats();
    }
  }, [categories, loadCategoryTree, loadCategoryStats]);

  // ==================== RETOUR ====================

  return {
    // Données
    categories,
    categoryTree,
    categoryStats,
    
    // États
    isLoadingCategories,
    isLoadingTree,
    isLoadingStats,
    isCreating,
    isUpdating,
    isDeleting,
    
    // Fonctions CRUD
    refetchCategories: () => loadCategories(),
    refetchTree: loadCategoryTree,
    refetchStats: loadCategoryStats,
    createCategory,
    updateCategory,
    deleteCategory,
    
    // Fonctions utilitaires
    getSubcategories,
    getPossibleParents,
    getRootCategories,
    getCategoryHierarchy,
    searchCategories,
    
    // Méthodes de recherche/filtrage
    getPopularCategories: () => productCategoryService.getPopularCategories(5),
    getCategoryAnalytics: () => productCategoryService.getCategoryAnalytics(),
  };
};