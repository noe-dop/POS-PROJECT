// product_variants_page.dart
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
    _variants = widget.product.product.variants!;
    if (_variants.isNotEmpty) {
      _selectedVariant = _variants.first;
    }
  }

  // Méthode pour recharger les données
  Future<void> _refreshData() async {
    setState(() => _isLoading = true);
    final provider = context.read<ProductProvider>();
    await provider.refreshStoreProduct(widget.product.id);
    if (mounted) {
      setState(() {
        _currentProduct = provider.products.firstWhere(
          (p) => p.id == widget.product.id,
        ); // ← METTRE À JOUR currentProduct
        _variants =
            _currentProduct.product.variants ??
            []; // ← METTRE À JOUR les variantes

        // Mettre à jour la sélection si la variante sélectionnée n'existe plus
        if (_selectedVariant != null && !_variants.contains(_selectedVariant)) {
          _selectedVariant = _variants.isNotEmpty ? _variants.first : null;
        }
      });
      setState(() => _isLoading = false);
    }
  }

  // Modifiez vos callbacks pour appeler _refreshData
  void _onVariantCreated() {
    _refreshData();
    NotificationService.showSuccess(context, 'Variante créée avec succès');
  }

  void _onVariantUpdated() {
    _refreshData();
    NotificationService.showSuccess(context, 'Variante mise à jour');
  }

  void _onVariantDeleted() {
    _refreshData();
    NotificationService.showSuccess(context, 'Variante supprimée');
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    final boutiqueService = context.watch<BoutiqueService>();
    final storeName =
        boutiqueService.selectedStore?.boutique.name ?? 'Boutique';

    // CONSUMER pour écouter les changements du provider
    return Consumer<ProductProvider>(
      builder: (context, provider, child) {
        _variants = _currentProduct.product.variants!;
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
              ? _buildMobileLayout(_variants)
              : _buildDesktopLayout(_variants),
        );
      },
    );
  }

  // Layout pour mobile
  Widget _buildMobileLayout(List<Variant>? variantes) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

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

  // Layout bureau
  Widget _buildDesktopLayout(List<Variant>? variantes) {
    return Row(
      children: [
        // Panneau de gauche : liste des variantes
        Container(
          width: 350,
          decoration: BoxDecoration(
            border: Border(right: BorderSide(color: Colors.grey[300]!)),
          ),
          child: Column(
            children: [
              // En-tête de la liste
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
              // Liste des variantes
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _variants.isEmpty
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
                                color: variant.quantity > 0
                                    ? Colors.green
                                    : Colors.red,
                              ),
                            ),
                            trailing: Text(
                              '${variant.salePrice1} FCFA',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
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
        // Panneau de droite : détail
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

  // Miniature
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
              child: const Icon(
                Icons.broken_image,
                size: 20,
                color: Colors.grey,
              ),
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

  // Détail bureau
  Widget _buildVariantDetail(Variant variant) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête avec actions
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
                    label: const Text(
                      'Supprimer',
                      style: TextStyle(color: Colors.red),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.red),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Image et infos
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image
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
                              child: Icon(
                                Icons.broken_image,
                                size: 50,
                                color: Colors.grey,
                              ),
                            );
                          },
                        ),
                      )
                    : const Center(
                        child: Icon(
                          Icons.inventory,
                          size: 50,
                          color: Colors.grey,
                        ),
                      ),
              ),
              const SizedBox(width: 24),

              // Informations
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInfoRow('Code barre', variant.barcode),
                    _buildInfoRow('Nom', variant.name),
                    _buildInfoRow('Nombre Item', '${variant.quantity}'),
                    _buildInfoRow(
                      'Prix de vente 1',
                      '${variant.salePrice1} FCFA',
                    ),
                    if (variant.storeVariantCost != null)
                      _buildInfoRow(
                        'Prix de vente 2',
                        '${variant.storeVariantCost} FCFA',
                      ),
                    if (variant.prixReduction != null)
                      _buildInfoRow(
                        'Prix comparatif',
                        '${variant.prixReduction} FCFA',
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Statistiques
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Statistiques de vente',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildStatCard(
                        'Articles vendus',
                        '0',
                        Icons.shopping_cart,
                        Colors.green,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildStatCard(
                        'Chiffre d\'affaires',
                        '0 FCFA',
                        Icons.trending_up,
                        Colors.blue,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Détail mobile
  void _showVariantDetailMobile(Variant variant) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.9,
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
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Container(
                          width: 200,
                          height: 200,
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child:
                              variant.imageUrl != null &&
                                  variant.imageUrl!.isNotEmpty
                              ? Image.network(
                                  variant.imageUrl!,
                                  fit: BoxFit.cover,
                                )
                              : const Icon(
                                  Icons.inventory,
                                  size: 50,
                                  color: Colors.grey,
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildInfoRow('Code barre', variant.barcode),
                      const SizedBox(height: 8),
                      _buildInfoRow('Description', variant.name),
                      const SizedBox(height: 8),
                      _buildInfoRow('Stock', '${variant.quantity}'),
                      const SizedBox(height: 8),
                      _buildInfoRow(
                        'Prix 1',
                        '${variant.storeVariantPrice ?? variant.salePrice1} FCFA',
                      ),
                      if (variant.prixReduction != null) ...[
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          'Prix comp.',
                          '${variant.prixReduction} FCFA',
                        ),
                      ],
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
                            label: const Text(
                              'Supprimer',
                              style: TextStyle(color: Colors.red),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.grey[700],
            ),
          ),
        ),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 16))),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // FLUX D'AJOUT DE VARIANTE
  void _openAddVariantFlow() {
    final boutiqueService = context.read<BoutiqueService>();
    final storeId = boutiqueService.selectedStore?.boutique.id;

    if (storeId == null) {
      NotificationService.showError(context, 'Aucune boutique sélectionnée');
      return;
    }

    final isMobile = MediaQuery.of(context).size.width < 768;

    if (isMobile) {
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
          child: SelectExistingVariantSheet(
            productId: widget.product.product.id!,
            storeId: storeId,
            onVariantSelected: (variant) {
              Navigator.pop(context);
              _linkVariantToStore(variant, widget.product.id);
            },
            onCreateNew: () {
              Navigator.pop(context); // Ferme le bottom sheet
              _openCreateVariantForm(
                widget.product.storeId,
              ); // Ouvre le formulaire de création
            },
          ),
        ),
      );
    } else {
      showDialog(
        context: context,
        builder: (context) => Dialog(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
            child: SelectExistingVariantSheet(
              productId: widget.product.product.id!,
              storeId: storeId,
              onVariantSelected: (variant) {
                Navigator.pop(context);
                _linkVariantToStore(variant, widget.product.id);
              },
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

  // ============================================
  // VERSION POUR L'ÉDITION
  // ============================================
  void _editVariant(Variant variant) {
    final isMobile = MediaQuery.of(context).size.width < 768;

    if (isMobile) {
      // Version mobile : BottomSheet
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
      // Version desktop : Dialog
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

  // ============================================
  // VERSION POUR LA CRÉATION
  // ============================================
  void _openCreateVariantForm(int storeId) {
    final isMobile = MediaQuery.of(context).size.width < 768;

    if (isMobile) {
      // Version mobile : BottomSheet
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
      // Version desktop : Dialog
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

  void _selectExistingVariant(int storeId) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
          child: SelectExistingVariantSheet(
            productId: widget.product.product.id!,
            storeId: storeId,
            onVariantSelected: (variant) {
              Navigator.pop(ctx);
              _linkVariantToStore(variant, widget.product.id);
            },
            onCreateNew: () {
              Navigator.pop(ctx);
              _openCreateVariantForm(widget.product.storeId);
            },
          ),
        ),
      ),
    );
  }

  void _linkVariantToStore(Variant variant, int storeProductId) async {
    final provider = context.read<ProductProvider>();
    XFile? image;
    if (variant.imageUrl != null && variant.imageUrl!.isNotEmpty) {
      image = XFile(variant.imageUrl!);
    }
    final response = await provider.linkVariantToStore(
      storeProductId,
      variant.id!,
      price: variant.salePrice1,
      image: image,
    );

    if (response['status'] == true) {
      await _refreshData();
      setState(() {
        _variants = widget.product.product.variants ?? [];
      });
      NotificationService.showSuccess(context, response['message']);
    } else {
      NotificationService.showError(context, response['message']);
    }
  }

  //  POUR LA SUPPRESSION DE VARIANTE GLOBALE (non liée à la boutique)
  void _confirmDeleteVariant(Variant variant) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text(
          'Voulez-vous vraiment supprimer la variante "${variant.name}" ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final provider = context.read<ProductProvider>();
              // Appeler la vraie méthode de suppression
              final response = await provider.deleteGlobalVariant(variant.id!);

              if (response['status'] == true) {
                await _refreshData();
                NotificationService.showSuccess(context, 'Variante supprimée');
              } else {
                NotificationService.showError(context, response['message']);
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }

  // POUR LA DISSOCIATION DE VARIANTE (lien boutique)
  void _confirmUnlinkVariant(Variant variant) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dissocier la variante'),
        content: Text(
          'Voulez-vous vraiment dissocier "${variant.name}" de cette boutique ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
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
                NotificationService.showSuccess(context, response['message']);
              } else {
                NotificationService.showError(context, response['message']);
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
