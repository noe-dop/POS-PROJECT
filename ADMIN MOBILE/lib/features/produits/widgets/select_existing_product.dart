import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:provider/provider.dart';

class SelectExistingProductSheet extends StatefulWidget {
  final int storeId;
  final Function(Product) onProductSelected;
  final VoidCallback onCreateNew;

  const SelectExistingProductSheet({
    super.key,
    required this.storeId,
    required this.onProductSelected,
    required this.onCreateNew,
  });

  @override
  State<SelectExistingProductSheet> createState() =>
      _SelectExistingProductSheetState();
}

class _SelectExistingProductSheetState
    extends State<SelectExistingProductSheet> {
  @override
  void initState() {
    super.initState();
    // Déclencher le chargement dès l'ouverture du bottom sheet
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<ProductProvider>(context, listen: false);
      provider.loadUnlinkedProducts(widget.storeId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppBar(
          title: const Text('Ajouter un produit existant'),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
        Expanded(
          child: Consumer<ProductProvider>(
            builder: (context, provider, child) {
              if (provider.isLoading) {
                return const Center(child: CircularProgressIndicator());
              }
              if (provider.error != null) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Erreur: ${provider.error}'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () =>
                            provider.loadUnlinkedProducts(widget.storeId),
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                );
              }
              final products = provider.unlinkedProducts;
              if (products.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Aucun produit disponible à ajouter.'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: widget.onCreateNew,
                        child: const Text('Créer un nouveau produit'),
                      ),
                    ],
                  ),
                );
              }
              return ListView.builder(
                itemCount: products.length,
                itemBuilder: (context, index) {
                  final product = products[index];
                  return ListTile(
                    leading: Stack(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          color: Colors.grey[200],
                          child:
                              product.imagesUrls != null &&
                                  product.imagesUrls!.isNotEmpty
                              ? Image.network(
                                  product.imagesUrls![0],
                                  fit: BoxFit.cover,
                                )
                              : const Icon(Icons.shopping_bag),
                        ),
                        if (product.status.toLowerCase() == 'draft')
                          Positioned(
                            top: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.warning,
                                color: Colors.white,
                                size: 10,
                              ),
                            ),
                          ),
                      ],
                    ),
                    title: Text(product.name),
                    subtitle: Text(product.sku ?? ''),
                    trailing: ElevatedButton(
                      onPressed: () => widget.onProductSelected(product),
                      child: const Text('Ajouter'),
                    ),
                  );
                },
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: widget.onCreateNew,
              icon: const Icon(Icons.add),
              label: const Text('Créer un nouveau produit'),
            ),
          ),
        ),
      ],
    );
  }
}
