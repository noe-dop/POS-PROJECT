import django_filters
from django.db.models import Q, F, Sum, Count
from django.utils import timezone
from datetime import timedelta, datetime
from .models import *

# =============================================================================
# FILTRES COMMUNS
# =============================================================================

class DateRangeFilter(django_filters.FilterSet):
    """Filtre de base pour les plages de dates"""
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    date_range = django_filters.DateRangeFilter(field_name='created_at')

    class Meta:
        fields = ['date_from', 'date_to', 'date_range']

# =============================================================================
# FILTRES UTILISATEURS
# =============================================================================

class UserFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    date_joined_range = django_filters.DateFromToRangeFilter(field_name='date_joined')

    class Meta:
        model = User
        fields = {
            'username': ['exact', 'icontains'],
            'email': ['exact', 'icontains'],
            'first_name': ['exact', 'icontains'],
            'last_name': ['exact', 'icontains'],
            'phone': ['exact', 'icontains'],
        }

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(username__icontains=value) |
            Q(email__icontains=value) |
            Q(first_name__icontains=value) |
            Q(last_name__icontains=value) |
            Q(phone__icontains=value)
        )

class CustomerFilter(django_filters.FilterSet):
    loyalty_tier = django_filters.ChoiceFilter(
        method='filter_loyalty_tier',
        choices=[
            ('bronze', 'Bronze (0-100 points)'),
            ('silver', 'Argent (101-500 points)'),
            ('gold', 'Or (501+ points)'),
        ]
    )
    has_purchased_recently = django_filters.BooleanFilter(method='filter_recent_purchase')
    total_spent_min = django_filters.NumberFilter(field_name='total_spent', lookup_expr='gte')
    total_spent_max = django_filters.NumberFilter(field_name='total_spent', lookup_expr='lte')

    class Meta:
        model = Customer
        fields = {
            'loyalty_points': ['exact', 'gte', 'lte'],
            'user__city': ['exact', 'icontains'],
        }

    def filter_loyalty_tier(self, queryset, name, value):
        if value == 'bronze':
            return queryset.filter(loyalty_points__range=(0, 100))
        elif value == 'silver':
            return queryset.filter(loyalty_points__range=(101, 500))
        elif value == 'gold':
            return queryset.filter(loyalty_points__gte=501)
        return queryset

    def filter_recent_purchase(self, queryset, name, value):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        if value:
            return queryset.filter(last_purchase__gte=thirty_days_ago)
        return queryset.filter(Q(last_purchase__lt=thirty_days_ago) | Q(last_purchase__isnull=True))

# =============================================================================
# FILTRES PRODUITS ET STOCKS
# =============================================================================

class ProductFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    category = django_filters.ModelChoiceFilter(queryset=ProductCategory.objects.all())
    brand = django_filters.ModelChoiceFilter(queryset=ProductBrand.objects.all())
    supplier = django_filters.ModelChoiceFilter(queryset=Supplier.objects.all())
    price_min = django_filters.NumberFilter(field_name='base_price', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='base_price', lookup_expr='lte')
    has_low_stock = django_filters.BooleanFilter(method='filter_low_stock')
    is_active = django_filters.BooleanFilter(field_name='is_active')

    class Meta:
        model = Product
        fields = {
            'status': ['exact'],
            'sku': ['exact', 'icontains'],
        }

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(sku__icontains=value) |
            Q(description__icontains=value)
        )

    def filter_low_stock(self, queryset, name, value):
        if value:
            return queryset.filter(
                stocks__quantity_available__lte=F('stocks__min_stock_threshold')
            ).distinct()
        return queryset

class StockFilter(django_filters.FilterSet):
    store = django_filters.ModelChoiceFilter(queryset=Store.objects.all())
    product = django_filters.ModelChoiceFilter(queryset=Product.objects.all())
    low_stock = django_filters.BooleanFilter(method='filter_low_stock')
    out_of_stock = django_filters.BooleanFilter(method='filter_out_of_stock')
    needs_restock = django_filters.BooleanFilter(method='filter_needs_restock')
    quantity_min = django_filters.NumberFilter(field_name='quantity_available', lookup_expr='gte')
    quantity_max = django_filters.NumberFilter(field_name='quantity_available', lookup_expr='lte')

    class Meta:
        model = Stock
        fields = ['store', 'product', 'warehouse']

    def filter_low_stock(self, queryset, name, value):
        if value:
            return queryset.filter(quantity_available__lte=F('min_stock_threshold'))
        return queryset

    def filter_out_of_stock(self, queryset, name, value):
        if value:
            return queryset.filter(quantity_available=0)
        return queryset.filter(quantity_available__gt=0)

    def filter_needs_restock(self, queryset, name, value):
        if value:
            return queryset.filter(quantity_available__lte=F('ideal_stock_level'))
        return queryset

