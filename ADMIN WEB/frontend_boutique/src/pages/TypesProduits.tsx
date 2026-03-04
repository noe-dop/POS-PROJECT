// src/pages/TypesProduits.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ShoppingBag, 
  Check,
  X,
  Loader2,
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  AlertCircle,
  Globe,
  Hash,
  Eye,
  EyeOff
} from 'lucide-react';
import { useProductCategories } from '../hooks/useProductCategories';
import { generateSubCategory, generateSlug } from '../services/productCategoryService';

interface Category {
  id?: number;
  name: string;
  sub_category: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  parent: number | null;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

const TypesProduits: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [createAsSubcategory, setCreateAsSubcategory] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Category>({
    name: '',
    sub_category: '',
    description: '',
    is_active: true,
    sort_order: 0,
    slug: '',
    parent: null
  });

  const {
    categories,
    isLoadingCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getSubcategories,
    isCreating,
    isUpdating,
    isDeleting,
    refetch,
  } = useProductCategories({
    search: searchTerm,
  });

  const generateSlugFromName = (name: string): string => {
    return generateSlug(name);
  };

  useEffect(() => {
    if (formData.name && !selectedCategory) {
      const slug = generateSlugFromName(formData.name);
      const subCategoryValue = generateSubCategory(formData.name);
      
      setFormData(prev => ({ 
        ...prev, 
        slug,
        sub_category: subCategoryValue 
      }));
    }
  }, [formData.name, selectedCategory]);

