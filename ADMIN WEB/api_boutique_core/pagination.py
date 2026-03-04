# api_boutique_core/pagination.py
"""
Configurations de pagination pour l'API Boutique Management System
"""

from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination, CursorPagination
from rest_framework.response import Response
from django.core.paginator import InvalidPage
from rest_framework.exceptions import NotFound
import math


class StandardPageNumberPagination(PageNumberPagination):
    """
    Pagination standard avec numéros de page
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'results': data
        })
    
    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'links': {
                    'type': 'object',
                    'properties': {
                        'next': {'type': 'string', 'nullable': True},
                        'previous': {'type': 'string', 'nullable': True}
                    }
                },
                'count': {'type': 'integer'},
                'total_pages': {'type': 'integer'},
                'current_page': {'type': 'integer'},
                'page_size': {'type': 'integer'},
                'results': schema
            }
        }


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination pour les grands ensembles de résultats
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500
    page_query_param = 'page'


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination pour les petits ensembles de résultats
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_query_param = 'page'


class DashboardPagination(PageNumberPagination):
    """
    Pagination spéciale pour le dashboard (limité)
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 30
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'page': self.page.number,
            'has_next': self.page.has_next(),
            'has_previous': self.page.has_previous(),
            'results': data
        })


class AnalyticsPagination(PageNumberPagination):
    """
    Pagination pour les données analytiques (pas de limite stricte)
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000  # Plus grand pour les exports
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        return Response({
            'metadata': {
                'total_records': self.page.paginator.count,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number,
                'page_size': self.get_page_size(self.request),
                'has_more': self.page.has_next()
            },
            'data': data
        })


class LimitOffsetPaginationWithCount(LimitOffsetPagination):
    """
    Pagination limit/offset avec informations supplémentaires
    """
    default_limit = 20
    max_limit = 100
    
    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.count,
            'offset': self.offset,
            'limit': self.limit,
            'results': data
        })


class CursorPaginationWithCount(CursorPagination):
    """
    Pagination par curseur avec compte total
    """
    page_size = 20
    max_page_size = 100
    ordering = '-created_at'
    
    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count if hasattr(self.page, 'paginator') else None,
            'results': data
        })


class CustomPageNumberPagination(PageNumberPagination):
    """
    Pagination personnalisée avec métadonnées étendues
    """
    page_size = 25
    page_size_query_param = 'limit'
    max_page_size = 200
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        total_pages = self.page.paginator.num_pages
        current_page = self.page.number
        page_size = self.get_page_size(self.request)
        
        return Response({
            'pagination': {
                'total': self.page.paginator.count,
                'count': len(data),
                'per_page': page_size,
                'current_page': current_page,
                'total_pages': total_pages,
                'links': {
                    'first': self.build_absolute_uri(self.request.path) + f'?page=1&limit={page_size}',
                    'last': self.build_absolute_uri(self.request.path) + f'?page={total_pages}&limit={page_size}',
                    'prev': self.get_previous_link(),
                    'next': self.get_next_link(),
                    'self': self.request.build_absolute_uri()
                }
            },
            'data': data
        })
    
    def build_absolute_uri(self, path):
        return self.request.build_absolute_uri(path)


class NoPagination(PageNumberPagination):
    """
    Désactive la pagination (pour les exports, etc.)
    """
    page_size = None
    page_size_query_param = None
    max_page_size = None
    
    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset, request, view)
    
    def get_paginated_response(self, data):
        if self.page is None:
            return Response({
                'count': len(data),
                'pagination_disabled': True,
                'results': data
            })
        return super().get_paginated_response(data)


class OptimizedPagination(PageNumberPagination):
    """
    Pagination optimisée pour les performances
    - Utilise 'only' pour réduire les données transférées
    - Limite les champs par défaut
    """
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def paginate_queryset(self, queryset, request, view=None):
        """
        Surcharge pour optimiser les requêtes
        """
        # Appliquer select_related et prefetch_related si disponibles
        if hasattr(view, 'select_related_fields'):
            queryset = queryset.select_related(*view.select_related_fields)
        
        if hasattr(view, 'prefetch_related_fields'):
            queryset = queryset.prefetch_related(*view.prefetch_related_fields)
        
        # Appliquer only si spécifié
        if hasattr(view, 'only_fields'):
            queryset = queryset.only(*view.only_fields)
        
        return super().paginate_queryset(queryset, request, view)
    
    def get_paginated_response(self, data):
        # Calculer le temps de réponse approximatif
        import time
        start_time = getattr(self.request, '_start_time', time.time())
        response_time = time.time() - start_time
        
        return Response({
            'performance': {
                'response_time_ms': round(response_time * 1000, 2),
                'page_size': self.get_page_size(self.request),
                'query_optimized': hasattr(self.request, '_query_optimized')
            },
            'pagination': {
                'total': self.page.paginator.count,
                'page': self.page.number,
                'pages': self.page.paginator.num_pages
            },
            'data': data
        })


class DateRangePagination(PageNumberPagination):
    """
    Pagination pour les données par plage de dates
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    
    def get_paginated_response(self, data):
        # Extraire les paramètres de date de la requête
        start_date = self.request.query_params.get('start_date', 'Non spécifié')
        end_date = self.request.query_params.get('end_date', 'Non spécifié')
        
        return Response({
            'date_range': {
                'start': start_date,
                'end': end_date
            },
            'pagination': {
                'total': self.page.paginator.count,
                'page': self.page.number,
                'total_pages': self.page.paginator.num_pages,
                'has_next': self.page.has_next(),
                'has_previous': self.page.has_previous()
            },
            'data': data
        })


