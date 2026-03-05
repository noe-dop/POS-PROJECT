# api_boutique_core/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import (
    # Utilisateurs
    User, Owner, Shareholder, Customer,
    
    # Adresses et devises
    Address, Currency,
    
    # Boutiques
    StoreType, StoreNetwork, Store, StoreOwnership, StoreShareholder, Department,
    
    # Employés
    EmployeeRole, Employee,
    
    # Sessions
    Session, ActivityLog, SousService,
    
    # Cartes et fidélité
    TypeCard, Card, CardTransaction, LoyaltyProgram, LoyaltyReward,
    
    # Fournisseurs
    Supplier, Supply, RetailSupply,
    
    # Produits
    ProductCategory, ProductBrand, Product, ProductVariant,
    
    # Stocks
    Warehouse, Batch, Stock, ReorderRule, StockMovement, StockMovementItem,
    InventoryCount, InventoryCountItem,  # ← MODÈLES IMPORTANTS !
    
    # Produits en boutique
    StoreProduct, StoreProductVariant,
    
    # Caisses
    CashRegister, CashRegisterSession, CashTransaction,
    
    # Ventes
    PaymentMethod, SaleStatus, Sale, SaleItem, SalePayment,
    
    # Livraisons
    DeliveryAddress, DeliveryVehicle, DeliveryRoute, Delivery, DeliverySchedule,
    
    # Retours
    ReturnReason, ProductReturn, ReturnItem, Refund, ReturnedProduct,
    
    # Transactions financières
    Transaction, MobileMoney, Unite, WithdrawalCode,
    
    # Marketing
    Promotion, Campaign,
    
    # Comptabilité
    ExpenseCategory, Expense, TaxRate, AccountingPeriod, 
    GeneralLedger, FinancialReport, KPI, KPIMeasurement, Dashboard,
    
    # Sécurité et maintenance
    SecurityIncident, DataBackup, MaintenanceTask, SupportTicket,
    
    # Erreurs
    ErrorReport
)

# =============================================================================
# ADMIN PERSONNALISÉ POUR L'UTILISATEUR
# =============================================================================

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'phone', 'is_active', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ( 'phone', 'phone2', 'address', 'photo')
        }),
    )

admin.site.register(User, CustomUserAdmin)

# =============================================================================
# ADMIN INLINE (définis après les imports)
# =============================================================================

class StoreOwnershipInline(admin.TabularInline):
    model = StoreOwnership
    extra = 1
    raw_id_fields = ('owner',)

class StoreShareholderInline(admin.TabularInline):
    model = StoreShareholder
    extra = 1
    raw_id_fields = ('shareholder',)

class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 1
    raw_id_fields = ('manager',)

class EmployeeInline(admin.TabularInline):
    model = Employee
    extra = 1
    raw_id_fields = ('user', 'department', 'role')

class StockInline(admin.TabularInline):
    model = Stock
    extra = 1
    raw_id_fields = ('product', 'warehouse')

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    raw_id_fields = ('product', 'variant')

class SalePaymentInline(admin.TabularInline):
    model = SalePayment
    extra = 1
    raw_id_fields = ('payment_method', 'processed_by')

class ReturnItemInline(admin.TabularInline):
    model = ReturnItem
    extra = 1
    raw_id_fields = ('sale_item',)

class StockMovementItemInline(admin.TabularInline):
    model = StockMovementItem
    extra = 1
    raw_id_fields = ('product', 'variant', 'batch')

class InventoryCountItemInline(admin.TabularInline):
    model = InventoryCountItem
    extra = 1
    raw_id_fields = ('product', 'variant')

# =============================================================================
# ADMIN MODELS
# =============================================================================

@admin.register(Owner)
class OwnerAdmin(admin.ModelAdmin):
    list_display = ('user', 'photo_preview', 'created_at')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    list_filter = ('created_at',)
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="50" height="50" />', obj.photo.url)
        return "Aucune photo"
    photo_preview.short_description = 'Photo'

