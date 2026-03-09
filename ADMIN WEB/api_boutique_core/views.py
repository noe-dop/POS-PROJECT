# views.py
from rest_framework import viewsets, status, filters, generics,permissions
from rest_framework.decorators import action
from django.db.models import Exists, OuterRef
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Sum, Count, Avg, F
from django.db.models.functions import Coalesce
from datetime import timedelta
import json
from django.http import HttpResponse
import csv
from datetime import datetime

from .permissions import IsAdminOrOwner, CanManageStoreProducts
# Import des modèles
from .models import (
    User, Owner, Shareholder, Customer, Address, Currency,
    StoreType, StoreNetwork, Store, StoreOwnership, StoreShareholder, Department,
    EmployeeRole, Employee, Session, ActivityLog, SousService,
    TypeCard, Card, CardTransaction, LoyaltyProgram, LoyaltyReward,
    Supplier, Supply, RetailSupply,
    ProductCategory, ProductBrand, Product, ProductVariant,
    Warehouse, Batch, Stock, ReorderRule, StockMovement, StockMovementItem,
    InventoryCount, InventoryCountItem, StoreProduct, StoreProductVariant,
    CashRegister, CashRegisterSession, CashTransaction,
    PaymentMethod, SaleStatus, Sale, SalePayment, SaleItem,
    DeliveryAddress, DeliveryVehicle, DeliveryRoute, Delivery, DeliverySchedule,
    ReturnReason, ProductReturn, ReturnItem, Refund, ReturnedProduct,
    Transaction, MobileMoney, Unite, WithdrawalCode,
    Promotion, Campaign,
    ExpenseCategory, Expense, TaxRate, AccountingPeriod, GeneralLedger, FinancialReport,
    KPI, KPIMeasurement, Dashboard,
    SecurityIncident, DataBackup, MaintenanceTask, SupportTicket, ErrorReport,
    # NOUVEAUX MODÈLES ORDERS
    OrderStatus, OrderSource, Order, OrderItem
)

# Import de tous les sérialiseurs
from .serializers import *

class LoginView(APIView):
    """
    Connexion et génération de token
    POST /api/auth/login/
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response({
                "success": False,
                "message": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        # Mettre a jour le Last_login
        user.last_login = timezone.now()
        user.save(update_fields = ["last_login"]) # Pour ne sauvegarder que ce champ
        # Générer les tokens JWT (Simple JWT) 
        refresh = RefreshToken.for_user(user)

        # Préparer les données de réponse
        response_data = {
            "success": True,
            "message": "Connexion réussie",
            "access": str(refresh.access_token), # Token d'accès
            "refresh": str(refresh),          # Token de rafraîchissement
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.get_full_name(),
                "phone": user.phone,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "last_login": user.last_login,
                "created_at": user.date_joined,
            },
            'expires_in': refresh.access_token.lifetime.total_seconds()
        }
        
        # Ajouter le rôle de l'utilisateur
        if hasattr(user, 'owner'):
            owner = user.owner
            response_data["user"]["role"] = "owner"
            response_data["user"]["owner_profile"] = {
                "id": owner.id,
                "photo": owner.photo if owner.photo else None,
                "created_at": owner.created_at
            }
            
        elif hasattr(user, 'employee'):
            response_data["user"]["role"] = "employee"
            response_data["user"]["employee_id"] = user.employee.id
            response_data["user"]["store_id"] = user.employee.store_id
            response_data["user"]["role_name"] = user.employee.role.name
            response_data["user"]["department"] = user.employee.department.name if user.employee.department else None
            
        elif hasattr(user, 'shareholder'):
            response_data["user"]["role"] = "shareholder"
            response_data["user"]["shareholder_id"] = user.shareholder.id
            response_data["user"]["investment_amount"] = user.shareholder.investment_amount
            
        elif hasattr(user, 'customer'):
            response_data["user"]["role"] = "customer"
            response_data["user"]["customer_id"] = user.customer.id
            response_data["user"]["loyalty_points"] = user.customer.loyalty_points
            
        else:
            response_data["user"]["role"] = "user"  # Pas de profil spécifique
        
        return Response(response_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Déconnexion - Suppression du token
    POST /api/auth/logout/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        # Supprimer le token
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()  

                return Response({
                    "success": True,
                    "message": "Déconnexion réussie"
                }, status=status.HTTP_205_RESET_CONTENT)
            else:
                return Response({
                    "success": False,
                    "message": "Token de rafraîchissement manquant"
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "success": False,
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response({
            "success": True,
            "message": "Email de réinitialisation envoyé.",
            "uid": result['uid'],
            "token": result['token'],  # En dev seulement!
        }, status=status.HTTP_200_OK)

class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            "success": True,
            "message": "Mot de passe réinitialisé avec succès."
        }, status=status.HTTP_200_OK)
    
# ===========================
# VUE DES PROFILS UTILISATEURS
# ===========================

class UserProfileView(APIView):
    """
    Récupérer le profil de l'utilisateur connecté
    #GET /api/auth/profile/
    #PATCH /api/auth/profile/
    #PUT /api/auth/profile/"""
    def get(self, request, *args, **kwargs):
        """Récupérer le profil"""
        user = request.user
        
        response_data = {
            "success": True,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": user.get_full_name(),
                "phone": user.phone,
                "address": user.address,
                "phone": getattr(user, 'phone', ''),
                "address": getattr(user, 'address', ''),
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "date_joined": user.date_joined,
                "last_login": user.last_login,
            }
        }
        
        # Ajouter les infos spécifiques au rôle
        if hasattr(user, 'owner'):
            owner = user.owner
            response_data["user"]["role"] = "owner"
            response_data["user"]["owner_profile"] = {
                "id": owner.id,
                "photo": owner.photo if owner.photo else None,
                "created_at": owner.created_at
            }
            
        elif hasattr(user, 'employee'):
            employee = user.employee
            response_data["user"]["role"] = "employee"
            response_data["user"]["employee_profile"] = {
                "id": employee.id,
                "store_id": employee.store_id,
                "store_name": employee.store.name,
                "role_id": employee.role_id,
                "role_name": employee.role.name,
                "department": employee.department.name if employee.department else None,
                "hire_date": employee.hire_date,
                "salary": employee.salary,
                "is_active": employee.is_active,
                "photo": employee.photo if employee.photo else None
            }
            
        elif hasattr(user, 'shareholder'):
            shareholder = user.shareholder
            response_data["user"]["role"] = "shareholder"
            response_data["user"]["shareholder_profile"] = {
                "id": shareholder.id,
                "investment_amount": shareholder.investment_amount,
                "photo": shareholder.photo if shareholder.photo else None
            }
            
        elif hasattr(user, 'customer'):
            customer = user.customer
            response_data["user"]["role"] = "customer"
            response_data["user"]["customer_profile"] = {
                "id": customer.id,
                "birth_date": customer.birth_date,
                "loyalty_points": customer.loyalty_points,
                "total_spent": customer.total_spent,
                "first_purchase": customer.first_purchase,
                "last_purchase": customer.last_purchase
            }
    
        return Response(response_data, status=status.HTTP_200_OK)
    
    def patch(self, request, *args, **kwargs):
        """Mettre à jour partiellement le profil"""
        user = request.user
        
        # Mettre à jour les champs de l'utilisateur
        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        if 'email' in request.data:
            user.email = request.data['email']
        if 'phone' in request.data:
            user.phone = request.data['phone']
        if 'address' in request.data:
            user.address = request.data['address']
        
        user.save()
        
        # Gérer la photo selon le profil
        if 'photo' in request.FILES:
            photo = request.FILES['photo']
            
            if hasattr(user, 'owner'):
                user.owner.photo = photo
                user.owner.save()
            elif hasattr(user, 'employee'):
                user.employee.photo = photo
                user.employee.save()
            elif hasattr(user, 'customer'):
                user.customer.photo = photo
                user.customer.save()
            elif hasattr(user, 'shareholder'):
                user.shareholder.photo = photo
                user.shareholder.save()
        
        # Retourner le profil mis à jour
        return self.get(request)
    
    def put(self, request, *args, **kwargs):
        """Mettre à jour complètement le profil (alias pour PATCH)"""
        return self.patch(request, *args, **kwargs)

        # api_boutique_core/views.py

# Ajoutez cette nouvelle classe APRÈS UserProfileView
class ChangePasswordView(APIView):
    """
    Changer le mot de passe de l'utilisateur connecté
    POST /api/auth/change-password/
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        # Vérifications
        if not current_password or not new_password:
            return Response({
                'success': False,
                'error': 'Les mots de passe sont requis'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier l'ancien mot de passe
        if not user.check_password(current_password):
            return Response({
                'success': False,
                'error': 'Mot de passe actuel incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier la longueur du nouveau mot de passe
        if len(new_password) < 6:
            return Response({
                'success': False,
                'error': 'Le nouveau mot de passe doit contenir au moins 6 caractères'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier que le nouveau mot de passe est différent
        if user.check_password(new_password):
            return Response({
                'success': False,
                'error': 'Le nouveau mot de passe doit être différent de l\'ancien'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Changer le mot de passe
        user.set_password(new_password)
        user.save()
        
        # 🚫 OPTION SUPPRIMÉE - La méthode blacklist() n'existe pas
        # from rest_framework_simplejwt.tokens import RefreshToken
        # RefreshToken.for_user(user).blacklist()  ← À SUPPRIMER
        
        return Response({
            'success': True,
            'message': 'Mot de passe modifié avec succès'
        }, status=status.HTTP_200_OK)
    
# =============================================================================
# VUES D'AUTHENTIFICATION
# =============================================================================

class OwnerRegisterView(generics.CreateAPIView):
    """Création d'un Owner"""
    serializer_class = OwnerCreateSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        owner = serializer.save()
        
        return Response({
            "success": True,
            "message": "Owner créé avec succès",
            "user": {
                "id": owner.id,
                "user_id": owner.user.id,
                "username": owner.user.username,
                "email": owner.user.email,
                "full_name": owner.user.get_full_name(),
                "photo_url": owner.photo if owner.photo else None
            }
        }, status=201)
    
class EmployeeRegisterView(generics.CreateAPIView):
    """Création d'un Employee"""
    serializer_class = EmployeeCreateSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        
        
        return Response({
            "success": True,
            "message": "Employé créé avec succès",
            "user": {
                "id": user.employee.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.get_full_name(),
                "photo_url": user.photo.url if user.photo else None,
                "store": user.employee.store.name,
                "role": user.employee.role.name,
                "department": user.employee.department.name if user.employee.department else None,
                "hire_date": user.employee.hire_date,
                "last_login": user.last_login,
            }
        }, status=201)
    
class ShareholderRegisterView(generics.CreateAPIView):
    serializer_class = ShareholderCreateSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.save()
        shareholder = user.shareholder
        
        return Response({
            "success": True,
            "message": "Actionnaire créé avec succès",
            "user": {
                "id": shareholder.id,
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.get_full_name(),
                "investment_amount": shareholder.investment_amount,
                "last_login": user.last_login,
            }
        }, status=201)

