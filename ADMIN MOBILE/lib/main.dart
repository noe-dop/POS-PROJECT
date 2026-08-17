import 'dart:io';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:easy_localization/easy_localization.dart';
// import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:nsp_pos_mobile/core/services/locale_service.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/service/appro_provider.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/cash_register_service.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/customers/service/customer_service.dart';
import 'package:nsp_pos_mobile/features/dashboard/service/dashboard_provider.dart';
import 'package:nsp_pos_mobile/features/employe/service/employe_provider.dart';
import 'package:nsp_pos_mobile/features/inventaire/service/inventaire_provider.dart';
import 'package:nsp_pos_mobile/features/orders/service/order_provider.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/stock/service/stock_provider.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'app/theme/theme_notifier.dart';

Future<void> main() async {
  // Pour version Web
  // if (kIsWeb) {
  //   usePathUrlStrategy();
  // }
  WidgetsFlutterBinding.ensureInitialized();
  // Pour le desktop (Windows, Linux, macOS) : on utilise FFI
  if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }
  await EasyLocalization.ensureInitialized();
  final authService = AuthService();
  // Charger la langue sauvegardée
  final localeService = LocaleService();
  final savedLocale = await localeService.getLocale();
  final defaultLocale = localeService.getSystemLocale();
  // Créer une instance unique
  final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

  // Initialiser NotificationService avec cette instance
  NotificationService.init(scaffoldMessengerKey);

  //Initialisation AppLinks
  final appLinks = AppLinks();

  // Fonction de gestion des liens
  void handleDeepLink(Uri uri, {bool isInitial = false}) {
    final path = uri.path;
    if (path == '/reset-password' || path == '/reset_password') {
      final uid = uri.queryParameters['uid'];
      final token = uri.queryParameters['token'];
      if (uid != null && token != null && uid.isNotEmpty && token.isNotEmpty) {
        if (isInitial) {
          // Lancement : stocker pour RouteDecider
          NSPPosApp.pendingResetParams = {'uid': uid, 'token': token};
        } else {
          // App déjà ouverte : navigation directe
          final navigator = NSPPosApp.navigatorKey.currentState;
          if (navigator != null) {
            navigator.pushNamed('${uri.path}?${uri.query}');
          } else {
            // Fallback : stocker au cas où
            NSPPosApp.pendingResetParams = {'uid': uid, 'token': token};
          }
        }
      }
    }
  }

  // Écouter les liens entrants
  appLinks.uriLinkStream.listen((Uri uri) {
    handleDeepLink(uri, isInitial: false);
  });

  // Lien initial
  appLinks.getInitialLink().then((Uri? uri) {
    if (uri != null) {
      handleDeepLink(uri, isInitial: true);
    }
  });

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('fr'), Locale('en'), Locale('ar')],
      path: 'lib/localization',
      fallbackLocale: const Locale('fr'),
      startLocale: savedLocale ?? defaultLocale,
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeNotifier()),
          ChangeNotifierProvider(create: (_) => authService),
          ChangeNotifierProvider(create: (_) => BoutiqueService()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
          ChangeNotifierProvider(create: (_) => CashRegisterService()),
          ChangeNotifierProvider(create: (_) => TypesProduitsViewModel()),
          ChangeNotifierProvider(
            create: (ctx) =>
                ProductProvider(boutiqueService: ctx.read<BoutiqueService>()),
          ),
          ChangeNotifierProvider(create: (_) => CaisseProvider()),
          ChangeNotifierProvider(create: (_) => OrderProvider()),
          ChangeNotifierProvider(create: (_) => EmployeeProvider(authService)),
          ChangeNotifierProvider(create: (_) => InventaireProvider()),
          ChangeNotifierProvider(create: (_) => ApprovisionnementProvider()),
          ChangeNotifierProvider(create: (_) => StockProvider()),
          ChangeNotifierProvider(create: (_) => CustomerProvider()),
        ],
        child: NSPPosApp(
          scaffoldMessengerKey : scaffoldMessengerKey
        ),
      ),
    ),
  );
}
