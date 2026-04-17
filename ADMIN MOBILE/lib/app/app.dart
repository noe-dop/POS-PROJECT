import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_form.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';
import 'routes.dart';
import '../app/theme/theme_notifier.dart';

class NSPPosApp extends StatelessWidget {
  const NSPPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeNotifier = Provider.of<ThemeNotifier>(context);

    return MaterialApp(
      title: 'NSP POS PRO',
      debugShowCheckedModeBanner: false,
      theme: themeNotifier.currentTheme,
      home: const RouteDecider(), // Page qui décide de la route
      routes: appRoutes,
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
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
    _checkAuthentication();
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
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    if (_isCheckingAuth) {
      return _buildLoadingScreen();
    }
    
    // Une fois la vérification terminée, décider de la route
    if (authService.isAuthenticated) {
      // Rediriger vers le dashboard
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/dashboard');
      });
    } else {
      // Rediriger vers le login
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacementNamed(context, '/login');
      });
    }
    
    // Retourner un écran vide pendant la redirection
    return _buildLoadingScreen();
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
          ],
        ),
      ),
    );
  }
}