// components/modals/AddShopModal.tsx
import React, { useState } from 'react';
import { apiService } from '@services/api';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Textarea } from '@components/ui/Textarea';
import { Select } from '@components/ui/Select';

interface ShopFormData {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  currency: string;
  description?: string;
}

interface Shop {
  data(data: any): unknown;
  success: any;
  id: string;
  name: string;
  dailyRevenue: number;
  currency: string;
}

// Interface pour la réponse API
interface ApiResponse<T> {
  id: any;
  data: T;
  success: boolean;
  message?: string;
}

interface AddShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShopAdded: (shop: Shop) => void;
}

export const AddShopModal: React.FC<AddShopModalProps> = ({
  isOpen,
  onClose,
  onShopAdded
}) => {
  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    address: '',
    city: '',
    country: 'Côte d\'Ivoire',
    phone: '',
    email: '',
    currency: 'FCFA',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ShopFormData>>({});

  const countries = [
    'Côte d\'Ivoire',
    'Sénégal',
    'Mali',
    'Burkina Faso',
    'Bénin',
    'Togo',
    'Ghana',
    'Nigeria',
    'Cameroon',
    'Gabon'
  ];

  const currencies = [
    { value: 'FCFA', label: 'Franc CFA (FCFA)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'USD', label: 'Dollar US (USD)' }
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<ShopFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de la boutique est requis';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'La ville est requise';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    } else if (!/^[\+]?[0-9\s\-\(\)]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await apiService.post<ApiResponse<Shop>>('/shops', formData);
      
      // Gestion flexible de la réponse API
      const responseData = response.data;
      
      if (responseData?.success) {
        // Si la réponse a une structure { success: true, data: {...} }
        onShopAdded(responseData.data);
      } else if (responseData?.id) {
        // Si la réponse est directement l'objet shop
        onShopAdded(responseData as unknown as Shop);
      } else {
        // Si la structure est différente
        const newShop: Shop = {
            id: Date.now().toString(), // ID temporaire
            name: formData.name,
            dailyRevenue: 0,
            currency: formData.currency,
            data: function (_data: any): unknown {
                throw new Error('Function not implemented.');
            },
            success: undefined
        };
        onShopAdded(newShop);
      }
      
      resetForm();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue lors de l\'ajout de la boutique');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      country: 'Côte d\'Ivoire',
      phone: '',
      email: '',
      currency: 'FCFA',
      description: ''
    });
    setErrors({});
  };

  const handleInputChange = (field: keyof ShopFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              🏪 Ajouter une nouvelle boutique
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Nom de la boutique */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de la boutique *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Boutique ABC"
                error={errors.name}
                required
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse *
              </label>
              <Textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Adresse complète de la boutique"
                rows={3}
                error={errors.address}
                required
              />
            </div>

            {/* Ville et Pays */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville *
                </label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Ex: Abidjan"
                  error={errors.city}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays *
                </label>
                <Select
                  value={formData.country}
                  onChange={(value) => handleInputChange('country', value)}
                  options={countries.map(country => ({ value: country, label: country }))}
                />
              </div>
            </div>

            {/* Téléphone et Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Ex: +225 07 00 00 00 00"
                  error={errors.phone}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@boutique.com"
                  error={errors.email}
                />
              </div>
            </div>

            {/* Devise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise principale *
              </label>
              <Select
                value={formData.currency}
                onChange={(value) => handleInputChange('currency', value)}
                options={currencies}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnelle)
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Description de la boutique, spécialités..."
                rows={3}
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Création...
                  </div>
                ) : (
                  'Créer la boutique'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};