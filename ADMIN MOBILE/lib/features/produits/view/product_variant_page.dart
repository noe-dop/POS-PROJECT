import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/select_existing_variant_sheet.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/variant_form_widget.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:provider/provider.dart';

class ProductVariantsPage extends StatefulWidget {
  final StoreProduct product;
  const ProductVariantsPage({super.key, required this.product});

  @override
  State<ProductVariantsPage> createState() => _ProductVariantsPageState();
}

class _ProductVariantsPageState extends State<ProductVariantsPage> {
  Variant? _selectedVariant;
  bool _isLoading = false;
  List<Variant> _variants = [];
  late StoreProduct _currentProduct;

  @override
  void initState() {
    super.initState();
    _currentProduct = widget.product;
    _variants = widget.product.product.variants ?? [];
    if (_variants.isNotEmpty) {
      _selectedVariant = _variants.first;
    }
  }

  Future<void> _refreshData() async {
    if (!mounted) return;
    
    setState(() => _isLoading = true);
    final provider = context.read<ProductProvider>();
    await provider.refreshStoreProduct(widget.product.id);
    
    if (mounted) {
      setState(() {
        _currentProduct = provider.products.firstWhere(
          (p) => p.id == widget.product.id,
          orElse: () => _currentProduct,
        );
        _variants = _currentProduct.product.variants ?? [];

        if (_selectedVariant != null && !_variants.contains(_selectedVariant)) {
          _selectedVariant = _variants.isNotEmpty ? _variants.first : null;
        }
        _isLoading = false;
      });
    }
  }

  void _onVariantCreated() {
    _refreshData();
    if (mounted) {
      NotificationService.showSuccess(context, 'Variante créée avec succès');
    }
  }

  void _onVariantsLinked() {
    _refreshData();
    if (mounted) {
      NotificationService.showSuccess(context, 'Variantes liées avec succès');
    }
  }

