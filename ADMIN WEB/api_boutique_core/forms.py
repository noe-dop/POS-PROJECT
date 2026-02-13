from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import *

# =============================================================================
# FORMULAIRES D'AUTHENTIFICATION PERSONNALISÉS
# =============================================================================

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'phone')

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'phone', 'is_active')

# =============================================================================
# FORMULAIRES POUR LES UTILISATEURS
# =============================================================================

class UserRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Mot de passe",
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        min_length=8
    )
    password2 = forms.CharField(
        label="Confirmation du mot de passe",
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'phone')
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
        }

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise ValidationError("Les mots de passe ne correspondent pas")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

class UserProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone', 'phone2', 'address', 'photo')
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'phone2': forms.TextInput(attrs={'class': 'form-control'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'photo': forms.FileInput(attrs={'class': 'form-control'}),
        }

class CustomerRegistrationForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = ('birth_date', 'preferences')
        widgets = {
            'birth_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'preferences': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

# =============================================================================
# FORMULAIRES POUR LES BOUTIQUES
# =============================================================================

class StoreForm(forms.ModelForm):
    class Meta:
        model = Store
        fields = '__all__'
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'slug': forms.TextInput(attrs={'class': 'form-control'}),
            'store_type': forms.Select(attrs={'class': 'form-control'}),
            'network': forms.Select(attrs={'class': 'form-control'}),
            'address': forms.Select(attrs={'class': 'form-control'}),
            'phone': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'logo': forms.FileInput(attrs={'class': 'form-control'}),
            'banner': forms.FileInput(attrs={'class': 'form-control'}),
            'slogan': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

    def clean_slug(self):
        slug = self.cleaned_data.get('slug')
        if Store.objects.filter(slug=slug).exists():
            if self.instance and self.instance.slug != slug:
                raise ValidationError("Ce slug est déjà utilisé par une autre boutique")
        return slug

class StoreConfigurationForm(forms.ModelForm):
    class Meta:
        model = Store
        fields = ('configuration',)
        widgets = {
            'configuration': forms.Textarea(attrs={'class': 'form-control', 'rows': 10}),
        }

# =============================================================================
# FORMULAIRES POUR LES EMPLOYÉS
# =============================================================================

class EmployeeForm(forms.ModelForm):
    class Meta:
        model = Employee
        fields = '__all__'
        widgets = {
            'user': forms.Select(attrs={'class': 'form-control'}),
            'store': forms.Select(attrs={'class': 'form-control'}),
            'department': forms.Select(attrs={'class': 'form-control'}),
            'role': forms.Select(attrs={'class': 'form-control'}),
            'hire_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'salary': forms.NumberInput(attrs={'class': 'form-control'}),
            'emergency_contact': forms.TextInput(attrs={'class': 'form-control'}),
            'photo': forms.FileInput(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

# =============================================================================
# FORMULAIRES POUR LES PRODUITS
# =============================================================================

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = '__all__'
        widgets = {
            'category': forms.Select(attrs={'class': 'form-control'}),
            'brand': forms.Select(attrs={'class': 'form-control'}),
            'supplier': forms.Select(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'cost_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'base_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'compare_at_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'qt_item': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'jour_ecart': forms.NumberInput(attrs={'class': 'form-control'}),
            'photo': forms.FileInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-control'}),
        }

class ProductVariantForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = '__all__'
        widgets = {
            'product': forms.Select(attrs={'class': 'form-control'}),
            'barcode': forms.TextInput(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'cost_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'prix_vente': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'prix_reduction': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'weight': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.001'}),
            'selection': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'photo': forms.FileInput(attrs={'class': 'form-control'}),
        }

class ProductImportForm(forms.Form):
    csv_file = forms.FileField(
        label="Fichier CSV",
        widget=forms.FileInput(attrs={'class': 'form-control', 'accept': '.csv'})
    )
    update_existing = forms.BooleanField(
        required=False,
        initial=True,
        label="Mettre à jour les produits existants",
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )

# =============================================================================
# FORMULAIRES POUR LA GESTION DES STOCKS
# =============================================================================

class StockForm(forms.ModelForm):
    class Meta:
        model = Stock
        fields = '__all__'
        widgets = {
            'product': forms.Select(attrs={'class': 'form-control'}),
            'store': forms.Select(attrs={'class': 'form-control'}),
            'warehouse': forms.Select(attrs={'class': 'form-control'}),
            'quantity_package': forms.NumberInput(attrs={'class': 'form-control'}),
            'quantity_on_hand': forms.NumberInput(attrs={'class': 'form-control'}),
            'quantity_reserved': forms.NumberInput(attrs={'class': 'form-control'}),
            'ideal_stock_level': forms.NumberInput(attrs={'class': 'form-control'}),
            'min_stock_threshold': forms.NumberInput(attrs={'class': 'form-control'}),
            'qt_moy_appro': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

class StockAdjustmentForm(forms.Form):
    product = forms.ModelChoiceField(
        queryset=Product.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    store = forms.ModelChoiceField(
        queryset=Store.objects.all(),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    adjustment_type = forms.ChoiceField(
        choices=[('add', 'Ajouter'), ('remove', 'Retirer'), ('set', 'Définir')],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    quantity = forms.IntegerField(
        min_value=1,
        widget=forms.NumberInput(attrs={'class': 'form-control'})
    )
    reason = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Raison de l\'ajustement'})
    )

class InventoryCountForm(forms.ModelForm):
    class Meta:
        model = InventoryCount
        fields = ('store', 'count_date', 'notes')
        widgets = {
            'store': forms.Select(attrs={'class': 'form-control'}),
            'count_date': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

# =============================================================================
# FORMULAIRES POUR LES CAISSES
# =============================================================================

class CashRegisterForm(forms.ModelForm):
    class Meta:
        model = CashRegister
        fields = '__all__'
        widgets = {
            'store': forms.Select(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'location': forms.TextInput(attrs={'class': 'form-control'}),
            'opening_balance': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

class CashRegisterSessionForm(forms.ModelForm):
    class Meta:
        model = CashRegisterSession
        fields = ('cash_register', 'employee', 'opening_balance')
        widgets = {
            'cash_register': forms.Select(attrs={'class': 'form-control'}),
            'employee': forms.Select(attrs={'class': 'form-control'}),
            'opening_balance': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

class CloseSessionForm(forms.Form):
    actual_balance = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'})
    )
    notes = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Notes de fermeture'})
    )

class CashTransactionForm(forms.ModelForm):
    class Meta:
        model = CashTransaction
        fields = ('session', 'transaction_type', 'amount', 'payment_method', 'reference', 'notes')
        widgets = {
            'session': forms.Select(attrs={'class': 'form-control'}),
            'transaction_type': forms.Select(attrs={'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'payment_method': forms.Select(attrs={'class': 'form-control'}),
            'reference': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

# =============================================================================
# FORMULAIRES POUR LES VENTES
# =============================================================================

class SaleForm(forms.ModelForm):
    class Meta:
        model = Sale
        fields = ('store', 'customer', 'employee', 'caisse', 'delivery_address', 'delivery_fee', 'notes')
        widgets = {
            'store': forms.Select(attrs={'class': 'form-control'}),
            'customer': forms.Select(attrs={'class': 'form-control'}),
            'employee': forms.Select(attrs={'class': 'form-control'}),
            'caisse': forms.Select(attrs={'class': 'form-control'}),
            'delivery_address': forms.Select(attrs={'class': 'form-control'}),
            'delivery_fee': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

class SaleItemForm(forms.ModelForm):
    class Meta:
        model = SaleItem
        fields = ('product', 'variant', 'quantity', 'unit_price', 'discount_rate', 'tax_rate')
        widgets = {
            'product': forms.Select(attrs={'class': 'form-control'}),
            'variant': forms.Select(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'unit_price': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'discount_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'tax_rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

class SalePaymentForm(forms.ModelForm):
    class Meta:
        model = SalePayment
        fields = ('payment_method', 'amount', 'reference', 'notes')
        widgets = {
            'payment_method': forms.Select(attrs={'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'reference': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
        }

# =============================================================================
# FORMULAIRES POUR LES CARTES ET FIDÉLISATION
# =============================================================================

class CardForm(forms.ModelForm):
    class Meta:
        model = Card
        fields = '__all__'
        widgets = {
            'num_card': forms.TextInput(attrs={'class': 'form-control'}),
            'type_card': forms.Select(attrs={'class': 'form-control'}),
            'client': forms.Select(attrs={'class': 'form-control'}),
            'solde': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'max_credit': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'plafond': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'remise': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'statut': forms.Select(attrs={'class': 'form-control'}),
        }

class CardRechargeForm(forms.Form):
    card = forms.ModelChoiceField(
        queryset=Card.objects.filter(statut='actif'),
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    amount = forms.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0.01,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'})
    )
    reference = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Référence de recharge'})
    )

# =============================================================================
# FORMULAIRES POUR LES FOURNISSEURS
# =============================================================================

class SupplierForm(forms.ModelForm):
    class Meta:
        model = Supplier
        fields = '__all__'
        widgets = {
            'store': forms.Select(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'num_supplier': forms.TextInput(attrs={'class': 'form-control'}),
            'email': forms.EmailInput(attrs={'class': 'form-control'}),
            'emplacement': forms.TextInput(attrs={'class': 'form-control'}),
            'contact_person': forms.TextInput(attrs={'class': 'form-control'}),
            'payment_terms': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

class SupplyForm(forms.ModelForm):
    class Meta:
        model = Supply
        fields = ('store', 'supplier', 'total_command')
        widgets = {
            'store': forms.Select(attrs={'class': 'form-control'}),
            'supplier': forms.Select(attrs={'class': 'form-control'}),
            'total_command': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

# =============================================================================
# FORMULAIRES POUR LES LIVRAISONS
# =============================================================================

class DeliveryForm(forms.ModelForm):
    class Meta:
        model = Delivery
        fields = ('delivery_address', 'assigned_driver', 'route', 'fee', 'estimated_time', 'customer_notes')
        widgets = {
            'delivery_address': forms.Select(attrs={'class': 'form-control'}),
            'assigned_driver': forms.Select(attrs={'class': 'form-control'}),
            'route': forms.Select(attrs={'class': 'form-control'}),
            'fee': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'estimated_time': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'customer_notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

class DeliveryStatusUpdateForm(forms.Form):
    status = forms.ChoiceField(
        choices=Delivery.DELIVERY_STATUS,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    driver_notes = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Notes du livreur'})
    )

# =============================================================================
# FORMULAIRES POUR LES RETOURS
# =============================================================================

class ProductReturnForm(forms.ModelForm):
    class Meta:
        model = ProductReturn
        fields = ('original_sale', 'return_reason', 'notes')
        widgets = {
            'original_sale': forms.Select(attrs={'class': 'form-control'}),
            'return_reason': forms.Select(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
        }

class ReturnItemForm(forms.ModelForm):
    class Meta:
        model = ReturnItem
        fields = ('sale_item', 'quantity_returned', 'condition', 'inspection_notes')
        widgets = {
            'sale_item': forms.Select(attrs={'class': 'form-control'}),
            'quantity_returned': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'condition': forms.Select(attrs={'class': 'form-control'}),
            'inspection_notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
        }

class RefundForm(forms.ModelForm):
    class Meta:
        model = Refund
        fields = ('refund_method', 'refund_reference', 'notes')
        widgets = {
            'refund_method': forms.Select(attrs={'class': 'form-control'}),
            'refund_reference': forms.TextInput(attrs={'class': 'form-control'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
        }

# =============================================================================
# FORMULAIRES POUR LES PROMOTIONS
# =============================================================================

class PromotionForm(forms.ModelForm):
    class Meta:
        model = Promotion
        fields = '__all__'
        widgets = {
            'product': forms.Select(attrs={'class': 'form-control'}),
            'variante': forms.Select(attrs={'class': 'form-control'}),
            'discount': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'start_date': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'end_date': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'store': forms.Select(attrs={'class': 'form-control'}),
        }

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        return cleaned_data

# =============================================================================
# FORMULAIRES POUR LES DÉPENSES
# =============================================================================

class ExpenseForm(forms.ModelForm):
    class Meta:
        model = Expense
        fields = '__all__'
        widgets = {
            'store': forms.Select(attrs={'class': 'form-control'}),
            'category': forms.Select(attrs={'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'expense_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'receipt_number': forms.TextInput(attrs={'class': 'form-control'}),
            'approved_by': forms.Select(attrs={'class': 'form-control'}),
        }

# =============================================================================
# FORMULAIRES POUR LES RAPPORTS
# =============================================================================

class ReportPeriodForm(forms.Form):
    start_date = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'})
    )
    end_date = forms.DateTimeField(
        widget=forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'})
    )
    store = forms.ModelChoiceField(
        queryset=Store.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )

    def clean(self):
        cleaned_data = super().clean()
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        return cleaned_data

class SalesReportForm(ReportPeriodForm):
    report_type = forms.ChoiceField(
        choices=[
            ('daily', 'Ventes quotidiennes'),
            ('weekly', 'Ventes hebdomadaires'),
            ('monthly', 'Ventes mensuelles'),
            ('product', 'Par produit'),
            ('category', 'Par catégorie'),
        ],
        widget=forms.Select(attrs={'class': 'form-control'})
    )

class InventoryReportForm(forms.Form):
    report_type = forms.ChoiceField(
        choices=[
            ('low_stock', 'Stock bas'),
            ('overstock', 'Surstock'),
            ('movement', 'Mouvements de stock'),
            ('valuation', 'Valuation du stock'),
        ],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    store = forms.ModelChoiceField(
        queryset=Store.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )

# =============================================================================
# FORMULAIRES POUR LA CONFIGURATION
# =============================================================================

class TaxRateForm(forms.ModelForm):
    class Meta:
        model = TaxRate
        fields = '__all__'
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }

class PaymentMethodForm(forms.ModelForm):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control'}),
            'code': forms.TextInput(attrs={'class': 'form-control'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'requires_reference': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'fee_percentage': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

# =============================================================================
# FORMULAIRES DE RECHERCHE
# =============================================================================

class ProductSearchForm(forms.Form):
    query = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Rechercher un produit...'
        })
    )
    category = forms.ModelChoiceField(
        queryset=ProductCategory.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    brand = forms.ModelChoiceField(
        queryset=ProductBrand.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    min_price = forms.DecimalField(
        required=False,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Prix min'})
    )
    max_price = forms.DecimalField(
        required=False,
        max_digits=10,
        decimal_places=2,
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Prix max'})
    )

class CustomerSearchForm(forms.Form):
    query = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Nom, email ou téléphone...'
        })
    )
    has_loyalty_card = forms.BooleanField(
        required=False,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )

# =============================================================================
# FORMULAIRES POUR LES IMPORTS
# =============================================================================

class ImportForm(forms.Form):
    IMPORT_TYPES = [
        ('products', 'Produits'),
        ('customers', 'Clients'),
        ('suppliers', 'Fournisseurs'),
        ('sales', 'Ventes'),
    ]
    
    import_type = forms.ChoiceField(
        choices=IMPORT_TYPES,
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    csv_file = forms.FileField(
        widget=forms.FileInput(attrs={'class': 'form-control', 'accept': '.csv'})
    )
    update_existing = forms.BooleanField(
        required=False,
        initial=True,
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )

# =============================================================================
# FORMULAIRES POUR LES STATISTIQUES
# =============================================================================

class DashboardFilterForm(forms.Form):
    period = forms.ChoiceField(
        choices=[
            ('today', "Aujourd'hui"),
            ('week', 'Cette semaine'),
            ('month', 'Ce mois'),
            ('quarter', 'Ce trimestre'),
            ('year', 'Cette année'),
            ('custom', 'Période personnalisée'),
        ],
        widget=forms.Select(attrs={'class': 'form-control'})
    )
    start_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'})
    )
    end_date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'})
    )
    store = forms.ModelChoiceField(
        queryset=Store.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-control'})
    )