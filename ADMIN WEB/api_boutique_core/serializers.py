from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import *
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from django.utils.text import slugify  # Generation de slug
from django.core.files.storage import default_storage # Gestion des images
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
        username_or_email = data.get("username")
        password = data.get("password")

        # Essayer de s'authentifier avec email ou username
        user = None

        # Essayer avec email d'abord
        if "@" in username_or_email:
            try:
                user = User.objects.get(email=username_or_email)
                user = authenticate(username=user.username, password=password)
            except User.DoesNotExist:
                pass

        # Si pas trouvé avec email, essayer avec username
        if user is None:
            user = authenticate(username=username_or_email, password=password)

        if user is None:
            raise serializers.ValidationError(
                {
                    "non_field_errors": "Un nom d'utilisateur/email ou mot de passe invalide."
                }
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": "Ce compte est désactivé"}
            )

        data["user"] = user
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Aucun utilisateur avec cet email.")
        return value

    def save(self):
        email = self.validated_data["email"]
        user = User.objects.get(email=email)

        # Générer token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Construire le lien
        reset_url = f"{settings.FRONTEND_URL}/reset-password/confirm/{uid}/{token}/"

        # Envoyer email (en console en dev)
        send_mail(
            subject="Réinitialisation de votre mot de passe",
            message=f"Cliquez sur ce lien pour réinitialiser votre mot de passe: {reset_url}",
            from_email="noreply@example.com",
            recipient_list=[email],
            fail_silently=False,
        )

        return {"uid": uid, "token": token}


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Les mots de passe ne correspondent pas."}
            )
        return data

    def save(self):
        uid = self.validated_data["uid"]
        token = self.validated_data["token"]
        new_password = self.validated_data["new_password"]

        try:
            # Décoder l'UID
            uid = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=uid)

            # Vérifier le token
            if not default_token_generator.check_token(user, token):
                raise serializers.ValidationError(
                    {"token": "Token invalide ou expiré."}
                )

            # Changer le mot de passe
            user.set_password(new_password)
            user.save()

            return user
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError({"uid": "UID invalide."})


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "phone2",
            "address",
            "is_active",
            "is_staff",
            "is_superuser",
            "password",
            "password_confirm",
            "date_joined",
            "last_login",
            "updated_at",
        ]
        extra_kwargs = {
            "password": {"write_only": True, "required": False},
            "date_joined": {"read_only": True},
            "last_login": {"read_only": True},
        }

    def get_full_name(self, obj):
        return obj.get_full_name()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer de base pour création d'utilisateur"""

    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone",
            "address",
        ]

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password": "Les mots de passe ne correspondent pas."}
            )

        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Cet email est déjà utilisé."})

        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError(
                {"username": "Ce nom d'utilisateur est déjà pris."}
            )

        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()

        return user


class OwnerCreateSerializer(RegisterSerializer):
    photo = serializers.ImageField(required=False, write_only=True)

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ["photo"]

    def create(self, validated_data):
        user = super().create(validated_data)

        # Vérifier si l'utilisateur est déjà owner
        if Owner.objects.filter(user=user).exists():
            raise serializers.ValidationError(
                {"user_id": "Cet utilisateur est déjà un owner."}
            )
        # Cree le profil Owner avec la photo si fournie
        photo = validated_data.pop("photo", None)
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
        fields = ["id", "user", "photo", "created_at"]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "full_name": obj.user.get_full_name(),
            "phone": obj.user.phone,
        }

    def get_full_name(self, obj):
        return obj.user.get_full_name()


class ShareholderCreateSerializer(RegisterSerializer):
    investment_amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=True, write_only=True
    )
    photo = serializers.ImageField(required=False, write_only=True)

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ["investment_amount", "photo"]

    def create(self, validated_data):
        # Créer le User via le parent
        user = super().create(validated_data)

        # Vérifier si l'utilisateur est déjà shareholder
        if Shareholder.objects.filter(user=user).exists():
            raise serializers.ValidationError(
                {"user": "Cet utilisateur est déjà un actionnaire."}
            )

        # Extraire les champs spécifiques
        investment_amount = validated_data.pop("investment_amount")
        photo = validated_data.pop("photo", None)

        # Créer le profil Shareholder
        shareholder = Shareholder.objects.create(
            user=user, investment_amount=investment_amount, photo=photo
        )

        return shareholder


class ShareholderSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = Shareholder
        fields = ["id", "user", "investment_amount", "photo"]

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "full_name": obj.user.get_full_name(),
        }

    def get_full_name(self, obj):
        return obj.user.get_full_name()

class CustomerCreateSerializer(RegisterSerializer):
    birth_date = serializers.DateField(required=False)
    preferences = serializers.JSONField(required=False, default=dict)

    class Meta(RegisterSerializer.Meta):
        fields = RegisterSerializer.Meta.fields + ["birth_date", "preferences"]

    def create(self, validated_data):
        # Extraire les champs spécifiques à Customer
        birth_date = validated_data.pop("birth_date", None)
        preferences = validated_data.pop("preferences", {})

        # Créer le User via le parent
        user = super().create(validated_data)

        # Vérifier si l'utilisateur est déjà customer
        if Customer.objects.filter(user=user).exists():
            raise serializers.ValidationError(
                {"user": "Cet utilisateur est déjà un client."}
            )
        # Créer le profil Customer
        customer = Customer.objects.create(
            user=user, birth_date=birth_date, preferences=preferences
        )
        return customer

