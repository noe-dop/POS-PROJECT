import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/inventaire/model/inventaire_model.dart';
import 'package:nsp_pos_mobile/features/inventaire/service/inventaire_provider.dart';
import 'package:provider/provider.dart';

class InventaireScreen extends StatefulWidget {
  const InventaireScreen({super.key});

  @override
  State<InventaireScreen> createState() => _InventaireScreenState();
}

class _InventaireScreenState extends State<InventaireScreen> {
  final _searchController = TextEditingController();
  String _statusFilter = 'Tous';
  final List<String> _statusList = ['Tous', 'en_attente', 'en_cours', 'valide', 'annule'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<InventaireProvider>(context, listen: false);
    await provider.fetchInventaires();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    
    return Scaffold(
      backgroundColor: const Color(0xFFfafbfb),
      appBar: AppBar(
        title: const Text('Inventaire'),
        centerTitle: false,
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        actions: [
          IconButton(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
            tooltip: 'Rafraîchir',
          ),
          if (!isMobile)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: ElevatedButton.icon(
                onPressed: _showCreateInventaireDialog,
                icon: const Icon(Icons.add, size: 20),
                label: const Text('Nouvel inventaire'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
        ],
      ),
      body: Consumer<InventaireProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.inventaires.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Chargement des inventaires...'),
                ],
              ),
            );
          }

          if (provider.errorMessage != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(provider.errorMessage!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadData,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            );
          }

          final filteredInventaires = _filterInventaires(provider.inventaires);
          
