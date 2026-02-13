import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/dashboard/widgets/side_menu.dart';
import '../services/caisse_service.dart';

class CaisseScreen extends StatefulWidget {
  final List<String> userRoleCaisse;
  
  const CaisseScreen({
    super.key,
    required this.userRoleCaisse,
  });

  @override
  State<CaisseScreen> createState() => _CaisseScreenState();
}

class _CaisseScreenState extends State<CaisseScreen> {
  final CaisseService _caisseService = CaisseService();
  bool _hasAccess = true;

  @override
  void initState() {
    super.initState();
    _checkAccess();
  }

  void _checkAccess() {
    final hasAccess = widget.userRoleCaisse.contains('caissier') ||
                     widget.userRoleCaisse.contains('gerant') ||
                     widget.userRoleCaisse.contains('admin');
    
    if (!hasAccess) {
      _hasAccess = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showAccessError();
      });
    }
  }

  void _showAccessError() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Accès refusé: Vous n\'avez pas les permissions nécessaires'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 3),
      ),
    );
    
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pop(context);
    });
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    bool enabled = true,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Opacity(
        opacity: enabled ? 1.0 : 0.5,
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: color.withValues(alpha: 0.1),
            child: Icon(icon, color: color),
          ),
          title: Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          subtitle: Text(subtitle),
          trailing: const Icon(Icons.arrow_forward_ios, size: 16),
          onTap: enabled ? onTap : null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasAccess) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accès Refusé')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error, size: 64, color: Colors.red),
              SizedBox(height: 20),
              Text(
                'Vous n\'avez pas accès à ce module',
                style: TextStyle(fontSize: 18),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestion de Caisse'),
        centerTitle: true,
      ),
      drawer: const SideMenu(),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 20),
            
            // Titre principal
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
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
            ),
            
            const SizedBox(height: 40),
            
            // Menu options
            Expanded(
              child: ListView(
                children: [
                  // Option 1: Ouvrir/Continuer caisse
                  _buildMenuItem(
                    icon: Icons.point_of_sale,
                    title: _caisseService.hasActiveSession
                        ? 'Caisse Active'
                        : 'Ouvrir une Caisse',
                    subtitle: _caisseService.hasActiveSession
                        ? 'Continuer la session en cours'
                        : 'Démarrer une nouvelle session de caisse',
                    color: _caisseService.hasActiveSession ? Colors.green : Colors.blue,
                    onTap: () {
                      if (_caisseService.hasActiveSession) {
                        Navigator.pushNamed(context, '/cashbox/operation');
                      } else {
                        Navigator.pushNamed(
                          context, 
                          '/cashbox/init',
                          arguments: widget.userRoleCaisse,
                        );
                      }
                    },
                  ),
                  
                  // Option 2: Clôturer (seulement si active)
                  if (_caisseService.hasActiveSession)
                    _buildMenuItem(
                      icon: Icons.lock_clock,
                      title: 'Clôturer la Caisse',
                      subtitle: 'Terminer la session et générer un rapport',
                      color: Colors.orange,
                      onTap: _showCloseConfirmation,
                    ),
                  
                  // Option 3: Historique
                  _buildMenuItem(
                    icon: Icons.history,
                    title: 'Historique',
                    subtitle: 'Consulter les sessions précédentes',
                    color: Colors.purple,
                    onTap: () {
                      // TODO: Implémenter l'historique
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité à venir'),
                        ),
                      );
                    },
                  ),
                  
                  // Option 4: Paramètres
                  _buildMenuItem(
                    icon: Icons.settings,
                    title: 'Paramètres',
                    subtitle: 'Configurer les devises et préférences',
                    color: Colors.grey,
                    onTap: () {
                      // TODO: Implémenter les paramètres
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité à venir'),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            
            // Statut de la caisse
            if (_caisseService.hasActiveSession)
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
                    const Text('Caisse active', style: TextStyle(fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Text('${_caisseService.activeClientsCount} client(s)'),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showCloseConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer la clôture'),
        content: const Text('Êtes-vous sûr de vouloir clôturer la caisse ? Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
            ),
            onPressed: () {
              Navigator.pop(context);
              _closeCaisse();
            },
            child: const Text('Clôturer'),
          ),
        ],
      ),
    );
  }

  void _closeCaisse() {
    try {
      final closedSession = _caisseService.closeMainCaisse();
      Navigator.pushNamed(
        context,
        '/cashbox/close',
        arguments: closedSession,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}