import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';

class CaisseClotureScreen extends StatelessWidget {
  final dynamic sessionData;
  
  const CaisseClotureScreen({
    super.key,
    required this.sessionData,
  });

  CaisseSession? get session {
    if (sessionData is CaisseSession) {
      return sessionData as CaisseSession;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final currentSession = session;

    if (currentSession == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erreur')),
        drawer: const SideMenu(),
        body: const Center(
          child: Text('Session invalide'),
        ),
      );
    }

    final difference = currentSession.totalCurrent - currentSession.totalInitial;
    
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
            // Titre
            const Text(
              'RAPPORT DE CLÔTURE',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
            
            const SizedBox(height: 30),
            
            // Carte principale
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    // En-tête
                    const Row(
                      children: [
                        Icon(Icons.summarize, color: Colors.blue),
                        SizedBox(width: 10),
                        Text(
                          'Résumé de la Session',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Informations
                    _buildInfoRow('ID Session', currentSession.id.substring(0, 8)),
                    _buildInfoRow('Devise', currentSession.currency),
                    _buildInfoRow('Ouverture', _formatDateTime(currentSession.startTime)),
                    if (currentSession.endTime != null)
                      _buildInfoRow('Clôture', _formatDateTime(currentSession.endTime!)),
                    
                    const Divider(height: 30),
                    
                    // Totaux
                    _buildInfoRow(
                      'Fond Initial',
                      '${currentSession.totalInitial} ${currentSession.currency}',
                      isBold: true,
                    ),
                    _buildInfoRow(
                      'Fond Final',
                      '${currentSession.totalCurrent} ${currentSession.currency}',
                      isBold: true,
                    ),
                    
                    const Divider(height: 30),
                    
                    // Différence
                    _buildInfoRow(
                      'Différence',
                      '${difference > 0 ? '+' : ''}$difference ${currentSession.currency}',
                      color: difference >= 0 ? Colors.green : Colors.red,
                      isBold: true,
                      fontSize: 18,
                    ),
                    
                    const SizedBox(height: 20),
                    
                    // Icone selon le résultat
                    Icon(
                      difference >= 0 ? Icons.check_circle : Icons.warning,
                      size: 50,
                      color: difference >= 0 ? Colors.green : Colors.orange,
                    ),
                    
                    const SizedBox(height: 10),
                    
                    Text(
                      difference >= 0 ? 'Caisse en règle' : 'Déficit détecté',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: difference >= 0 ? Colors.green : Colors.orange,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 30),
            
            // Transactions
            if (currentSession.transactions.isNotEmpty) ...[
              Card(
                elevation: 4,
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Transactions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      
                      const SizedBox(height: 15),
                      
                      Text(
                        'Nombre de transactions: ${currentSession.transactions.length}',
                        style: const TextStyle(color: Colors.grey),
                      ),
                      
                      const SizedBox(height: 15),
                      
                      // Liste limitée à 5 transactions
                      ...currentSession.transactions.take(5).map((transaction) {
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.receipt, color: Colors.blue),
                          title: Text('Client: ${transaction.clientId}'),
                          subtitle: Text(_formatDateTime(transaction.timestamp)),
                          trailing: Text(
                            '${transaction.amount} ${currentSession.currency}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
            ],
            
            const SizedBox(height: 40),
            
            // Bouton de retour
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/dashboard',
                    (route) => false,
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text(
                  'RETOUR AU TABLEAU DE BORD',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Bouton imprimer (placeholder)
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Fonction d\'impression à implémenter'),
                    ),
                  );
                },
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text('IMPRIMER LE RAPPORT'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {
    Color? color,
    bool isBold = false,
    double fontSize = 16,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              color: Colors.grey[600],
            ),
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
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}