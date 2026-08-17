import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:provider/provider.dart';

class OpenSessionsListScreen extends StatelessWidget {
  const OpenSessionsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<CaisseProvider>(
      builder: (context, provider, child) {
        final openSessions = provider.sessionHistory
            .where((s) => s['status'] == 'open' || s['status'] == 'suspended')
            .toList();

        return ListView.builder(
          itemCount: openSessions.length,
          itemBuilder: (context, index) {
            final session = openSessions[index];
            return ListTile(
              title: Text('Session #${session['id']}'),
              subtitle: Text('Caisse: ${session['cash_register_name']} - ${session['employee_name']}'),
              trailing: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                onPressed: () => _showForceCloseDialog(context, provider, session['id']),
                child: const Text('Forcer fermeture'),
              ),
            );
          },
        );
      },
    );
  }

  void _showForceCloseDialog(BuildContext context, CaisseProvider provider, int sessionId) {
    // Afficher un dialogue avec un champ commentaire, puis appeler provider.forceCloseSession(sessionId, comment)
  }
}
