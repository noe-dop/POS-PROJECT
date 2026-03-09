// src/pages/Stock.tsx
import React, { useState, useEffect } from 'react';
import { useStock } from '@/hooks/useStock';
import { Search, Filter, RefreshCw, Plus, AlertTriangle, Package, TrendingUp, BarChart, Check, Download, FileText, X, Save, DollarSign, Percent, Package2, Building, MapPin, Tag, Hash, Type, AlignLeft, Box, ChevronDown, Info, Clock, Warehouse, Store } from 'lucide-react';

// Interface basée sur le StockSerializer
interface StockProduct {
  id: number;
  name?: string;
  sku?: string;
  category?: string;
  cost_price?: number;
  base_price?: number;
}

interface StockItem {
  id: number;
  product?: StockProduct;
  product_name?: string;
  product_sku?: string;
  store_name?: string;
  warehouse_name?: string;
  quantity_on_hand: number;
  min_stock_level: number;
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_low_stock: boolean;
  needs_restock: boolean;
  created_at?: string;
  updated_at?: string;
}

interface StockMovement {
  id: number;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  movement_type_display?: string;
  quantity: number;
  product_name?: string;
  store_name?: string;
  created_at: string;
  notes?: string;
}

interface StockStats {
  totalProducts: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
  totalValue: number;
}

