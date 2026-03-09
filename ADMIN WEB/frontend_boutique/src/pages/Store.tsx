// src/pages/Store.tsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MapPin, Phone, Mail, 
  Edit, Trash2, Users, 
  ArrowUpDown, Building,
  Upload, Image, Menu, X,
  Clock, Settings, CheckCircle,
  Package2, RefreshCw,
  Store as StoreIcon,
  Navigation,
  LocateFixed,
  Map
} from 'lucide-react';
import storeService, { 
  type Store as StoreType, 
  type StoreFormData, 
  type StoreType as StoreTypeOption,
  type StoreNetwork,
  type StoreStats 
} from '../services/storeService';

// Types locaux
type SortField = 'name' | 'created_at' | 'total_employees' | 'total_products';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

// Configuration des jours de la semaine
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' }
];

// Coordonnées approximatives pour les principales villes sénégalaises
const CITY_COORDINATES: Record<string, {lat: number, lon: number}> = {
  'Dakar': { lat: 14.716677, lon: -17.467686 },
  'Thiès': { lat: 14.789167, lon: -16.926111 },
  'Saint-Louis': { lat: 16.033333, lon: -16.5 },
  'Kaolack': { lat: 14.138978, lon: -16.076200 },
  'Ziguinchor': { lat: 12.583333, lon: -16.266667 },
  'Diourbel': { lat: 14.655, lon: -16.231667 },
  'Louga': { lat: 15.616667, lon: -16.216667 },
  'Tambacounda': { lat: 13.768889, lon: -13.667222 },
  'Kolda': { lat: 12.883889, lon: -14.95 },
  'Matam': { lat: 15.655833, lon: -13.255278 },
  'Kédougou': { lat: 12.55, lon: -12.183333 },
  'Fatick': { lat: 14.325, lon: -16.416111 },
  'Kaffrine': { lat: 14.105, lon: -15.55 },
  'Sédhiou': { lat: 12.708056, lon: -15.556944 }
};

