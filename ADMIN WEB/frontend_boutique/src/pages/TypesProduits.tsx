// src/pages/TypesProduits.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  ShoppingBag, 
  MoreVertical,
  Check,
  X,
  Loader2,
  ChevronRight,
  Folder
} from 'lucide-react';
import { useProductCategories } from '../hooks/useProductCategories';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from '../types/productTypes';

const TypesProduits: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: null as number | null,
    is_active: true,
    sort_order: 0,
    metadata: {}
  });

  // Utilisation du hook avec les nouvelles fonctionnalités
  const {
    categories,
    isLoadingCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getPossibleParents,
    getSubcategories,
    isCreating,
    isUpdating,
    isDeleting,
  } = useProductCategories({
    search: searchTerm,
  });

  // Récupérer les catégories parentes possibles
  const parentCategories = getPossibleParents(selectedCategory?.id);

  // Fonction pour générer un slug
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // ==================== GESTION FORMULAIRE CORRIGÉE ====================

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    // ✅ CORRECTION : sub_category est un CharField, donc on envoie une CHAÎNE
    const categoryData: any = {
      name: formData.name,
      is_active: formData.is_active,
      slug: generateSlug(formData.name),
      // ⚠️ IMPORTANT : sub_category doit être une CHAÎNE (CharField dans Django)
      sub_category: formData.parent ? "Sous-catégorie" : "Catégorie principale"
    };

    // ✅ Ajouter description seulement si elle existe
    if (formData.description && formData.description.trim()) {
      categoryData.description = formData.description;
    }

    // ✅ Ajouter parent seulement si c'est un nombre valide
    if (formData.parent !== null && formData.parent !== undefined && !isNaN(formData.parent)) {
      categoryData.parent = formData.parent;
    }

    // ✅ Ajouter sort_order seulement si défini
    if (formData.sort_order !== undefined && formData.sort_order !== null && formData.sort_order !== 0) {
      categoryData.sort_order = formData.sort_order;
    }

    console.log('=== DONNÉES ENVOYÉES AU BACKEND ===');
    console.log(JSON.stringify(categoryData, null, 2));
    console.log('Type de sub_category:', typeof categoryData.sub_category);

    try {
      await createCategory(categoryData);
      
      // Réinitialiser le formulaire
      setFormData({
        name: '',
        description: '',
        parent: null,
        is_active: true,
        sort_order: categories.length + 1,
        metadata: {}
      });
      setShowForm(false);
    } catch (error: any) {
      console.error('=== ERREUR CRÉATION ===');
      console.error('Message:', error.message);
      console.error('Réponse backend:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      // Afficher l'erreur utilisateur
      if (error.response?.data) {
        const errorMsg = typeof error.response.data === 'object' 
          ? JSON.stringify(error.response.data, null, 2)
          : error.response.data;
        alert(`Erreur: ${errorMsg}`);
      } else {
        alert('Erreur lors de la création de la catégorie');
      }
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    // ✅ CORRECTION : sub_category doit être une chaîne aussi pour l'update
    const updateData: any = {
      name: formData.name,
      is_active: formData.is_active,
      // Pour update, régénérer le slug si le nom a changé
      slug: selectedCategory.name !== formData.name ? generateSlug(formData.name) : selectedCategory.slug,
      // Chaîne, pas booléen
      sub_category: formData.parent ? "Sous-catégorie" : "Catégorie principale"
    };

    // ✅ Toujours envoyer description (même vide pour la mise à jour)
    updateData.description = formData.description || '';

    // ✅ Pour update, on peut envoyer sort_order même à 0
    if (formData.sort_order !== undefined && formData.sort_order !== null) {
      updateData.sort_order = formData.sort_order;
    }

    // ✅ Ajouter parent si défini
    if (formData.parent !== null && formData.parent !== undefined) {
      updateData.parent = formData.parent;
    }

    console.log('=== DONNÉES MISE À JOUR ===');
    console.log(JSON.stringify(updateData, null, 2));

    try {
      await updateCategory({
        id: selectedCategory.id,
        data: updateData
      });
      
      setSelectedCategory(null);
      setShowForm(false);
      setFormData({
        name: '',
        description: '',
        parent: null,
        is_active: true,
        sort_order: 0,
        metadata: {}
      });
    } catch (error: any) {
      console.error('=== ERREUR MISE À JOUR ===');
      console.error('Message:', error.message);
      console.error('Réponse backend:', error.response?.data);
      
      if (error.response?.data) {
        const errorMsg = typeof error.response.data === 'object' 
          ? JSON.stringify(error.response.data, null, 2)
          : error.response.data;
        alert(`Erreur: ${errorMsg}`);
      } else {
        alert('Erreur lors de la mise à jour de la catégorie');
      }
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!window.confirm(`Supprimer la catégorie "${name}" ?`)) return;

    try {
      await deleteCategory(id);
      if (selectedCategory?.id === id) {
        setSelectedCategory(null);
      }
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      if (error.response?.data) {
        alert(`Erreur: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  };

  const loadCategoryIntoForm = (category: any) => {
    setFormData({
      name: category.name,
      description: category.description || '',
      parent: category.parent || null,
      is_active: category.is_active,
      sort_order: category.sort_order || 0,
      metadata: category.metadata || {}
    });
    setSelectedCategory(category);
    setShowForm(true);
  };

  const handleNewCategory = () => {
    setShowForm(true);
    setSelectedCategory(null);
    setFormData({
      name: '',
      description: '',
      parent: null,
      is_active: true,
      sort_order: categories.length + 1,
      metadata: {}
    });
  };

  // ==================== FONCTIONS D'AFFICHAGE ====================

  const renderCategoryItem = (category: any) => {
    const subcategories = getSubcategories(category.id);
    const hasSubcategories = subcategories.length > 0;
    
    return (
      <div key={category.id} className="space-y-2">
        <div
          className={`border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
            selectedCategory?.id === category.id && !showForm
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${!category.is_active ? 'opacity-70' : ''}`}
          onClick={() => {
            setSelectedCategory(category);
            setShowForm(false);
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasSubcategories ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                {hasSubcategories ? <Folder className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  {!category.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      Inactif
                    </span>
                  )}
                  {category.parent && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                      Sous-catégorie
                    </span>
                  )}
                  {hasSubcategories && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
                      {subcategories.length} sous-cat.
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                )}
                {category.parent && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <ChevronRight className="w-3 h-3" />
                    <span>Parent: {categories.find(c => c.id === category.parent)?.name || 'Inconnu'}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium whitespace-nowrap">
                {category.products_count || 0} produits
              </span>
              <div className="flex items-center gap-1">
                {/* Icône Modifier - BLEU */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadCategoryIntoForm(category);
                  }}
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                {/* Icône Supprimer - ROUGE */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(category.id, category.name);
                  }}
                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Supprimer"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Affichage des sous-catégories */}
        {hasSubcategories && (
          <div className="ml-8 pl-4 border-l-2 border-gray-200 space-y-2">
            {subcategories.map(subcategory => renderCategoryItem(subcategory))}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDU ====================

  if (isLoadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des catégories...</p>
        </div>
      </div>
    );
  }

  const rootCategories = categories.filter(cat => !cat.parent);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestion des Catégories de Produits</h1>
            <p className="text-gray-600 mt-2">Organisez vos produits par catégories et sous-catégories.</p>
          </div>
          <div className="text-sm text-gray-500">
            {categories.length} catégorie{categories.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section gauche - Liste des catégories */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Catégories de Produits</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNewCategory}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouvelle Catégorie</span>
                  </button>
                </div>
              </div>
              
              {/* Barre de recherche */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher une catégorie..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Liste des catégories */}
              <div className="space-y-4">
                {rootCategories.length > 0 ? (
                  rootCategories
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map(category => renderCategoryItem(category))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="w-8 h-8 text-gray-400" />
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
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Créer une catégorie</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section droite - Détails ou Formulaire */}
        <div className="lg:col-span-1">
          {showForm ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedCategory ? 'Modifier la Catégorie' : 'Créer une Nouvelle Catégorie'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedCategory(null);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la Catégorie *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Ex: Vêtements, Électronique..."
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.name.length}/100 caractères
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Slug généré: {generateSlug(formData.name) || '(vide)'}
                  </p>
                </div>

                {/* CHAMP Sous catégorie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sous catégorie de
                  </label>
                  <select
                    value={formData.parent || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      parent: e.target.value ? Number(e.target.value) : null 
                    })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
                  >
                    <option value="">Aucune (Catégorie principale)</option>
                    {parentCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {!category.is_active && ' (Inactif)'}
                      </option>
                    ))}
                  </select>
                  {formData.parent && (
                    <p className="mt-1 text-sm text-gray-500">
                      Cette catégorie sera marquée comme "Sous-catégorie"
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Description de la catégorie..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 caractères
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: Math.max(0, Math.min(999, Number(e.target.value))) })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">0-999</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_active: true })}
                        className={`flex-1 px-4 py-2.5 border rounded-lg transition-colors ${
                          formData.is_active
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" />
                          <span>Actif</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_active: false })}
                        className={`flex-1 px-4 py-2.5 border rounded-lg transition-colors ${
                          !formData.is_active
                            ? 'border-gray-500 bg-gray-50 text-gray-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <X className="w-4 h-4" />
                          <span>Inactif</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={selectedCategory ? handleUpdateCategory : handleCreateCategory}
                    disabled={isCreating || isUpdating || !formData.name.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isCreating || isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : selectedCategory ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Mettre à jour</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Créer la Catégorie</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setSelectedCategory(null);
                    }}
                    className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : selectedCategory ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-lg ${getSubcategories(selectedCategory.id).length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                  {getSubcategories(selectedCategory.id).length > 0 ? 
                    <Folder className="w-6 h-6" /> : 
                    <ShoppingBag className="w-6 h-6" />
                  }
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{selectedCategory.name}</h2>
                  <p className="text-sm text-gray-500">{selectedCategory.description}</p>
                  {selectedCategory.parent && (
                    <p className="text-xs text-gray-400 mt-1">
                      Sous-catégorie de: {categories.find(c => c.id === selectedCategory.parent)?.name || 'Inconnu'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Produits</span>
                    <span className="font-semibold text-gray-900">{selectedCategory.products_count || 0}</span>
                  </div>
                  {getSubcategories(selectedCategory.id).length > 0 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Sous-catégories</span>
                      <span className="font-semibold text-gray-900">{getSubcategories(selectedCategory.id).length}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700">Actions</h3>
                  {/* Bouton Modifier - BLEU */}
                  <button
                    onClick={() => loadCategoryIntoForm(selectedCategory)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Modifier la catégorie</span>
                  </button>
                  
                  {/* Bouton Supprimer - ROUGE */}
                  <button
                    onClick={() => handleDeleteCategory(selectedCategory.id, selectedCategory.name)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white border border-red-600 rounded-lg transition-colors"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer la catégorie</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-700 mb-2">Informations</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut</span>
                      <span className={`font-medium ${selectedCategory.is_active ? 'text-green-600' : 'text-gray-600'}`}>
                        {selectedCategory.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ordre d'affichage</span>
                      <span className="font-medium">{selectedCategory.sort_order || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Slug</span>
                      <code className="text-gray-800 font-mono">{selectedCategory.slug || 'N/A'}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span className={`font-medium ${selectedCategory.parent ? 'text-blue-600' : 'text-gray-600'}`}>
                        {selectedCategory.sub_category || 'Catégorie principale'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date création</span>
                      <span className="font-medium">
                        {selectedCategory.created_at ? new Date(selectedCategory.created_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {selectedCategory.parent && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Catégorie parente</span>
                        <span className="font-medium">
                          {categories.find(c => c.id === selectedCategory.parent)?.name || 'Non définie'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Sélectionnez une catégorie
                </h3>
                <p className="text-gray-600 mb-6">
                  Cliquez sur une catégorie dans la liste pour voir ses détails et informations.
                </p>
                <button
                  onClick={handleNewCategory}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Ou créez une nouvelle catégorie</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pied de page */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-gray-500 text-sm">
          Système de gestion des catégories • Made with 😊 <span className="font-medium text-gray-700">Visily</span>
        </p>
      </div>
    </div>
  );
};

export default TypesProduits;