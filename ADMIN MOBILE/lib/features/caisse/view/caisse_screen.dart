// lib/features/caisse/views/caisse_screen.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/cash_register_service.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';

class CaisseScreen extends StatelessWidget {
  final List<String> userRoleCaisse;
  const CaisseScreen({super.key, required this.userRoleCaisse});

  bool _hasAccess(List<String> roles) {
    return roles.contains('caissier') ||
        roles.contains('gerant') ||
        roles.contains('admin');
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasAccess(userRoleCaisse)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accès Refusé')),
        body: const Center(child: Text('Vous n\'avez pas accès à ce module')),
      );
    }

    return Consumer<CaisseProvider>(
      builder: (context, provider, child) {
        return Scaffold(
          appBar: AppBar(title: const Text('Gestion de Caisse')),
          drawer: const SideMenu(),
          body: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 20),
                const Center(
                  child: Text(
                    'Module Caisse',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                const Center(
                  child: Text(
                    'Gérez vos opérations de caisse',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                ),
                const SizedBox(height: 40),
                Expanded(
                  child: ListView(
                    children: [
                      _buildMenuItem(
                        icon: Icons.point_of_sale,
                        title: provider.session != null
                            ? 'Caisse Active'
                            : 'Ouvrir une Caisse',
                        subtitle: provider.session != null
                            ? 'Continuer la session en cours'
                            : 'Démarrer une nouvelle session de caisse',
                        color: provider.session != null
                            ? Colors.green
                            : Colors.blue,
                        onTap: () async {
                          if (provider.session != null) {
                            Navigator.pushNamed(
                              context,
                              '/cashbox/operation',
                              arguments: {
                                'cashRegisterId': provider.cashRegisterId,
                                'employeeId': provider.session!.userId,
                                'storeId': provider.session!.storeId,
                              },
                            );
                          } else {
                            // Récupérer les informations nécessaires
                            final authService = Provider.of<AuthService>(
                              context,
                              listen: false,
                            );
                            final employeeId =
                                authService.currentUser?.employeeProfile?.id;
                            // Si l'utilisateur n'a pas de profil employé (par exemple propriétaire)
                            if (employeeId == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Seuls les employés (caissiers, gérants) peuvent ouvrir une caisse. Veuillez vous connecter avec un compte employé.',
                                  ),
                                  backgroundColor: Colors.orange,
                                ),
                              );
                              return;
                            }

                            final storeId =
                                authService.currentUser?.employeeProfile?.storeId;
                            if (storeId == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Aucune boutique sélectionnée'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            // Récupérer la liste des caisses
                            final cashService = CashRegisterService();
                            await cashService.fetchAvailableCashRegisters(storeId);
                            if (cashService.availableCashRegisters.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Aucune caisse trouvée pour cette boutique',
                                  ),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            // Afficher le sélecteur
                            final selected = await showDialog<int>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: const Text('Choisir une caisse'),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: cashService.availableCashRegisters
                                      .map(
                                        (cr) => ListTile(
                                          title: Text(cr.name),
                                          subtitle: Text(cr.location ?? ''),
                                          onTap: () =>
                                              Navigator.pop(context, cr.id),
                                        ),
                                      )
                                      .toList(),
                                ),
                              ),
                            );
                            if (selected != null) {
                              Navigator.pushNamed(
                                context,
                                '/cashbox/init',
                                arguments: {
                                  'cashRegisterId': selected,
                                  'employeeId': employeeId,
                                  'storeId': storeId,
                                },
                              );
                            }
                          }
                        },
                      ),
                      if (provider.session != null)
                        _buildMenuItem(
                          icon: Icons.lock_clock,
                          title: 'Clôturer la Caisse',
                          subtitle: 'Terminer la session et générer un rapport',
                          color: Colors.orange,
                          onTap: () =>
                              _showCloseConfirmation(context, provider),
                        ),
                      _buildMenuItem(
                        icon: Icons.history,
                        title: 'Historique',
                        subtitle: 'Consulter les sessions précédentes',
                        color: Colors.purple,
                        onTap: () {},
                      ),
                      _buildMenuItem(
                        icon: Icons.settings,
                        title: 'Paramètres',
                        subtitle: 'Configurer les devises et préférences',
                        color: Colors.grey,
                        onTap: () {},
                      ),
                    ],
                  ),
                ),
                if (provider.session != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.green),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: Colors.green),
                        const SizedBox(width: 10),
                        const Text(
                          'Caisse active',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const Spacer(),
                        Text('${provider.activeClientsCount} client(s)'),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }

  void _showCloseConfirmation(BuildContext context, CaisseProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer la clôture'),
        content: const Text(
          'Êtes-vous sûr de vouloir clôturer la caisse ? Cette action est irréversible.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final closedSession = await provider.closeMainCaisse();
              Navigator.pushNamed(
                context,
                '/cashbox/close',
                arguments: closedSession,
              );
                        },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Clôturer'),
          ),
        ],
      ),
    );
  }
}
