# api_boutique_core/throttling.py
"""
Throttling personnalisé pour l'API Boutique Management System
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle, SimpleRateThrottle
from django.core.cache import cache
from django.conf import settings
import time


class CustomAnonRateThrottle(AnonRateThrottle):
    """
    Throttling pour utilisateurs anonymes
    """
    scope = 'anon'
    rate = '30/hour'
    
    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            return None  # Ne pas throttler les utilisateurs authentifiés
        
        # Utiliser l'IP comme identifiant
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class CustomUserRateThrottle(UserRateThrottle):
    """
    Throttling de base pour utilisateurs authentifiés
    """
    scope = 'user'
    rate = '1000/hour'
    
    def get_cache_key(self, request, view):
        if request.user.is_authenticated:
            # Vérifier le rôle de l'utilisateur
            user_role = self.get_user_role(request.user)
            
            # Si utilisateur a un rôle spécial, utiliser un throttle différent
            if user_role in ['employee', 'manager', 'admin']:
                return None  # Laisser les throttles spécifiques gérer
            
            return super().get_cache_key(request, view)
        return None
    
    def get_user_role(self, user):
        """Déterminer le rôle de l'utilisateur"""
        if user.is_superuser:
            return 'admin'
        if user.is_staff:
            return 'staff'
        if hasattr(user, 'employee'):
            # Vérifier le rôle de l'employé
            employee = user.employee
            role_name = employee.role.name.lower() if employee.role else ''
            
            if 'manager' in role_name or 'admin' in role_name or 'responsable' in role_name:
                return 'manager'
            return 'employee'
        if hasattr(user, 'owner'):
            return 'owner'
        if hasattr(user, 'customer'):
            return 'customer'
        return 'user'


class EmployeeRateThrottle(UserRateThrottle):
    """
    Throttling plus permissif pour les employés
    """
    scope = 'employee'
    rate = '10000/hour'
    
    def allow_request(self, request, view):
        # Vérifier si l'utilisateur est un employé
        if not request.user.is_authenticated or not hasattr(request.user, 'employee'):
            return True  # Ne pas appliquer ce throttle
        
        return super().allow_request(request, view)


class ManagerRateThrottle(UserRateThrottle):
    """
    Throttling très permissif pour les managers
    """
    scope = 'manager'
    rate = '50000/hour'
    
    def allow_request(self, request, view):
        # Vérifier si l'utilisateur est un manager
        if not request.user.is_authenticated:
            return True
        
        user_role = self.get_user_role(request.user)
        if user_role != 'manager' and user_role != 'admin':
            return True  # Ne pas appliquer ce throttle
        
        return super().allow_request(request, view)
    
    def get_user_role(self, user):
        if user.is_superuser or user.is_staff:
            return 'admin'
        if hasattr(user, 'employee'):
            employee = user.employee
            role_name = employee.role.name.lower() if employee.role else ''
            
            if 'manager' in role_name or 'admin' in role_name or 'responsable' in role_name:
                return 'manager'
        return 'other'


class BurstRateThrottle(SimpleRateThrottle):
    """
    Throttling burst pour protéger contre les attaques DDoS
    """
    scope = 'burst'
    rate = '60/minute'
    
    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class StoreSpecificThrottle(UserRateThrottle):
    """
    Throttling spécifique par boutique
    Utile pour limiter l'accès par boutique
    """
    scope = 'store'
    rate = '5000/hour'
    
    def get_cache_key(self, request, view):
        if not request.user.is_authenticated:
            return None
        
        # Récupérer l'ID de la boutique depuis la requête
        store_id = self.get_store_id(request, view)
        if not store_id:
            return None
        
        ident = f"{request.user.pk}_{store_id}"
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }
    
    def get_store_id(self, request, view):
        # Essayer différents moyens de récupérer l'ID de la boutique
        store_id = (
            request.data.get('store_id') or
            request.data.get('store') or
            request.query_params.get('store_id') or
            request.query_params.get('store') or
            getattr(request.user.employee, 'store_id', None) if hasattr(request.user, 'employee') else None
        )
        return store_id


class MethodSpecificThrottle(SimpleRateThrottle):
    """
    Throttling spécifique par méthode HTTP
    """
    scope = 'method_specific'
    
    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        method = request.method.lower()
        
        return f"{self.scope}_{ident}_{method}"
    
    def get_rate(self):
        """
        Retourne le rate limit en fonction de la méthode
        """
        method_rates = {
            'get': '1000/hour',
            'post': '200/hour',
            'put': '100/hour',
            'patch': '100/hour',
            'delete': '50/hour',
        }
        
        request_method = self.request.method.lower()
        return method_rates.get(request_method, '100/hour')


class DynamicRateThrottle(UserRateThrottle):
    """
    Throttling dynamique basé sur la charge du serveur
    """
    scope = 'dynamic'
    
    def get_rate(self):
        """
        Ajuste dynamiquement le rate limit basé sur la charge
        """
        # Vérifier la charge système (exemple simplifié)
        try:
            import psutil
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory_percent = psutil.virtual_memory().percent
            
            # Ajuster le rate limit en fonction de la charge
            if cpu_percent > 80 or memory_percent > 80:
                return '100/hour'  # Réduire en cas de forte charge
            elif cpu_percent > 60 or memory_percent > 60:
                return '500/hour'
            else:
                return '1000/hour'
                
        except ImportError:
            # Fallback si psutil n'est pas installé
            return '1000/hour'
    
    def allow_request(self, request, view):
        # Journaliser les throttles pour analyse
        if self.request is not None:
            self.log_throttle(request)
        
        return super().allow_request(request, view)
    
    def log_throttle(self, request):
        """Journaliser les événements de throttle"""
        from .models import ActivityLog
        import json
        
        # Ne journaliser que si le throttle est déclenché
        if self.history and self.num_requests >= len(self.history):
            ActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='API_THROTTLE_TRIGGERED',
                model_name=view.__class__.__name__ if hasattr(view, '__class__') else 'Unknown',
                details=json.dumps({
                    'user': request.user.username if request.user.is_authenticated else 'anonymous',
                    'view': view.__class__.__name__,
                    'method': request.method,
                    'path': request.path,
                    'rate': self.get_rate(),
                    'num_requests': self.num_requests,
                    'timestamp': time.time()
                })
            )


# Utilitaire pour configurer le throttling par vue
def get_throttle_classes_for_view(view_name):
    """
    Retourne les classes de throttle appropriées pour une vue
    """
    throttle_configs = {
        # Vues publiques (moins restrictives)
        'login': [CustomAnonRateThrottle, BurstRateThrottle],
        'register': [CustomAnonRateThrottle, BurstRateThrottle],
        'health-check': [BurstRateThrottle],
        
        # Vues client (modérées)
        'customer-profile': [CustomUserRateThrottle],
        'customer-orders': [CustomUserRateThrottle, MethodSpecificThrottle],
        
        # Vues employé (plus permissives)
        'employee-sales': [EmployeeRateThrottle, StoreSpecificThrottle],
        'employee-orders': [EmployeeRateThrottle, StoreSpecificThrottle],
        'cashier-operations': [EmployeeRateThrottle, StoreSpecificThrottle],
        
        # Vues manager (très permissives)
        'manager-reports': [ManagerRateThrottle],
        'manager-analytics': [ManagerRateThrottle],
        'inventory-management': [EmployeeRateThrottle, MethodSpecificThrottle],
        
        # Vues admin (pas de throttle)
        'admin-config': [],
    }
    
    return throttle_configs.get(view_name, [CustomUserRateThrottle, BurstRateThrottle])