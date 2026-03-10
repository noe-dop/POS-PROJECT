// src/pages/Store.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, MapPin, Phone, Mail, 
  Edit, Trash2, Building,
  Clock, Settings, CheckCircle,
  Package2, RefreshCw,
  Store as StoreIcon,
  Navigation,
  LocateFixed,
  Map,
  X,
  AlertCircle,
  Loader2,
  Grid3x3,
  List,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import storeService, { 
  type Store as StoreType, 
  type StoreFormData 
} from '../services/storeService';

// ============================================================================
// Types
// ============================================================================

type SortField = 'name' | 'created_at' | 'city' | 'store_type';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'grid' | 'list';
type ModalTab = 'info' | 'hours' | 'config';

interface StoreStats {
  total: number;
  active: number;
  inactive: number;
}

// ============================================================================
// Constantes
// ============================================================================

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' }
] as const;

// Coordonnées approximatives pour les principales villes de Côte d'Ivoire
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Abidjan': { lat: 5.359952, lon: -4.008256 },
  'Bouaké': { lat: 7.690, lon: -5.030 },
  'Daloa': { lat: 6.877, lon: -6.450 },
  'Yamoussoukro': { lat: 6.827, lon: -5.289 },
  'San-Pédro': { lat: 4.748, lon: -6.636 },
  'Korhogo': { lat: 9.458, lon: -5.629 },
  'Man': { lat: 7.412, lon: -7.553 },
  'Gagnoa': { lat: 6.131, lon: -5.950 },
  'Soubré': { lat: 5.784, lon: -6.593 },
  'Odienné': { lat: 9.505, lon: -7.564 },
  'Divo': { lat: 5.837, lon: -5.357 },
  'Bondoukou': { lat: 8.040, lon: -2.800 },
  'Grand-Bassam': { lat: 5.212, lon: -3.739 },
  'Bingerville': { lat: 5.356, lon: -3.885 },
  'Anyama': { lat: 5.492, lon: -4.051 }
};

const DEFAULT_COUNTRY = 'Côte d\'Ivoire';
const DEFAULT_COORDINATES = { lat: '7.539989', lon: '-5.547080' };

// ============================================================================
// Composant principal
// ============================================================================

