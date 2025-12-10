// src/services/dashboardService.ts
import { apiService } from './api';

// Interfaces pour les données du Dashboard
export interface Shop {
  id: string;
  name: string;
  daily_revenue?: number;
  dailyRevenue?: number;
  currency: string;
  address?: string;
  city?: string;
  country?: string;
  total_employees?: number;
  total_products?: number;
  store_type_name?: string;
  network_name?: string;
  address_details?: {
    full_address: string;
    city: string;
    country: string;
  };
  phone?: string;
  email?: string;
  is_active?: boolean;
}

export interface Sale {
  id: string;
  ticket_number?: string;
  ticketNumber?: string;
  employee_name?: string;
  employeeName?: string;
  date: string;
  sale_date?: string;
  total_amount?: number;
  totalAmount?: number;
  currency: string;
  employee?: number;
  store?: number;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Employee {
  id: string;
  last_name?: string;
  lastName?: string;
  first_name?: string;
  firstName?: string;
  full_name?: string;
  last_connection?: string;
  lastConnection?: string;
  total_sales?: number;
  totalSales?: number;
  currency: string;
  is_online?: boolean;
  isOnline?: boolean;
  position?: string;
  role_name?: string;
  email?: string;
  phone?: string;
  store?: number;
  store_name?: string;
  is_active?: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    user_type_name: string;
  };
  hire_date?: string;
  salary?: string;
  department_name?: string;
}

export interface DashboardStats {
  total_shops?: number;
  totalShops?: number;
  total_revenue?: number;
  totalRevenue?: number;
  total_employees?: number;
  totalEmployees?: number;
  total_sales_today?: number;
  totalSalesToday?: number;
  daily_sales?: number;
  low_stock_alerts?: number;
  total_articles_sold?: number;
  total_articles_sold_today?: number;
  pending_orders?: number;
  new_requests?: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  base_price: number;
  current_stock: number;
  min_stock_threshold: number;
  stock_status: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_name: string;
  items_count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  stores: Shop[];
  recent_sales: Sale[];
  employees: Employee[];
  low_stock_products: Product[];
  monthly_sales: number[];
  stock_by_category: { [key: string]: number };
  top_selling_products: { product: string; quantity: number; revenue: number }[];
  payment_methods_distribution: { method: string; amount: number; percentage: number }[];
  time_range: string;
  last_updated: string;
}

export interface TimeRange {
  value: string;
  label: string;
}

