import secrets
import string
from django.db import models
from django.db.models import JSONField, Index, UniqueConstraint
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
import os

# -----------------------------
# Modèles de base OPTIMISÉS
# -----------------------------

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)
    metadata = JSONField(default=dict, blank=True, null=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']

class AuditModel(BaseModel):
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='%(class)s_created')
    updated_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, related_name='%(class)s_updated')
    
    class Meta:
        abstract = True

# -----------------------------
# Devise et Paramètres
# -----------------------------

class Currency(models.Model):
    code = models.CharField(max_length=3, unique=True, db_index=True)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=5)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        verbose_name = "Devise"
        verbose_name_plural = "Devises"
        ordering = ['code']

# -----------------------------
# Utilisateurs et Authentification OPTIMISÉS
# -----------------------------


class User(AbstractUser):
    email = models.EmailField('email_address',unique=True,blank=True)
    phone = models.CharField(max_length=15, unique=True, db_index=True)
    phone2 = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    date_joined = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['username']
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['date_joined']),
        ]

# -----------------------------
# Profils Utilisateurs OPTIMISÉS
# -----------------------------

class Owner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_index=True,related_name="owner")
    photo = models.ImageField(upload_to='profiles/owners/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = "Propriétaire"
        verbose_name_plural = "Propriétaires"
        ordering = ['user__username']

class Shareholder(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_index=True)
    investment_amount = models.DecimalField("Montant investi", max_digits=12, decimal_places=2, default=0)
    photo = models.ImageField(upload_to='profiles/shareholders/', blank=True, null=True)
    
    class Meta:
        verbose_name = "Actionnaire"
        verbose_name_plural = "Actionnaires"
        ordering = ['user__username']

class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_index=True)
    birth_date = models.DateField("Date de naissance", blank=True, null=True)
    preferences = JSONField("Préférences", blank=True, null=True)
    loyalty_points = models.IntegerField("Points fidélité", default=0, db_index=True)
    total_spent = models.DecimalField("Total dépensé", max_digits=12, decimal_places=2, default=0, db_index=True)
    first_purchase = models.DateTimeField("Premier achat", blank=True, null=True, db_index=True)
    last_purchase = models.DateTimeField("Dernier achat", blank=True, null=True, db_index=True)
    photo = models.ImageField(upload_to='profiles/customers/', blank=True, null=True)
    
    purchase_count = models.IntegerField("Nombre d'achats", default=0, db_index=True)
    average_basket = models.DecimalField("Panier moyen", max_digits=10, decimal_places=2, default=0)

    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ['user__username']
        indexes = [
            models.Index(fields=['loyalty_points']),
            models.Index(fields=['total_spent']),
            models.Index(fields=['last_purchase']),
        ]

# -----------------------------
# Adresses OPTIMISÉES
# -----------------------------

class Address(models.Model):
    address_line1 = models.CharField("Adresse", max_length=255)
    address_line2 = models.CharField("Complément", max_length=255, blank=True, null=True)
    city = models.CharField("Ville", max_length=100, db_index=True)
    state = models.CharField("Région", max_length=100)
    postal_code = models.CharField("Code postal", max_length=20, db_index=True,null=True,blank=True)
    country = models.CharField("Pays", max_length=100, default="Sénégal", db_index=True)
    latitude = models.DecimalField("Latitude", max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField("Longitude", max_digits=9, decimal_places=6, blank=True, null=True)
    
    class Meta:
        verbose_name = "Adresse"
        verbose_name_plural = "Adresses"
        ordering = ['city', 'address_line1']
        indexes = [
            models.Index(fields=['city']),
            models.Index(fields=['postal_code']),
            models.Index(fields=['country']),
        ]

# -----------------------------
# Gestion des Boutiques OPTIMISÉE
# -----------------------------

class StoreType(models.Model):
    name = models.CharField("Nom", max_length=100)
    description = models.TextField("Description", blank=True, null=True)
    
    class Meta:
        verbose_name = "Type de boutique"
        verbose_name_plural = "Types de boutiques"
        ordering = ['name']

class StoreNetwork(models.Model):
    name = models.CharField("Nom du réseau", max_length=255, db_index=True)
    headquarters = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True)
    contact_email = models.EmailField(null=True, blank=True)
    contact_phone = models.CharField(max_length=15, null=True, blank=True)
    
    class Meta:
        verbose_name = "Réseau de boutiques"
        verbose_name_plural = "Réseaux de boutiques"
        ordering = ['name']

class Store(models.Model):
    name = models.CharField("Nom boutique", max_length=255, db_index=True)
    slug = models.SlugField(unique=True, db_index=True)
    store_type = models.ForeignKey(StoreType, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    network = models.ForeignKey(StoreNetwork, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    address = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    phone = models.CharField("Téléphone", max_length=15, null=True, blank=True,unique=True)
    email = models.EmailField("Email", blank=True, null=True,unique=True)
    opening_hours = JSONField("Heures d'ouverture", default=dict)
    is_active = models.BooleanField("Active", default=True, db_index=True)
    logo = models.ImageField(upload_to='store/logos/', blank=True, null=True)
    banner = models.ImageField(upload_to='store/banners/', blank=True, null=True)
    slogan = models.TextField("Slogan", blank=True)
    configuration = JSONField("Paramètres Boutique", default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    owners = models.ManyToManyField(Owner, through='StoreOwnership')
    
    class Meta:
        verbose_name = "Boutique"
        verbose_name_plural = "Boutiques"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at','updated_at']),
            models.Index(fields=['store_type', 'is_active']),
        ]

class StoreOwnership(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    owner = models.ForeignKey(Owner, on_delete=models.CASCADE, db_index=True)
    is_primary = models.BooleanField("Propriétaire principal", default=False)
    ownership_percentage = models.FloatField(
        "Pourcentage propriété", 
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    class Meta:
        unique_together = ('store', 'owner')
        verbose_name = "Propriété boutique"
        verbose_name_plural = "Propriétés boutiques"
        ordering = ['store__name', 'owner__user__username']

class StoreShareholder(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    shareholder = models.ForeignKey(Shareholder, on_delete=models.CASCADE, db_index=True)
    shares_percentage = models.FloatField(
        "Pourcentage parts",
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    investment_date = models.DateField("Date d'investissement", db_index=True)
    
    class Meta:
        unique_together = ('store', 'shareholder')
        verbose_name = "Part actionnaire"
        verbose_name_plural = "Parts actionnaires"
        ordering = ['store__name', 'shareholder__user__username']

class StorePermission(models.Model):
    """Permissions spécifiques par boutique pour les employés"""
    
    class PermissionType(models.TextChoices):
        MANAGER = 'manager', 'Gérant'
        CASHIER = 'cashier', 'Caissier'
        STOCK_MANAGER = 'stock_manager', 'Responsable stock'
        VIEWER = 'viewer', 'Consultant'
    
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='store_permissions')
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    permission_type = models.CharField(
        max_length=20,
        choices=PermissionType.choices,
        default=PermissionType.VIEWER
    )
    can_manage_employees = models.BooleanField(default=False)
    can_manage_products = models.BooleanField(default=False)
    can_manage_sales = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=False)
    valid_from = models.DateField(default=timezone.now)
    valid_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('employee', 'store')
        verbose_name = "Permission boutique"
        verbose_name_plural = "Permissions boutiques"
    
    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.store.name} ({self.permission_type})"

class Department(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='departments', db_index=True)
    name = models.CharField("Nom du rayon", max_length=100, db_index=True)
    manager = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='managed_departments'
    )
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Rayon"
        verbose_name_plural = "Rayons"
        ordering = ['name']
        indexes = [
            models.Index(fields=['store']),
            models.Index(fields=['name']),
            models.Index(fields=['store', 'name']),
        ]


# =================
# Gestion des Boutiques et Appareils pour utilisation de QR Codes
# =================

class StoreDevice(models.Model):
    """
    Modèle pour gérer les appareils connectés à une boutique
    (Tablettes, caisses enregistreuses, smartphones du personnel)
    """
    
    class DeviceType(models.TextChoices):
        CASH_REGISTER = 'CAISSE', 'Caisse enregistreuse'
        TABLET = 'TABLETTE', 'Tablette'
        MOBILE = 'MOBILE', 'Mobile personnel'
        KIOSK = 'KIOSK', 'Kiosk client'
        OTHER = 'AUTRE', 'Autre appareil'
    
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='devices')
    device_id = models.CharField("ID Appareil", max_length=100, unique=True, db_index=True)
    device_name = models.CharField("Nom de l'appareil", max_length=100)
    device_type = models.CharField("Type", max_length=20, choices=DeviceType.choices, default=DeviceType.TABLET)
    
    # Authentification par QR code
    pairing_code = models.CharField("Code d'appairage", max_length=25, unique=True, db_index=True, blank=True)
    qr_code_token = models.CharField("Token QR Code", max_length=64, unique=True, db_index=True, null=True, blank=True)
    pairing_expires_at = models.DateTimeField("Expiration du code", null=True, blank=True)
    paired_at = models.DateTimeField("Appairé le", null=True, blank=True)
    
    # Informations de session
    last_login = models.DateTimeField("Dernière connexion", null=True, blank=True)
    current_session = models.CharField("Session actuelle", max_length=100, null=True, blank=True)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    # Appareil info
    device_model = models.CharField("Modèle", max_length=100, blank=True)
    os_version = models.CharField("Version OS", max_length=50, blank=True)
    app_version = models.CharField("Version App", max_length=50, blank=True)
    
    # Permissions spécifiques à l'appareil
    permissions = JSONField("Permissions", default=dict)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Appareil boutique"
        verbose_name_plural = "Appareils boutique"
        ordering = ['store__name', '-last_login']
        indexes = [
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['pairing_code']),
            models.Index(fields=['qr_code_token']),
            models.Index(fields=['pairing_expires_at']),
        ]
    
    def __str__(self):
        return f"{self.device_name} - {self.store.name}"
    
    def generate_pairing_code(self):
        """Génère un code d'appairage lisible"""
        # Format: ABC-DEF-GHI (plus facile à saisir)
        alphabet = string.ascii_uppercase + string.digits
        code = '-'.join([
            ''.join(secrets.choice(alphabet) for _ in range(3)),
            ''.join(secrets.choice(alphabet) for _ in range(3)),
            ''.join(secrets.choice(alphabet) for _ in range(3))
        ])
        
        self.pairing_code = code
        self.qr_code_token = secrets.token_urlsafe(32)
        self.pairing_expires_at = timezone.now() + timezone.timedelta(minutes=15)
        self.paired_at = None
        self.save()
        
        return {
            'code': self.pairing_code,
            'token': self.qr_code_token,
            'expires_at': self.pairing_expires_at,
            'qr_data': f"storepair:{self.store.id}:{self.qr_code_token}"
        }
    
    def verify_pairing(self, token):
        """Vérifie si le token est valide pour l'appairage"""
        if (self.qr_code_token == token and 
            self.pairing_expires_at and 
            timezone.now() < self.pairing_expires_at):
            
            self.paired_at = timezone.now()
            self.pairing_expires_at = None
            self.save()
            return True
        return False

