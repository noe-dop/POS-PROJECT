import 'dart:async';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/auth/view/reset_password_screen.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';
import 'routes.dart';
import '../app/theme/theme_notifier.dart';

class NSPPosApp extends StatelessWidget {
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;
  const NSPPosApp({super.key,
  required this.scaffoldMessengerKey});

  // Clé globale pour naviguer depuis n'importe où
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  static Map<String, String>? pendingResetParams;

  @override
  Widget build(BuildContext context) {
    final themeNotifier = Provider.of<ThemeNotifier>(context);
    return Consumer<ThemeNotifier>(
      builder: (context, value, child) {
        return MaterialApp(
          navigatorKey: navigatorKey,
          scaffoldMessengerKey: scaffoldMessengerKey,
          title: 'NSP POS PRO',
          debugShowCheckedModeBanner: false,
          theme: themeNotifier.currentTheme,
          home: const RouteDecider(), // Page qui décide de la route
          onGenerateRoute: _onGenerateRoute,
          localizationsDelegates: context.localizationDelegates,
          supportedLocales: context.supportedLocales,
          locale: context.locale,
        );
      },
    );
  }

  Route<dynamic>? _onGenerateRoute(RouteSettings settings) {
    // 1. Gérer la route de réinitialisation (avec query parameters)
    final String? routeName = settings.name;
    if (routeName != null &&
        (routeName.startsWith('/reset_password') ||
            routeName.startsWith('/reset-password'))) {
      final uri = Uri.parse(routeName);
      final uid = uri.queryParameters['uid'];
      final token = uri.queryParameters['token'];
      if (uid != null && token != null) {
        return MaterialPageRoute(
          builder: (context) => ResetPasswordScreen(uid: uid, token: token),
        );
      } else {
        return MaterialPageRoute(
          builder: (context) => const Scaffold(
            body: Center(child: Text('Lien invalide - paramètres manquants')),
          ),
        );
      }
    }

    // 2. Routes définies dans appRoutes
    if (appRoutes.containsKey(settings.name)) {
      return MaterialPageRoute(
        builder: (context) => appRoutes[settings.name]!(context),
        settings: settings
      );
    }

    // 3. Fallback
    return MaterialPageRoute(
      builder: (context) =>
          const Scaffold(body: Center(child: Text('Page non trouvée'))),
    );
  }
}

class RouteDecider extends StatefulWidget {
  const RouteDecider({super.key});

  @override
  State<RouteDecider> createState() => _RouteDeciderState();
}

class _RouteDeciderState extends State<RouteDecider> {
  bool _isCheckingAuth = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAuthentication();
    });
  }

  Future<void> _checkAuthentication() async {
    await Future.delayed(const Duration(milliseconds: 500));

    if (mounted) {
      setState(() {
        _isCheckingAuth = false;
      });
    }
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        if (_isCheckingAuth) {
          return _buildLoadingScreen();
        }

        // Lien en attente
        final pending = NSPPosApp.pendingResetParams;
        if (pending != null) {
          // On capture ET on vide IMMEDIATEMENT, avant tout autre rebuild possible
          NSPPosApp.pendingResetParams = null;
          final uid = pending['uid']!;
          final token = pending['token']!;

          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) return;
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) =>
                    ResetPasswordScreen(uid: uid, token: token),
              ),
            );
          });
          return _buildLoadingScreen();
        }

        // Redirection normale
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          if (authService.isAuthenticated) {
            Navigator.pushReplacementNamed(context, '/dashboard');
          } else {
            Navigator.pushReplacementNamed(context, '/login');
          }
        });

        return _buildLoadingScreen();
      },
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 20),
            Text(LocaleKeys.commonLoading.tr(), style: const TextStyle(fontSize: 16)),
            // Text(
            //   LocaleKeys.commonLoading.tr(),
            //   style: const TextStyle(fontSize: 16),
            // ),
          ],
        ),
      ),
    );
  }
}