const StorePage: React.FC = () => {
  // ==========================================================================
  // État local
  // ==========================================================================

  const [stores, setStores] = useState<StoreType[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid'); // 'grid' ou 'list'

  // États des modales
  const [modals, setModals] = useState({
    add: false,
    edit: false,
    delete: false
  });

  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>('info');

  // États du formulaire
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    phone: '',
    email: '',
    slogan: '',
    store_type: 0,
    network: 0,
    is_active: true,
    configuration: {},
    opening_hours: {},
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: DEFAULT_COUNTRY,
    latitude: '',
    longitude: ''
  });

  // États de chargement
  const [loading, setLoading] = useState({
    initial: false,
    form: false,
    location: false
  });

  const [stats, setStats] = useState<StoreStats>({
    total: 0,
    active: 0,
    inactive: 0
  });

  // États de localisation
  const [locationError, setLocationError] = useState<string>('');
  const [showLocationHelp, setShowLocationHelp] = useState(false);

  // État des notifications
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // ==========================================================================
  // Effets
  // ==========================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  // FILTRAGE ET RECHERCHE
  useEffect(() => {
    if (!stores || stores.length === 0) {
      setFilteredStores([]);
      return;
    }

    let result = [...stores];

    // Filtre par recherche
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(store => {
        const searchableText = [
          store.name || '',
          store.city || '',
          store.email || '',
          store.phone || '',
          store.address_line1 || '',
          store.address_line2 || '',
          store.slogan || '',
          store.country || '',
          store.state || '',
          store.postal_code || ''
        ]
          .join(' ')
          .toLowerCase();
        
        return searchableText.includes(term);
      });
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter(store => 
        store.is_active === (statusFilter === 'active')
      );
    }

    // Tri
    result.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      if (sortBy === 'created_at') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredStores(result);
  }, [stores, searchTerm, statusFilter, sortBy, sortOrder]);

  // ==========================================================================
  // Fonctions de chargement
  // ==========================================================================

  const loadInitialData = async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    try {
      await loadStores();
    } catch (error) {
      showNotification('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  };

  const loadStores = async () => {
    try {
      const response = await storeService.getStores({ page_size: 50 });
      setStores(response.results);
      
      const activeCount = response.results.filter(s => s.is_active).length;
      setStats({
        total: response.results.length,
        active: activeCount,
        inactive: response.results.length - activeCount
      });
    } catch (error) {
      showNotification('error', 'Impossible de charger les stores');
      setStores([]);
    }
  };

  // ==========================================================================
  // Gestion des notifications
  // ==========================================================================

  const showNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ==========================================================================
  // Gestion du formulaire
  // ==========================================================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (parseInt(value) || 0) : value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      slogan: '',
      store_type: 0,
      network: 0,
      is_active: true,
      configuration: {},
      opening_hours: {},
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: DEFAULT_COUNTRY,
      latitude: '',
      longitude: ''
    });
    setSelectedStore(null);
    setActiveTab('info');
    setLocationError('');
  };

  // ==========================================================================
  // Géolocalisation
  // ==========================================================================

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée');
      return;
    }

    setLoading(prev => ({ ...prev, location: true }));
    setLocationError('');

    const options = {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 30000
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString()
        }));
        
        setLoading(prev => ({ ...prev, location: false }));
        
        showNotification(
          accuracy > 100 ? 'warning' : 'success',
          accuracy > 100 
            ? `Position avec précision de ${Math.round(accuracy)}m`
            : 'Position récupérée avec succès'
        );
      },
      (error) => {
        setLoading(prev => ({ ...prev, location: false }));
        
        const messages: Record<number, string> = {
          1: 'Permission refusée',
          2: 'Position indisponible',
          3: 'Délai dépassé'
        };
        
        setLocationError(messages[error.code] || 'Erreur inconnue');
      },
      options
    );
  };

  const getCoordinatesFromAddress = async () => {
    if (!formData.address_line1 || !formData.city) {
      setLocationError('Adresse et ville requises');
      return;
    }

    setLoading(prev => ({ ...prev, location: true }));
    setLocationError('');

    try {
      const fullAddress = `${formData.address_line1}, ${formData.city}, ${formData.country}`;
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'fr-FR',
            'User-Agent': 'StoreManagementApp/1.0'
          }
        }
      );
      
      const data = await response.json();
      
      if (data?.[0]) {
        setFormData(prev => ({
          ...prev,
          latitude: data[0].lat,
          longitude: data[0].lon
        }));
        showNotification('success', 'Coordonnées trouvées');
      } else {
        setLocationError('Adresse non trouvée');
      }
    } catch (error) {
      setLocationError('Erreur de géocodage');
    } finally {
      setLoading(prev => ({ ...prev, location: false }));
    }
  };

  const useApproximateLocation = () => {
    if (!formData.city) {
      setLocationError('Ville requise');
      return;
    }

    setLoading(prev => ({ ...prev, location: true }));

    const cityName = formData.city.toLowerCase();
    const found = Object.entries(CITY_COORDINATES).find(([city]) =>
      cityName.includes(city.toLowerCase()) || city.toLowerCase().includes(cityName)
    );

    if (found) {
      setFormData(prev => ({
        ...prev,
        latitude: found[1].lat.toString(),
        longitude: found[1].lon.toString()
      }));
      showNotification('info', `Position approximative de ${found[0]}`);
    } else {
      setFormData(prev => ({
        ...prev,
        latitude: DEFAULT_COORDINATES.lat,
        longitude: DEFAULT_COORDINATES.lon
      }));
      showNotification('warning', 'Position approximative de la Côte d\'Ivoire');
    }

    setLoading(prev => ({ ...prev, location: false }));
  };

  // ==========================================================================
  // Gestion des horaires
  // ==========================================================================

  const handleOpeningHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...(prev.opening_hours?.[day] || {}),
          [field]: value
        }
      }
    }));
  };

  // ==========================================================================
  // Gestion de la configuration
  // ==========================================================================

  const handleConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value
      }
    }));
  };

  // ==========================================================================
  // Actions CRUD
  // ==========================================================================

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = storeService.validateStoreForm(formData);
    if (errors.length) {
      showNotification('error', errors.join('\n'));
      return;
    }

    setLoading(prev => ({ ...prev, form: true }));

    try {
      const newStore = await storeService.createStore(formData);
      setStores(prev => [...prev, newStore]);
      setModals(prev => ({ ...prev, add: false }));
      resetForm();
      showNotification('success', 'Store créé avec succès');
    } catch (error: any) {
      const message = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : error.message || 'Erreur de création';
      showNotification('error', message);
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    setLoading(prev => ({ ...prev, form: true }));

    try {
      const updatedStore = await storeService.updateStore(selectedStore.id, formData);
      setStores(prev => prev.map(s => s.id === selectedStore.id ? updatedStore : s));
      setModals(prev => ({ ...prev, edit: false }));
      resetForm();
      showNotification('success', 'Store modifié avec succès');
    } catch (error: any) {
      const message = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : error.message || 'Erreur de modification';
      showNotification('error', message);
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;

    setLoading(prev => ({ ...prev, form: true }));

    try {
      await storeService.deleteStore(selectedStore.id);
      setStores(prev => prev.filter(s => s.id !== selectedStore.id));
      setModals(prev => ({ ...prev, delete: false }));
      resetForm();
      showNotification('success', 'Store supprimé avec succès');
    } catch (error) {
      showNotification('error', 'Erreur de suppression');
    } finally {
      setLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleToggleStatus = async (storeId: number) => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    try {
      const updatedStore = await storeService.toggleStoreStatus(storeId, !store.is_active);
      setStores(prev => prev.map(s => s.id === storeId ? updatedStore : s));
      showNotification('success', `Store ${updatedStore.is_active ? 'activé' : 'désactivé'}`);
    } catch (error) {
      showNotification('error', 'Erreur de changement de statut');
    }
  };

  // ==========================================================================
  // Handlers d'ouverture des modales
  // ==========================================================================

  const openAddModal = () => {
    resetForm();
    setModals(prev => ({ ...prev, add: true }));
  };

  const openEditModal = (store: StoreType) => {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      phone: store.phone,
      email: store.email,
      slogan: store.slogan,
      store_type: store.store_type,
      network: store.network,
      is_active: store.is_active,
      configuration: store.configuration || {},
      opening_hours: store.opening_hours || {},
      address_line1: store.address_line1,
      address_line2: store.address_line2,
      city: store.city,
      state: store.state,
      postal_code: store.postal_code,
      country: store.country,
      latitude: store.latitude || '',
      longitude: store.longitude || ''
    });
    setModals(prev => ({ ...prev, edit: true }));
  };

  const openDeleteModal = (store: StoreType) => {
    setSelectedStore(store);
    setModals(prev => ({ ...prev, delete: true }));
  };

  // ==========================================================================
  // Handlers de tri
  // ==========================================================================

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ==========================================================================
  // Rendu
  // ==========================================================================

  if (loading.initial) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={40} />
          <p className="mt-4 text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg border shadow-lg max-w-md z-50 animate-slideIn ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {notification.type === 'success' ? '✅' :
               notification.type === 'error' ? '❌' :
               notification.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <p className="flex-1 text-sm">{notification.message}</p>
            <button 
              onClick={() => setNotification(null)} 
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building className="text-blue-600" size={32} />
              Magasins
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez l'ensemble de vos points de vente en Côte d'Ivoire
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Boutons de changement de vue */}
            <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Vue grille"
              >
                <Grid3x3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Vue liste"
              >
                <List size={18} />
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} />
              <span>Nouveau magasin</span>
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total magasins</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <StoreIcon className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Magasins actifs</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Magasins inactifs</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package2 className="text-gray-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un magasin (nom, ville, email, téléphone...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
              >
                <option value="all">📋 Tous les statuts</option>
                <option value="active">🟢 Actifs</option>
                <option value="inactive">🔴 Inactifs</option>
              </select>

              <button
                onClick={loadInitialData}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={18} className={loading.initial ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          
          {/* Indicateur de résultats de recherche */}
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-600">
              {filteredStores.length} résultat(s) pour "{searchTerm}"
            </div>
          )}
        </div>

        {/* Barre de tri (visible seulement en vue liste) */}
        {viewMode === 'list' && filteredStores.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap gap-4">
            <span className="text-sm font-medium text-gray-700">Trier par:</span>
            <button
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-1 text-sm ${
                sortBy === 'name' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Nom
              {sortBy === 'name' && (
                sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </button>
            <button
              onClick={() => toggleSort('city')}
              className={`flex items-center gap-1 text-sm ${
                sortBy === 'city' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ville
              {sortBy === 'city' && (
                sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </button>
            <button
              onClick={() => toggleSort('store_type')}
              className={`flex items-center gap-1 text-sm ${
                sortBy === 'store_type' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Type
              {sortBy === 'store_type' && (
                sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </button>
            <button
              onClick={() => toggleSort('created_at')}
              className={`flex items-center gap-1 text-sm ${
                sortBy === 'created_at' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Date
              {sortBy === 'created_at' && (
                sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
              )}
            </button>
          </div>
        )}

        {/* Contenu principal - Vue Grille ou Liste */}
        {filteredStores.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <StoreIcon className="mx-auto text-gray-300" size={48} />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun magasin trouvé</h3>
            <p className="mt-2 text-gray-600">
              {searchTerm || statusFilter !== 'all'
                ? 'Aucun magasin ne correspond à vos critères de recherche'
                : 'Commencez par créer votre premier magasin'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Créer un magasin
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* ===== VUE GRILLE ===== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((store) => (
              <div key={store.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                      {store.is_active && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{store.name}</h3>
                      <p className="text-sm text-gray-500">Type: {store.store_type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(store.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      store.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {store.is_active ? '🟢 Actif' : '🔴 Inactif'}
                  </button>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{store.city}, {store.country}</span>
                  </div>
                  
                  {store.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{store.phone}</span>
                    </div>
                  )}
                  
                  {store.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{store.email}</span>
                    </div>
                  )}

                  {store.latitude && store.longitude && (
                    <div className="flex items-center gap-2 mt-1">
                      <Navigation size={14} className="text-blue-400 flex-shrink-0" />
                      <div className="flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded">
                        <span className="font-mono">
                          {parseFloat(store.latitude).toFixed(4)}, {parseFloat(store.longitude).toFixed(4)}
                        </span>
                        <a 
                          href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Voir sur Google Maps"
                        >
                          <Map size={10} />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(store)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(store)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== VUE LISTE ===== */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Magasin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localisation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStores.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                            {store.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{store.name}</p>
                            <p className="text-xs text-gray-500">{store.slogan}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-900">{store.city}, {store.country}</p>
                            <p className="text-xs text-gray-500">{store.address_line1}</p>
                            {store.latitude && store.longitude && (
                              <div className="flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded mt-1">
                                <Navigation size={10} className="text-blue-500" />
                                <span className="font-mono">
                                  {parseFloat(store.latitude).toFixed(4)}, {parseFloat(store.longitude).toFixed(4)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {store.phone && (
                            <p className="text-sm text-gray-900 flex items-center gap-2">
                              <Phone size={14} className="text-gray-400" />
                              {store.phone}
                            </p>
                          )}
                          {store.email && (
                            <p className="text-sm text-gray-900 flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" />
                              {store.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">Type {store.store_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(store.id)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            store.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {store.is_active ? '🟢 Actif' : '🔴 Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(store)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(store)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals (inchangés) */}
      {modals.add && (
        <StoreModal
          title="Nouveau magasin"
          icon={<Plus size={20} />}
          formData={formData}
          onInputChange={handleInputChange}
          onOpeningHoursChange={handleOpeningHoursChange}
          onConfigChange={handleConfigChange}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          loading={loading.form}
          location={{
            isGetting: loading.location,
            error: locationError,
            onGetCurrent: getCurrentLocation,
            onGetFromAddress: getCoordinatesFromAddress,
            onGetApproximate: useApproximateLocation,
            onClear: () => setFormData(prev => ({ ...prev, latitude: '', longitude: '' }))
          }}
          showLocationHelp={showLocationHelp}
          onToggleLocationHelp={() => setShowLocationHelp(!showLocationHelp)}
          onSubmit={handleAddStore}
          onClose={() => {
            setModals(prev => ({ ...prev, add: false }));
            resetForm();
          }}
        />
      )}

      {modals.edit && selectedStore && (
        <StoreModal
          title="Modifier le magasin"
          icon={<Edit size={20} />}
          formData={formData}
          onInputChange={handleInputChange}
          onOpeningHoursChange={handleOpeningHoursChange}
          onConfigChange={handleConfigChange}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          loading={loading.form}
          location={{
            isGetting: loading.location,
            error: locationError,
            onGetCurrent: getCurrentLocation,
            onGetFromAddress: getCoordinatesFromAddress,
            onGetApproximate: useApproximateLocation,
            onClear: () => setFormData(prev => ({ ...prev, latitude: '', longitude: '' }))
          }}
          showLocationHelp={showLocationHelp}
          onToggleLocationHelp={() => setShowLocationHelp(!showLocationHelp)}
          onSubmit={handleEditStore}
          onClose={() => {
            setModals(prev => ({ ...prev, edit: false }));
            resetForm();
          }}
        />
      )}

      {modals.delete && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Trash2 size={20} className="text-red-600" />
                Confirmer la suppression
              </h2>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Supprimer {selectedStore.name}</p>
                  <p className="text-sm text-gray-600">
                    Cette action est irréversible. Toutes les données associées seront perdues.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setModals(prev => ({ ...prev, delete: false }));
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteStore}
                disabled={loading.form}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading.form && <Loader2 size={16} className="animate-spin" />}
                {loading.form ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sous-composants (StoreModal, InfoForm, HoursForm, ConfigForm)
// ============================================================================

// ... (les sous-composants restent identiques à la version précédente)

// Pour gagner de la place, je n'ai pas recopié les sous-composants ici
// mais ils sont identiques à la version précédente

export default StorePage;