          if (filteredInventaires.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('Aucun inventaire trouvé'),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _showCreateInventaireDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Créer un inventaire'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _loadData,
            child: Column(
              children: [
                // Barre de recherche et filtres
                _buildSearchAndFilters(),
                const SizedBox(height: 16),
                // Liste des inventaires
                Expanded(
                  child: isMobile
                      ? ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredInventaires.length,
                          itemBuilder: (context, index) {
                            return _buildInventaireCard(filteredInventaires[index]);
                          },
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 1.5,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                          ),
                          itemCount: filteredInventaires.length,
                          itemBuilder: (context, index) {
                            return _buildInventaireCard(filteredInventaires[index]);
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: isMobile
          ? FloatingActionButton.extended(
              onPressed: _showCreateInventaireDialog,
              icon: const Icon(Icons.add),
              label: const Text('Nouveau'),
              backgroundColor: Colors.blue,
            )
          : null,
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white,
      child: Column(
        children: [
          // Barre de recherche
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: 'Rechercher un inventaire...',
                border: InputBorder.none,
                prefixIcon: Icon(Icons.search, color: Colors.grey),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Filtres
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _statusList.map((status) {
                final isSelected = _statusFilter == status;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(_getStatusLabel(status)),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _statusFilter = selected ? status : 'Tous';
                      });
                    },
                    backgroundColor: Colors.grey[100],
                    selectedColor: Colors.blue[100],
                    checkmarkColor: Colors.blue,
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInventaireCard(InventaireModel inventaire) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => _showInventaireDetails(inventaire),
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
                      color: _getStatusColor(inventaire.statut),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      inventaire.nom,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(inventaire.statut).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusLabel(inventaire.statut),
                      style: TextStyle(
                        fontSize: 11,
                        color: _getStatusColor(inventaire.statut),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.qr_code, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    inventaire.reference,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const Spacer(),
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      inventaire.emplacement,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem(
                    Icons.inventory,
                    '${inventaire.quantiteActuelle}',
                    'Compté',
                  ),
                  _buildStatItem(
                    Icons.assignment,
                    '${inventaire.quantiteTheorique}',
                    'Théorique',
                  ),
                  _buildStatItem(
                    Icons.trending_up,
                    '${inventaire.ecart}',
                    'Écart',
                    color: inventaire.ecart != 0 ? Colors.orange : Colors.green,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Dernier inventaire: ${_formatDate(inventaire.dateDernierInventaire)}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
                textAlign: TextAlign.right,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label, {Color? color}) {
    return Column(
      children: [
        Icon(icon, size: 20, color: color ?? Colors.blue),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color ?? Colors.black87,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
      ],
    );
  }

  void _showCreateInventaireDialog() {
    final nomController = TextEditingController();
    final emplacementController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nouvel inventaire'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nomController,
              decoration: const InputDecoration(
                labelText: 'Nom de l\'inventaire',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: emplacementController,
              decoration: const InputDecoration(
                labelText: 'Emplacement (optionnel)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nomController.text.isNotEmpty) {
                final provider = Provider.of<InventaireProvider>(context, listen: false);
                // TODO: Récupérer storeId depuis BoutiqueService
                await provider.createInventaire(
                  nom: nomController.text,
                  storeId: 1, // À remplacer par le store sélectionné
                  emplacement: emplacementController.text,
                );
                if (mounted) {
                  Navigator.pop(context);
                }
              }
            },
            child: const Text('Créer'),
          ),
        ],
      ),
    );
  }

  void _showInventaireDetails(InventaireModel inventaire) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return Consumer<InventaireProvider>(
            builder: (context, provider, child) {
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
                                    inventaire.nom,
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    inventaire.reference,
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: _getStatusColor(inventaire.statut).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                _getStatusLabel(inventaire.statut),
                                style: TextStyle(color: _getStatusColor(inventaire.statut)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  Expanded(
                    child: provider.isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : provider.inventaireItems.isEmpty
                            ? const Center(child: Text('Aucun article trouvé'))
                            : ListView.builder(
                                controller: scrollController,
                                padding: const EdgeInsets.all(16),
                                itemCount: provider.inventaireItems.length,
                                itemBuilder: (context, index) {
                                  final item = provider.inventaireItems[index];
                                  return Card(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    child: ListTile(
                                      leading: Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: _getStatusColor(item.status).withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Icon(
                                          Icons.inventory,
                                          color: _getStatusColor(item.status),
                                        ),
                                      ),
                                      title: Text(
                                        item.productName,
                                        style: const TextStyle(fontWeight: FontWeight.w500),
                                      ),
                                      subtitle: Text('SKU: ${item.sku}'),
                                      trailing: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            'Attendu: ${item.expectedQuantity}',
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                          Text(
                                            'Compté: ${item.countedQuantity}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: item.difference == 0 ? Colors.green : Colors.orange,
                                            ),
                                          ),
                                        ],
                                      ),
                                      onTap: () => _showEditInventaireItemDialog(item, inventaire.id),
                                    ),
                                  );
                                },
                              ),
                  ),
                  if (inventaire.statut == 'en_cours' || inventaire.statut == 'en_attente')
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () async {
                            final provider = Provider.of<InventaireProvider>(context, listen: false);
                            await provider.validateInventaire(inventaire.id);
                            if (mounted) {
                              Navigator.pop(context);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('Valider l\'inventaire'),
                        ),
                      ),
                    ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  void _showEditInventaireItemDialog(InventaireItem item, int inventaireId) {
    final quantityController = TextEditingController(text: item.countedQuantity.toString());
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(item.productName),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('SKU: ${item.sku}'),
            const SizedBox(height: 16),
            TextField(
              controller: quantityController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Quantité comptée',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Quantité attendue: ${item.expectedQuantity}',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              final quantity = int.tryParse(quantityController.text) ?? 0;
              final provider = Provider.of<InventaireProvider>(context, listen: false);
              await provider.updateInventaireItem(
                inventaireId: inventaireId,
                productId: item.id,
                countedQuantity: quantity,
              );
              if (mounted) {
                Navigator.pop(context);
              }
            },
            child: const Text('Mettre à jour'),
          ),
        ],
      ),
    );
  }

  List<InventaireModel> _filterInventaires(List<InventaireModel> inventaires) {
    return inventaires.where((inv) {
      final matchesSearch = _searchController.text.isEmpty ||
          inv.nom.toLowerCase().contains(_searchController.text.toLowerCase()) ||
          inv.reference.toLowerCase().contains(_searchController.text.toLowerCase());
      
      final matchesStatus = _statusFilter == 'Tous' || inv.statut == _statusFilter;
      
      return matchesSearch && matchesStatus;
    }).toList();
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'en_cours':
        return 'En cours';
      case 'valide':
        return 'Validé';
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
      case 'en_cours':
        return Colors.blue;
      case 'valide':
        return Colors.green;
      case 'annule':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}