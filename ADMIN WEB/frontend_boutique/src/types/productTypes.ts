// src/types/productTypes.ts - VERSION CORRIGÉE POUR LE MODÈLE DJANGO
// =============================================================================
// TYPES POUR LES CATÉGORIES DE PRODUITS - CORRECTION FINALE
// =============================================================================

// =============================================================================
// 1. INTERFACES POUR LES DONNÉES BRUTES DE L'API DJANGO
// =============================================================================

/**
 * Interface pour les données retournées par l'API Django
 * Correspond EXACTEMENT au modèle Django
 */
export interface ApiProductCategory {
  id: number;
  name: string;                   // CharField max_length=150
  sub_category: string;           // ⭐ CharField OBLIGATOIRE - max_length=150 (nom technique)
  slug: string;                  // ⭐ SlugField unique (pour URLs)
  parent: number | null;         // ForeignKey à 'self' - NULL pour racine
  description: string;           // TextField (blank=True)
  image: string | null;          // ImageField (blank=True, null=True)
  sort_order: number;            // IntegerField default=0
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_by: number;
  updated_by: number;
  
  // Champs calculés/relations
  products_count?: number;
  children?: ApiProductCategory[];
  parent_details?: {
    id: number;
    name: string;
    sub_category: string;
  } | null;
  created_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  updated_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// =============================================================================
// 2. INTERFACES POUR LES DTO (CRÉATION/MISE À JOUR)
// =============================================================================

/**
 * DTO pour la création d'une catégorie
 * ⚠️ DOIT INCLURE LES DEUX CHAMPS : sub_category ET slug
 */
export interface CreateProductCategoryDto {
  name: string;                   // ⭐ OBLIGATOIRE
  sub_category: string;           // ⭐ OBLIGATOIRE - Nom technique pour Django
  slug: string;                  // ⭐ OBLIGATOIRE - Pour les URLs
  description?: string;          // Optionnel - blank=True
  parent?: number | null;        // ⚠️ Optionnel - null = catégorie racine
  image?: string | null;        // Optionnel
  sort_order?: number;          // Optionnel - default=0
  is_active?: boolean;          // Optionnel - default=True
  metadata?: Record<string, any> | null; // Optionnel
}

/**
 * DTO pour la mise à jour d'une catégorie
 */
export interface UpdateProductCategoryDto {
  name?: string;
  sub_category?: string;
  slug?: string;
  description?: string;
  parent?: number | null;
  image?: string | null;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, any> | null;
}

// =============================================================================
// 3. INTERFACES POUR LE FILTRAGE ET LA PAGINATION
// =============================================================================

/**
 * Filtres pour les requêtes de catégories
 */
export interface ProductCategoryFilter {
  search?: string;
  is_active?: boolean;
  parent?: number | null;
  page?: number;
  page_size?: number;
  ordering?: string;
  expand?: string;               // ex: 'parent,children'
}

/**
 * Réponse paginée Django REST Framework
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =============================================================================
// 4. INTERFACES POUR LES STATISTIQUES
// =============================================================================

/**
 * Statistiques des catégories
 */
export interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  root: number;
  subcategories: number;
  total_products: number;
  average_products_per_category: number;
  updated_at: string;
}

// =============================================================================
// 5. INTERFACES POUR L'UI (FORMULAIRES)
// =============================================================================

/**
 * Interface pour les formulaires UI
 * ⚠️ NE PAS UTILISER DIRECTEMENT AVEC L'API
 */
export interface CategoryFormData {
  name: string;
  sub_category: string;           // ⭐ OBLIGATOIRE
  slug: string;                  // ⭐ OBLIGATOIRE
  description: string;
  parent: number | null;         // ⚠️ null pour racine, PAS 0
  is_active: boolean;
  sort_order: number;
  metadata: {
    icon: string;                // Icône pour l'UI
    color: string;              // Couleur pour l'UI
  };
}

// =============================================================================
// 6. FONCTIONS UTILITAIRES DE CONVERSION
// =============================================================================

/**
 * Génère un slug à partir du nom
 */
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

/**
 * Génère une sub_category à partir du nom (version underscore)
 */
export function generateSubCategory(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_')     // ⚠️ Espaces et tirets → underscores
    .replace(/_+/g, '_')
    .substring(0, 100);
}

/**
 * Convertit les données UI vers DTO pour l'API
 */