@admin.register(Shareholder)
class ShareholderAdmin(admin.ModelAdmin):
    list_display = ('user', 'investment_amount', 'photo_preview')
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
    list_filter = ('investment_amount',)
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="50" height="50" />', obj.photo.url)
        return "Aucune photo"
    photo_preview.short_description = 'Photo'

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('user', 'loyalty_points', 'total_spent', 'first_purchase', 'last_purchase', 'photo_preview')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email')
    list_filter = ('loyalty_points', 'first_purchase', 'last_purchase')
    readonly_fields = ('total_spent', 'first_purchase', 'last_purchase')
    
    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" width="50" height="50" />', obj.photo.url)
        return "Aucune photo"
    photo_preview.short_description = 'Photo'

@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('address_line1', 'city', 'state', 'postal_code', 'country')
    search_fields = ('address_line1', 'city', 'state', 'postal_code')
    list_filter = ('country', 'state', 'city')

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'symbol')
    search_fields = ('code', 'name')

# =============================================================================
# BOUTIQUES ET MAGASINS
# =============================================================================

@admin.register(StoreType)
class StoreTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ['name']

@admin.register(StoreNetwork)
class StoreNetworkAdmin(admin.ModelAdmin):
    list_display = ('name', 'headquarters', 'contact_email', 'contact_phone')
    search_fields = ('name', 'contact_email', 'contact_phone')
    raw_id_fields = ('headquarters',)

@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'store_type', 'network', 'phone', 'email', 'is_active', 'created_at')
    list_filter = ('store_type', 'network', 'is_active', 'created_at')
    search_fields = ('name', 'slug', 'email', 'phone')
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ('address', 'store_type', 'network')
    inlines = [StoreOwnershipInline, StoreShareholderInline, DepartmentInline]

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'manager', 'description')
    list_filter = ('store',)
    search_fields = ('name', 'store__name')
    raw_id_fields = ('store', 'manager')

# =============================================================================
# EMPLOYÉS ET RÔLES
# =============================================================================

@admin.register(EmployeeRole)
class EmployeeRoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'description')
    search_fields = ('name', 'code')

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('user', 'store', 'department', 'role', 'hire_date', 'salary', 'is_active')
    list_filter = ('store', 'department', 'role', 'is_active', 'hire_date')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'store__name')
    raw_id_fields = ('user', 'store', 'department', 'role')

# =============================================================================
# SESSIONS ET JOURNALISATION
# =============================================================================

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'store', 'login_time', 'logout_time', 'ip_address')
    list_filter = ('store', 'login_time', 'logout_time')
    search_fields = ('user__username', 'store__name', 'ip_address')
    readonly_fields = ('login_time', 'logout_time', 'ip_address')

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'model_name', 'object_id', 'timestamp')
    list_filter = ('model_name', 'timestamp', 'user')
    search_fields = ('user__username', 'action', 'model_name', 'object_id')
    readonly_fields = ('timestamp',)

@admin.register(SousService)
class SousServiceAdmin(admin.ModelAdmin):
    list_display = ('session', 'nom_du_service', 'start_service', 'end_service')
    list_filter = ('start_service', 'end_service')
    search_fields = ('session__user__username', 'nom_du_service')
    raw_id_fields = ('session',)

# =============================================================================
# CARTES ET FIDÉLISATION
# =============================================================================

@admin.register(TypeCard)
class TypeCardAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ('num_card', 'type_card', 'client', 'solde', 'max_credit', 'plafond', 'statut')
    list_filter = ('type_card', 'statut')
    search_fields = ('num_card', 'client__user__username', 'client__user__first_name')
    raw_id_fields = ('type_card', 'client')

@admin.register(CardTransaction)
class CardTransactionAdmin(admin.ModelAdmin):
    list_display = ('card', 'type_transaction', 'montant', 'date_transaction')
    list_filter = ('type_transaction', 'date_transaction')
    search_fields = ('card__num_card',)
    raw_id_fields = ('card',)
    readonly_fields = ('date_transaction',)

@admin.register(LoyaltyProgram)
class LoyaltyProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'points_per_amount', 'minimum_purchase', 'is_active')
    list_filter = ('store', 'is_active')
    search_fields = ('name', 'store__name')
    raw_id_fields = ('store',)

@admin.register(LoyaltyReward)
class LoyaltyRewardAdmin(admin.ModelAdmin):
    list_display = ('name', 'program', 'points_required', 'discount_amount', 'discount_percentage')
    list_filter = ('program',)
    search_fields = ('name', 'program__name')
    raw_id_fields = ('program', 'free_product')

