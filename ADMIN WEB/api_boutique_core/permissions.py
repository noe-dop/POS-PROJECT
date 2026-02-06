# api_boutique_core/permissions.py
"""
Permissions personnalisées pour l'API Boutique Management System
"""

from rest_framework import permissions
from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.contrib.auth.models import AnonymousUser


class IsSuperUser(BasePermission):
    """
    Permission pour les super-utilisateurs uniquement
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsAdminUser(BasePermission):
    """
    Permission pour les administrateurs (staff)
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


class IsOwner(BasePermission):
    """
    Permission pour le propriétaire de l'objet
    Utilise le champ 'user' ou 'owner' sur l'objet
    """
    def has_object_permission(self, request, view, obj):
        # Si l'objet a un champ 'user'
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Si l'objet a un champ 'owner'
        if hasattr(obj, 'owner'):
            return obj.owner.user == request.user
        
        # Si l'objet a un champ 'created_by'
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission pour le propriétaire ou lecture seule
    """
    def has_object_permission(self, request, view, obj):
        # Les méthodes SAFE (GET, HEAD, OPTIONS) sont autorisées
        if request.method in SAFE_METHODS:
            return True
        
        # Vérifier la propriété
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        if hasattr(obj, 'owner'):
            return obj.owner.user == request.user
        
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False


class IsEmployee(BasePermission):
    """
    Permission pour les employés (tous rôles)
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                   hasattr(request.user, 'employee'))


class IsStoreEmployee(BasePermission):
    """
    Permission pour les employés d'une boutique spécifique
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        # Si la vue a besoin d'une boutique spécifique
        store_id = request.data.get('store_id') or request.query_params.get('store_id')
        if store_id:
            return str(request.user.employee.store_id) == str(store_id)
        
        return True


class IsStoreManager(BasePermission):
    """
    Permission pour les managers de boutique
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        employee = request.user.employee
        
        # Vérifier les rôles de manager
        manager_roles = ['manager', 'admin', 'supervisor', 'responsable']
        role_name = employee.role.name.lower() if employee.role else ''
        
        return any(manager_role in role_name for manager_role in manager_roles)


class IsCashier(BasePermission):
    """
    Permission pour les caissiers
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        employee = request.user.employee
        role_name = employee.role.name.lower() if employee.role else ''
        
        return 'caisse' in role_name or 'cashier' in role_name or 'caissier' in role_name


class CanManageOrders(BasePermission):
    """
    Permission pour gérer les commandes
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        employee = request.user.employee
        role_name = employee.role.name.lower() if employee.role else ''
        
        # Rôles autorisés à gérer les commandes
        allowed_roles = ['manager', 'admin', 'supervisor', 'responsable', 'vendeur', 'sales']
        return any(allowed_role in role_name for allowed_role in allowed_roles)


class CanManageInventory(BasePermission):
    """
    Permission pour gérer l'inventaire
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        employee = request.user.employee
        role_name = employee.role.name.lower() if employee.role else ''
        
        # Rôles autorisés à gérer l'inventaire
        allowed_roles = ['manager', 'admin', 'supervisor', 'inventory', 'stock', 'magasinier']
        return any(allowed_role in role_name for allowed_role in allowed_roles)


class CanManageFinancial(BasePermission):
    """
    Permission pour gérer les aspects financiers
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        employee = request.user.employee
        role_name = employee.role.name.lower() if employee.role else ''
        
        # Rôles autorisés à gérer les finances
        allowed_roles = ['manager', 'admin', 'supervisor', 'comptable', 'accountant', 'finance']
        return any(allowed_role in role_name for allowed_role in allowed_roles)


class CanViewReports(BasePermission):
    """
    Permission pour visualiser les rapports
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Superusers et admins peuvent tout voir
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Les employés avec certains rôles peuvent voir les rapports
        if hasattr(request.user, 'employee'):
            employee = request.user.employee
            role_name = employee.role.name.lower() if employee.role else ''
            
            allowed_roles = ['manager', 'admin', 'supervisor', 'responsable']
            return any(allowed_role in role_name for allowed_role in allowed_roles)
        
        return False


class IsCustomer(BasePermission):
    """
    Permission pour les clients
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                   hasattr(request.user, 'customer'))


class IsCustomerOwner(BasePermission):
    """
    Permission pour un client sur ses propres données
    """
    def has_object_permission(self, request, view, obj):
        # Pour les commandes
        if hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        
        # Pour les adresses de livraison
        if hasattr(obj, 'customer'):
            return obj.customer.user == request.user
        
        # Pour les cartes de fidélité
        if hasattr(obj, 'client'):
            return obj.client.user == request.user
        
        return False


class HasStoreAccess(BasePermission):
    """
    Permission pour vérifier l'accès à une boutique
    """
    def has_permission(self, request, view):
        store_id = request.data.get('store') or request.data.get('store_id') or \
                   request.query_params.get('store') or request.query_params.get('store_id')
        
        if not store_id:
            # Si aucun store_id n'est spécifié, la permission est accordée
            # (la vérification se fera au niveau de l'objet si nécessaire)
            return True
        
        # Superusers peuvent accéder à toutes les boutiques
        if request.user.is_superuser:
            return True
        
        # Propriétaires peuvent accéder à leurs boutiques
        if hasattr(request.user, 'owner'):
            owner_stores = Store.objects.filter(owners=request.user.owner)
            return owner_stores.filter(id=store_id).exists()
        
        # Employés peuvent accéder à leur boutique
        if hasattr(request.user, 'employee'):
            return str(request.user.employee.store_id) == str(store_id)
        
        return False


class IsActiveEmployee(BasePermission):
    """
    Permission pour les employés actifs uniquement
    """
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        return request.user.employee.is_active


class HasSpecificPermission(BasePermission):
    """
    Permission basée sur des codes de permission spécifiques
    """
    def __init__(self, permission_codes):
        self.permission_codes = permission_codes if isinstance(permission_codes, list) else [permission_codes]
    
    def has_permission(self, request, view):
        if not hasattr(request.user, 'employee'):
            return False
        
        employee = request.user.employee
        
        # Vérifier si le rôle de l'employé a les permissions requises
        if employee.role and employee.role.permissions:
            role_permissions = employee.role.permissions
            return any(perm in role_permissions for perm in self.permission_codes)
        
        return False


class ReadOnly(BasePermission):
    """
    Permission lecture seule
    """
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


# Combinaisons de permissions courantes
class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_staff or IsOwner().has_object_permission(request, view, obj)


class IsEmployeeOrCustomer(BasePermission):
    def has_permission(self, request, view):
        return IsEmployee().has_permission(request, view) or IsCustomer().has_permission(request, view)


class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_staff or IsStoreManager().has_permission(request, view)


# Utilitaire pour vérifier les permissions dans les vues
def check_store_permission(user, store_id):
    """
    Vérifie si un utilisateur a accès à une boutique spécifique
    """
    if not user.is_authenticated:
        return False
    
    if user.is_superuser:
        return True
    
    # Propriétaires
    if hasattr(user, 'owner'):
        return user.owner.storeownership_set.filter(store_id=store_id).exists()
    
    # Employés
    if hasattr(user, 'employee'):
        return user.employee.store_id == store_id
    
    # Actionnaires
    if hasattr(user, 'shareholder'):
        return user.shareholder.storeshareholder_set.filter(store_id=store_id).exists()
    
    return False


def get_user_role(user):
    """
    Retourne le rôle de l'utilisateur sous forme de chaîne
    """
    if not user.is_authenticated:
        return 'anonymous'
    
    if user.is_superuser:
        return 'superuser'
    
    if user.is_staff:
        return 'staff'
    
    if hasattr(user, 'owner'):
        return 'owner'
    
    if hasattr(user, 'employee'):
        return 'employee'
    
    if hasattr(user, 'shareholder'):
        return 'shareholder'
    
    if hasattr(user, 'customer'):
        return 'customer'
    
    return 'user'