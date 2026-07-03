// product_detail_view.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/currency_config.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/view/product_variant_page.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_product_model.dart';
import 'package:provider/provider.dart';

class ProductDetailView extends StatefulWidget {
  final StoreProduct product;
  final bool isMobile;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onBack;

  const ProductDetailView({
    super.key,
    required this.product,
    required this.isMobile,
    required this.onEdit,
    required this.onDelete,
    this.onBack,
  });

  @override
  State<ProductDetailView> createState() => _ProductDetailViewState();
}

class _ProductDetailViewState extends State<ProductDetailView> {
  int _currentImageIndex = 0;
  final currencyInfo = CurrencyConfig.currencies['FCFA']!;
  bool _isUpdatingStock = false;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(widget.isMobile ? 16 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Bouton retour mobile
          if (widget.isMobile && widget.onBack != null) ...[
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: widget.onBack,
                ),
                const Text(
                  'Retour à la liste',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],

          // Carrousel d'images
          if (widget.product.product.imagesUrls!.isNotEmpty)
            _buildImageCarousel(),

          const SizedBox(height: 16),

          // En-tête
          _buildHeader(),

          const Divider(height: 32),

          // Description
          _buildSectionTitle('Description'),
          const SizedBox(height: 8),
          Text(
            widget.product.product.description,
            style: TextStyle(
              fontSize: widget.isMobile ? 14 : 16,
              color: Colors.grey[700],
            ),
          ),

          const SizedBox(height: 24),

          // Tarification
          _buildSectionTitle('Tarification'),
          const SizedBox(height: 12),
          _buildPriceSection(),

          const SizedBox(height: 24),

          // Inventaire
          _buildSectionTitle('Inventaire'),
          const SizedBox(height: 12),
          _buildInventorySection(),

          const SizedBox(height: 24),

          // Variantes
          _buildVariantsSection(),

          if (!widget.isMobile) const SizedBox(height: 40),
          if (!widget.isMobile)
            const Center(
              child: Text(
                '© 2025 GestPro Complet. Tous droits réservés.',
                style: TextStyle(color: Colors.grey),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildImageCarousel() {
    return Column(
      children: [
        // Image principale
        Container(
          height: widget.isMobile ? 150 : 200,
          width: 500,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Colors.grey[200],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: widget.product.product.imagesUrls!.isNotEmpty
                ? Image.network(
                    widget.product.product.imagesUrls![_currentImageIndex],
                    fit: BoxFit.contain,
                    width: 80,
                    height: 80,
                    errorBuilder: (context, error, stackTrace) {
                      return Center(
                        child: Icon(
                          Icons.photo,
                          size: 80,
                          color: Colors.grey[400],
                        ),
                      );
                    },
                  )
                : Center(
                    child: Icon(Icons.photo, size: 80, color: Colors.grey[400]),
                  ),
          ),
        ),

        if (widget.product.product.imagesUrls!.length > 1) ...[
          const SizedBox(height: 12),
          // Indicateurs
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.product.product.imagesUrls!.length,
              (index) => GestureDetector(
                onTap: () => setState(() => _currentImageIndex = index),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _currentImageIndex == index
                        ? Colors.blue
                        : Colors.grey[300],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Miniatures
          SizedBox(
            height: 70,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: widget.product.product.imagesUrls!.length,
              itemBuilder: (context, index) {
                return GestureDetector(
                  onTap: () => setState(() => _currentImageIndex = index),
                  child: Container(
                    width: 70,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _currentImageIndex == index
                            ? Colors.blue
                            : Colors.transparent,
                        width: 2,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        widget.product.product.imagesUrls![index],
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey[300],
                            child: const Icon(
                              Icons.broken_image,
                              color: Colors.grey,
                            ),
                          );
                        },
                        loadingBuilder: (context, child, loadingProgress) {
                          if (loadingProgress == null) return child;
                          return Center(
                            child: CircularProgressIndicator(
                              value: loadingProgress.expectedTotalBytes != null
                                  ? loadingProgress.cumulativeBytesLoaded /
                                        loadingProgress.expectedTotalBytes!
                                  : null,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.product.product.name,
                style: TextStyle(
                  fontSize: widget.isMobile ? 20 : 24,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                widget.product.product.sku!,
                style: TextStyle(
                  fontSize: widget.isMobile ? 14 : 16,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit, color: Colors.blue),
              onPressed: widget.onEdit,
              tooltip: 'Modifier',
            ),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.red),
              onPressed: widget.onDelete,
              tooltip: 'Supprimer',
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: widget.isMobile ? 16 : 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildPriceSection() {
    if (widget.isMobile) {
      return Column(
        children: [
          _buildInfoCard(
            'Prix de vente',
            '${widget.product.price?.toStringAsFixed(2)} ${currencyInfo.symbol}',
            Colors.blue[50]!,
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            'Coût par article',
            '${widget.product.cost?.toStringAsFixed(2)} ${currencyInfo.symbol}',
            Colors.green[50]!,
          ),
        ],
      );
    } else {
      return Row(
        children: [
          Expanded(
            child: _buildInfoCard(
              'Prix de vente',
              '${widget.product.price?.toStringAsFixed(2)} ${currencyInfo.symbol}',
              Colors.blue[50]!,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildInfoCard(
              'Coût par article',
              '${widget.product.cost?.toStringAsFixed(2)} ${currencyInfo.symbol}',
              Colors.green[50]!,
            ),
          ),
        ],
      );
    }
  }

  Widget _buildInventorySection() {
    final stock = widget.product.stockDetails;
    
    if (stock == null) {
      return const Center(
        child: Text(
          'Aucune information de stock disponible',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }
    final int quantityPerPackage = stock.quantityAvailable > 0
          ? (stock.quantityAvailable / widget.product.quantityItem).floor()
          : 0;

    if (widget.isMobile) {
      // Calcule du nombre de produit par colis
      
      return Column(
        children: [
          _buildStockCard(
            'Stock physique',
            '${stock.quantityOnHand}',
            Icons.warehouse,
            Colors.blue,
            'Quantité en stock physique',
          ),
          const SizedBox(height: 12),
          _buildStockCard(
            'Stock boutique',
            '${stock.quantityAvailable}',
            Icons.inventory,
            Colors.green,
            'Quantité disponible à la vente en boutique',
          ),
          const SizedBox(height: 12),
          _buildStockCard(
            'Stock réservé',
            '${stock.quantityReserved}',
            Icons.lock_outline,
            Colors.orange,
            'Quantité réservée pour commandes',
          ),
          const SizedBox(height: 12),
          _buildStockCard(
            'Stock par colis',
            '$quantityPerPackage',
            Icons.inventory_2,
            Colors.purple,
            'Quantité en colis/palettes',
          ),
          const SizedBox(height: 12),
          _buildStockStatusCard(stock),
          const SizedBox(height: 12),
          _buildStockActions(),
        ],
      );
    } else {
      return Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildStockCard(
                  'Stock physique',
                  '${stock.quantityOnHand}',
                  Icons.warehouse,
                  Colors.blue,
                  'Quantité en stock physique',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStockCard(
                  'Stock boutique',
                  '${stock.quantityAvailable}',
                  Icons.inventory,
                  Colors.green,
                  'Quantité disponible à la vente en boutique',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStockCard(
                  'Stock réservé',
                  '${stock.quantityReserved}',
                  Icons.lock_outline,
                  Colors.orange,
                  'Quantité réservée pour commandes',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStockCard(
                  'Stock par colis',
                  '$quantityPerPackage',
                  Icons.inventory_2,
                  Colors.purple,
                  'Quantité en colis/palettes',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildStockStatusCard(stock),
          const SizedBox(height: 12),
          _buildStockActions(),
        ],
      );
    }
  }

  Widget _buildStockCard(
    String title,
    String value,
    IconData icon,
    Color color,
    String description,
  ) {
    return Container(
      padding: EdgeInsets.all(widget.isMobile ? 12 : 16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: widget.isMobile ? 20 : 24),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: widget.isMobile ? 12 : 14,
                    color: Colors.grey[600],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: widget.isMobile ? 20 : 28,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: TextStyle(
              fontSize: widget.isMobile ? 10 : 12,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockStatusCard(StockDetails stock) {
    Color statusColor;
    IconData statusIcon;
    String statusText;
    String statusDescription;

    switch (stock.stockStatus) {
      case 'in_stock':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = 'En stock';
        statusDescription = 'Stock suffisant pour les ventes';
        break;
      case 'low_stock':
        statusColor = Colors.orange;
        statusIcon = Icons.warning;
        statusText = 'Stock faible';
        statusDescription =
            'Attention, le stock est inférieur au seuil de ${stock.minStockThreshold}';
        break;
      case 'out_of_stock':
        statusColor = Colors.red;
        statusIcon = Icons.error;
        statusText = 'Rupture';
        statusDescription = 'Plus de stock disponible';
        break;
      case 'over_stock':
        statusColor = Colors.purple;
        statusIcon = Icons.trending_up;
        statusText = 'Surstock';
        statusDescription = 'Stock élevé, risque de surstockage';
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help;
        statusText = 'Inconnu';
        statusDescription = 'Statut du stock non défini';
    }

    return Container(
      padding: EdgeInsets.all(widget.isMobile ? 12 : 16),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: statusColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(statusIcon, color: statusColor, size: widget.isMobile ? 24 : 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusText,
                  style: TextStyle(
                    fontSize: widget.isMobile ? 16 : 18,
                    fontWeight: FontWeight.bold,
                    color: statusColor,
                  ),
                ),
                Text(
                  statusDescription,
                  style: TextStyle(
                    fontSize: widget.isMobile ? 12 : 14,
                    color: Colors.grey[600],
                  ),
                ),
                if (stock.stockStatus == 'low_stock')
                  Text(
                    'Seuil minimum: ${stock.minStockThreshold}',
                    style: TextStyle(
                      fontSize: widget.isMobile ? 11 : 12,
                      color: Colors.orange,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockActions() {
    return Container(
      padding: EdgeInsets.all(widget.isMobile ? 12 : 16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Actions sur le stock',
            style: TextStyle(
              fontSize: widget.isMobile ? 14 : 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isUpdatingStock
                      ? null
                      : () => _showAdjustStockDialog(),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Ajouter'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isUpdatingStock
                      ? null
                      : () => _showRemoveStockDialog(),
                  icon: const Icon(Icons.remove, size: 18),
                  label: const Text('Retirer'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _isUpdatingStock
                ? null
                : () => _showReserveStockDialog(),
            icon: const Icon(Icons.lock_outline, size: 18),
            label: const Text('Réserver'),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.orange),
              foregroundColor: Colors.orange,
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _isUpdatingStock
                ? null
                : () => _showReleaseStockDialog(),
            icon: const Icon(Icons.lock_open, size: 18),
            label: const Text('Libérer réservation'),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.blue),
              foregroundColor: Colors.blue,
            ),
          ),
        ],
      ),
    );
  }

  void _showAdjustStockDialog() {
    final stock = widget.product.stockDetails;
    if (stock == null) return;

    final quantityController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ajouter au stock'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: quantityController,
              decoration: const InputDecoration(
                labelText: 'Quantité à ajouter',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.add),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Raison (optionnel)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.note),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              final quantity = int.tryParse(quantityController.text);
              if (quantity == null || quantity <= 0) {
                NotificationService.showError(context, 'Quantité invalide');
                return;
              }
              Navigator.pop(ctx);
              await _updateStock(quantity, 'add', reasonController.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Ajouter'),
          ),
        ],
      ),
    );
  }

  void _showRemoveStockDialog() {
    final stock = widget.product.stockDetails;
    if (stock == null) return;

    final quantityController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Retirer du stock'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: quantityController,
              decoration: const InputDecoration(
                labelText: 'Quantité à retirer',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.remove),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Raison (optionnel)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.note),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              final quantity = int.tryParse(quantityController.text);
              if (quantity == null || quantity <= 0) {
                NotificationService.showError(context, 'Quantité invalide');
                return;
              }
              final available = stock.quantityOnHand - stock.quantityReserved;
              if (quantity > available) {
                NotificationService.showError(
                  context,
                  'Stock disponible insuffisant ($available restants)',
                );
                return;
              }
              Navigator.pop(ctx);
              await _updateStock(quantity, 'remove', reasonController.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Retirer'),
          ),
        ],
      ),
    );
  }

  void _showReserveStockDialog() {
    final stock = widget.product.stockDetails;
    if (stock == null) return;

    final quantityController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Réserver du stock'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: quantityController,
              decoration: const InputDecoration(
                labelText: 'Quantité à réserver',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_outline),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Raison (optionnel)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.note),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              final quantity = int.tryParse(quantityController.text);
              if (quantity == null || quantity <= 0) {
                NotificationService.showError(context, 'Quantité invalide');
                return;
              }
              final available = stock.quantityOnHand - stock.quantityReserved;
              if (quantity > available) {
                NotificationService.showError(
                  context,
                  'Stock disponible insuffisant ($available restants)',
                );
                return;
              }
              Navigator.pop(ctx);
              await _updateStock(quantity, 'reserve', reasonController.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Réserver'),
          ),
        ],
      ),
    );
  }

  void _showReleaseStockDialog() {
    final stock = widget.product.stockDetails;
    if (stock == null) return;

    final quantityController = TextEditingController();
    final reasonController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Libérer une réservation'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: quantityController,
              decoration: const InputDecoration(
                labelText: 'Quantité à libérer',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.lock_open),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Raison (optionnel)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.note),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              final quantity = int.tryParse(quantityController.text);
              if (quantity == null || quantity <= 0) {
                NotificationService.showError(context, 'Quantité invalide');
                return;
              }
              if (quantity > stock.quantityReserved) {
                NotificationService.showError(
                  context,
                  'Quantité réservée insuffisante (${stock.quantityReserved} réservés)',
                );
                return;
              }
              Navigator.pop(ctx);
              await _updateStock(quantity, 'release', reasonController.text);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
            child: const Text('Libérer'),
          ),
        ],
      ),
    );
  }

  Future<void> _updateStock(int quantity, String type, String reason) async {
    if (!mounted) return;

    setState(() => _isUpdatingStock = true);

    try {
      final provider = Provider.of<ProductProvider>(context, listen: false);

      final response = await provider.adjustStock(
        storeProductId: widget.product.id,
        quantity: quantity,
        type: type,
        reason: reason,
      );
      print(response);
      if (response['status'] == true && mounted) {
        print('Stock mis à jour avec succès: ${response['message']}');
        // Utiliser les données retournées par l'API pour mettre à jour le stock
        final stockData = response['stock'];
        if (stockData != null && widget.product.stockDetails != null) {
          setState(() {
            final stock = widget.product.stockDetails!;

            // Mettre à jour avec les valeurs exactes du serveur
            stock.quantityOnHand = stockData['quantity_on_hand'];
            stock.quantityReserved = stockData['quantity_reserved'];
            stock.quantityAvailable = stockData['quantity_available'];
            stock.stockStatus = stockData['stock_status'];
          });
        }

        // Afficher le message de succès
        final message =
            response['message'] ?? _getSuccessMessage(type, quantity);
        NotificationService.showSuccess(context, message);
      } else if (mounted) {
        // Gérer l'erreur
        final errorMessage =
            response['message'] ?? 'Erreur lors de la mise à jour du stock';
        NotificationService.showError(context, errorMessage);
      }
    } catch (e) {
      if (mounted) {
        NotificationService.showError(context, 'Erreur: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() => _isUpdatingStock = false);
      }
    }
  }

  String _getSuccessMessage(String type, int quantity) {
    switch (type) {
      case 'add':
        return '$quantity unités ajoutées au stock';
      case 'remove':
        return '$quantity unités retirées du stock';
      case 'reserve':
        return '$quantity unités réservées';
      case 'release':
        return '$quantity unités libérées';
      default:
        return 'Stock mis à jour avec succès';
    }
  }

  Widget _buildInfoCard(String title, String value, Color color) {
    return Container(
      width: widget.isMobile ? double.infinity : null,
      padding: EdgeInsets.all(widget.isMobile ? 12 : 16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: widget.isMobile ? 12 : 14,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: widget.isMobile ? 16 : 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVariantsSection() {
    final variants = widget.product.product.variants ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildSectionTitle('Variantes'),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) =>
                        ProductVariantsPage(product: widget.product),
                  ),
                ).then((_) {
                  setState(() {});
                });
              },
              icon: Icon(Icons.add, size: widget.isMobile ? 16 : 18),
              label: Text(
                'Gérer les variantes',
                style: TextStyle(fontSize: widget.isMobile ? 12 : 14),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (variants.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Text(
                'Aucune variante pour ce produit',
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minWidth: widget.isMobile
                      ? MediaQuery.of(context).size.width - 32
                      : 900,
                ),
                child: DataTable(
                  columnSpacing: 16,
                  headingRowHeight: widget.isMobile ? 40 : 48,
                  dataRowMinHeight: widget.isMobile ? 40 : 48,
                  columns: [
                    _buildDataColumn('Code barre'),
                    _buildDataColumn('Description'),
                    _buildDataColumn('Qté'),
                    _buildDataColumn('Prix vente'),
                    _buildDataColumn('Prix comp.'),
                  ],
                  rows: variants.map((variant) {
                    return DataRow(
                      cells: [
                        DataCell(Text(variant.barcode, style: _cellStyle())),
                        DataCell(Text(variant.name, style: _cellStyle())),
                        DataCell(
                          Text('${variant.quantity}', style: _cellStyle()),
                        ),
                        DataCell(
                          Text(
                            variant.storeVariantPrice != null
                                ? '${variant.storeVariantPrice} ${currencyInfo.symbol}'
                                : '-',
                            style: _cellStyle(),
                          ),
                        ),
                        DataCell(
                          Text(
                            variant.prixReduction != null
                                ? '${variant.prixReduction} ${currencyInfo.symbol}'
                                : '-',
                            style: _cellStyle(),
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
      ],
    );
  }

  DataColumn _buildDataColumn(String label) {
    return DataColumn(
      label: Text(label, style: TextStyle(fontSize: widget.isMobile ? 12 : 14)),
    );
  }

  TextStyle _cellStyle() {
    return TextStyle(fontSize: widget.isMobile ? 11 : 13);
  }
}
