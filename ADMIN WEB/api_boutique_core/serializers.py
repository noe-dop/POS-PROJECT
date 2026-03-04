from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import *
from django.contrib.auth import authenticate
from django.db.models import Sum

# =============================================================================
# SERIALIZERS DE BASE
# =============================================================================

class BaseAuditSerializer(serializers.ModelSerializer):
    """Serializer de base pour les modèles avec audit"""
    created_by = serializers.StringRelatedField(read_only=True)
    updated_by = serializers.StringRelatedField(read_only=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    updated_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    
    class Meta:
        abstract = True

# =============================================================================
# SERIALIZERS POUR LES COMMANDES (ORDERS) - AJOUTÉS
# =============================================================================

class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatus
        fields = '__all__'

class OrderSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderSource
        fields = '__all__'

class OrderItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True, allow_null=True)
    
    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ['discount_amount', 'tax_amount', 'line_total']

class OrderSerializer(BaseAuditSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    customer_full_name = serializers.SerializerMethodField()
    status_name = serializers.CharField(source='status.name', read_only=True)
    status_color = serializers.CharField(source='status.color', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True, allow_null=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True, allow_null=True)
    employee_name = serializers.SerializerMethodField()
    sale_ticket = serializers.CharField(source='sale.ticket_number', read_only=True, allow_null=True)
    
    # Pour la création avec articles
    order_items = OrderItemSerializer(many=True, write_only=True, required=False)
    
    # Champs calculés
    item_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = [
            'order_number', 'created_at', 'updated_at', 
            'created_by', 'updated_by', 'subtotal', 
            'tax_amount', 'discount_amount', 'total_amount',
            'customer_name', 'customer_email', 'customer_phone'
        ]
    
    def get_customer_full_name(self, obj):
        if obj.customer:
            return obj.customer.user.get_full_name()
        return obj.customer_name or "Client anonyme"
    
    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.user.get_full_name()
        return None
    
    def get_item_count(self, obj):
        return obj.items.count()
    
    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.expected_delivery_date:
            return obj.expected_delivery_date < timezone.now().date() and obj.status.code != 'delivered'
        return False
    
    def create(self, validated_data):
        items_data = validated_data.pop('order_items', [])
        order = Order.objects.create(**validated_data)
        
        # Créer les articles de commande
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        return order
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('order_items', None)
        
        # Mettre à jour la commande
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Mettre à jour les articles si fournis
        if items_data is not None:
            # Supprimer les anciens articles
            instance.items.all().delete()
            
            # Créer les nouveaux articles
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
            
            # Recalculer les totaux
            instance.calculate_totals()
        
        return instance

class OrderDashboardSerializer(serializers.ModelSerializer):
    """Sérialiseur simplifié pour le dashboard"""
    status_name = serializers.CharField(source='status.name')
    status_color = serializers.CharField(source='status.color')
    customer_name = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    store_name = serializers.CharField(source='store.name')
    payment_status_display = serializers.CharField(source='get_payment_status_display')
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'order_date', 'status', 'status_name', 
            'status_color', 'total_amount', 'customer_name', 'item_count',
            'payment_status', 'payment_status_display', 'expected_delivery_date',
            'store_name', 'converted_to_sale'
        ]
    
    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.user.get_full_name()
        return obj.customer_name or 'Client anonyme'
    
    def get_item_count(self, obj):
        return obj.items.count()

# =============================================================================
# CONFIGURATIONS
# =============================================================================

class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = '__all__'

class SaleStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleStatus
        fields = '__all__'

class ReturnReasonSerializer(BaseAuditSerializer):
    class Meta:
        model = ReturnReason
        fields = '__all__'

# =============================================================================
# MODÈLES MANQUANTS
# =============================================================================

class StoreShareholderSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    shareholder_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreShareholder
        fields = '__all__'
    
    def get_shareholder_name(self, obj):
        return obj.shareholder.user.get_full_name()

class ReorderRuleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    
    class Meta:
        model = ReorderRule
        fields = '__all__'