  const toggleCategoryExpansion = (categoryId: number) => {
    setExpandedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const expandAllCategories = () => {
    const categoriesWithSubcategories = categories
      .filter((category: Category) => {
        const directSubcats = categories.filter((cat: Category) => cat.parent === category.id);
        return directSubcats.length > 0;
      })
      .map((category: Category) => category.id!);
    
    setExpandedCategories(categoriesWithSubcategories);
  };

  const collapseAllCategories = () => {
    setExpandedCategories([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la catégorie est obligatoire';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Le nom doit contenir au moins 2 caractères';
    } else if (formData.name.length > 150) {
      newErrors.name = 'Le nom ne doit pas dépasser 150 caractères';
    }
    
    if (!formData.sub_category.trim()) {
      newErrors.sub_category = 'Le code technique est obligatoire';
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Le slug est obligatoire';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets';
    } else if (formData.slug.length > 100) {
      newErrors.slug = 'Le slug ne doit pas dépasser 100 caractères';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'La description ne doit pas dépasser 500 caractères';
    }
    
    if (formData.sort_order < 0) {
      newErrors.sort_order = 'L\'ordre doit être positif';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSubcategory = (parentId: number, parentName: string) => {
    setCreateAsSubcategory(parentId);
    setFormData({
      name: '',
      sub_category: '',
      description: '',
      is_active: true,
      sort_order: getSubcategories(parentId).length + 1,
      slug: '',
      parent: parentId
    });
    setShowForm(true);
    setSelectedCategory(null);
    setErrors({});
    setApiError(null);
  };

  const handleCreateCategory = async () => {
    if (!validateForm()) return;

    setApiError(null);

    const subCategoryValue = formData.sub_category || generateSubCategory(formData.name);
    const slugValue = formData.slug || generateSlugFromName(formData.name);

    const categoryData: Category = {
      name: formData.name.trim(),
      sub_category: subCategoryValue,
      slug: slugValue,
      description: formData.description?.trim() || '',
      is_active: formData.is_active,
      sort_order: formData.sort_order || 0,
      parent: createAsSubcategory !== null ? createAsSubcategory : null
    };

    try {
      await createCategory(categoryData);
      
      setFormData({
        name: '',
        sub_category: '',
        description: '',
        is_active: true,
        sort_order: categories.length + 1,
        slug: '',
        parent: null
      });
      setShowForm(false);
      setCreateAsSubcategory(null);
      setErrors({});
      setApiError(null);
      
      if (createAsSubcategory) {
        if (!expandedCategories.includes(createAsSubcategory)) {
          setExpandedCategories(prev => [...prev, createAsSubcategory]);
        }
      }
      
      setTimeout(() => refetch(), 100);
      
    } catch (error: any) {
      console.error('❌ ERREUR CRÉATION:', error);
      
      if (error.response?.data) {
        const apiErrors = error.response.data;
        const fieldErrors: Record<string, string> = {};
        
        if (typeof apiErrors === 'object') {
          Object.entries(apiErrors).forEach(([key, value]) => {
            fieldErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
          });
        } else {
          setApiError(`Erreur API: ${JSON.stringify(apiErrors)}`);
        }
        
        setErrors(fieldErrors);
      } else {
        setApiError('Erreur réseau ou serveur lors de la création');
      }
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !validateForm()) return;

    setApiError(null);

    const updateData: Partial<Category> = {
      name: formData.name.trim(),
      sub_category: formData.sub_category,
      slug: formData.slug,
      description: formData.description?.trim() || '',
      is_active: formData.is_active,
      sort_order: formData.sort_order
    };

    if (formData.parent !== selectedCategory.parent) {
      updateData.parent = formData.parent;
    }

    const hasChanges = Object.keys(updateData).some(key => 
      updateData[key as keyof Category] !== selectedCategory[key as keyof Category]
    );

    if (!hasChanges) {
      alert('Aucune modification détectée');
      return;
    }

    try {
      await updateCategory({
        id: selectedCategory.id!,
        data: updateData
      });
      
      setSelectedCategory(null);
      setShowForm(false);
      setFormData({
        name: '',
        sub_category: '',
        description: '',
        is_active: true,
        sort_order: 0,
        slug: '',
        parent: null
      });
      setCreateAsSubcategory(null);
      setErrors({});
      setApiError(null);
      
      setTimeout(() => refetch(), 100);
      
    } catch (error: any) {
      console.error('❌ ERREUR MISE À JOUR:', error);
      
      if (error.response?.data) {
        const apiErrors = error.response.data;
        const fieldErrors: Record<string, string> = {};
        
        Object.entries(apiErrors).forEach(([key, value]) => {
          fieldErrors[key] = Array.isArray(value) ? value.join(', ') : String(value);
        });
        
        setErrors(fieldErrors);
      }
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    const hasSubcategories = getSubcategories(id).length > 0;
    const category = categories.find((c: Category) => c.id === id);
    const hasProducts = category?.products_count || 0;
    
    let message = `Supprimer la catégorie "${name}" ?`;
    if (hasSubcategories) {
      message += '\n\n⚠️ ATTENTION: Cette catégorie contient des sous-catégories qui seront également supprimées.';
    }
    if (hasProducts > 0) {
      message += `\n\n📦 ${hasProducts} produit(s) seront affectés.`;
    }
    
    if (!window.confirm(message)) return;

    try {
      await deleteCategory(id);
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
      setExpandedCategories(prev => prev.filter(catId => catId !== id));
      
      setTimeout(() => refetch(), 100);
      
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      if (error.response?.data) {
        alert(`Erreur: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  };

  const loadCategoryIntoForm = (category: Category) => {
    setFormData({
      name: category.name,
      sub_category: category.sub_category,
      description: category.description || '',
      is_active: category.is_active,
      sort_order: category.sort_order || 0,
      slug: category.slug,
      parent: category.parent
    });
    setSelectedCategory(category);
    setShowForm(true);
    setCreateAsSubcategory(null);
    setErrors({});
    setApiError(null);
  };

  const handleNewCategory = () => {
    setShowForm(true);
    setSelectedCategory(null);
    setFormData({
      name: '',
      sub_category: '',
      description: '',
      is_active: true,
      sort_order: categories.length + 1,
      slug: '',
      parent: null
    });
    setCreateAsSubcategory(null);
    setErrors({});
    setApiError(null);
  };

  const renderForm = () => {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Nom de la catégorie *
            </label>
            <span className="text-xs text-gray-500">
              {formData.name.length}/150
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`w-full pl-10 pr-4 py-3 border ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-xl focus:ring-2 outline-none transition-colors bg-gradient-to-r from-gray-50 to-white`}
              placeholder="Ex: Vêtements, Électronique..."
              maxLength={150}
              required
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.name}
            </p>
          )}
        </div>

        <input
          type="hidden"
          name="sub_category"
          value={formData.sub_category}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Slug (URL) *
            </label>
            <span className="text-xs text-gray-500">
              {formData.slug.length}/100
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Globe className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                const value = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '');
                setFormData({ ...formData, slug: value });
                if (errors.slug) setErrors({ ...errors, slug: '' });
              }}
              className={`w-full pl-10 pr-4 py-3 border ${errors.slug ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-xl focus:ring-2 outline-none transition-colors bg-gradient-to-r from-gray-50 to-white font-mono`}
              placeholder="vetements-electronique"
              maxLength={100}
            />
          </div>
          <p className="text-xs text-gray-500">
            Identifiant unique pour l'URL. Généré automatiquement à partir du nom.
          </p>
          {errors.slug && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.slug}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-700">
              Description
            </label>
            <span className={`text-xs ${formData.description.length > 450 ? 'text-red-500' : 'text-gray-500'}`}>
              {formData.description.length}/500
            </span>
          </div>
          <textarea
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
              if (errors.description) setErrors({ ...errors, description: '' });
            }}
            rows={3}
            className={`w-full px-4 py-3 border ${errors.description ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-xl focus:ring-2 outline-none transition-colors bg-gradient-to-r from-gray-50 to-white resize-none`}
            placeholder="Décrivez cette catégorie (optionnel)..."
            maxLength={500}
          />
          {errors.description && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Ordre d'affichage
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min="0"
              max="2147483647"
              value={formData.sort_order}
              onChange={(e) => {
                const value = Math.max(0, Number(e.target.value) || 0);
                setFormData({ ...formData, sort_order: value });
                if (errors.sort_order) setErrors({ ...errors, sort_order: '' });
              }}
              className={`w-full pl-10 pr-4 py-3 border ${errors.sort_order ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'} rounded-xl focus:ring-2 outline-none transition-colors bg-gradient-to-r from-gray-50 to-white`}
            />
          </div>
          {errors.sort_order && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.sort_order}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Statut
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: true })}
              className={`px-4 py-3 border rounded-xl transition-all flex items-center justify-center gap-2 ${
                formData.is_active
                  ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 shadow-sm'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="font-medium">Actif</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: false })}
              className={`px-4 py-3 border rounded-xl transition-all flex items-center justify-center gap-2 ${
                !formData.is_active
                  ? 'border-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 shadow-sm'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <span className="font-medium">Inactif</span>
            </button>
          </div>
        </div>

        {!selectedCategory && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Catégorie parente
            </label>
            <select
              value={formData.parent || ''}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : null;
                setFormData({ ...formData, parent: value });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gradient-to-r from-gray-50 to-white"
            >
              <option value="">Aucune (catégorie racine)</option>
              {categories
                .filter((c: Category) => !c.parent)
                .map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500">
              Laissez vide pour créer une catégorie racine
            </p>
          </div>
        )}

        <div className="pt-4 space-y-3">
          <button
            onClick={selectedCategory ? handleUpdateCategory : handleCreateCategory}
            disabled={isCreating || isUpdating || !formData.name.trim() || !formData.slug.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
          >
            {isCreating || isUpdating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : selectedCategory ? (
              <>
                <Check className="w-5 h-5" />
                <span>Mettre à jour</span>
              </>
            ) : createAsSubcategory ? (
              <>
                <FolderPlus className="w-5 h-5" />
                <span>Créer la sous-catégorie</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Créer la catégorie</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setShowForm(false);
              setSelectedCategory(null);
              setCreateAsSubcategory(null);
              setErrors({});
              setApiError(null);
            }}
            className="w-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-medium py-3.5 px-4 rounded-xl transition-all"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  };

  const renderCategoryDetails = (category: Category) => {
    const parentCategory = category.parent ? categories.find((c: Category) => c.id === category.parent) : null;
    
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              getSubcategories(category.id!).length > 0 
                ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600' 
                : 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600'
            }`}>
              {getSubcategories(category.id!).length > 0 ? 
                <Folder className="w-6 h-6" /> : 
                <Tag className="w-6 h-6" />
              }
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-gray-600">
                  Slug: <span className="font-mono text-blue-600">{category.slug}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Code: <span className="font-mono text-green-600">{category.sub_category}</span>
                </p>
              </div>
              {category.description && (
                <p className="text-sm text-gray-500 mt-2">{category.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-5 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4">Statistiques</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{category.products_count || 0}</div>
                <div className="text-sm text-gray-600">Produits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{getSubcategories(category.id!).length}</div>
                <div className="text-sm text-gray-600">Sous-catégories</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => loadCategoryIntoForm(category)}
                className="col-span-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border border-blue-600 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <Edit2 className="w-4 h-4" />
                <span className="font-medium">Modifier</span>
              </button>
              
              <button
                onClick={() => handleCreateSubcategory(category.id!, category.name)}
                className="col-span-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border border-green-600 rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="font-medium">Sous-catégorie</span>
              </button>
            </div>
            
            <button
              onClick={() => handleDeleteCategory(category.id!, category.name)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white border border-red-600 rounded-xl transition-all shadow-sm hover:shadow-md"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-medium">Supprimer</span>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4">Informations</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Code technique</span>
                <span className="font-mono text-green-600">{category.sub_category}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Slug</span>
                <span className="font-mono text-blue-600">{category.slug}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Statut</span>
                <span className={`font-medium px-3 py-1 rounded-full ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {category.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Catégorie parente</span>
                <span className="font-medium text-blue-600">
                  {parentCategory ? parentCategory.name : 'Aucune (racine)'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Ordre d'affichage</span>
                <span className="font-medium">{category.sort_order || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryTree = (parentId: number | null = null, level = 0) => {
    const filteredCategories = categories
      .filter((cat: Category) => cat.parent === parentId)
      .sort((a: Category, b: Category) => (a.sort_order || 0) - (b.sort_order || 0));

    if (filteredCategories.length === 0 && parentId === null) {
      return (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Aucune catégorie trouvée
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm
              ? 'Aucune catégorie ne correspond à votre recherche'
              : 'Commencez par créer votre première catégorie'}
          </p>
          <button
            onClick={handleNewCategory}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Créer une catégorie</span>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredCategories.map((category: Category) => {
          const hasSubcategories = getSubcategories(category.id!).length > 0;
          const isExpanded = expandedCategories.includes(category.id!);
          const isActive = category.is_active;
          
          return (
            <div key={category.id} className="space-y-2">
              <div
                className={`border rounded-xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 ${
                  selectedCategory?.id === category.id && !showForm
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-white ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-blue-200 bg-white'
                } ${!isActive ? 'opacity-75' : ''}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setShowForm(false);
                }}
                style={{ marginLeft: `${level * 28}px` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      hasSubcategories 
                        ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600'
                    }`}>
                      {hasSubcategories ? <Folder className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-semibold text-gray-900 truncate ${!isActive ? 'text-gray-500' : ''}`}>
                          {category.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          {!isActive && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">Inactif</span>
                          )}
                          {category.parent && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">Sous-catégorie</span>
                          )}
                          {category.products_count && category.products_count > 0 && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                              {category.products_count} produit{category.products_count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{category.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {hasSubcategories && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryExpansion(category.id!);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                    
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateSubcategory(category.id!, category.name);
                        }}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadCategoryIntoForm(category);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id!, category.name);
                        }}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {isExpanded && hasSubcategories && (
                <div className="ml-8 border-l-2 border-blue-100 pl-4">
                  {renderCategoryTree(category.id, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <ShoppingBag className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-6 text-gray-600 font-medium">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Gestion des Catégories
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Organisez vos produits par catégories et sous-catégories
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-xl font-bold text-blue-600">{categories.length}</div>
            </div>
            <button
              onClick={handleNewCategory}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvelle Catégorie</span>
            </button>
          </div>
        </div>
      </div>

      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800">Erreur de l'API</h4>
            <p className="text-sm text-red-700 mt-1">{apiError}</p>
          </div>
          <button onClick={() => setApiError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Arborescence des Catégories</h2>
                <div className="flex items-center gap-2">
                  <button onClick={expandAllCategories} className="text-sm bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-300">
                    Tout développer
                  </button>
                  <button onClick={collapseAllCategories} className="text-sm bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-300">
                    Tout réduire
                  </button>
                </div>
              </div>
              
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher une catégorie..."
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-gradient-to-r from-gray-50 to-white shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
              <div className="space-y-4">
                {renderCategoryTree()}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          {showForm ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {selectedCategory 
                        ? 'Modifier la Catégorie' 
                        : createAsSubcategory 
                        ? 'Créer une Sous-Catégorie'
                        : 'Nouvelle Catégorie'
                      }
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedCategory 
                        ? 'Modifiez les informations de cette catégorie'
                        : 'Remplissez les informations pour créer une nouvelle catégorie'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSelectedCategory(null);
                      setCreateAsSubcategory(null);
                      setErrors({});
                      setApiError(null);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
              
              {createAsSubcategory && (
                <div className="m-6 -mt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <FolderPlus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-700">Création de sous-catégorie</p>
                        <p className="text-xs text-blue-600">
                          Parent: <strong>{categories.find((c: Category) => c.id === createAsSubcategory)?.name}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {renderForm()}
            </div>
          ) : selectedCategory ? (
            renderCategoryDetails(selectedCategory)
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Détails</h2>
              </div>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Sélectionnez une catégorie</h3>
                <p className="text-gray-600 mb-6">Cliquez sur une catégorie dans la liste pour voir ses détails</p>
                <button onClick={handleNewCategory} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                  <Plus className="w-5 h-5" />
                  <span>Créer une catégorie</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypesProduits;