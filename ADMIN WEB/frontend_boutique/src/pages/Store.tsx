// src/pages/Store.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, Search, Filter, MapPin, Phone, Mail, 
  Edit, Trash2, Users, 
  ArrowUpDown, Building,
  Upload, Image, X,
  Clock, Settings, CheckCircle,
  Package2, RefreshCw,
  Store as StoreIcon,
  Navigation,
  LocateFixed,
  Map,
  Eye,
  MoreVertical,
  Download,
  Grid3x3,
  List,
  TrendingUp,
  Shield,
  Copy,
  Star,
  AlertCircle,
  BarChart3,
  ChevronDown,
  ExternalLink,
  Calendar,
  Target,
  Globe,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import storeService, { 
  type Store as StoreType, 
  type StoreFormData, 
  type StoreType as StoreTypeOption,
  type StoreNetwork,
  type StoreStats 
} from '../services/storeService';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InfiniteScroll from 'react-infinite-scroll-component';

// Types locaux
type SortField = 'name' | 'created_at' | 'total_employees' | 'total_products';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'grid' | 'list';

// Configuration des jours de la semaine
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lundi', short: 'Lun' },
  { key: 'tuesday', label: 'Mardi', short: 'Mar' },
  { key: 'wednesday', label: 'Mercredi', short: 'Mer' },
  { key: 'thursday', label: 'Jeudi', short: 'Jeu' },
  { key: 'friday', label: 'Vendredi', short: 'Ven' },
  { key: 'saturday', label: 'Samedi', short: 'Sam' },
  { key: 'sunday', label: 'Dimanche', short: 'Dim' }
];

// ============================================
// COMPOSANTS DE FORMULAIRE STABLES
// ============================================

// Composant Input STABLE
const StableInput = React.memo(({
  label,
  name,
  value: externalValue,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  className = '',
  disabled = false
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) => {
  const [localValue, setLocalValue] = useState(externalValue || '');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(externalValue || '');
    }
  }, [externalValue]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    requestAnimationFrame(() => {
      onChange(name, newValue);
    });
  }, [name, onChange]);
  
  const handleBlur = useCallback(() => {
    if (localValue !== externalValue) {
      onChange(name, localValue);
    }
  }, [name, localValue, externalValue, onChange]);
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
});

StableInput.displayName = 'StableInput';

// Composant Select STABLE
const StableSelect = React.memo(({
  label,
  name,
  value: externalValue,
  onChange,
  options,
  required = false,
  placeholder = 'Sélectionner...',
  className = '',
  disabled = false
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (name: string, value: string) => void;
  options: Array<{id: number | string; name: string}>;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) => {
  const [localValue, setLocalValue] = useState(externalValue || '');
  
  useEffect(() => {
    setLocalValue(externalValue || '');
  }, [externalValue]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(name, newValue);
  }, [name, onChange]);
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        name={name}
        value={localValue}
        onChange={handleChange}
        required={required}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
});

StableSelect.displayName = 'StableSelect';

// Composant Textarea STABLE
const StableTextarea = React.memo(({
  label,
  name,
  value: externalValue,
  onChange,
  required = false,
  placeholder = '',
  className = '',
  disabled = false,
  rows = 3
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}) => {
  const [localValue, setLocalValue] = useState(externalValue || '');
  
  useEffect(() => {
    setLocalValue(externalValue || '');
  }, [externalValue]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(name, newValue);
  }, [name, onChange]);
  
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        name={name}
        value={localValue}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
      />
    </div>
  );
});

StableTextarea.displayName = 'StableTextarea';

