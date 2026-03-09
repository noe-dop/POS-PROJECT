// src/types/productTypes.ts

// Catégorie de produit
export interface ProductCategory {
  data: ProductCategory | PromiseLike<ProductCategory>;
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  description: string | null;
  image: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata: Record<string, any> | null;
  created_by: number;
  updated_by: number;
  products_count?: number;
  created_by_name?: string;
  updated_by_name?: string;
  parent_name?: string | null;
  children?: ProductCategory[];
}

// DTO pour la création
export interface CreateProductCategoryDto {
  name: string;
  description?: string;
  parent?: number | null;
  is_active?: boolean;
  sort_order?: number;
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
  description: string;
  parent: number | null;
  is_active: boolean;
  sort_order: number;
  metadata: {
    icon: string;
    color: string;
  };
}