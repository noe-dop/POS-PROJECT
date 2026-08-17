import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/auth/view/forgot_password.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/user_model.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Contrôleurs pour le changement de mot de passe
  final TextEditingController _currentPasswordController =
      TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  bool _isChangingPassword = false;
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final current = _currentPasswordController.text.trim();
    final newPwd = _newPasswordController.text.trim();
    final confirm = _confirmPasswordController.text.trim();

    if (current.isEmpty || newPwd.isEmpty || confirm.isEmpty) {
      NotificationService.showWarning(
        context,
        'Tous les champs sont obligatoires',
      );
      return;
    }

    if (newPwd != confirm) {
      NotificationService.showWarning(
        context,
        'Les mots de passe ne correspondent pas',
      );
      return;
    }

    if (newPwd.length < 6) {
      NotificationService.showWarning(
        context,
        'Le mot de passe doit contenir au moins 6 caractères',
      );
      return;
    }

    setState(() => _isChangingPassword = true);

    try {
      final authService = context.read<AuthService>();
      final success = await authService.changePassword(
        currentPassword: current,
        newPassword: newPwd,
      );

      if (success) {
        NotificationService.showSuccess(
          context,
          'Mot de passe modifié avec succès',
        );
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      } else {
        NotificationService.showError(
          context,
          authService.errorMessage ?? 'Erreur lors du changement',
        );
      }
    } catch (e) {
      NotificationService.showError(context, 'Erreur: $e');
    } finally {
      if (mounted) setState(() => _isChangingPassword = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final user = authService.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.settingsTitle.tr()),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Profil'),
            Tab(text: 'Sécurité'),
            Tab(text: 'Langue'),
            Tab(text: 'À propos'),
          ],
        ),
      ),
      drawer: const SideMenu(),
      body: TabBarView(
        controller: _tabController,
        children: [
          // --- Onglet Profil ---
          _buildProfileTab(user),

          // --- Onglet Sécurité (Changement de mot de passe) ---
          _buildSecurityTab(),

          // --- Onglet Langue ---
          _buildLanguageTab(),

          // --- Onglet À propos ---
          _buildAboutTab(),
        ],
      ),
    );
  }

  Widget _buildProfileTab(User? user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Informations personnelles',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Divider(),
              _buildInfoRow('Nom complet', user?.fullName ?? '—'),
              _buildInfoRow('Email', user?.email ?? '—'),
              _buildInfoRow('Téléphone', user?.phone ?? '—'),
              _buildInfoRow('Rôle', user?.role ?? '—'),
              const SizedBox(height: 16),
              // Option : bouton pour modifier le profil
              // OutlinedButton.icon(
              //   onPressed: () {},
              //   icon: const Icon(Icons.edit),
              //   label: const Text('Modifier le profil'),
              // ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSecurityTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Changer le mot de passe',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Divider(),
              // Mot de passe actuel
              TextField(
                controller: _currentPasswordController,
                obscureText: _obscureCurrent,
                decoration: InputDecoration(
                  labelText: 'Mot de passe actuel',
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureCurrent ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureCurrent = !_obscureCurrent;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Nouveau mot de passe
              TextField(
                controller: _newPasswordController,
                obscureText: _obscureNew,
                decoration: InputDecoration(
                  labelText: 'Nouveau mot de passe',
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureNew ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureNew = !_obscureNew;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 12),
              // Confirmation
              TextField(
                controller: _confirmPasswordController,
                obscureText: _obscureConfirm,
                decoration: InputDecoration(
                  labelText: 'Confirmer le mot de passe',
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureConfirm ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscureConfirm = !_obscureConfirm;
                      });
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (_isChangingPassword)
                const Center(child: CircularProgressIndicator())
              else
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _changePassword,
                        child: const Text('Changer le mot de passe'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      onPressed: () {
                        _currentPasswordController.clear();
                        _newPasswordController.clear();
                        _confirmPasswordController.clear();
                      },
                      child: const Text('Annuler'),
                    ),
                  ],
                ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ForgotPasswordScreen(),
                    ),
                  );
                },
                child: const Text('Mot de passe oublié ?'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLanguageTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Langue',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Divider(),
              const Text('Choisissez votre langue préférée :'),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildLanguageButton(context, 'fr', 'Français'),
                  _buildLanguageButton(context, 'en', 'English'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAboutTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'À propos',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.info_outline),
                title: const Text('Version'),
                trailing: const Text('2.0.0'),
              ),
              ListTile(
                leading: const Icon(Icons.business),
                title: const Text('Application'),
                trailing: const Text('NSP POS Mobile'),
              ),
              const Divider(),
              const Text(
                '© 2025 NSP Group. Tous droits réservés.',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 8),
              // Bouton déconnexion en bas
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _confirmLogout(context),
                  icon: const Icon(Icons.logout, color: Colors.red),
                  label: const Text(
                    'Se déconnecter',
                    style: TextStyle(color: Colors.red),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLanguageButton(BuildContext context, String code, String label) {
    final isSelected = context.locale.languageCode == code;
    return ElevatedButton(
      onPressed: () {
        context.setLocale(Locale(code));
        // Option : sauvegarder le choix (SharedPreferences)
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: isSelected
            ? Theme.of(context).primaryColor
            : Colors.grey[200],
        foregroundColor: isSelected ? Colors.white : Colors.black87,
      ),
      child: Text(label),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final authService = context.read<AuthService>();
              final token = authService.currentUser?.refreshToken;
              if (token != null) {
                await authService.logout(token);
              }
              // Rediriger vers login
              Navigator.pushNamedAndRemoveUntil(
                context,
                '/login',
                (route) => false,
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Déconnecter'),
          ),
        ],
      ),
    );
  }
}