  void _onVariantUpdated() {
    _refreshData();
    if (mounted) {
      NotificationService.showSuccess(context, 'Variante mise à jour');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    final boutiqueService = context.watch<BoutiqueService>();
    final storeName = boutiqueService.selectedStore?.boutique.name ?? 'Boutique';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Variantes - ${_currentProduct.product.name}'),
            Text(
              storeName,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[300],
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshData,
            tooltip: 'Rafraîchir',
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _openAddVariantFlow,
            tooltip: 'Ajouter une variante',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : isMobile
              ? _buildMobileLayout()
              : _buildDesktopLayout(),
    );
  }

  Widget _buildMobileLayout() {
    if (_variants.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inventory_2, size: 80, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'Aucune variante',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: _openAddVariantFlow,
              icon: const Icon(Icons.add),
              label: const Text('Ajouter une variante'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _variants.length,
      itemBuilder: (context, index) {
        final variant = _variants[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: ListTile(
            leading: _buildVariantThumbnail(variant),
            title: Text(variant.name),
            subtitle: Text(
              'Code: ${variant.barcode} | Prix: ${variant.salePrice1} FCFA',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _showVariantDetailMobile(variant),
          ),
        );
      },
    );
  }

  Widget _buildDesktopLayout() {
    return Row(
      children: [
        Container(
          width: 350,
          decoration: BoxDecoration(
            border: Border(right: BorderSide(color: Colors.grey[300]!)),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Liste des variantes',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    ElevatedButton.icon(
                      onPressed: _openAddVariantFlow,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Nouveau'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _variants.isEmpty
                    ? const Center(child: Text('Aucune variante'))
                    : ListView.builder(
                        itemCount: _variants.length,
                        itemBuilder: (context, index) {
                          final variant = _variants[index];
                          final isSelected = _selectedVariant?.id == variant.id;

                          return ListTile(
                            selected: isSelected,
                            selectedTileColor: Colors.blue[50],
                            leading: _buildVariantThumbnail(variant),
                            title: Text(
                              variant.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${variant.quantity} en stock',
                              style: TextStyle(
                                color: variant.quantity > 0 ? Colors.green : Colors.red,
                              ),
                            ),
                            trailing: Text(
                              '${variant.salePrice1} FCFA',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                            onTap: () {
                              setState(() {
                                _selectedVariant = variant;
                              });
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _selectedVariant == null
              ? const Center(
                  child: Text(
                    'Sélectionnez une variante pour voir les détails',
                    style: TextStyle(color: Colors.grey, fontSize: 16),
                  ),
                )
              : _buildVariantDetail(_selectedVariant!),
        ),
      ],
    );
  }

  Widget _buildVariantThumbnail(Variant variant) {
    if (variant.imageUrl != null && variant.imageUrl!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Image.network(
          variant.imageUrl!,
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) {
            return Container(
              width: 40,
              height: 40,
              color: Colors.grey[200],
              child: const Icon(Icons.broken_image, size: 20, color: Colors.grey),
            );
          },
        ),
      );
    }
    return Container(
      width: 40,
      height: 40,
      color: Colors.grey[200],
      child: const Icon(Icons.inventory, size: 20, color: Colors.grey),
    );
  }

  Widget _buildVariantDetail(Variant variant) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Détails de la variante',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              Row(
                children: [
                  ElevatedButton.icon(
                    onPressed: () => _editVariant(variant),
                    icon: const Icon(Icons.edit, size: 16),
                    label: const Text('Modifier'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: () => _confirmUnlinkVariant(variant),
                    icon: const Icon(Icons.delete, size: 16, color: Colors.red),
                    label: const Text('Dissocier', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: variant.imageUrl != null && variant.imageUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          variant.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stack) {
                            return const Center(
                              child: Icon(Icons.broken_image, size: 50, color: Colors.grey),
                            );
                          },
                        ),
                      )
                    : const Center(
                        child: Icon(Icons.inventory, size: 50, color: Colors.grey),
                      ),
              ),
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoRow('Code barre', variant.barcode),
                    _buildInfoRow('Nom', variant.name),
                    _buildInfoRow('Nombre Item', '${variant.quantity}'),
                    _buildInfoRow('Prix de vente', '${variant.salePrice1} FCFA'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showVariantDetailMobile(Variant variant) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Détail de la variante',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Container(
                      width: 200,
                      height: 200,
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: variant.imageUrl != null && variant.imageUrl!.isNotEmpty
                          ? Image.network(variant.imageUrl!, fit: BoxFit.cover)
                          : const Icon(Icons.inventory, size: 50, color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    _buildInfoRow('Code barre', variant.barcode),
                    const SizedBox(height: 8),
                    _buildInfoRow('Nom', variant.name),
                    const SizedBox(height: 8),
                    _buildInfoRow('Quantité', '${variant.quantity}'),
                    const SizedBox(height: 8),
                    _buildInfoRow('Prix', '${variant.salePrice1} FCFA'),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _editVariant(variant);
                          },
                          icon: const Icon(Icons.edit),
                          label: const Text('Modifier'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () {
                            Navigator.pop(context);
                            _confirmUnlinkVariant(variant);
                          },
                          icon: const Icon(Icons.delete, color: Colors.red),
                          label: const Text('Dissocier', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[700]),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  void _openAddVariantFlow() {
    final boutiqueService = context.read<BoutiqueService>();
    final storeId = boutiqueService.selectedStore?.boutique.id;

    if (storeId == null) {
      NotificationService.showError(context, 'Aucune boutique sélectionnée');
      return;
    }

    final isMobile = MediaQuery.of(context).size.width < 768;

    // Version unifiée : toujours utiliser SelectMultipleVariantsSheet
    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => SelectMultipleVariantsSheet(
          productId: widget.product.product.id!,
          storeId: storeId,
          storeProductId: widget.product.id,
          onVariantsLinked: _onVariantsLinked,
          onCreateNew: () {
            Navigator.pop(context);
            _openCreateVariantForm(storeId);
          },
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (context) => Dialog(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 800, maxHeight: 700),
            child: SelectMultipleVariantsSheet(
              productId: widget.product.product.id!,
              storeId: storeId,
              storeProductId: widget.product.id,
              onVariantsLinked: _onVariantsLinked,
              onCreateNew: () {
                Navigator.pop(context);
                _openCreateVariantForm(storeId);
              },
            ),
          ),
        ),
      );
    }
  }

  void _editVariant(Variant variant) {
    final isMobile = MediaQuery.of(context).size.width < 768;

    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: VariantFormWidget(
            productId: widget.product.product.id!,
            storeId: widget.product.storeId,
            variant: variant,
            onVariantCreated: _onVariantUpdated,
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (ctx) => Dialog(
          child: SizedBox(
            width: 600,
            child: VariantFormWidget(
              productId: widget.product.product.id!,
              storeId: widget.product.storeId,
              variant: variant,
              onVariantCreated: _onVariantUpdated,
            ),
          ),
        ),
      );
    }
  }

  void _openCreateVariantForm(int storeId) {
    final isMobile = MediaQuery.of(context).size.width < 768;

    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: VariantFormWidget(
            productId: widget.product.product.id!,
            storeId: storeId,
            onVariantCreated: _onVariantCreated,
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (ctx) => Dialog(
          child: SizedBox(
            width: 600,
            child: VariantFormWidget(
              productId: widget.product.product.id!,
              storeId: storeId,
              onVariantCreated: _onVariantCreated,
            ),
          ),
        ),
      );
    }
  }

  void _confirmUnlinkVariant(Variant variant) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dissocier la variante'),
        content: Text('Voulez-vous vraiment dissocier "${variant.name}" de cette boutique ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final provider = context.read<ProductProvider>();
              final response = await provider.unlinkStoreVariant(
                storeProductId: widget.product.id,
                storeVariantId: variant.storeVariantId,
              );

              if (response['status'] == true) {
                await _refreshData();
                if (mounted) NotificationService.showSuccess(context, response['message']);
              } else {
                if (mounted) NotificationService.showError(context, response['message']);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Dissocier'),
          ),
        ],
      ),
    );
  }
}