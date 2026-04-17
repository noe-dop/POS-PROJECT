import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/service/appro_provider.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_form.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/employe/service/employe_provider.dart';
import 'package:nsp_pos_mobile/features/inventaire/service/inventaire_provider.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/stock/service/stock_provider.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:provider/provider.dart';
import 'app/app.dart';
import 'app/theme/theme_notifier.dart';

Future<void> main() async {
  // Initialize Easy Localization

  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  final boutiqueService = BoutiqueService();

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('fr'), Locale('en')],
      path: 'lib/localization',
      fallbackLocale: const Locale('fr'),
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeNotifier()),
          ChangeNotifierProvider(create: (_) => AuthService()),
          ChangeNotifierProvider(create: (_) => boutiqueService),
          ChangeNotifierProvider(create: (_) => TypesProduitsViewModel()),
          ChangeNotifierProvider(
            create: (_) => ProductProvider(boutiqueService: boutiqueService),
          ),
          ChangeNotifierProvider(create: (_) => EmployeeProvider()),
          ChangeNotifierProvider(create: (_) => InventaireProvider()),
          ChangeNotifierProvider(create: (_) => ApprovisionnementProvider()),
          ChangeNotifierProvider(create: (_) => StockProvider()),
        ],
        child: const NSPPosApp(),
      ),
    ),
  );
}
