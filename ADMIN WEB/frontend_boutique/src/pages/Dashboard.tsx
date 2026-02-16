// src/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { dashboardService, DashboardData, TimeRange, Shop } from '@services/dashboardService';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler  // ✅ AJOUTÉ
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertCircle,
  FileText,
  RefreshCw,
  Filter,
  X,
  Calendar,
  Store,
  TrendingUp,
  BarChart3,
  Users,
  Warehouse,
  ClipboardCheck,
  CreditCard,
  Truck,
  Receipt,
  UserCircle,
  Activity,
  Circle,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  Settings,
  Bell,
  Shield
} from 'lucide-react';

// ✅ ENREGISTREMENT AVEC FILLER
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler  // ✅ AJOUTÉ
);

interface Activity {
  type: string;
  description: string;
  date: string;
  status: string;
  statusColor: 'success' | 'warning' | 'info' | 'error';
  icon: React.ReactNode;
}

// Interfaces pour normaliser les données
interface NormalizedSale {
  id: number;
  ticketNumber: string;
  totalAmount: number;
  date: string;
  employeeName?: string;
}

interface NormalizedEmployee {
  id: number;
  fullName: string;
  roleName: string;
  isOnline: boolean;
  initials: string;
}

interface LowStockProduct {
  id: number;
  name: string;
  currentStock: number;
  minStockThreshold: number;
  categoryName?: string;
  sku?: string;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('today');
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
  const [stores, setStores] = useState<Shop[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | 'all'>('all');
  const [loadingStores, setLoadingStores] = useState(false);

  // Normaliser les données de vente
  const normalizeSale = useCallback((sale: any): NormalizedSale => ({
    id: sale.id || 0,
    ticketNumber: sale.ticket_number || sale.ticketNumber || `TKT-${sale.id}`,
    totalAmount: sale.total_amount || sale.totalAmount || 0,
    date: sale.sale_date || sale.date || new Date().toISOString(),
    employeeName: sale.employee_name || sale.employeeName
  }), []);

  // Normaliser les données employé
  const normalizeEmployee = useCallback((employee: any): NormalizedEmployee => {
    const fullName = employee.full_name || employee.fullName || 'Employé inconnu';
    const initials = fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return {
      id: employee.id || 0,
      fullName,
      roleName: employee.role_name || employee.position || employee.roleName || 'Non spécifié',
      isOnline: employee.is_online || employee.isOnline || false,
      initials
    };
  }, []);

  // Normaliser les produits en stock faible
  const normalizeLowStockProduct = useCallback((product: any): LowStockProduct => ({
    id: product.id || 0,
    name: product.name || 'Produit inconnu',
    currentStock: product.current_stock || product.currentStock || 0,
    minStockThreshold: product.min_stock_threshold || product.minStockThreshold || 0,
    categoryName: product.category_name || product.categoryName,
    sku: product.sku || 'N/A'
  }), []);

  // Charger la liste des boutiques/magasins
  const fetchStores = useCallback(async () => {
    try {
      setLoadingStores(true);
      const storesData = await dashboardService.getShopsRevenue();
      setStores(storesData);
    } catch (err) {
      console.error('Erreur chargement boutiques:', err);
      setError('Impossible de charger la liste des boutiques');
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  // Charger les données du dashboard
  const fetchDashboardData = useCallback(async (range: string, storeId: number | 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      if (!range) {
        throw new Error('Période non spécifiée');
      }

      const data = await dashboardService.getDashboardData(range, storeId);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Erreur dashboard:', err);
      const errorMessage = err.response?.status === 404 
        ? 'Aucune donnée disponible pour cette période' 
        : err.message || 'Impossible de charger les données du dashboard';
      setError(errorMessage);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialisation
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const ranges = dashboardService.getTimeRanges();
        setTimeRanges(ranges);
        await fetchStores();
        await fetchDashboardData(timeRange, selectedStore);
      } catch (err) {
        console.error('Erreur initialisation dashboard:', err);
        setError('Erreur lors de l\'initialisation du dashboard');
      }
    };

    if (!authLoading) {
      initializeDashboard();
    }
  }, [authLoading, fetchDashboardData, fetchStores, timeRange, selectedStore]);

  // Gérer le changement de boutique
  const handleStoreChange = useCallback((storeId: number | 'all') => {
    setSelectedStore(storeId);
    fetchDashboardData(timeRange, storeId);
  }, [timeRange, fetchDashboardData]);

  // Gérer le changement de période
  const handleTimeRangeChange = useCallback((range: string) => {
    setTimeRange(range);
    fetchDashboardData(range, selectedStore);
  }, [selectedStore, fetchDashboardData]);

  // Données pour le graphique des ventes
  const salesChartData = useMemo(() => ({
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [{
      label: 'Chiffre d\'Affaires', 
      data: dashboardData?.monthly_sales || Array(12).fill(0),
      borderColor: '#3B82F6', 
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
      borderWidth: 2, 
      tension: 0.4, 
      fill: true,  // ✅ Cette option fonctionne maintenant !
      pointBackgroundColor: '#3B82F6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5
    }]
  }), [dashboardData?.monthly_sales]);

  const salesChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false 
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#1F2937',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `CA: ${value.toLocaleString('fr-FR')} FCFA`;
          }
        }
      }
    },
    scales: {
      x: { 
        grid: { 
          display: false 
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          }
        }
      },
      y: { 
        beginAtZero: true,
        grid: {
          color: 'rgba(229, 231, 235, 0.6)',
          drawBorder: false
        },
        ticks: { 
          color: '#6B7280',
          callback: (value: any) => value.toLocaleString('fr-FR') + ' FCFA',
          font: {
            size: 11
          }
        }
      }
    }
  }), []);

  // Données pour le graphique de stock
  const stockChartData = useMemo(() => {
    if (!dashboardData?.stock_by_category || Object.keys(dashboardData.stock_by_category).length === 0) {
      return { 
        labels: ['Aucune donnée disponible'], 
        datasets: [{ 
          data: [1], 
          backgroundColor: ['#F3F4F6'],
          borderWidth: 0
        }] 
      };
    }

    const categories = Object.keys(dashboardData.stock_by_category);
    const stockValues = Object.values(dashboardData.stock_by_category);
    
    return {
      labels: categories,
      datasets: [{
        data: stockValues,
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
          '#6366F1', '#EC4899', '#06B6D4', '#84CC16', '#F97316'
        ],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 8
      }]
    };
  }, [dashboardData?.stock_by_category]);

  const stockChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          color: '#6B7280',
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} unités (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%'
  }), []);

  // Activités récentes avec icônes appropriées
  const recentActivities = useMemo((): Activity[] => {
    const activities: Activity[] = [];

    // Ventes récentes
    if (dashboardData?.recent_sales && dashboardData.recent_sales.length > 0) {
      dashboardData.recent_sales.slice(0, 2).forEach(sale => {
        const normalizedSale = normalizeSale(sale);
        activities.push({
          type: 'Vente',
          description: `Vente ${normalizedSale.ticketNumber} - ${normalizedSale.totalAmount.toLocaleString('fr-FR')} FCFA`,
          date: new Date(normalizedSale.date).toLocaleDateString('fr-FR'),
          status: 'Complétée',
          statusColor: 'success',
          icon: <ShoppingCart className="h-4 w-4" />
        });
      });
    }

    // Alertes stock faible
    if (dashboardData?.low_stock_products && dashboardData.low_stock_products.length > 0) {
      dashboardData.low_stock_products.slice(0, 2).forEach(product => {
        activities.push({
          type: 'Stock',
          description: `${product.name} - Stock faible (${product.current_stock} unités)`,
          date: new Date().toLocaleDateString('fr-FR'),
          status: 'Attention',
          statusColor: 'warning',
          icon: <Package className="h-4 w-4" />
        });
      });
    }

    // Commandes en attente
    if (dashboardData?.stats.pending_orders && dashboardData.stats.pending_orders > 0) {
      activities.push({
        type: 'Commande',
        description: `${dashboardData.stats.pending_orders} commande(s) en attente`,
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'En attente',
        statusColor: 'info',
        icon: <Clock className="h-4 w-4" />
      });
    }

    // Message par défaut si aucune activité
    if (activities.length === 0) {
      activities.push({
        type: 'Système',
        description: 'Aucune activité récente à afficher',
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'Aucune',
        statusColor: 'info',
        icon: <Activity className="h-4 w-4" />
      });
    }

    return activities.slice(0, 4);
  }, [dashboardData, normalizeSale]);

  // Ventes récentes normalisées
  const normalizedRecentSales = useMemo((): NormalizedSale[] => {
    if (!dashboardData?.recent_sales) return [];
    return dashboardData.recent_sales.slice(0, 5).map(normalizeSale);
  }, [dashboardData?.recent_sales, normalizeSale]);

  // Employés normalisés
  const normalizedEmployees = useMemo((): NormalizedEmployee[] => {
    if (!dashboardData?.employees) return [];
    return dashboardData.employees.slice(0, 5).map(normalizeEmployee);
  }, [dashboardData?.employees, normalizeEmployee]);

  // Produits en stock faible normalisés
  const normalizedLowStockProducts = useMemo((): LowStockProduct[] => {
    if (!dashboardData?.low_stock_products) return [];
    return dashboardData.low_stock_products.slice(0, 5).map(normalizeLowStockProduct);
  }, [dashboardData?.low_stock_products, normalizeLowStockProduct]);

  // Statistiques sécurisées
  const stats = useMemo(() => ({
    totalRevenue: dashboardData?.stats?.total_revenue ?? 0,
    totalSalesToday: dashboardData?.stats?.total_sales_today ?? 0,
    totalArticlesSold: dashboardData?.stats?.total_articles_sold ?? 0,
    lowStockAlerts: dashboardData?.stats?.low_stock_alerts ?? 0,
    pendingOrders: dashboardData?.stats?.pending_orders ?? 0
  }), [dashboardData?.stats]);

  // Modules de navigation avec icônes représentatives
  const quickAccessModules = useMemo(() => [
    { 
      title: 'Produits', 
      icon: <Package className="h-5 w-5" />, 
      path: '/products',
      description: 'Gestion du catalogue',
      action: 'Gérer',
      color: 'bg-blue-50 border-blue-100'
    },
    { 
      title: 'Stock', 
      icon: <Warehouse className="h-5 w-5" />, 
      path: '/stock',
      description: 'Niveaux de stock',
      action: 'Vérifier',
      color: 'bg-green-50 border-green-100'
    },
    { 
      title: 'Inventaire', 
      icon: <ClipboardCheck className="h-5 w-5" />, 
      path: '/inventory',
      description: 'Inventaires physiques',
      action: 'Contrôler',
      color: 'bg-purple-50 border-purple-100'
    },
    { 
      title: 'Analytiques', 
      icon: <BarChart3 className="h-5 w-5" />, 
      path: '/analytics',
      description: 'Rapports détaillés',
      action: 'Analyser',
      color: 'bg-indigo-50 border-indigo-100'
    },
    { 
      title: 'Fournisseurs', 
      icon: <Truck className="h-5 w-5" />, 
      path: '/supply',
      description: 'Commandes',
      action: 'Gérer',
      color: 'bg-orange-50 border-orange-100'
    },
    { 
      title: 'Caisse', 
      icon: <CreditCard className="h-5 w-5" />, 
      path: '/cashier',
      description: 'Point de vente',
      action: 'Ouvrir',
      color: 'bg-emerald-50 border-emerald-100'
    }
  ], []);

  // Configuration des KPIs avec icônes représentatives
  const kpis = useMemo(() => [
    { 
      title: "Chiffre d'Affaires", 
      value: dashboardData?.stats?.total_revenue 
        ? `${dashboardData.stats.total_revenue.toLocaleString('fr-FR')} FCFA` 
        : "0 FCFA", 
      description: "Total sur la période",
      trend: dashboardData?.stats?.total_revenue ? "+12.5%" : "0%",
      trendDirection: 'up',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-blue-50 text-blue-600'
    },
    { 
      title: "Transactions", 
      value: dashboardData?.stats?.total_sales_today 
        ? dashboardData.stats.total_sales_today.toString() 
        : "0", 
      description: "Aujourd'hui",
      trend: dashboardData?.stats?.total_sales_today ? "+8.2%" : "0%",
      trendDirection: 'up',
      icon: <ShoppingCart className="h-5 w-5" />,
      color: 'bg-green-50 text-green-600'
    },
    { 
      title: "Commandes", 
      value: dashboardData?.stats?.pending_orders 
        ? dashboardData.stats.pending_orders.toString() 
        : "0", 
      description: "En attente",
      trend: "0%",
      trendDirection: 'neutral',
      icon: <FileText className="h-5 w-5" />,
      color: 'bg-purple-50 text-purple-600'
    },
    { 
      title: "Articles Vendus", 
      value: dashboardData?.stats?.total_articles_sold 
        ? dashboardData.stats.total_articles_sold.toString() 
        : "0", 
      description: "Total",
      trend: dashboardData?.stats?.total_articles_sold ? "+5.7%" : "0%",
      trendDirection: 'up',
      icon: <Package className="h-5 w-5" />,
      color: 'bg-amber-50 text-amber-600'
    },
    { 
      title: "Alertes Stock", 
      value: dashboardData?.stats?.low_stock_alerts 
        ? dashboardData.stats.low_stock_alerts.toString() 
        : "0", 
      description: "À surveiller",
      trend: "Stable",
      trendDirection: dashboardData?.stats?.low_stock_alerts ? 'warning' : 'neutral',
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'bg-red-50 text-red-600'
    }
  ], [dashboardData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Chargement des données utilisateur...</p>
        </div>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Chargement du tableau de bord...</p>
          <p className="text-gray-500 text-xs mt-1">Cela peut prendre quelques secondes</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => fetchDashboardData(timeRange, selectedStore)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-7xl mx-auto">
        
        {/* En-tête avec filtres */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              {user?.first_name && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <UserCircle className="h-3 w-3" />
                  <span>{user.first_name}</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              {dashboardData?.last_updated ? 
                `Dernière mise à jour: ${new Date(dashboardData.last_updated).toLocaleDateString('fr-FR')} à ${new Date(dashboardData.last_updated).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}` : 
                'Vue d\'ensemble de votre activité commerciale'
              }
            </p>
          </div>
          
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {/* Filtre Boutique */}
            <div className="flex-1 sm:flex-none">
              <label htmlFor="store-filter" className="block text-xs font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1">
                  <Store className="h-3 w-3" />
                  Boutique
                </div>
              </label>
              <div className="relative">
                <select 
                  id="store-filter"
                  value={selectedStore}
                  onChange={(e) => handleStoreChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  disabled={loadingStores}
                  className="w-full sm:w-48 pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                >
                  <option value="all">Toutes les boutiques</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Store className="h-4 w-4 text-gray-400" />
                </div>
                {loadingStores && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <RefreshCw className="h-3 w-3 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Filtre Période */}
            <div className="flex-1 sm:flex-none">
              <label htmlFor="time-range" className="block text-xs font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Période
                </div>
              </label>
              <div className="relative">
                <select 
                  id="time-range"
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  disabled={loading}
                  className="w-full sm:w-40 pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                >
                  {timeRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Bouton Actualiser */}
            <div className="flex-1 sm:flex-none self-end sm:self-center">
              <button 
                onClick={() => fetchDashboardData(timeRange, selectedStore)}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualisation...' : 'Actualiser'}
              </button>
            </div>
          </div>
        </div>

        {/* Indicateur de filtre actif */}
        {selectedStore !== 'all' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-blue-700 text-sm">
                  Filtrage actif sur: <span className="font-semibold">
                    {stores.find(store => store.id === selectedStore)?.name || 'Boutique sélectionnée'}
                  </span>
                </p>
                <p className="text-blue-600 text-xs mt-0.5">
                  Les données affichées sont spécifiques à cette boutique
                </p>
              </div>
            </div>
            <button 
              onClick={() => handleStoreChange('all')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 transition-colors p-2 hover:bg-blue-100 rounded-lg"
              title="Effacer le filtre"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Effacer</span>
            </button>
          </div>
        )}

        {/* Alertes */}
        {error && dashboardData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <p className="text-yellow-700 text-sm flex-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {stats.lowStockAlerts > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-amber-800 font-medium text-sm">
                  {stats.lowStockAlerts} alerte(s) de stock faible détectée(s)
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Certains produits nécessitent un réapprovisionnement immédiat
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/stock')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Eye className="h-4 w-4" />
              Voir le stock
            </button>
          </div>
        )}

        {/* Statistiques - 5 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${kpi.color} border`}>
                  {kpi.icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  kpi.trendDirection === 'up' 
                    ? 'bg-green-50 text-green-700' 
                    : kpi.trendDirection === 'warning'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {kpi.trendDirection === 'up' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : kpi.trendDirection === 'warning' ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : null}
                  {kpi.trend}
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</p>
                <p className="text-sm font-medium text-gray-900 mb-1">{kpi.title}</p>
                <p className="text-xs text-gray-500">{kpi.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Évolution du chiffre d'affaires</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {timeRange === 'today' ? "Aujourd'hui" : 
                   timeRange === 'week' ? "Cette semaine" :
                   timeRange === 'month' ? "Ce mois" : "Cette année"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">Chiffre d'affaires</span>
                </div>
              </div>
            </div>
            <div className="h-72">
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Répartition du stock</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {Object.keys(dashboardData?.stock_by_category || {}).length} catégories
                </p>
              </div>
            </div>
            <div className="h-72">
              <Doughnut data={stockChartData} options={stockChartOptions} />
            </div>
          </div>
        </div>

        {/* Modules d'accès rapide */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Accès rapide</h3>
            <p className="text-sm text-gray-500">Navigation principale</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickAccessModules.map((module, index) => (
              <button
                key={index}
                onClick={() => navigate(module.path)}
                className={`${module.color} border rounded-xl p-4 text-left hover:shadow-md transition-all duration-200 group`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-lg mb-3 ${module.color.replace('border-', 'bg-').replace('100', '50')}`}>
                    {module.icon}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {module.title}
                  </h4>
                  <p className="text-xs text-gray-600 mb-3 leading-tight">
                    {module.description}
                  </p>
                  <div className="text-xs font-medium text-gray-700 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                    {module.action}
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dernières activités et équipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Ventes Récentes */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-gray-400" />
                Dernières ventes
              </h3>
              <button 
                onClick={() => navigate('/sales')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Voir tout
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {normalizedRecentSales.length > 0 ? (
                normalizedRecentSales.map((sale) => (
                  <div key={sale.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              #{sale.ticketNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(sale.date).toLocaleDateString('fr-FR')}
                              {sale.employeeName && ` • ${sale.employeeName}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {sale.totalAmount.toLocaleString('fr-FR')} FCFA
                        </p>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          <span>Complétée</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Receipt className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Aucune vente récente</p>
                  <p className="text-gray-400 text-xs mt-1">Les ventes apparaîtront ici</p>
                </div>
              )}
            </div>
          </div>

          {/* Équipe */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                Équipe en ligne
              </h3>
              <button 
                onClick={() => navigate('/team')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Gérer
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {normalizedEmployees.length > 0 ? (
                normalizedEmployees.map((employee) => (
                  <div key={employee.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">{employee.initials}</span>
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            employee.isOnline ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{employee.fullName}</p>
                          <p className="text-xs text-gray-500">{employee.roleName}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                        employee.isOnline 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {employee.isOnline ? (
                          <>
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            En ligne
                          </>
                        ) : (
                          'Hors ligne'
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Aucun employé</p>
                  <p className="text-gray-400 text-xs mt-1">Ajoutez des membres à votre équipe</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Produits en stock faible */}
        {normalizedLowStockProducts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Produits en stock faible</h3>
                  <p className="text-sm text-gray-500">Nécessitent un réapprovisionnement</p>
                </div>
              </div>
              <div className="text-amber-600 text-sm font-medium flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {normalizedLowStockProducts.length} produit(s)
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {normalizedLowStockProducts.map((product) => (
                <div key={product.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {product.categoryName && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">{product.categoryName}</span>
                        )}
                        <span>SKU: {product.sku}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-amber-600">
                          {product.currentStock} unités
                        </span>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-xs text-gray-500">
                        Seuil minimum: {product.minStockThreshold}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button 
                onClick={() => navigate('/stock')}
                className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Voir tous les produits en stock faible
              </button>
            </div>
          </div>
        )}

        {/* Activités Récentes */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              Activités récentes
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivities.map((activity, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    activity.statusColor === 'success' ? 'bg-green-50' :
                    activity.statusColor === 'warning' ? 'bg-amber-50' :
                    activity.statusColor === 'info' ? 'bg-blue-50' :
                    'bg-red-50'
                  }`}>
                    <div className={`${
                      activity.statusColor === 'success' ? 'text-green-600' :
                      activity.statusColor === 'warning' ? 'text-amber-600' :
                      activity.statusColor === 'info' ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {activity.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.type}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        activity.statusColor === 'success' ? 'bg-green-100 text-green-800' :
                        activity.statusColor === 'warning' ? 'bg-amber-100 text-amber-800' :
                        activity.statusColor === 'info' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                      <Calendar className="h-3 w-3" />
                      <span>{activity.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;