# api_boutique_core/views/auth_views.py
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour l'authentification JWT
    Désactive la vérification CSRF pour l'API
    """
    
    def post(self, request, *args, **kwargs):
        try:
            # Utilise la logique parente mais sans CSRF
            response = super().post(request, *args, **kwargs)
            return response
        except Exception as e:
            return Response(
                {
                    'error': 'Erreur d\'authentification',
                    'detail': str(e)
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )