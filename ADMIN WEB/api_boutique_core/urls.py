# api_boutique_core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView,TokenVerifyView
from . import views

# =============================================================================
# ROUTER PRINCIPAL
# =============================================================================

router = DefaultRouter()

# =============================================================================
# CAISSES ET TRANSACTIONS FINANCIÈRES (Endpoints principaux de votre screenshot)
# =============================================================================

router.register(r'caisses', views.CashRegisterViewSet, basename='caisses')
router.register(r'cash-sessions', views.CashRegisterSessionViewSet, basename='cash-sessions')
router.register(r'cash-transactions', views.CashTransactionViewSet, basename='cash-transactions')

# =============================================================================
# CARD-TRANSACTIONS (De votre screenshot)
# =============================================================================

router.register(r'card-transactions', views.CardTransactionViewSet, basename='card-transactions')

# =============================================================================
# CARDS (Pour compléter card-transactions)
# =============================================================================

router.register(r'cards', views.CardViewSet, basename='cards')
router.register(r'type-cards', views.TypeCardViewSet, basename='type-cards')

# =============================================================================
# CATEGORIES (De votre screenshot)
# =============================================================================

router.register(r'categories', views.ProductCategoryViewSet, basename='categories')

# =============================================================================
# COMMANDES (ORDERS) - NOUVELLES ROUTES
# =============================================================================

router.register(r'order-statuses', views.OrderStatusViewSet, basename='order-statuses')
router.register(r'order-sources', views.OrderSourceViewSet, basename='order-sources')
router.register(r'orders', views.OrderViewSet, basename='orders')
router.register(r'order-items', views.OrderItemViewSet, basename='order-items')

# =============================================================================
# CONFIGURATIONS (De votre screenshot)
# =============================================================================

router.register(r'payment-methods', views.PaymentMethodViewSet, basename='payment-methods')
router.register(r'tax-rates', views.TaxRateViewSet, basename='tax-rates')

# =============================================================================
# ANALYTICS (De votre screenshot)
# =============================================================================

router.register(r'analytics', views.AnalyticsViewSet, basename='analytics')

# =============================================================================
# UTILISATEURS ET AUTHENTIFICATION
# =============================================================================

router.register(r'users', views.UserViewSet, basename='users')
router.register(r'owners', views.OwnerViewSet, basename='owners')
router.register(r'shareholders', views.ShareholderViewSet, basename='shareholders')
router.register(r'customers', views.CustomerViewSet, basename='customers')
router.register(r'employees', views.EmployeeViewSet, basename='employees')
router.register(r'employee-roles', views.EmployeeRoleViewSet, basename='employee-roles')

# =============================================================================
# BOUTIQUES ET MAGASINS
# =============================================================================

router.register(r'store-types', views.StoreTypeViewSet, basename='store-types')
router.register(r'store-networks', views.StoreNetworkViewSet, basename='store-networks')
router.register(r'stores', views.StoreViewSet, basename='stores')
router.register(r'store-ownerships', views.StoreOwnershipViewSet, basename='store-ownerships')
router.register(r'departments', views.DepartmentViewSet, basename='departments')

# =============================================================================
# ADRESSES ET GÉOLOCALISATION
# =============================================================================

router.register(r'addresses', views.AddressViewSet, basename='addresses')
router.register(r'currencies', views.CurrencyViewSet, basename='currencies')

# =============================================================================
# SESSIONS ET JOURNALISATION
# =============================================================================

router.register(r'sessions', views.SessionViewSet, basename='sessions')
router.register(r'activity-logs', views.ActivityLogViewSet, basename='activity-logs')
router.register(r'sous-services', views.SousServiceViewSet, basename='sous-services')

# =============================================================================
# FIDÉLISATION
# =============================================================================

router.register(r'loyalty-programs', views.LoyaltyProgramViewSet, basename='loyalty-programs')
router.register(r'loyalty-rewards', views.LoyaltyRewardViewSet, basename='loyalty-rewards')