class StoreSpecificPagination(PageNumberPagination):
    """
    Pagination spécifique aux données de boutique
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        store_id = self.request.query_params.get('store_id')
        store_name = "Toutes les boutiques"
        
        if store_id:
            from .models import Store
            try:
                store = Store.objects.only('name').get(id=store_id)
                store_name = store.name
            except Store.DoesNotExist:
                store_name = f"Boutique #{store_id}"
        
        return Response({
            'store_context': {
                'id': store_id,
                'name': store_name
            },
            'pagination': {
                'total': self.page.paginator.count,
                'page': self.page.number,
                'page_size': self.get_page_size(self.request)
            },
            'data': data
        })


# Configuration de pagination par défaut pour différents types de vues
PAGINATION_CLASSES = {
    'default': StandardPageNumberPagination,
    'large': LargeResultsSetPagination,
    'small': SmallResultsSetPagination,
    'dashboard': DashboardPagination,
    'analytics': AnalyticsPagination,
    'cursor': CursorPaginationWithCount,
    'custom': CustomPageNumberPagination,
    'optimized': OptimizedPagination,
    'date_range': DateRangePagination,
    'store': StoreSpecificPagination,
    'none': NoPagination,
}


def get_pagination_class(pagination_type='default'):
    """
    Retourne la classe de pagination en fonction du type
    """
    return PAGINATION_CLASSES.get(pagination_type, StandardPageNumberPagination)


class PaginationMixin:
    """
    Mixin pour ajouter facilement la pagination aux ViewSets
    """
    pagination_class = StandardPageNumberPagination
    
    @classmethod
    def get_pagination_class_for_model(cls, model_name):
        """
        Retourne la classe de pagination appropriée en fonction du modèle
        """
        pagination_map = {
            'Order': CustomPageNumberPagination,
            'Sale': CustomPageNumberPagination,
            'Product': LargeResultsSetPagination,
            'Customer': StandardPageNumberPagination,
            'Employee': SmallResultsSetPagination,
            'Stock': LargeResultsSetPagination,
            'Transaction': AnalyticsPagination,
            'Dashboard': DashboardPagination,
        }
        
        return pagination_map.get(model_name, StandardPageNumberPagination)
    
    def get_paginated_response(self, data):
        """
        Surcharge pour ajouter des métadonnées contextuelles
        """
        response = super().get_paginated_response(data)
        
        # Ajouter des informations contextuelles
        if hasattr(self, 'get_context_data'):
            context_data = self.get_context_data()
            if context_data:
                response.data['context'] = context_data
        
        return response