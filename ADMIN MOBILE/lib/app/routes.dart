import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/view/appro_screen.dart';
import 'package:nsp_pos_mobile/features/auth/view/forgot_password.dart';
import 'package:nsp_pos_mobile/features/auth/view/register_screen.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/boutiques_view.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/create_boutique_form.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_cloture_report_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_operation_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_cloture_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_initialisation_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/historique_sessions_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session_model.dart';
import 'package:nsp_pos_mobile/features/customers/view/create_customer_screen.dart';
import 'package:nsp_pos_mobile/features/dashboard/view/dashbord_screen.dart';
import 'package:nsp_pos_mobile/features/employe/view/employee_screen.dart';
import 'package:nsp_pos_mobile/features/inventaire/view/inventaire_screen.dart';
import 'package:nsp_pos_mobile/features/orders/view/order_screen.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/view/produits_screen.dart';
import 'package:nsp_pos_mobile/features/settings/view/settings_screen.dart';
import 'package:nsp_pos_mobile/features/stock/view/stock_screen.dart';
import 'package:nsp_pos_mobile/features/type_produits/view/type_produits_view.dart';
import 'package:provider/provider.dart';
import '../features/auth/view/login_screen.dart';

final Map<String, WidgetBuilder> appRoutes = {
  "/login": (context) => const LoginScreen(),
  "/signup": (context) => const RegisterScreen(),
  "/forgot_password": (context) => const ForgotPasswordScreen(),
  "/dashboard": (context) => const DashboardScreen(),
  "/stores": (context) => const BoutiquesView(),
  "/create_store": (context) => CreateBoutiqueForm(
    onSuccess: () {
      Navigator.pop(context);
    },
    onCancel: () {
      Navigator.pop(context);
    },
  ),
  "/employees": (context) => const EmployeeScreen(),
  "/types_produits": (context) => const TypesProduitsView(),
  "/produits": (context) =>
      ChangeNotifierProxyProvider<BoutiqueService, ProductProvider>(
        create: (_) => ProductProvider(boutiqueService: BoutiqueService()),
        update: (_, boutiqueService, productProvider) {
          if (boutiqueService.selectedStore != null) {
            productProvider!.setStore(
              boutiqueService.selectedStore!.boutique.id,
            );
          }
          return productProvider!;
        },
        child: const ProductsPage(),
      ),
  "/settings": (context) => const SettingsScreen(),

  // Route principale de la caisse (menu)
  "/cashbox": (context) => CaisseScreen(),

  // Route d'initialisation de la caisse
  "/cashbox/init": (context) {
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final userRoles = args?['userRoles'] as List<String>? ?? [];
    final cashRegisterId = args?['cashRegisterId'] ?? 0;
    final employeeId = args?['employeeId'] ?? 0;
    return CaisseInitialisationScreen(
      userRoles: userRoles,
      cashRegisterId: cashRegisterId,
      employeeId: employeeId,
    );
  },

  // Route d'opération de caisse (après initialisation)
  "/cashbox/operation": (context) {
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final storeId = args?['storeId'];
    final employeeId = args?['employeeId'];
    final cashRegisterId = args?['cashRegisterId'];
    return CaisseOperationScreen(
      storeId: storeId,
      employeeId: employeeId,
      cashRegisterId: cashRegisterId,
    );
  },
  // Route d'historique des sessions
  '/cashbox/history': (context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    return HistoriqueSessionsScreen(initialStoreId: args?['storeId']);
  },
  // routes.dart
  "/create_customer": (context) => const CreateCustomerScreen(),
  // Route de clôture de caisse
  "/cashbox/close": (context) {
    return CaisseClotureScreen();
  },
  "/cashbox/close/report": (context) {
    final args = ModalRoute.of(context)?.settings.arguments as CaisseSession?;
    return CaisseClotureReportScreen(session: args!);
  },
  "/inventory": (context) => const InventaireScreen(),
  "/procurement": (context) => const ApprovisionnementScreen(),
  "/stock": (context) => const StockScreen(),
  "/orders": (context) => const OrderScreen(),
  "/supply": (context) => const ApprovisionnementScreen(),
};