class StoreSession(models.Model):
    """
    Sessions actives pour les appareils connectés
    """
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='sessions')
    device = models.ForeignKey(StoreDevice, on_delete=models.CASCADE, related_name='sessions')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    session_token = models.CharField("Token session", max_length=64, unique=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    is_active = models.BooleanField("Session active", default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    last_activity = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        verbose_name = "Session boutique"
        verbose_name_plural = "Sessions boutique"
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['device', 'is_active']),
            models.Index(fields=['expires_at', 'is_active']),
        ]

class StoreQRCode(models.Model):
    """
    Modèle pour les QR codes spécifiques aux boutiques
    (Pour paiement, accès rapide, etc.)
    """
    class QRCodeType(models.TextChoices):
        PAYMENT = 'PAIEMENT', 'QR Code de paiement'
        CONNECTION = 'CONNEXION', 'QR Code de connexion'
        PROMOTION = 'PROMOTION', 'QR Code promotionnel'
        MENU = 'MENU', 'QR Code menu digital'
        DELIVERY = 'LIVRAISON', 'QR Code livraison'
    
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='qrcodes')
    name = models.CharField("Nom du QR Code", max_length=100)
    qr_type = models.CharField("Type", max_length=20, choices=QRCodeType.choices, default=QRCodeType.PAYMENT)
    
    # Données encodées
    qr_data = models.TextField("Données QR")
    qr_token = models.CharField("Token QR", max_length=64, unique=True, db_index=True)
    
    # Pour les paiements
    amount = models.DecimalField("Montant fixe", max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField("Devise", max_length=3, default='XOF')
    
    # Usage tracking
    scan_count = models.PositiveIntegerField("Nombre de scans", default=0)
    last_scan = models.DateTimeField("Dernier scan", null=True, blank=True)
    
    # Expiration
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    valid_from = models.DateTimeField("Valide du", auto_now_add=True)
    valid_until = models.DateTimeField("Valide jusqu'au", null=True, blank=True, db_index=True)
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = "QR Code boutique"
        verbose_name_plural = "QR Codes boutique"
        ordering = ['store__name', '-created_at']
        indexes = [
            models.Index(fields=['store', 'qr_type', 'is_active']),
            models.Index(fields=['qr_token']),
            models.Index(fields=['valid_until', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.store.name}"
    
    def generate_payment_qr(self, amount=None):
        """Génère un QR code pour paiement"""
        self.qr_token = secrets.token_urlsafe(32)
        
        if amount:
            self.amount = amount
        
        # Format: storepay://{store_id}/{token}?amount={amount}
        self.qr_data = f"storepay://{self.store.id}/{self.qr_token}"
        
        if self.amount:
            self.qr_data += f"?amount={self.amount}&currency={self.currency}"
        
        self.save()
        return self.qr_data

# -----------------------------
# Employés et Rôles OPTIMISÉS
# -----------------------------

class EmployeeRole(models.Model):
    code = models.CharField("Code", max_length=20, unique=True, db_index=True)
    name = models.CharField("Nom", max_length=100)
    permissions = JSONField("Permissions", default=dict)
    description = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Rôle employé"
        verbose_name_plural = "Rôles employés"
        ordering = ['name']

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_index=True,related_name="employee")
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    role = models.ForeignKey(EmployeeRole, on_delete=models.PROTECT, db_index=True)
    hire_date = models.DateField("Date d'embauche", db_index=True)
    salary = models.DecimalField("Salaire", max_digits=10, decimal_places=2, blank=True, null=True)
    emergency_contact = models.CharField("Contact urgence", max_length=15, blank=True, null=True)
    photo = models.ImageField(upload_to='profiles/employees/', blank=True, null=True)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    user_email = models.EmailField(blank=True)
    user_phone = models.CharField(max_length=15, blank=True)
    full_name = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "Employé"
        verbose_name_plural = "Employés"
        ordering = ['user__username']
        constraints = [
            models.UniqueConstraint(fields=['user', 'store'], name='unique_employee_store')
        ]
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['hire_date']),
        ]

    def save(self, *args, **kwargs):
        if self.user:
            if not self.user_email:
                self.user_email = self.user.email
            if not self.user_phone:
                self.user_phone = self.user.phone
            if not self.full_name:
                self.full_name = self.user.get_full_name()
        super().save(*args, **kwargs)

# -----------------------------
# Sessions et Journalisation OPTIMISÉES
# -----------------------------

class Session(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    device_info = JSONField("Info appareil", blank=True, null=True)
    login_time = models.DateTimeField("Connexion", db_index=True)
    logout_time = models.DateTimeField("Déconnexion", blank=True, null=True, db_index=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Session"
        verbose_name_plural = "Sessions"
        ordering = ['-login_time']
        indexes = [
            models.Index(fields=['login_time']),
            models.Index(fields=['logout_time']),
            models.Index(fields=['user', 'login_time']),
        ]

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    session = models.ForeignKey(Session, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    action = models.CharField("Action", max_length=255, db_index=True)
    model_name = models.CharField("Modèle", max_length=100, blank=True, null=True, db_index=True)
    object_id = models.CharField("ID objet", max_length=100, blank=True, null=True)
    details = JSONField("Détails", blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        verbose_name = "Journal activité"
        verbose_name_plural = "Journal activités"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['model_name']),
        ]

class SousService(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='sous_services', db_index=True)
    nom_du_service = models.CharField("Nom du service", max_length=255, db_index=True)
    start_service = models.DateTimeField("Début du service", auto_now_add=True, db_index=True)
    end_service = models.DateTimeField("Fin du service", null=True, blank=True, db_index=True)

    class Meta:
        verbose_name = "Sous-service"
        verbose_name_plural = "Sous-services"
        ordering = ['-start_service']
        indexes = [
            models.Index(fields=['start_service']),
            models.Index(fields=['end_service']),
        ]

# -----------------------------
# Cartes et Fidélisation OPTIMISÉES
# -----------------------------

class TypeCard(models.Model):
    name = models.CharField("Nom du type", max_length=100, unique=True, db_index=True)
    description = models.TextField("Description", null=True, blank=True)
    created_at = models.DateTimeField("Créé le", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField("Mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "Type de carte"
        verbose_name_plural = "Types de cartes"
        ordering = ['name']

class Card(models.Model):
    num_card = models.CharField("Numéro de carte", max_length=20, unique=True, db_index=True)
    type_card = models.ForeignKey(TypeCard, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    client = models.ForeignKey(Customer, on_delete=models.PROTECT, null=True, blank=True, related_name='cards', db_index=True)
    solde = models.DecimalField("Solde", max_digits=12, decimal_places=2, default=0, db_index=True)
    max_credit = models.DecimalField("Crédit max", max_digits=12, decimal_places=2, default=0)
    plafond = models.DecimalField("Plafond", max_digits=12, decimal_places=2, default=5000)
    remise = models.FloatField("Remise", default=0)
    statut = models.CharField("Statut", max_length=150, default='actif', db_index=True)

    class Meta:
        verbose_name = "Carte"
        verbose_name_plural = "Cartes"
        ordering = ['num_card']
        indexes = [
            models.Index(fields=['client']),
            models.Index(fields=['solde']),
            models.Index(fields=['statut']),
        ]

class CardTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('depot', 'Dépôt'),
        ('achat', 'Achat'),
        ('retrait', 'Retrait'),
        ('credit', 'Crédit'),
    )
    card = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='transactions', db_index=True)
    type_transaction = models.CharField("Type", max_length=10, choices=TRANSACTION_TYPES, db_index=True)
    montant = models.DecimalField("Montant", max_digits=12, decimal_places=2)
    date_transaction = models.DateTimeField("Date", default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "Transaction de carte"
        verbose_name_plural = "Transactions de cartes"
        ordering = ['-date_transaction']
        indexes = [
            models.Index(fields=['date_transaction']),
            models.Index(fields=['type_transaction']),
            models.Index(fields=['card', 'date_transaction']),
        ]

class LoyaltyProgram(models.Model):
    name = models.CharField("Nom programme", max_length=255, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='loyalty_programs', db_index=True)
    points_per_amount = models.FloatField("Points par montant dépensé", default=1)
    minimum_purchase = models.DecimalField("Achat minimum", max_digits=8, decimal_places=2, default=0)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    class Meta:
        verbose_name = "Programme de fidélité"
        verbose_name_plural = "Programmes de fidélité"
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['store', 'is_active']),
        ]

class LoyaltyReward(models.Model):
    program = models.ForeignKey(LoyaltyProgram, on_delete=models.CASCADE, related_name='rewards', db_index=True)
    name = models.CharField("Nom récompense", max_length=255, db_index=True)
    points_required = models.IntegerField("Points requis", db_index=True)
    discount_amount = models.DecimalField("Montant remise", max_digits=8, decimal_places=2, null=True, blank=True)
    discount_percentage = models.FloatField("Pourcentage remise", null=True, blank=True)
    free_product = models.ForeignKey('Product', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "Récompense fidélité"
        verbose_name_plural = "Récompenses fidélité"
        ordering = ['points_required']

# -----------------------------
# Fournisseurs & Approvisionnements OPTIMISÉS
# -----------------------------

class Supplier(models.Model):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='suppliers', db_index=True)
    name = models.CharField("Nom", max_length=255, db_index=True)
    num_supplier = models.CharField("Téléphone", max_length=15, null=True, blank=True)
    email = models.EmailField("Email", null=True, blank=True)
    emplacement = models.CharField("Emplacement", max_length=255, null=True, blank=True)
    contact_person = models.CharField("Personne contact", max_length=255, blank=True)
    payment_terms = models.TextField("Conditions paiement", blank=True)

    class Meta:
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['store', 'name']),
        ]

