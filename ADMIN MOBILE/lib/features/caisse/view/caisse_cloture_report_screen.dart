// lib/features/caisse/views/caisse_cloture_report_screen.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session_model.dart';

class CaisseClotureReportScreen extends StatelessWidget {
  final CaisseSession session;

  const CaisseClotureReportScreen({super.key, required this.session});

  @override
  Widget build(BuildContext context) {
    final difference = session.difference;
    final isBalanced = difference.abs() < 0.01;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rapport de Clôture'),
        centerTitle: true,
      ),
      drawer: const SideMenu(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            // Icône de succès
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  isBalanced ? Icons.check_circle : Icons.warning,
                  size: 40,
                  color: isBalanced ? Colors.green : Colors.orange,
                ),
                const SizedBox(height: 16),
                Text(
                  isBalanced ? 'Clôture réussie' : 'Clôture avec écart',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: isBalanced ? Colors.green : Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Carte principale
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    const Text(
                      'RÉCAPITULATIF',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _buildInfoRow(
                      'Date d\'ouverture',
                      _formatDateTime(session.startTime),
                    ),
                    _buildInfoRow(
                      'Date de clôture',
                      _formatDateTime(session.endTime!),
                    ),
                    const Divider(height: 30),
                    _buildInfoRow(
                      'Fond initial',
                      '${session.totalInitial.toStringAsFixed(0)} ${session.currency}',
                      isBold: true,
                    ),
                    _buildInfoRow(
                      'Fond attendu',
                      '${session.expectedCashBalance.toStringAsFixed(0)} ${session.currency}',
                      isBold: true,
                    ),
                    _buildInfoRow(
                      'Fond déclaré',
                      '${session.totalCurrentCash.toStringAsFixed(0)} ${session.currency}',
                      isBold: true,
                    ),
                    _buildInfoRow(
                      'Différence',
                      '${difference > 0 ? '+' : ''}${difference.toStringAsFixed(0)} ${session.currency}',
                      color: isBalanced ? Colors.green : Colors.red,
                      isBold: true,
                      fontSize: 18,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      isBalanced ? 'Caisse en règle' : ' Écart détecté',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isBalanced ? Colors.green : Colors.orange,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Statistiques
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    const Text(
                      'STATISTIQUES',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _buildInfoRow(
                      'Nombre de transactions',
                      session.transactions.length.toString(),
                    ),
                    _buildInfoRow(
                      'Chiffre d\'affaires',
                      '${session.transactions.fold(0.0, (sum, t) => sum + t.amount).toStringAsFixed(0)} ${session.currency}',
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 40),

            // Boutons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      // TODO: Imprimer le rapport
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Impression à implémenter'),
                        ),
                      );
                    },
                    child: const Text('IMPRIMER'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pushNamedAndRemoveUntil(
                        context,
                        '/cashbox',
                        (route) => false,
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                    child: const Text('TERMINER'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(
    String label,
    String value, {
    Color? color,
    bool isBold = false,
    double fontSize = 14,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: fontSize, color: Colors.grey[600]),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