# =============================================================================
# FOURNISSEURS ET APPROVISIONNEMENTS
# =============================================================================

router.register(r'suppliers', views.SupplierViewSet, basename='suppliers')
router.register(r'supplies', views.SupplyViewSet, basename='supplies')
router.register(r'retail-supplies', views.RetailSupplyViewSet, basename='retail-supplies')

# =============================================================================
# PRODUITS ET CATÉGORIES
# =============================================================================

router.register(r'product-brands', views.ProductBrandViewSet, basename='product-brands')
router.register(r'products', views.ProductViewSet, basename='products')
router.register(r'product-variants', views.ProductVariantViewSet, basename='product-variants')

# =============================================================================
# GESTION DES STOCKS
# =============================================================================

router.register(r'warehouses', views.WarehouseViewSet, basename='warehouses')
router.register(r'stocks', views.StockViewSet, basename='stocks')
router.register(r'stock-movements', views.StockMovementViewSet, basename='stock-movements')
router.register(r'stock-movement-items', views.StockMovementItemViewSet, basename='stock-movement-items')
router.register(r'inventory-counts', views.InventoryCountViewSet, basename='inventory-counts')
router.register(r'inventory-count-items', views.InventoryCountItemViewSet, basename='inventory-count-items')
router.register(r'store-products', views.StoreProductViewSet, basename='store-products')
router.register(r'store-product-variants', views.StoreProductVariantViewSet, basename='store-product-variants')
router.register(r'inventory', views.StockViewSet, basename='inventory')
router.register(r'batches', views.BatchViewSet, basename='batches')
router.register(r'reorder-rules', views.ReorderRuleViewSet, basename='reorder-rules')

# =============================================================================
# VENTES ET PAIEMENTS
# =============================================================================

router.register(r'sale-statuses', views.SaleStatusViewSet, basename='sale-statuses')
router.register(r'sales', views.SaleViewSet, basename='sales')
router.register(r'sale-payments', views.SalePaymentViewSet, basename='sale-payments')
router.register(r'sale-items', views.SaleItemViewSet, basename='sale-items')

# =============================================================================
# LIVRAISONS
# =============================================================================

router.register(r'delivery-addresses', views.DeliveryAddressViewSet, basename='delivery-addresses')
router.register(r'delivery-vehicles', views.DeliveryVehicleViewSet, basename='delivery-vehicles')
router.register(r'delivery-routes', views.DeliveryRouteViewSet, basename='delivery-routes')
router.register(r'deliveries', views.DeliveryViewSet, basename='deliveries')
router.register(r'delivery-schedules', views.DeliveryScheduleViewSet, basename='delivery-schedules')

# =============================================================================
# RETOURS ET REMBOURSEMENTS
# =============================================================================

router.register(r'return-reasons', views.ReturnReasonViewSet, basename='return-reasons')
router.register(r'product-returns', views.ProductReturnViewSet, basename='product-returns')
router.register(r'return-items', views.ReturnItemViewSet, basename='return-items')
router.register(r'refunds', views.RefundViewSet, basename='refunds')
router.register(r'returned-products', views.ReturnedProductViewSet, basename='returned-products')

# =============================================================================
# TRANSACTIONS DIVERSES
# =============================================================================

router.register(r'transactions', views.TransactionViewSet, basename='transactions')
router.register(r'mobile-money', views.MobileMoneyViewSet, basename='mobile-money')
router.register(r'unites', views.UniteViewSet, basename='unites')
router.register(r'withdrawal-codes', views.WithdrawalCodeViewSet, basename='withdrawal-codes')

# =============================================================================
# PROMOTIONS ET MARKETING
# =============================================================================

router.register(r'promotions', views.PromotionViewSet, basename='promotions')
router.register(r'campaigns', views.CampaignViewSet, basename='campaigns')

# =============================================================================
# COMPTABILITÉ ET ANALYSE
# =============================================================================

