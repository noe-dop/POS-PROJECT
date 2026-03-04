// src/pages/SupplyPage.tsx - VERSION CORRIGÉE
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, Search, X, AlertCircle, ChevronLeft, 
  ChevronRight, Trash2, Package, Save, RefreshCw
} from 'lucide-react';
import { useSupplies, useSuppliers, useStores } from '../hooks/useSupply';
import { useAuth } from '../hooks/useAuth';
import { CreateSupplyData } from '../services/supplyService';
import api from '../services/api';

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  category_name?: string;
  price?: number;
  is_active: boolean;
}

interface RetailItem {
  id: number;
  ref: number;           // ID du produit
  name_product: string;  // Nom du produit
  qt_add: number;        // Quantité à ajouter
  price_ht: number;      // Prix d'achat unitaire
  total_ht: number;      // Total HT
}

// ============================================================================
// COMPOSANT DE CHARGEMENT
// ============================================================================

const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

// ============================================================================
// PAGE PRINCIPALE
// ============================================================================

const SupplyPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  
  // ============================================
  // ÉTATS
  // ============================================
  const [formData, setFormData] = useState<CreateSupplyData>({
    ref_supply: '',
    total_command: 0,
    status: 'pending',
    store: 0,
    supplier: null,
    utilisateur: 0,
  });

  const [retailItems, setRetailItems] = useState<RetailItem[]>([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États pour la sélection de produits
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');

  // État pour les produits
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  // ============================================
  // HOOKS
  // ============================================
  const { 
    createSupply,
    createMultipleRetailSupplies,
    loading: suppliesLoading,
    error: suppliesError,
    successMessage: suppliesSuccess,
    setSuccessMessage: setSuppliesSuccess,
    setErrorMessage: setSuppliesError
  } = useSupplies();
  
  const { suppliers = [], loading: suppliersLoading, error: suppliersError } = useSuppliers();
  const { stores = [], loading: storesLoading, error: storesError } = useStores();

  // ============================================
  // CHARGEMENT DES PRODUITS
  // ============================================
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        setProductsError('');
        console.log('📦 Chargement des produits...');
        
        const response = await api.get<any>('/products/');
        console.log('📦 Réponse produits:', response);
        
        // Gérer différents formats de réponse
        let productsList: Product[] = [];
        
        if (response?.data?.results && Array.isArray(response.data.results)) {
          productsList = response.data.results;
        } else if (response?.results && Array.isArray(response.results)) {
          productsList = response.results;
        } else if (Array.isArray(response)) {
          productsList = response;
        } else if (response?.data && Array.isArray(response.data)) {
          productsList = response.data;
        }
        
        setProducts(productsList);
        console.log(`📦 ${productsList.length} produits chargés`);
      } catch (error: any) {
        console.error('❌ Erreur chargement produits:', error);
        setProductsError(error.message || 'Erreur de chargement des produits');
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ============================================
  // INITIALISATION - CORRIGÉ
  // ============================================
  useEffect(() => {
    // Vérifier que l'utilisateur est authentifié et a un ID
    if (isAuthenticated && user?.id) {
      console.log('✅ Utilisateur connecté:', user);
      setFormData(prev => ({
        ...prev,
        utilisateur: Number(user.id)
      }));
    } else {
      console.warn('⚠️ Aucun utilisateur connecté ou ID manquant');
    }
  }, [user, isAuthenticated]);

  const generateReference = useCallback((): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${year}${month}${day}-${random}`;
  }, []);

  useEffect(() => {
    if (formData.ref_supply === '') {
      setFormData(prev => ({
        ...prev,
        ref_supply: generateReference(),
      }));
    }
  }, [generateReference, formData.ref_supply]);

  // Afficher les erreurs des hooks
  useEffect(() => {
    if (suppliersError) setFormError(suppliersError);
    else if (storesError) setFormError(storesError);
    else if (suppliesError) setFormError(suppliesError);
    else if (productsError) setFormError(productsError);
  }, [suppliersError, storesError, suppliesError, productsError]);

  // Afficher les succès
  useEffect(() => {
    if (suppliesSuccess) {
      setFormSuccess(suppliesSuccess);
      setTimeout(() => {
        setFormSuccess('');
        setSuppliesSuccess(null);
      }, 3000);
    }
  }, [suppliesSuccess, setSuppliesSuccess]);

  // Debug - à supprimer en production
  useEffect(() => {
    console.log('=================================');
    console.log('👤 User:', user);
    console.log('🔐 Authenticated:', isAuthenticated);
    console.log('🏪 Stores:', stores);
    console.log('📞 Suppliers:', suppliers);
    console.log('📦 Produits:', products);
    console.log('📝 FormData:', formData);
    console.log('=================================');
  }, [user, isAuthenticated, stores, suppliers, products, formData]);

  // ============================================
  // GESTION DES PRODUITS
  // ============================================
  const filteredProducts = useMemo(() => {
    if (!searchProduct) return products;
    return products.filter((p: Product) => 
      p.name?.toLowerCase().includes(searchProduct.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchProduct.toLowerCase())
    );
  }, [products, searchProduct]);

  const handleSelectProduct = useCallback((product: Product) => {
    const exists = retailItems.find(item => item.ref === product.id);
    if (exists) {
      alert('Ce produit est déjà dans la liste');
      return;
    }

    const newItem: RetailItem = {
      id: Date.now(),
      ref: product.id,
      name_product: product.name,
      qt_add: 1,
      price_ht: product.price || 0,
      total_ht: product.price || 0,
    };

    setRetailItems(prev => [...prev, newItem]);
    setShowProductSelector(false);
    setSearchProduct('');
  }, [retailItems]);

  const handleQuantityChange = useCallback((index: number, value: number) => {
    if (value < 0) return;
    setRetailItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        qt_add: value,
        total_ht: value * updated[index].price_ht,
      };
      return updated;
    });
  }, []);

  const handlePriceChange = useCallback((index: number, value: number) => {
    if (value < 0) return;
    setRetailItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        price_ht: value,
        total_ht: updated[index].qt_add * value,
      };
      return updated;
    });
  }, []);

  const handleRemoveProduct = useCallback((index: number) => {
    setRetailItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================
  // CALCUL DES TOTAUX
  // ============================================
  const totals = useMemo(() => {
    const totalArticles = retailItems.reduce((sum, item) => sum + item.qt_add, 0);
    const subTotalHT = retailItems.reduce((sum, item) => sum + item.total_ht, 0);
    const tva = subTotalHT * 0.2;
    const totalTTC = subTotalHT + tva;
    
    return { totalArticles, subTotalHT, tva, totalTTC };
  }, [retailItems]);

  useEffect(() => {
    setFormData(prev => ({ 
      ...prev, 
      total_command: totals.subTotalHT
    }));
  }, [totals.subTotalHT]);

  // ============================================
  // CRÉATION DE LA COMMANDE - CORRIGÉE
  // ============================================
  const handleCreateSupply = useCallback(async () => {
    // Validations
    if (!isAuthenticated || !user?.id) {
      setFormError('Vous devez être connecté pour créer un approvisionnement');
      return;
    }

    if (!formData.store || formData.store === 0) {
      setFormError('Veuillez sélectionner un magasin');
      return;
    }

    if (retailItems.length === 0) {
      setFormError('Veuillez ajouter au moins un produit');
      return;
    }

    const productsWithoutPrice = retailItems.filter(item => item.price_ht <= 0);
    if (productsWithoutPrice.length > 0) {
      setFormError('Veuillez définir un prix pour tous les produits');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      // CORRECTION: Utiliser l'ID utilisateur directement
      const supplyData = {
        ref_supply: formData.ref_supply,
        total_command: Number(totals.subTotalHT.toFixed(2)),
        status: 'pending',
        store: Number(formData.store),
        supplier: formData.supplier && formData.supplier > 0 ? Number(formData.supplier) : null,
        utilisateur: Number(user.id), // Utiliser l'ID de l'utilisateur connecté
      };

      console.log('📦 Données envoyées à Django:', JSON.stringify(supplyData, null, 2));
      
      const newSupply = await createSupply(supplyData);
      console.log('✅ Supply créé:', newSupply);
      
      // Préparer les données pour RetailSupply
      const retailData = retailItems.map(item => ({
        ref: item.ref,
        name_product: item.name_product,
        qt_add: item.qt_add,
        total_pdx: item.qt_add, // total_pdx = quantité ajoutée (à ajuster selon votre logique métier)
      }));

      console.log('📋 Création RetailSupply:', retailData);
      
      if (retailData.length > 0) {
        await createMultipleRetailSupplies(newSupply.id, retailData);
      }
      
      setFormSuccess('Commande créée avec succès !');
      
      // Réinitialiser le formulaire
      setRetailItems([]);
      setFormData(prev => ({
        ...prev,
        ref_supply: generateReference(),
        total_command: 0,
        supplier: null,
        store: 0,
      }));

      setTimeout(() => {
        setFormSuccess('');
      }, 3000);
      
    } catch (error: any) {
      console.error('❌ Erreur création:', error);
      
      if (error.response?.data) {
        console.error('📋 Erreurs Django:', error.response.data);
        
        if (typeof error.response.data === 'object') {
          const errors = Object.entries(error.response.data)
            .map(([key, value]) => {
              if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
              if (typeof value === 'string') return `${key}: ${value}`;
              return `${key}: ${JSON.stringify(value)}`;
            })
            .join('; ');
          setFormError(`Erreur: ${errors}`);
        } else {
          setFormError(`Erreur: ${error.response.data}`);
        }
      } else {
        setFormError(error instanceof Error ? error.message : 'Erreur lors de la création');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, retailItems, totals.subTotalHT, user, isAuthenticated, createSupply, createMultipleRetailSupplies, generateReference]);

  // ============================================
  // FORMATTEURS
  // ============================================
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  const formatDate = (): string => {
    return new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // ============================================
  // GESTION DU CHARGEMENT
  // ============================================
  if (storesLoading || suppliersLoading || productsLoading || suppliesLoading) {
    return <LoadingSpinner />;
  }

  // ============================================
  // RENDU
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Fil d'Ariane */}
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <span>Approvisionnements</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-gray-900 font-medium">Nouvelle fiche</span>
        </div>

        {/* Messages */}
        {formError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">{formSuccess}</p>
          </div>
        )}

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Nouvel approvisionnement</h1>
          <p className="text-gray-600 flex flex-wrap items-center gap-2">
            Statut: <span className="text-yellow-600 font-medium bg-yellow-50 px-3 py-1 rounded-full text-sm">Brouillon</span>
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Utilisateur: {user.username || user.email} (ID: {user.id})
            </p>
          )}
          {!isAuthenticated && (
            <p className="text-sm text-red-500 mt-1">
              ⚠️ Vous n'êtes pas connecté
            </p>
          )}
        </div>

        {/* Informations Générales */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Informations Générales</h2>
          <p className="text-sm text-gray-500 mb-6">Détails de la commande et du fournisseur.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de commande</label>
              <input
                type="text"
                value={formData.ref_supply}
                readOnly
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de commande</label>
              <input
                type="text"
                value={formatDate()}
                readOnly
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Produits + Récapitulatif */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Tableau des produits */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 sm:p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Produits</h2>
            <p className="text-sm text-gray-500 mb-6">Liste des articles à approvisionner.</p>

            {retailItems.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 mb-4">Aucun produit sélectionné</p>
                <button
                  onClick={() => setShowProductSelector(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Sélectionner des produits
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Produit</th>
                          <th className="text-left py-4 px-4 text-sm font-medium text-gray-600 hidden sm:table-cell">SKU</th>
                          <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Qté</th>
                          <th className="text-left py-4 px-4 text-sm font-medium text-gray-600 hidden md:table-cell">P.U. HT (€)</th>
                          <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Total HT (€)</th>
                          <th className="text-left py-4 px-4 text-sm font-medium text-gray-600"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {retailItems.map((item, index) => {
                          const product = products.find((p: Product) => p.id === item.ref);
                          return (
                            <tr key={item.id}>
                              <td className="py-4 px-4">
                                <span className="text-gray-900 text-sm">{item.name_product}</span>
                              </td>
                              <td className="py-4 px-4 hidden sm:table-cell">
                                <span className="text-sm text-gray-600">{product?.sku || 'N/A'}</span>
                              </td>
                              <td className="py-4 px-4">
                                <input
                                  type="number"
                                  value={item.qt_add}
                                  onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 sm:w-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  min="1"
                                />
                              </td>
                              <td className="py-4 px-4 hidden md:table-cell">
                                <input
                                  type="number"
                                  value={item.price_ht}
                                  onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                                  className="w-20 sm:w-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="py-4 px-4 font-medium text-gray-900 text-sm">
                                {formatCurrency(item.total_ht)}
                              </td>
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => handleRemoveProduct(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={() => setShowProductSelector(true)}
                  className="mt-6 flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter un produit
                </button>
              </>
            )}
          </div>

          {/* Colonne de droite - Récapitulatif et boutons */}
          {retailItems.length > 0 && (
            <div className="lg:w-80 space-y-6">
              {/* Récapitulatif */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Récapitulatif</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Total articles</span>
                    <span className="font-medium text-gray-900">{totals.totalArticles} unités</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>Sous-total HT</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.subTotalHT)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-600 text-sm">
                    <span>TVA (20%)</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totals.tva)}</span>
                  </div>
                  
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-200">
                    <span>MONTANT TOTAL TTC</span>
                    <span className="text-blue-600">{formatCurrency(totals.totalTTC)}</span>
                  </div>
                </div>
              </div>

              {/* Magasin et Fournisseur */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Magasin <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.store}
                    onChange={(e) => setFormData({...formData, store: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value={0}>Sélectionner un magasin</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                  <select
                    value={formData.supplier || 0}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setFormData({
                        ...formData, 
                        supplier: value > 0 ? value : null
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value={0}>Sélectionner un fournisseur (optionnel)</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleCreateSupply}
                  disabled={isSubmitting || !formData.store || formData.store === 0 || !isAuthenticated}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      En cours...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Enregistrer
                    </>
                  )}
                </button>
                
                <button className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                  Enregistrer comme brouillon
                </button>
                
                <button 
                  onClick={() => {
                    if (retailItems.length > 0) {
                      if (window.confirm('Voulez-vous vraiment annuler ?')) {
                        setRetailItems([]);
                      }
                    }
                  }}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE SÉLECTION DES PRODUITS */}
        {showProductSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Sélectionner des produits</h3>
                  <button
                    onClick={() => setShowProductSelector(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm">
                        {products.length === 0 
                          ? 'Aucun produit dans la base de données' 
                          : 'Aucun résultat pour votre recherche'}
                      </p>
                    </div>
                  ) : (
                    filteredProducts.map((product: Product) => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right ml-4">
                          {product.price ? (
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
                          ) : (
                            <p className="text-xs text-gray-400">Prix non défini</p>
                          )}
                          <p className="text-xs text-gray-500">ID: {product.id}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        <p className="text-sm text-gray-500 mb-12">
          Les prix d'achat unitaires modifiés ici ne seront pas répertoriés sur le catalogue général mais uniquement sur cet approvisionnement spécifique.
        </p>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          © 2024 ProcureFlow Management System. Tous droits réservés.
        </footer>
      </main>
    </div>
  );
};

export default SupplyPage;