class Supply(models.Model):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='supplies', db_index=True)
    ref_supply = models.CharField("Référence", max_length=255, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='supplies', db_index=True)
    total_command = models.DecimalField("Total commande", max_digits=12, decimal_places=2)
    utilisateur = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='supplies', db_index=True)
    date_supply = models.DateTimeField("Date", auto_now_add=True, db_index=True)
    status = models.CharField("Statut", max_length=20, default='pending', choices=[
        ('pending', 'En attente'),
        ('received', 'Reçu'),
        ('cancelled', 'Annulé')
    ], db_index=True)

    class Meta:
        verbose_name = "Approvisionnement"
        verbose_name_plural = "Approvisionnements"
        ordering = ['-date_supply']
        indexes = [
            models.Index(fields=['date_supply']),
            models.Index(fields=['status']),
            models.Index(fields=['supplier']),
            models.Index(fields=['store', 'date_supply']),
        ]

class RetailSupply(models.Model):
    ref = models.IntegerField("Référence externe")
    name_product = models.CharField("Nom produit", max_length=255, db_index=True)
    qt_add = models.IntegerField("Quantité ajoutée")
    total_pdx = models.IntegerField("Total produit après ajout")
    supply = models.ForeignKey(Supply, on_delete=models.CASCADE, related_name='retail_items', db_index=True)

    class Meta:
        verbose_name = "Détail approvisionnement"
        verbose_name_plural = "Détails approvisionnements"
        ordering = ['supply', 'name_product']
        indexes = [
            models.Index(fields=['name_product']),
        ]

# -----------------------------
# Produits, Catégories et Marques OPTIMISÉS
# -----------------------------