export function categoryFormToDto(formData: CategoryFormData): CreateProductCategoryDto {
  const dto: CreateProductCategoryDto = {
    name: formData.name,
    sub_category: formData.sub_category,
    slug: formData.slug,
    description: formData.description || '',
    parent: formData.parent === 0 ? null : formData.parent,
    is_active: formData.is_active,
    sort_order: formData.sort_order,
    metadata: formData.metadata ? {
      icon: formData.metadata.icon,
      color: formData.metadata.color
    } : { icon: 'Tag', color: 'blue' }
  };

  // Supprimer parent si null ou undefined (NE PAS envoyer parent=null)
  if (dto.parent === null || dto.parent === undefined) {
    delete dto.parent;
  }

  // Supprimer les champs undefined
  Object.keys(dto).forEach(key => {
    if (dto[key as keyof CreateProductCategoryDto] === undefined) {
      delete dto[key as keyof CreateProductCategoryDto];
    }
  });

  return dto;
}

/**
 * Convertit les données API vers le format UI
 */
export function apiCategoryToForm(apiCategory: ApiProductCategory): CategoryFormData {
  return {
    name: apiCategory.name,
    sub_category: apiCategory.sub_category,
    slug: apiCategory.slug,
    description: apiCategory.description || '',
    parent: apiCategory.parent,
    is_active: apiCategory.is_active,
    sort_order: apiCategory.sort_order,
    metadata: {
      icon: apiCategory.metadata?.icon || 'Tag',
      color: apiCategory.metadata?.color || 'blue'
    }
  };
}

/**
 * Prépare les données pour l'envoi à l'API
 */
export function prepareCategoryForApi(formData: CategoryFormData): CreateProductCategoryDto {
  const dto = categoryFormToDto(formData);
  
  // 🔥 CORRECTION CRITIQUE : Ne jamais envoyer parent: 0
  if (dto.parent === 0) {
    delete dto.parent;
  }
  
  return dto;
}

/**
 * Valide les données d'une catégorie avant envoi
 */
export function validateCategoryData(data: Partial<CreateProductCategoryDto>): string[] {
  const errors: string[] = [];
  
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      errors.push('Le nom est obligatoire');
    } else if (data.name.length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    } else if (data.name.length > 150) {
      errors.push('Le nom ne doit pas dépasser 150 caractères');
    }
  }
  
  if (data.sub_category !== undefined) {
    if (!data.sub_category.trim()) {
      errors.push('La sous-catégorie est obligatoire');
    } else if (!/^[a-z0-9_]+$/.test(data.sub_category)) {
      errors.push('La sous-catégorie ne peut contenir que des lettres minuscules, chiffres et underscores');
    } else if (data.sub_category.length > 100) {
      errors.push('La sous-catégorie ne doit pas dépasser 100 caractères');
    }
  }
  
  if (data.slug !== undefined) {
    if (!data.slug.trim()) {
      errors.push('Le slug est obligatoire');
    } else if (!/^[a-z0-9-]+$/.test(data.slug)) {
      errors.push('Le slug ne peut contenir que des lettres minuscules, chiffres et tirets');
    } else if (data.slug.length > 100) {
      errors.push('Le slug ne doit pas dépasser 100 caractères');
    }
  }
  
  if (data.description && data.description.length > 500) {
    errors.push('La description ne doit pas dépasser 500 caractères');
  }
  
  if (data.sort_order !== undefined && (data.sort_order < 0 || data.sort_order > 999)) {
    errors.push('L\'ordre doit être compris entre 0 et 999');
  }
  
  return errors;
}

// =============================================================================
// 7. CONSTANTES ET CONFIGURATION
// =============================================================================

/**
 * Statuts possibles pour les catégories
 */
export const CATEGORY_STATUSES = {
  ACTIVE: true,
  INACTIVE: false
} as const;

/**
 * Options de tri pour les catégories
 */
export const CATEGORY_SORT_OPTIONS = [
  { value: 'name', label: 'Nom (A-Z)' },
  { value: '-name', label: 'Nom (Z-A)' },
  { value: 'sub_category', label: 'Code (A-Z)' },
  { value: '-sub_category', label: 'Code (Z-A)' },
  { value: 'sort_order', label: 'Ordre de tri' },
  { value: '-sort_order', label: 'Ordre de tri inversé' },
  { value: 'created_at', label: 'Plus récent' },
  { value: '-created_at', label: 'Plus ancien' }
] as const;

/**
 * Valeurs par défaut pour les catégories
 */
export const DEFAULT_CATEGORY_VALUES: Partial<CreateProductCategoryDto> = {
  sort_order: 0,
  is_active: true,
  metadata: { icon: 'Tag', color: 'blue' }
};