class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True
    )
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "user",
            "user_id",
            "full_name",
            "birth_date",
            "preferences",
            "loyalty_points",
            "total_spent",
            "first_purchase",
            "last_purchase",
            "photo",
        ]
        extra_kwargs = {"user": {"required": False, "read_only": True}}

    def get_full_name(self, obj):
        return obj.user.get_full_name()

    def create(self, validated_data):
        user = validated_data.get("user")

        # Vérifier si l'utilisateur est déjà client
        if Customer.objects.filter(user=user).exists():
            raise serializers.ValidationError(
                {"user_id": "Cet utilisateur est déjà un client."}
            )

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
        fields = "__all__"


class StoreNetworkSerializer(serializers.ModelSerializer):
    headquarters_address = AddressSerializer(source="headquarters", read_only=True)

    class Meta:
        model = StoreNetwork
        fields = "__all__"

class StoreCreateSerializer(serializers.ModelSerializer):
    """Serializer spécifique pour la création avec adresse incluse"""
    
    # Accepter les données d'adresse directement
    address_line1 = serializers.CharField(write_only=True)
    address_line2 = serializers.CharField(write_only=True, required=False, allow_blank=True)
    city = serializers.CharField(write_only=True)
    state = serializers.CharField(write_only=True, required=False, allow_blank=True)
    postal_code = serializers.CharField(write_only=True,required=False)
    country = serializers.CharField(write_only=True)
    latitude = serializers.CharField(write_only=True, required=False, allow_blank=True)
    longitude = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Store
        fields = [
            'name', 'phone', 'email', 'slogan',
            'store_type', 'network', 'is_active', 'configuration', 'opening_hours',
            # Champs d'adresse
            'address_line1', 'address_line2', 'city', 'state', 'postal_code', 
            'country', 'latitude', 'longitude',
        ]
        extra_kwargs = {
            'network': {'required': False, 'allow_null': True},
            'store_type': {'required': True},
        }
    
    def create(self, validated_data):

        # Extraire les données d'adresse
        address_data = {
            'address_line1': validated_data.pop('address_line1'),
            'address_line2': validated_data.pop('address_line2', ''),
            'city': validated_data.pop('city'),
            'state': validated_data.pop('state', ''),
            'postal_code': validated_data.pop('postal_code',''),
            'country': validated_data.pop('country'),
            'latitude': validated_data.pop('latitude'),
            'longitude': validated_data.pop('longitude'),
        }
        
        # Nettoyer latitude/longitude
        for coord in ['latitude', 'longitude']:
            if address_data[coord] == '':
                address_data[coord] = None
            elif address_data[coord] is not None:
                try:
                    address_data[coord] = float(address_data[coord])
                except (ValueError, TypeError):
                    address_data[coord] = None
        
        # Créer l'adresse
        address = Address.objects.create(**address_data)
        
        # Ajouter l'adresse aux données de la boutique
        validated_data['address'] = address
        
        # Gérer store_type (peut être ID ou objet)
        store_type = validated_data.get('store_type')
        if isinstance(store_type, int):
            from .models import StoreType
            validated_data['store_type'] = StoreType.objects.get(id=store_type)
        
        # Générer le slug
        from django.utils.text import slugify
        name = validated_data.get('name', '')
        slug = slugify(name)
        
        # Vérifier l'unicité du slug
        counter = 1
        original_slug = slug
        while Store.objects.filter(slug=slug).exists():
            slug = f"{original_slug}-{counter}"
            counter += 1
        
        validated_data['slug'] = slug
        
        # Créer la boutique
        store = Store.objects.create(**validated_data)
        
        # Créer StoreOwnership
        request = self.context.get('request')
        if request and hasattr(request.user, 'owner'):
            StoreOwnership.objects.create(
                store=store,
                owner=request.user.owner,
                is_primary=True,
                ownership_percentage=100.0
            )
        
        return store
    
class StoreUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la modification des boutiques avec adresse incluse"""
    
    # Accepter les données d'adresse directement (comme pour la création)
    address_line1 = serializers.CharField(write_only=True, required=False)
    address_line2 = serializers.CharField(write_only=True, required=False, allow_blank=True)
    city = serializers.CharField(write_only=True, required=False)
    state = serializers.CharField(write_only=True, required=False, allow_blank=True)
    postal_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    country = serializers.CharField(write_only=True, required=False)
    latitude = serializers.CharField(write_only=True, required=False, allow_blank=True)
    longitude = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = Store
        fields = [
            'name', 'phone', 'email', 'slogan',
            'store_type', 'network', 'is_active', 'configuration', 'opening_hours',
            # Champs d'adresse (optionnels pour la modification)
            'address_line1', 'address_line2', 'city', 'state', 'postal_code', 
            'country', 'latitude', 'longitude',
        ]
        extra_kwargs = {
            'network': {'required': False, 'allow_null': True},
            'store_type': {'required': False},
            'name': {'required': False},
            'phone': {'required': False, 'allow_blank': True},
            'email': {'required': False, 'allow_blank': True},
            'slogan': {'required': False, 'allow_blank': True},
            'is_active': {'required': False},
            'opening_hours': {'required': False},
            'configuration': {'required': False},
        }
    
    def update(self, instance, validated_data):
        store_type_value = validated_data.pop('store_type')
        from .models import StoreType

        # ✅ CAS 1: C'est DÉJÀ un objet StoreType
        if hasattr(store_type_value, '_meta') and store_type_value._meta.model == StoreType:
            instance.store_type = store_type_value
        
        # ✅ CAS 2: C'est un ID (int)
        elif isinstance(store_type_value, int):
            try:
                store_type = StoreType.objects.get(id=store_type_value)
                instance.store_type = store_type
            except StoreType.DoesNotExist:
                None

        # Vérifier si des données d'adresse sont fournies
        address_fields = ['address_line1', 'address_line2', 'city', 'state', 
                         'postal_code', 'country', 'latitude', 'longitude']
        
        has_address_data = any(field in validated_data for field in address_fields)
        
        if has_address_data:
            # Extraire les données d'adresse
            address_data = {}
            for field in address_fields:
                if field in validated_data:
                    address_data[field] = validated_data.pop(field)

            # Nettoyer latitude/longitude
            for coord in ['latitude', 'longitude']:
                if coord in address_data:
                    if address_data[coord] == '':
                        address_data[coord] = None
                    elif address_data[coord] is not None:
                        try:
                            address_data[coord] = float(address_data[coord])
                        except (ValueError, TypeError):
                            address_data[coord] = None
            
            # Mettre à jour ou créer l'adresse
            if instance.address:
                # Mettre à jour l'adresse existante
                for key, value in address_data.items():
                    if value is not None and value != '':
                        setattr(instance.address, key, value)
                instance.address.save()
            else:
                # Créer une nouvelle adresse
                new_address = Address.objects.create(**address_data)
                instance.address = new_address

        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            if value is not None and value != '':
                setattr(instance, attr, value)
        
        instance.save()
        
        return instance
    
class StoreSerializer(serializers.ModelSerializer):
    store_type_name = serializers.CharField(source="store_type.name", read_only=True)
    network_name = serializers.CharField(source="network.name", read_only=True)
    address_details = AddressSerializer(source="address", read_only=True)
    total_employees = serializers.SerializerMethodField()
    total_products = serializers.SerializerMethodField()
    pending_orders = serializers.SerializerMethodField()

    class Meta:
        model = Store
        fields = "__all__"
        read_only_fields = ["created_at", "slug","address_details"]

    def get_total_employees(self, obj):
        return Employee.objects.filter(store=obj, is_active=True).count()

    def get_total_products(self, obj):
        return obj.store_products.filter(is_active=True).count()

    def get_pending_orders(self, obj):
        # Compter les commandes en attente pour cette boutique
        pending_status = OrderStatus.objects.filter(code="pending").first()
        if pending_status:
            return Order.objects.filter(store=obj, status=pending_status).count()
        return 0

class StoreOwnershipSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreOwnership
        fields = "__all__"

    def get_owner_name(self, obj):
        return obj.owner.user.get_full_name()

class DepartmentSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    manager_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = "__all__"

    def get_manager_name(self, obj):
        if obj.manager:
            return obj.manager.user.get_full_name()
        return None

# =============================================================================
# SERIALIZERS POUR LES COMMANDES (ORDERS) - AJOUTÉS
# =============================================================================
class PackItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = PackItem
        fields = ['id', 'product', 'product_name', 'quantity']

class PackSerializer(serializers.ModelSerializer):
    items = PackItemSerializer(many=True, read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    class Meta:
        model = Pack
        fields = '__all__'

class OrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatus
        fields = "__all__"


class OrderSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderSource
        fields = "__all__"


class OrderItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source='variant.product.name', read_only=True, allow_null=True)
    variant_name = serializers.CharField(source='variant.name', read_only=True, allow_null=True)
    pack_name = serializers.CharField(source='pack.name', read_only=True, allow_null=True)

    # Pour la création
    variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.filter(is_active=True),
        source='variant',
        write_only=True,
        required=False
    )
    pack_id = serializers.PrimaryKeyRelatedField(
        queryset=Pack.objects.filter(is_active=True),
        source='pack',
        write_only=True,
        required=False
    )

    class Meta:
        model = OrderItem
        fields = "__all__"
        read_only_fields = ["discount_amount", "tax_amount", "line_total",'variant','pack']

    def validate(self, data):
        if not data.get('variant') and not data.get('pack'):
            raise serializers.ValidationError("Either variant_id or pack_id must be provided.")
        if data.get('variant') and data.get('pack'):
            raise serializers.ValidationError("Cannot provide both variant_id and pack_id.")
        return data


class OrderSerializer(BaseAuditSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    customer_full_name = serializers.SerializerMethodField()
    status_name = serializers.CharField(source="status.name", read_only=True)
    status_color = serializers.CharField(source="status.color", read_only=True)
    source_name = serializers.CharField(
        source="source.name", read_only=True, allow_null=True
    )
    payment_method_name = serializers.CharField(
        source="payment_method.name", read_only=True, allow_null=True
    )
    employee_name = serializers.SerializerMethodField()
    sale_ticket = serializers.CharField(
        source="sale.ticket_number", read_only=True, allow_null=True
    )

    # Pour la création avec articles
    order_items = OrderItemSerializer(many=True, write_only=True, required=False)

    # Champs calculés
    item_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = [
            "order_number",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "customer_name",
            "customer_email",
            "customer_phone",
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
            return (
                obj.expected_delivery_date < timezone.now().date()
                and obj.status.code != "delivered"
            )
        return False

    def create(self, validated_data):
        items_data = validated_data.pop('order_items', [])
        order = Order.objects.create(**validated_data)

        for item_data in items_data:
            order_item = OrderItem.objects.create(order=order, **item_data)

            if order_item.pack:
                pack = order_item.pack
                for pack_item in pack.items.all():
                    variant = pack_item.variant
                    quantity_needed = pack_item.quantity * order_item.quantity
                    # Récupérer le stock de cette variante dans le magasin
                    # via StoreProductVariant ou Stock, selon votre modèle
                    try:
                        store_variant = StoreProductVariant.objects.get(
                            store_product__store=order.store,
                            variant=variant
                        )
                        if store_variant.quantity_on_hand < quantity_needed:
                            raise ValidationError(f"Stock insuffisant pour {variant.name} dans le pack {pack.name}")
                        store_variant.quantity_on_hand -= quantity_needed
                        store_variant.save()
                    except StoreProductVariant.DoesNotExist:
                        raise ValidationError(f"Variante {variant.name} non disponible dans ce magasin")
            else:
                # Cas d'une variante simple
                variant = order_item.variant
                try:
                    store_variant = StoreProductVariant.objects.get(
                            store_product__store=order.store,
                            variant=variant
                        )
                    if store_variant.quantity_on_hand < quantity_needed:
                        raise ValidationError(f"Stock insuffisant pour {variant.name} dans le pack {pack.name}")
                    store_variant.quantity_on_hand -= quantity_needed
                    store_variant.save()
                except StoreProductVariant.DoesNotExist:
                    raise ValidationError(f"Variante {variant.name} non disponible dans ce magasin")
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop("order_items", None)

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

    status_name = serializers.CharField(source="status.name")
    status_color = serializers.CharField(source="status.color")
    customer_name = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    store_name = serializers.CharField(source="store.name")
    payment_status_display = serializers.CharField(source="get_payment_status_display")

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "order_date",
            "status",
            "status_name",
            "status_color",
            "total_amount",
            "customer_name",
            "item_count",
            "payment_status",
            "payment_status_display",
            "expected_delivery_date",
            "store_name",
            "converted_to_sale",
        ]

    def get_customer_name(self, obj):
        if obj.customer:
            return obj.customer.user.get_full_name()
        return obj.customer_name or "Client anonyme"

    def get_item_count(self, obj):
        return obj.items.count()


# =============================================================================
# CONFIGURATIONS
# =============================================================================


class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = "__all__"


class SaleStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleStatus
        fields = "__all__"


class ReturnReasonSerializer(BaseAuditSerializer):
    class Meta:
        model = ReturnReason
        fields = "__all__"


# =============================================================================
# MODÈLES MANQUANTS
# =============================================================================


class StoreShareholderSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    shareholder_name = serializers.SerializerMethodField()

    class Meta:
        model = StoreShareholder
        fields = "__all__"

    def get_shareholder_name(self, obj):
        return obj.shareholder.user.get_full_name()


class ReorderRuleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)

    class Meta:
        model = ReorderRule
        fields = "__all__"


class DeliveryScheduleSerializer(serializers.ModelSerializer):
    delivery_info = serializers.SerializerMethodField()
    route_name = serializers.CharField(source="route.name", read_only=True)

    class Meta:
        model = DeliverySchedule
        fields = "__all__"

    def get_delivery_info(self, obj):
        return f"Livraison {obj.delivery.sale.ticket_number}"


class ReturnedProductSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    sale_ticket = serializers.CharField(source="sell.ticket_number", read_only=True)

    class Meta:
        model = ReturnedProduct
        fields = "__all__"

    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name()


class ExpenseCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    expenses_count = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseCategory
        fields = "__all__"

    def get_expenses_count(self, obj):
        return obj.expense_set.count()


# =============================================================================
# DEVISE ET PARAMÈTRES
# =============================================================================


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = "__all__"


# =============================================================================
# SESSIONS ET JOURNALISATION
# =============================================================================


class SessionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    store_name = serializers.CharField(source="store.name", read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = "__all__"

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
        fields = "__all__"

    def get_user_name(self, obj):
        return obj.user.get_full_name()


class SousServiceSerializer(serializers.ModelSerializer):
    session_info = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()

    class Meta:
        model = SousService
        fields = "__all__"

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
        fields = "__all__"


class CardSerializer(serializers.ModelSerializer):
    type_card_name = serializers.CharField(source="type_card.name", read_only=True)
    client_name = serializers.SerializerMethodField()
    client_email = serializers.CharField(source="client.user.email", read_only=True)
    total_transactions = serializers.SerializerMethodField()

    class Meta:
        model = Card
        fields = "__all__"

    def get_client_name(self, obj):
        if obj.client and obj.client.user:
            return obj.client.user.get_full_name()
        return None

    def get_total_transactions(self, obj):
        return obj.transactions.count()


class CardTransactionSerializer(serializers.ModelSerializer):
    card_number = serializers.CharField(source="card.num_card", read_only=True)
    client_name = serializers.SerializerMethodField()
    type_transaction_display = serializers.CharField(
        source="get_type_transaction_display", read_only=True
    )

    class Meta:
        model = CardTransaction
        fields = "__all__"

    def get_client_name(self, obj):
        if obj.card.client and obj.card.client.user:
            return obj.card.client.user.get_full_name()
        return None


class LoyaltyProgramSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    total_rewards = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyProgram
        fields = "__all__"

    def get_total_rewards(self, obj):
        return obj.rewards.count()


class LoyaltyRewardSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source="program.name", read_only=True)
    free_product_name = serializers.CharField(
        source="free_product.name", read_only=True
    )

    class Meta:
        model = LoyaltyReward
        fields = "__all__"


# =============================================================================
# FOURNISSEURS ET APPROVISIONNEMENTS
# =============================================================================


class SupplierSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    total_supplies = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = "__all__"

    def get_total_supplies(self, obj):
        return obj.supplies.count()


class SupplySerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    utilisateur_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = Supply
        fields = "__all__"

    def get_utilisateur_name(self, obj):
        return obj.utilisateur.user.get_full_name()

    def get_total_items(self, obj):
        return obj.retail_items.count()


class RetailSupplySerializer(serializers.ModelSerializer):
    supply_reference = serializers.CharField(source="supply.ref_supply", read_only=True)

    class Meta:
        model = RetailSupply
        fields = "__all__"


# =============================================================================
# PRODUITS, CATÉGORIES ET MARQUES
# =============================================================================


class ProductCategorySerializer(BaseAuditSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = "__all__"
        extra_kwargs = {
            'slug': {'required': False, 'allow_blank': True},  # permet de ne pas fournir le slug
            'created_at': {'read_only':True},
            'updated_at': {'read_only': True}
        }

    def get_children_count(self, obj):
        return obj.children.filter(is_active=True).count()

    def get_products_count(self, obj):
        # return obj.products.filter(is_active=True).count()
        return 0
    
    def get_level(self, obj):
        level = 0
        p = obj.parent
        while p :
            level+=1
            p = p.parent
        return level
    
    def create(self, validated_data):
        name = validated_data.get('name')
        if not validated_data.get('slug'):
            base_slug = slugify(name)
            slug = base_slug
            counter = 1
            while ProductCategory.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Régénérer le slug avec le nom si il est changé
        if 'name' in validated_data and validated_data['name'] != instance.name:
            # Générer un nouveau slug basé sur le nouveau nom
            name = validated_data['name']
            base_slug = slugify(name)
            slug = base_slug
            counter = 1
            while ProductCategory.objects.filter(slug=slug).exclude(pk=instance.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug
        return super().update(instance, validated_data)
    
    
class ProductBrandSerializer(BaseAuditSerializer):
    products_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductBrand
        fields = "__all__"

    def get_products_count(self, obj):
        return obj.product_set.filter(is_active=True).count()


class ProductVariantSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    final_price = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = "__all__"

    def get_final_price(self, obj):
        return obj.get_final_price()


class ProductSerializer(BaseAuditSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    variants = ProductVariantSerializer(many=True, required=False)
    total_variants = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    margin = serializers.SerializerMethodField()
    # Champ calculé pour la catégorie principale (racine)
    main_category_id = serializers.SerializerMethodField()
    additional_images = serializers.ListField(
        child= serializers.ImageField(write_only=True),
        write_only = True,
        required=False
    )
    # Pour la lecture
    additional_images_urls = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = "__all__"
        extra_kwargs = {
            'slug': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        additional_images = validated_data.pop('additional_images',[])
        photo = validated_data.pop('photo',None)
        variants_data = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)

        if photo:
            product.photo = photo
            product.save()
        # Sauvegarder les iamges supplementaires et générer les URLs
        urls = []
        for img in additional_images:
            # Sauvegarde via Django, l'URL sera accessible via img.url
            # Par exemple, on peut stocker dans un sous-dossier spécifique
            path = default_storage.save(f'products/extra/{img.name}', img)
            urls.append(default_storage.url(path))
        # Mettre à jour le champ JSONField
        product.additional_images = urls
        product.save(update_fields=['additional_images'])

        for variant_data in variants_data:
            ProductVariant.objects.create(product=product, **variant_data)
        return product
    
    def update(self, instance, validated_data):
        additional_images = validated_data.pop("additional_images",None)
        if additional_images is not None:
            # Traiter les nouvelles images (à adapter selon ton besoin)
            urls = []
            for img in additional_images:
                path = default_storage.save(f'products/extra/{img.name}', img)
                urls.append(default_storage.url(path))
            instance.additional_images = urls

        variants_data = validated_data.pop('variants', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if variants_data is not None:
            instance.variants.all().delete()
            for variant_data in variants_data:
                ProductVariant.objects.create(product=instance, **variant_data)
        return instance

    def get_main_category_id(self, obj):
        # remonte la hiérarchie jusqu'à la racine
        if obj.group:
            parent = obj.group.parent
            while parent:
                if not parent.parent:
                    return parent.id
                parent = parent.parent
        return None

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
    
    def get_additional_images_urls(self, obj):
        # Si additional_images est une liste de chemins relatifs
        request = self.context.get('request')
        if obj.additional_images and request:
            return [request.build_absolute_uri(img) for img in obj.additional_images]
        return obj.additional_images or []

class StoreProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreProduct
        fields = [
            'store', 'product', 'supplier',
            'store_cost_price', 'store_base_price', 'store_compare_at_price',
            'qt_item', 'dlv', 'dlc', 'dcr',
            'is_active', 'display_order',
            'min_stock_threshold', 'reorder_quantity', 'jour_ecart',
            'status'
        ]
        extra_kwargs = {
            'supplier': {'required': False,'allow_null':True},
            'store_cost_price': {'required': False, 'allow_null': True},
            'store_base_price': {'required': False, 'allow_null': True},
            'store': {'write_only': True},  # Optionnel, mais souvent on ne renvoie pas l'ID en lecture
            'product': {'write_only': True},
        }

    def validate(self, data):
        # Vérifier que le produit n'est pas déjà lié à cette boutique (unique_together)
        if StoreProduct.objects.filter(store=data['store'], product=data['product']).exists():
            raise serializers.ValidationError("Ce produit est déjà lié à cette boutique.")
        return data
    
class StoreProductSerializer(BaseAuditSerializer):
    # Données du produit global
    name = serializers.CharField(source='product.name', read_only=True)
    sku = serializers.CharField(source='product.sku', read_only=True)
    description = serializers.CharField(source='product.description', read_only=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True)
    brand = serializers.IntegerField(source='product.brand_id', read_only=True)
    images_urls = serializers.SerializerMethodField()
    # IDs de catégories
    group = serializers.IntegerField(source='product.group_id', read_only=True)
    product_type = serializers.IntegerField(source='product.product_type_id', read_only=True)
    main_category_id = serializers.SerializerMethodField()
    # Prix spécifiques au magasin
    quantity_item = serializers.DecimalField(source="qt_item", max_digits=10, decimal_places=2)
    price = serializers.DecimalField(source='store_base_price', max_digits=10, decimal_places=2, read_only=True)
    cost = serializers.DecimalField(source='store_cost_price', max_digits=10, decimal_places=2, read_only=True)
    stock = serializers.IntegerField(source='quantity_on_hand', read_only=True)  # si vous avez ce champ
    location = serializers.CharField(source='warehouse', read_only=True)  # exemple
    status = serializers.CharField()
    # Variantes (à adapter)
    variants = serializers.SerializerMethodField()
    store_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = StoreProduct
        fields = ['id', 'name', 'sku', 'description', 'brand','brand_name', 'images_urls',
                  'group', 'product_type', 'main_category_id','quantity_item',
                  'price', 'cost', 'stock', 'location', 'variants', 'store_id',
                  'status'
                  ]

    def get_images_urls(self, obj):
        request = self.context.get('request')
        urls = []

        # Photo principale (ImageField)
        if obj.product.photo:
            # Construit l'URL absolue si nécessaire
            if request:
                urls.append(request.build_absolute_uri(obj.product.photo.url))
            else:
                urls.append(obj.product.photo.url)

        # Images supplémentaires (JSONField contenant des URLs ou chemins)
        additional = obj.product.additional_images or []
        for img in additional:
            if img:  # éviter les chaînes vides
                # Si ce sont des URLs relatives, on peut aussi les convertir en absolues
                if request and not img.startswith(('http://', 'https://')):
                    urls.append(request.build_absolute_uri(img))
                else:
                    urls.append(img)

        return urls if urls else None


    def get_main_category_id(self, obj):
        # remonter à la racine du groupe
        return self._get_root_category(obj.product.group)

    def _get_root_category(self, cat):
        if cat and cat.parent:
            return self._get_root_category(cat.parent)
        return cat.id if cat else None

    def get_variants(self, obj):
        # retourner les variantes liées au produit, mais avec prix spécifiques magasin ?
        # Si les variantes sont globales, utilisez ProductVariantSerializer
        from .serializers import ProductVariantSerializer
        return ProductVariantSerializer(obj.product.variants.all(), many=True).data

    def get_effective_cost_price(self, obj):
        return obj.get_effective_cost_price()

    def get_effective_base_price(self, obj):
        return obj.get_effective_base_price()

    def get_margin(self, obj):
        return obj.get_margin()

    def get_is_promotion_active(self, obj):
        return obj.is_promotion_active()

class StoreProductPublicSerializer(BaseAuditSerializer):
    # Données du produit global
    name = serializers.CharField(source='product.name', read_only=True)
    sku = serializers.CharField(source='product.sku', read_only=True)
    description = serializers.CharField(source='product.description', read_only=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True)
    brand = serializers.IntegerField(source='product.brand_id', read_only=True)
    images_urls = serializers.SerializerMethodField()
    # IDs de catégories
    group = serializers.IntegerField(source='product.group_id', read_only=True)
    product_type = serializers.IntegerField(source='product.product_type_id', read_only=True)
    main_category_id = serializers.SerializerMethodField()
    # Prix spécifiques au magasin
    quantity_item = serializers.DecimalField(source="qt_item", max_digits=10, decimal_places=2)
    price = serializers.DecimalField(source='store_base_price', max_digits=10, decimal_places=2, read_only=True)
    stock = serializers.IntegerField(source='quantity_on_hand', read_only=True)  # si vous avez ce champ
    location = serializers.CharField(source='warehouse', read_only=True)  # exemple
    status = serializers.CharField()

    # Variantes (à adapter)
    variants = serializers.SerializerMethodField()
    store_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = StoreProduct
        fields = ['id', 'name', 'sku', 'description', 'brand','brand_name', 'images_urls',
                  'group', 'product_type', 'main_category_id','quantity_item',
                  'price', 'stock', 'location', 'variants', 'store_id',
                  'status'
                  ]

    def get_images_urls(self, obj):
        request = self.context.get('request')
        urls = []

        # Photo principale (ImageField)
        if obj.product.photo:
            # Construit l'URL absolue si nécessaire
            if request:
                urls.append(request.build_absolute_uri(obj.product.photo.url))
            else:
                urls.append(obj.product.photo.url)

        # Images supplémentaires (JSONField contenant des URLs ou chemins)
        additional = obj.product.additional_images or []
        for img in additional:
            if img:  # éviter les chaînes vides
                # Si ce sont des URLs relatives, on peut aussi les convertir en absolues
                if request and not img.startswith(('http://', 'https://')):
                    urls.append(request.build_absolute_uri(img))
                else:
                    urls.append(img)

        return urls if urls else None

    def get_main_category_id(self, obj):
        # remonter à la racine du groupe
        return self._get_root_category(obj.product.group)

    def _get_root_category(self, cat):
        if cat and cat.parent:
            return self._get_root_category(cat.parent)
        return cat.id if cat else None

    def get_variants(self, obj):
        # retourner les variantes liées au produit, mais avec prix spécifiques magasin ?
        # Si les variantes sont globales, utilisez ProductVariantSerializer
        from .serializers import ProductVariantSerializer
        return ProductVariantSerializer(obj.product.variants.all(), many=True).data

    def get_effective_cost_price(self, obj):
        return obj.get_effective_cost_price()

    def get_effective_base_price(self, obj):
        return obj.get_effective_base_price()

    def get_margin(self, obj):
        return obj.get_margin()

    def get_is_promotion_active(self, obj):
        return obj.is_promotion_active()


class StoreProductVariantSerializer(BaseAuditSerializer):
    store_product_name = serializers.SerializerMethodField()
    variant_name = serializers.CharField(source="variant.name", read_only=True)
    effective_cost = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()

    class Meta:
        model = StoreProductVariant
        fields = "__all__"

    def get_store_product_name(self, obj):
        return f"{obj.store_product.product.name} - {obj.store_product.store.name}"

    def get_effective_cost(self, obj):
        return obj.get_effective_cost()

    def get_effective_price(self, obj):
        return obj.get_effective_price()
    
# =============================================================================
# GESTION DES STOCKS
# =============================================================================


class WarehouseSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    address_details = AddressSerializer(source="address", read_only=True)
    current_usage = serializers.SerializerMethodField()
    
    class Meta:
        model = Warehouse
        fields = "__all__"

    def get_current_usage(self, obj):
        # Calcul simplifié de l'utilisation
        total_stock = (
            Stock.objects.filter(warehouse=obj).aggregate(
                total=sum("quantity_on_hand")
            )["total"]
            or 0
        )
        return (total_stock / obj.capacity * 100) if obj.capacity > 0 else 0


class BatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = "__all__"

    def get_is_expired(self, obj):
        from django.utils import timezone

        return obj.expiry_date < timezone.now().date() if obj.expiry_date else False


class StockSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    is_low_stock = serializers.SerializerMethodField()
    needs_restock = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = "__all__"

    def get_is_low_stock(self, obj):
        return obj.is_low_stock()

    def get_needs_restock(self, obj):
        return obj.needs_restock()

class StockMovementItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_name = serializers.CharField(source="variant.name", read_only=True)
    movement_type = serializers.CharField(
        source="movement.movement_type", read_only=True
    )

    class Meta:
        model = StockMovementItem
        fields = "__all__"



class StockMovementSerializer(BaseAuditSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    movement_type_display = serializers.CharField(
        source="get_movement_type_display", read_only=True
    )
    items = StockMovementItemSerializer(many=True, read_only=True)

    class Meta:
        model = StockMovement
        fields = "__all__"



class InventoryCountItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    variant_name = serializers.CharField(source="variant.name", read_only=True)

    class Meta:
        model = InventoryCountItem
        fields = "__all__"



class InventoryCountSerializer(BaseAuditSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    items = InventoryCountItemSerializer(many=True, read_only=True)

    class Meta:
        model = InventoryCount
        fields = "__all__"

# =============================================================================
# CAISSES ET SESSIONS DE CAISSE
# =============================================================================


class CashRegisterSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    active_sessions = serializers.SerializerMethodField()

    class Meta:
        model = CashRegister
        fields = "__all__"
        read_only_fields = ["created_by", "updated_by", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name()
        return None

    def get_active_sessions(self, obj):
        return obj.sessions.filter(status="open").count()


class CashRegisterSessionSerializer(serializers.ModelSerializer):
    cash_register_name = serializers.CharField(
        source="cash_register.name", read_only=True
    )
    employee_name = serializers.SerializerMethodField()
    store_name = serializers.CharField(
        source="cash_register.store.name", read_only=True
    )
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = CashRegisterSession
        fields = "__all__"
        read_only_fields = ["created_by", "updated_by", "created_at", "updated_at"]

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
    session_reference = serializers.CharField(source="session.id", read_only=True)
    cash_register_name = serializers.CharField(
        source="session.cash_register.name", read_only=True
    )
    employee_name = serializers.SerializerMethodField()
    payment_method_name = serializers.CharField(
        source="payment_method.name", read_only=True
    )
    currency_code = serializers.CharField(source="currency.code", read_only=True)
    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display", read_only=True
    )
    customer_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CashTransaction
        fields = "__all__"
        read_only_fields = ["created_by", "updated_by", "created_at", "updated_at"]

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
        fields = "__all__"


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    variant_name = serializers.CharField(source="variant.name", read_only=True)
    line_total = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = SaleItem
        fields = "__all__"


class SalePaymentSerializer(serializers.ModelSerializer):
    payment_method_name = serializers.CharField(
        source="payment_method.name", read_only=True
    )
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SalePayment
        fields = "__all__"

    def get_processed_by_name(self, obj):
        return obj.processed_by.user.get_full_name()


class SaleSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    customer_name = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    caisse_name = serializers.CharField(source="caisse.name", read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    payments = SalePaymentSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    # CORRECTION : Utiliser le champ directement au lieu de SerializerMethodField
    is_fully_paid = serializers.BooleanField(read_only=True)

    # Lien avec Order
    original_order_number = serializers.CharField(
        source="original_order.order_number", read_only=True, allow_null=True
    )

    class Meta:
        model = Sale
        fields = "__all__"

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
        fields = "__all__"

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name()

    def get_full_address(self, obj):
        return (
            obj.address.full_address
            if hasattr(obj.address, "full_address")
            else str(obj.address)
        )


class DeliveryVehicleSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)

    class Meta:
        model = DeliveryVehicle
        fields = "__all__"


class DeliveryRouteSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)

    class Meta:
        model = DeliveryRoute
        fields = "__all__"

    def get_driver_name(self, obj):
        return obj.driver.user.get_full_name()


class DeliverySerializer(serializers.ModelSerializer):
    sale_ticket = serializers.CharField(source="sale.ticket_number", read_only=True)
    customer_name = serializers.SerializerMethodField()
    delivery_address_full = serializers.SerializerMethodField()
    assigned_driver_name = serializers.SerializerMethodField()
    route_name = serializers.CharField(source="route.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Delivery
        fields = "__all__"

    def get_customer_name(self, obj):
        return obj.sale.customer.user.get_full_name() if obj.sale.customer else None

    def get_delivery_address_full(self, obj):
        return (
            obj.delivery_address.address.full_address
            if hasattr(obj.delivery_address.address, "full_address")
            else str(obj.delivery_address.address)
        )

    def get_assigned_driver_name(self, obj):
        if obj.assigned_driver:
            return obj.assigned_driver.user.get_full_name()
        return None


# =============================================================================
# RETOURS ET REMBOURSEMENTS
# =============================================================================


class ReturnItemSerializer(BaseAuditSerializer):
    product_name = serializers.CharField(
        source="sale_item.product.name", read_only=True
    )
    variant_name = serializers.CharField(
        source="sale_item.variant.name", read_only=True
    )
    condition_display = serializers.CharField(
        source="get_condition_display", read_only=True
    )

    class Meta:
        model = ReturnItem
        fields = "__all__"


class ProductReturnSerializer(BaseAuditSerializer):
    original_sale_ticket = serializers.CharField(
        source="original_sale.ticket_number", read_only=True
    )
    store_name = serializers.CharField(source="store.name", read_only=True)
    customer_name = serializers.SerializerMethodField()
    return_reason_name = serializers.CharField(
        source="return_reason.name", read_only=True
    )
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    items = ReturnItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ProductReturn
        fields = "__all__"

    def get_customer_name(self, obj):
        return obj.customer.user.get_full_name()

    def get_requested_by_name(self, obj):
        return obj.requested_by.user.get_full_name()

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.user.get_full_name()
        return None


class RefundSerializer(BaseAuditSerializer):
    product_return_number = serializers.CharField(
        source="product_return.return_number", read_only=True
    )
    refund_method_name = serializers.CharField(
        source="refund_method.name", read_only=True
    )
    processed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = "__all__"

    def get_processed_by_name(self, obj):
        return obj.processed_by.user.get_full_name()


# =============================================================================
# TRANSACTIONS FINANCIÈRES
# =============================================================================


class TransactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    type_transaction_display = serializers.CharField(
        source="get_type_transaction_display", read_only=True
    )

    class Meta:
        model = Transaction
        fields = "__all__"

    def get_user_name(self, obj):
        return obj.user.user.get_full_name()


class MobileMoneySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    caisse_session_info = serializers.CharField(
        source="caisse_session.id", read_only=True
    )

    class Meta:
        model = MobileMoney
        fields = "__all__"

    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.user.get_full_name()
        return None


class UniteSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = Unite
        fields = "__all__"

    def get_employee_name(self, obj):
        if obj.employee:
            return obj.employee.user.get_full_name()
        return None


class WithdrawalCodeSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = WithdrawalCode
        fields = "__all__"

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
    product_name = serializers.CharField(source="product.name", read_only=True)
    variante_name = serializers.CharField(source="variante.name", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = "__all__"

    def get_is_active(self, obj):
        from django.utils import timezone

        now = timezone.now()
        return obj.start_date <= now <= obj.end_date


class CampaignSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    campaign_type_display = serializers.CharField(
        source="get_campaign_type_display", read_only=True
    )
    target_customers_count = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = "__all__"

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
    store_name = serializers.CharField(source="store.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = "__all__"

    def get_approved_by_name(self, obj):
        return obj.approved_by.user.get_full_name()


class AccountingPeriodSerializer(BaseAuditSerializer):
    created_by_name = serializers.SerializerMethodField()
    closed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AccountingPeriod
        fields = "__all__"

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None

    def get_closed_by_name(self, obj):
        if obj.closed_by:
            return obj.closed_by.get_full_name()
        return None


class GeneralLedgerSerializer(BaseAuditSerializer):
    period_name = serializers.CharField(source="period.name", read_only=True)
    account_details = serializers.SerializerMethodField()

    class Meta:
        model = GeneralLedger
        fields = "__all__"

    def get_account_details(self, obj):
        return f"{obj.account_number} - {obj.account_name}"


class FinancialReportSerializer(BaseAuditSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    period_name = serializers.CharField(source="period.name", read_only=True)
    report_type_display = serializers.CharField(
        source="get_report_type_display", read_only=True
    )
    generated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FinancialReport
        fields = "__all__"

    def get_generated_by_name(self, obj):
        return obj.generated_by.get_full_name()


class KPISerializer(serializers.ModelSerializer):
    measurements_count = serializers.SerializerMethodField()

    class Meta:
        model = KPI
        fields = "__all__"

    def get_measurements_count(self, obj):
        return obj.measurements.count()


class KPIMeasurementSerializer(serializers.ModelSerializer):
    kpi_name = serializers.CharField(source="kpi.name", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    achievement_rate = serializers.SerializerMethodField()

    class Meta:
        model = KPIMeasurement
        fields = "__all__"

    def get_achievement_rate(self, obj):
        if obj.kpi.target_value > 0:
            return (obj.value / obj.kpi.target_value) * 100
        return 0


class DashboardSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Dashboard
        fields = "__all__"

    def get_user_name(self, obj):
        return obj.user.get_full_name()


# =============================================================================
# SÉCURITÉ ET MAINTENANCE
# =============================================================================


class SecurityIncidentSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    incident_type_display = serializers.CharField(
        source="get_incident_type_display", read_only=True
    )
    severity_display = serializers.CharField(
        source="get_severity_display", read_only=True
    )
    reported_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SecurityIncident
        fields = "__all__"

    def get_reported_by_name(self, obj):
        return obj.reported_by.user.get_full_name()


class DataBackupSerializer(serializers.ModelSerializer):
    backup_type_display = serializers.CharField(
        source="get_backup_type_display", read_only=True
    )
    file_size_mb = serializers.SerializerMethodField()

    class Meta:
        model = DataBackup
        fields = "__all__"

    def get_file_size_mb(self, obj):
        return round(obj.file_size / (1024 * 1024), 2) if obj.file_size else 0


class MaintenanceTaskSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    task_type_display = serializers.CharField(
        source="get_task_type_display", read_only=True
    )
    assigned_to_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceTask
        fields = "__all__"

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.user.get_full_name()

    def get_is_overdue(self, obj):
        from django.utils import timezone

        return obj.scheduled_date < timezone.now() and obj.status != "completed"


class SupportTicketSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source="store.name", read_only=True)
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = "__all__"

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
        fields = "__all__"

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.user.get_full_name()
        return None