// Service final - uniquement les données de l'API
export const dashboardService = {
  // Récupérer toutes les données du dashboard formatées
  async getDashboardData(timeRange: string = 'today'): Promise<DashboardData> {
    try {
      console.log('📊 Chargement de toutes les données du dashboard...');
      
      const [stats, stores, sales, employees, lowStockProducts, orders] = await Promise.all([
        this.getStats(),
        this.getShopsRevenue(),
        this.getRecentSales(),
        this.getEmployeesPerformance(),
        this.getLowStockProducts(),
        this.getPendingOrders()
      ]);

      // Calculer les données pour les graphiques basées sur les données réelles
      const monthlySales = await this.calculateMonthlySales(sales);
      const stockByCategory = await this.calculateStockByCategory();
      const topSellingProducts = await this.getTopSellingProducts();
      const totalArticlesSold = await this.calculateTotalArticlesSold(sales);

      const dashboardData: DashboardData = {
        stats: {
          ...stats,
          low_stock_alerts: lowStockProducts.length,
          total_articles_sold: totalArticlesSold.total,
          total_articles_sold_today: totalArticlesSold.today,
          pending_orders: orders.length,
          new_requests: await this.getNewRequestsCount()
        },
        stores,
        recent_sales: sales.slice(0, 10), // 10 dernières ventes
        employees: employees.slice(0, 10), // 10 derniers employés
        low_stock_products: lowStockProducts,
        monthly_sales: monthlySales,
        stock_by_category: stockByCategory,
        top_selling_products: topSellingProducts,
        payment_methods_distribution: await this.getPaymentMethodsDistribution(sales),
        time_range: timeRange,
        last_updated: new Date().toISOString()
      };

      console.log('✅ Toutes les données du dashboard chargées:', {
        stats: dashboardData.stats,
        storesCount: dashboardData.stores.length,
        salesCount: dashboardData.recent_sales.length,
        employeesCount: dashboardData.employees.length,
        lowStockCount: dashboardData.low_stock_products.length
      });

      return dashboardData;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données du dashboard:', error);
      throw new Error('Impossible de charger les données du dashboard');
    }
  },

  // Récupérer les statistiques du dashboard
  async getStats(): Promise<DashboardStats> {
    try {
      console.log('📊 Tentative de récupération des statistiques...');
      
      // Calculer les stats depuis les autres endpoints
      const [shops, employees, sales] = await Promise.all([
        this.getShopsRevenue(),
        this.getEmployeesPerformance(),
        this.getRecentSales()
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.date).toISOString().split('T')[0];
        return saleDate === today;
      });
      
      return {
        totalShops: shops.length,
        totalEmployees: employees.length,
        totalSalesToday: todaySales.length,
        totalRevenue: todaySales.reduce((sum, sale) => sum + (sale.total_amount || sale.totalAmount || 0), 0),
        daily_sales: todaySales.reduce((sum, sale) => sum + (sale.total_amount || sale.totalAmount || 0), 0)
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stats:', error);
      return {
        totalShops: 0,
        totalRevenue: 0,
        totalEmployees: 0,
        totalSalesToday: 0,
        daily_sales: 0
      };
    }
  },

  // Récupérer les boutiques
  async getShopsRevenue(): Promise<Shop[]> {
    try {
      console.log('🔄 Chargement des boutiques...');
      const response = await apiService.get<any>('/stores/');
      console.log('🛒 Réponse complète boutiques:', response);
      
      // Gérer la pagination Django - extraire les résultats
      const shopsData = response.data?.results || response.data || [];
      const shops = Array.isArray(shopsData) ? shopsData : [];
      
      console.log(`✅ ${shops.length} boutiques reçues`);
      return shops.map(shop => this.normalizeShop(shop));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des boutiques:', error);
      return [];
    }
  },

  // Récupérer les ventes récentes
  async getRecentSales(): Promise<Sale[]> {
    try {
      console.log('🔄 Chargement des ventes récentes...');
      const response = await apiService.get<any>('/sales/');
      console.log('💰 Réponse complète ventes:', response);
      
      // Gérer la pagination Django - extraire les résultats
      const salesData = response.data?.results || response.data || [];
      const sales = Array.isArray(salesData) ? salesData : [];
      
      console.log(`✅ ${sales.length} ventes reçues`);
      
      // Trier par date et prendre les 50 dernières pour les calculs
      return sales
        .sort((a, b) => new Date(b.sale_date || b.date).getTime() - new Date(a.sale_date || a.date).getTime())
        .slice(0, 50)
        .map(sale => this.normalizeSale(sale));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des ventes:', error);
      return [];
    }
  },

  // Récupérer les performances des employés
  async getEmployeesPerformance(): Promise<Employee[]> {
    try {
      console.log('🔄 Chargement des employés...');
      const response = await apiService.get<any>('/employees/');
      console.log('👥 Réponse complète employés:', response);
      
      // Gérer la pagination Django - extraire les résultats
      const employeesData = response.data?.results || response.data || [];
      const employees = Array.isArray(employeesData) ? employeesData : [];
      
      console.log(`✅ ${employees.length} employés reçus`);
      return employees.map(emp => this.normalizeEmployee(emp));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des employés:', error);
      return [];
    }
  },

  // Récupérer les produits en stock faible
  async getLowStockProducts(): Promise<Product[]> {
    try {
      console.log('🔄 Chargement des produits en stock faible...');
      const response = await apiService.get<any>('/products/');
      console.log('📦 Réponse complète produits:', response);
      
      // Gérer la pagination Django
      const productsData = response.data?.results || response.data || [];
      const products = Array.isArray(productsData) ? productsData : [];
      
      // Filtrer les produits en stock faible
      const lowStockProducts = products.filter((product: any) => {
        const currentStock = product.current_stock || product.stock_quantity || 0;
        const minThreshold = product.min_stock_threshold || product.min_threshold || 10;
        return currentStock <= minThreshold;
      });
      
      console.log(`✅ ${lowStockProducts.length} produits en stock faible`);
      
      return lowStockProducts.map(product => ({
        id: product.id,
        name: product.name || 'Produit sans nom',
        sku: product.sku || product.code || 'N/A',
        category_name: product.category_name || product.category?.name || 'Non catégorisé',
        base_price: product.base_price || product.price || 0,
        current_stock: product.current_stock || product.stock_quantity || 0,
        min_stock_threshold: product.min_stock_threshold || product.min_threshold || 10,
        stock_status: 'LOW'
      }));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des produits:', error);
      return [];
    }
  },

  // Récupérer les commandes en attente
  async getPendingOrders(): Promise<Order[]> {
    try {
      console.log('🔄 Chargement des commandes en attente...');
      const response = await apiService.get<any>('/orders/');
      console.log('📋 Réponse complète commandes:', response);
      
      // Gérer la pagination Django
      const ordersData = response.data?.results || response.data || [];
      const orders = Array.isArray(ordersData) ? ordersData : [];
      
      // Filtrer les commandes en attente
      const pendingOrders = orders.filter((order: any) => 
        order.status === 'pending' || order.status === 'processing'
      );
      
      console.log(`✅ ${pendingOrders.length} commandes en attente`);
      
      return pendingOrders.map(order => ({
        id: order.id?.toString() || '0',
        order_number: order.order_number || `CMD-${order.id}`,
        status: order.status || 'pending',
        total_amount: order.total_amount || order.totalAmount || 0,
        created_at: order.created_at || order.date || new Date().toISOString(),
        customer_name: order.customer_name || order.customer?.name || 'Client',
        items_count: order.items_count || order.items?.length || 0
      }));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des commandes:', error);
      return [];
    }
  },

  // Calculer le total des articles vendus
  async calculateTotalArticlesSold(sales: Sale[]): Promise<{ total: number; today: number }> {
    try {
      console.log('📦 Calcul du total des articles vendus...');
      
      let totalArticles = 0;
      let todayArticles = 0;
      const today = new Date().toISOString().split('T')[0];
      
      // Pour chaque vente, calculer le nombre total d'articles
      sales.forEach(sale => {
        // Si les données des items sont disponibles
        if (sale.items && Array.isArray(sale.items)) {
          const saleItemsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
          totalArticles += saleItemsCount;
          
          const saleDate = new Date(sale.date).toISOString().split('T')[0];
          if (saleDate === today) {
            todayArticles += saleItemsCount;
          }
        }
      });
      
      console.log(`✅ Articles vendus - Total: ${totalArticles}, Aujourd'hui: ${todayArticles}`);
      
      return { total: totalArticles, today: todayArticles };
    } catch (error) {
      console.error('❌ Erreur lors du calcul des articles vendus:', error);
      return { total: 0, today: 0 };
    }
  },

  // Récupérer le nombre de nouvelles demandes
  async getNewRequestsCount(): Promise<number> {
    try {
      console.log('🔄 Chargement des nouvelles demandes...');
      
      // Essayer différents endpoints pour les demandes
      try {
        const response = await apiService.get<any>('/requests/');
        const requestsData = response.data?.results || response.data || [];
        const requests = Array.isArray(requestsData) ? requestsData : [];
        
        // Filtrer les nouvelles demandes (statut "new" ou créées aujourd'hui)
        const today = new Date().toISOString().split('T')[0];
        const newRequests = requests.filter((request: any) => 
          request.status === 'new' || 
          request.status === 'pending' ||
          (request.created_at && request.created_at.includes(today))
        );
        
        console.log(`✅ ${newRequests.length} nouvelles demandes`);
        return newRequests.length;
      } catch (error) {
        console.log('❌ Endpoint requests non disponible');
        return 0;
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des nouvelles demandes:', error);
      return 0;
    }
  },

  // Calculer les ventes mensuelles basées sur les données réelles
  async calculateMonthlySales(sales: Sale[]): Promise<number[]> {
    try {
      console.log('📈 Calcul des ventes mensuelles...');
      
      const monthlySales = Array(12).fill(0);
      const currentYear = new Date().getFullYear();
      
      sales.forEach(sale => {
        const saleDate = new Date(sale.date);
        if (saleDate.getFullYear() === currentYear) {
          const month = saleDate.getMonth();
          monthlySales[month] += sale.total_amount || sale.totalAmount || 0;
        }
      });
      
      console.log('✅ Ventes mensuelles calculées:', monthlySales);
      return monthlySales;
    } catch (error) {
      console.error('❌ Erreur lors du calcul des ventes mensuelles:', error);
      return Array(12).fill(0);
    }
  },

  // Calculer la répartition du stock par catégorie
  async calculateStockByCategory(): Promise<{ [key: string]: number }> {
    try {
      console.log('📊 Calcul de la répartition du stock...');
      const response = await apiService.get<any>('/products/');
      
      const productsData = response.data?.results || response.data || [];
      const products = Array.isArray(productsData) ? productsData : [];
      
      const stockByCategory: { [key: string]: number } = {};
      
      products.forEach((product: any) => {
        const category = product.category_name || product.category?.name || 'Autres';
        const stock = product.current_stock || product.stock_quantity || 0;
        
        stockByCategory[category] = (stockByCategory[category] || 0) + stock;
      });
      
      console.log('✅ Répartition du stock calculée:', stockByCategory);
      return stockByCategory;
    } catch (error) {
      console.error('❌ Erreur lors du calcul de la répartition du stock:', error);
      return {};
    }
  },

  // Récupérer les produits les plus vendus
  async getTopSellingProducts(): Promise<{ product: string; quantity: number; revenue: number }[]> {
    try {
      console.log('🏆 Récupération des produits les plus vendus...');
      
      // Pour l'instant, retourner un tableau vide
      // Dans une vraie implémentation, vous auriez un endpoint dédié
      return [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des produits populaires:', error);
      return [];
    }
  },

  // Calculer la distribution des méthodes de paiement
  async getPaymentMethodsDistribution(sales: Sale[]): Promise<{ method: string; amount: number; percentage: number }[]> {
    try {
      console.log('💳 Calcul de la distribution des paiements...');
      
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_amount || sale.totalAmount || 0), 0);
      
      if (totalRevenue === 0) {
        return [];
      }
      
      // Pour l'instant, retourner un tableau vide
      // Dans une vraie implémentation, vous auriez ces données depuis l'API
      return [];
    } catch (error) {
      console.error('❌ Erreur lors du calcul de la distribution des paiements:', error);
      return [];
    }
  },

  // Retourne la liste des périodes de temps disponibles
  getTimeRanges(): TimeRange[] {
    return [
      { value: 'today', label: "Aujourd'hui" },
      { value: 'week', label: 'Cette semaine' },
      { value: 'month', label: 'Ce mois' },
      { value: 'quarter', label: 'Ce trimestre' },
      { value: 'year', label: 'Cette année' },
    ];
  },

  // Normalisation des données
  normalizeShop(shop: any): Shop {
    return {
      id: shop.id?.toString() || '0',
      name: shop.name || 'Boutique sans nom',
      daily_revenue: shop.daily_revenue || shop.dailyRevenue || 0,
      dailyRevenue: shop.daily_revenue || shop.dailyRevenue || 0,
      currency: shop.currency || 'FCFA',
      address: shop.address_details?.full_address || shop.address,
      city: shop.address_details?.city || shop.city,
      country: shop.address_details?.country || shop.country,
      total_employees: shop.total_employees || 0,
      total_products: shop.total_products || 0,
      store_type_name: shop.store_type_name,
      network_name: shop.network_name,
      address_details: shop.address_details,
      phone: shop.phone,
      email: shop.email,
      is_active: shop.is_active !== undefined ? shop.is_active : true
    };
  },

  normalizeSale(sale: any): Sale {
    return {
      id: sale.id?.toString() || '0',
      ticket_number: sale.ticket_number || sale.ticketNumber || `TKT-${sale.id}`,
      ticketNumber: sale.ticket_number || sale.ticketNumber || `TKT-${sale.id}`,
      employee_name: sale.employee_name || sale.employeeName,
      employeeName: sale.employee_name || sale.employeeName,
      date: sale.sale_date || sale.date || new Date().toISOString(),
      sale_date: sale.sale_date || sale.date || new Date().toISOString(),
      total_amount: sale.total_amount || sale.totalAmount || 0,
      totalAmount: sale.total_amount || sale.totalAmount || 0,
      currency: sale.currency || 'FCFA',
      employee: sale.employee || sale.employee_id,
      store: sale.store || sale.store_id,
      items: sale.items || sale.sale_items || []
    };
  },

  normalizeEmployee(employee: any): Employee {
    const userData = employee.user || {};
    
    const normalizedEmployee = {
      id: employee.id?.toString() || userData.id?.toString() || '0',
      last_name: employee.last_name || userData.last_name || employee.lastName || '',
      lastName: employee.last_name || userData.last_name || employee.lastName || '',
      first_name: employee.first_name || userData.first_name || employee.firstName || '',
      firstName: employee.first_name || userData.first_name || employee.firstName || '',
      full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Nom Complet',
      last_connection: employee.last_login || userData.last_login || employee.lastConnection,
      lastConnection: employee.last_login || userData.last_login || employee.lastConnection,
      total_sales: employee.total_sales || employee.totalSales || 0,
      totalSales: employee.total_sales || employee.totalSales || 0,
      currency: employee.currency || 'FCFA',
      is_online: employee.is_online || employee.isOnline || false,
      isOnline: employee.is_online || employee.isOnline || false,
      position: employee.position || employee.role_name || employee.role || '',
      role_name: employee.role_name || employee.role || '',
      email: employee.email || userData.email || '',
      phone: employee.phone || userData.phone || '',
      store: employee.store || employee.store_id,
      store_name: employee.store_name,
      is_active: employee.is_active !== undefined ? employee.is_active : true,
      user: employee.user,
      hire_date: employee.hire_date,
      salary: employee.salary,
      department_name: employee.department_name
    };
    
    return normalizedEmployee;
  }
};

export default dashboardService;