class StoreProductVariantSerializer(BaseAuditSerializer):
    store_product_name = serializers.SerializerMethodField()
    variant_name = serializers.CharField(source='variant.name', read_only=True)
    effective_cost = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreProductVariant
        fields = '__all__'
    
    def get_store_product_name(self, obj):
        return f"{obj.store_product.product.name} - {obj.store_product.store.name}"
    
    def get_effective_cost(self, obj):
        return obj.get_effective_cost()
    
    def get_effective_price(self, obj):
        return obj.get_effective_price()

class DeliveryScheduleSerializer(serializers.ModelSerializer):
    delivery_info = serializers.SerializerMethodField()
    route_name = serializers.CharField(source='route.name', read_only=True)
    
    class Meta:
        model = DeliverySchedule
        fields = '__all__'
    
    def get_delivery_info(self, obj):
        return f"Livraison {obj.delivery.sale.ticket_number}"

class ReturnedProductSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    sale_ticket = serializers.CharField(source='sell.ticket_number', read_only=True)
    
    class Meta:
        model = ReturnedProduct
        fields = '__all__'
    
    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name()

class ExpenseCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    expenses_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ExpenseCategory
        fields = '__all__'
    
    def get_expenses_count(self, obj):
        return obj.expense_set.count()

# =============================================================================
# DEVISE ET PARAMÈTRES
# =============================================================================

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = '__all__'

# =============================================================================
# UTILISATEURS ET AUTHENTIFICATION
# =============================================================================

class LoginSerializer(serializers.Serializer):
    """
    Serializer pour la connexion
    Accepte email OU username
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        username_or_email = data.get('username')
        password = data.get('password')
        
        # Essayer de s'authentifier avec email ou username
        user = None
        
        # Essayer avec email d'abord
        if '@' in username_or_email:
            try:
                user = User.objects.get(email=username_or_email)
                user = authenticate(username=user.username, password=password)
            except User.DoesNotExist:
                pass
        
        # Si pas trouvé avec email, essayer avec username
        if user is None:
            user = authenticate(username=username_or_email, password=password)
        
        if user is None:
            raise serializers.ValidationError({
                'non_field_errors': 'Un nom d\'utilisateur/email ou mot de passe invalide.'
            })

        if not user.is_active:
            raise serializers.ValidationError({
                'non_field_errors': 'Ce compte est désactivé'
            })
        
        data['user'] = user
        return data

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'phone2', 'address',
            'is_active', 'is_staff', 'is_superuser', 'password', 'password_confirm',
            'date_joined', 'last_login', 'updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'date_joined': {'read_only': True},
            'last_login': {'read_only': True},
        }
    
    def get_full_name(self, obj):
        return obj.get_full_name()
    
class RegisterSerializer(serializers.ModelSerializer):
    """Serializer de base pour création d'utilisateur"""
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 
                 'first_name', 'last_name', 'phone', 'address']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Les mots de passe ne correspondent pas.'
            })
        
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                'email': 'Cet email est déjà utilisé.'
            })
        
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({
                'username': 'Ce nom d\'utilisateur est déjà pris.'
            })
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        return user

class OwnerCreateSerializer(RegisterSerializer):
    photo = serializers.ImageField(required=False, write_only=True)
    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ['photo']
    
    def create(self, validated_data):
        user = super().create(validated_data)
        
        
        # Vérifier si l'utilisateur est déjà owner
        if Owner.objects.filter(user=user).exists():
            raise serializers.ValidationError({
                "user_id": "Cet utilisateur est déjà un owner."
            })
        # Cree le profil Owner avec la photo si fournie
        photo = validated_data.pop('photo', None)
        owner = Owner.objects.create(user=user)
        if photo:
            owner.photo = photo
            owner.save()

        return owner