class ProductCategory(models.Model):
    name = models.CharField("Nom", max_length=150, db_index=True,unique=True)
    slug = models.SlugField("Slug", unique=True, db_index=True)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='children',
        verbose_name="Catégorie parente"
    )
    description = models.TextField("Description", blank=True)
    image = models.ImageField("Image", upload_to='categories/', blank=True, null=True)
    sort_order = models.IntegerField("Ordre d'affichage", default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Catégorie produit"
        verbose_name_plural = "Catégories produits"
        ordering = ['sort_order', 'name']
        indexes = [
            models.Index(fields=['slug', 'is_active']),
            models.Index(fields=['parent', 'sort_order']),
            models.Index(fields=['name']),
            models.Index(fields=['sort_order']),
        ]

class ProductBrand(models.Model):
    name = models.CharField("Nom", max_length=100, unique=True, db_index=True)
    logo = models.ImageField("Logo", upload_to='brands/', blank=True, null=True)
    description = models.TextField("Description", blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Marque"
        verbose_name_plural = "Marques"
        ordering = ['name']

class Product(models.Model):
    SKU_PREFIX = "PROD"
    
    group = models.ForeignKey(
        ProductCategory, 
        on_delete=models.PROTECT, 
        related_name='products_as_group',
        verbose_name="Group",
        db_index=True,
        null=True,
        blank=True
    )
    brand = models.ForeignKey(
        ProductBrand, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Marque",
        db_index=True
    )
    name = models.CharField("Nom", max_length=255, db_index=True)
    sku = models.CharField("SKU", max_length=50, unique=True, blank=True, db_index=True)
    description = models.TextField("Description", blank=True)
    photo = models.ImageField("Photo principale", upload_to='products/main/', blank=True, null=True)
    additional_images = JSONField("Images supplémentaires", default=list, blank=True)
    search_vector = models.TextField(blank=True)
    product_type = models.ForeignKey(
        ProductCategory, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products_as_type')
    nombre_item = models.IntegerField('nombre_item',default=1)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    STATUS_CHOICES = [
    ('draft', 'Brouillon'),
    ('active', 'Actif'),
    ('archived', 'Archivé'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['name']),
            models.Index(fields=['group']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        if not self.sku and self.group:
            # Générer un code à partir du nom du groupe (2 lettres)
            group_name = self.group.name
            # Exemple: "Frais libre service" -> "FL"
            words = group_name.split()
            if len(words) >= 2:
                code = words[0][0].upper() + words[1][0].upper()
            else:
                code = words[0][:2].upper()
            
            # Compter les produits existants dans ce groupe
            count = Product.objects.filter(group=self.group).count()
            # Le nouveau produit aura le numéro count+1
            self.sku = f"{code}-{count+1:05d}"
        elif not self.sku:
            last_product = Product.objects.order_by('-id').first()
            next_id = (last_product.id + 1) if last_product else 1
            self.sku = f"{self.SKU_PREFIX}{next_id:06d}"
        
        self.search_vector = f"{self.name} {self.sku} {self.description}"
        super().save(*args, **kwargs)

class ProductVariant(AuditModel):
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='variants',
        verbose_name="Produit",
        db_index=True
    )
    
    barcode = models.CharField("Code barre", max_length=100, unique=True, db_index=True)
    name = models.CharField("Nom variante", max_length=255, db_index=True)
        
    photo = models.ImageField("Photo", upload_to='products/variants/', null=True, blank=True)
    
    class Meta:
        verbose_name = "Variante"
        verbose_name_plural = "Variantes"
        ordering = ['product__name', 'name']
        indexes = [
            models.Index(fields=['barcode']),
            models.Index(fields=['product']),
            models.Index(fields=['name']),
        ]

# -----------------------------
# Liaison stores et produits avec prix spécifiques OPTIMISÉE
# -----------------------------

class StoreProduct(AuditModel):
    store = models.ForeignKey(
        Store, 
        on_delete=models.CASCADE, 
        related_name='store_products',
        verbose_name="Boutique",
        db_index=True
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='in_stores',
        verbose_name="Produit",
        db_index=True
    )
    supplier = models.ForeignKey(
        Supplier, 
        on_delete=models.PROTECT, 
        related_name='products',
        verbose_name="Fournisseur",
        db_index=True,
        null= True,
        blank=True
    )
    store_cost_price = models.DecimalField(
        "Prix d'achat boutique", 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    store_base_price = models.DecimalField(
        "Prix de vente boutique", 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    store_compare_at_price = models.DecimalField(
        "Prix vente 2 boutique", 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    qt_item = models.DecimalField(
        "Quantité item", 
        max_digits=10, 
        decimal_places=2, 
        default=1
    )
    dlv = models.DateField("Date limite vente", null=True, blank=True)
    dlc = models.DateField("Date limite consommation", null=True, blank=True)
    dcr = models.DateField("Date création/entrée", null=True, blank=True)
    
    is_active = models.BooleanField("Actif dans la boutique", default=True, db_index=True)
    display_order = models.IntegerField("Ordre d'affichage", default=0)
    
    min_stock_threshold = models.IntegerField("Seuil alerte boutique", null=True, blank=True)
    reorder_quantity = models.IntegerField("Quantité réappro boutique", null=True, blank=True)
    jour_ecart = models.IntegerField("Jours écart", default=15)
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=[
            ('draft', 'Brouillon'),
            ('active', 'Actif'),
            ('archived', 'Archivé'),
        ],
        default='draft',
        db_index=True
    )
    class Meta:
        verbose_name = "Produit en boutique"
        verbose_name_plural = "Produits en boutiques"
        ordering = ['store__name', 'product__name']
        unique_together = ['store', 'product']
        indexes = [
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['product', 'store']),
            models.Index(fields=['is_active', 'display_order']),
        ]

    def get_effective_cost_price(self):
        return self.store_cost_price or self.product.cost_price

    def get_effective_base_price(self):
        return self.store_base_price or self.product.base_price

    def get_effective_compare_price(self):
        return self.store_compare_at_price or self.product.compare_at_price

    def get_margin(self):
        cost = self.get_effective_cost_price()
        price = self.get_effective_base_price()
        if cost and price and cost > 0:
            return ((price - cost) / cost) * 100
        return 0

    def is_promotion_active(self):
        if self.store_compare_at_price and self.store_base_price:
            return self.store_compare_at_price > self.store_base_price
        return False

class StoreProductVariant(AuditModel):
    store_product = models.ForeignKey(
        StoreProduct, 
        on_delete=models.CASCADE, 
        related_name='store_variants',
        verbose_name="Produit boutique",
        db_index=True
    )
    variant = models.ForeignKey(
        ProductVariant, 
        on_delete=models.CASCADE, 
        related_name='store_prices',
        verbose_name="Variante",
        db_index=True
    )
    
    store_variant_cost = models.DecimalField(
        "Coût variante boutique", 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    store_variant_price = models.DecimalField(
        "Prix variante boutique", 
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    prix_reduction = models.DecimalField("Prix réduit", max_digits=10, decimal_places=2, blank=True, null=True)
    quantity = models.DecimalField("Quantité", max_digits=10, decimal_places=2)
    weight = models.DecimalField(
        "Poids (kg)", 
        max_digits=8, 
        decimal_places=3, 
        blank=True, 
        null=True
    )
    
    selection = models.BooleanField("Sélectionnée", default=False, db_index=True)
    
    class Meta:
        verbose_name = "Prix variante boutique"
        verbose_name_plural = "Prix variantes boutiques"
        ordering = ['store_product__store__name', 'variant__name']
        unique_together = ['store_product', 'variant']
        indexes = [
            models.Index(fields=['store_product', 'variant']),
        ]

    def get_effective_cost(self):
        return (
            self.store_variant_cost or
            self.store_product.store_cost_price or
            self.variant.cost_price or
            self.store_product.product.cost_price
        )

    def get_effective_price(self):
        return (
            self.store_variant_price or
            self.store_product.store_base_price or
            self.variant.prix_vente or
            self.store_product.product.base_price
        )        

# -----------------------------
# Gestion des Stocks Avancée OPTIMISÉE
# -----------------------------

class Warehouse(models.Model):
    name = models.CharField("Nom entrepôt", max_length=255, db_index=True)
    address = models.ForeignKey(Address, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='warehouses', db_index=True)
    capacity = models.DecimalField("Capacité (m³)", max_digits=10, decimal_places=2)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    class Meta:
        verbose_name = "Entrepôt"
        verbose_name_plural = "Entrepôts"
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['store', 'is_active']),
        ]

class Batch(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='batches', db_index=True)
    batch_number = models.CharField("Numéro de lot", max_length=100, db_index=True)
    manufacturing_date = models.DateField("Date de fabrication", db_index=True)
    expiry_date = models.DateField("Date d'expiration", db_index=True)
    quantity_received = models.IntegerField("Quantité reçue")
    quantity_remaining = models.IntegerField("Quantité restante")
    
    class Meta:
        verbose_name = "Lot"
        verbose_name_plural = "Lots"
        ordering = ['-manufacturing_date']
        unique_together = ['product', 'batch_number']
        indexes = [
            models.Index(fields=['expiry_date']),
            models.Index(fields=['batch_number']),
            models.Index(fields=['manufacturing_date']),
        ]

class Stock(AuditModel):
    product = models.ForeignKey(
        Product, 
        on_delete=models.CASCADE, 
        related_name='stocks',
        verbose_name="Produit",
        db_index=True
    )
    store = models.ForeignKey(
        Store, 
        on_delete=models.CASCADE, 
        related_name='stocks',
        verbose_name="Boutique",
        db_index=True
    )
    warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    
    quantity_package = models.IntegerField("Quantité en paquet", default=0)
    quantity_on_hand = models.IntegerField("Quantité en stock", default=0)
    quantity_reserved = models.IntegerField("Quantité réservée", default=0)
    quantity_available = models.IntegerField("Quantité disponible", default=0, db_index=True)
    
    ideal_stock_level = models.IntegerField("Niveau idéal", default=10)
    min_stock_threshold = models.IntegerField("Seuil minimum", default=2)
    qt_moy_appro = models.DecimalField(
        "Quantité moyenne réappro", 
        max_digits=10, 
        decimal_places=2, 
        default=1
    )
    
    stock_turnover_rate = models.FloatField("Taux de rotation", default=0)
    last_restocked = models.DateTimeField("Dernier réappro", null=True, blank=True, db_index=True)
    
    stock_status = models.CharField(
        max_length=20,
        choices=[
            ('in_stock', 'En stock'),
            ('low_stock', 'Stock faible'), 
            ('out_of_stock', 'Rupture'),
            ('over_stock', 'Surstock')
        ],
        default='in_stock',
        db_index=True
    )
    
    class Meta:
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"
        ordering = ['product__name']
        unique_together = ['product', 'store']
        indexes = [
            models.Index(fields=['store', 'product']),
            models.Index(fields=['quantity_available']),
            models.Index(fields=['store', 'quantity_available']),
            models.Index(fields=['stock_status']),
            models.Index(fields=['last_restocked']),
            models.Index(fields=['product', 'store', 'quantity_available']),
        ]

    def calculate_available(self):
        self.quantity_available = max(0, self.quantity_on_hand - self.quantity_reserved)
        return self.quantity_available

    def save(self, *args, **kwargs):
        self.calculate_available()
        
        if self.quantity_available == 0:
            self.stock_status = 'out_of_stock'
        elif self.quantity_available <= self.min_stock_threshold:
            self.stock_status = 'low_stock' 
        elif self.quantity_available > (self.ideal_stock_level * 2):
            self.stock_status = 'over_stock'
        else:
            self.stock_status = 'in_stock'
            
        super().save(*args, **kwargs)

    def is_low_stock(self):
        return self.stock_status == 'low_stock'

    def needs_restock(self):
        return self.stock_status in ['low_stock', 'out_of_stock']

class ReorderRule(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reorder_rules', db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    min_quantity = models.IntegerField("Quantité minimum")
    max_quantity = models.IntegerField("Quantité maximum")
    reorder_quantity = models.IntegerField("Quantité de réappro")
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    class Meta:
        verbose_name = "Règle de réapprovisionnement"
        verbose_name_plural = "Règles de réapprovisionnement"
        ordering = ['product__name']
        unique_together = ['product', 'store']
        indexes = [
            models.Index(fields=['is_active']),
        ]

class StockMovement(AuditModel):
    MOVEMENT_TYPES = [
        ('inbound', 'Entrée'),
        ('outbound', 'Sortie'),
        ('adjustment', 'Ajustement'),
        ('transfer', 'Transfert'),
        ('return', 'Retour'),
        ('loss', 'Perte'),
    ]
    
    reference = models.CharField("Référence", max_length=100, unique=True, db_index=True)
    store = models.ForeignKey(
        Store, 
        on_delete=models.CASCADE, 
        related_name='stock_movements',
        verbose_name="Boutique",
        db_index=True
    )
    movement_type = models.CharField("Type", max_length=20, choices=MOVEMENT_TYPES, db_index=True)
    
    related_object_type = models.CharField("Type objet lié", max_length=50, blank=True)
    related_object_id = models.CharField("ID objet lié", max_length=100, blank=True)
    
    movement_date = models.DateTimeField("Date mouvement", default=timezone.now, db_index=True)
    notes = models.TextField("Notes", blank=True)
    
    total_items = models.IntegerField("Total articles", default=0)
    total_value = models.DecimalField("Valeur totale", max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        verbose_name = "Mouvement de stock"
        verbose_name_plural = "Mouvements de stock"
        ordering = ['-movement_date']
        indexes = [
            models.Index(fields=['movement_date']),
            models.Index(fields=['store', 'movement_type']),
            models.Index(fields=['related_object_type', 'related_object_id']),
        ]

class StockMovementItem(AuditModel):
    movement = models.ForeignKey(
        StockMovement, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name="Mouvement",
        db_index=True
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.PROTECT, 
        related_name='movement_items',
        verbose_name="Produit",
        db_index=True
    )
    variant = models.ForeignKey(
        ProductVariant, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True,
        verbose_name="Variante"
    )
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True)
    
    quantity_before = models.IntegerField("Quantité avant")
    quantity_after = models.IntegerField("Quantité après")
    quantity_change = models.IntegerField("Variation quantité")
    
    unit_cost = models.DecimalField("Coût unitaire", max_digits=10, decimal_places=2)
    total_value = models.DecimalField("Valeur totale", max_digits=12, decimal_places=2)
    
    batch_number = models.CharField("Numéro de lot", max_length=100, blank=True)
    expiry_date = models.DateField("Date expiration", null=True, blank=True)
    
    class Meta:
        verbose_name = "Ligne mouvement stock"
        verbose_name_plural = "Lignes mouvements stock"
        ordering = ['movement', 'product__name']
        indexes = [
            models.Index(fields=['movement', 'product']),
        ]

    def save(self, *args, **kwargs):
        self.quantity_change = self.quantity_after - self.quantity_before
        self.total_value = abs(self.quantity_change) * self.unit_cost
        super().save(*args, **kwargs)

class InventoryCount(AuditModel):
    store = models.ForeignKey(
        Store, 
        on_delete=models.CASCADE, 
        related_name='inventory_counts',
        verbose_name="Boutique",
        db_index=True
    )
    reference = models.CharField("Référence", max_length=100, unique=True, db_index=True)
    count_date = models.DateTimeField("Date inventaire", db_index=True)
    
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=[
            ('planned', 'Planifié'),
            ('in_progress', 'En cours'),
            ('completed', 'Terminé'),
            ('cancelled', 'Annulé')
        ],
        default='planned',
        db_index=True
    )
    
    total_items_counted = models.IntegerField("Total articles comptés", default=0)
    total_discrepancies = models.IntegerField("Total écarts", default=0)
    discrepancy_value = models.DecimalField(
        "Valeur des écarts", 
        max_digits=12, 
        decimal_places=2, 
        default=0
    )
    
    class Meta:
        verbose_name = "Inventaire physique"
        verbose_name_plural = "Inventaires physiques"
        ordering = ['-count_date']
        indexes = [
            models.Index(fields=['store', 'count_date']),
            models.Index(fields=['status']),
        ]

# =============================================================================
# AJOUTEZ CETTE CLASSE MANQUANTE !
# =============================================================================

class InventoryCountItem(AuditModel):
    inventory_count = models.ForeignKey(
        InventoryCount, 
        on_delete=models.CASCADE, 
        related_name='items',
        verbose_name="Inventaire",
        db_index=True
    )
    product = models.ForeignKey(
        Product, 
        on_delete=models.PROTECT, 
        verbose_name="Produit",
        db_index=True
    )
    variant = models.ForeignKey(
        ProductVariant, 
        on_delete=models.PROTECT, 
        null=True, 
        blank=True,
        verbose_name="Variante"
    )
    
    expected_quantity = models.IntegerField("Quantité attendue")
    counted_quantity = models.IntegerField("Quantité comptée")
    discrepancy = models.IntegerField("Écart", default=0)
    
    class Meta:
        verbose_name = "Ligne inventaire physique"
        verbose_name_plural = "Lignes inventaires physiques"
        ordering = ['inventory_count', 'product__name']
        unique_together = ['inventory_count', 'product', 'variant']
        indexes = [
            models.Index(fields=['inventory_count', 'product']),
        ]

    def save(self, *args, **kwargs):
        self.discrepancy = self.counted_quantity - self.expected_quantity
        super().save(*args, **kwargs)

# -----------------------------
# COMMANDES (ORDERS) - NOUVEAUX MODÈLES
# -----------------------------

class Pack(BaseModel): 
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

class PackItem(models.Model):
    pack = models.ForeignKey(Pack, on_delete=models.CASCADE, related_name='items')
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)


class OrderStatus(models.Model):
    """Statuts de commande spécifiques"""
    code = models.CharField("Code", max_length=20, unique=True, db_index=True)
    name = models.CharField("Nom", max_length=100)
    description = models.TextField("Description", blank=True)
    color = models.CharField("Couleur", max_length=20, default='#3498db')
    sort_order = models.IntegerField("Ordre", default=0)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    class Meta:
        verbose_name = "Statut de commande"
        verbose_name_plural = "Statuts de commande"
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class OrderSource(models.Model):
    """Source de la commande (en ligne, téléphone, boutique, etc.)"""
    code = models.CharField("Code", max_length=20, unique=True, db_index=True)
    name = models.CharField("Nom", max_length=100)
    description = models.TextField("Description", blank=True)
    
    class Meta:
        verbose_name = "Source de commande"
        verbose_name_plural = "Sources de commande"
        ordering = ['name']


class Order(AuditModel):
    """
    Modèle pour les commandes (pré-commandes, commandes en ligne, etc.)
    Différent des ventes qui sont les transactions finalisées
    """
    # Identification
    order_number = models.CharField("Numéro commande", max_length=50, unique=True, db_index=True)
    external_reference = models.CharField("Référence externe", max_length=100, blank=True, db_index=True)
    
    # Relations
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='orders', db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders', null=True, blank=True, db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='handled_orders', null=True, blank=True, db_index=True)
    
    # Statut et source
    status = models.ForeignKey(OrderStatus, on_delete=models.PROTECT, related_name='orders', db_index=True)
    source = models.ForeignKey(OrderSource, on_delete=models.PROTECT, related_name='orders', null=True, blank=True, db_index=True)
    
    # Montants
    subtotal = models.DecimalField("Sous-total", max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField("Taxes", max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField("Remise", max_digits=12, decimal_places=2, default=0)
    shipping_amount = models.DecimalField("Frais livraison", max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField("Total", max_digits=12, decimal_places=2, db_index=True)
    
    # Informations client
    customer_name = models.CharField("Nom client", max_length=255, blank=True)
    customer_email = models.EmailField("Email client", blank=True)
    customer_phone = models.CharField("Téléphone client", max_length=20, blank=True)
    
    # Livraison
    shipping_address = models.TextField("Adresse livraison", blank=True)
    shipping_notes = models.TextField("Notes livraison", blank=True)
    expected_delivery_date = models.DateField("Date livraison prévue", null=True, blank=True, db_index=True)
    actual_delivery_date = models.DateTimeField("Date livraison effective", null=True, blank=True, db_index=True)
    
    # Paiement
    payment_method = models.ForeignKey('PaymentMethod', on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    payment_status = models.CharField(
        "Statut paiement",
        max_length=20,
        choices=[
            ('pending', 'En attente'),
            ('partial', 'Partiel'),
            ('paid', 'Payé'),
            ('refunded', 'Remboursé'),
            ('cancelled', 'Annulé')
        ],
        default='pending',
        db_index=True
    )
    
    # Conversion en vente
    converted_to_sale = models.BooleanField("Converti en vente", default=False, db_index=True)
    sale = models.OneToOneField('Sale', on_delete=models.SET_NULL, null=True, blank=True, related_name='original_order', db_index=True)
    conversion_date = models.DateTimeField("Date conversion", null=True, blank=True, db_index=True)
    
    # Métadonnées
    order_date = models.DateTimeField("Date commande", default=timezone.now, db_index=True)
    notes = models.TextField("Notes", blank=True)
    internal_notes = models.TextField("Notes internes", blank=True)
    
    # Champs de suivi
    estimated_preparation_time = models.IntegerField("Temps préparation estimé (min)", default=30)
    preparation_start_time = models.DateTimeField("Début préparation", null=True, blank=True, db_index=True)
    preparation_end_time = models.DateTimeField("Fin préparation", null=True, blank=True, db_index=True)
    
    class Meta:
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"
        ordering = ['-order_date']
        indexes = [
            models.Index(fields=['order_date']),
            models.Index(fields=['store', 'status', 'order_date']),
            models.Index(fields=['customer', 'order_date']),
            models.Index(fields=['status', 'payment_status']),
            models.Index(fields=['expected_delivery_date']),
            models.Index(fields=['converted_to_sale']),
        ]

    def __str__(self):
        return f"Commande {self.order_number}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Générer numéro de commande unique
            prefix = "CMD"
            date_str = timezone.now().strftime('%Y%m%d')
            
            last_order = Order.objects.filter(
                order_number__startswith=f"{prefix}{date_str}"
            ).order_by('-order_number').first()
            
            if last_order:
                last_num = int(last_order.order_number[-4:])
                next_num = last_num + 1
            else:
                next_num = 1
                
            self.order_number = f"{prefix}{date_str}{next_num:04d}"
        
        # Mettre à jour les infos client si un client est lié
        if self.customer and not self.customer_name:
            self.customer_name = self.customer.user.get_full_name()
        if self.customer and not self.customer_email:
            self.customer_email = self.customer.user.email
        if self.customer and not self.customer_phone:
            self.customer_phone = self.customer.user.phone
        
        super().save(*args, **kwargs)
    
    def calculate_totals(self):
        """Calcule les totaux à partir des articles"""
        items = self.items.all()
        self.subtotal = sum(item.line_total for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.discount_amount = sum(item.discount_amount for item in items)
        self.total_amount = self.subtotal + self.shipping_amount - self.discount_amount
        self.save()
    
    def convert_to_sale(self, employee=None):
        """Convertit la commande en vente"""
        if self.converted_to_sale:
            return self.sale
        
        # Créer une vente à partir de la commande
        sale = Sale.objects.create(
            store=self.store,
            customer=self.customer,
            employee=employee or self.employee,
            subtotal=self.subtotal,
            tax_amount=self.tax_amount,
            discount_amount=self.discount_amount,
            total_amount=self.total_amount,
            is_delivery=True if self.shipping_address else False,
            delivery_fee=self.shipping_amount,
            notes=f"Converti depuis commande {self.order_number}",
            sale_date=timezone.now()
        )
        
        # Créer les lignes de vente
        for order_item in self.items.all():
            SaleItem.objects.create(
                sale=sale,
                product=order_item.product,
                variant=order_item.variant,
                quantity=order_item.quantity,
                unit_price=order_item.unit_price,
                discount_rate=order_item.discount_rate,
                tax_rate=order_item.tax_rate
            )
        
        # Mettre à jour la commande
        self.converted_to_sale = True
        self.sale = sale
        self.conversion_date = timezone.now()
        self.save()
        
        # Changer le statut
        if hasattr(self.status, 'code') and self.status.code == 'pending':
            completed_status = OrderStatus.objects.filter(code='completed').first()
            if completed_status:
                self.status = completed_status
                self.save()
        
        return sale


class OrderItem(AuditModel):
    """Articles d'une commande"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', db_index=True)
    pack = models.ForeignKey(Pack, on_delete=models.SET_NULL, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    
    quantity = models.DecimalField("Quantité", max_digits=10, decimal_places=2)
    unit_price = models.DecimalField("Prix unitaire", max_digits=10, decimal_places=2)
    
    discount_rate = models.FloatField("Taux remise", default=0)
    discount_amount = models.DecimalField("Montant remise", max_digits=10, decimal_places=2, default=0)
    
    tax_rate = models.FloatField("Taux taxe", default=0)
    tax_amount = models.DecimalField("Montant taxe", max_digits=10, decimal_places=2, default=0)
    
    line_total = models.DecimalField("Total ligne", max_digits=10, decimal_places=2)
    
    notes = models.TextField("Notes", blank=True)
    
    class Meta:
        verbose_name = "Article de commande"
        verbose_name_plural = "Articles de commande"
        ordering = ['order', 'variant']
        indexes = [
            models.Index(fields=['order', 'variant']),
        ]
    
    def save(self, *args, **kwargs):
        # Calculer les montants
        base_total = self.quantity * self.unit_price
        self.discount_amount = base_total * (self.discount_rate / 100)
        after_discount = base_total - self.discount_amount
        self.tax_amount = after_discount * (self.tax_rate / 100)
        self.line_total = after_discount + self.tax_amount
        
        super().save(*args, **kwargs)
        
        # Recalculer les totaux de la commande
        if self.order:
            self.order.calculate_totals()

# -----------------------------
# Caisses et Sessions de Caisse OPTIMISÉES
# -----------------------------

class CashRegister(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='cash_registers', db_index=True)
    name = models.CharField(max_length=100, db_index=True)
    code = models.SlugField(unique=True, db_index=True)
    location = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cashregisters_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cashregisters_updated')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Caisse"
        verbose_name_plural = "Caisses"
        ordering = ['name']
        indexes = [
            models.Index(fields=['store']),
            models.Index(fields=['is_active']),
        ]

class CashRegisterSession(models.Model):
    cash_register = models.ForeignKey(CashRegister, on_delete=models.CASCADE, related_name='sessions', db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='cash_sessions', db_index=True)
    
    session = models.ForeignKey(Session, on_delete=models.PROTECT, related_name='cash_sessions', db_index=True)
    start_time = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField(null=True, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=[
        ('open', 'Ouverte'),
        ('closed', 'Fermée'),
        ('suspended', 'Suspendue')
    ], default='open', db_index=True)
    
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2)
    expected_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    total_sales = models.IntegerField(default=0)
    total_returns = models.IntegerField(default=0)
    total_transactions = models.IntegerField(default=0)
    
    espece_balance = models.DecimalField("Paiement espèces", max_digits=12, decimal_places=2, default=0)
    wave_balance = models.DecimalField("Wave paiement", max_digits=12, decimal_places=2, default=0)
    om_balance = models.DecimalField("Orange Money", max_digits=12, decimal_places=2, default=0)
    cb_balance = models.DecimalField("Carte bancaire", max_digits=12, decimal_places=2, default=0)
    momo_balance = models.DecimalField("Momo paiement", max_digits=12, decimal_places=2, default=0)
    moovm_balance = models.DecimalField("Moov Money", max_digits=12, decimal_places=2, default=0)
    versement_balance = models.DecimalField("Versement", max_digits=12, decimal_places=2, default=0)
    total_mobile = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sales_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cashsessions_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cashsessions_updated')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Session de caisse"
        verbose_name_plural = "Sessions de caisse"
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['start_time']),
            models.Index(fields=['cash_register', 'status']),
        ]

class CashTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('open', 'Ouverture'),
        ('sale', 'Vente'),
        ('return', 'Retour'),
        ('payment', 'Paiement'),
        ('withdrawal', 'Retrait'),
        ('deposit', 'Dépôt'),
        ('close', 'Fermeture'),
    ]
    
    session = models.ForeignKey(CashRegisterSession, on_delete=models.CASCADE, related_name='transactions', db_index=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    reference = models.CharField(max_length=100, db_index=True)
    
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT, null=True, blank=True)
    
    payment_method = models.ForeignKey('PaymentMethod', on_delete=models.PROTECT, null=True, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    sale = models.ForeignKey('Sale', on_delete=models.SET_NULL, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    
    notes = models.TextField(blank=True)
    transaction_time = models.DateTimeField(default=timezone.now, db_index=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cashtransactions_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cashtransactions_updated')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Transaction caisse"
        verbose_name_plural = "Transactions caisse"
        ordering = ['-transaction_time']
        indexes = [
            models.Index(fields=['transaction_time']),
            models.Index(fields=['session', 'transaction_type']),
        ]

# -----------------------------
# Ventes et Paiements OPTIMISÉS
# -----------------------------

class PaymentMethod(models.Model):
    code = models.CharField("Code", max_length=20, unique=True, db_index=True)
    name = models.CharField("Nom", max_length=100)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    requires_reference = models.BooleanField("Requiert référence", default=False)
    fee_percentage = models.FloatField("Frais (%)", default=0)
    
    class Meta:
        verbose_name = "Méthode de paiement"
        verbose_name_plural = "Méthodes de paiement"
        ordering = ['name']

class SaleStatus(models.Model):
    code = models.CharField("Code", max_length=20, unique=True, db_index=True)
    name = models.CharField("Nom", max_length=100)
    is_terminal = models.BooleanField("Statut final", default=False)
    
    class Meta:
        verbose_name = "Statut vente"
        verbose_name_plural = "Statuts vente"
        ordering = ['name']

class Sale(models.Model):
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='sales', db_index=True)
    ticket_number = models.CharField("Numéro ticket", max_length=50)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases', db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='sales', db_index=True)
    caisse = models.ForeignKey(CashRegister, on_delete=models.PROTECT, related_name='sales', db_index=True)
    cash_session = models.ForeignKey(CashRegisterSession, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    
    subtotal = models.DecimalField("Sous-total", max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField("Montant taxes", max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField("Remise", max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField("Total", max_digits=12, decimal_places=2, db_index=True)
    
    status = models.ForeignKey(SaleStatus, on_delete=models.PROTECT, null=True, blank=True, db_index=True)
    
    is_delivery = models.BooleanField("Livraison", default=False)
    delivery_address = models.ForeignKey('DeliveryAddress', on_delete=models.SET_NULL, null=True, blank=True)
    delivery_fee = models.DecimalField("Frais livraison", max_digits=8, decimal_places=2, default=0)
    
    notes = models.TextField("Notes", blank=True, null=True)
    sale_date = models.DateTimeField("Date vente", default=timezone.now, db_index=True)
    
    # CHAMPS DÉNORMALISÉS POUR PERFORMANCE
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_fully_paid = models.BooleanField(default=False, db_index=True)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=15, blank=True)

    class Meta:
        verbose_name = "Vente"
        verbose_name_plural = "Ventes"
        ordering = ['-sale_date']
        constraints = [
            models.UniqueConstraint(fields=['store', 'ticket_number'], name='unique_ticket_per_store')
        ]
        indexes = [
            models.Index(fields=['sale_date']),
            models.Index(fields=['store', 'sale_date']),
            models.Index(fields=['customer', 'sale_date']),
            models.Index(fields=['store', 'ticket_number']),
            models.Index(fields=['store', 'status', 'sale_date']),
            models.Index(fields=['is_fully_paid']),
            models.Index(fields=['total_amount']),
        ]

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            last_sale = Sale.objects.filter(store=self.store).order_by('-id').first()
            next_num = (last_sale.id + 1) if last_sale else 1
            self.ticket_number = f"{self.store.slug.upper()}-{next_num:08d}"
        
        if self.customer and not self.customer_email:
            self.customer_email = self.customer.user.email
        if self.customer and not self.customer_phone:
            self.customer_phone = self.customer.user.phone
            
        super().save(*args, **kwargs)

    def calculate_totals(self):
        items = self.items.all()
        self.subtotal = sum(item.line_total for item in items)
        self.tax_amount = sum(item.tax_amount for item in items)
        self.discount_amount = sum(item.discount_amount for item in items)
        self.total_amount = self.subtotal + self.delivery_fee - self.discount_amount
        self.save()
    
    def get_total_paid(self):
        return self.total_paid
    
    def get_remaining_amount(self):
        return self.total_amount - self.total_paid
    
    # MÉTHODE RENOMMÉE POUR ÉVITER LE CONFLIT AVEC LE CHAMP
    def check_if_fully_paid(self):
        return self.is_fully_paid

    def clean(self):
        if self.total_amount < 0:
            raise ValidationError("Le montant total ne peut pas être négatif")
        
        if self.discount_amount > self.subtotal:
            raise ValidationError("La remise ne peut pas dépasser le sous-total")

class SalePayment(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments', db_index=True)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, db_index=True)
    amount = models.DecimalField("Montant", max_digits=12, decimal_places=2)
    reference = models.CharField("Référence", max_length=100, blank=True, null=True)
    is_confirmed = models.BooleanField("Confirmé", default=True)
    notes = models.TextField("Notes", blank=True, null=True)
    payment_date = models.DateTimeField("Date paiement", default=timezone.now, db_index=True)
    processed_by = models.ForeignKey(Employee, on_delete=models.PROTECT, db_index=True)
    
    class Meta:
        verbose_name = "Paiement vente"
        verbose_name_plural = "Paiements ventes"
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['payment_date']),
            models.Index(fields=['sale', 'payment_method']),
        ]
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # MET À JOUR CHAMPS DÉNORMALISÉS
        self.sale.total_paid = self.sale.payments.aggregate(total=models.Sum('amount'))['total'] or 0
        self.sale.is_fully_paid = self.sale.total_paid >= self.sale.total_amount
        self.sale.save(update_fields=['total_paid', 'is_fully_paid'])

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items', db_index=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sale_items', db_index=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, blank=True, null=True, db_index=True)
    quantity = models.DecimalField("Quantité", max_digits=10, decimal_places=2)
    unit_price = models.DecimalField("Prix unitaire", max_digits=10, decimal_places=2)
    discount_rate = models.FloatField("Taux remise", default=0)
    discount_amount = models.DecimalField("Montant remise", max_digits=10, decimal_places=2, default=0)
    tax_rate = models.FloatField("Taux taxe", default=0)
    tax_amount = models.DecimalField("Montant taxe", max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField("Total ligne", max_digits=10, decimal_places=2)
    
    class Meta:
        verbose_name = "Ligne vente"
        verbose_name_plural = "Lignes vente"
        ordering = ['sale', 'product__name']
        indexes = [
            models.Index(fields=['sale']),
            models.Index(fields=['product']),
        ]
    
    def save(self, *args, **kwargs):
        base_total = self.quantity * self.unit_price
        self.discount_amount = base_total * (self.discount_rate / 100)
        after_discount = base_total - self.discount_amount
        self.tax_amount = after_discount * (self.tax_rate / 100)
        self.line_total = after_discount + self.tax_amount
        super().save(*args, **kwargs)
        
        self.sale.calculate_totals()

# -----------------------------
# Livraisons OPTIMISÉES
# -----------------------------

class DeliveryAddress(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='delivery_addresses', db_index=True)
    address = models.ForeignKey(Address, on_delete=models.CASCADE, db_index=True)
    title = models.CharField("Titre", max_length=100, db_index=True)
    is_primary = models.BooleanField("Adresse principale", default=False, db_index=True)
    instructions = models.TextField("Instructions livraison", blank=True, null=True)
    
    class Meta:
        verbose_name = "Adresse de livraison"
        verbose_name_plural = "Adresses de livraison"
        ordering = ['-is_primary', 'title']
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['is_primary']),
        ]

    def save(self, *args, **kwargs):
        if self.is_primary:
            DeliveryAddress.objects.filter(customer=self.customer, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)

class DeliveryVehicle(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='vehicles', db_index=True)
    plate_number = models.CharField("Plaque d'immatriculation", max_length=20, unique=True, db_index=True)
    vehicle_type = models.CharField("Type véhicule", max_length=50)
    capacity = models.DecimalField("Capacité (kg)", max_digits=8, decimal_places=2)
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    
    class Meta:
        verbose_name = "Véhicule de livraison"
        verbose_name_plural = "Véhicules de livraison"
        ordering = ['plate_number']
        indexes = [
            models.Index(fields=['store']),
            models.Index(fields=['is_active']),
        ]

class DeliveryRoute(models.Model):
    name = models.CharField("Nom itinéraire", max_length=100, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='routes', db_index=True)
    driver = models.ForeignKey(Employee, on_delete=models.PROTECT, db_index=True)
    vehicle = models.ForeignKey(DeliveryVehicle, on_delete=models.PROTECT, db_index=True)
    estimated_duration = models.DurationField("Durée estimée")
    
    class Meta:
        verbose_name = "Itinéraire de livraison"
        verbose_name_plural = "Itinéraires de livraison"
        ordering = ['name']
        indexes = [
            models.Index(fields=['store']),
            models.Index(fields=['driver']),
        ]

class Delivery(models.Model):
    DELIVERY_STATUS = (
        ('pending', 'En attente'),
        ('preparing', 'En préparation'),
        ('on_way', 'En chemin'),
        ('delivered', 'Livrée'),
        ('cancelled', 'Annulée'),
    )
    
    sale = models.OneToOneField(Sale, on_delete=models.CASCADE, related_name='delivery', db_index=True)
    delivery_address = models.ForeignKey(DeliveryAddress, on_delete=models.PROTECT, db_index=True)
    assigned_driver = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries', db_index=True)
    route = models.ForeignKey(DeliveryRoute, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    status = models.CharField("Statut", max_length=20, choices=DELIVERY_STATUS, default='pending', db_index=True)
    fee = models.DecimalField("Frais livraison", max_digits=8, decimal_places=2, default=0)
    estimated_time = models.DateTimeField("Heure estimée", db_index=True)
    actual_delivery_time = models.DateTimeField("Heure livraison réelle", blank=True, null=True, db_index=True)
    customer_notes = models.TextField("Notes client", blank=True, null=True)
    driver_notes = models.TextField("Notes livreur", blank=True, null=True)
    
    # CHAMPS DÉNORMALISÉS POUR PERFORMANCE
    driver_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    status_changed_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        verbose_name = "Livraison"
        verbose_name_plural = "Livraisons"
        ordering = ['-estimated_time']
        indexes = [
            models.Index(fields=['status', 'estimated_time']),
            models.Index(fields=['assigned_driver', 'status']),
            models.Index(fields=['estimated_time']),
            models.Index(fields=['status_changed_at']),
        ]

    def save(self, *args, **kwargs):
        if self.assigned_driver and not self.driver_name:
            self.driver_name = self.assigned_driver.user.get_full_name()
        
        if self.sale and self.sale.customer and not self.customer_phone:
            self.customer_phone = self.sale.customer.user.phone
            
        super().save(*args, **kwargs)

class DeliverySchedule(models.Model):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='schedules', db_index=True)
    route = models.ForeignKey(DeliveryRoute, on_delete=models.PROTECT, db_index=True)
    scheduled_time = models.DateTimeField("Heure planifiée", db_index=True)
    actual_departure = models.DateTimeField("Départ effectif", null=True, blank=True, db_index=True)
    actual_arrival = models.DateTimeField("Arrivée effective", null=True, blank=True, db_index=True)
    
    class Meta:
        verbose_name = "Planification livraison"
        verbose_name_plural = "Planifications livraison"
        ordering = ['-scheduled_time']
        indexes = [
            models.Index(fields=['delivery']),
            models.Index(fields=['scheduled_time']),
        ]

# -----------------------------
# Retours et Remboursements OPTIMISÉS
# -----------------------------

class ReturnReason(AuditModel):
    code = models.SlugField(unique=True, db_index=True)
    name = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True)
    requires_approval = models.BooleanField(default=False)
    refund_percentage = models.FloatField(default=100, validators=[MinValueValidator(0), MaxValueValidator(100)])
    
    class Meta:
        verbose_name = "Raison de retour"
        verbose_name_plural = "Raisons de retour"
        ordering = ['name']

class ProductReturn(AuditModel):
    RETURN_STATUS = [
        ('requested', 'Demandé'),
        ('approved', 'Approuvé'),
        ('rejected', 'Rejeté'),
        ('received', 'Reçu'),
        ('inspected', 'Inspecté'),
        ('refunded', 'Remboursé'),
        ('exchanged', 'Échangé'),
        ('completed', 'Terminé'),
    ]
    
    return_number = models.CharField(max_length=100, unique=True, db_index=True)
    original_sale = models.ForeignKey(Sale, on_delete=models.PROTECT, related_name='returns', db_index=True)
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='returns', db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='returns', db_index=True)
    
    return_reason = models.ForeignKey(ReturnReason, on_delete=models.PROTECT, db_index=True)
    status = models.CharField(max_length=20, choices=RETURN_STATUS, default='requested', db_index=True)
    return_date = models.DateTimeField(default=timezone.now, db_index=True)
    
    total_refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    restocking_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    requested_by = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='requested_returns', db_index=True)
    approved_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_returns')
    approval_date = models.DateTimeField(null=True, blank=True, db_index=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Retour produit"
        verbose_name_plural = "Retours produits"
        ordering = ['-return_date']
        indexes = [
            models.Index(fields=['return_number']),
            models.Index(fields=['return_date']),
            models.Index(fields=['status']),
            models.Index(fields=['store', 'return_date']),
        ]

class ReturnItem(AuditModel):
    product_return = models.ForeignKey(ProductReturn, on_delete=models.CASCADE, related_name='items', db_index=True)
    sale_item = models.ForeignKey(SaleItem, on_delete=models.PROTECT, related_name='return_items', db_index=True)
    
    quantity_sold = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_returned = models.DecimalField(max_digits=10, decimal_places=2)
    
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    condition = models.CharField(max_length=20, choices=[
        ('new', 'Neuf'),
        ('opened', 'Ouvert'),
        ('damaged', 'Endommagé'),
        ('defective', 'Défectueux')
    ], default='new', db_index=True)
    
    inspection_notes = models.TextField(blank=True)
    is_restockable = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Ligne retour"
        verbose_name_plural = "Lignes retours"
        ordering = ['product_return', 'sale_item__product__name']
        indexes = [
            models.Index(fields=['product_return']),
            models.Index(fields=['condition']),
        ]

class Refund(AuditModel):
    product_return = models.OneToOneField(ProductReturn, on_delete=models.CASCADE, related_name='refund', db_index=True)
    refund_number = models.CharField(max_length=100, unique=True, db_index=True)
    
    refund_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT, db_index=True)
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2)
    refund_date = models.DateTimeField(default=timezone.now, db_index=True)
    
    processed_by = models.ForeignKey(Employee, on_delete=models.PROTECT, db_index=True)
    refund_reference = models.CharField(max_length=100, blank=True)
    
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = "Remboursement"
        verbose_name_plural = "Remboursements"
        ordering = ['-refund_date']
        indexes = [
            models.Index(fields=['refund_date']),
            models.Index(fields=['refund_method']),
        ]

class ReturnedProduct(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='returned_products', db_index=True)
    sell = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='returned_products', db_index=True)
    variant_code = models.CharField("Code variante", max_length=15, db_index=True)
    quantity = models.IntegerField("Quantité")
    reason = models.CharField("Raison", max_length=255)
    refund_amount = models.DecimalField("Montant remboursé", max_digits=12, decimal_places=2)
    return_date = models.DateTimeField("Date de retour", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Produit retourné"
        verbose_name_plural = "Produits retournés"
        ordering = ['-return_date']
        indexes = [
            models.Index(fields=['return_date']),
            models.Index(fields=['employee']),
        ]

# -----------------------------
# Transactions Financières OPTIMISÉES
# -----------------------------

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('vente', 'Vente'),
        ('depot', 'Dépôt'),
        ('retrait', 'Retrait'),
        ('remboursement', 'Remboursement'),
        ('frais', 'Frais'),
    )
    user = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='transactions', db_index=True)
    amount = models.DecimalField("Montant", max_digits=12, decimal_places=2)
    type_transaction = models.CharField("Type", max_length=100, choices=TRANSACTION_TYPES, db_index=True)
    description = models.CharField("Description", max_length=255, null=True, blank=True)
    payment_method = models.CharField("Moyen paiement", max_length=200, null=True, blank=True)
    date_transaction = models.DateTimeField("Date", default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ['-date_transaction']
        indexes = [
            models.Index(fields=['date_transaction']),
            models.Index(fields=['type_transaction']),
            models.Index(fields=['user', 'date_transaction']),
        ]

class MobileMoney(models.Model):
    number = models.CharField("Numéro", max_length=30, db_index=True)
    amount = models.DecimalField("Montant", max_digits=12, decimal_places=2)
    action = models.CharField("Action", max_length=45, db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='mobilemoney_operations')
    caisse_session = models.ForeignKey(CashRegisterSession, on_delete=models.PROTECT, db_index=True)
    date = models.DateTimeField("Date", auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Mobile Money"
        verbose_name_plural = "Mobile Moneys"
        ordering = ['-date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['action']),
        ]

class Unite(models.Model):
    number = models.IntegerField("Nombre")
    amount = models.DecimalField("Montant", max_digits=12, decimal_places=2)
    date = models.DateTimeField("Date", db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='unite_operations')

    class Meta:
        verbose_name = "Unité"
        verbose_name_plural = "Unités"
        ordering = ['-date']

class WithdrawalCode(models.Model):
    code = models.CharField("Code", max_length=50, unique=True, db_index=True)
    amount = models.DecimalField("Montant", max_digits=12, decimal_places=2)
    created_at = models.DateTimeField("Créé le", auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField("Expiré le", db_index=True)
    STATUS = (
        ('unused', 'Inutilisé'),
        ('used', 'Utilisé'),
        ('expired', 'Expiré'),
    )
    status = models.CharField("Statut", max_length=10, choices=STATUS, default='unused', db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='withdrawal_codes')

    class Meta:
        verbose_name = "Code de retrait"
        verbose_name_plural = "Codes de retrait"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
        ]

# -----------------------------
# Promotions et Marketing OPTIMISÉS
# -----------------------------

class Promotion(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    variante = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    discount = models.FloatField("Remise")
    start_date = models.DateTimeField("Début", db_index=True)
    end_date = models.DateTimeField("Fin", db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, db_index=True)

    class Meta:
        verbose_name = "Promotion"
        verbose_name_plural = "Promotions"
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['store', 'start_date']),
        ]

class Campaign(models.Model):
    name = models.CharField("Nom campagne", max_length=255, db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='campaigns', db_index=True)
    campaign_type = models.CharField("Type", max_length=50, choices=[
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('social', 'Réseaux sociaux'),
        ('in_store', 'En magasin')
    ], db_index=True)
    start_date = models.DateTimeField("Date début", db_index=True)
    end_date = models.DateTimeField("Date fin", db_index=True)
    target_customers = models.ManyToManyField(Customer, blank=True)
    budget = models.DecimalField("Budget", max_digits=12, decimal_places=2)
    
    class Meta:
        verbose_name = "Campagne marketing"
        verbose_name_plural = "Campagnes marketing"
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['start_date']),
            models.Index(fields=['campaign_type']),
        ]

# -----------------------------
# Comptabilité et Analyse OPTIMISÉES
# -----------------------------

class ExpenseCategory(models.Model):
    name = models.CharField("Nom catégorie", max_length=100, db_index=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        verbose_name = "Catégorie de dépense"
        verbose_name_plural = "Catégories de dépenses"
        ordering = ['name']

class Expense(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='expenses', db_index=True)
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, db_index=True)
    amount = models.DecimalField("Montant", max_digits=10, decimal_places=2)
    description = models.TextField("Description")
    expense_date = models.DateField("Date dépense", db_index=True)
    receipt_number = models.CharField("Numéro reçu", max_length=100, blank=True)
    approved_by = models.ForeignKey(Employee, on_delete=models.PROTECT, db_index=True)
    
    class Meta:
        verbose_name = "Dépense"
        verbose_name_plural = "Dépenses"
        ordering = ['-expense_date']
        indexes = [
            models.Index(fields=['expense_date']),
            models.Index(fields=['store', 'expense_date']),
        ]

class TaxRate(models.Model):
    name = models.CharField("Nom taxe", max_length=100, db_index=True)
    rate = models.FloatField("Taux (%)", validators=[MinValueValidator(0), MaxValueValidator(100)])
    is_active = models.BooleanField("Actif", default=True, db_index=True)
    applicable_categories = models.ManyToManyField(ProductCategory, blank=True)
    
    class Meta:
        verbose_name = "Taux de taxe"
        verbose_name_plural = "Taux de taxes"
        ordering = ['name']

class AccountingPeriod(AuditModel):
    name = models.CharField(max_length=100, db_index=True)
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    is_closed = models.BooleanField(default=False, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = "Période comptable"
        verbose_name_plural = "Périodes comptables"
        ordering = ['-start_date']
        unique_together = ['start_date', 'end_date']
        indexes = [
            models.Index(fields=['start_date']),
            models.Index(fields=['is_closed']),
        ]

class GeneralLedger(AuditModel):
    period = models.ForeignKey(AccountingPeriod, on_delete=models.PROTECT, related_name='ledger_entries', db_index=True)
    entry_date = models.DateField(db_index=True)
    reference = models.CharField(max_length=100, db_index=True)
    
    account_number = models.CharField(max_length=20, db_index=True)
    account_name = models.CharField(max_length=100)
    
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    description = models.TextField()
    source_document = models.CharField(max_length=50)
    source_id = models.CharField(max_length=100)
    
    class Meta:
        verbose_name = "Écriture comptable"
        verbose_name_plural = "Écritures comptables"
        ordering = ['-entry_date']
        indexes = [
            models.Index(fields=['entry_date']),
            models.Index(fields=['account_number', 'entry_date']),
            models.Index(fields=['reference']),
        ]

class FinancialReport(AuditModel):
    REPORT_TYPES = [
        ('profit_loss', 'Compte de résultat'),
        ('balance_sheet', 'Bilan'),
        ('cash_flow', 'Flux de trésorerie'),
        ('sales', 'Ventes'),
        ('inventory', 'Stock'),
    ]
    
    store = models.ForeignKey(Store, on_delete=models.CASCADE, null=True, blank=True, db_index=True)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, db_index=True)
    period = models.ForeignKey(AccountingPeriod, on_delete=models.PROTECT, db_index=True)
    
    report_data = JSONField()
    generated_at = models.DateTimeField(auto_now_add=True, db_index=True)
    generated_by = models.ForeignKey(User, on_delete=models.PROTECT, db_index=True)
    
    file_path = models.FileField(upload_to='reports/', null=True, blank=True)
    
    class Meta:
        verbose_name = "Rapport financier"
        verbose_name_plural = "Rapports financiers"
        ordering = ['-generated_at']
        unique_together = ['store', 'report_type', 'period']
        indexes = [
            models.Index(fields=['generated_at']),
            models.Index(fields=['report_type']),
        ]

class KPI(models.Model):
    name = models.CharField("Nom KPI", max_length=255, db_index=True)
    code = models.SlugField(unique=True, db_index=True)
    description = models.TextField(blank=True)
    calculation_formula = models.TextField("Formule de calcul")
    target_value = models.FloatField("Valeur cible")
    unit = models.CharField("Unité", max_length=50)
    
    class Meta:
        verbose_name = "Indicateur de performance"
        verbose_name_plural = "Indicateurs de performance"
        ordering = ['name']

class KPIMeasurement(models.Model):
    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE, related_name='measurements', db_index=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, db_index=True)
    period_start = models.DateTimeField("Début période", db_index=True)
    period_end = models.DateTimeField("Fin période", db_index=True)
    value = models.FloatField("Valeur mesurée")
    
    class Meta:
        verbose_name = "Mesure KPI"
        verbose_name_plural = "Mesures KPI"
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['period_start']),
            models.Index(fields=['kpi', 'period_start']),
        ]

class Dashboard(models.Model):
    name = models.CharField("Nom dashboard", max_length=255, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dashboards', db_index=True)
    layout_config = JSONField("Configuration layout", default=dict)
    is_default = models.BooleanField("Par défaut", default=False, db_index=True)
    
    class Meta:
        verbose_name = "Tableau de bord"
        verbose_name_plural = "Tableaux de bord"
        ordering = ['name']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['is_default']),
        ]

# -----------------------------
# Sécurité et Maintenance OPTIMISÉES
# -----------------------------

class SecurityIncident(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='security_incidents', db_index=True)
    incident_type = models.CharField("Type incident", max_length=100, choices=[
        ('theft', 'Vol'),
        ('fraud', 'Fraude'),
        ('system_breach', 'Brèche système'),
        ('physical_breach', 'Brèche physique')
    ], db_index=True)
    description = models.TextField("Description")
    severity = models.CharField("Gravité", max_length=20, choices=[
        ('low', 'Faible'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('critical', 'Critique')
    ], db_index=True)
    reported_by = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='reported_incidents', db_index=True)
    resolution_status = models.CharField("Statut résolution", max_length=20, default='open', db_index=True)
    
    class Meta:
        verbose_name = "Incident de sécurité"
        verbose_name_plural = "Incidents de sécurité"
        ordering = ['-id']
        indexes = [
            models.Index(fields=['incident_type']),
            models.Index(fields=['severity']),
            models.Index(fields=['resolution_status']),
        ]

class DataBackup(models.Model):
    backup_type = models.CharField("Type sauvegarde", max_length=50, choices=[
        ('full', 'Complète'),
        ('incremental', 'Incrémentielle'),
        ('differential', 'Différentielle')
    ], db_index=True)
    file_path = models.CharField("Chemin fichier", max_length=500)
    file_size = models.BigIntegerField("Taille fichier")
    backup_date = models.DateTimeField("Date sauvegarde", db_index=True)
    is_verified = models.BooleanField("Vérifiée", default=False)
    
    class Meta:
        verbose_name = "Sauvegarde données"
        verbose_name_plural = "Sauvegardes données"
        ordering = ['-backup_date']
        indexes = [
            models.Index(fields=['backup_date']),
            models.Index(fields=['backup_type']),
        ]

class MaintenanceTask(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='maintenance_tasks', db_index=True)
    equipment = models.CharField("Équipement", max_length=255, db_index=True)
    task_type = models.CharField("Type tâche", max_length=100, choices=[
        ('preventive', 'Préventive'),
        ('corrective', 'Corrective'),
        ('predictive', 'Prédictive')
    ], db_index=True)
    scheduled_date = models.DateTimeField("Date planifiée", db_index=True)
    completed_date = models.DateTimeField("Date réalisation", null=True, blank=True, db_index=True)
    assigned_to = models.ForeignKey(Employee, on_delete=models.PROTECT, db_index=True)
    status = models.CharField("Statut", max_length=20, default='scheduled', db_index=True)
    
    class Meta:
        verbose_name = "Tâche de maintenance"
        verbose_name_plural = "Tâches de maintenance"
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['status']),
            models.Index(fields=['equipment']),
        ]

class SupportTicket(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='support_tickets', db_index=True)
    title = models.CharField("Titre", max_length=255, db_index=True)
    description = models.TextField("Description")
    priority = models.CharField("Priorité", max_length=20, choices=[
        ('low', 'Basse'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('urgent', 'Urgent')
    ], db_index=True)
    status = models.CharField("Statut", max_length=20, default='open', db_index=True)
    created_by = models.ForeignKey(Employee, on_delete=models.PROTECT, related_name='created_tickets', db_index=True)
    assigned_to = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    
    class Meta:
        verbose_name = "Ticket de support"
        verbose_name_plural = "Tickets de support"
        ordering = ['-id']
        indexes = [
            models.Index(fields=['priority']),
            models.Index(fields=['status']),
        ]

# -----------------------------
# Rapports d'Erreur OPTIMISÉS
# -----------------------------

class ErrorReport(models.Model):
    user = models.ForeignKey(Employee, null=True, blank=True, on_delete=models.SET_NULL, db_index=True)
    message = models.TextField()
    traceback = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Rapport d'erreur"
        verbose_name_plural = "Rapports d'erreur"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['resolved']),
        ]