# =============================================================================
# FOURNISSEURS ET APPROVISIONNEMENTS
# =============================================================================

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'num_supplier', 'email', 'contact_person')
    list_filter = ('store',)
    search_fields = ('name', 'num_supplier', 'email', 'contact_person')
    raw_id_fields = ('store',)

@admin.register(Supply)
class SupplyAdmin(admin.ModelAdmin):
    list_display = ('ref_supply', 'store', 'supplier', 'total_command', 'utilisateur', 'date_supply', 'status')
    list_filter = ('store', 'supplier', 'status', 'date_supply')
    search_fields = ('ref_supply', 'store__name', 'supplier__name')
    raw_id_fields = ('store', 'supplier', 'utilisateur')
    readonly_fields = ('date_supply',)

@admin.register(RetailSupply)
class RetailSupplyAdmin(admin.ModelAdmin):
    list_display = ('supply', 'name_product', 'qt_add', 'total_pdx')
    list_filter = ('supply',)
    search_fields = ('name_product', 'supply__ref_supply')
    raw_id_fields = ('supply',)

# =============================================================================
# PRODUITS, CATÉGORIES ET MARQUES
# =============================================================================

@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'sort_order', 'is_active')
    list_filter = ('parent', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    raw_id_fields = ('parent',)

@admin.register(ProductBrand)
class ProductBrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'logo_preview', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)
    
    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="50" height="50" />', obj.logo.url)
        return "Aucun logo"
    logo_preview.short_description = 'Logo'

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'group', 'brand')
    list_filter = ('group', 'brand')
    search_fields = ('sku', 'name', 'description')
    raw_id_fields = ('group', 'brand')
    inlines = [ProductVariantInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category', 'brand')

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('barcode', 'product', 'name')
    list_filter = ('product',)
    search_fields = ('barcode', 'product__name', 'name')
    raw_id_fields = ('product',)

# =============================================================================
# GESTION DES STOCKS
# =============================================================================

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'address', 'capacity', 'is_active')
    list_filter = ('store', 'is_active')
    search_fields = ('name', 'store__name')
    raw_id_fields = ('store', 'address')

@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('batch_number', 'product', 'manufacturing_date', 'expiry_date', 'quantity_received', 'quantity_remaining')
    list_filter = ('product', 'manufacturing_date', 'expiry_date')
    search_fields = ('batch_number', 'product__name')
    raw_id_fields = ('product',)

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('product', 'store', 'warehouse', 'quantity_on_hand', 'quantity_available', 'is_low_stock')
    list_filter = ('store', 'warehouse')
    search_fields = ('product__name', 'store__name')
    raw_id_fields = ('product', 'store', 'warehouse')
    
    def is_low_stock(self, obj):
        return obj.is_low_stock()
    is_low_stock.boolean = True
    is_low_stock.short_description = 'Stock bas'

@admin.register(ReorderRule)
class ReorderRuleAdmin(admin.ModelAdmin):
    list_display = ('product', 'store', 'min_quantity', 'max_quantity', 'reorder_quantity', 'is_active')
    list_filter = ('store', 'is_active')
    search_fields = ('product__name', 'store__name')
    raw_id_fields = ('product', 'store')

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('reference', 'store', 'movement_type', 'movement_date', 'total_items', 'total_value')
    list_filter = ('store', 'movement_type', 'movement_date')
    search_fields = ('reference', 'store__name')
    raw_id_fields = ('store',)
    inlines = [StockMovementItemInline]
    readonly_fields = ('movement_date',)

@admin.register(InventoryCount)
class InventoryCountAdmin(admin.ModelAdmin):
    list_display = ('reference', 'store', 'count_date', 'status', 'total_items_counted', 'total_discrepancies')
    list_filter = ('store', 'status', 'count_date')
    search_fields = ('reference', 'store__name')
    raw_id_fields = ('store',)
    inlines = [InventoryCountItemInline]

@admin.register(InventoryCountItem)
class InventoryCountItemAdmin(admin.ModelAdmin):
    list_display = ('inventory_count', 'product', 'expected_quantity', 'counted_quantity', 'discrepancy')
    list_filter = ('inventory_count__status',)
    search_fields = ('product__name', 'inventory_count__reference')
    raw_id_fields = ('inventory_count', 'product', 'variant')

