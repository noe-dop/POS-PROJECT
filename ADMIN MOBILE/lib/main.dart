import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/core/services/locale_service.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/service/appro_provider.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/cash_register_service.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/caisse/services/order_provider.dart';
import 'package:nsp_pos_mobile/features/dashboard/service/dashboard_provider.dart';
import 'package:nsp_pos_mobile/features/employe/service/employe_provider.dart';
import 'package:nsp_pos_mobile/features/inventaire/service/inventaire_provider.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/stock/service/stock_provider.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'app/theme/theme_notifier.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  final authService = AuthService();
  // Charger la langue sauvegardée
  final localeService = LocaleService();
  final savedLocale = await localeService.getLocale();
  final defaultLocale = localeService.getSystemLocale();

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('fr'), Locale('en')],
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
            create: (ctx) => ProductProvider(boutiqueService: ctx.read<BoutiqueService>()),
          ),
          ChangeNotifierProvider(create: (_) => CaisseProvider()),
          ChangeNotifierProvider(create: (_) => OrderProvider()),
          ChangeNotifierProvider(create: (_) => EmployeeProvider(authService)),
          ChangeNotifierProvider(create: (_) => InventaireProvider()),
          ChangeNotifierProvider(create: (_) => ApprovisionnementProvider()),
          ChangeNotifierProvider(create: (_) => StockProvider()),
        ],
        child: const NSPPosApp(),
      ),
    ),
  );
}