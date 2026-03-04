import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/auth/widgets/auth_form.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';

class SideMenu extends StatefulWidget {
  const SideMenu({super.key});

  @override
  State<SideMenu> createState() => _SideMenuState();
}

class _SideMenuState extends State<SideMenu> {
  String? _getCurrentRoute(BuildContext context) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    return currentRoute;
  }

  @override
  Widget build(BuildContext context) {
    // Récupérer AuthService avec Consumer
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        return _buildDrawerContent(context, authService);
      },
    );
  }

  Widget _buildDrawerContent(BuildContext context, AuthService authService) {
    final currentRoute = _getCurrentRoute(context);
    final userData = authService.userData;
    final user = userData as Map<String, dynamic>?;

    // Configuration des modules avec icônes et couleurs
    final List<Map<String, dynamic>> menuItems = [
      {
        'title': LocaleKeys.dashboardTitle.tr(),
        'route': '/dashboard',
        'icon': Icons.dashboard,
        'selectedColor': Colors.blue,
        'iconColor': Colors.blue,
      },
      {
        'title': 'Mes Boutiques',
        'route': '/stores',
        'icon': Icons.store,
        'selectedColor': Colors.green,
        'iconColor': Colors.green,
      },
      {
        'title': 'Caisse',
        'route': '/cashbox',
        'icon': Icons.point_of_sale,
        'selectedColor': Colors.orange,
        'iconColor': Colors.orange,
      },
      {
        'title': LocaleKeys.employeesTitle.tr(),
        'route': '/employees',
        'icon': Icons.people,
        'selectedColor': Colors.purple,
        'iconColor': Colors.purple,
      },
      {
        'title': LocaleKeys.typeProductsTitle.tr(),
        'route': '/types_produits',
        'icon': Icons.category,
        'selectedColor': Colors.indigo,
        'iconColor': Colors.indigo,
      },
      {
        'title': LocaleKeys.productTitle.tr(),
        'route': '/produits',
        'icon': Icons.inventory,
        'selectedColor': Colors.teal,
        'iconColor': Colors.teal,
      },
      {
        'title': 'Inventaire',
        'route': '/inventory',
        'icon': Icons.list_alt,
        'selectedColor': Colors.indigo,
        'iconColor': Colors.indigo,
      },
      {
        'title': 'Statistiques',
        'route': '/statistics',
        'icon': Icons.bar_chart,
        'selectedColor': Colors.red,
        'iconColor': Colors.red,
      },
      {
        'title': 'Abonnements',
        'route': '/subscriptions',
        'icon': Icons.card_membership,
        'selectedColor': Colors.pink,
        'iconColor': Colors.pink,
      },
      {
        'title': 'Approvisionnement',
        'route': '/procurement',
        'icon': Icons.local_shipping,
        'selectedColor': Colors.brown,
        'iconColor': Colors.brown,
      },
      {
        'title': 'Stock',
        'route': '/stock',
        'icon': Icons.warehouse,
        'selectedColor': Colors.cyan,
        'iconColor': Colors.cyan,
      },
      {
        'title': LocaleKeys.settingsTitle.tr(),
        'route': '/settings',
        'icon': Icons.settings,
        'selectedColor': Colors.grey[700]!,
        'iconColor': Colors.grey[600]!,
      },
    ];

    return Drawer(
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFfafbfb),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [const Color(0xFFfafbfb), Colors.grey[50]!],
          ),
        ),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            // En-tête avec informations utilisateur
            _buildUserHeader(context, user),
            const SizedBox(height: 10),

            // Liste des modules
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                children: menuItems.map((item) {
                  // Utiliser la route actuelle pour déterminer si l'élément est sélectionné
                  bool isSelected = currentRoute == item['route'];
                  return _buildMenuItem(
                    context: context,
                    title: item['title'],
                    route: item['route'],
                    icon: item['icon'],
                    isSelected: isSelected,
                    selectedColor: item['selectedColor'],
                    iconColor: item['iconColor'],
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 20),

            // Bouton de déconnexion
            _buildLogoutButton(context, authService),
            const SizedBox(height: 20),

            // Version de l'application
            _buildAppVersion(),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildUserHeader(BuildContext context, Map<String, dynamic>? user) {
    // Extraire les informations utilisateur
    final fullName = user?['full_name'];
    final email = user?['email'];
    final role = user?['role'];
    final firstName = user?['first_name'];
    final lastName = user?['last_name'];

    // Créer les initiales pour l'avatar
    String getInitials() {
     /// Générer les initiales à partir du nom complet ou prénom/nom
      if (firstName.isNotEmpty && lastName.isNotEmpty) {
        return '${firstName[0]}${lastName[0]}'.toUpperCase();
      } else if (firstName.isNotEmpty) {
        return firstName[0].toUpperCase();
      } else if (lastName.isNotEmpty) {
        return lastName[0].toUpperCase();
      } else if (fullName.isNotEmpty) {
        final parts = fullName.split(' ');
        if (parts.length >= 2) {
          return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
        }
        return fullName[0].toUpperCase();
      }
      return 'U';
    }

    // Couleur basée sur le rôle ou l'email
    Color getAvatarColor() {
      if (user == null) return Colors.blue;

      // Générer une couleur stable basée sur l'email ou le nom
      final hash = (email.isNotEmpty ? email : fullName).hashCode;
      final colors = [
        Colors.blue,
        Colors.green,
        Colors.orange,
        Colors.purple,
        Colors.red,
        Colors.teal,
        Colors.indigo,
      ];
      return colors[hash.abs() % colors.length];
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color.fromARGB(255, 236, 236, 237),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Avatar avec initiales
          CircleAvatar(
            radius: 40,
            backgroundColor: getAvatarColor(),
            child: Text(
              getInitials(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Nom complet
          Text(
            fullName,
            textAlign: TextAlign.center,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),

          const SizedBox(height: 4),

          // Email
          if (email.isNotEmpty)
            Text(
              email,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.black.withValues(alpha: 0.8),
                fontSize: 12,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),

          const SizedBox(height: 8),

          // Badge du rôle
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _getRoleColor(role).withValues(alpha: 0.2),
              border: Border.all(
                color: _getRoleColor(role).withValues(alpha: 0.5),
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _getRoleColor(role),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  role.toUpperCase(),
                  style: TextStyle(
                    color: _getRoleColor(role),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required BuildContext context,
    required String title,
    required String? route,
    required IconData icon,
    required bool isSelected,
    required Color selectedColor,
    required Color iconColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: isSelected
            ? selectedColor.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: () {
            if (route != null) {
              // Fermer le drawer avant de naviguer
              Navigator.pop(context);
              // Naviguer vers la nouvelle route
              Navigator.pushNamed(context, route);
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(
                  color: isSelected ? selectedColor : Colors.transparent,
                  width: 4,
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? selectedColor
                        : iconColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: isSelected ? Colors.white : iconColor,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: TextStyle(
                      color: isSelected
                          ? selectedColor
                          : const Color(0xFF565d6d),
                      fontSize: 14,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                ),
                if (isSelected)
                  Icon(Icons.chevron_right, color: selectedColor, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context, AuthService authService) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.red[400]!, Colors.red[600]!],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.red.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: () async {
            // Afficher un dialogue de confirmation
            final shouldLogout = await showDialog<bool>(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Déconnexion'),
                content: const Text('Voulez-vous vraiment vous déconnecter ?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Annuler'),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                    child: const Text('Déconnexion'),
                  ),
                ],
              ),
            );

            if (shouldLogout == true) {
              // Fermer le drawer immédiatement
              Navigator.pop(context);

              // Ne pas attendre, naviguer directement
              // La déconnexion se fera en arrière-plan
              final String? refreshToken = authService.refreshToken;

              // Lancer la déconnexion en arrière-plan
              Future.delayed(Duration.zero, () async {
                await authService.logout(refreshToken ?? '');
              });

              // Naviguer immédiatement vers login
              Navigator.of(context).popUntil((route) => route.isFirst);
              Navigator.pushReplacementNamed(context, '/login');
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            shadowColor: Colors.transparent,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.logout, size: 20),
              const SizedBox(width: 10),
              const Text(
                'Déconnexion',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppVersion() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            'NSP PRO POS v1.0.0',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            '© 2024 NSP Solutions. Tous droits réservés.',
            style: TextStyle(color: Colors.grey[500], fontSize: 12),
          ),
        ],
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'owner':
        return Colors.purple;
      case 'admin':
        return Colors.red;
      case 'manager':
        return Colors.orange;
      case 'superuser':
        return Colors.deepOrange;
      case 'employee':
        return Colors.blue;
      case 'cashier':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }
}