@admin.register(StoreProduct)
class StoreProductAdmin(admin.ModelAdmin):
    list_display = ('store', 'product', 'is_active', 'display_order','store_cost_price', 'store_base_price','store_compare_at_price','qt_item')
    list_filter = ('store', 'is_active')
    search_fields = ('store__name', 'product__name')
    raw_id_fields = ('store', 'product')

@admin.register(StoreProductVariant)
class StoreProductVariantAdmin(admin.ModelAdmin):
    list_display = ('store_product', 'variant', 'store_variant_cost','store_variant_price')
    list_filter = ('store_product__store',)
    search_fields = ('store_product__product__name', 'variant__name')
    raw_id_fields = ('store_product', 'variant')

# =============================================================================
# CAISSES ET SESSIONS DE CAISSE
# =============================================================================

@admin.register(CashRegister)
class CashRegisterAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'store', 'location', 'opening_balance', 'current_balance', 'is_active')
    list_filter = ('store', 'is_active')
    search_fields = ('name', 'code', 'store__name')
    prepopulated_fields = {'code': ('name',)}
    raw_id_fields = ('store', 'created_by', 'updated_by')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(CashRegisterSession)
class CashRegisterSessionAdmin(admin.ModelAdmin):
    list_display = ('cash_register', 'employee', 'start_time', 'end_time', 'status', 'opening_balance', 'actual_balance', 'difference')
    list_filter = ('cash_register', 'employee', 'status', 'start_time', 'end_time')
    search_fields = ('cash_register__name', 'employee__user__username')
    raw_id_fields = ('cash_register', 'employee', 'session', 'created_by', 'updated_by')
    readonly_fields = ('start_time', 'end_time', 'created_at', 'updated_at')

@admin.register(CashTransaction)
class CashTransactionAdmin(admin.ModelAdmin):
    list_display = ('session', 'transaction_type', 'amount', 'payment_method', 'reference', 'transaction_time')
    list_filter = ('transaction_type', 'payment_method', 'transaction_time')
    search_fields = ('session__cash_register__name', 'reference')
    raw_id_fields = ('session', 'currency', 'payment_method', 'sale', 'customer', 'created_by', 'updated_by')
    readonly_fields = ('transaction_time', 'created_at', 'updated_at')

# =============================================================================
# VENTES ET PAIEMENTS
# =============================================================================

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'requires_reference', 'fee_percentage')
    list_filter = ('is_active', 'requires_reference')
    search_fields = ('name', 'code')

@admin.register(SaleStatus)
class SaleStatusAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_terminal')
    list_filter = ('is_terminal',)
    search_fields = ('name', 'code')

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'store', 'customer', 'employee', 'total_amount', 'sale_date', 'status')
    list_filter = ('store', 'status', 'sale_date', 'is_delivery')
    search_fields = ('ticket_number', 'customer__user__username', 'employee__user__username')
    raw_id_fields = ('store', 'customer', 'employee', 'caisse', 'cash_session', 'status', 'delivery_address')
    inlines = [SaleItemInline, SalePaymentInline]
    readonly_fields = ('sale_date',)

@admin.register(SalePayment)
class SalePaymentAdmin(admin.ModelAdmin):
    list_display = ('sale', 'payment_method', 'amount', 'is_confirmed', 'payment_date', 'processed_by')
    list_filter = ('payment_method', 'is_confirmed', 'payment_date')
    search_fields = ('sale__ticket_number', 'reference')
    raw_id_fields = ('sale', 'payment_method', 'processed_by')
    readonly_fields = ('payment_date',)

# =============================================================================
# LIVRAISONS
# =============================================================================

@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(admin.ModelAdmin):
    list_display = ('customer', 'title', 'address', 'is_primary')
    list_filter = ('is_primary',)
    search_fields = ('customer__user__username', 'title')
    raw_id_fields = ('customer', 'address')

@admin.register(DeliveryVehicle)
class DeliveryVehicleAdmin(admin.ModelAdmin):
    list_display = ('plate_number', 'store', 'vehicle_type', 'capacity', 'is_active')
    list_filter = ('store', 'vehicle_type', 'is_active')
    search_fields = ('plate_number', 'store__name')