router.register(r'expense-categories', views.ExpenseCategoryViewSet, basename='expense-categories')
router.register(r'expenses', views.ExpenseViewSet, basename='expenses')
router.register(r'accounting-periods', views.AccountingPeriodViewSet, basename='accounting-periods')
router.register(r'general-ledgers', views.GeneralLedgerViewSet, basename='general-ledgers')
router.register(r'financial-reports', views.FinancialReportViewSet, basename='financial-reports')
router.register(r'kpis', views.KPIViewSet, basename='kpis')
router.register(r'kpi-measurements', views.KPIMeasurementViewSet, basename='kpi-measurements')
router.register(r'dashboards', views.DashboardViewSet, basename='dashboards')

# =============================================================================
# SÉCURITÉ ET MAINTENANCE
# =============================================================================

router.register(r'security-incidents', views.SecurityIncidentViewSet, basename='security-incidents')
router.register(r'data-backups', views.DataBackupViewSet, basename='data-backups')
router.register(r'maintenance-tasks', views.MaintenanceTaskViewSet, basename='maintenance-tasks')
router.register(r'support-tickets', views.SupportTicketViewSet, basename='support-tickets')

# =============================================================================
# GESTION DES ERREURS
# =============================================================================

router.register(r'error-reports', views.ErrorReportViewSet, basename='error-reports')

# =============================================================================
# URLS PERSONNALISÉES (en dehors du router)
# =============================================================================

custom_urlpatterns = [
    # 🔐 AUTHENTIFICATION JWT
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/password-reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    path('auth/profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/check-username/<str:username>/', views.CheckUsernameView.as_view(), name='check-username'),
    # # Création par Owner/Admin
    path('owner/register/', views.OwnerRegisterView.as_view(), name='owner-register'),
    path('employee/register/', views.EmployeeRegisterView.as_view(), name='employee-register'),
    path('shareholder/register/', views.ShareholderRegisterView.as_view(), name='shareholder-register'),
    # 🎯 DASHBOARD - CORRIGÉ : DashboardDataView au lieu de DashboardView
    path('dashboard/', views.DashboardDataView.as_view(), name='dashboard-data'),
    
    # ENDPOINT SPECIFIQUE
    # path('categories/tree/'),

    # 🔄 ENDPOINT REQUESTS
    path('requests/', views.RequestsAPIView.as_view(), name='api-requests'),
    
    # 📊 RAPPORTS ET ANALYTIQUES DES COMMANDES
    path('reports/orders-analytics/', views.OrdersAnalyticsView.as_view(), name='orders-analytics'),
    path('reports/orders-report/', views.OrdersReportView.as_view(), name='orders-report'),
    path('exports/orders-csv/', views.ExportOrdersCSVView.as_view(), name='export-orders-csv'),
    
    # 🔍 AUTRES RAPPORTS ET EXPORTS
    path('reports/sales-summary/', views.SalesSummaryView.as_view(), name='sales-summary'),
    path('reports/inventory-report/', views.InventoryReportView.as_view(), name='inventory-report'),
    path('reports/financial-summary/', views.FinancialSummaryView.as_view(), name='financial-summary'),
    path('exports/sales-csv/', views.ExportSalesCSVView.as_view(), name='export-sales-csv'),
    
    # 📈 STATISTIQUES AVANCÉES
    path('stats/daily-sales/', views.DailySalesStatsView.as_view(), name='daily-sales-stats'),
    path('stats/top-products/', views.TopProductsView.as_view(), name='top-products'),
    path('stats/customer-analytics/', views.CustomerAnalyticsView.as_view(), name='customer-analytics'),
    
    # 🏥 HEALTH CHECK
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
    
    # 🔑 AUTHENTIFICATION DRF
    path('auth/', include('rest_framework.urls', namespace='rest_framework')),
]

# =============================================================================
# COMBINAISON DES URLS
# =============================================================================

urlpatterns = [
    # Routes API principales via le router
    path('', include(router.urls)),
    
    # Routes personnalisées
    path('', include(custom_urlpatterns)),
]