// Composant pour afficher les coordonnées
const LocationDisplay = ({ latitude, longitude, accuracy }: { latitude?: number; longitude?: number; accuracy?: number }) => {
  if (!latitude || !longitude) return null;
  
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2 text-gray-600 bg-blue-50 px-2 py-1 rounded">
        <MapPin size={10} />
        <span>{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
        <a 
          href={googleMapsUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline ml-auto"
          title="Voir sur Google Maps"
        >
          <Map size={10} />
        </a>
      </div>
      {accuracy && (
        <div className="text-gray-500 italic">
          Précision: ~{accuracy < 1000 ? `${Math.round(accuracy)}m` : `${(accuracy/1000).toFixed(1)}km`}
        </div>
      )}
    </div>
  );
};

const StorePage = () => {
  // États
  const [stores, setStores] = useState<StoreType[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [storeTypes, setStoreTypes] = useState<StoreTypeOption[]>([]);
  const [storeNetworks, setStoreNetworks] = useState<StoreNetwork[]>([]);
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Sénégal',
    phone: '',
    email: '',
    store_type: undefined,
    network: undefined,
    slogan: '',
    configuration: {},
    opening_hours: {},
    is_active: true,
    latitude: undefined,
    longitude: undefined,
    accuracy: undefined,
    geocoded_address: undefined
  });
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [stats, setStats] = useState<StoreStats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalEmployees: 0,
    totalProducts: 0,
    averageEmployees: 0,
    monthlyGrowth: 0
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'info' | 'hours' | 'config'>('info');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [showLocationHelp, setShowLocationHelp] = useState(false);

  // Chargement initial
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filtrage et recherche
  useEffect(() => {
    let result = stores;

    // Filtre par recherche
    if (searchTerm) {
      result = result.filter(store =>
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.address_details?.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        store.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      result = result.filter(store => store.is_active === (statusFilter === 'active'));
    }

    // Tri
    result = [...result].sort((a, b) => {
      let aValue: any = a[sortBy as keyof StoreType];
      let bValue: any = b[sortBy as keyof StoreType];

      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Gérer les valeurs null/undefined
      if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStores(result);
  }, [stores, searchTerm, statusFilter, sortBy, sortOrder]);

  // Fonctions de chargement
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStores(),
        loadStoreTypes(),
        loadStoreNetworks()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement initial:', error);
      showNotification('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const response = await storeService.getStores({ page_size: 50 });
      setStores(response.results);
      setFilteredStores(response.results);
      
      // Calculer les stats avec les stores chargés
      const statsData = await storeService.calculateStoreStats(response.results);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement des stores:', error);
      showNotification('error', 'Impossible de charger les stores');
      setStores([]);
      setFilteredStores([]);
    }
  };

  const loadStoreTypes = async () => {
    try {
      const types = await storeService.getStoreTypes();
      setStoreTypes(types);
    } catch (error) {
      console.error('Erreur lors du chargement des types de store:', error);
      showNotification('warning', 'Impossible de charger les types de store');
      setStoreTypes([]);
    }
  };

  const loadStoreNetworks = async () => {
    try {
      const networks = await storeService.getStoreNetworks();
      setStoreNetworks(networks);
    } catch (error) {
      console.error('Erreur lors du chargement des réseaux:', error);
      showNotification('warning', 'Impossible de charger les réseaux de store');
      setStoreNetworks([]);
    }
  };

  // Gestion du formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ============ GÉOLOCALISATION OPTIMISÉE ============

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur');
      setIsGettingLocation(false);
      return;
    }

    // Options optimisées pour la géolocalisation
    const geolocationOptions = {
      enableHighAccuracy: false, // Réduit la précision pour accélérer la réponse
      timeout: 8000, // Réduit le timeout à 8 secondes
      maximumAge: 30000 // Utilise une position mise en cache si disponible (30 secondes)
    };

    // Ajout d'un timeout manuel comme backup
    const manualTimeout = setTimeout(() => {
      setIsGettingLocation(false);
      setLocationError('La géolocalisation prend trop de temps. Essayez à nouveau ou utilisez une autre méthode.');
    }, 9000); // 1 seconde de plus que le timeout du navigateur

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(manualTimeout);
        const { latitude, longitude } = position.coords;
        
        // Vérifier la précision de la position
        const accuracy = position.coords.accuracy; // en mètres
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          accuracy // Stocker la précision
        }));
        
        setIsGettingLocation(false);
        
        // Afficher une info sur la précision
        if (accuracy > 100) {
          showNotification('warning', `Position récupérée avec une précision de ${Math.round(accuracy)}m`);
        } else {
          showNotification('success', 'Position géographique récupérée avec succès');
        }
      },
      (error) => {
        clearTimeout(manualTimeout);
        setIsGettingLocation(false);
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permission refusée. Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Position indisponible. Vérifiez votre connexion internet.');
            break;
          case error.TIMEOUT:
            setLocationError('La géolocalisation a pris trop de temps. Essayez à nouveau ou utilisez une autre méthode.');
            break;
          default:
            setLocationError('Erreur lors de la récupération de la position. Code d\'erreur: ' + error.code);
        }
      },
      geolocationOptions
    );
  };

  // Géocodage optimisé depuis l'adresse
  const getCoordinatesFromAddress = async () => {
    if (!formData.address_line1 || !formData.city) {
      setLocationError('Veuillez d\'abord renseigner l\'adresse et la ville');
      return;
    }

    setIsGettingLocation(true);
    setLocationError('');

    try {
      const fullAddress = `${formData.address_line1}, ${formData.city}, ${formData.state}, ${formData.postal_code}, ${formData.country}`;
      
      // Ajout d'un timeout pour la requête
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'fr-FR', // Améliore les résultats pour les adresses françaises
            'User-Agent': 'StoreManagementApp/1.0'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        
        // Vérifier la pertinence du résultat
        const resultAddress = display_name.toLowerCase();
        const searchAddress = fullAddress.toLowerCase();
        let matchScore = 0;
        
        // Vérifier si la ville correspond
        if (formData.city && resultAddress.includes(formData.city.toLowerCase())) {
          matchScore++;
        }
        
        // Vérifier si le code postal correspond
        if (formData.postal_code && resultAddress.includes(formData.postal_code)) {
          matchScore++;
        }
        
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          geocoded_address: display_name // Optionnel : stocker l'adresse géocodée
        }));
        
        if (matchScore >= 2) {
          showNotification('success', 'Coordonnées trouvées pour cette adresse');
        } else {
          showNotification('warning', 'Coordonnées trouvées, mais vérifiez la correspondance avec l\'adresse');
        }
      } else {
        setLocationError('Adresse non trouvée. Vérifiez l\'orthographe ou essayez une adresse plus simple.');
      }
    } catch (error: any) {
      console.error('Erreur de géocodage:', error);
      
      if (error.name === 'AbortError') {
        setLocationError('La recherche d\'adresse a pris trop de temps. Réessayez ou vérifiez votre connexion.');
      } else {
        setLocationError('Erreur lors du géocodage. Essayez une recherche plus simple.');
      }
      
      // Fallback : utiliser une approximation par ville
      if (formData.city && !formData.latitude) {
        tryFallbackGeocoding();
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Fonction de fallback pour le géocodage
  const tryFallbackGeocoding = async () => {
    try {
      // Essayer de géocoder juste avec la ville
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.city + ', ' + formData.state)}&limit=1`
      );
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        }));
        
        showNotification('warning', 'Position approximative basée sur la ville uniquement. Précisez l\'adresse pour plus de précision.');
      }
    } catch (fallbackError) {
      console.error('Fallback geocoding failed:', fallbackError);
    }
  };

  // Position approximative par ville
  const useApproximateLocation = async () => {
    if (!formData.city) {
      setLocationError('Veuillez d\'abord renseigner la ville');
      return;
    }

    setIsGettingLocation(true);
    setLocationError('');

    try {
      const cityName = formData.city.toLowerCase();
      let foundCoords = null;
      let foundCityName = '';

      // Chercher une correspondance approximative
      for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
        if (cityName.includes(city.toLowerCase()) || city.toLowerCase().includes(cityName)) {
          foundCoords = coords;
          foundCityName = city;
          break;
        }
      }

      if (foundCoords) {
        setFormData(prev => ({
          ...prev,
          latitude: foundCoords.lat,
          longitude: foundCoords.lon,
          accuracy: 5000 // Précision approximative de 5km
        }));
        
        showNotification('info', `Position approximative de ${foundCityName} enregistrée`);
      } else {
        // Fallback général pour le Sénégal
        setFormData(prev => ({
          ...prev,
          latitude: 14.497401, // Centre approximatif du Sénégal
          longitude: -14.452362,
          accuracy: 100000 // Précision très faible
        }));
        
        showNotification('warning', 'Position approximative du Sénégal enregistrée');
      }
    } catch (error) {
      setLocationError('Impossible de déterminer une position approximative');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const clearLocation = () => {
    setFormData(prev => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
      accuracy: undefined,
      geocoded_address: undefined
    }));
    setLocationError('');
  };

  // Gestion des horaires d'ouverture
  const handleOpeningHoursChange = (day: string, field: 'open' | 'close', value: string) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours?.[day],
          [field]: value
        }
      }
    }));
  };

  // Gestion de la configuration
  const handleConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value
      }
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Sénégal',
      phone: '',
      email: '',
      store_type: undefined,
      network: undefined,
      slogan: '',
      configuration: {},
      opening_hours: {},
      is_active: true,
      latitude: undefined,
      longitude: undefined,
      accuracy: undefined,
      geocoded_address: undefined
    });
    setLogoFile(null);
    setLogoPreview('');
    setSelectedStore(null);
    setActiveTab('info');
    setLocationError('');
    setIsGettingLocation(false);
  };

  // Actions CRUD
  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const errors = storeService.validateStoreForm(formData);
    if (errors.length > 0) {
      showNotification('error', errors.join('\n'));
      return;
    }

    setFormLoading(true);

    try {
      // Créer le store
      const newStore = await storeService.createStore(formData);
      
      // Uploader le logo si présent
      if (logoFile && newStore.id) {
        try {
          const logoResponse = await storeService.uploadLogo(newStore.id, logoFile);
          newStore.logo = logoResponse.logo;
        } catch (logoError) {
          console.error('Erreur lors de l\'upload du logo:', logoError);
          // Continuer même si l'upload du logo échoue
        }
      }
      
      // Mettre à jour la liste des stores
      setStores(prev => [...prev, newStore]);
      setIsAddModalOpen(false);
      resetForm();
      showNotification('success', 'Store créé avec succès');
      
    } catch (error: any) {
      console.error('Erreur lors de la création:', error);
      const errorMessage = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : error.message || 'Erreur lors de la création du store';
      showNotification('error', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    setFormLoading(true);
    try {
      // Mettre à jour le store
      const updatedStore = await storeService.updateStore(selectedStore.id, formData);
      
      // Uploader le logo si un nouveau a été sélectionné
      if (logoFile) {
        try {
          const logoResponse = await storeService.uploadLogo(selectedStore.id, logoFile);
          updatedStore.logo = logoResponse.logo;
        } catch (logoError) {
          console.error('Erreur lors de l\'upload du logo:', logoError);
        }
      }
      
      // Mettre à jour la liste des stores
      setStores(prev => prev.map(store =>
        store.id === selectedStore.id ? updatedStore : store
      ));
      
      setIsEditModalOpen(false);
      resetForm();
      showNotification('success', 'Store modifié avec succès');
      
    } catch (error: any) {
      console.error('Erreur lors de la modification:', error);
      const errorMessage = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : error.message || 'Erreur lors de la modification du store';
      showNotification('error', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!selectedStore) return;

    setFormLoading(true);
    try {
      await storeService.deleteStore(selectedStore.id);
      
      setStores(prev => prev.filter(store => store.id !== selectedStore.id));
      setIsDeleteModalOpen(false);
      resetForm();
      showNotification('success', 'Store supprimé avec succès');
      
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      const errorMessage = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : error.message || 'Erreur lors de la suppression du store';
      showNotification('error', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (storeId: number) => {
    try {
      const store = stores.find(s => s.id === storeId);
      if (!store) return;

      const newStatus = !store.is_active;
      const updatedStore = await storeService.toggleStoreStatus(storeId, newStatus);

      setStores(prev => prev.map(store =>
        store.id === storeId ? updatedStore : store
      ));
      
      showNotification('success', `Store ${newStatus ? 'activé' : 'désactivé'} avec succès`);
      
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      showNotification('error', 'Erreur lors du changement de statut');
    }
  };

  const openEditModal = (store: StoreType) => {
    setSelectedStore(store);
    const formData = storeService.prepareStoreFormData(store);
    // Ajouter les champs de géolocalisation s'ils existent
    if ('accuracy' in store || 'geocoded_address' in store) {
      Object.assign(formData, {
        accuracy: store.accuracy,
        geocoded_address: store.geocoded_address
      });
    }
    setFormData(formData);
    
    if (store.logo) {
      setLogoPreview(store.logo);
    }
    
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (store: StoreType) => {
    setSelectedStore(store);
    setIsDeleteModalOpen(true);
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Notifications
  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const color = type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'blue';
    console.log(`%c${message}`, `color: ${color}; font-weight: bold;`);
    
    if (type === 'error') {
      alert(`❌ Erreur: ${message}`);
    } else if (type === 'success') {
      alert(`✅ Succès: ${message}`);
    } else if (type === 'warning') {
      alert(`⚠️ Attention: ${message}`);
    } else if (type === 'info') {
      alert(`ℹ️ Info: ${message}`);
    }
  };

  // Composant pour la section de localisation dans le formulaire
  const LocationFormSection = () => (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Position géographique (optionnel)
        </label>
        <button
          type="button"
          onClick={() => setShowLocationHelp(!showLocationHelp)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          ℹ️ Pourquoi ?
        </button>
      </div>
      
      {showLocationHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-800">
          <p className="font-medium mb-1">Pourquoi ajouter la localisation ?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Permet d'afficher la boutique sur une carte</li>
            <li>Facilite les recherches géolocalisées</li>
            <li>Permet de calculer les distances pour les livraisons</li>
            <li>Améliore l'expérience des clients mobiles</li>
          </ul>
        </div>
      )}
      
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {formData.latitude && formData.longitude ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Coordonnées enregistrées
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </span>
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="text-xs text-red-600 hover:text-red-800"
                    title="Effacer les coordonnées"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Aucune position définie. Utilisez les boutons ci-dessous.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            title="Utiliser ma position actuelle"
          >
            {isGettingLocation ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Récupération...</span>
              </>
            ) : (
              <>
                <LocateFixed size={14} />
                <span>Ma position</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={getCoordinatesFromAddress}
            disabled={isGettingLocation || !formData.address_line1 || !formData.city}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            title="Géocoder à partir de l'adresse"
          >
            <Navigation size={14} />
            <span>À partir de l'adresse</span>
          </button>
          
          <button
            type="button"
            onClick={useApproximateLocation}
            disabled={isGettingLocation || !formData.city}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            title="Utiliser une position approximative"
          >
            <Map size={14} />
            <span>Approximation</span>
          </button>
          
          {formData.latitude && formData.longitude && (
            <a
              href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
              title="Voir sur Google Maps"
            >
              <Map size={14} />
              <span>Voir sur carte</span>
            </a>
          )}
        </div>
        
        {locationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{locationError}</p>
          </div>
        )}
        
        <div className="text-xs text-gray-500">
          <p>Conseil : Utilisez "Ma position" pour géolocaliser rapidement votre boutique sur place.</p>
        </div>
      </div>
    </div>
  );

  // Composant Store Card pour la vue mobile (avec coordonnées si disponibles)
  const StoreCard = ({ store }: { store: StoreType }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {store.logo ? (
                <img 
                  src={store.logo} 
                  alt={store.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span>${store.name.charAt(0)}</span>`;
                    }
                  }}
                />
              ) : (
                store.name.charAt(0)
              )}
            </div>
            {store.is_active && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle size={8} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{store.name}</h3>
            <p className="text-sm text-gray-500">{store.store_type_name || 'Non spécifié'}</p>
          </div>
        </div>
        <button
          onClick={() => handleToggleStatus(store.id)}
          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
            store.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {store.is_active ? '🟢' : '🔴'}
        </button>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <span className="truncate">{store.address_details?.city || 'Non spécifié'}</span>
        </div>
        
        {/* Affichage des coordonnées si disponibles */}
        {(store.latitude && store.longitude) && (
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-blue-400" />
            <LocationDisplay 
              latitude={store.latitude} 
              longitude={store.longitude} 
              accuracy={(store as any).accuracy}
            />
          </div>
        )}
        
        {store.phone && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-gray-400" />
            <span>{store.phone}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {store.total_employees}
            </span>
            <span className="flex items-center gap-1">
              <Package2 size={12} />
              {store.total_products}
            </span>
          </div>
          <div className="flex items-center gap-1">
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
    </div>
  );

  // Composant pour les onglets du modal
  const ModalTabs = () => (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'info'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Building size={16} className="inline mr-2" />
          Informations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('hours')}
          className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'hours'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Clock size={16} className="inline mr-2" />
          Horaires
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Settings size={16} className="inline mr-2" />
          Configuration
        </button>
      </nav>
    </div>
  );

  // Composant pour le formulaire d'informations
  const InfoForm = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo du Store
        </label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Preview" 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="text-gray-400"><Image size={24} /></div>';
                  }
                }}
              />
            ) : (
              <Image size={20} className="text-gray-400" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="cursor-pointer flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium bg-white"
            >
              <Upload size={14} />
              {logoPreview ? 'Changer' : 'Téléverser'}
            </label>
          </div>
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Nom du Store *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Entrez le nom du store"
        />
      </div>

      <div>
        <label htmlFor="store_type" className="block text-sm font-medium text-gray-700 mb-2">
          Type de Store
        </label>
        <select
          id="store_type"
          name="store_type"
          value={formData.store_type || ''}
          onChange={handleInputChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          disabled={storeTypes.length === 0}
        >
          <option value="">{storeTypes.length === 0 ? 'Aucun type disponible' : 'Sélectionnez un type'}</option>
          {storeTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="network" className="block text-sm font-medium text-gray-700 mb-2">
          Réseau
        </label>
        <select
          id="network"
          name="network"
          value={formData.network || ''}
          onChange={handleInputChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          disabled={storeNetworks.length === 0}
        >
          <option value="">{storeNetworks.length === 0 ? 'Aucun réseau disponible' : 'Sélectionnez un réseau'}</option>
          {storeNetworks.map(network => (
            <option key={network.id} value={network.id}>
              {network.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-2">
          Slogan
        </label>
        <input
          type="text"
          id="slogan"
          name="slogan"
          value={formData.slogan}
          onChange={handleInputChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Slogan du store"
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-2">
          Adresse *
        </label>
        <input
          type="text"
          id="address_line1"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Adresse ligne 1"
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-2">
          Complément d'adresse
        </label>
        <input
          type="text"
          id="address_line2"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleInputChange}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Adresse ligne 2"
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
          Ville *
        </label>
        <input
          type="text"
          id="city"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Ville"
        />
      </div>

      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
          Région *
        </label>
        <input
          type="text"
          id="state"
          name="state"
          value={formData.state}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Région"
        />
      </div>

      <div>
        <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
          Code Postal *
        </label>
        <input
          type="text"
          id="postal_code"
          name="postal_code"
          value={formData.postal_code}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Code postal"
        />
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
          Pays *
        </label>
        <input
          type="text"
          id="country"
          name="country"
          value={formData.country}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Pays"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          Téléphone *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Téléphone"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
          placeholder="Email"
        />
      </div>

      {/* Section de localisation géographique */}
      <LocationFormSection />
    </div>
  );

  // Composant pour les horaires d'ouverture
  const HoursForm = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Définissez les horaires d'ouverture de votre store. Laissez vide pour les jours fermés.
      </p>
      
      <div className="space-y-3">
        {DAYS_OF_WEEK.map(day => {
          const dayHours = formData.opening_hours?.[day.key] || {};
          return (
            <div key={day.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-24 flex-shrink-0">
                <label className="text-sm font-medium text-gray-700">{day.label}</label>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={dayHours.open || ''}
                  onChange={(e) => handleOpeningHoursChange(day.key, 'open', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                />
                <span className="text-gray-500">à</span>
                <input
                  type="time"
                  value={dayHours.close || ''}
                  onChange={(e) => handleOpeningHoursChange(day.key, 'close', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                />
                {(!dayHours.open || !dayHours.close) && (
                  <span className="text-xs text-gray-400 ml-2">Fermé</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Composant pour la configuration
  const ConfigForm = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Paramètres généraux</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Devise par défaut
            </label>
            <select
              value={formData.configuration?.currency || 'XOF'}
              onChange={(e) => handleConfigChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="XOF">Franc CFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar US (USD)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuseau horaire
            </label>
            <select
              value={formData.configuration?.timezone || 'Africa/Dakar'}
              onChange={(e) => handleConfigChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="Africa/Dakar">Afrique/Dakar (UTC+0)</option>
              <option value="Africa/Abidjan">Afrique/Abidjan (UTC+0)</option>
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.configuration?.online_orders || false}
                onChange={(e) => handleConfigChange('online_orders', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Commandes en ligne activées</span>
            </label>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.configuration?.reservations || false}
                onChange={(e) => handleConfigChange('reservations', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Réservations activées</span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Paramètres de notification</h4>
        <div className="space-y-3">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.configuration?.email_notifications || true}
                onChange={(e) => handleConfigChange('email_notifications', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Notifications par email</span>
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.configuration?.sms_notifications || false}
                onChange={(e) => handleConfigChange('sms_notifications', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Notifications par SMS</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building className="text-blue-600" size={28} />
              Mes Stores
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              Gérez l'ensemble de vos points de vente
            </p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <div className={`flex flex-col sm:flex-row gap-3 w-full sm:w-auto ${isMobileMenuOpen ? 'flex' : 'hidden sm:flex'}`}>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('grid')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border text-sm font-medium ${
                currentView === 'grid' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Grille
            </button>
            <button
              onClick={() => setCurrentView('list')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg border text-sm font-medium ${
                currentView === 'list' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Liste
            </button>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm sm:text-base"
          >
            <Plus size={18} />
            <span>Nouveau Store</span>
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium">Total Stores</p>
              <p className="text-lg sm:text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-blue-100 text-xs mt-1">{stats.active} actifs • {stats.inactive} inactifs</p>
            </div>
            <StoreIcon className="text-blue-200" size={16} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs font-medium">Employés</p>
              <p className="text-lg sm:text-2xl font-bold mt-1">{stats.totalEmployees}</p>
              <p className="text-purple-100 text-xs mt-1">Moyenne: {stats.averageEmployees}/store</p>
            </div>
            <Users className="text-purple-200" size={16} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs font-medium">Stock de Produits</p>
              <p className="text-lg sm:text-2xl font-bold mt-1">{stats.totalProducts}</p>
              <p className="text-indigo-100 text-xs mt-1">En stock total</p>
            </div>
            <Package2 className="text-indigo-200" size={16} />
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <div className="flex-1 relative min-w-0 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un store, une ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white min-w-[140px]"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">🟢 Actifs</option>
              <option value="inactive">🔴 Inactifs</option>
            </select>

            <button 
              onClick={loadInitialData}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenu des stores */}
      {currentView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="flex justify-between pt-2">
                    <div className="flex gap-4">
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                      <div className="h-4 bg-gray-200 rounded w-8"></div>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-6 bg-gray-200 rounded w-6"></div>
                      <div className="h-6 bg-gray-200 rounded w-6"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : filteredStores.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <StoreIcon size={48} className="text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900">Aucun store trouvé</p>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Aucun store ne correspond à vos critères de recherche.' 
                    : 'Commencez par créer votre premier store.'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                  >
                    <Plus size={20} />
                    Créer un store
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <Building size={14} />
                      <span className="hidden sm:inline">Store</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider hidden sm:table-cell">
                    Localisation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider hidden lg:table-cell">
                    Contact
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleSort('total_employees')}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span className="hidden xs:inline">Employés</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider hidden sm:table-cell"
                    onClick={() => toggleSort('total_products')}
                  >
                    <div className="flex items-center gap-2">
                      <Package2 size={14} />
                      <span className="hidden xs:inline">Stock</span>
                      <ArrowUpDown size={12} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider hidden xl:table-cell">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-20"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-20"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded w-8"></div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="h-4 bg-gray-200 rounded w-8"></div>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <div className="h-6 bg-gray-200 rounded w-6"></div>
                          <div className="h-6 bg-gray-200 rounded w-6"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <StoreIcon size={32} className="text-gray-300 mb-2" />
                        <p className="font-medium text-gray-900">Aucun store trouvé</p>
                        <p className="text-gray-600 mt-1 text-sm">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'Aucun store ne correspond à vos critères.' 
                            : 'Créez votre premier store.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStores.map((store) => (
                    <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                            {store.logo ? (
                              <img 
                                src={store.logo} 
                                alt={store.name}
                                className="w-8 h-8 rounded-lg object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span>${store.name.charAt(0)}</span>`;
                                  }
                                }}
                              />
                            ) : (
                              store.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{store.name}</p>
                            <p className="text-xs text-gray-500">{store.store_type_name || 'Non spécifié'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-start gap-2">
                          <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-900">{store.address_details?.city || 'Non spécifié'}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {storeService.getFullAddress(store)}
                            </p>
                            {(store.latitude && store.longitude) && (
                              <LocationDisplay 
                                latitude={store.latitude} 
                                longitude={store.longitude} 
                                accuracy={(store as any).accuracy}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-1">
                          {store.phone && (
                            <p className="text-sm text-gray-900 flex items-center gap-2">
                              <Phone size={12} className="text-gray-400" />
                              {store.phone}
                            </p>
                          )}
                          {store.email && (
                            <p className="text-sm text-gray-900 flex items-center gap-2">
                              <Mail size={12} className="text-gray-400" />
                              <span className="truncate max-w-[120px]">{store.email}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Users size={14} className="text-gray-400" />
                          {store.total_employees}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Package2 size={14} className="text-gray-400" />
                          {store.total_products}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <button
                          onClick={() => handleToggleStatus(store.id)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            store.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {store.is_active ? '🟢 Actif' : '🔴 Inactif'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'ajout */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Plus size={20} />
                Nouveau Store
              </h2>
            </div>
            
            <ModalTabs />
            
            <form onSubmit={handleAddStore} className="p-4 sm:p-6">
              {activeTab === 'info' && <InfoForm />}
              {activeTab === 'hours' && <HoursForm />}
              {activeTab === 'config' && <ConfigForm />}
              
              <div className="flex justify-end gap-2 sm:gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {formLoading ? 'Création...' : 'Créer le store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification */}
      {isEditModalOpen && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit size={20} />
                Modifier le Store
              </h2>
            </div>
            
            <ModalTabs />
            
            <form onSubmit={handleEditStore} className="p-4 sm:p-6">
              {activeTab === 'info' && <InfoForm />}
              {activeTab === 'hours' && <HoursForm />}
              {activeTab === 'config' && <ConfigForm />}
              
              <div className="flex justify-end gap-2 sm:gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {formLoading ? 'Modification...' : 'Modifier le store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {isDeleteModalOpen && selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl w-full max-w-md">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Trash2 size={20} className="text-red-600" />
                Supprimer le store
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                  {selectedStore.logo ? (
                    <img 
                      src={selectedStore.logo} 
                      alt={selectedStore.name}
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span>${selectedStore.name.charAt(0)}</span>`;
                        }
                      }}
                    />
                  ) : (
                    selectedStore.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedStore.name}</p>
                  <p className="text-sm text-gray-500">{selectedStore.store_type_name || 'Non spécifié'}</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm sm:text-base">
                Êtes-vous sûr de vouloir supprimer le store <strong>"{selectedStore.name}"</strong> ? 
                Cette action est irréversible et supprimera toutes les données associées.
              </p>
            </div>
            <div className="flex justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  resetForm();
                }}
                className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteStore}
                disabled={formLoading}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {formLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorePage;