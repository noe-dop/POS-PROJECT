from rest_framework.permissions import BasePermission,SAFE_METHODS
from .models import StoreOwnership,StorePermission
from django.utils import timezone

class IsAdminOrOwner(BasePermission):
    """
    Permission pour admin/propriétaire.
    Permet la création aux owners, et l'accès aux objets aux owners concernés.
    """
    
    def has_permission(self, request, view):
        # Pour les méthodes GET (lecture), on utilise d'autres permissions
        if request.method in SAFE_METHODS:
            return True  # La vue gère les autres permissions
        
        # Pour POST/PUT/DELETE : besoin d'être authentifié
        if not request.user.is_authenticated:
            return False
        
        # Superadmin peut tout faire
        if request.user.is_superuser:
            return True
        
        # Owner peut créer des boutiques
        if hasattr(request.user, 'owner'):
            return True
        
        # Pour les autres utilisateurs, vérifier selon l'action
        if view.action == 'create':
            # Seuls superadmin et owners peuvent créer
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Superadmin peut tout faire
        if request.user.is_superuser:
            return True
        
        # Owner : vérifier s'il possède cette boutique
        if hasattr(request.user, 'owner'):
            return StoreOwnership.objects.filter(
                store=obj,
                owner=request.user.owner
            ).exists()
        
        return False
    
class CanManageStoreProducts(BasePermission):
    """
    Permet l'accès si l'utilisateur est superuser,
    propriétaire de la boutique, ou employé avec droit 'can_manage_products'.
    """

    def has_permission(self, request, view):
        # L'utilisateur doit être authentifié
        if not request.user or not request.user.is_authenticated:
            return False

        # Pour les actions de liste, on peut autoriser si l'utilisateur a accès à au moins une boutique
        # Mais ici on va vérifier au niveau de l'objet via has_object_permission
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        store = obj.store  # l'objet StoreProduct a une clé vers Store

        # Superuser
        if user.is_superuser:
            return True

        # Propriétaire
        if hasattr(user, 'owner'):
            return StoreOwnership.objects.filter(owner=user.owner, store=store).exists()

        # Employé avec permission 'can_manage_products'
        if hasattr(user, 'employee'):
            return StorePermission.objects.filter(
                employee=user.employee,
                store=store,
                is_active=True,
                valid_until__gte=timezone.now().date(),
                can_manage_products=True
            ).exists()

        return False