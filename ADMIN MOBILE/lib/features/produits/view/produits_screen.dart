import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/view/product_detail_view.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/produit_form_widget.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/select_existing_product.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:provider/provider.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({super.key});

  @override
  State<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends State<ProductsPage> {
  final TextEditingController _searchController = TextEditingController();
  bool _showDetails = false; // Pour mobile

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _ouvrirFormulaireProduit({Product? produit}) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    // Le formulaire sera construit avec les providers nécessaires (ProductProvider et TypeProduitsProvider)
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

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => BoutiqueService()),
        ChangeNotifierProvider(
          create: (ctx) =>
              ProductProvider(boutiqueService: ctx.read<BoutiqueService>()),
        ),
        ChangeNotifierProvider(create: (_) => TypesProduitsViewModel()),
      ],
      child: Consumer<ProductProvider>(
        builder: (context, provider, child) {
          return Scaffold(
            appBar: AppBar(
              title: const Text(
                'Gestion des Produits',
                overflow: TextOverflow.clip,
              ),
              centerTitle: true,
              actions: [
                // Dropdown de sélection de boutique
                Consumer<BoutiqueService>(
                  builder: (context, boutiqueService, child) {
                    if (boutiqueService.accessibleStores.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0),
                      child: DropdownButton<StoreWithPermission>(
                        value: boutiqueService.selectedStore,
                        hint: const Text('Boutique'),
                        items: boutiqueService.accessibleStores.map((store) {
                          return DropdownMenuItem(
                            value: store,
                            child: Text(store.boutique.name),
                          );
                        }).toList(),
                        onChanged: (newStore) {
                          if (newStore != null) {
                            boutiqueService.selectStore(newStore);
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
      ),
    );
  }

  // Layout desktop
  Widget _buildDesktopLayout(
    BuildContext context,
    ProductProvider provider,
    bool isTablet,
  ) {
    if (provider.isLoading) {
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

  // Layout mobile
  Widget _buildMobileLayout(BuildContext context, ProductProvider provider) {
    if (provider.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    return _showDetails
        ? _buildProductDetail(context, provider.selectedProduct!, true)
        : _buildProductListSection(context, provider);
  }

  // Section liste des produits
  Widget _buildProductListSection(
    BuildContext context,
    ProductProvider provider,
  ) {
    // print(provider.products.first);
    // print(provider.filteredProducts.first);
    // print("Nombre de produit dans filtrered ${provider.filteredProducts.length}");
    final isMobile = MediaQuery.of(context).size.width < 768;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Barre de recherche
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

        // Filtres de statut
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: ['Tous', 'Actif', 'Rupture'].map((status) {
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(status),
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

        // Bouton Ajouter (desktop)
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

        // Liste des produits
        Expanded(
          child: provider.products.isEmpty
              ? const Center(child: Text('Aucun produit trouvé'))
              : ListView.builder(
                  itemCount: provider.filteredProducts.length,
                  itemBuilder: (context, index) {
                    final product = provider.filteredProducts[index];
                    print(product);
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
    Product product,
  ) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    final bool isDraft = product.status.toLowerCase() == 'draft';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: isDraft ? 
      RoundedRectangleBorder(
        side: const BorderSide(color: Colors.red,width: 1.5),
        borderRadius: BorderRadius.circular(8)
      ) : null,
      child: ListTile(
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: product.imageUrl!.isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(product.imageUrl![0], fit: BoxFit.cover),
                )
              : Icon(Icons.shopping_bag, color: Colors.grey[600]),
        ),
        title: Text(
          product.name,
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
                        : product.status =='draft' ? Colors.red[50]: Colors.orange[50],
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: product.status == 'active'
                          ? Colors.green
                          : product.status == 'draft'?  Colors.red: Colors.orange,
                    ),
                  ),
                  child: Text(
                    product.status,
                    style: TextStyle(
                      color: product.status == 'active'
                          ? Colors.green
                          : product.status=='draft' ? Colors.red: Colors.orange,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              product.sku!,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () {
          provider.selectProduct(product);
          if (isMobile) {
            setState(() {
              _showDetails = true;
            });
          }
        },
        selected: provider.selectedProduct?.sku == product.sku,
        selectedTileColor: Colors.blue[50],
      ),
    );
  }

  Widget _buildProductDetail(
    BuildContext context,
    Product product,
    bool isMobile,
  ) {
    return ProductDetailView(
      product: product,
      isMobile: isMobile,
      onEdit: () => _ouvrirFormulaireProduit(produit: product),
      onDelete: () => _confirmDelete(context, product),
      onBack: isMobile
          ? () {
              setState(() {
                _showDetails = false;
              });
            }
          : null,
    );
  }

  /// Ouvre le flux d'ajout : d'abord la liste des produits existants non liés
  void _openAddProductFlow() {
    final boutiqueService = context.read<BoutiqueService>();
    final currentStore = boutiqueService.selectedStore;
    if (currentStore == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner une boutique')),
      );
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
          child: SelectExistingProductSheet(
            storeId: currentStore.boutique.id,
            onProductSelected: (product) {
              // Lier le produit existant à la boutique
              _linkProductToStore(product);
            },
            onCreateNew: () {
              Navigator.pop(context); // ferme le bottom sheet
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
            constraints: const BoxConstraints(maxWidth: 600, maxHeight: 800),
            child: SelectExistingProductSheet(
              storeId: currentStore.boutique.id,
              onProductSelected: (product) {
                Navigator.pop(context);
                _linkProductToStore(product);
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

  /// Ouvre le formulaire de création d'un nouveau produit (comportement original)
  void _openCreateProductForm({Product? produit}) {
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

  /// Lie un produit existant à la boutique courante
  void _linkProductToStore(Product product) async {
    final provider = context.read<ProductProvider>();
    final success = await provider.linkProductToStore(product);
    if (mounted) {
      if (success) {
        NotificationService.showSuccess(
          context,
          'Produit "${product.name}" ajouté à la boutique',
        );
        // Les listes sont déjà rechargées dans linkProductToStore
        Navigator.pop(context); // Ferme le bottom sheet après ajout
      } else {
        NotificationService.showError(context, 'Erreur : ${provider.error}');
      }
    }
  }

  void _confirmDelete(BuildContext context, Product product) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text('Voulez-vous vraiment supprimer "${product.name}" ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<ProductProvider>().deleteProduct(product.id!);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}
