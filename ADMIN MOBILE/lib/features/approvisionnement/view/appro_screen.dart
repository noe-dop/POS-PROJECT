import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/model/appro_model.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/service/appro_provider.dart';
import 'package:provider/provider.dart';

class ApprovisionnementScreen extends StatefulWidget {
  const ApprovisionnementScreen({super.key});

  @override
  State<ApprovisionnementScreen> createState() => _ApprovisionnementScreenState();
}

class _ApprovisionnementScreenState extends State<ApprovisionnementScreen> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<ApprovisionnementProvider>(context, listen: false);
    await Future.wait([
      provider.fetchApprovisionnements(),
      provider.fetchFournisseurs(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    
    return Scaffold(
      backgroundColor: const Color(0xFFfafbfb),
      appBar: AppBar(
        title: const Text('Approvisionnement'),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        actions: [
          IconButton(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
          ),
          if (!isMobile)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: ElevatedButton.icon(
                onPressed: _showCreateOrderDialog,
                icon: const Icon(Icons.add_shopping_cart),
                label: const Text('Nouvelle commande'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
        ],
      ),
      body: Consumer<ApprovisionnementProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.approvisionnements.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.approvisionnements.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('Aucune commande d\'approvisionnement'),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _showCreateOrderDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Nouvelle commande'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _loadData,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: provider.approvisionnements.length,
              itemBuilder: (context, index) {
                final appro = provider.approvisionnements[index];
                return _buildApproCard(appro);
              },
            ),
          );
        },
      ),
      floatingActionButton: isMobile
          ? FloatingActionButton(
              onPressed: _showCreateOrderDialog,
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildApproCard(ApprovisionnementModel appro) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _showOrderDetails(appro),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _getStatusColor(appro.statut),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      appro.reference,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(appro.statut).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusLabel(appro.statut),
                      style: TextStyle(
                        fontSize: 11,
                        color: _getStatusColor(appro.statut),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.business, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(appro.fournisseurNom),
                  const Spacer(),
                  const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(_formatDate(appro.dateCommande)),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${appro.items.length} articles',
                    style: const TextStyle(color: Colors.grey),
                  ),
                  Text(
                    '${appro.montantTotal.toStringAsFixed(2)} FCFA',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateOrderDialog() {
    // TODO: Implémenter le formulaire de création de commande
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nouvelle commande'),
        content: const Text('Formulaire à implémenter'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  void _showOrderDetails(ApprovisionnementModel appro) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                appro.reference,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                appro.fournisseurNom,
                                style: const TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _getStatusColor(appro.statut).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _getStatusLabel(appro.statut),
                            style: TextStyle(color: _getStatusColor(appro.statut)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: appro.items.length,
                  itemBuilder: (context, index) {
                    final item = appro.items[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: const Icon(Icons.inventory),
                        title: Text(item.productName),
                        subtitle: Text('${item.quantite} x ${item.prixUnitaire.toStringAsFixed(2)} FCFA'),
                        trailing: Text(
                          '${item.total.toStringAsFixed(2)} FCFA',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'confirme':
        return 'Confirmé';
      case 'livre':
        return 'Livré';
      case 'annule':
        return 'Annulé';
      default:
        return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'en_attente':
        return Colors.orange;
      case 'confirme':
        return Colors.blue;
      case 'livre':
        return Colors.green;
      case 'annule':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}