# =============================================================================
# FILTRES VENTES ET FINANCES
# =============================================================================

class SaleFilter(django_filters.FilterSet):
    store = django_filters.ModelChoiceFilter(queryset=Store.objects.all())
    customer = django_filters.ModelChoiceFilter(queryset=Customer.objects.all())
    employee = django_filters.ModelChoiceFilter(queryset=Employee.objects.all())
    date_range = django_filters.DateFromToRangeFilter(field_name='sale_date')
    amount_min = django_filters.NumberFilter(field_name='total_amount', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='total_amount', lookup_expr='lte')
    payment_method = django_filters.ModelChoiceFilter(
        method='filter_payment_method',
        queryset=PaymentMethod.objects.all()
    )
    has_delivery = django_filters.BooleanFilter(field_name='is_delivery')

    class Meta:
        model = Sale
        fields = ['status']

    def filter_payment_method(self, queryset, name, value):
        return queryset.filter(payments__payment_method=value).distinct()

class SaleAnalyticsFilter(django_filters.FilterSet):
    period = django_filters.ChoiceFilter(
        method='filter_period',
        choices=[
            ('today', "Aujourd'hui"),
            ('yesterday', 'Hier'),
            ('week', 'Cette semaine'),
            ('month', 'Ce mois'),
            ('quarter', 'Ce trimestre'),
            ('year', 'Cette année'),
            ('custom', 'Période personnalisée'),
        ]
    )
    date_from = django_filters.DateFilter(field_name='sale_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='sale_date', lookup_expr='lte')
    group_by = django_filters.ChoiceFilter(
        method='filter_group_by',
        choices=[
            ('day', 'Par jour'),
            ('week', 'Par semaine'),
            ('month', 'Par mois'),
            ('year', 'Par année'),
            ('product', 'Par produit'),
            ('category', 'Par catégorie'),
        ]
    )

    class Meta:
        model = Sale
        fields = ['store']

    def filter_period(self, queryset, name, value):
        now = timezone.now()
        if value == 'today':
            return queryset.filter(sale_date__date=now.date())
        elif value == 'yesterday':
            return queryset.filter(sale_date__date=now.date() - timedelta(days=1))
        elif value == 'week':
            return queryset.filter(sale_date__week=now.isocalendar()[1])
        elif value == 'month':
            return queryset.filter(sale_date__month=now.month)
        elif value == 'quarter':
            quarter = (now.month - 1) // 3 + 1
            return queryset.filter(sale_date__quarter=quarter)
        elif value == 'year':
            return queryset.filter(sale_date__year=now.year)
        return queryset

    def filter_group_by(self, queryset, name, value):
        # Cette méthode serait utilisée dans la vue pour grouper les résultats
        return queryset

# =============================================================================
# FILTRES FOURNISSEURS ET APPROVISIONNEMENTS
# =============================================================================

class SupplyFilter(django_filters.FilterSet):
    store = django_filters.ModelChoiceFilter(queryset=Store.objects.all())
    supplier = django_filters.ModelChoiceFilter(queryset=Supplier.objects.all())
    status = django_filters.MultipleChoiceFilter(choices=Supply._meta.get_field('status').choices)
    date_range = django_filters.DateFromToRangeFilter(field_name='date_supply')
    amount_min = django_filters.NumberFilter(field_name='total_command', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='total_command', lookup_expr='lte')

    class Meta:
        model = Supply
        fields = ['store', 'supplier', 'status']

# =============================================================================
# FILTRES EMPLOYÉS ET SESSIONS
# =============================================================================

class EmployeeFilter(django_filters.FilterSet):
    store = django_filters.ModelChoiceFilter(queryset=Store.objects.all())
    department = django_filters.ModelChoiceFilter(queryset=Department.objects.all())
    role = django_filters.ModelChoiceFilter(queryset=EmployeeRole.objects.all())
    is_active = django_filters.BooleanFilter(field_name='is_active')
    hire_date_range = django_filters.DateFromToRangeFilter(field_name='hire_date')

    class Meta:
        model = Employee
        fields = ['store', 'department', 'role', 'is_active']

class SessionFilter(django_filters.FilterSet):
    user = django_filters.ModelChoiceFilter(queryset=User.objects.all())
    store = django_filters.ModelChoiceFilter(queryset=Store.objects.all())
    date_range = django_filters.DateTimeFromToRangeFilter(field_name='login_time')
    duration_min = django_filters.NumberFilter(method='filter_duration_min')
    duration_max = django_filters.NumberFilter(method='filter_duration_max')

    class Meta:
        model = Session
        fields = ['user', 'store']

    def filter_duration_min(self, queryset, name, value):
        """Filtre les sessions avec une durée minimale (en minutes)"""
        try:
            minutes = int(value)
            threshold = timezone.now() - timedelta(minutes=minutes)
            return queryset.filter(login_time__lte=threshold, logout_time__isnull=False)
        except (ValueError, TypeError):
            return queryset

    def filter_duration_max(self, queryset, name, value):
        """Filtre les sessions avec une durée maximale (en minutes)"""
        try:
            minutes = int(value)
            threshold = timezone.now() - timedelta(minutes=minutes)
            return queryset.filter(
                Q(login_time__gt=threshold) | Q(logout_time__isnull=True)
            )
        except (ValueError, TypeError):
            return queryset

# =============================================================================
# FILTRES CAISSES ET TRANSACTIONS
# =============================================================================

class CashRegisterSessionFilter(django_filters.FilterSet):
    cash_register = django_filters.ModelChoiceFilter(queryset=CashRegister.objects.all())
    employee = django_filters.ModelChoiceFilter(queryset=Employee.objects.all())
    status = django_filters.MultipleChoiceFilter(choices=CashRegisterSession._meta.get_field('status').choices)
    date_range = django_filters.DateTimeFromToRangeFilter(field_name='start_time')
    has_discrepancy = django_filters.BooleanFilter(method='filter_has_discrepancy')

    class Meta:
        model = CashRegisterSession
        fields = ['cash_register', 'employee', 'status']

    def filter_has_discrepancy(self, queryset, name, value):
        if value:
            return queryset.filter(difference__gt=0)
        return queryset.filter(difference=0)

class CashTransactionFilter(django_filters.FilterSet):
    session = django_filters.ModelChoiceFilter(queryset=CashRegisterSession.objects.all())
    transaction_type = django_filters.MultipleChoiceFilter(choices=CashTransaction._meta.get_field('transaction_type').choices)
    payment_method = django_filters.ModelChoiceFilter(queryset=PaymentMethod.objects.all())
    amount_min = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    date_range = django_filters.DateTimeFromToRangeFilter(field_name='transaction_time')

    class Meta:
        model = CashTransaction
        fields = ['session', 'transaction_type', 'payment_method']

# =============================================================================
# FILTRES SPÉCIAUX POUR LES RAPPORTS
# =============================================================================

class InventoryReportFilter(django_filters.FilterSet):
    store = django_filters.ModelChoiceFilter(queryset=Store.objects.all())
    category = django_filters.ModelChoiceFilter(
        method='filter_by_category',
        queryset=ProductCategory.objects.all()
    )
    stock_status = django_filters.ChoiceFilter(
        method='filter_stock_status',
        choices=[
            ('low', 'Stock bas'),
            ('out', 'Rupture'),
            ('normal', 'Stock normal'),
            ('over', 'Surstock'),
        ]
    )
    turnover_rate_min = django_filters.NumberFilter(field_name='stock_turnover_rate', lookup_expr='gte')
    turnover_rate_max = django_filters.NumberFilter(field_name='stock_turnover_rate', lookup_expr='lte')

    class Meta:
        model = Stock
        fields = ['store']

    def filter_by_category(self, queryset, name, value):
        return queryset.filter(product__category=value)

    def filter_stock_status(self, queryset, name, value):
        if value == 'low':
            return queryset.filter(quantity_available__lte=F('min_stock_threshold'))
        elif value == 'out':
            return queryset.filter(quantity_available=0)
        elif value == 'over':
            return queryset.filter(quantity_available__gt=F('ideal_stock_level') * 2)
        elif value == 'normal':
            return queryset.filter(
                quantity_available__gt=F('min_stock_threshold'),
                quantity_available__lte=F('ideal_stock_level') * 2
            )
        return queryset

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

def get_filter_for_model(model_name):
    """Retourne le filtre approprié pour un modèle donné"""
    filter_map = {
        'User': UserFilter,
        'Customer': CustomerFilter,
        'Product': ProductFilter,
        'Stock': StockFilter,
        'Sale': SaleFilter,
        'Employee': EmployeeFilter,
        'Session': SessionFilter,
        'CashRegisterSession': CashRegisterSessionFilter,
        'CashTransaction': CashTransactionFilter,
        'Supply': SupplyFilter,
    }
    return filter_map.get(model_name, django_filters.FilterSet)