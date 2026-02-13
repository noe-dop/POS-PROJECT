from rest_framework import permissions
from .models import StoreOwnership

class IsAdminOrOwner(permissions.BasePermission):
    """
    Permission pour admin/propriétaire.
    Permet la création aux owners, et l'accès aux objets aux owners concernés.
    """
    
    def has_permission(self, request, view):
        # Pour les méthodes GET (lecture), on utilise d'autres permissions
        if request.method in permissions.SAFE_METHODS:
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