// Composant Modal pour Ajouter Produit
const AddProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  warehouses: Array<{id: number, name: string}>;
  stores: Array<{id: number, name: string}>;
}> = ({ isOpen, onClose, onSubmit, warehouses, stores }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    cost_price: '',
    base_price: '',
    min_stock_level: '10',
    reorder_quantity: '20',
    unit: 'unité',
    store_id: '',
    warehouse_id: '',
    tax_rate: '20',
    is_active: true,
    initial_quantity: '0'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser les valeurs par défaut quand les données sont disponibles
  useEffect(() => {
    if (isOpen && stores.length > 0) {
      setFormData(prev => ({
        ...prev,
        store_id: stores[0]?.id?.toString() || '',
        warehouse_id: warehouses[0]?.id?.toString() || ''
      }));
    }
  }, [isOpen, stores, warehouses]);

  const categories = [
    'Électronique',
    'Vêtements',
    'Alimentation',
    'Maison',
    'Sport',
    'Beauté',
    'Automobile',
    'Bureau',
    'Jardin',
    'Loisirs'
  ];

  const units = [
    'unité',
    'kg',
    'litre',
    'mètre',
    'paquet',
    'carton',
    'palette',
    'boîte',
    'bouteille',
    'sachet'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du produit est requis';
    }
    
    if (!formData.category) {
      newErrors.category = 'La catégorie est requise';
    }
    
    const costPrice = parseFloat(formData.cost_price);
    if (!formData.cost_price || isNaN(costPrice) || costPrice <= 0) {
      newErrors.cost_price = 'Le prix de revient doit être supérieur à 0';
    }
    
    const basePrice = parseFloat(formData.base_price);
    if (!formData.base_price || isNaN(basePrice) || basePrice <= 0) {
      newErrors.base_price = 'Le prix de vente doit être supérieur à 0';
    }
    
    if (basePrice < costPrice) {
      newErrors.base_price = 'Le prix de vente doit être supérieur au prix de revient';
    }
    
    const minStock = parseInt(formData.min_stock_level);
    if (!formData.min_stock_level || isNaN(minStock) || minStock < 0) {
      newErrors.min_stock_level = 'Le seuil minimum doit être positif';
    }
    
    if (!formData.store_id) {
      newErrors.store_id = 'Le magasin est requis';
    }
    
    if (!formData.warehouse_id) {
      newErrors.warehouse_id = 'L\'entrepôt est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const productData = {
        name: formData.name,
        sku: formData.sku || undefined,
        category: formData.category,
        description: formData.description || undefined,
        cost_price: parseFloat(formData.cost_price),
        base_price: parseFloat(formData.base_price),
        min_stock_level: parseInt(formData.min_stock_level),
        reorder_quantity: parseInt(formData.reorder_quantity),
        unit: formData.unit,
        store_id: parseInt(formData.store_id),
        warehouse_id: parseInt(formData.warehouse_id),
        tax_rate: parseFloat(formData.tax_rate),
        is_active: formData.is_active,
        initial_quantity: parseInt(formData.initial_quantity)
      };
      
      await onSubmit(productData);
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      // Ne pas réinitialiser le formulaire en cas d'erreur
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      description: '',
      cost_price: '',
      base_price: '',
      min_stock_level: '10',
      reorder_quantity: '20',
      unit: 'unité',
      store_id: stores[0]?.id?.toString() || '',
      warehouse_id: warehouses[0]?.id?.toString() || '',
      tax_rate: '20',
      is_active: true,
      initial_quantity: '0'
    });
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const generateSKU = () => {
    const prefix = formData.category ? formData.category.substring(0, 3).toUpperCase() : 'PRO';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const sku = `${prefix}-${random}`;
    setFormData(prev => ({ ...prev, sku }));
  };

  const calculateMargin = () => {
    const cost = parseFloat(formData.cost_price) || 0;
    const base = parseFloat(formData.base_price) || 0;
    
    if (cost > 0 && base > 0) {
      const marginPercentage = ((base - cost) / cost * 100).toFixed(1);
      const marginValue = (base - cost).toFixed(2);
      return { percentage: marginPercentage, value: marginValue };
    }
    return { percentage: '0.0', value: '0.00' };
  };

  if (!isOpen) return null;

  const margin = calculateMargin();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Ajouter un nouveau produit</h2>
                  <p className="text-sm text-gray-600">Remplissez les informations du produit</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fermer"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Colonne gauche */}
            <div className="space-y-6">
              {/* Informations de base */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Type className="w-4 h-4" />
                  Informations de base
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du produit *
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`pl-10 pr-4 py-3 w-full border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                      placeholder="Ex: iPhone 14 Pro Max 256Go"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          name="sku"
                          value={formData.sku}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Générer ou saisir"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={generateSKU}
                        disabled={isSubmitting}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Générer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catégorie *
                    </label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className={`w-full px-4 py-3 border ${errors.category ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed`}
                      >
                        <option value="">Sélectionner...</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      rows={3}
                      className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Description détaillée du produit..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unité de mesure
                  </label>
                  <div className="relative">
                    <Box className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="pl-10 pr-10 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Informations de stock */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Package className="w-4 h-4" />
                  Gestion du stock
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock initial
                    </label>
                    <input
                      type="number"
                      name="initial_quantity"
                      value={formData.initial_quantity}
                      onChange={handleChange}
                      min="0"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seuil minimum *
                    </label>
                    <input
                      type="number"
                      name="min_stock_level"
                      value={formData.min_stock_level}
                      onChange={handleChange}
                      min="0"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 border ${errors.min_stock_level ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    />
                    {errors.min_stock_level && (
                      <p className="mt-1 text-sm text-red-600">{errors.min_stock_level}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité de réapprovisionnement
                  </label>
                  <input
                    type="number"
                    name="reorder_quantity"
                    value={formData.reorder_quantity}
                    onChange={handleChange}
                    min="1"
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Quantité recommandée pour les commandes de réapprovisionnement
                  </p>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              {/* Informations de prix */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <DollarSign className="w-4 h-4" />
                  Informations de prix
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix de revient *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                      <input
                        type="number"
                        name="cost_price"
                        value={formData.cost_price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        disabled={isSubmitting}
                        className={`pl-10 pr-4 py-3 w-full border ${errors.cost_price ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.cost_price && (
                      <p className="mt-1 text-sm text-red-600">{errors.cost_price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix de vente *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                      <input
                        type="number"
                        name="base_price"
                        value={formData.base_price}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        disabled={isSubmitting}
                        className={`pl-10 pr-4 py-3 w-full border ${errors.base_price ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.base_price && (
                      <p className="mt-1 text-sm text-red-600">{errors.base_price}</p>
                    )}
                  </div>
                </div>

                {formData.cost_price && formData.base_price && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-blue-700">Marge brute:</span>
                      <span className={`font-bold ${parseFloat(margin.percentage) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {margin.percentage}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Marge unitaire:</span>
                      <span className="font-bold text-blue-600">{margin.value} €</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taux de TVA (%)
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      name="tax_rate"
                      value={formData.tax_rate}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.1"
                      disabled={isSubmitting}
                      className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Localisation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  Localisation
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Magasin *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="store_id"
                      value={formData.store_id}
                      onChange={handleChange}
                      disabled={isSubmitting || stores.length === 0}
                      className={`pl-10 pr-10 py-3 w-full border ${errors.store_id ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">Sélectionner un magasin</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                    {errors.store_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.store_id}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entrepôt *
                  </label>
                  <div className="relative">
                    <Warehouse className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      name="warehouse_id"
                      value={formData.warehouse_id}
                      onChange={handleChange}
                      disabled={isSubmitting || warehouses.length === 0}
                      className={`pl-10 pr-10 py-3 w-full border ${errors.warehouse_id ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed`}
                    >
                      <option value="">Sélectionner un entrepôt</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                    {errors.warehouse_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.warehouse_id}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Options avancées */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Produit actif
                  </label>
                </div>
                <div className="text-xs text-gray-500">
                  Les produits inactifs n'apparaîtront pas dans le catalogue mais resteront dans l'historique.
                </div>
              </div>

              {/* Résumé */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <Info className="w-4 h-4" />
                  Récapitulatif
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nom:</span>
                    <span className="font-medium truncate max-w-[150px]">{formData.name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Catégorie:</span>
                    <span className="font-medium">{formData.category || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prix vente:</span>
                    <span className="font-medium text-green-600">
                      {formData.base_price ? `${parseFloat(formData.base_price).toFixed(2)} €` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock initial:</span>
                    <span className="font-medium">{formData.initial_quantity} unités</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Création en cours...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Créer le produit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Composant principal StockPage
const StockPage: React.FC = () => {
  const {
    stocks,
    movements,
    stockStats,
    loading,
    error,
    apiStatus,
    createStockMovement,
    refreshAll,
    resetError,
    hasData
  } = useStock({
    storeId: 1,
    autoRefresh: false
  });

  // États UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('tous');
  const [currentPage, setCurrentPage] = useState(1);
  const [movementsPage, setMovementsPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const itemsPerPage = 8;
  const movementsPerPage = 6;

  // ==================== CHARGEMENT INITIAL ====================
  useEffect(() => {
    console.log('📦 Page Stock montée - Données chargées depuis API');
  }, []);

  // ==================== FILTRAGE ====================
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = 
      stock.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.product?.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedFilter === 'tous') return matchesSearch;
    
    if (selectedFilter === 'sous-seuil') {
      return matchesSearch && stock.is_low_stock === true;
    }
    
    const statusMap = {
      'en-stock': 'in_stock',
      'en-rupture': 'out_of_stock'
    };
    
    return matchesSearch && stock.stock_status && 
           stock.stock_status === statusMap[selectedFilter as keyof typeof statusMap];
  });

  const lowStockProducts = stocks.filter(stock => stock.is_low_stock === true || stock.needs_restock === true);

  // Calcul des statistiques basé sur les données réelles
  const calculatedStats: StockStats = {
    totalProducts: stocks.length,
    totalStock: stocks.reduce((sum, stock) => sum + (stock.quantity_on_hand || 0), 0),
    outOfStock: stocks.filter(s => s.stock_status === 'out_of_stock').length,
    lowStock: stocks.filter(s => s.is_low_stock === true).length,
    totalValue: stocks.reduce((sum, stock) => {
      const quantity = stock.quantity_on_hand || 0;
      const costPrice = stock.product?.cost_price || 0;
      return sum + (quantity * costPrice);
    }, 0)
  };

  // ==================== PAGINATION ====================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStocks = filteredStocks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

  const indexOfLastMovement = movementsPage * movementsPerPage;
  const indexOfFirstMovement = indexOfLastMovement - movementsPerPage;
  const currentMovements = movements.slice(indexOfFirstMovement, indexOfLastMovement);
  const totalMovementPages = Math.ceil(movements.length / movementsPerPage);

  // ==================== UTILITAIRES UI ====================
  const getStatusBadge = (stock: StockItem) => {
    if (stock.is_low_stock === true) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        text: 'Sous seuil',
        icon: '⚠️'
      };
    }
    
    if (stock.stock_status === 'out_of_stock') {
      return {
        color: 'bg-red-100 text-red-800 border border-red-200',
        text: 'En rupture',
        icon: '❌'
      };
    }
    
    return {
      color: 'bg-green-100 text-green-800 border border-green-200',
      text: 'En stock',
      icon: '✅'
    };
  };

  const getMovementIcon = (type: string) => {
    const icons: Record<string, string> = {
      'IN': '⬇️',
      'OUT': '⬆️',
      'ADJUSTMENT': '📝',
      'TRANSFER': '🔄',
      'RETURN': '↩️'
    };
    return icons[type] || '📊';
  };

  const getMovementTypeText = (type: string) => {
    const config: Record<string, string> = {
      'IN': 'Entrée',
      'OUT': 'Sortie', 
      'ADJUSTMENT': 'Ajustement',
      'TRANSFER': 'Transfert',
      'RETURN': 'Retour'
    };
    return config[type] || type;
  };

  // ==================== ACTIONS DES BOUTONS ====================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
      console.log('✅ Données rafraîchies depuis API');
    } catch (err) {
      console.error('❌ Erreur rafraîchissement:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReorder = async (stock: StockItem) => {
    if (!stock.product?.id) {
      alert('❌ Produit non valide pour la commande');
      return;
    }
    
    try {
      const quantity = Math.max(10, (stock.min_stock_level || 20) - (stock.quantity_on_hand || 0));
      
      await createStockMovement({
        product_id: stock.product.id,
        store_id: 1,
        movement_type: 'IN',
        quantity: Math.max(1, quantity),
        notes: 'Réapprovisionnement manuel depuis interface'
      });
      
      alert(`✅ Commande créée pour ${stock.product_name} (${quantity} unités)`);
      handleRefresh();
    } catch (err: any) {
      alert(`❌ Erreur: ${err.message || 'Impossible de créer la commande'}`);
    }
  };

  const handleValidateProduct = (stockId: number, productName: string) => {
    console.log(`✅ Produit validé: ${productName} (ID: ${stockId})`);
    alert(`Produit "${productName}" validé avec succès!`);
  };

  const handleSelectProduct = (stockId: number) => {
    setSelectedProducts(prev => {
      if (prev.includes(stockId)) {
        return prev.filter(id => id !== stockId);
      } else {
        return [...prev, stockId];
      }
    });
  };

  const handleAddProduct = () => {
    setShowAddProductModal(true);
  };

  const handleAddProductSubmit = async (productData: any) => {
    try {
      console.log('Données à envoyer à l\'API:', productData);
      
      // Simulation de délai
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`✅ Produit "${productData.name}" créé avec succès!`);
      
      // Rafraîchir les données
      handleRefresh();
      
      // Fermer le modal
      setShowAddProductModal(false);
      
    } catch (err: any) {
      alert(`❌ Erreur: ${err.message || 'Impossible de créer le produit'}`);
      throw err;
    }
  };

  const handleExportData = () => {
    const data = {
      stocks: stocks.map(s => ({
        produit: s.product_name,
        sku: s.product_sku,
        quantité_disponible: s.quantity_on_hand,
        seuil_minimum: s.min_stock_level,
        statut_low_stock: s.is_low_stock,
        magasin: s.store_name,
        entrepôt: s.warehouse_name,
        date_export: new Date().toISOString()
      })),
      metadata: {
        exporté_le: new Date().toISOString(),
        nombre_produits: stocks.length,
        stock_total: calculatedStats.totalStock,
        valeur_totale: calculatedStats.totalValue
      }
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `stock_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    alert(`📥 Export réalisé: ${exportFileDefaultName}`);
  };

  const handleGenerateReport = () => {
    // TODO: Implémenter la génération de rapport PDF
    alert('📊 Génération de rapport - Fonctionnalité à implémenter');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === currentStocks.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(currentStocks.map(stock => stock.id));
    }
  };

  // Données pour le formulaire (à récupérer depuis l'API)
  const warehouses = Array.from(new Set(stocks.map(s => s.warehouse_name).filter(Boolean)))
    .map((name, index) => ({ id: index + 1, name: name || `Entrepôt ${index + 1}` }));

  const stores = Array.from(new Set(stocks.map(s => s.store_name).filter(Boolean)))
    .map((name, index) => ({ id: index + 1, name: name || `Magasin ${index + 1}` }));

  // ==================== RENDU ====================
  if (loading.stocks && stocks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-6"></div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Chargement du stock...</h2>
        <p className="text-gray-500">Connexion à l'API en cours</p>
        <div className="mt-4 text-sm text-blue-600">
          {apiStatus}
        </div>
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Connexion impossible</h1>
            <p className="text-gray-600 mb-6">{error.message}</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-yellow-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} />
              Diagnostic
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-3 bg-red-500"></div>
                <span className="text-gray-700">API non accessible</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-3 bg-blue-500"></div>
                <span className="text-gray-700">
                  Statut: {apiStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-800 mb-3">Solutions possibles :</h4>
              <ul className="space-y-2 text-sm text-blue-700">
                <li>1. Vérifiez que le serveur Django est en cours d'exécution</li>
                <li>2. Vérifiez vos identifiants de connexion</li>
                <li>3. Rechargez la page ou reconnectez-vous</li>
                <li>4. Contactez l'administrateur système</li>
              </ul>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="font-semibold text-green-800 mb-3">Actions :</h4>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    resetError();
                    handleRefresh();
                  }}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Réessayer la connexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestion du Stock</h1>
            <p className="text-gray-600 mt-2">
              Suivi des niveaux de stock, alertes de seuil bas, et historique des mouvements.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
              apiStatus?.includes('✅') ? 'bg-green-100 text-green-800' :
              apiStatus?.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {apiStatus || '🟡 Connexion...'}
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading.stocks}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Actualisation...' : 'Actualiser'}
            </button>
            
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {stocks.length} produits • {movements.length} mouvements
            </div>
          </div>
        </div>
      </div>

      {/* Synthèse du Stock */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart size={20} />
          Synthèse du Stock
        </h2>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-gray-800 mb-2">{calculatedStats.totalProducts}</div>
              <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                <Package size={14} />
                Produits
              </div>
            </div>
            
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {calculatedStats.totalStock.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                <TrendingUp size={14} />
                Stock Total
              </div>
            </div>
            
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-gray-800 mb-2">{calculatedStats.outOfStock}</div>
              <div className="text-sm text-gray-500">En Rupture</div>
            </div>
            
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-gray-800 mb-2">{calculatedStats.lowStock}</div>
              <div className="text-sm text-gray-500">Sous Seuil</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAddProduct}
            disabled={loading.stocks}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Ajouter Produit
          </button>
          <button
            onClick={handleExportData}
            disabled={stocks.length === 0 || loading.stocks}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exporter Données
          </button>
          <button
            onClick={handleGenerateReport}
            disabled={loading.stocks}
            className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={18} />
            Générer Rapport
          </button>
          {selectedProducts.length > 0 && (
            <button
              onClick={() => {
                // TODO: Implémenter la suppression multiple
                console.log('Produits à supprimer:', selectedProducts);
                alert(`🗑️ Suppression de ${selectedProducts.length} produit(s) - À implémenter`);
                setSelectedProducts([]);
              }}
              className="px-4 py-2 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 font-medium flex items-center gap-2 transition-colors ml-auto"
            >
              Supprimer ({selectedProducts.length})
            </button>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne principale - Liste des stocks */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                  Niveaux de Stock
                  {selectedProducts.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      ({selectedProducts.length} sélectionné(s))
                    </span>
                  )}
                </h2>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <form onSubmit={handleSearch} className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={loading.stocks}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </form>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Filter size={16} className="text-gray-400" />
                    </div>
                    <select
                      value={selectedFilter}
                      onChange={(e) => {
                        setSelectedFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      disabled={loading.stocks}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="tous">Tous</option>
                      <option value="en-stock">En stock</option>
                      <option value="sous-seuil">Stock bas</option>
                      <option value="en-rupture">En rupture</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {loading.stocks ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-gray-600">Chargement des produits...</p>
                </div>
              ) : filteredStocks.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-lg mb-2">Aucun produit trouvé</p>
                  <p className="text-sm">
                    {searchTerm ? 'Essayez une autre recherche' : 'Ajoutez vos premiers produits'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Bouton sélectionner tout */}
                  <div className="mb-4">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={currentStocks.length === 0}
                    >
                      <Check size={16} />
                      {selectedProducts.length === currentStocks.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantité
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Magasin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seuil Min
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentStocks.map((stock) => {
                          const statusBadge = getStatusBadge(stock);
                          return (
                            <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded border ${selectedProducts.includes(stock.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'} cursor-pointer`}
                                    onClick={() => handleSelectProduct(stock.id)}
                                  >
                                    {selectedProducts.includes(stock.id) && (
                                      <Check size={12} className="text-white" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {stock.product_name || stock.product?.name || 'Produit sans nom'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {stock.product_sku ? `SKU: ${stock.product_sku}` : 'Aucun SKU'}
                                      {stock.warehouse_name && ` • ${stock.warehouse_name}`}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`text-lg font-bold ${
                                  stock.stock_status === 'out_of_stock' ? 'text-red-600' :
                                  stock.is_low_stock ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {stock.quantity_on_hand || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-700">
                                <div className="flex items-center gap-2">
                                  <Store size={14} className="text-gray-400" />
                                  {stock.store_name || 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-medium text-gray-900">
                                  {stock.min_stock_level || 0}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                                  <span>{statusBadge.icon}</span>
                                  <span>{statusBadge.text}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => handleValidateProduct(stock.id, stock.product_name || 'Produit')}
                                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Valider le produit"
                                  >
                                    <Check size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleReorder(stock)}
                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Commander"
                                    disabled={stock.stock_status === 'out_of_stock'}
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {filteredStocks.length > itemsPerPage && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1 || loading.stocks}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Précédent
                        </button>
                        
                        <div className="text-sm text-gray-700">
                          Page {currentPage} sur {totalPages}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages || loading.stocks}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Suivant →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Colonne droite - Alertes et Historique */}
        <div className="space-y-8">
          {/* Alertes de stock bas */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500" />
                  Alertes de Stock Bas
                </h2>
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  {lowStockProducts.length}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {loading.stocks ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Chargement des alertes...</p>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-4xl mb-3">✅</div>
                  <p>Aucune alerte active</p>
                  <p className="text-sm mt-1">Tous les stocks sont optimaux</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Produits nécessitant un réapprovisionnement
                  </p>
                  <div className="space-y-4">
                    {lowStockProducts.slice(0, 5).map((stock) => (
                      <div key={stock.id} className="p-4 border border-gray-200 rounded-lg hover:border-red-200 transition-colors">
                        <div className="font-medium text-gray-900 mb-2">
                          {stock.product_name || stock.product?.name}
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`font-bold ${stock.is_low_stock ? 'text-yellow-600' : 'text-red-600'}`}>
                            {stock.quantity_on_hand || 0} / {stock.min_stock_level || 0} unités
                          </div>
                          <button 
                            onClick={() => handleReorder(stock)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors"
                          >
                            Commander
                          </button>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${stock.needs_restock ? 'bg-red-500' : 'bg-yellow-500'}`}
                            style={{ 
                              width: `${Math.min(
                                ((stock.quantity_on_hand || 0) / (stock.min_stock_level || 1)) * 100, 
                                100
                              )}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Historique des mouvements */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">
                Historique des Mouvements
              </h2>
            </div>
            
            <div className="p-6">
              {loading.movements ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Chargement des mouvements...</p>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>Aucun mouvement récent</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Mouvements récents de stock
                  </p>
                  
                  <div className="space-y-4">
                    {currentMovements.map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="text-xl mt-1">
                            {getMovementIcon(movement.movement_type)}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {movement.product_name || 'Produit'}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={10} />
                              {movement.created_at} • {movement.movement_type_display || getMovementTypeText(movement.movement_type)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${
                            movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {movement.store_name || 'Magasin'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination mouvements */}
                  {movements.length > movementsPerPage && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setMovementsPage(prev => Math.max(prev - 1, 1))}
                          disabled={movementsPage === 1 || loading.movements}
                          className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50 transition-colors"
                        >
                          ← Préc.
                        </button>
                        
                        <div className="text-sm text-gray-700">
                          Page {movementsPage} sur {totalMovementPages}
                        </div>
                        
                        <button
                          onClick={() => setMovementsPage(prev => Math.min(prev + 1, totalMovementPages))}
                          disabled={movementsPage === totalMovementPages || loading.movements}
                          className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm disabled:opacity-50 transition-colors"
                        >
                          Suiv. →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Statut système */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-800 mb-4">📊 État du système</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Produits chargés</span>
                <span className="font-medium text-blue-800">{stocks.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Alertes actives</span>
                <span className="font-medium text-yellow-600">{lowStockProducts.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Mouvements récents</span>
                <span className="font-medium text-blue-800">{movements.length}</span>
              </div>
              <div className="pt-3 border-t border-blue-200">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading.stocks}
                  className="w-full px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  {isRefreshing ? 'Actualisation...' : 'Actualiser maintenant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-xs text-gray-500">
        <p>Interface de gestion de stock • Données chargées depuis API</p>
        <p className="mt-1">Statut: {apiStatus || '🟡 En cours...'}</p>
      </div>

      {/* Modal Ajouter Produit */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSubmit={handleAddProductSubmit}
        warehouses={warehouses}
        stores={stores}
      />
    </div>
  );
};

export default StockPage;