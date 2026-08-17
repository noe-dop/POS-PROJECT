import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/orders/service/order_provider.dart';
import 'package:nsp_pos_mobile/features/orders/viewmodel/order_model.dart';
import 'package:provider/provider.dart';

class OrderScreen extends StatefulWidget {
  const OrderScreen({super.key});
  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  String _searchQuery = '';
  String _selectedFilter = 'Toutes';
  int? _storeId;
  final ScrollController _scrollController = ScrollController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authService = context.read<AuthService>();
      final int? storeId;
      if (!authService.currentUser!.isOwner) {
        storeId = authService.currentUser!.accessibleStores.isNotEmpty
            ? authService.currentUser!.accessibleStores.first.id
            : null;
      } else {
        final stores = Provider.of<BoutiqueService>(
          context,
          listen: false,
        ).accessibleStores;
        storeId = stores.isNotEmpty ? stores.first.boutique.id : null;
      }
      _storeId = storeId;
      final provider = context.read<OrderProvider>();
      if (storeId != null) {
        provider.fetchOrders(storeId: storeId).then((_) {
          provider.startPolling(storeId!);
        });
      } else {
        NotificationService.showError(context, "Aucune boutique selectionée");
      }
    });
  }

  void _applyFilter(String filter) {
    setState(() => _selectedFilter = filter);
    final provider = context.read<OrderProvider>();
    if (filter == 'Toutes') {
      provider.fetchOrders(storeId: _storeId!);
    } else {
      if (provider.statuses.isEmpty) {
        NotificationService.showError(
          context,
          'Les statuts ne sont pas encore chargés',
        );
        return;
      }
      try {
        final status = provider.statuses.firstWhere((s) => s.name == filter);
        provider.fetchOrders(storeId: _storeId!, statusId: status.id);
      } catch (e) {
        NotificationService.showError(context, 'Statut non trouvé');
      }
    }
  }

  Future<void> _refreshOrders() async {
    if (_storeId == null) return;
    final provider = context.read<OrderProvider>();
    await provider.fetchOrders(
      storeId: _storeId!,
      statusId: _getStatusIdFromFilter(provider),
    );
  }

  int? _getStatusIdFromFilter(OrderProvider provider) {
    if (_selectedFilter == 'Toutes') return null;
    try {
      return provider.statuses.firstWhere((s) => s.name == _selectedFilter).id;
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    context.read<OrderProvider>().stopPolling();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<OrderProvider>(
      builder: (context, provider, child) {
        final filteredOrders = provider.orders.where((order) {
          final matchSearch =
              order.customerName.toLowerCase().contains(
                _searchQuery.toLowerCase(),
              ) ||
              order.number.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              order.customerPhone.contains(_searchQuery);
          return matchSearch;
        }).toList();

        return Scaffold(
          appBar: AppBar(
            title: const Text('Commandes'),
            actions: [
              if (provider.isPolling)
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text('En direct', style: TextStyle(fontSize: 12)),
                  ],
                ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _refreshOrders,
                tooltip: 'Rafraîchir',
              ),
            ],
          ),
          drawer: const SideMenu(),
          body: RefreshIndicator(
            onRefresh: _refreshOrders,
            child: Column(
              children: [
                // Barre de recherche et filtres
                _buildSearchAndFilters(provider),
                // Liste des commandes
                Expanded(
                  child: provider.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : filteredOrders.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          padding: const EdgeInsets.all(8),
                          itemCount: filteredOrders.length,
                          itemBuilder: (context, index) {
                            final order = filteredOrders[index];
                            return _buildOrderCard(order, provider);
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            _searchQuery.isNotEmpty
                ? 'Aucune commande trouvée'
                : 'Aucune commande',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            _searchQuery.isNotEmpty
                ? 'Essayez avec d\'autres mots-clés'
                : 'Les nouvelles commandes apparaîtront ici',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilters(OrderProvider provider) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Rechercher une commande...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    filled: true,
                    fillColor: Colors.grey[50],
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () => setState(() => _searchQuery = ''),
                          )
                        : null,
                  ),
                  onChanged: (value) => setState(() => _searchQuery = value),
                ),
              ),
              const SizedBox(height: 16),
              //TODO: Integration de dropdown pour filtrer par boutique
              //si il y a plusieurs disponibles
            ],
          ),
          const SizedBox(height: 8),
          if (provider.statuses.isNotEmpty)
            SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: provider.statuses.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    final isSelected = _selectedFilter == 'Toutes';
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: const Text('Toutes'),
                        selected: isSelected,
                        onSelected: (_) => _applyFilter('Toutes'),
                        backgroundColor: Colors.grey[200],
                        selectedColor: Colors.blue[100],
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.blue : Colors.grey[700],
                          fontWeight: isSelected
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                    );
                  }
                  final status = provider.statuses[index - 1];
                  final isSelected = _selectedFilter == status.name;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(status.name),
                      selected: isSelected,
                      onSelected: (_) => _applyFilter(status.name),
                      backgroundColor: Colors.grey[200],
                      selectedColor: status.color.withValues(alpha: 0.3),
                      labelStyle: TextStyle(
                        color: isSelected ? status.color : Colors.grey[700],
                        fontWeight: isSelected
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(OrderModel order, OrderProvider provider) {
    // Construction des boutons d'action selon le statut
    List<Widget> actionButtons = [];
    final statusCode = order
        .status
        .code; // ex: 'pending', 'preparing', 'ready', 'delivered', 'cancelled'

    if (statusCode == 'pending') {
      // Accepter → convertit en vente et passe en préparation
      actionButtons.add(
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () async {
              final success = await provider.convertToSale(order.id);
              if (success && mounted) {
                NotificationService.showSuccess(
                  context,
                  'Commande acceptée, en préparation',
                );
              } else if (mounted) {
                NotificationService.showError(
                  context,
                  'Erreur : ${provider.errorMessage ?? "Inconnue"}',
                );
              }
            },
            icon: const Icon(Icons.check, size: 18),
            label: const Text('Accepter'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
      );
      actionButtons.add(const SizedBox(width: 8));
      actionButtons.add(_buildCancelButton(order, provider));
    } else if (statusCode == 'preparing') {
      // Prêt → passe en 'ready'
      actionButtons.add(
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () async {
              final readyStatus = provider.statuses.firstWhere(
                (s) => s.code == 'ready',
              );
              final success = await provider.updateOrderStatus(
                order.id,
                readyStatus.id,
              );
              if (success && mounted) {
                NotificationService.showSuccess(
                  context,
                  'Commande marquée comme prête',
                );
              } else if (mounted) {
                NotificationService.showError(
                  context,
                  'Erreur : ${provider.errorMessage ?? "Inconnue"}',
                );
              }
            },
            icon: const Icon(Icons.check_circle, size: 18),
            label: const Text('Prêt'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
      );
      actionButtons.add(const SizedBox(width: 8));
      actionButtons.add(_buildCancelButton(order, provider));
    } else if (statusCode == 'ready') {
      // Livrer → passe en 'delivered'
      actionButtons.add(
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () async {
              final deliveredStatus = provider.statuses.firstWhere(
                (s) => s.code == 'delivering',
              );
              final success = await provider.updateOrderStatus(
                order.id,
                deliveredStatus.id,
              );
              if (success && mounted) {
                NotificationService.showSuccess(
                  context,
                  'Commande en livraison',
                );
              } else if (mounted) {
                NotificationService.showError(
                  context,
                  'Erreur : ${provider.errorMessage ?? "Inconnue"}',
                );
              }
            },
            icon: const Icon(Icons.local_shipping, size: 18),
            label: const Text('Livrer'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
      );
      actionButtons.add(const SizedBox(width: 8));
      actionButtons.add(_buildCancelButton(order, provider));
    } else if (statusCode == 'delivering') {
      // Marquer comme livré → passe en 'processed'
      actionButtons.add(
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () async {
              final processedStatus = provider.statuses.firstWhere(
                (s) => s.code == 'processed',
              );
              final success = await provider.updateOrderStatus(
                order.id,
                processedStatus.id,
              );
              if (success && mounted) {
                NotificationService.showSuccess(
                  context,
                  'Commande recuperer par le livreur',
                );
              } else if (mounted) {
                NotificationService.showError(
                  context,
                  'Erreur : ${provider.errorMessage ?? "Inconnue"}',
                );
              }
            },
            icon: const Icon(Icons.check_circle_outline, size: 18),
            label: const Text('En cours de livraison'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
      );
      actionButtons.add(const SizedBox(width: 8));
      actionButtons.add(_buildCancelButton(order, provider));
    } else {
      // Statut terminal (livré, annulé, etc.) : affichage simple
      actionButtons.add(
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              order.status.name,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[600],
              ),
            ),
          ),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: order.status.color.withAlpha(20),
          child: Icon(Icons.shopping_bag, color: order.status.color, size: 20),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  order.number,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: order.status.color.withAlpha(20),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    order.status.name,
                    style: TextStyle(
                      fontSize: 11,
                      color: order.status.color,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Icon(Icons.person, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(
                  order.customerName,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(width: 12),
                if (order.customerPhone.isNotEmpty) ...[
                  Icon(Icons.phone, size: 14, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    order.customerPhone,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ],
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${order.total.toStringAsFixed(0)} FCFA',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              _formatTime(order.createdAt),
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                // Liste des articles
                ...order.items.map(
                  (item) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: Colors.blue[50],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Center(
                            child: Text(
                              '${item.quantity}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.blue[700],
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.productName,
                                style: const TextStyle(fontSize: 13),
                              ),
                              Text(
                                '${item.unitPrice.toStringAsFixed(0)} FCFA × ${item.quantity}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${(item.unitPrice * item.quantity).toStringAsFixed(0)} FCFA',
                          style: const TextStyle(
                            fontWeight: FontWeight.w500,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Divider(),
                // Rangée des boutons d'action
                Row(children: actionButtons),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCancelButton(OrderModel order, OrderProvider provider) {
    return Expanded(
      child: TextButton.icon(
        onPressed: () async {
          final success = await provider.cancelOrder(order.id);
          if (success && mounted) {
            NotificationService.showInfo(context, 'Commande annulée');
          } else if (mounted) {
            NotificationService.showError(
              context,
              'Erreur : ${provider.errorMessage ?? "Inconnue"}',
            );
          }
        },
        icon: Icon(Icons.cancel, size: 16, color: Colors.red[400]),
        label: Text(
          'Annuler',
          style: TextStyle(fontSize: 12, color: Colors.red[400]),
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    return 'Il y a ${diff.inDays} j';
  }
}
