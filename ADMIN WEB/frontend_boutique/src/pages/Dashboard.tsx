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
  Legend 
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Activity {
  type: string;
  description: string;
  date: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'blue' | 'red';
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
      fill: true,
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

  // Activités récentes
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
          statusColor: 'green'
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
          statusColor: 'yellow'
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
        statusColor: 'blue'
      });
    }

    // Message par défaut si aucune activité
    if (activities.length === 0) {
      activities.push({
        type: 'Système',
        description: 'Aucune activité récente à afficher',
        date: new Date().toLocaleDateString('fr-FR'),
        status: 'Aucune',
        statusColor: 'blue'
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

  // Modules de navigation
  const quickAccessModules = useMemo(() => [
    { 
      title: 'Produits', 
      icon: '📦', 
      path: '/products',
      description: 'Gestion du catalogue produits',
      action: 'Gérer',
      color: 'from-blue-50 to-blue-100'
    },
    { 
      title: 'Stock', 
      icon: '📊', 
      path: '/stock',
      description: 'Suivi des niveaux de stock',
      action: 'Voir',
      color: 'from-orange-50 to-orange-100'
    },
    { 
      title: 'Inventaire', 
      icon: '📋', 
      path: '/inventory',
      description: 'Inventaires physiques',
      action: 'Ouvrir',
      color: 'from-green-50 to-green-100'
    },
    { 
      title: 'Comptabilité', 
      icon: '💰', 
      path: '/analytics',
      description: 'Finances et rapports',
      action: 'Accéder',
      color: 'from-purple-50 to-purple-100'
    },
    { 
      title: 'Approvisionnement', 
      icon: '🚚', 
      path: '/supply',
      description: 'Commandes fournisseurs',
      action: 'Gérer',
      color: 'from-red-50 to-red-100'
    },
    { 
      title: 'Caisse', 
      icon: '💵', 
      path: '/cashier',
      description: 'Points de vente',
      action: 'Ouvrir',
      color: 'from-emerald-50 to-emerald-100'
    }
  ], []);

  // Configuration des KPIs exactement comme demandé
  const kpis = useMemo(() => [
    { 
      title: "Chiffre d'Affaires", 
      value: "0 FCFA", 
      description: "Total",
      trend: "• 0%",
      icon: "💰"
    },
    { 
      title: "Transactions", 
      value: "0", 
      description: "Aujourd'hui",
      trend: "• 0%",
      icon: "📈"
    },
    { 
      title: "Commande", 
      value: "0", 
      description: "Aujourd'hui",
      trend: "• 0%",
      icon: "💰"
    },
    { 
      title: "Articles Vendus", 
      value: "0", 
      description: "Total",
      trend: "• 0%",
      icon: "📦"
    },
    { 
      title: "Alertes Stock", 
      value: "0", 
      description: "En attente",
      trend: "• Stable",
      icon: "⚠️"
    }
  ], []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-exclamation-triangle text-red-600"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <button 
            onClick={() => fetchDashboardData(timeRange, selectedStore)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <i className="fas fa-redo text-sm"></i>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-7xl mx-auto">
        
        {/* En-tête avec filtres */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
              {user?.first_name && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {user.first_name}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              {dashboardData?.last_updated ? 
                `Dernière mise à jour: ${new Date(dashboardData.last_updated).toLocaleString('fr-FR')}` : 
                'Vue d\'ensemble de votre activité commerciale'
              }
            </p>
          </div>
          
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {/* Filtre Boutique */}
            <div className="flex-1 sm:flex-none">
              <label htmlFor="store-filter" className="block text-xs font-medium text-gray-700 mb-1">
                Boutique
              </label>
              <div className="relative">
                <select 
                  id="store-filter"
                  value={selectedStore}
                  onChange={(e) => handleStoreChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  disabled={loadingStores}
                  className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  <option value="all">Toutes les boutiques</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
                {loadingStores && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Filtre Période */}
            <div className="flex-1 sm:flex-none">
              <label htmlFor="time-range" className="block text-xs font-medium text-gray-700 mb-1">
                Période
              </label>
              <select 
                id="time-range"
                value={timeRange}
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                disabled={loading}
                className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton Actualiser */}
            <div className="flex-1 sm:flex-none self-end sm:self-center">
              <button 
                onClick={() => fetchDashboardData(timeRange, selectedStore)}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <i className={`fas fa-sync-alt text-sm ${loading ? 'animate-spin' : ''}`}></i>
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Indicateur de filtre actif */}
        {selectedStore !== 'all' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fas fa-filter text-blue-600 text-sm"></i>
              <p className="text-blue-700 text-sm">
                Filtrage actif: <span className="font-medium">
                  {stores.find(store => store.id === selectedStore)?.name || 'Boutique sélectionnée'}
                </span>
              </p>
            </div>
            <button 
              onClick={() => handleStoreChange('all')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 transition-colors"
            >
              <i className="fas fa-times text-xs"></i>
              Effacer
            </button>
          </div>
        )}

        {/* Alertes */}
        {error && dashboardData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-3">
            <i className="fas fa-exclamation-triangle text-yellow-600 text-sm"></i>
            <p className="text-yellow-700 text-sm flex-1">{error}</p>
          </div>
        )}

        {stats.lowStockAlerts > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="fas fa-exclamation-triangle text-amber-600 text-sm"></i>
              <div>
                <p className="text-amber-800 font-medium text-sm">
                  {stats.lowStockAlerts} alerte(s) de stock faible
                </p>
                <p className="text-amber-700 text-xs">
                  Certains produits nécessitent un réapprovisionnement
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/stock')}
              className="px-3 py-1 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm"
            >
              Voir le stock
            </button>
          </div>
        )}

        {/* Statistiques - 5 KPIs comme demandé */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-xs font-medium mb-1">{kpi.title}</p>
                  <p className="text-xl font-bold text-gray-900 mb-1">{kpi.value}</p>
                  <p className="text-gray-500 text-xs mb-2">{kpi.description}</p>
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {kpi.trend}
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">{kpi.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Évolution du CA</h3>
              <span className="text-xs text-gray-500">
                {timeRange === 'today' ? "Aujourd'hui" : 
                 timeRange === 'week' ? "Cette semaine" :
                 timeRange === 'month' ? "Ce mois" : "Cette année"}
              </span>
            </div>
            <div className="h-64">
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Répartition du Stock</h3>
              <span className="text-xs text-gray-500">
                {Object.keys(dashboardData?.stock_by_category || {}).length} catégories
              </span>
            </div>
            <div className="h-64">
              <Doughnut data={stockChartData} options={stockChartOptions} />
            </div>
          </div>
        </div>

        {/* Modules d'accès rapide */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Accès Rapide</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickAccessModules.map((module, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group cursor-pointer"
                onClick={() => navigate(module.path)}
              >
                <div className="p-4 text-center">
                  <div className={`w-12 h-12 bg-gradient-to-br ${module.color} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform`}>
                    <span className="text-xl">{module.icon}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {module.title}
                  </h4>
                  <p className="text-xs text-gray-600 mb-3 leading-tight">
                    {module.description}
                  </p>
                  <div className="bg-blue-600 text-white py-1.5 px-3 rounded text-xs font-medium hover:bg-blue-700 transition-colors group-hover:shadow-sm">
                    {module.action}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dernières activités et équipe */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Ventes Récentes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Dernières Ventes</h3>
            </div>
            <div className="p-4">
              {normalizedRecentSales.length > 0 ? (
                <div className="space-y-3">
                  {normalizedRecentSales.map((sale) => (
                    <div key={sale.id} className="flex justify-between items-center py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          #{sale.ticketNumber}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {new Date(sale.date).toLocaleDateString('fr-FR')}
                          {sale.employeeName && ` • ${sale.employeeName}`}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap ml-2">
                        {sale.totalAmount.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-receipt text-gray-400"></i>
                  </div>
                  <p className="text-gray-500 text-sm">Aucune vente récente</p>
                </div>
              )}
            </div>
          </div>

          {/* Équipe */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Équipe en Ligne</h3>
            </div>
            <div className="p-4">
              {normalizedEmployees.length > 0 ? (
                <div className="space-y-3">
                  {normalizedEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {employee.initials}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                          employee.isOnline ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employee.fullName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {employee.roleName}
                        </p>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        employee.isOnline 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.isOnline ? 'En ligne' : 'Hors ligne'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-users text-gray-400"></i>
                  </div>
                  <p className="text-gray-500 text-sm">Aucun employé</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Produits en stock faible */}
        {normalizedLowStockProducts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Produits en Stock Faible</h3>
                <span className="text-xs text-amber-600 font-medium">
                  {normalizedLowStockProducts.length} produit(s)
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {normalizedLowStockProducts.map((product) => (
                  <div key={product.id} className="flex justify-between items-center py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {product.categoryName} • SKU: {product.sku}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap ml-2">
                      <p className="text-sm font-semibold text-amber-600">
                        {product.currentStock} unités
                      </p>
                      <p className="text-xs text-gray-500">
                        Seuil: {product.minStockThreshold}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activités Récentes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Activités Récentes</h3>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentActivities.map((activity, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            activity.statusColor === 'green' ? 'bg-green-100 text-green-600' :
                            activity.statusColor === 'yellow' ? 'bg-amber-100 text-amber-600' :
                            activity.statusColor === 'blue' ? 'bg-blue-100 text-blue-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            <span className="text-sm">
                              {activity.type === 'Vente' ? '💰' :
                               activity.type === 'Stock' ? '📊' :
                               activity.type === 'Commande' ? '📋' : '⚙️'}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">{activity.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{activity.date}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          activity.statusColor === 'green' ? 'bg-green-100 text-green-800' :
                          activity.statusColor === 'yellow' ? 'bg-amber-100 text-amber-800' :
                          activity.statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;