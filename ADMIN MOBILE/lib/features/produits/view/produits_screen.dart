// lib/features/produits/views/produits_screen.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/view/product_detail_view.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_product_model.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/produit_form_widget.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/select_existing_product.dart';
import 'package:provider/provider.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({super.key});

  @override
  State<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends State<ProductsPage> {
  final TextEditingController _searchController = TextEditingController();
  bool _showDetails = false;
  bool _isLoadingMore = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final provider = context.read<ProductProvider>();
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.8) {
      if (provider.hasMore && !provider.isLoadingMore) {
        provider.loadMoreStoreProducts();
      }
    }
  }

  Future<void> _initializeData() async {
    final boutiqueService = Provider.of<BoutiqueService>(
      context,
      listen: false,
    );
    final productProvider = Provider.of<ProductProvider>(
      context,
      listen: false,
    );

    if (boutiqueService.accessibleStores.isEmpty) {
      await boutiqueService.fetchAccessibleStores();
    }

    if (boutiqueService.selectedStore != null) {
      await productProvider.loadStoreProducts(
        boutiqueService.selectedStore!.boutique.id,
        refresh: true,
      );
    }
  }

  void _ouvrirFormulaireProduit({StoreProduct? produit}) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    if (isMobile) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.8,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Material(child: ProduitFormWidget(produit: produit)),
          );
        },
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              Material(child: ProduitFormWidget(produit: produit)),
          fullscreenDialog: true,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    final isTablet = MediaQuery.of(context).size.width < 1024;

    return Consumer<ProductProvider>(
      builder: (context, provider, child) {
        return Scaffold(
          appBar: AppBar(
            title: const Text(
              'Gestion des Produits',
              overflow: TextOverflow.clip,
            ),
            centerTitle: true,
            titleSpacing: 0,
            actions: [
              Consumer<BoutiqueService>(
                builder: (context, boutiqueService, child) {
                  if (boutiqueService.accessibleStores.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  final selectedStoreId =
                      boutiqueService.selectedStore?.boutique.id;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: DropdownButton<int>(
                      value: selectedStoreId!,
                      hint: const Text('Choisir boutique'),
                      isExpanded: false,
                      items: boutiqueService.accessibleStores.map((store) {
                        return DropdownMenuItem<int>(
                          value: store.boutique.id,
                          child: SizedBox(
                            width: 200,
                            child: Text(
                              store.boutique.name,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (newStoreId) {
                        if (newStoreId != null) {
                          final store = boutiqueService.accessibleStores
                              .firstWhere(
                                (store) => store.boutique.id == newStoreId,
                              );
                          boutiqueService.selectStore(store);
                          provider.onStoreChanged();
                          setState(() {});
                        }
                      },
                      underline: const SizedBox(),
                    ),
                  );
                },
              ),
              if (_showDetails && isMobile)
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () {
                    setState(() {
                      _showDetails = false;
                    });
                  },
                ),
            ],
          ),
          drawer: const SideMenu(),
          body: isMobile
              ? _buildMobileLayout(context, provider)
              : _buildDesktopLayout(context, provider, isTablet),
          floatingActionButton: isMobile && !_showDetails
              ? FloatingActionButton(
                  onPressed: () => _openAddProductFlow(),
                  tooltip: 'Ajouter un produit',
                  child: const Icon(Icons.add),
                )
              : null,
        );
      },
    );
  }

  Widget _buildDesktopLayout(
    BuildContext context,
    ProductProvider provider,
    bool isTablet,
  ) {
    if (provider.isLoading && provider.products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    return Row(
      children: [
        Expanded(
          flex: isTablet ? 3 : 2,
          child: Container(
            color: Colors.grey[50],
            padding: const EdgeInsets.all(16),
            child: _buildProductListSection(context, provider),
          ),
        ),
        Expanded(
          flex: isTablet ? 5 : 3,
          child: provider.selectedProduct != null
              ? _buildProductDetail(context, provider.selectedProduct!, false)
              : const Center(
                  child: Text(
                    'Sélectionnez un produit pour voir les détails',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildMobileLayout(BuildContext context, ProductProvider provider) {
    if (provider.isLoading && provider.products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    return _showDetails
        ? _buildProductDetail(context, provider.selectedProduct!, true)
        : _buildProductListSection(context, provider);
  }

  Widget _buildProductListSection(
    BuildContext context,
    ProductProvider provider,
  ) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    final filteredProducts = provider.filteredProducts;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: TextField(
            controller: _searchController,
            onChanged: (value) => provider.setSearchQuery(value),
            decoration: const InputDecoration(
              hintText: 'Rechercher des produits...',
              border: InputBorder.none,
              prefixIcon: Icon(Icons.search, color: Colors.grey),
              suffixIcon: Icon(Icons.filter_list, color: Colors.grey),
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: ['Tous', 'active', 'draft', 'archived'].map((status) {
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(status.toUpperCase()),
                  selected: provider.statusFilter == status,
                  onSelected: (selected) {
                    if (selected) provider.setStatusFilter(status);
                  },
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),
        if (!isMobile)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _openAddProductFlow(),
              icon: const Icon(Icons.add, size: 20),
              label: const Text('Ajouter un Produit'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        const SizedBox(height: 16),
        Expanded(
          child: provider.products.isEmpty && !provider.isLoading
              ? const Center(child: Text('Aucun produit trouvé'))
              : ListView.builder(
                  controller: _scrollController,
                  itemCount:
                      filteredProducts.length + (provider.hasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    // Afficher l'indicateur de chargement
                    if (index == filteredProducts.length) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    final product = filteredProducts[index];
                    return _buildProductItem(context, provider, product);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildProductItem(
    BuildContext context,
    ProductProvider provider,
    StoreProduct product,
  ) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    final bool isDraft = product.status.toLowerCase() == 'draft';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: isDraft
          ? RoundedRectangleBorder(
              side: const BorderSide(color: Colors.red, width: 1.5),
              borderRadius: BorderRadius.circular(8),
            )
          : null,
      child: ListTile(
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: product.product.imagesUrls!.isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    product.product.imagesUrls![0],
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) =>
                        Icon(Icons.broken_image, color: Colors.grey[400]),
                  ),
                )
              : Icon(Icons.shopping_bag, color: Colors.grey[600]),
        ),
        title: Text(
          product.product.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: product.status == 'active'
                        ? Colors.green[50]
                        : product.status == 'draft'
                        ? Colors.red[50]
                        : Colors.orange[50],
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: product.status == 'active'
                          ? Colors.green
                          : product.status == 'draft'
                          ? Colors.red
                          : Colors.orange,
                    ),
                  ),
                  child: Text(
                    product.status,
                    style: TextStyle(
                      color: product.status == 'active'
                          ? Colors.green
                          : product.status == 'draft'
                          ? Colors.red
                          : Colors.orange,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              product.product.sku ?? '',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () {
          provider.selectProduct(product);
          if (isMobile) setState(() => _showDetails = true);
        },
        selected: provider.selectedProduct?.product.sku == product.product.sku,
        selectedTileColor: Colors.blue[50],
      ),
    );
  }

  Widget _buildProductDetail(
    BuildContext context,
    StoreProduct product,
    bool isMobile,
  ) {
    return ProductDetailView(
      product: product,
      isMobile: isMobile,
      onEdit: () => _ouvrirFormulaireProduit(produit: product),
      onDelete: () => _confirmDelete(context, product),
      onBack: isMobile ? () => setState(() => _showDetails = false) : null,
    );
  }

  // ============================================
  // OPEN ADD PRODUCT FLOW (AMÉLIORÉ)
  // ============================================
  Future<void> _openAddProductFlow() async {
    final boutiqueService = Provider.of<BoutiqueService>(
      context,
      listen: false,
    );
    final provider = Provider.of<ProductProvider>(context, listen: false);

    if (boutiqueService.accessibleStores.isEmpty) {
      await boutiqueService.fetchAccessibleStores();
    }
    if (!mounted) return;

    final currentStore = boutiqueService.selectedStore;
    if (currentStore == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner une boutique')),
      );
      return;
    }

    // Charger les produits non liés si nécessaire
    if (provider.unlinkedProducts.isEmpty && !provider.isLoading) {
      await provider.loadUnlinkedProducts(
        currentStore.boutique.id,
        refresh: true,
      );
    }
    if (!mounted) return;

    final isMobile = MediaQuery.of(context).size.width < 768;

    void showSelectProducts() {
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
            child: SelectExistingProductSheet(
              storeId: currentStore.boutique.id,
              onProductsSelected: (selectedProducts) {
                // Lier tous les produits sélectionnés
                _linkMultipleProductsToStore(selectedProducts);
              },
              onCreateNew: () {
                Navigator.pop(context);
                _openCreateProductForm();
              },
            ),
          ),
        );
      } else {
        showDialog(
          context: context,
          builder: (context) => Dialog(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 700, maxHeight: 800),
              child: SelectExistingProductSheet(
                storeId: currentStore.boutique.id,
                onProductsSelected: (selectedProducts) {
                  Navigator.pop(context);
                  _linkMultipleProductsToStore(selectedProducts);
                },
                onCreateNew: () {
                  Navigator.pop(context);
                  _openCreateProductForm();
                },
              ),
            ),
          ),
        );
      }
    }

    // Si des produits non liés existent, afficher la sélection
    if (provider.unlinkedProducts.isNotEmpty) {
      showSelectProducts();
    } else {
      // Si aucun produit non lié, proposer d'en créer un
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Aucun produit disponible'),
          content: const Text(
            'Tous les produits sont déjà liés à cette boutique. '
            'Souhaitez-vous créer un nouveau produit ?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _openCreateProductForm();
              },
              child: const Text('Créer un produit'),
            ),
          ],
        ),
      );
    }
  }

  // ============================================
  // LIER PLUSIEURS PRODUITS À LA BOUTIQUE
  // ============================================
  Future<void> _linkMultipleProductsToStore(List<Product> products) async {
    final provider = Provider.of<ProductProvider>(context, listen: false);

    if (products.isEmpty) return;

    // Afficher un indicateur de chargement
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Liaison des produits en cours...'),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final result = await provider.linkMultipleProductsToStore(products);

      if (!context.mounted) return;
      Navigator.pop(context); // Fermer le dialog de chargement

      if (result['status'] == true) {
        NotificationService.showSuccess(
          context,
          result['message'] ?? 'Produits liés avec succès',
        );
        // Recharger les listes
        await provider.loadStoreProducts(
          provider.currentStoreId!,
          refresh: true,
        );
        await provider.loadUnlinkedProducts(
          provider.currentStoreId!,
          refresh: true,
        );
        if (mounted) setState(() {});
      } else {
        NotificationService.showError(
          context,
          result['message'] ?? 'Erreur lors de la liaison',
        );
        if (result['errors'] != null && result['errors'].isNotEmpty) {
          // Afficher les détails des erreurs
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Détails des erreurs'),
              content: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: result['errors'].map<Widget>((error) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text('• $error'),
                    );
                  }).toList(),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Fermer'),
                ),
              ],
            ),
          );
        }
      }
    } catch (e) {
      if (!context.mounted) return;
      Navigator.pop(context); // Fermer le dialog de chargement
      NotificationService.showError(context, 'Erreur: $e');
    }
  }

  void _openCreateProductForm({StoreProduct? produit}) {
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
          child: Material(child: ProduitFormWidget(produit: produit)),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) =>
              Material(child: ProduitFormWidget(produit: produit)),
          fullscreenDialog: true,
        ),
      );
    }
  }

  void _confirmDelete(BuildContext context, StoreProduct product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text(
          'Voulez-vous vraiment supprimer "${product.product.name}" ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              // Dans votre widget

              Navigator.pop(ctx);

              final provider = context.read<ProductProvider>();
              final response = await provider.deleteStoreProduct(product.id);

              if (response['success'] == true) {
                if (mounted) {
                  NotificationService.showSuccess(
                    context,
                    response['message'] ?? 'Produit supprimé avec succès',
                  );
                  // Optionnel: rafraîchir la liste
                  await provider.loadStoreProducts(
                    product.storeId,
                    refresh: true,
                  );
                  setState(() {
                    _showDetails = false;
                  });
                }
              } else {
                if (mounted) {
                  NotificationService.showError(
                    context,
                    response['message'] ??
                        'Erreur lors de la suppression du produit',
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}