class OwnerSerializer(serializers.ModelSerializer):
    # Pour la lecture, on peut inclure les infos du user
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = Owner
        fields = ['id', 'user', 'photo', 'created_at']
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'full_name': obj.user.get_full_name(),
            'phone': obj.user.phone
        }
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()

    
class ShareholderCreateSerializer(RegisterSerializer):
    investment_amount = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=True,
        write_only=True
    )
    photo = serializers.ImageField(required=False, write_only=True)
    
    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ['investment_amount', 'photo']
    
    def create(self, validated_data):
        # Créer le User via le parent
        user = super().create(validated_data)
        
        # Vérifier si l'utilisateur est déjà shareholder
        if Shareholder.objects.filter(user=user).exists():
            raise serializers.ValidationError({
                "user": "Cet utilisateur est déjà un actionnaire."
            })
        
        # Extraire les champs spécifiques
        investment_amount = validated_data.pop('investment_amount')
        photo = validated_data.pop('photo', None)
        
        # Créer le profil Shareholder
        shareholder =  Shareholder.objects.create(
            user=user,
            investment_amount=investment_amount,
            photo=photo
        )
        
        return shareholder

class ShareholderSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = Shareholder
        fields = ['id', 'user', 'investment_amount', 'photo']
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'full_name': obj.user.get_full_name()
        }
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()

class CustomerCreateSerializer(RegisterSerializer):
    birth_date = serializers.DateField(required=False, write_only=True)
    preferences = serializers.JSONField(required=False, write_only=True, default=dict)
    
    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ['birth_date', 'preferences']
    
    def create(self, validated_data):
        # Créer le User via le parent
        user = super().create(validated_data)
        
        # Vérifier si l'utilisateur est déjà customer
        if Customer.objects.filter(user=user).exists():
            raise serializers.ValidationError({
                "user": "Cet utilisateur est déjà un client."
            })
        
        # Extraire les champs spécifiques à Customer
        birth_date = validated_data.pop('birth_date', None)
        preferences = validated_data.pop('preferences', {})
        
        # Créer le profil Customer
        customer = Customer.objects.create(
            user=user,
            birth_date=birth_date,
            preferences=preferences
        )
        
        return customer
    
class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'user', 'user_id', 'full_name', 'birth_date', 'preferences', 'loyalty_points',
            'total_spent', 'first_purchase', 'last_purchase', 'photo'
        ]
        extra_kwargs = {"user": {"required": False, "read_only": True}}
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    
    def create(self, validated_data):
        user = validated_data.get('user')
        
        # Vérifier si l'utilisateur est déjà client
        if Customer.objects.filter(user=user).exists():
            raise serializers.ValidationError({
                "user_id": "Cet utilisateur est déjà un client."
            })
        
        return Customer.objects.create(**validated_data)
    
# =============================================================================
# EMPLOYÉS ET RÔLES
# =============================================================================

class EmployeeRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeRole
        fields = '__all__'


class EmployeeCreateSerializer(RegisterSerializer):
    # Champs spécifiques à Employee
    store_id = serializers.IntegerField(write_only=True, required=True)
    role_id = serializers.IntegerField(write_only=True, required=True)
    department_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    hire_date = serializers.DateField(write_only=True, required=True)
    salary = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        write_only=True,
        required=False,
        allow_null=True
    )
    emergency_contact = serializers.CharField(write_only=True, required=False)
    photo = serializers.ImageField(write_only=True, required=False)
    
    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + [
            'store_id', 'role_id', 'department_id',
            'hire_date', 'salary', 'emergency_contact', 'photo'
        ]
    
    def validate(self, data):
        # Validation du parent
        data = super().validate(data)
        
        # Vérifications supplémentaires pour Employee
        try:
            Store.objects.get(id=data['store_id'])
        except Store.DoesNotExist:
            raise serializers.ValidationError({
                'store_id': 'Ce magasin n\'existe pas.'
            })
        
        try:
            EmployeeRole.objects.get(id=data['role_id'])
        except EmployeeRole.DoesNotExist:
            raise serializers.ValidationError({
                'role_id': 'Ce rôle n\'existe pas.'
            })
        
        if data.get('department_id'):
            try:
                Department.objects.get(id=data['department_id'])
            except Department.DoesNotExist:
                raise serializers.ValidationError({
                    'department_id': 'Ce département n\'existe pas.'
                })
        
        return data
    
    def create(self, validated_data):
        # 1. EXTRAIRE tous les champs Employee
        store_id = validated_data.pop('store_id')
        role_id = validated_data.pop('role_id')
        department_id = validated_data.pop('department_id', None)
        hire_date = validated_data.pop('hire_date')
        salary = validated_data.pop('salary', None)
        emergency_contact = validated_data.pop('emergency_contact', None)
        photo = validated_data.pop('photo', None)
        
        # 2. Créer le User (maintenant validated_data n'a que les champs User)
        user = super().create(validated_data)
        
        # 3. Vérifier si l'utilisateur est déjà employé
        if Employee.objects.filter(user=user).exists():
            raise serializers.ValidationError({
                "user": "Cet utilisateur est déjà un employé."
            })
        
        # 4. Créer le profil Employee
        employe = Employee.objects.create(
            user=user,
            store_id=store_id,
            role_id=role_id,
            department_id=department_id,
            hire_date=hire_date,
            salary=salary,
            emergency_contact=emergency_contact,
            photo=photo
        )
        
        return employe


class EmployeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )
    store_name = serializers.CharField(source='store.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'user_id', 'full_name', 'hire_date', 'salary', 'emergency_contact',
            'is_active', 'store', 'store_name', 'department', 'department_name', 
            'role', 'role_name', 'photo'
        ]
        extra_kwargs = {"user": {"required": False, "read_only": True}}
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
# =============================================================================
# ADRESSES
# =============================================================================

class AddressSerializer(serializers.ModelSerializer):
    full_address = serializers.SerializerMethodField()
    
    class Meta:
        model = Address
        fields = '__all__'
    
    def get_full_address(self, obj):
        parts = [obj.address_line1]
        if obj.address_line2:
            parts.append(obj.address_line2)
        parts.extend([obj.postal_code, obj.city, obj.state, obj.country])
        return ', '.join(filter(None, parts))

# =============================================================================
# BOUTIQUES ET MAGASINS
# =============================================================================

class StoreTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreType
        fields = '__all__'

class StoreNetworkSerializer(serializers.ModelSerializer):
    headquarters_address = AddressSerializer(source='headquarters', read_only=True)
    
    class Meta:
        model = StoreNetwork
        fields = '__all__'

class StoreSerializer(serializers.ModelSerializer):
    store_type_name = serializers.CharField(source='store_type.name', read_only=True)
    network_name = serializers.CharField(source='network.name', read_only=True)
    address_details = AddressSerializer(source='address', read_only=True)
    total_employees = serializers.SerializerMethodField()
    total_products = serializers.SerializerMethodField()
    pending_orders = serializers.SerializerMethodField()
    
    class Meta:
        model = Store
        fields = '__all__'
        read_only_fields = ['created_at', 'slug']
    
    def get_total_employees(self, obj):
        return Employee.objects.filter(store=obj, is_active=True).count()
    
    def get_total_products(self, obj):
        return obj.store_products.filter(is_active=True).count()
    
    def get_pending_orders(self, obj):
        # Compter les commandes en attente pour cette boutique
        pending_status = OrderStatus.objects.filter(code='pending').first()
        if pending_status:
            return Order.objects.filter(store=obj, status=pending_status).count()
        return 0
    
    def create(self, validated_data):
        # Générer le slug automatiquement à partir du nom
        from django.utils.text import slugify
        name = validated_data.get('name', '')
        validated_data['slug'] = slugify(name)
        
        # Vérifier si le slug existe déjà et ajouter un suffixe si nécessaire
        original_slug = validated_data['slug']
        counter = 1
        while Store.objects.filter(slug=validated_data['slug']).exists():
            validated_data['slug'] = f"{original_slug}-{counter}"
            counter += 1
        
        return super().create(validated_data)

class StoreOwnershipSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreOwnership
        fields = '__all__'
    
    def get_owner_name(self, obj):
        return obj.owner.user.get_full_name()

class DepartmentSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    manager_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = '__all__'
    
    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.user.get_full_name()
        return None