// Composant StoreCard
const StoreCard = React.memo(({ 
  store, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  onView 
}: { 
  store: StoreType; 
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onView: () => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="group relative bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="absolute top-4 right-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${store.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {store.is_active ? '🟢 Actif' : '🔴 Inactif'}
        </span>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {store.logo ? (
              <img 
                src={store.logo} 
                alt={store.name}
                loading="lazy"
                className="w-14 h-14 rounded-xl object-cover"
              />
            ) : (
              store.name.charAt(0)
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-full border-2 border-blue-500 flex items-center justify-center">
            <StoreIcon size={14} className="text-blue-500" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {store.name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{store.slogan || 'Aucun slogan'}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
              {store.store_type_name || 'Non spécifié'}
            </span>
            {store.network_name && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                {store.network_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={16} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{store.address_details?.city || 'Non localisé'}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{store.total_employees}</div>
            <div className="text-xs text-gray-500">Employés</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{store.total_products}</div>
            <div className="text-xs text-gray-500">Produits</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Vue rapide"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <Edit size={16} />
          </button>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStatus}
            className={`p-1.5 rounded-lg transition-colors ${store.is_active ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
            title={store.is_active ? 'Désactiver' : 'Activer'}
          >
            {store.is_active ? (
              <CheckCircle size={16} />
            ) : (
              <X size={16} />
            )}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-40 bg-white rounded-lg border border-gray-200 shadow-lg z-50"
                >
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onView();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Eye size={14} />
                      Vue rapide
                    </button>
                    <button
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Edit size={14} />
                      Modifier
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`/stores/${store.id}`);
                        toast.success('Lien copié !');
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Copy size={14} />
                      Copier le lien
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

StoreCard.displayName = 'StoreCard';

// Composant StatCard
const StatCard = React.memo(({ 
  title, 
  value, 
  icon: Icon,
  description,
  change
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  description?: string;
  change?: { value: number; label: string };
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">
            {title}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {value}
          </p>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <Icon size={20} className="text-gray-700" />
        </div>
      </div>
      
      <div className="space-y-2">
        {description && (
          <p className="text-sm text-gray-600">
            {description}
          </p>
        )}
        
        {change && (
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            change.value > 0 
              ? 'bg-green-50 text-green-700'
              : change.value < 0
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-50 text-gray-700'
          }`}>
            {change.value > 0 ? '↗' : change.value < 0 ? '↘' : '→'}
            <span className="ml-1">
              {Math.abs(change.value)}% {change.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

const StorePage = () => {
  // États principaux
  const [stores, setStores] = useState<StoreType[]>([]);
  const [filteredStores, setFilteredStores] = useState<StoreType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [storeTypes, setStoreTypes] = useState<StoreTypeOption[]>([]);
  const [storeNetworks, setStoreNetworks] = useState<StoreNetwork[]>([]);
  
  // ✅ ÉTAT DU FORMULAIRE - ADAPTÉ POUR LE BACKEND DJANGO
  const [formValues, setFormValues] = useState<StoreFormData>({
    name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'France', // ✅ CHANGÉ - Le backend attend "France"
    phone: '',
    email: '',
    store_type: undefined,
    network: undefined,
    slogan: '',
    configuration: {
      currency: 'EUR', // ✅ CHANGÉ - Le backend attend "EUR"
      timezone: 'Europe/Paris', // ✅ CHANGÉ - Le backend attend "Europe/Paris"
      receipt_header: '',
      receipt_footer: '',
      tax_rate: 20.0
    },
    opening_hours: {},
    is_active: true
  });
  
  // ✅ GÉOLOCALISATION - Avec conversion string pour le backend
  const [geoLocation, setGeoLocation] = useState({
    latitude: undefined as string | undefined, // ✅ string pour Django
    longitude: undefined as string | undefined, // ✅ string pour Django
    accuracy: undefined as string | undefined,
    geocoded_address: undefined as string | undefined
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
  const [currentView, setCurrentView] = useState<ViewMode>('grid');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedStoreType, setSelectedStoreType] = useState<string>('all');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'advanced'>('basic');
  
  const [displayCount, setDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    filterTime: 0,
    totalStores: 0
  });
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [cachedStores, setCachedStores] = useState<StoreType[]>([]);

  const formValuesRef = useRef(formValues);
  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Calcul des statistiques
  const calculatedStats = useMemo(() => {
    const start = performance.now();
    
    const total = stores.length;
    const active = stores.filter(store => store.is_active).length;
    const inactive = total - active;
    const totalEmployees = stores.reduce((sum, store) => sum + (store.total_employees || 0), 0);
    const totalProducts = stores.reduce((sum, store) => sum + (store.total_products || 0), 0);
    const averageEmployees = total > 0 ? Math.round(totalEmployees / total) : 0;
    
    const end = performance.now();
    
    return {
      total,
      active,
      inactive,
      totalEmployees,
      totalProducts,
      averageEmployees,
      monthlyGrowth: 0,
      calculationTime: end - start
    };
  }, [stores]);

  // Filtrage
  useEffect(() => {
    const filterStart = performance.now();
    
    let result = stores;

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(store =>
        store.name.toLowerCase().includes(term) ||
        (store.address_details?.city?.toLowerCase().includes(term)) ||
        store.email?.toLowerCase().includes(term) ||
        store.phone?.toLowerCase().includes(term) ||
        store.slogan?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(store => store.is_active === (statusFilter === 'active'));
    }

    if (selectedStoreType !== 'all') {
      result = result.filter(store => store.store_type === parseInt(selectedStoreType));
    }

    if (selectedNetwork !== 'all') {
      result = result.filter(store => store.network === parseInt(selectedNetwork));
    }

    result = [...result].sort((a, b) => {
      let aValue: any = a[sortBy as keyof StoreType];
      let bValue: any = b[sortBy as keyof StoreType];

      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStores(result);
    setDisplayCount(Math.min(20, result.length));
    setHasMore(result.length > 20);
    
    const filterEnd = performance.now();
    
    setPerformanceMetrics(prev => ({
      ...prev,
      filterTime: filterEnd - filterStart,
      totalStores: result.length
    }));
    
  }, [stores, debouncedSearchTerm, statusFilter, selectedStoreType, selectedNetwork, sortBy, sortOrder]);

  // Chargement initial
  const loadInitialData = useCallback(async () => {
    const start = performance.now();
    setLoading(true);
    
    try {
      const cachedData = localStorage.getItem('stores_cache');
      const cacheTime = localStorage.getItem('stores_cache_time');
      
      if (cachedData && cacheTime && (Date.now() - parseInt(cacheTime) < 5 * 60 * 1000)) {
        const parsedData = JSON.parse(cachedData);
        setStores(parsedData.stores);
        setFilteredStores(parsedData.stores);
        setStoreTypes(parsedData.types);
        setStoreNetworks(parsedData.networks);
        setCachedStores(parsedData.stores);
        toast.info('Données chargées depuis le cache');
      } else {
        const [storesData, typesData, networksData] = await Promise.all([
          storeService.getStores({ page_size: 200 }),
          storeService.getStoreTypes(),
          storeService.getStoreNetworks()
        ]);
        
        setStores(storesData.results);
        setFilteredStores(storesData.results);
        setStoreTypes(typesData);
        setStoreNetworks(networksData);
        setCachedStores(storesData.results);
        
        const cacheData = {
          stores: storesData.results,
          types: typesData,
          networks: networksData,
          timestamp: Date.now()
        };
        localStorage.setItem('stores_cache', JSON.stringify(cacheData));
        localStorage.setItem('stores_cache_time', Date.now().toString());
        
        toast.success(`${storesData.results.length} stores chargés avec succès !`);
      }
      
      const end = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        loadTime: end - start
      }));
      
    } catch (error) {
      console.error('Erreur lors du chargement initial:', error);
      toast.error('Erreur lors du chargement des données');
      
      const cachedData = localStorage.getItem('stores_cache');
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        setStores(parsedData.stores || []);
        setFilteredStores(parsedData.stores || []);
        toast.info('Données récupérées depuis le cache (mode dégradé)');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    
    const cleanupCache = () => {
      const cacheTime = localStorage.getItem('stores_cache_time');
      if (cacheTime && (Date.now() - parseInt(cacheTime) > 24 * 60 * 60 * 1000)) {
        localStorage.removeItem('stores_cache');
        localStorage.removeItem('stores_cache_time');
      }
    };
    
    cleanupCache();
  }, [loadInitialData]);

  const loadMoreStores = useCallback(() => {
    if (displayCount >= filteredStores.length) {
      setHasMore(false);
      return;
    }
    
    setDisplayCount(prev => Math.min(prev + 20, filteredStores.length));
    
    if (displayCount + 20 >= filteredStores.length) {
      setHasMore(false);
    }
  }, [displayCount, filteredStores.length]);

  const visibleStores = useMemo(() => {
    return filteredStores.slice(0, displayCount);
  }, [filteredStores, displayCount]);

  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  const handleConfigChange = useCallback((key: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      configuration: {
        ...prev.configuration,
        [key]: value
      }
    }));
  }, []);

  useEffect(() => {
    if (selectedStore && isEditModalOpen) {
      const preparedData = storeService.prepareStoreFormData(selectedStore);
      setFormValues({
        ...preparedData,
        configuration: {
          currency: preparedData.configuration?.currency || 'EUR',
          timezone: preparedData.configuration?.timezone || 'Europe/Paris',
          receipt_header: preparedData.configuration?.receipt_header || '',
          receipt_footer: preparedData.configuration?.receipt_footer || '',
          tax_rate: preparedData.configuration?.tax_rate || 20.0
        }
      });
      
      if (selectedStore.logo) {
        setLogoPreview(selectedStore.logo);
      }
    }
  }, [selectedStore, isEditModalOpen]);

  const resetForm = useCallback(() => {
    setFormValues({
      name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'France', // ✅ CHANGÉ
      phone: '',
      email: '',
      store_type: undefined,
      network: undefined,
      slogan: '',
      configuration: {
        currency: 'EUR', // ✅ CHANGÉ
        timezone: 'Europe/Paris', // ✅ CHANGÉ
        receipt_header: '',
        receipt_footer: '',
        tax_rate: 20.0
      },
      opening_hours: {},
      is_active: true
    });
    setGeoLocation({
      latitude: undefined,
      longitude: undefined,
      accuracy: undefined,
      geocoded_address: undefined
    });
    setLogoFile(null);
    setLogoPreview('');
    setSelectedStore(null);
    setActiveFormTab('basic');
    setLocationError('');
  }, []);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // ✅ GÉOLOCALISATION - Conversion en string pour Django
  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const accuracy = position.coords.accuracy;
        
        // ✅ Convertir en string pour Django
        setGeoLocation({
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          accuracy: accuracy.toString(),
          geocoded_address: geoLocation.geocoded_address
        });
        
        setIsGettingLocation(false);
        toast.success('Position géographique récupérée !');
      },
      (error) => {
        setIsGettingLocation(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permission refusée');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Position indisponible');
            break;
          case error.TIMEOUT:
            setLocationError('Délai dépassé');
            break;
          default:
            setLocationError('Erreur de géolocalisation');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [geoLocation.geocoded_address]);

  const clearLocation = useCallback(() => {
    setGeoLocation({
      latitude: undefined,
      longitude: undefined,
      accuracy: undefined,
      geocoded_address: undefined
    });
    setLocationError('');
  }, []);

  // Actions CRUD
  const handleAddStore = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ CONVERSION DES COORDONNÉES EN STRING POUR DJANGO
    const currentFormData = {
      ...formValuesRef.current,
      latitude: geoLocation.latitude, // ✅ Déjà en string
      longitude: geoLocation.longitude, // ✅ Déjà en string
      accuracy: geoLocation.accuracy,
      geocoded_address: geoLocation.geocoded_address
    };
    
    const errors = storeService.validateStoreForm(currentFormData);
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    setFormLoading(true);

    try {
      const newStore = await storeService.createStore(currentFormData);
      
      if (logoFile && newStore.id) {
        try {
          const logoResponse = await storeService.uploadLogo(newStore.id, logoFile);
          newStore.logo = logoResponse.logo;
        } catch (logoError) {
          console.error('Erreur upload logo:', logoError);
        }
      }
      
      setStores(prev => [...prev, newStore]);
      
      const updatedCache = [...cachedStores, newStore];
      setCachedStores(updatedCache);
      localStorage.setItem('stores_cache', JSON.stringify({
        stores: updatedCache,
        types: storeTypes,
        networks: storeNetworks,
        timestamp: Date.now()
      }));
      
      setIsAddModalOpen(false);
      resetForm();
      toast.success('Store créé avec succès !');
      
    } catch (error: any) {
      console.error('Erreur création:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setFormLoading(false);
    }
  }, [logoFile, cachedStores, storeTypes, storeNetworks, resetForm, geoLocation]);

  const handleEditStore = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    setFormLoading(true);
    try {
      // ✅ CONVERSION DES COORDONNÉES EN STRING POUR DJANGO
      const currentFormData = {
        ...formValuesRef.current,
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        accuracy: geoLocation.accuracy,
        geocoded_address: geoLocation.geocoded_address
      };
      
      const updatedStore = await storeService.updateStore(selectedStore.id, currentFormData);
      
      if (logoFile) {
        try {
          const logoResponse = await storeService.uploadLogo(selectedStore.id, logoFile);
          updatedStore.logo = logoResponse.logo;
        } catch (logoError) {
          console.error('Erreur upload logo:', logoError);
        }
      }
      
      setStores(prev => prev.map(store =>
        store.id === selectedStore.id ? updatedStore : store
      ));
      
      const updatedCache = cachedStores.map(store =>
        store.id === selectedStore.id ? updatedStore : store
      );
      setCachedStores(updatedCache);
      localStorage.setItem('stores_cache', JSON.stringify({
        stores: updatedCache,
        types: storeTypes,
        networks: storeNetworks,
        timestamp: Date.now()
      }));
      
      setIsEditModalOpen(false);
      resetForm();
      toast.success('Store modifié avec succès !');
      
    } catch (error: any) {
      console.error('Erreur modification:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setFormLoading(false);
    }
  }, [selectedStore, logoFile, cachedStores, storeTypes, storeNetworks, resetForm, geoLocation]);

  const handleDeleteStore = useCallback(async () => {
    if (!selectedStore) return;

    setFormLoading(true);
    try {
      await storeService.deleteStore(selectedStore.id);
      
      setStores(prev => prev.filter(store => store.id !== selectedStore.id));
      
      const updatedCache = cachedStores.filter(store => store.id !== selectedStore.id);
      setCachedStores(updatedCache);
      localStorage.setItem('stores_cache', JSON.stringify({
        stores: updatedCache,
        types: storeTypes,
        networks: storeNetworks,
        timestamp: Date.now()
      }));
      
      setIsDeleteModalOpen(false);
      resetForm();
      toast.success('Store supprimé avec succès !');
      
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setFormLoading(false);
    }
  }, [selectedStore, cachedStores, storeTypes, storeNetworks, resetForm]);

  const handleToggleStatus = useCallback(async (storeId: number) => {
    try {
      const store = stores.find(s => s.id === storeId);
      if (!store) return;

      const newStatus = !store.is_active;
      const updatedStore = await storeService.toggleStoreStatus(storeId, newStatus);

      setStores(prev => prev.map(store =>
        store.id === storeId ? updatedStore : store
      ));
      
      const updatedCache = cachedStores.map(store =>
        store.id === storeId ? updatedStore : store
      );
      setCachedStores(updatedCache);
      
      toast.success(`Store ${newStatus ? 'activé' : 'désactivé'} !`);
      
    } catch (error: any) {
      console.error('Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  }, [stores, cachedStores]);

  const openEditModal = useCallback((store: StoreType) => {
    setSelectedStore(store);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((store: StoreType) => {
    setSelectedStore(store);
    setIsDeleteModalOpen(true);
  }, []);

  const openQuickView = useCallback((store: StoreType) => {
    setSelectedStore(store);
    setIsQuickViewOpen(true);
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const exportStores = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Export ${format} généré !`);
    } catch (error) {
      toast.error('Erreur export');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Composant FormTab
  const FormTab = React.memo(({ id, label, icon: Icon, active }: { 
    id: 'basic' | 'advanced'; 
    label: string; 
    icon: React.ElementType;
    active: boolean;
  }) => (
    <button
      type="button"
      onClick={() => setActiveFormTab(id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-all ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  ));

  FormTab.displayName = 'FormTab';

  // Formulaire avec composants STABLES - ADAPTÉ POUR DJANGO
  const CompactForm = React.memo(() => (
    <div className="space-y-4">
      {/* Logo et informations de base */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-500 transition-colors">
              <div className="flex flex-col items-center justify-center">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Preview" 
                    loading="lazy"
                    className="w-32 h-32 rounded-lg object-cover mb-3"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                    <Image className="text-gray-400" size={32} />
                  </div>
                )}
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-1"
                >
                  <Upload size={14} />
                  {logoPreview ? 'Changer' : 'Ajouter logo'}
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formValues.is_active ?? true}
                    onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Store actif</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="space-y-4">
            <StableInput
              label="Nom du store"
              name="name"
              value={formValues.name || ''}
              onChange={handleFieldChange}
              required
              placeholder="Nom du store"
            />

            <StableInput
              label="Slogan"
              name="slogan"
              value={formValues.slogan || ''}
              onChange={handleFieldChange}
              placeholder="Slogan du store"
            />

            <div className="grid grid-cols-2 gap-3">
              <StableSelect
                label="Type de store"
                name="store_type"
                value={formValues.store_type || ''}
                onChange={handleFieldChange}
                options={storeTypes}
                placeholder="Sélectionner un type"
              />

              <StableSelect
                label="Réseau"
                name="network"
                value={formValues.network || ''}
                onChange={handleFieldChange}
                options={storeNetworks}
                placeholder="Sélectionner un réseau"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Informations de contact */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StableInput
            label="Téléphone"
            name="phone"
            value={formValues.phone || ''}
            onChange={handleFieldChange}
            type="tel"
            required
            placeholder="0478123456"
          />

          <StableInput
            label="Email"
            name="email"
            value={formValues.email || ''}
            onChange={handleFieldChange}
            type="email"
            required
            placeholder="contact@store.com"
          />
        </div>
      </div>

      {/* Adresse */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Adresse</h4>
        <div className="space-y-3">
          <StableInput
            label="Adresse ligne 1"
            name="address_line1"
            value={formValues.address_line1 || ''}
            onChange={handleFieldChange}
            required
            placeholder="15 Rue de la République"
          />

          <StableInput
            label="Adresse ligne 2"
            name="address_line2"
            value={formValues.address_line2 || ''}
            onChange={handleFieldChange}
            placeholder="Complément d'adresse"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StableInput
              label="Ville"
              name="city"
              value={formValues.city || ''}
              onChange={handleFieldChange}
              required
              placeholder="Lyon"
            />

            <StableInput
              label="Région"
              name="state"
              value={formValues.state || ''}
              onChange={handleFieldChange}
              required
              placeholder="Auvergne-Rhône-Alpes"
            />

            <StableInput
              label="Code postal"
              name="postal_code"
              value={formValues.postal_code || ''}
              onChange={handleFieldChange}
              required
              placeholder="69002"
            />

            <StableInput
              label="Pays"
              name="country"
              value={formValues.country || 'France'} // ✅ CHANGÉ
              onChange={handleFieldChange}
              required
              placeholder="France"
            />
          </div>
        </div>
      </div>

      {/* Géolocalisation */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Géolocalisation</h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs font-medium flex items-center gap-1"
            >
              {isGettingLocation ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <LocateFixed size={12} />
              )}
              Ma position
            </button>
          </div>
        </div>

        {geoLocation.latitude && geoLocation.longitude ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="text-green-600" size={16} />
                <div>
                  <p className="text-sm font-medium text-green-800">Position enregistrée</p>
                  <p className="text-xs text-green-600">
                    {geoLocation.latitude}, {geoLocation.longitude}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`https://www.google.com/maps?q=${geoLocation.latitude},${geoLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                  title="Voir sur Google Maps"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  onClick={clearLocation}
                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                  title="Effacer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              Aucune position définie.
            </p>
          </div>
        )}

        {locationError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-800">{locationError}</p>
          </div>
        )}
      </div>

      {/* Configuration avancée */}
      {activeFormTab === 'advanced' && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Configuration avancée</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise par défaut
              </label>
              <select
                value={formValues.configuration?.currency || 'EUR'} // ✅ CHANGÉ
                onChange={(e) => handleConfigChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="EUR">Euro (EUR)</option>
                <option value="XOF">Franc CFA (XOF)</option>
                <option value="USD">Dollar US (USD)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuseau horaire
              </label>
              <select
                value={formValues.configuration?.timezone || 'Europe/Paris'} // ✅ CHANGÉ
                onChange={(e) => handleConfigChange('timezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Africa/Abidjan">Africa/Abidjan</option>
                <option value="Africa/Accra">Africa/Accra</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taux de TVA (%)
              </label>
              <StableInput
                label=""
                name="tax_rate"
                value={formValues.configuration?.tax_rate?.toString() || '20.0'}
                onChange={(_, val) => handleConfigChange('tax_rate', parseFloat(val) || 20.0)}
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="20.0"
              />
            </div>

            <StableInput
              label="Entête du reçu"
              name="receipt_header"
              value={formValues.configuration?.receipt_header || ''}
              onChange={(_, val) => handleConfigChange('receipt_header', val)}
              placeholder="Merci de votre visite !"
            />

            <StableInput
              label="Pied du reçu"
              name="receipt_footer"
              value={formValues.configuration?.receipt_footer || ''}
              onChange={(_, val) => handleConfigChange('receipt_footer', val)}
              placeholder="Boutik - Retours sous 30 jours"
            />
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FormTab 
            id="basic" 
            label="Informations de base" 
            icon={Building} 
            active={activeFormTab === 'basic'} 
          />
          <FormTab 
            id="advanced" 
            label="Configuration" 
            icon={Settings} 
            active={activeFormTab === 'advanced'} 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              isEditModalOpen ? setIsEditModalOpen(false) : setIsAddModalOpen(false);
              resetForm();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
          >
            {formLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {isEditModalOpen ? 'Modification...' : 'Création...'}
              </>
            ) : (
              <>
                {isEditModalOpen ? <CheckCircle size={16} /> : <Plus size={16} />}
                {isEditModalOpen ? 'Modifier' : 'Créer'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  ));

  CompactForm.displayName = 'CompactForm';

  const showPerfInfo = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <StoreIcon className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion des Stores</h1>
              <p className="text-gray-600 text-xs">Gérez l'ensemble de vos points de vente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showPerfInfo && (
              <div className="text-xs bg-gray-100 px-2 py-1 rounded mr-2">
                ⚡ {performanceMetrics.loadTime.toFixed(0)}ms
              </div>
            )}
            <button
              onClick={() => exportStores('excel')}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus size={16} />
              <span>Nouveau Store</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Stores" 
            value={calculatedStats.total}
            icon={StoreIcon}
            description={`${calculatedStats.active} actifs`}
            change={{ value: 12, label: 'ce mois' }}
          />
          <StatCard 
            title="Employés" 
            value={calculatedStats.totalEmployees}
            icon={Users}
            description="Total employés"
          />
          <StatCard 
            title="Produits" 
            value={calculatedStats.totalProducts}
            icon={Package2}
            description="En stock"
          />
          <StatCard 
            title="Activité" 
            value={`${calculatedStats.total > 0 ? Math.round((calculatedStats.active / calculatedStats.total) * 100) : 0}%`}
            icon={TrendingUp}
            change={{ value: 5, label: 'vs dernier mois' }}
          />
        </div>

        {showPerfInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-blue-700">
                  🚀 {performanceMetrics.totalStores} stores chargés
                </span>
                <span className="text-blue-600">
                  ⏱️ Filtrage: {performanceMetrics.filterTime.toFixed(1)}ms
                </span>
                <span className="text-blue-600">
                  📊 Stats: {calculatedStats.calculationTime?.toFixed(1) || '0'}ms
                </span>
              </div>
              <button
                onClick={loadInitialData}
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
              >
                <RefreshCw size={12} />
                Rafraîchir
              </button>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un store..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-1 px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"
              >
                <Filter size={16} />
                Filtres {showAdvancedFilters ? '▼' : '▶'}
              </button>
              
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('grid')}
                  className={`p-1.5 rounded transition-all ${
                    currentView === 'grid' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Vue grille"
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`p-1.5 rounded transition-all ${
                    currentView === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Vue liste"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actifs</option>
                      <option value="inactive">Inactifs</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={selectedStoreType}
                      onChange={(e) => setSelectedStoreType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">Tous les types</option>
                      {storeTypes.map(type => (
                        <option key={type.id} value={type.id.toString()}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Réseau
                    </label>
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="all">Tous les réseaux</option>
                      {storeNetworks.map(network => (
                        <option key={network.id} value={network.id.toString()}>{network.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {visibleStores.length} store{visibleStores.length > 1 ? 's' : ''} affiché{visibleStores.length > 1 ? 's' : ''} 
              <span className="text-gray-400 ml-1">
                (sur {filteredStores.length} trouvé{filteredStores.length > 1 ? 's' : ''})
              </span>
              {searchTerm && (
                <span className="text-gray-900 font-medium"> pour "{searchTerm}"</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 hidden sm:inline">Trier par:</span>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {[
                  { field: 'name', label: 'Nom' },
                  { field: 'created_at', label: 'Date' },
                  { field: 'total_employees', label: 'Employés' },
                  { field: 'total_products', label: 'Produits' }
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => toggleSort(field as SortField)}
                    className={`px-3 py-1 rounded text-xs transition-all ${
                      sortBy === field
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {label}
                    {sortBy === field && (
                      <span className="ml-1">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stores Grid/List avec Infinite Scroll */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={32} className="text-blue-600 animate-spin mb-3" />
            <p className="text-gray-600">Chargement des stores...</p>
            {performanceMetrics.loadTime > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {performanceMetrics.loadTime.toFixed(0)}ms
              </p>
            )}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <StoreIcon className="text-blue-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {searchTerm || showAdvancedFilters ? 'Aucun résultat' : 'Aucun store'}
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              {searchTerm 
                ? `Aucun store ne correspond à "${searchTerm}".`
                : 'Commencez par créer votre premier store.'}
            </p>
            <div className="flex gap-2 justify-center">
              {(searchTerm || showAdvancedFilters) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setSelectedStoreType('all');
                    setSelectedNetwork('all');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Créer un store
              </button>
            </div>
          </div>
        ) : (
          <InfiniteScroll
            dataLength={visibleStores.length}
            next={loadMoreStores}
            hasMore={hasMore}
            loader={
              <div className="text-center py-4">
                <Loader2 className="animate-spin inline text-blue-600" size={24} />
                <p className="text-gray-600 mt-2">Chargement des stores suivants...</p>
              </div>
            }
            endMessage={
              <div className="text-center py-6 border-t border-gray-200 mt-4">
                <p className="text-gray-500">
                  ✅ Tous les stores sont affichés ({filteredStores.length} au total)
                </p>
              </div>
            }
            scrollThreshold={0.8}
          >
            {currentView === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleStores.map(store => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    onEdit={() => openEditModal(store)}
                    onDelete={() => openDeleteModal(store)}
                    onToggleStatus={() => handleToggleStatus(store.id)}
                    onView={() => openQuickView(store)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                          Store
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 hidden sm:table-cell">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {visibleStores.map(store => (
                        <tr key={store.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                {store.logo ? (
                                  <img 
                                    src={store.logo} 
                                    alt={store.name}
                                    loading="lazy"
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  store.name.charAt(0)
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{store.name}</p>
                                <p className="text-xs text-gray-600">{store.address_details?.city || 'Non localisé'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="space-y-1">
                              {store.phone && (
                                <p className="text-sm text-gray-900">{store.phone}</p>
                              )}
                              {store.email && (
                                <p className="text-sm text-gray-600 truncate max-w-[150px]">{store.email}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleStatus(store.id)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium ${
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
                                onClick={() => openQuickView(store)}
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => openEditModal(store)}
                                className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(store)}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={16} />
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
          </InfiniteScroll>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* Add/Edit Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl w-full max-w-2xl my-8"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">
                    {isEditModalOpen ? 'Modifier le Store' : 'Nouveau Store'}
                  </h2>
                  <button
                    onClick={() => {
                      isEditModalOpen ? setIsEditModalOpen(false) : setIsAddModalOpen(false);
                      resetForm();
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={isEditModalOpen ? handleEditStore : handleAddStore} className="p-4">
                <CompactForm />
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Modal */}
        {isDeleteModalOpen && selectedStore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl w-full max-w-sm"
            >
              <div className="p-4">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-3">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 text-center mb-3">
                  Supprimer le store
                </h3>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    {selectedStore.logo ? (
                      <img 
                        src={selectedStore.logo} 
                        alt={selectedStore.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      selectedStore.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedStore.name}</p>
                    <p className="text-sm text-gray-600">{selectedStore.address_details?.city}</p>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 mt-0.5" size={16} />
                    <p className="text-sm text-red-800">
                      Cette action est irréversible. Toutes les données seront supprimées.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteStore}
                    disabled={formLoading}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    {formLoading ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Quick View Modal */}
        {isQuickViewOpen && selectedStore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-md"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {selectedStore.logo ? (
                        <img 
                          src={selectedStore.logo} 
                          alt={selectedStore.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        selectedStore.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{selectedStore.name}</h3>
                      <p className="text-sm text-gray-600">{selectedStore.slogan || 'Aucun slogan'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsQuickViewOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Informations</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building size={14} />
                        {selectedStore.store_type_name || 'Non spécifié'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe size={14} />
                        {selectedStore.network_name || 'Aucun réseau'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        Créé le {new Date(selectedStore.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      {selectedStore.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          {selectedStore.phone}
                        </div>
                      )}
                      {selectedStore.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          {selectedStore.email}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Adresse</h4>
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        {selectedStore.address_details?.city && (
                          <p>{selectedStore.address_details.city}</p>
                        )}
                        <p className="text-gray-500 text-xs">
                          {storeService.getFullAddress(selectedStore)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Statistiques</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-700">{selectedStore.total_employees}</div>
                        <div className="text-xs text-blue-600">Employés</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-700">{selectedStore.total_products}</div>
                        <div className="text-xs text-green-600">Produits</div>
                      </div>
                    </div>
                  </div>
                </div> 
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsQuickViewOpen(false);
                      openEditModal(selectedStore);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => window.open(`/stores/${selectedStore.id}`, '_blank')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Détails
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StorePage;