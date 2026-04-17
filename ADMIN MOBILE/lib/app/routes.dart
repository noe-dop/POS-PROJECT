import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/view/appro_screen.dart';
import 'package:nsp_pos_mobile/features/auth/view/forgot_password.dart';
import 'package:nsp_pos_mobile/features/auth/view/register_screen.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/boutiques_view.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/create_boutique_form.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_operation_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_cloture_screen.dart';
import 'package:nsp_pos_mobile/features/caisse/view/caisse_initialisation_screen.dart';
import 'package:nsp_pos_mobile/features/dashboard/view/dashbord_screen.dart';
import 'package:nsp_pos_mobile/features/employe/view/employee_screen.dart';
import 'package:nsp_pos_mobile/features/inventaire/view/inventaire_screen.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/view/produits_screen.dart';
import 'package:nsp_pos_mobile/features/settings/view/settings_screen.dart';
import 'package:nsp_pos_mobile/features/stock/view/stock_screen.dart';
import 'package:nsp_pos_mobile/features/type_produits/view/type_produits_view.dart';
import 'package:provider/provider.dart';
import '../features/auth/view/login_screen.dart';

// Rôles autorisés pour la caisse
List<String> userRoleCaisse = ["caissier", "gerant", "admin"];

final Map<String, WidgetBuilder> appRoutes = {
  "/login": (context) => const LoginScreen(),
  "/signup": (context) => const RegisterScreen(),
  "/forgot_password": (context) => const ForgotPasswordPage(),
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
  "/cashbox": (context) => CaisseScreen(userRoleCaisse: userRoleCaisse),

  // Route d'initialisation de la caisse
  "/cashbox/init": (context) {
    final args = ModalRoute.of(context)?.settings.arguments;

    // Vérifier si on a des arguments
    if (args == null || args is! List<String>) {
      // Retourner à l'écran précédent avec un message d'erreur
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Paramètres manquants'),
            backgroundColor: Colors.red,
          ),
        );
        Navigator.pop(context);
      });

      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return CaisseInitialisationScreen(userRoles: args);
  },

  // Route d'opération de caisse (après initialisation)
  "/cashbox/operation": (context) => const CaisseOperationScreen(),

  // Route de clôture de caisse
  "/cashbox/close": (context) {
    final args = ModalRoute.of(context)?.settings.arguments;

    if (args == null) {
      // Retourner à l'écran précédent
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Aucune session à afficher'),
            backgroundColor: Colors.orange,
          ),
        );
        Navigator.pop(context);
      });

      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return CaisseClotureScreen(sessionData: args);
  },
  "/inventory": (context) => const InventaireScreen(),
  "/procurement": (context) => const ApprovisionnementScreen(),
  "/stock": (context) => const StockScreen(),
};