# =============================================================================
# SESSIONS ET JOURNALISATION
# =============================================================================

class SessionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    store_name = serializers.CharField(source='store.name', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = Session
        fields = '__all__'
    
    def get_user_name(self, obj):
        return obj.user.get_full_name()
    
    def get_duration(self, obj):
        if obj.logout_time:
            duration = obj.logout_time - obj.login_time
            return str(duration)
        return None

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ActivityLog
        fields = '__all__'
    
    def get_user_name(self, obj):
        return obj.user.get_full_name()

class SousServiceSerializer(serializers.ModelSerializer):
    session_info = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = SousService
        fields = '__all__'
    
    def get_session_info(self, obj):
        return f"{obj.session.user} - {obj.session.login_time}"
    
    def get_duration(self, obj):
        if obj.end_service:
            duration = obj.end_service - obj.start_service
            return str(duration)
        return None

# =============================================================================
# CARTES ET FIDÉLISATION
# =============================================================================

class TypeCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeCard
        fields = '__all__'

class CardSerializer(serializers.ModelSerializer):
    type_card_name = serializers.CharField(source='type_card.name', read_only=True)
    client_name = serializers.SerializerMethodField()
    client_email = serializers.CharField(source='client.user.email', read_only=True)
    total_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Card
        fields = '__all__'
    
    def get_client_name(self, obj):
        if obj.client and obj.client.user:
            return obj.client.user.get_full_name()
        return None
    
    def get_total_transactions(self, obj):
        return obj.transactions.count()

class CardTransactionSerializer(serializers.ModelSerializer):
    card_number = serializers.CharField(source='card.num_card', read_only=True)
    client_name = serializers.SerializerMethodField()
    type_transaction_display = serializers.CharField(source='get_type_transaction_display', read_only=True)
    
    class Meta:
        model = CardTransaction
        fields = '__all__'
    
    def get_client_name(self, obj):
        if obj.card.client and obj.card.client.user:
            return obj.card.client.user.get_full_name()
        return None

class LoyaltyProgramSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    total_rewards = serializers.SerializerMethodField()
    
    class Meta:
        model = LoyaltyProgram
        fields = '__all__'
    
    def get_total_rewards(self, obj):
        return obj.rewards.count()

class LoyaltyRewardSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    free_product_name = serializers.CharField(source='free_product.name', read_only=True)
    
    class Meta:
        model = LoyaltyReward
        fields = '__all__'

# =============================================================================
# FOURNISSEURS ET APPROVISIONNEMENTS
# =============================================================================

class SupplierSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    total_supplies = serializers.SerializerMethodField()
    
    class Meta:
        model = Supplier
        fields = '__all__'
    
    def get_total_supplies(self, obj):
        return obj.supplies.count()

class SupplySerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    utilisateur_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items = serializers.SerializerMethodField()
    
    class Meta:
        model = Supply
        fields = '__all__'
    
    def get_utilisateur_name(self, obj):
        return obj.utilisateur.user.get_full_name()
    
    def get_total_items(self, obj):
        return obj.retail_items.count()

class RetailSupplySerializer(serializers.ModelSerializer):
    supply_reference = serializers.CharField(source='supply.ref_supply', read_only=True)
    
    class Meta:
        model = RetailSupply
        fields = '__all__'

# =============================================================================
# PRODUITS, CATÉGORIES ET MARQUES
# =============================================================================
class ProductCategorySerializer(BaseAuditSerializer):
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductCategory
        fields = '__all__'
    
    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()
    
    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()

class ProductBrandSerializer(BaseAuditSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductBrand
        fields = '__all__'
    
    def get_products_count(self, obj):
        return obj.product_set.filter(is_active=True).count()

class ProductVariantSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = '__all__'

class ProductSerializer(BaseAuditSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True, allow_null=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    total_variants = serializers.SerializerMethodField()
    margin = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = '__all__'
    
    def get_total_variants(self, obj):
        return obj.variants.count()
    
    def get_margin(self, obj):
        if hasattr(obj, 'cost_price') and hasattr(obj, 'base_price'):
            if obj.cost_price and obj.base_price and obj.cost_price > 0:
                try:
                    return ((obj.base_price - obj.cost_price) / obj.cost_price) * 100
                except (TypeError, ZeroDivisionError):
                    return 0
        return 0

# =============================================================================
# GESTION DES STOCKS - VERSION CORRIGÉE
# =============================================================================

class WarehouseSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    address_details = AddressSerializer(source='address', read_only=True)
    current_usage = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = '__all__'

    def get_current_usage(self, obj):
        total_stock = Stock.objects.filter(warehouse=obj).aggregate(
            total=Sum('quantity_on_hand')
        )['total'] or 0

        return (total_stock / obj.capacity * 100) if obj.capacity and obj.capacity > 0 else 0


class BatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = Batch
        fields = '__all__'
    
    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expiry_date < timezone.now().date() if obj.expiry_date else False


class StockSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    is_low_stock = serializers.SerializerMethodField()
    needs_restock = serializers.SerializerMethodField()
    
    class Meta:
        model = Stock
        fields = '__all__'
    
    def get_is_low_stock(self, obj):
        return obj.is_low_stock()
    
    def get_needs_restock(self, obj):
        return obj.needs_restock()


class StockMovementItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True)
    movement_type = serializers.CharField(source='movement.movement_type', read_only=True)
    
    class Meta:
        model = StockMovementItem
        fields = '__all__'


class StockMovementSerializer(BaseAuditSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    items = StockMovementItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = StockMovement
        fields = '__all__'


class InventoryCountItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True)
    
    class Meta:
        model = InventoryCountItem
        fields = '__all__'


class InventoryCountSerializer(BaseAuditSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items = InventoryCountItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = InventoryCount
        # SUPPRIME ou COMMENTE cette ligne :
        # exclude = ['notes']
        
        # REMETS celle-ci :
        fields = '__all__'


class StoreProductSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    effective_cost_price = serializers.SerializerMethodField()
    effective_base_price = serializers.SerializerMethodField()
    margin = serializers.SerializerMethodField()
    is_promotion_active = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreProduct
        fields = '__all__'
    
    def get_effective_cost_price(self, obj):
        return obj.get_effective_cost_price()
    
    def get_effective_base_price(self, obj):
        return obj.get_effective_base_price()
    
    def get_margin(self, obj):
        return obj.get_margin()
    
    def get_is_promotion_active(self, obj):
        return obj.is_promotion_active()

# =============================================================================
# CAISSES ET SESSIONS DE CAISSE
# =============================================================================

class CashRegisterSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    active_sessions = serializers.SerializerMethodField()
    
    class Meta:
        model = CashRegister
        fields = '__all__'
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name()
        return None
    
    def get_active_sessions(self, obj):
        return obj.sessions.filter(status='open').count()

class CashRegisterSessionSerializer(serializers.ModelSerializer):
    cash_register_name = serializers.CharField(source='cash_register.name', read_only=True)
    employee_name = serializers.SerializerMethodField()
    store_name = serializers.CharField(source='cash_register.store.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = CashRegisterSession
        fields = '__all__'
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']
    
    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name()
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name()
        return None
    
    def get_duration(self, obj):
        if obj.end_time:
            duration = obj.end_time - obj.start_time
            return str(duration)
        return None

class CashTransactionSerializer(serializers.ModelSerializer):
    session_reference = serializers.CharField(source='session.id', read_only=True)
    cash_register_name = serializers.CharField(source='session.cash_register.name', read_only=True)
    employee_name = serializers.SerializerMethodField()
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    customer_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CashTransaction
        fields = '__all__'
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']
    
    def get_employee_name(self, obj):
        return obj.session.employee.user.get_full_name()
    
    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            return obj.customer.user.get_full_name()
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name()
        return None

# =============================================================================
# VENTES ET PAIEMENTS
# =============================================================================

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = SaleItem
        fields = '__all__'

class SalePaymentSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SalePayment
        fields = '__all__'
    
    def get_processed_by_name(self, obj):
        return obj.processed_by.user.get_full_name()

class SaleSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    customer_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    caisse_name = serializers.CharField(source='caisse.name', read_only=True)
    status_name = serializers.CharField(source='status.name', read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    payments = SalePaymentSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    
    # CORRECTION : Utiliser le champ directement au lieu de SerializerMethodField
    is_fully_paid = serializers.BooleanField(read_only=True)
    
    # Lien avec Order
    original_order_number = serializers.CharField(source='original_order.order_number', read_only=True, allow_null=True)
    
    class Meta:
        model = Sale
        fields = '__all__'
    
    def get_customer_name(self, obj):
        if obj.customer and obj.customer.user:
            return obj.customer.user.get_full_name()
        return None
    
    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name()
    
    def get_total_paid(self, obj):
        return obj.get_total_paid()
    
    def get_remaining_amount(self, obj):
        return obj.get_remaining_amount()

# =============================================================================
# LIVRAISONS
# =============================================================================

class DeliveryAddressSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    full_address = serializers.SerializerMethodField()
    
    class Meta:
        model = DeliveryAddress
        fields = '__all__'
    
    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name()
    
    def get_full_address(self, obj):
        return obj.address.full_address if hasattr(obj.address, 'full_address') else str(obj.address)

class DeliveryVehicleSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    
    class Meta:
        model = DeliveryVehicle
        fields = '__all__'

class DeliveryRouteSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    
    class Meta:
        model = DeliveryRoute
        fields = '__all__'
    
    def get_driver_name(self, obj):
        return obj.driver.user.get_full_name()

class DeliverySerializer(serializers.ModelSerializer):
    sale_ticket = serializers.CharField(source='sale.ticket_number', read_only=True)
    customer_name = serializers.SerializerMethodField()
    delivery_address_full = serializers.SerializerMethodField()
    assigned_driver_name = serializers.SerializerMethodField()
    route_name = serializers.CharField(source='route.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Delivery
        fields = '__all__'
    
    def get_customer_name(self, obj):
        return obj.sale.customer.user.get_full_name() if obj.sale.customer else None
    
    def get_delivery_address_full(self, obj):
        return obj.delivery_address.address.full_address if hasattr(obj.delivery_address.address, 'full_address') else str(obj.delivery_address.address)
    
    def get_assigned_driver_name(self, obj):
        if obj.assigned_driver:
            return obj.assigned_driver.user.get_full_name()
        return None

# =============================================================================
# RETOURS ET REMBOURSEMENTS
# =============================================================================

class ReturnItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='sale_item.product.name', read_only=True)
    variant_name = serializers.CharField(source='sale_item.variant.name', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    
    class Meta:
        model = ReturnItem
        fields = '__all__'

class ProductReturnSerializer(BaseAuditSerializer):
    original_sale_ticket = serializers.CharField(source='original_sale.ticket_number', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    customer_name = serializers.SerializerMethodField()
    return_reason_name = serializers.CharField(source='return_reason.name', read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    items = ReturnItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ProductReturn
        fields = '__all__'
    
    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name()
    
    def get_requested_by_name(self, obj):
        return obj.requested_by.user.get_full_name()
    
    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.user.get_full_name()
        return None

class RefundSerializer(BaseAuditSerializer):
    product_return_number = serializers.CharField(source='product_return.return_number', read_only=True)
    refund_method_name = serializers.CharField(source='refund_method.name', read_only=True)
    processed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Refund
        fields = '__all__'
    
    def get_processed_by_name(self, obj):
        return obj.processed_by.user.get_full_name()

# =============================================================================
# TRANSACTIONS FINANCIÈRES
# =============================================================================

class TransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    type_transaction_display = serializers.CharField(source='get_type_transaction_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = '__all__'
    
    def get_user_name(self, obj):
        return obj.user.user.get_full_name()

class MobileMoneySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    caisse_session_info = serializers.CharField(source='caisse_session.id', read_only=True)
    
    class Meta:
        model = MobileMoney
        fields = '__all__'
    
    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.user.get_full_name()
        return None

class UniteSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Unite
        fields = '__all__'
    
    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.user.get_full_name()
        return None

class WithdrawalCodeSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = WithdrawalCode
        fields = '__all__'
    
    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.user.get_full_name()
        return None
    
    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expires_at < timezone.now()

# =============================================================================
# PROMOTIONS ET MARKETING
# =============================================================================

class PromotionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    variante_name = serializers.CharField(source='variante.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = Promotion
        fields = '__all__'
    
    def get_is_active(self, obj):
        from django.utils import timezone
        now = timezone.now()
        return obj.start_date <= now <= obj.end_date

class CampaignSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    target_customers_count = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = '__all__'
    
    def get_target_customers_count(self, obj):
        return obj.target_customers.count()
    
    def get_is_active(self, obj):
        from django.utils import timezone
        now = timezone.now()
        return obj.start_date <= now <= obj.end_date

# =============================================================================
# COMPTABILITÉ ET ANALYSE
# =============================================================================

class ExpenseSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = '__all__'
    
    def get_approved_by_name(self, obj):
        return obj.approved_by.user.get_full_name()

class AccountingPeriodSerializer(BaseAuditSerializer):
    created_by_name = serializers.SerializerMethodField()
    closed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AccountingPeriod
        fields = '__all__'
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
    
    def get_closed_by_name(self, obj):
        if obj.closed_by:
            return obj.closed_by.get_full_name()
        return None

class GeneralLedgerSerializer(BaseAuditSerializer):
    period_name = serializers.CharField(source='period.name', read_only=True)
    account_details = serializers.SerializerMethodField()
    
    class Meta:
        model = GeneralLedger
        fields = '__all__'
    
    def get_account_details(self, obj):
        return f"{obj.account_number} - {obj.account_name}"

class FinancialReportSerializer(BaseAuditSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    generated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = FinancialReport
        fields = '__all__'
    
    def get_generated_by_name(self, obj):
        return obj.generated_by.get_full_name()

class KPISerializer(serializers.ModelSerializer):
    measurements_count = serializers.SerializerMethodField()
    
    class Meta:
        model = KPI
        fields = '__all__'
    
    def get_measurements_count(self, obj):
        return obj.measurements.count()

class KPIMeasurementSerializer(serializers.ModelSerializer):
    kpi_name = serializers.CharField(source='kpi.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    achievement_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = KPIMeasurement
        fields = '__all__'
    
    def get_achievement_rate(self, obj):
        if obj.kpi.target_value > 0:
            return (obj.value / obj.kpi.target_value) * 100
        return 0

class DashboardSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Dashboard
        fields = '__all__'
    
    def get_user_name(self, obj):
        return obj.user.get_full_name()

# =============================================================================
# SÉCURITÉ ET MAINTENANCE
# =============================================================================

class SecurityIncidentSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    reported_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SecurityIncident
        fields = '__all__'
    
    def get_reported_by_name(self, obj):
        return obj.reported_by.user.get_full_name()

class DataBackupSerializer(serializers.ModelSerializer):
    backup_type_display = serializers.CharField(source='get_backup_type_display', read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = DataBackup
        fields = '__all__'
    
    def get_file_size_mb(self, obj):
        return round(obj.file_size / (1024 * 1024), 2) if obj.file_size else 0

class MaintenanceTaskSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = MaintenanceTask
        fields = '__all__'
    
    def get_assigned_to_name(self, obj):
        return obj.assigned_to.user.get_full_name()
    
    def get_is_overdue(self, obj):
        from django.utils import timezone
        return obj.scheduled_date < timezone.now() and obj.status != 'completed'

class SupportTicketSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SupportTicket
        fields = '__all__'
    
    def get_created_by_name(self, obj):
        return obj.created_by.user.get_full_name()
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.user.get_full_name()
        return None

# =============================================================================
# GESTION DES ERREURS
# =============================================================================

class ErrorReportSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ErrorReport
        fields = '__all__'
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.user.get_full_name()
        return None