class CheckUsernameView(APIView):
    """
    Vérifie si un nom d'utilisateur est disponible
    """
    permission_classes = [AllowAny]
    
    def get(self, request, username):
        # Vérifier si le nom d'utilisateur existe déjà
        username_exists = User.objects.filter(username__iexact=username).exists()
        
        # Validation basique
        if len(username) < 3:
            return Response({
                'available': False,
                'message': 'Le nom d\'utilisateur doit contenir au moins 3 caractères'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Vérifier les caractères autorisés
        if not all(c.isalnum() or c in ['_', '-'] for c in username):
            return Response({
                'available': False,
                'message': 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, underscores et tirets'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'available': not username_exists,
            'message': 'Nom d\'utilisateur disponible' if not username_exists else 'Ce nom d\'utilisateur est déjà pris'
        })


# =============================================================================
# VIEWSETS DE BASE
# =============================================================================

class BaseAuditViewSet(viewsets.ModelViewSet):
    """ViewSet de base avec gestion d'audit"""
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None,
            updated_by=self.request.user if self.request.user.is_authenticated else None
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user if self.request.user.is_authenticated else None)


# =============================================================================
# TABLEAU DE BORD - VUE PRINCIPALE (APIView)
# =============================================================================

class DashboardDataView(APIView):  # RENOMMÉ pour éviter le conflit
    """
    Vue principale pour le tableau de bord avec données agrégées (APIView)
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            time_range = request.GET.get('time_range', 'today')
            
            # Calcul des dates selon la période
            today = timezone.now().date()
            if time_range == 'today':
                start_date = today
            elif time_range == 'week':
                start_date = today - timedelta(days=7)
            elif time_range == 'month':
                start_date = today - timedelta(days=30)
            elif time_range == 'quarter':
                start_date = today - timedelta(days=90)
            elif time_range == 'year':
                start_date = today - timedelta(days=365)
            else:
                start_date = today

            # STATISTIQUES PRINCIPALES
            total_stores = Store.objects.filter(is_active=True).count()
            total_employees = Employee.objects.filter(is_active=True).count()
            
            # Ventes du jour
            total_sales_today = Sale.objects.filter(
                sale_date__date=today
            ).count()
            
            # Commandes du jour
            total_orders_today = Order.objects.filter(
                order_date__date=today
            ).count()
            
            # Chiffre d'affaires total
            total_revenue_result = Sale.objects.aggregate(
                total=Sum('total_amount')
            )
            total_revenue = total_revenue_result['total'] or 0
            
            # Alertes stock faible
            low_stock_alerts = Stock.objects.filter(
                quantity_available__lte=F('min_stock_threshold'),
                quantity_available__gt=0
            ).count()

            # Commandes en attente
            pending_orders = Order.objects.filter(status__code='pending').count()

            # VENTES MENSUELLES (12 derniers mois)
            monthly_sales = []
            monthly_orders = []
            for i in range(12):
                month_start = today.replace(day=1) - timedelta(days=30*i)
                month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                
                month_revenue = Sale.objects.filter(
                    sale_date__date__range=[month_start, month_end]
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                month_orders_count = Order.objects.filter(
                    order_date__date__range=[month_start, month_end]
                ).count()
                
                monthly_sales.append(float(month_revenue))
                monthly_orders.append(month_orders_count)
            
            monthly_sales.reverse()  # Du plus ancien au plus récent
            monthly_orders.reverse()

            # RÉPARTITION DU STOCK PAR CATÉGORIE
            stock_by_category = {}
            categories = ProductCategory.objects.filter(is_active=True)
            for category in categories:
                category_stock = Stock.objects.filter(
                    product__category=category,
                    quantity_available__gt=0
                ).aggregate(total=Sum('quantity_available'))['total'] or 0
                if category_stock > 0:
                    stock_by_category[category.name] = int(category_stock)

            # PRODUITS EN STOCK FAIBLE
            low_stock_products = Product.objects.filter(
                stocks__quantity_available__lte=F('stocks__min_stock_threshold'),
                stocks__quantity_available__gt=0,
                is_active=True
            ).distinct()[:10]

            low_stock_products_data = []
            for product in low_stock_products:
                stock = product.stocks.first()
                if stock:
                    low_stock_products_data.append({
                        'id': product.id,
                        'name': product.name,
                        'sku': product.sku,
                        'category_name': product.category.name if product.category else 'Non catégorisé',
                        'base_price': float(product.base_price),
                        'current_stock': stock.quantity_available,
                        'min_stock_threshold': stock.min_stock_threshold,
                        'stock_status': stock.stock_status
                    })

            # VENTES RÉCENTES (10 dernières)
            recent_sales = Sale.objects.select_related(
                'customer__user', 'employee__user', 'store'
            ).order_by('-sale_date')[:10]

            recent_sales_data = []
            for sale in recent_sales:
                recent_sales_data.append({
                    'id': sale.id,
                    'ticket_number': sale.ticket_number,
                    'customer_name': sale.customer.user.get_full_name() if sale.customer and sale.customer.user else 'Client inconnu',
                    'employee_name': sale.employee.user.get_full_name() if sale.employee and sale.employee.user else 'Employé inconnu',
                    'total_amount': float(sale.total_amount),
                    'status': sale.status.name if sale.status else 'Non défini',
                    'sale_date': sale.sale_date.isoformat(),
                    'items_count': sale.items.count(),
                    'store_name': sale.store.name
                })

            # COMMANDES RÉCENTES (10 dernières)
            recent_orders = Order.objects.select_related(
                'customer__user', 'store', 'status'
            ).order_by('-order_date')[:10]

            recent_orders_data = []
            for order in recent_orders:
                recent_orders_data.append({
                    'id': order.id,
                    'order_number': order.order_number,
                    'customer_name': order.customer_name,
                    'store_name': order.store.name if order.store else '',
                    'status': order.status.name if order.status else '',
                    'total_amount': float(order.total_amount),
                    'order_date': order.order_date.isoformat(),
                    'expected_delivery_date': order.expected_delivery_date.isoformat() if order.expected_delivery_date else '',
                    'payment_status': order.payment_status,
                    'converted_to_sale': order.converted_to_sale,
                    'items_count': order.items.count()
                })

            # EMPLOYÉS RÉCENTS (10 derniers)
            recent_employees = Employee.objects.select_related(
                'user', 'role', 'store'
            ).filter(is_active=True).order_by('-hire_date')[:10]

            recent_employees_data = []
            for employee in recent_employees:
                recent_employees_data.append({
                    'id': employee.id,
                    'full_name': employee.user.get_full_name() if employee.user else 'Nom inconnu',
                    'user_email': employee.user.email if employee.user else '',
                    'user_phone': employee.user.phone if employee.user else '',
                    'role_name': employee.role.name if employee.role else 'Non défini',
                    'store_name': employee.store.name,
                    'hire_date': employee.hire_date.isoformat(),
                    'is_active': employee.is_active
                })

            # BOUTIQUES ACTIVES
            active_stores = Store.objects.filter(is_active=True)[:5]
            
            stores_data = []
            for store in active_stores:
                # Calcul du revenu de la boutique
                store_revenue = Sale.objects.filter(
                    store=store
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                # Nombre d'employés
                employee_count = Employee.objects.filter(store=store, is_active=True).count()
                
                # Nombre de commandes
                orders_count = Order.objects.filter(store=store).count()
                
                stores_data.append({
                    'id': store.id,
                    'name': store.name,
                    'slug': store.slug,
                    'store_type': store.store_type.name if store.store_type else 'Non spécifié',
                    'phone': store.phone or '',
                    'email': store.email or '',
                    'is_active': store.is_active,
                    'created_at': store.created_at.isoformat(),
                    'revenue': float(store_revenue),
                    'employee_count': employee_count,
                    'orders_count': orders_count
                })

            # PRODUITS LES PLUS VENDUS
            top_selling_products = SaleItem.objects.values(
                'product__name'
            ).annotate(
                quantity=Sum('quantity'),
                revenue=Sum('line_total')
            ).order_by('-quantity')[:5]

            top_selling_products_data = []
            for item in top_selling_products:
                top_selling_products_data.append({
                    'product': item['product__name'] or 'Produit inconnu',
                    'quantity': item['quantity'] or 0,
                    'revenue': float(item['revenue'] or 0)
                })

            # DISTRIBUTION DES MÉTHODES DE PAIEMENT
            payment_methods_distribution = []
            payment_stats = SalePayment.objects.values(
                'payment_method__name'
            ).annotate(
                amount=Sum('amount'),
                count=Count('id')
            )
            
            total_payments = SalePayment.objects.aggregate(total=Sum('amount'))['total'] or 0
            
            for stat in payment_stats:
                if total_payments > 0:
                    percentage = (stat['amount'] / total_payments) * 100
                else:
                    percentage = 0
                    
                payment_methods_distribution.append({
                    'method': stat['payment_method__name'] or 'Inconnu',
                    'amount': float(stat['amount'] or 0),
                    'count': stat['count'] or 0,
                    'percentage': round(percentage, 2)
                })

            # PRÉPARATION DE LA RÉPONSE FINALE
            data = {
                'stats': {
                    'total_stores': total_stores,
                    'total_employees': total_employees,
                    'total_sales_today': total_sales_today,
                    'total_orders_today': total_orders_today,
                    'total_revenue': float(total_revenue),
                    'low_stock_alerts': low_stock_alerts,
                    'pending_orders': pending_orders
                },
                'stores': stores_data,
                'recent_sales': recent_sales_data,
                'recent_orders': recent_orders_data,
                'employees': recent_employees_data,
                'low_stock_products': low_stock_products_data,
                'monthly_sales': monthly_sales,
                'monthly_orders': monthly_orders,
                'stock_by_category': stock_by_category,
                'top_selling_products': top_selling_products_data,
                'payment_methods_distribution': payment_methods_distribution,
                'time_range': time_range,
                'last_updated': timezone.now().isoformat()
            }
            
            return Response(data)
            
        except Exception as e:
            print(f"Erreur dans DashboardDataView: {str(e)}")
            import traceback
            print(traceback.format_exc())
            
            return Response(
                {'error': 'Erreur lors de la récupération des données du dashboard', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# REQUESTS API VIEW - VOUS L'AVEZ DÉJÀ MAIS JE LA PLACE ICI
# =============================================================================

class RequestsAPIView(APIView):
    """
    Endpoint pour /api/requests/
    Fournit des informations sur l'API
    """
    permission_classes = [AllowAny]
    
    def get(self, request, format=None):
        """Retourne les informations sur l'API"""
        base_url = request.build_absolute_uri('/')
        
        return Response({
            'application': 'Boutique Management System API',
            'version': '1.0.0',
            'status': 'active',
            'timestamp': timezone.now().isoformat(),
            'documentation': f'{base_url}swagger/',
            'endpoints': {
                'orders': f'{base_url}api/orders/',
                'sales': f'{base_url}api/sales/',
                'products': f'{base_url}api/products/',
                'customers': f'{base_url}api/customers/',
                'employees': f'{base_url}api/employees/',
                'stores': f'{base_url}api/stores/',
                'dashboard': f'{base_url}dashboard/'
            },
            'message': 'API fonctionnelle'
        })


# =============================================================================
# UTILISATEURS ET AUTHENTIFICATION
# =============================================================================

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['is_active', 'is_staff']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['date_joined', 'last_login']
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Obtenir le profil de l'utilisateur connecté"""
        if not request.user.is_authenticated:
            return Response({'error': 'Non authentifié'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activer/désactiver un utilisateur"""
        if not request.user.is_authenticated:
            return Response({'error': 'Non authentifié'}, status=status.HTTP_401_UNAUTHORIZED)
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)

class OwnerViewSet(viewsets.ModelViewSet):
    queryset = Owner.objects.select_related('user')
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OwnerCreateSerializer
        return OwnerSerializer
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class ShareholderViewSet(viewsets.ModelViewSet):
    queryset = Shareholder.objects.select_related('user')
    permission_classes = [AllowAny]
    filterset_fields = ['investment_amount']
    search_fields = ['user__first_name', 'user__last_name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ShareholderCreateSerializer
        return ShareholderSerializer
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related('user')
    permission_classes = [AllowAny]
    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        return CustomerSerializer
    filterset_fields = ['loyalty_points']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Utilise le sérialiseur de création (CustomerCreateSerializer)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()  # retourne une instance Customer

        # Utilise le sérialiseur de lecture (CustomerSerializer) pour la réponse
        response_serializer = CustomerSerializer(customer, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def purchase_history(self, request, pk=None):
        """Historique des achats d'un client"""
        customer = self.get_object()
        sales = Sale.objects.filter(customer=customer).order_by('-sale_date')
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def order_history(self, request, pk=None):
        """Historique des commandes d'un client"""
        customer = self.get_object()
        orders = Order.objects.filter(customer=customer).order_by('-order_date')
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)


# =============================================================================
# BOUTIQUES ET MAGASINS
# =============================================================================

class StoreTypeViewSet(viewsets.ModelViewSet):
    queryset = StoreType.objects.all()
    serializer_class = StoreTypeSerializer
    permission_classes = [AllowAny]

class StoreNetworkViewSet(viewsets.ModelViewSet):
    queryset = StoreNetwork.objects.select_related('headquarters')
    serializer_class = StoreNetworkSerializer
    permission_classes = [AllowAny]

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related('store_type', 'network', 'address').all()
    
    def get_serializer_class(self):
        # Utiliser StoreCreateSerializer pour la création
        if self.action == 'create':
            return StoreCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return StoreUpdateSerializer
        # StoreSerializer pour les autres actions
        return StoreSerializer
    
    def get_permissions(self):
        """Permissions adaptées à chaque action"""
        if self.action in ['list','public_products']:
            # Public: voir les boutiques
            return [permissions.AllowAny()]
        elif self.action in [ 'retrieve', 'nearby','my_accessible_stores', 'dashboard',
                             'available_products','products']:
            # Connecté: voir ses boutiques accessibles
            return [permissions.IsAuthenticated()]
        else:
            # Création/modification: admin ou propriétaire
            return [permissions.IsAuthenticated(), IsAdminOrOwner()]
    
    def get_queryset(self):
        """Filtrer selon le rôle et les permissions"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # Pour les actions publiques: seulement boutiques actives
        if self.action in ['list', 'retrieve', 'nearby','public_products']:
            return queryset.filter(is_active=True)
        
        # Pour utilisateur non connecté
        if not user.is_authenticated:
            return queryset.none()
        
        # Superuser voit tout
        if user.is_superuser:
            return queryset
        
        # Propriétaire: voit ses boutiques
        if hasattr(user, 'owner'):
            owner = user.owner
            store_ids = StoreOwnership.objects.filter(owner=owner).values_list('store_id', flat=True)
            return queryset.filter(id__in=store_ids)
        
        # Employé: voit les boutiques où il a des permissions
        if hasattr(user, 'employee'):
            employee = user.employee
            # Récupérer les boutiques où l'employé a des permissions actives
            store_ids = StorePermission.objects.filter(
                employee=employee,
                is_active=True,
                valid_until__gte=timezone.now().date()
            ).values_list('store_id', flat=True)
            return queryset.filter(id__in=store_ids)
        
        return queryset.none()
    
    @action(detail=False, methods=['get'])
    def my_accessible_stores(self, request):
        """
        Retourne toutes les boutiques accessibles à l'utilisateur connecté
        avec le niveau de permission pour chaque boutique
        """
        user = request.user
        
        if not user.is_authenticated:
            return Response({'error': 'Authentification requise'}, status=401)
        
        stores = self.get_queryset()
        
        # Pour chaque boutique, déterminer le niveau d'accès
        stores_with_permissions = []
        for store in stores:
            store_data = StoreSerializer(store).data
            
            # Déterminer le rôle/permissions
            if user.is_superuser:
                role = 'superadmin'
                permissions = ['all']
            elif hasattr(user, 'owner'):
                # Vérifier si c'est le propriétaire principal
                is_primary = StoreOwnership.objects.filter(
                    store=store,
                    owner=user.owner,
                    is_primary=True
                ).exists()
                role = 'owner_primary' if is_primary else 'owner'
                permissions = ['all']
            elif hasattr(user, 'employee'):
                employee = user.employee
                store_permission = StorePermission.objects.filter(
                    employee=employee,
                    store=store,
                    is_active=True
                ).first()
                
                if store_permission:
                    role = store_permission.permission_type
                    permissions = []
                    if store_permission.can_manage_employees:
                        permissions.append('manage_employees')
                    if store_permission.can_manage_products:
                        permissions.append('manage_products')
                    if store_permission.can_manage_sales:
                        permissions.append('manage_sales')
                    if store_permission.can_view_reports:
                        permissions.append('view_reports')
                else:
                    continue  # L'employé n'a pas accès à cette boutique
            else:
                continue
            
            stores_with_permissions.append({
                **store_data,
                'access_role': role,
                'permissions': permissions,
            })
        
        return Response(stores_with_permissions)
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Dashboard d'une boutique avec vérification des permissions"""
        store = self.get_object()
        user = request.user
        
        # Vérifier les permissions d'accès à cette boutique
        if not self._has_store_access(user, store):
            raise PermissionDenied("Vous n'avez pas accès à cette boutique")
        
        # Récupérer les permissions spécifiques
        user_permissions = self._get_user_store_permissions(user, store)
        
        # Statistiques selon les permissions
        dashboard_data = {
            'store': StoreSerializer(store).data,
            'user_permissions': user_permissions,
            'statistics': self._get_store_statistics(store, user_permissions),
        }
        
        return Response(dashboard_data)
    
    def _has_store_access(self, user, store):
        """Vérifie si l'utilisateur a accès à la boutique"""
        if user.is_superuser:
            return True
        
        if hasattr(user, 'owner_profile'):
            return StoreOwnership.objects.filter(
                owner=user.owner_profile,
                store=store
            ).exists()
        
        if hasattr(user, 'employee_profile'):
            return StorePermission.objects.filter(
                employee=user.employee_profile,
                store=store,
                is_active=True,
                valid_until__gte=timezone.now().date()
            ).exists()
        
        return False
    
    def _get_user_store_permissions(self, user, store):
        """Retourne les permissions spécifiques de l'utilisateur pour cette boutique"""
        if user.is_superuser:
            return {
                'role': 'superadmin',
                'can_manage_all': True,
                'permissions': ['all']
            }
        
        if hasattr(user, 'owner_profile'):
            is_primary = StoreOwnership.objects.filter(
                store=store,
                owner=user.owner_profile,
                is_primary=True
            ).exists()
            return {
                'role': 'owner_primary' if is_primary else 'owner',
                'can_manage_all': True,
                'permissions': ['all']
            }
        
        if hasattr(user, 'employee_profile'):
            permission = StorePermission.objects.filter(
                employee=user.employee_profile,
                store=store,
                is_active=True
            ).first()
            
            if permission:
                return {
                    'role': permission.permission_type,
                    'can_manage_employees': permission.can_manage_employees,
                    'can_manage_products': permission.can_manage_products,
                    'can_manage_sales': permission.can_manage_sales,
                    'can_view_reports': permission.can_view_reports,
                    'valid_until': permission.valid_until,
                }
        
        return {'role': 'no_access'}
    
    def _get_store_statistics(self, store, user_permissions):
        """Retourne les statistiques selon les permissions de l'utilisateur"""
        today = timezone.now().date()
        stats = {}
        
        # Statistiques de base (toujours visibles)
        stats['active_employees'] = Employee.objects.filter(
            store=store, 
            is_active=True
        ).count()
        
        stats['total_products'] = store.store_products.filter(
            is_active=True
        ).count()
        
        # Statistiques conditionnelles
        if user_permissions.get('can_view_reports') or user_permissions.get('role') in ['owner', 'owner_primary', 'superadmin']:
            # Ventes du jour
            daily_sales = Sale.objects.filter(
                store=store,
                sale_date__date=today
            ).aggregate(
                total_amount=Sum('total_amount'),
                count_sales=Count('id')
            )
            
            stats['daily_sales'] = daily_sales['total_amount'] or 0
            stats['daily_sales_count'] = daily_sales['count_sales'] or 0
        
        if user_permissions.get('can_manage_products') or user_permissions.get('role') in ['owner', 'owner_primary', 'superadmin']:
            # Stock bas
            stats['low_stock_items'] = Stock.objects.filter(
                store=store,
                quantity_available__lte=F('min_stock_threshold')
            ).count()
        
        return stats
    
    @action(detail=True, methods=['get'])
    def public_products(self, request, pk=None):
        """
        Retourne les produits de la boutique avec les informations publiques
        (sans prix d'achat, ni données internes).
        """
        store = self.get_object()  # Vérifie que la boutique existe et est active (via get_queryset)
        store_products = StoreProduct.objects.filter(store=store, is_active=True)
        serializer = StoreProductPublicSerializer(store_products, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        store = self.get_object()
        store_products = StoreProduct.objects.filter(store=store, is_active=True)
        serializer = StoreProductSerializer(store_products, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='available-products')
    def available_products(self, request, pk=None):
        store = self.get_object()  # Vérifie l'accès via permissions du viewset
        # Produits non liés
        has_store_product = StoreProduct.objects.filter(
            store=store,
            product=OuterRef('pk')
        )
        products = Product.objects.filter(is_active=True).annotate(
            is_linked=Exists(has_store_product)
        ).filter(is_linked=False)
        
        page = self.paginate_queryset(products)
        if page is not None:
            serializer = ProductSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related('store', 'manager__user')
    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store']

# =============================================================================
# 1. EMPLOYÉS ET RÔLES - DÉFINIS EN PREMIER
# =============================================================================

class EmployeeRoleViewSet(viewsets.ModelViewSet):
    """CRUD pour les rôles d'employés"""
    queryset = EmployeeRole.objects.all()
    serializer_class = EmployeeRoleSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['code', 'name']
    search_fields = ['code', 'name', 'description']


class EmployeeViewSet(viewsets.ModelViewSet):
    """CRUD pour les employés"""
    queryset = Employee.objects.select_related('user', 'store', 'role', 'department').all()
    serializer_class = EmployeeSerializer
    permission_classes = [AllowAny]
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    filterset_fields = ['store', 'department', 'role', 'is_active']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Activer/désactiver un employé"""
        employee = self.get_object()
        employee.is_active = not employee.is_active
        employee.save()
        
        return Response({
            "success": True,
            "message": f"Employé {'activé' if employee.is_active else 'désactivé'}",
            "is_active": employee.is_active
        })


class EmployeeRegisterView(generics.CreateAPIView):
    """Inscription d'un nouvel employé"""
    serializer_class = EmployeeCreateSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        employe = serializer.save()
        
        return Response({
            "success": True,
            "message": "Employé créé avec succès",
            "employee": {
                "id": employe.id,
                "username": employe.user.username,
                "email": employe.user.email,
                "first_name": employe.user.first_name,
                "last_name": employe.user.last_name,
                "store": employe.store.name,
                "role": employe.role.name,
                "hire_date": employe.hire_date
            }
        }, status=status.HTTP_201_CREATED)


# =============================================================================
# SESSIONS ET JOURNALISATION
# =============================================================================

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.select_related('user', 'store')
    serializer_class = SessionSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['user', 'store']
    
    @action(detail=True, methods=['post'])
    def logout(self, request, pk=None):
        """Terminer une session"""
        session = self.get_object()
        session.logout_time = timezone.now()
        session.save()
        
        serializer = self.get_serializer(session)
        return Response(serializer.data)

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.select_related('user', 'session')
    serializer_class = ActivityLogSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['user', 'model_name', 'action']
    search_fields = ['action', 'model_name']
    ordering_fields = ['timestamp']

class SousServiceViewSet(viewsets.ModelViewSet):
    queryset = SousService.objects.select_related('session')
    serializer_class = SousServiceSerializer
    permission_classes = [AllowAny]
    
    @action(detail=True, methods=['post'])
    def end_service(self, request, pk=None):
        """Terminer un sous-service"""
        sous_service = self.get_object()
        sous_service.end_service = timezone.now()
        sous_service.save()
        
        serializer = self.get_serializer(sous_service)
        return Response(serializer.data)


# =============================================================================
# CARTES ET FIDÉLISATION
# =============================================================================

class TypeCardViewSet(viewsets.ModelViewSet):
    queryset = TypeCard.objects.all()
    serializer_class = TypeCardSerializer
    permission_classes = [AllowAny]

class CardViewSet(viewsets.ModelViewSet):
    queryset = Card.objects.select_related('type_card', 'client__user')
    serializer_class = CardSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['type_card', 'statut']
    search_fields = ['num_card', 'client__user__first_name', 'client__user__last_name']
    
    @action(detail=True, methods=['get'])
    def solde(self, request, pk=None):
        """Obtenir le solde d'une carte"""
        card = self.get_object()
        return Response({
            'num_card': card.num_card,
            'solde': card.solde,
            'max_credit': card.max_credit,
            'plafond': card.plafond,
            'client': str(card.client)
        })
    
    @action(detail=True, methods=['post'])
    def recharger(self, request, pk=None):
        """Recharger une carte"""
        card = self.get_object()
        montant = request.data.get('montant')
        
        if not montant or float(montant) <= 0:
            return Response({
                'error': 'Montant invalide'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            transaction_obj = CardTransaction.objects.create(
                card=card,
                type_transaction='depot',
                montant=montant
            )
            
            card.solde += float(montant)
            card.save()
        
        serializer = CardSerializer(card)
        return Response(serializer.data)

class CardTransactionViewSet(viewsets.ModelViewSet):
    queryset = CardTransaction.objects.select_related('card')
    serializer_class = CardTransactionSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['card', 'type_transaction']
    ordering_fields = ['date_transaction']


# =============================================================================
# FOURNISSEURS ET APPROVISIONNEMENTS
# =============================================================================

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.select_related('store')
    serializer_class = SupplierSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store']
    search_fields = ['name', 'contact_person']

class SupplyViewSet(viewsets.ModelViewSet):
    queryset = Supply.objects.select_related('store', 'supplier', 'utilisateur__user')
    serializer_class = SupplySerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'supplier', 'status']

class RetailSupplyViewSet(viewsets.ModelViewSet):
    queryset = RetailSupply.objects.select_related('supply')
    serializer_class = RetailSupplySerializer
    permission_classes = [AllowAny]


# =============================================================================
# PRODUITS ET CATÉGORIES
# =============================================================================

class ProductCategoryViewSet(viewsets.ModelViewSet):
    queryset = ProductCategory.objects.filter(is_active=True)
    serializer_class = ProductCategorySerializer
    filterset_fields = ['parent']
    search_fields = ['name', 'slug']
    ordering_fields = ['sort_order', 'name']
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        parent_id = self.request.query_params.get('parent_id')
        
        if parent_id == 'null' or parent_id == '':
            queryset = queryset.filter(parent__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_id=parent_id)
            
        return queryset.order_by('sort_order', 'name')
    
    @transaction.atomic
    def create(self,request, *args, **kwargs):
        return super().create(request, *args,**kwargs)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = ProductCategory.objects.filter(is_active=True).count()
        
        # Compter les catégories qui ont au moins un produit comme group ou comme product_type
        from django.db.models import Q
        with_products = ProductCategory.objects.filter(
            Q(products_as_group__isnull=False) | Q(products_as_type__isnull=False)
        ).distinct().count()
        
        root_categories = ProductCategory.objects.filter(parent__isnull=True).count()
        subcategories = ProductCategory.objects.exclude(parent__isnull=True).count()
        
        return Response({
            'total_categories': total,
            'categories_with_products': with_products,
            'root_categories': root_categories,
            'subcategories': subcategories
        })
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        def build_tree(parent_id=None):
            categories = ProductCategory.objects.filter(
                parent_id=parent_id,
                is_active=True
            ).order_by('sort_order')
            
            tree = []
            for category in categories:
                tree.append({
                    'id': category.id,
                    'name': category.name,
                    'slug': category.slug,
                    'description':category.description,
                    'parent_id':category.parent_id,
                    'children': build_tree(category.id)
                })
            return tree
        
        return Response({
            'tree': build_tree()
        })
    
    @action(detail=False, methods=['get'], url_path='types-with-product-count')
    def types_with_product_count(self, request):
        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response({"error": "Le paramètre 'store_id' est requis."}, status=400)
        
        # Verification de l'existance de la boutique
        try:
            store = Store.objects.get(id=store_id, is_active=True)
        except Store.DoesNotExist:
            return Response({"error": "Boutique introuvable ou inactive."}, status=404)
        # Filtrer les catégories de niveau 3 (celles qui ont un parent et dont le parent a un parent)
        types = ProductCategory.objects.filter(
            parent__isnull=False,
            parent__parent__isnull=False,
            is_active=True
        ).annotate(
            product_count=Count(
                'products_as_group',
                filter=Q(
                    products_as_group__in_stores__store_id=store_id,
                    products_as_group__in_stores__is_active=True
                )
            ) + Count(
                'products_as_type',
                filter=Q(
                    products_as_type__in_stores__store_id=store_id,
                    products_as_type__in_stores__is_active=True
                )
            )
        ).values('id', 'name', 'slug', 'product_count').order_by('name')

        return Response(types)

class ProductBrandViewSet(viewsets.ModelViewSet):
    queryset = ProductBrand.objects.filter(is_active=True)
    serializer_class = ProductBrandSerializer
    search_fields = ['name']
    permission_classes= [AllowAny]

    @transaction.atomic
    def create(self,request, *args, **kwargs):
        return super().create(request, *args,**kwargs)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('group', 'brand').prefetch_related('variants')
    serializer_class = ProductSerializer
    filterset_fields = ['group', 'brand']  
    search_fields = ['name', 'sku', 'description']
    permission_classes=[AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def stock_info(self, request, pk=None):
        product = self.get_object()
        stocks = Stock.objects.filter(product=product)
        serializer = StockSerializer(stocks, many=True)
        return Response(serializer.data)
    
class ProductVariantViewSet(BaseAuditViewSet):
    queryset = ProductVariant.objects.select_related('product')
    serializer_class = ProductVariantSerializer
    filterset_fields = ['product']
    search_fields = ['barcode', 'name']
    permission_classes = [AllowAny]

    @transaction.atomic
    def create(self,request, *args, **kwargs):
        return super().create(request, *args,**kwargs)


class StoreProductViewSet(viewsets.ModelViewSet):
    queryset = StoreProduct.objects.select_related('store', 'product', 'supplier').all()
    permission_classes = [IsAuthenticated, ] #CanManageStoreProducts à ajouter pour employee qui ont acces
    filterset_fields = ['store', 'product', 'is_active']
    search_fields = ['product__name', 'product__sku']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StoreProductCreateSerializer
        return StoreProductSerializer

    # def perform_create(self, serializer):
    #     # Vous pouvez ajouter des validations supplémentaires ici
    #     serializer.save()

class StoreProductVariantViewSet(BaseAuditViewSet):
    queryset = StoreProductVariant.objects.select_related('store_product', 'variant')
    serializer_class = StoreProductVariantSerializer
    permission_classes = [AllowAny]

# =============================================================================
# GESTION DES STOCKS
# =============================================================================

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.select_related('store', 'address')
    serializer_class = WarehouseSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'is_active']
    search_fields = ['name']

class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related('product')
    serializer_class = BatchSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['product']

class StockViewSet(BaseAuditViewSet):
    queryset = Stock.objects.select_related('product', 'store', 'warehouse')
    serializer_class = StockSerializer
    filterset_fields = ['store', 'product', 'warehouse']
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Produits avec stock bas"""
        queryset = self.filter_queryset(self.get_queryset())
        low_stock = queryset.filter(quantity_available__lte=F('min_stock_threshold'))
        serializer = self.get_serializer(low_stock, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques de l'inventaire - VERSION CORRIGÉE"""
        try:
            store_id = request.query_params.get('store_id')
            
            filter_kwargs = {}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            # Statistiques globales
            total_products = Stock.objects.filter(**filter_kwargs).count()
            
            # Calcul de la valeur totale avec gestion des erreurs
            stocks = Stock.objects.filter(**filter_kwargs).select_related('product')
            total_value = 0
            
            for stock in stocks:
                try:
                    if (stock.product and 
                        stock.product.base_price and 
                        stock.quantity_available is not None):
                        total_value += float(stock.product.base_price) * stock.quantity_available
                except (TypeError, ValueError):
                    continue  # Ignorer les valeurs problématiques
            
            low_stock_count = Stock.objects.filter(
                quantity_available__lte=F('min_stock_threshold'),
                **filter_kwargs
            ).count()
            
            out_of_stock_count = Stock.objects.filter(
                quantity_available=0,
                **filter_kwargs
            ).count()

            return Response({
                'total_products': total_products,
                'total_value': round(total_value, 2),
                'low_stock_count': low_stock_count,
                'out_of_stock_count': out_of_stock_count,
                'store_filter': store_id
            })
            
        except Exception as e:
            import traceback
            print(f"Erreur détaillée dans stats: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Erreur calcul statistiques: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Résumé de l'inventaire"""
        store_id = request.query_params.get('store_id')
        
        filter_kwargs = {}
        if store_id and store_id not in ['null', 'undefined', '']:
            filter_kwargs['store_id'] = store_id
        
        summary_data = Stock.objects.filter(**filter_kwargs).aggregate(
            total_items=Count('id'),
            total_quantity=Sum('quantity_available'),
            average_stock=Avg('quantity_available'),
            low_stock_items=Count('id', filter=Q(quantity_available__lte=F('min_stock_threshold'))),
            out_of_stock_items=Count('id', filter=Q(quantity_available=0))
        )
        
        return Response(summary_data)
    

class ReorderRuleViewSet(viewsets.ModelViewSet):
    queryset = ReorderRule.objects.select_related('product', 'store')
    serializer_class = ReorderRuleSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['product', 'store', 'is_active']

class StockMovementViewSet(BaseAuditViewSet):
    queryset = StockMovement.objects.select_related('store').prefetch_related('items')
    serializer_class = StockMovementSerializer
    filterset_fields = ['store', 'movement_type']

class StockMovementItemViewSet(BaseAuditViewSet):
    queryset = StockMovementItem.objects.select_related('movement', 'product', 'variant')
    serializer_class = StockMovementItemSerializer
    permission_classes = [AllowAny]

class InventoryCountViewSet(BaseAuditViewSet):
    queryset = InventoryCount.objects.select_related('store').prefetch_related('items')
    serializer_class = InventoryCountSerializer
    filterset_fields = ['store', 'status']

class InventoryCountItemViewSet(BaseAuditViewSet):
    queryset = InventoryCountItem.objects.select_related('inventory_count', 'product', 'variant')
    serializer_class = InventoryCountItemSerializer
    permission_classes = [AllowAny]

# =============================================================================
# CAISSES
# =============================================================================

class CashRegisterViewSet(viewsets.ModelViewSet):
    queryset = CashRegister.objects.select_related('store', 'created_by', 'updated_by').filter(is_active=True)
    serializer_class = CashRegisterSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['store', 'is_active']
    search_fields = ['name', 'code', 'location']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        store_id = self.request.query_params.get('store_id')
        if store_id and store_id not in ['null', 'undefined', '']:
            queryset = queryset.filter(store_id=store_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None,
            updated_by=self.request.user if self.request.user.is_authenticated else None
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Fermer une caisse"""
        caisse = self.get_object()
        
        open_session = CashRegisterSession.objects.filter(
            cash_register=caisse,
            status='open'
        ).first()
        
        if open_session:
            return Response({
                'error': 'Une session est encore ouverte pour cette caisse. Veuillez fermer la session d\'abord.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        caisse.is_active = False
        caisse.updated_by = request.user if request.user.is_authenticated else None
        caisse.save()
        
        serializer = self.get_serializer(caisse)
        return Response({
            'message': 'Caisse fermée avec succès',
            'data': serializer.data
        })

class CashRegisterSessionViewSet(viewsets.ModelViewSet):
    queryset = CashRegisterSession.objects.select_related(
        'cash_register', 'employee__user', 'session', 'created_by', 'updated_by'
    )
    serializer_class = CashRegisterSessionSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cash_register', 'employee', 'status']
    ordering_fields = ['start_time', 'end_time']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        cash_register_id = self.request.query_params.get('cash_register_id')
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if cash_register_id and cash_register_id not in ['null', 'undefined', '']:
            queryset = queryset.filter(cash_register_id=cash_register_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_from:
            queryset = queryset.filter(start_time__gte=date_from)
        if date_to:
            queryset = queryset.filter(start_time__lte=date_to)
            
        return queryset.order_by('-start_time')
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None,
            updated_by=self.request.user if self.request.user.is_authenticated else None
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['post'])
    def close_session(self, request, pk=None):
        """Fermer une session de caisse"""
        session = self.get_object()
        
        if session.status == 'closed':
            return Response({
                'error': 'Cette session est déjà fermée'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        with transaction.atomic():
            actual_balance = request.data.get('actual_balance')
            if actual_balance is None:
                return Response({
                    'error': 'Le solde réel est requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            session.end_time = timezone.now()
            session.status = 'closed'
            session.actual_balance = actual_balance
            session.difference = float(actual_balance) - float(session.expected_balance)
            session.updated_by = self.request.user if self.request.user.is_authenticated else None
            session.save()
            
            session.cash_register.current_balance = actual_balance
            session.cash_register.save()
        
        serializer = self.get_serializer(session)
        return Response({
            'message': 'Session fermée avec succès',
            'data': serializer.data
        })

class CashTransactionViewSet(viewsets.ModelViewSet):
    queryset = CashTransaction.objects.select_related(
        'session', 'currency', 'payment_method', 'sale', 'customer', 'created_by', 'updated_by'
    )
    serializer_class = CashTransactionSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['session', 'transaction_type', 'payment_method', 'currency']
    ordering_fields = ['transaction_time', 'amount']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        session_id = self.request.query_params.get('session_id')
        transaction_type = self.request.query_params.get('transaction_type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if session_id and session_id not in ['null', 'undefined', '']:
            queryset = queryset.filter(session_id=session_id)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        if date_from:
            queryset = queryset.filter(transaction_time__gte=date_from)
        if date_to:
            queryset = queryset.filter(transaction_time__lte=date_to)
            
        return queryset.order_by('-transaction_time')
    
    def perform_create(self, serializer):
        with transaction.atomic():
            transaction_obj = serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)
            
            session = transaction_obj.session
            if transaction_obj.transaction_type in ['sale', 'deposit', 'open']:
                session.expected_balance += transaction_obj.amount
            elif transaction_obj.transaction_type in ['return', 'withdrawal']:
                session.expected_balance -= transaction_obj.amount
            
            session.save()
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user if self.request.user.is_authenticated else None)


# =============================================================================
# COMMANDES (ORDERS) - NOUVELLES VUES
# =============================================================================

class OrderStatusViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des statuts de commande
    """
    queryset = OrderStatus.objects.filter(is_active=True)
    serializer_class = OrderStatusSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['code', 'name']
    ordering_fields = ['sort_order']

class OrderSourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des sources de commande
    """
    queryset = OrderSource.objects.all()
    serializer_class = OrderSourceSerializer
    permission_classes = [AllowAny]
    search_fields = ['code', 'name']

class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des commandes
    """
    queryset = Order.objects.select_related(
        'store',
        'customer__user',
        'employee__user',
        'status',
        'source',
        'payment_method'
    ).prefetch_related('items').order_by('-order_date')
    
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'store',
        'customer',
        'status',
        'source',
        'payment_status',
        'converted_to_sale'
    ]
    
    search_fields = [
        'order_number',
        'external_reference',
        'customer_name',
        'customer_email',
        'customer_phone'
    ]
    
    ordering_fields = [
        'order_date',
        'total_amount',
        'expected_delivery_date'
    ]
    
    def get_queryset(self):
        """
        Surcharge pour gérer les filtres personnalisés
        """
        queryset = super().get_queryset()
        
        # Filtre par date
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = timezone.make_aware(datetime.strptime(start_date, '%Y-%m-%d'))
                queryset = queryset.filter(order_date__gte=start_date)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_date = timezone.make_aware(datetime.strptime(end_date, '%Y-%m-%d'))
                queryset = queryset.filter(order_date__lte=end_date)
            except ValueError:
                pass
        
        # Filtre par statut de paiement
        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Création d'une commande avec génération automatique du numéro
        """
        order = serializer.save()
        
        # Si le numéro de commande n'a pas été généré automatiquement par le modèle
        if not order.order_number:
            # Recharger l'objet pour obtenir le numéro généré
            order.refresh_from_db()
        
        # Journalisation de l'activité
        ActivityLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='Création de commande',
            model_name='Order',
            object_id=str(order.id),
            details={
                'order_number': order.order_number,
                'customer': order.customer_name,
                'total_amount': float(order.total_amount),
                'store': order.store.name if order.store else None
            }
        )
    
    def perform_update(self, serializer):
        """
        Mise à jour d'une commande
        """
        old_status = self.get_object().status.code if self.get_object().status else None
        order = serializer.save()
        new_status = order.status.code if order.status else None
        
        # Journalisation des changements de statut
        if old_status != new_status:
            ActivityLog.objects.create(
                user=self.request.user if self.request.user.is_authenticated else None,
                action='Changement statut commande',
                model_name='Order',
                object_id=str(order.id),
                details={
                    'order_number': order.order_number,
                    'old_status': old_status,
                    'new_status': new_status
                }
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Mettre à jour le statut d'une commande
        """
        order = self.get_object()
        new_status_id = request.data.get('status_id')
        
        if not new_status_id:
            return Response(
                {'error': 'Le statut est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            new_status = OrderStatus.objects.get(id=new_status_id)
        except OrderStatus.DoesNotExist:
            return Response(
                {'error': 'Statut invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = order.status.name if order.status else None
        
        with transaction.atomic():
            order.status = new_status
            order.save()
            
            # Journalisation
            ActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='Mise à jour statut commande',
                model_name='Order',
                object_id=str(order.id),
                details={
                    'order_number': order.order_number,
                    'old_status': old_status,
                    'new_status': new_status.name
                }
            )
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_payment_status(self, request, pk=None):
        """
        Mettre à jour le statut de paiement d'une commande
        """
        order = self.get_object()
        new_payment_status = request.data.get('payment_status')
        
        if not new_payment_status:
            return Response(
                {'error': 'Le statut de paiement est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = ['pending', 'partial', 'paid', 'refunded', 'cancelled']
        if new_payment_status not in valid_statuses:
            return Response(
                {'error': f'Statut invalide. Doit être l\'un de: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_payment_status = order.payment_status
        
        with transaction.atomic():
            order.payment_status = new_payment_status
            order.save()
            
            # Journalisation
            ActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='Mise à jour statut paiement commande',
                model_name='Order',
                object_id=str(order.id),
                details={
                    'order_number': order.order_number,
                    'old_payment_status': old_payment_status,
                    'new_payment_status': new_payment_status
                }
            )
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def convert_to_sale(self, request, pk=None):
        """
        Convertir une commande en vente
        """
        order = self.get_object()
        
        # Vérifier si la commande est déjà convertie
        if order.converted_to_sale:
            return Response(
                {'error': 'Cette commande a déjà été convertie en vente'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier que la commande est dans un état convertible
        if order.status and order.status.code not in ['confirmed', 'ready']:
            return Response(
                {'error': 'La commande doit être confirmée ou prête pour être convertie'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Récupérer l'employé courant
            employee = None
            if request.user.is_authenticated and hasattr(request.user, 'employee'):
                employee = request.user.employee
            
            # Convertir en vente
            sale = order.convert_to_sale(employee=employee)
            
            # Journalisation
            ActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='Conversion commande en vente',
                model_name='Order',
                object_id=str(order.id),
                details={
                    'order_number': order.order_number,
                    'sale_id': sale.id,
                    'sale_ticket': sale.ticket_number
                }
            )
            
            serializer = SaleSerializer(sale)
            return Response({
                'message': 'Commande convertie en vente avec succès',
                'sale': serializer.data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la conversion: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """
        Ajouter un paiement à une commande
        """
        order = self.get_object()
        amount = request.data.get('amount')
        payment_method_id = request.data.get('payment_method_id')
        reference = request.data.get('reference', '')
        
        if not amount or float(amount) <= 0:
            return Response(
                {'error': 'Montant invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not payment_method_id:
            return Response(
                {'error': 'Méthode de paiement requise'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            payment_method = PaymentMethod.objects.get(id=payment_method_id)
        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'Méthode de paiement invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Créer une transaction caisse si nécessaire
            if order.cash_session:
                CashTransaction.objects.create(
                    session=order.cash_session,
                    transaction_type='payment',
                    reference=f'CMD-{order.order_number}',
                    amount=amount,
                    payment_method=payment_method,
                    payment_reference=reference,
                    sale=None,
                    customer=order.customer,
                    notes=f'Paiement commande {order.order_number}'
                )
            
            # Mettre à jour le statut de paiement
            total_paid = float(amount)  # À adapter si vous suivez les paiements partiels
            
            if total_paid >= order.total_amount:
                order.payment_status = 'paid'
            elif total_paid > 0:
                order.payment_status = 'partial'
            
            order.save()
            
            # Journalisation
            ActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='Ajout paiement commande',
                model_name='Order',
                object_id=str(order.id),
                details={
                    'order_number': order.order_number,
                    'amount': float(amount),
                    'payment_method': payment_method.name,
                    'reference': reference
                }
            )
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Statistiques sur les commandes
        """
        try:
            store_id = request.query_params.get('store_id')
            days = int(request.query_params.get('days', 30))
            
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            filter_kwargs = {'order_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            # Commandes par statut
            orders_by_status = Order.objects.filter(**filter_kwargs).values(
                'status__name'
            ).annotate(
                count=Count('id'),
                total_amount=Sum('total_amount')
            )
            
            # Commandes par jour
            daily_orders = Order.objects.filter(**filter_kwargs).extra({
                'date': "DATE(order_date)"
            }).values('date').annotate(
                count=Count('id'),
                total_amount=Sum('total_amount')
            ).order_by('date')
            
            # Commandes converties vs non converties
            conversion_stats = Order.objects.filter(**filter_kwargs).aggregate(
                total_orders=Count('id'),
                converted=Count('id', filter=Q(converted_to_sale=True)),
                not_converted=Count('id', filter=Q(converted_to_sale=False))
            )
            
            return Response({
                'period': {
                    'start': start_date,
                    'end': end_date
                },
                'orders_by_status': list(orders_by_status),
                'daily_orders': list(daily_orders),
                'conversion_stats': conversion_stats,
                'store_filter': store_id
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur calcul statistiques: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Récupérer les commandes récentes
        """
        limit = int(request.query_params.get('limit', 10))
        
        queryset = self.filter_queryset(self.get_queryset())
        recent_orders = queryset[:limit]
        
        serializer = self.get_serializer(recent_orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Récupérer les commandes en attente
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filtrer les commandes avec statut "pending" ou "confirmed"
        pending_statuses = OrderStatus.objects.filter(
            Q(code='pending') | Q(code='confirmed')
        )
        
        pending_orders = queryset.filter(status__in=pending_statuses)
        serializer = self.get_serializer(pending_orders, many=True)
        
        return Response({
            'count': pending_orders.count(),
            'results': serializer.data
        })

class OrderItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des articles de commande
    """
    queryset = OrderItem.objects.select_related(
        'order',
        'variant'
    ).all()
    
    serializer_class = OrderItemSerializer
    permission_classes = [AllowAny]
    
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'variant']
    
    def get_queryset(self):
        """
        Filtrer par commande si spécifié
        """
        queryset = super().get_queryset()
        order_id = self.request.query_params.get('order_id')
        
        if order_id and order_id not in ['null', 'undefined', '']:
            queryset = queryset.filter(order_id=order_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Création d'un article de commande
        """
        order_item = serializer.save()
        
        # Mettre à jour les totaux de la commande
        if order_item.order:
            order_item.order.calculate_totals()
        
        # Journalisation
        ActivityLog.objects.create(
            user=self.request.user if self.request.user.is_authenticated else None,
            action='Ajout article commande',
            model_name='OrderItem',
            object_id=str(order_item.id),
            details={
                'order_number': order_item.order.order_number if order_item.order else None,
                'product': order_item.product.name,
                'quantity': float(order_item.quantity),
                'unit_price': float(order_item.unit_price)
            }
        )


# =============================================================================
# CONFIGURATIONS
# =============================================================================

class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.filter(is_active=True)
    serializer_class = PaymentMethodSerializer
    permission_classes = [AllowAny]

class TaxRateViewSet(viewsets.ModelViewSet):
    queryset = TaxRate.objects.filter(is_active=True)
    serializer_class = TaxRateSerializer
    permission_classes = [AllowAny]

class SaleStatusViewSet(viewsets.ModelViewSet):
    queryset = SaleStatus.objects.all()
    serializer_class = SaleStatusSerializer
    permission_classes = [AllowAny]


# =============================================================================
# VENTES ET PAIEMENTS
# =============================================================================

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related(
        'store', 'customer__user', 'employee__user', 'caisse', 'cash_session', 'status', 'delivery_address'
    ).prefetch_related('items', 'payments')
    serializer_class = SaleSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'customer', 'employee', 'caisse', 'status']
    ordering_fields = ['sale_date', 'total_amount']
    
    @action(detail=True, methods=['post'])
    def process_payment(self, request, pk=None):
        """Traiter un paiement pour une vente"""
        sale = self.get_object()
        payment_data = request.data
        
        with transaction.atomic():
            payment = SalePayment.objects.create(
                sale=sale,
                payment_method_id=payment_data.get('payment_method'),
                amount=payment_data.get('amount'),
                reference=payment_data.get('reference', ''),
                processed_by=request.user.employee if request.user.is_authenticated and hasattr(request.user, 'employee') else None
            )
            
            if sale.is_fully_paid:
                paid_status = SaleStatus.objects.get(code='paid')
                sale.status = paid_status
                sale.save()
        
        serializer = SalePaymentSerializer(payment)
        return Response(serializer.data)

class SalePaymentViewSet(viewsets.ModelViewSet):
    queryset = SalePayment.objects.select_related('sale', 'payment_method', 'processed_by__user')
    serializer_class = SalePaymentSerializer
    permission_classes = [AllowAny]

class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.select_related('sale', 'product', 'variant')
    serializer_class = SaleItemSerializer
    permission_classes = [AllowAny]


# =============================================================================
# LIVRAISONS
# =============================================================================

class DeliveryAddressViewSet(viewsets.ModelViewSet):
    queryset = DeliveryAddress.objects.select_related('customer__user', 'address')
    serializer_class = DeliveryAddressSerializer
    permission_classes = [AllowAny]

class DeliveryVehicleViewSet(viewsets.ModelViewSet):
    queryset = DeliveryVehicle.objects.select_related('store')
    serializer_class = DeliveryVehicleSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'is_active']

class DeliveryRouteViewSet(viewsets.ModelViewSet):
    queryset = DeliveryRoute.objects.select_related('store', 'driver__user', 'vehicle')
    serializer_class = DeliveryRouteSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'driver']

class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.select_related('sale', 'delivery_address', 'assigned_driver__user', 'route')
    serializer_class = DeliverySerializer
    permission_classes = [AllowAny]
    filterset_fields = ['status', 'assigned_driver']

class DeliveryScheduleViewSet(viewsets.ModelViewSet):
    queryset = DeliverySchedule.objects.select_related('delivery', 'route')
    serializer_class = DeliveryScheduleSerializer
    permission_classes = [AllowAny]


# =============================================================================
# RETOURS ET REMBOURSEMENTS
# =============================================================================

class ReturnReasonViewSet(BaseAuditViewSet):
    queryset = ReturnReason.objects.all()
    serializer_class = ReturnReasonSerializer
    permission_classes = [AllowAny]

class ProductReturnViewSet(BaseAuditViewSet):
    queryset = ProductReturn.objects.select_related('original_sale', 'store', 'customer__user', 'return_reason')
    serializer_class = ProductReturnSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'customer', 'status']

class ReturnItemViewSet(BaseAuditViewSet):
    queryset = ReturnItem.objects.select_related('product_return', 'sale_item')
    serializer_class = ReturnItemSerializer
    permission_classes = [AllowAny]

class RefundViewSet(BaseAuditViewSet):
    queryset = Refund.objects.select_related('product_return', 'refund_method', 'processed_by__user')
    serializer_class = RefundSerializer
    permission_classes = [AllowAny]

class ReturnedProductViewSet(viewsets.ModelViewSet):
    queryset = ReturnedProduct.objects.select_related('employee__user', 'sell')
    serializer_class = ReturnedProductSerializer
    permission_classes = [AllowAny]


# =============================================================================
# TRANSACTIONS DIVERSES
# =============================================================================

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related('user__user')
    serializer_class = TransactionSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['type_transaction']

class MobileMoneyViewSet(viewsets.ModelViewSet):
    queryset = MobileMoney.objects.select_related('employee__user', 'caisse_session')
    serializer_class = MobileMoneySerializer
    permission_classes = [AllowAny]

class UniteViewSet(viewsets.ModelViewSet):
    queryset = Unite.objects.select_related('employee__user')
    serializer_class = UniteSerializer
    permission_classes = [AllowAny]

class WithdrawalCodeViewSet(viewsets.ModelViewSet):
    queryset = WithdrawalCode.objects.select_related('employee__user')
    serializer_class = WithdrawalCodeSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['status']


# =============================================================================
# PROMOTIONS ET MARKETING
# =============================================================================

class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.select_related('product', 'variante', 'store')
    serializer_class = PromotionSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store']

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.select_related('store').prefetch_related('target_customers')
    serializer_class = CampaignSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'campaign_type']


# =============================================================================
# COMPTABILITÉ ET ANALYSE
# =============================================================================

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [AllowAny]

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('store', 'category', 'approved_by__user')
    serializer_class = ExpenseSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'category']

class AccountingPeriodViewSet(BaseAuditViewSet):
    queryset = AccountingPeriod.objects.all()
    serializer_class = AccountingPeriodSerializer
    permission_classes = [AllowAny]

class GeneralLedgerViewSet(BaseAuditViewSet):
    queryset = GeneralLedger.objects.select_related('period')
    serializer_class = GeneralLedgerSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['period', 'account_number']

class FinancialReportViewSet(BaseAuditViewSet):
    queryset = FinancialReport.objects.select_related('store', 'period', 'generated_by')
    serializer_class = FinancialReportSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'report_type', 'period']

class KPIViewSet(viewsets.ModelViewSet):
    queryset = KPI.objects.all()
    serializer_class = KPISerializer
    permission_classes = [AllowAny]

class KPIMeasurementViewSet(viewsets.ModelViewSet):
    queryset = KPIMeasurement.objects.select_related('kpi', 'store')
    serializer_class = KPIMeasurementSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['kpi', 'store']


# =============================================================================
# DASHBOARD VIEWSET (ModelViewSet pour le modèle Dashboard)
# =============================================================================

class DashboardViewSet(viewsets.ModelViewSet):  # ViewSet pour le modèle Dashboard
    """
    ViewSet pour le modèle Dashboard (gestion des tableaux de bord personnalisés)
    """
    queryset = Dashboard.objects.select_related('user')
    serializer_class = DashboardSerializer
    permission_classes = [AllowAny]


# =============================================================================
# SÉCURITÉ ET MAINTENANCE
# =============================================================================

class SecurityIncidentViewSet(viewsets.ModelViewSet):
    queryset = SecurityIncident.objects.select_related('store', 'reported_by__user')
    serializer_class = SecurityIncidentSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'incident_type', 'severity']

class DataBackupViewSet(viewsets.ModelViewSet):
    queryset = DataBackup.objects.all()
    serializer_class = DataBackupSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['backup_type']

class MaintenanceTaskViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceTask.objects.select_related('store', 'assigned_to__user')
    serializer_class = MaintenanceTaskSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'task_type', 'status']

class SupportTicketViewSet(viewsets.ModelViewSet):
    queryset = SupportTicket.objects.select_related('store', 'created_by__user', 'assigned_to__user')
    serializer_class = SupportTicketSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'priority', 'status']


# =============================================================================
# GESTION DES ERREURS
# =============================================================================

class ErrorReportViewSet(viewsets.ModelViewSet):
    queryset = ErrorReport.objects.select_related('user__user')
    serializer_class = ErrorReportSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['resolved']
    
    @action(detail=True, methods=['post'])
    def mark_resolved(self, request, pk=None):
        """Marquer un rapport d'erreur comme résolu"""
        error_report = self.get_object()
        error_report.resolved = True
        error_report.save()
        
        serializer = self.get_serializer(error_report)
        return Response(serializer.data)


# =============================================================================
# ANALYTICS ET RAPPORTS
# =============================================================================

class AnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Statistiques du tableau de bord"""
        try:
            store_id = request.query_params.get('store_id')
            
            filter_kwargs = {}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
            
            # Chiffre d'affaires
            ca_result = Sale.objects.filter(
                sale_date__range=[start_date, end_date],
                **filter_kwargs
            ).aggregate(total=Sum('total_amount'))
            ca_total = ca_result['total'] or 0
            
            # Chiffre d'affaires commandes
            orders_ca_result = Order.objects.filter(
                order_date__range=[start_date, end_date],
                **filter_kwargs
            ).aggregate(total=Sum('total_amount'))
            orders_ca_total = orders_ca_result['total'] or 0
            
            # Nombre de ventes
            nb_ventes = Sale.objects.filter(
                sale_date__range=[start_date, end_date],
                **filter_kwargs
            ).count()
            
            # Nombre de commandes
            nb_orders = Order.objects.filter(
                order_date__range=[start_date, end_date],
                **filter_kwargs
            ).count()
            
            # Clients actifs
            clients_actifs = Customer.objects.filter(
                last_purchase__range=[start_date, end_date]
            ).count()
            
            # Sessions de caisse actives
            sessions_actives = CashRegisterSession.objects.filter(
                status='open',
                **filter_kwargs
            ).count()
            
            # Produits en stock bas
            low_stock = Stock.objects.filter(
                quantity_available__lte=F('min_stock_threshold'),
                **filter_kwargs
            ).count()

            return Response({
                'chiffre_affaires': float(ca_total),
                'chiffre_affaires_commandes': float(orders_ca_total),
                'nombre_ventes': nb_ventes,
                'nombre_commandes': nb_orders,
                'clients_actifs': clients_actifs,
                'sessions_caisse_actives': sessions_actives,
                'produits_stock_bas': low_stock,
                'periode': {
                    'debut': start_date,
                    'fin': end_date
                }
            })
            
        except Exception as e:
            print(f"Erreur dans dashboard_stats: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# VUES DE RAPPORTS POUR LES COMMANDES
# =============================================================================

class OrdersAnalyticsView(APIView):
    """
    Analytiques pour les commandes
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            days = int(request.query_params.get('days', 30))
            
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            filter_kwargs = {'order_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            # Statistiques de base
            stats = Order.objects.filter(**filter_kwargs).aggregate(
                total_orders=Count('id'),
                total_amount=Sum('total_amount'),
                avg_order_value=Avg('total_amount'),
                conversion_rate=Count('id', filter=Q(converted_to_sale=True)) * 100.0 / Count('id')
            )
            
            # Évolution des commandes
            orders_evolution = Order.objects.filter(**filter_kwargs).extra({
                'date': "DATE(order_date)"
            }).values('date').annotate(
                orders_count=Count('id'),
                total_revenue=Sum('total_amount')
            ).order_by('date')
            
            # Taux de conversion par période
            conversion_by_period = []
            for i in range(4):
                period_start = start_date + timedelta(days=i * (days // 4))
                period_end = period_start + timedelta(days=(days // 4))
                
                period_orders = Order.objects.filter(
                    order_date__range=[period_start, period_end],
                    **{k: v for k, v in filter_kwargs.items() if k != 'order_date__range'}
                )
                
                total = period_orders.count()
                converted = period_orders.filter(converted_to_sale=True).count()
                
                if total > 0:
                    conversion_rate = (converted / total) * 100
                else:
                    conversion_rate = 0
                
                conversion_by_period.append({
                    'period': f'P{i+1}',
                    'start': period_start,
                    'end': period_end,
                    'total_orders': total,
                    'converted_orders': converted,
                    'conversion_rate': conversion_rate
                })
            
            return Response({
                'period': {
                    'start': start_date,
                    'end': end_date,
                    'days': days
                },
                'stats': stats,
                'orders_evolution': list(orders_evolution),
                'conversion_by_period': conversion_by_period
            })
            
        except Exception as e:
            print(f"Erreur dans OrdersAnalyticsView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class OrdersReportView(APIView):
    """
    Rapport détaillé des commandes
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            # Gestion des dates
            if end_date_str:
                end_date = timezone.make_aware(datetime.strptime(end_date_str, '%Y-%m-%d'))
            else:
                end_date = timezone.now()
                
            if start_date_str:
                start_date = timezone.make_aware(datetime.strptime(start_date_str, '%Y-%m-%d'))
            else:
                start_date = end_date - timedelta(days=30)
            
            filter_kwargs = {'order_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            # Récupérer toutes les commandes avec les relations
            orders = Order.objects.filter(**filter_kwargs).select_related(
                'store', 'customer__user', 'status', 'source'
            ).prefetch_related('items').order_by('-order_date')
            
            # Préparer les données
            orders_data = []
            for order in orders:
                orders_data.append({
                    'id': order.id,
                    'order_number': order.order_number,
                    'customer_name': order.customer_name,
                    'customer_phone': order.customer_phone,
                    'store_name': order.store.name if order.store else '',
                    'status': order.status.name if order.status else '',
                    'source': order.source.name if order.source else '',
                    'total_amount': float(order.total_amount),
                    'order_date': order.order_date.isoformat(),
                    'expected_delivery_date': order.expected_delivery_date.isoformat() if order.expected_delivery_date else '',
                    'payment_status': order.payment_status,
                    'converted_to_sale': order.converted_to_sale,
                    'items_count': order.items.count(),
                    'items': [
                        {
                            'product_name': item.product.name if item.product else '',
                            'quantity': float(item.quantity),
                            'unit_price': float(item.unit_price),
                            'line_total': float(item.line_total)
                        }
                        for item in order.items.all()
                    ]
                })
            
            # Calculer les totaux
            totals = Order.objects.filter(**filter_kwargs).aggregate(
                total_orders=Count('id'),
                total_amount=Sum('total_amount'),
                avg_order_value=Avg('total_amount')
            )
            
            return Response({
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'store_filter': store_id,
                'totals': totals,
                'orders': orders_data,
                'generated_at': timezone.now().isoformat()
            })
            
        except ValueError as e:
            return Response(
                {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"Erreur dans OrdersReportView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# ADRESSES ET AUTRES
# =============================================================================

class AddressViewSet(viewsets.ModelViewSet):
    queryset = Address.objects.all()
    serializer_class = AddressSerializer
    permission_classes = [AllowAny]
    search_fields = ['address_line1', 'city', 'postal_code']

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [AllowAny]

class StoreOwnershipViewSet(viewsets.ModelViewSet):
    queryset = StoreOwnership.objects.select_related('store', 'owner__user')
    serializer_class = StoreOwnershipSerializer
    permission_classes = [AllowAny]

class StoreShareholderViewSet(viewsets.ModelViewSet):
    queryset = StoreShareholder.objects.select_related('store', 'shareholder__user')
    serializer_class = StoreShareholderSerializer
    permission_classes = [AllowAny]

class LoyaltyProgramViewSet(viewsets.ModelViewSet):
    queryset = LoyaltyProgram.objects.select_related('store')
    serializer_class = LoyaltyProgramSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['store', 'is_active']

class LoyaltyRewardViewSet(viewsets.ModelViewSet):
    queryset = LoyaltyReward.objects.select_related('program', 'free_product')
    serializer_class = LoyaltyRewardSerializer
    permission_classes = [AllowAny]


# =============================================================================
# VUES PERSONNALISÉES POUR LES RAPPORTS ET UTILITAIRES
# =============================================================================

class HealthCheckView(APIView):
    """Health check de l'API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            "status": "healthy",
            "timestamp": timezone.now(),
            "version": "1.0.0",
            "database": "connected"
        })

class ExportSalesCSVView(APIView):
    """Export des ventes en CSV"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="sales_export_{datetime.now().date()}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'Ticket', 'Client', 'Montant', 'Méthode Paiement'])
        
        sales = Sale.objects.all()[:100]
        for sale in sales:
            writer.writerow([
                sale.sale_date.date(),
                sale.ticket_number,
                sale.customer.user.get_full_name() if sale.customer else 'Anonyme',
                sale.total_amount,
                ', '.join([pm.payment_method.name for pm in sale.payments.all()])
            ])
        
        return response

class ExportOrdersCSVView(APIView):
    """Export des commandes en CSV"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="orders_export_{datetime.now().date()}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'Numéro', 'Client', 'Statut', 'Montant', 'Boutique'])
        
        orders = Order.objects.all()[:100]
        for order in orders:
            writer.writerow([
                order.order_date.date(),
                order.order_number,
                order.customer_name,
                order.status.name if order.status else 'Inconnu',
                order.total_amount,
                order.store.name if order.store else 'Inconnu'
            ])
        
        return response

class SalesSummaryView(APIView):
    """Résumé des ventes"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            # Gestion des dates par défaut
            if end_date_str:
                end_date = timezone.make_aware(datetime.strptime(end_date_str, '%Y-%m-%d'))
            else:
                end_date = timezone.now()
                
            if start_date_str:
                start_date = timezone.make_aware(datetime.strptime(start_date_str, '%Y-%m-%d'))
            else:
                start_date = end_date - timedelta(days=30)
            
            # Validation des dates
            if start_date > end_date:
                return Response(
                    {'error': 'La date de début ne peut pas être après la date de fin'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            filter_kwargs = {'sale_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            # Vérifier s'il y a des données
            has_data = Sale.objects.filter(**filter_kwargs).exists()
            if not has_data:
                return Response({
                    'period': {
                        'start': start_date,
                        'end': end_date
                    },
                    'summary': {
                        'total_sales': 0,
                        'total_transactions': 0,
                        'average_sale': 0,
                        'total_discount': 0
                    },
                    'daily_breakdown': [],
                    'message': 'Aucune donnée de vente pour cette période'
                })
            
            sales_data = Sale.objects.filter(**filter_kwargs).aggregate(
                total_sales=Sum('total_amount'),
                total_transactions=Count('id'),
                average_sale=Avg('total_amount'),
                total_discount=Sum('discount_amount')
            )
            
            daily_sales = Sale.objects.filter(**filter_kwargs).extra({
                'date': "DATE(sale_date)"
            }).values('date').annotate(
                daily_total=Sum('total_amount'),
                daily_count=Count('id')
            ).order_by('date')
            
            return Response({
                'period': {
                    'start': start_date,
                    'end': end_date
                },
                'summary': sales_data,
                'daily_breakdown': list(daily_sales)
            })
            
        except ValueError as e:
            return Response(
                {'error': 'Format de date invalide. Utilisez YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"Erreur dans SalesSummaryView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class InventoryReportView(APIView):
    """Rapport d'inventaire"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            
            filter_kwargs = {}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['store_id'] = store_id
            
            low_stock = Stock.objects.filter(
                quantity_available__lte=F('min_stock_threshold'),
                **filter_kwargs
            ).select_related('product').values(
                'product__name',
                'quantity_available',
                'min_stock_threshold'
            )
            
            top_products = SaleItem.objects.filter(
                sale__store_id=store_id
            ).values(
                'product__name',
                'product__sku'
            ).annotate(
                total_sold=Sum('quantity'),
                total_revenue=Sum('line_total')
            ).order_by('-total_sold')[:10]
            
            return Response({
                'low_stock_items': list(low_stock),
                'top_products': list(top_products)
            })
            
        except Exception as e:
            print(f"Erreur dans InventoryReportView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FinancialSummaryView(APIView):
    """Résumé financier"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            period = request.query_params.get('period', 'month')
            
            end_date = timezone.now()
            if period == 'month':
                start_date = end_date - timedelta(days=30)
            elif period == 'quarter':
                start_date = end_date - timedelta(days=90)
            else:
                start_date = end_date - timedelta(days=365)
            
            # Revenus des ventes
            sale_filter = {'sale_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                sale_filter['store_id'] = store_id
            
            revenue_data = Sale.objects.filter(**sale_filter).aggregate(
                total_revenue=Sum('total_amount'),
                total_tax=Sum('tax_amount'),
                total_discount=Sum('discount_amount')
            )
            
            # Revenus des commandes
            order_filter = {'order_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                order_filter['store_id'] = store_id
                
            order_revenue_data = Order.objects.filter(**order_filter).aggregate(
                total_orders_revenue=Sum('total_amount')
            )
            
            # Dépenses
            expense_filter = {'expense_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                expense_filter['store_id'] = store_id
                
            expense_data = Expense.objects.filter(**expense_filter).aggregate(total_expenses=Sum('amount'))
            
            # Calculs
            sales_revenue = revenue_data['total_revenue'] or 0
            orders_revenue = order_revenue_data['total_orders_revenue'] or 0
            total_revenue = sales_revenue + orders_revenue
            expenses = expense_data['total_expenses'] or 0
            profit = total_revenue - expenses
            
            return Response({
                'period': {
                    'start': start_date,
                    'end': end_date,
                    'type': period
                },
                'revenue': {
                    'total': total_revenue,
                    'from_sales': sales_revenue,
                    'from_orders': orders_revenue,
                    'tax': revenue_data['total_tax'] or 0,
                    'discount': revenue_data['total_discount'] or 0
                },
                'expenses': expenses,
                'profit': profit,
                'margin': (profit / total_revenue * 100) if total_revenue > 0 else 0
            })
            
        except Exception as e:
            print(f"Erreur dans FinancialSummaryView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DailySalesStatsView(APIView):
    """Statistiques des ventes quotidiennes"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            days = int(request.query_params.get('days', 7))
            
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days-1)
            
            # Ventes
            sale_filter = {'sale_date__date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                sale_filter['store_id'] = store_id
            
            daily_sales_stats = Sale.objects.filter(**sale_filter).extra({
                'date': "DATE(sale_date)"
            }).values('date').annotate(
                total_sales=Sum('total_amount'),
                transaction_count=Count('id'),
                avg_transaction=Avg('total_amount')
            ).order_by('date')
            
            # Commandes
            order_filter = {'order_date__date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                order_filter['store_id'] = store_id
            
            daily_orders_stats = Order.objects.filter(**order_filter).extra({
                'date': "DATE(order_date)"
            }).values('date').annotate(
                total_orders=Sum('total_amount'),
                order_count=Count('id'),
                avg_order=Avg('total_amount')
            ).order_by('date')
            
            # Fusionner les données
            daily_stats = []
            for i in range(days):
                current_date = start_date + timedelta(days=i)
                
                # Trouver les ventes pour cette date
                sales_data = next((item for item in daily_sales_stats if item['date'] == current_date), None)
                orders_data = next((item for item in daily_orders_stats if item['date'] == current_date), None)
                
                daily_stats.append({
                    'date': current_date.isoformat(),
                    'sales': {
                        'total': float(sales_data['total_sales']) if sales_data else 0,
                        'count': sales_data['transaction_count'] if sales_data else 0,
                        'average': float(sales_data['avg_transaction']) if sales_data else 0
                    },
                    'orders': {
                        'total': float(orders_data['total_orders']) if orders_data else 0,
                        'count': orders_data['order_count'] if orders_data else 0,
                        'average': float(orders_data['avg_order']) if orders_data else 0
                    }
                })
            
            # Calculer les totaux
            total_sales = sum(stat['sales']['total'] for stat in daily_stats)
            total_orders = sum(stat['orders']['total'] for stat in daily_stats)
            total_transactions = sum(stat['sales']['count'] for stat in daily_stats)
            total_order_count = sum(stat['orders']['count'] for stat in daily_stats)
            
            return Response({
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                },
                'daily_stats': daily_stats,
                'totals': {
                    'total_sales': total_sales,
                    'total_orders': total_orders,
                    'total_transactions': total_transactions,
                    'total_order_count': total_order_count,
                    'total_revenue': total_sales + total_orders
                }
            })
            
        except Exception as e:
            print(f"Erreur dans DailySalesStatsView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TopProductsView(APIView):
    """Produits les plus vendus"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            limit = int(request.query_params.get('limit', 10))
            days = int(request.query_params.get('days', 30))
            
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            filter_kwargs = {'sale__sale_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                filter_kwargs['sale__store_id'] = store_id
            
            top_products = SaleItem.objects.filter(**filter_kwargs).values(
                'product__name',
                'product__sku',
                'product__category__name'
            ).annotate(
                units_sold=Sum('quantity'),
                total_revenue=Sum('line_total'),
                transaction_count=Count('sale', distinct=True)
            ).order_by('-total_revenue')[:limit]
            
            return Response({
                'period': {
                    'start': start_date,
                    'end': end_date
                },
                'top_products': list(top_products)
            })
            
        except Exception as e:
            print(f"Erreur dans TopProductsView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CustomerAnalyticsView(APIView):
    """Analytiques clients"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            store_id = request.query_params.get('store_id')
            days = int(request.query_params.get('days', 90))
            
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Filtres
            sale_filter = {'sale_date__range': [start_date, end_date]}
            order_filter = {'order_date__range': [start_date, end_date]}
            if store_id and store_id not in ['null', 'undefined', '']:
                sale_filter['store_id'] = store_id
                order_filter['store_id'] = store_id
            
            # Clients actifs (vents)
            active_customers_sales = Sale.objects.filter(**sale_filter).values(
                'customer'
            ).distinct().count()
            
            # Clients actifs (commandes)
            active_customers_orders = Order.objects.filter(**order_filter).values(
                'customer'
            ).distinct().count()
            
            # Clients uniques (au moins une vente OU une commande)
            unique_customers = set(
                list(Sale.objects.filter(**sale_filter).exclude(customer__isnull=True).values_list('customer_id', flat=True)) +
                list(Order.objects.filter(**order_filter).exclude(customer__isnull=True).values_list('customer_id', flat=True))
            )
            
            # Dépenses moyennes
            customer_spending_sales = Sale.objects.filter(
                **sale_filter,
                customer__isnull=False
            ).values('customer').annotate(
                total_spent=Sum('total_amount'),
                visit_count=Count('id')
            ).aggregate(
                avg_spending=Avg('total_spent'),
                avg_visits=Avg('visit_count')
            )
            
            # Nouveaux clients
            new_customers = Customer.objects.filter(
                first_purchase__range=[start_date, end_date]
            ).count()
            
            return Response({
                'period': {
                    'start': start_date,
                    'end': end_date
                },
                'active_customers': {
                    'from_sales': active_customers_sales,
                    'from_orders': active_customers_orders,
                    'unique_total': len(unique_customers)
                },
                'new_customers': new_customers,
                'average_spending': customer_spending_sales['avg_spending'] or 0,
                'average_visits': customer_spending_sales['avg_visits'] or 0
            })
            
        except Exception as e:
            print(f"Erreur dans CustomerAnalyticsView: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