@admin.register(DeliveryRoute)
class DeliveryRouteAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'driver', 'vehicle', 'estimated_duration')
    list_filter = ('store',)
    search_fields = ('name', 'store__name')
    raw_id_fields = ('store', 'driver', 'vehicle')

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ('sale', 'delivery_address', 'assigned_driver', 'status', 'fee', 'estimated_time', 'actual_delivery_time')
    list_filter = ('status', 'estimated_time', 'actual_delivery_time')
    search_fields = ('sale__ticket_number', 'assigned_driver__user__username')
    raw_id_fields = ('sale', 'delivery_address', 'assigned_driver', 'route')

@admin.register(DeliverySchedule)
class DeliveryScheduleAdmin(admin.ModelAdmin):
    list_display = ('delivery', 'route', 'scheduled_time', 'actual_departure', 'actual_arrival')
    list_filter = ('scheduled_time',)
    search_fields = ('delivery__sale__ticket_number', 'route__name')
    raw_id_fields = ('delivery', 'route')

# =============================================================================
# RETOURS ET REMBOURSEMENTS
# =============================================================================

@admin.register(ReturnReason)
class ReturnReasonAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'requires_approval', 'refund_percentage')
    list_filter = ('requires_approval',)
    search_fields = ('name', 'code')
    prepopulated_fields = {'code': ('name',)}

@admin.register(ProductReturn)
class ProductReturnAdmin(admin.ModelAdmin):
    list_display = ('return_number', 'original_sale', 'store', 'customer', 'status', 'total_refund_amount', 'return_date')
    list_filter = ('store', 'status', 'return_date')
    search_fields = ('return_number', 'original_sale__ticket_number')
    raw_id_fields = ('original_sale', 'store', 'customer', 'return_reason', 'requested_by', 'approved_by')
    inlines = [ReturnItemInline]
    readonly_fields = ('return_date',)

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ('refund_number', 'product_return', 'refund_method', 'refund_amount', 'refund_date', 'processed_by')
    list_filter = ('refund_method', 'refund_date')
    search_fields = ('refund_number', 'product_return__return_number')
    raw_id_fields = ('product_return', 'refund_method', 'processed_by')
    readonly_fields = ('refund_date',)

@admin.register(ReturnedProduct)
class ReturnedProductAdmin(admin.ModelAdmin):
    list_display = ('employee', 'sell', 'variant_code', 'quantity', 'refund_amount', 'return_date')
    list_filter = ('return_date',)
    search_fields = ('variant_code', 'sell__ticket_number')
    raw_id_fields = ('employee', 'sell')

# =============================================================================
# TRANSACTIONS FINANCIÈRES
# =============================================================================

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'type_transaction', 'payment_method', 'date_transaction')
    list_filter = ('type_transaction', 'date_transaction')
    search_fields = ('user__user__username', 'description')
    raw_id_fields = ('user',)
    readonly_fields = ('date_transaction',)

@admin.register(MobileMoney)
class MobileMoneyAdmin(admin.ModelAdmin):
    list_display = ('number', 'amount', 'action', 'employee', 'caisse_session', 'date')
    list_filter = ('action', 'date')
    search_fields = ('number', 'employee__user__username')
    raw_id_fields = ('employee', 'caisse_session')
    readonly_fields = ('date',)

@admin.register(Unite)
class UniteAdmin(admin.ModelAdmin):
    list_display = ('number', 'amount', 'date', 'employee')
    list_filter = ('date',)
    search_fields = ('employee__user__username',)
    raw_id_fields = ('employee',)

@admin.register(WithdrawalCode)
class WithdrawalCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'amount', 'created_at', 'expires_at', 'status', 'employee')
    list_filter = ('status', 'created_at', 'expires_at')
    search_fields = ('code',)
    raw_id_fields = ('employee',)
    readonly_fields = ('created_at',)

# =============================================================================
# PROMOTIONS ET MARKETING
# =============================================================================

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('product', 'variante', 'discount', 'start_date', 'end_date', 'store')
    list_filter = ('store', 'start_date', 'end_date')
    search_fields = ('product__name', 'variante__name', 'store__name')
    raw_id_fields = ('product', 'variante', 'store')

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'campaign_type', 'start_date', 'end_date', 'budget')
    list_filter = ('store', 'campaign_type', 'start_date', 'end_date')
    search_fields = ('name', 'store__name')
    raw_id_fields = ('store',)
    filter_horizontal = ('target_customers',)

# =============================================================================
# COMPTABILITÉ ET ANALYSE
# =============================================================================

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'description')
    list_filter = ('parent',)
    search_fields = ('name', 'description')
    raw_id_fields = ('parent',)

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('store', 'category', 'amount', 'expense_date', 'approved_by')
    list_filter = ('store', 'category', 'expense_date')
    search_fields = ('store__name', 'category__name', 'description')
    raw_id_fields = ('store', 'category', 'approved_by')

@admin.register(AccountingPeriod)
class AccountingPeriodAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_closed', 'closed_at', 'closed_by')
    list_filter = ('is_closed', 'start_date', 'end_date')
    search_fields = ('name',)
    raw_id_fields = ('closed_by',)

@admin.register(GeneralLedger)
class GeneralLedgerAdmin(admin.ModelAdmin):
    list_display = ('period', 'entry_date', 'reference', 'account_number', 'account_name', 'debit', 'credit', 'balance')
    list_filter = ('period', 'entry_date', 'account_number')
    search_fields = ('reference', 'account_number', 'account_name')
    raw_id_fields = ('period',)

@admin.register(FinancialReport)
class FinancialReportAdmin(admin.ModelAdmin):
    list_display = ('store', 'report_type', 'period', 'generated_at', 'generated_by')
    list_filter = ('store', 'report_type', 'period', 'generated_at')
    search_fields = ('store__name', 'report_type')
    raw_id_fields = ('store', 'period', 'generated_by')
    readonly_fields = ('generated_at',)

@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'target_value', 'unit')
    search_fields = ('name', 'code')
    prepopulated_fields = {'code': ('name',)}

@admin.register(KPIMeasurement)
class KPIMeasurementAdmin(admin.ModelAdmin):
    list_display = ('kpi', 'store', 'period_start', 'period_end', 'value')
    list_filter = ('kpi', 'store', 'period_start', 'period_end')
    search_fields = ('kpi__name', 'store__name')
    raw_id_fields = ('kpi', 'store')

@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'is_default')
    list_filter = ('is_default',)
    search_fields = ('name', 'user__username')
    raw_id_fields = ('user',)

# =============================================================================
# SÉCURITÉ ET MAINTENANCE
# =============================================================================

@admin.register(SecurityIncident)
class SecurityIncidentAdmin(admin.ModelAdmin):
    list_display = ('store', 'incident_type', 'severity', 'reported_by', 'resolution_status')
    list_filter = ('store', 'incident_type', 'severity', 'resolution_status')
    search_fields = ('store__name', 'incident_type')
    raw_id_fields = ('store', 'reported_by')

@admin.register(DataBackup)
class DataBackupAdmin(admin.ModelAdmin):
    list_display = ('backup_type', 'file_path', 'file_size', 'backup_date', 'is_verified')
    list_filter = ('backup_type', 'backup_date', 'is_verified')
    readonly_fields = ('backup_date',)

@admin.register(MaintenanceTask)
class MaintenanceTaskAdmin(admin.ModelAdmin):
    list_display = ('store', 'equipment', 'task_type', 'scheduled_date', 'completed_date', 'status', 'assigned_to')
    list_filter = ('store', 'task_type', 'status', 'scheduled_date')
    search_fields = ('equipment', 'store__name')
    raw_id_fields = ('store', 'assigned_to')

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('store', 'title', 'priority', 'status', 'created_by', 'assigned_to')
    list_filter = ('store', 'priority', 'status')
    search_fields = ('title', 'store__name')
    raw_id_fields = ('store', 'created_by', 'assigned_to')

# =============================================================================
# GESTION DES ERREURS
# =============================================================================

@admin.register(ErrorReport)
class ErrorReportAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'created_at', 'resolved')
    list_filter = ('resolved', 'created_at')
    search_fields = ('message', 'user__user__username')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at',)

# =============================================================================
# CONFIGURATION DE L'ADMIN
# =============================================================================

admin.site.site_header = "Administration Boutik"
admin.site.site_title = "Boutik Admin"
admin.site.index_title = "Gestion de la Boutique"
