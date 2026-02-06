// src/types/productTypes.ts

// Catégorie de produit - CORRESPOND EXACTEMENT AU MODÈLE DJANGO
export interface ProductCategory {
  id: number;
  name: string;                   // CharField max_length=150
  sub_category: string;           // ⭐ CHARFIELD OBLIGATOIRE - max_length=150
  slug: string;                   // SlugField unique
  parent: number | null;          // ForeignKey à 'self'
  description: string;            // TextField (blank=True)
  image: string | null;           // ImageField (blank=True, null=True)
  sort_order: number;             // IntegerField default=0
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_by: number;
  updated_by: number;
  
  // Champs calculés/relations
  products_count?: number;
  children?: ProductCategory[];   // related_name='children'
  parent_name?: string | null;
  created_by_name?: string;
  updated_by_name?: string;
}

// DTO pour la création - CHAMPS OBLIGATOIRES POUR DJANGO
export interface CreateProductCategoryDto {
  name: string;                   // ⭐ OBLIGATOIRE
  sub_category: string;           // ⭐ OBLIGATOIRE - CharField dans Django
  // slug est optionnel - Django peut le générer automatiquement
  description?: string;
  parent?: number | null;
  image?: string | null;
  sort_order?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// DTO pour la mise à jour
export interface UpdateProductCategoryDto extends Partial<CreateProductCategoryDto> {}

// Filtres pour les requêtes
export interface ProductCategoryFilter {
  search?: string;
  is_active?: boolean;
  parent?: number | null;
  page?: number;
  page_size?: number;
}

// Statistiques des catégories
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

// Pour les formulaires UI
export interface CategoryFormData {
  name: string;
  sub_category: string;           // ⭐ OBLIGATOIRE
  description: string;
  parent: number | null;
  is_active: boolean;
  sort_order: number;
  metadata: {
    icon: string;
    color: string;
  };
}