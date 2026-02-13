import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:provider/provider.dart';
import 'type_item_widgets.dart';

class TypeListSidebar extends StatelessWidget {
  final TextEditingController searchController;
  final VoidCallback onClearSearch;

  const TypeListSidebar({
    super.key,
    required this.searchController,
    required this.onClearSearch,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<TypesProduitsViewModel>(
      builder: (context, viewModel, child) {
        return Container(
          width: 350,
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            border: Border(
              right: BorderSide(color: Colors.grey.shade300, width: 1),
            ),
          ),
          child: Column(
            children: [              

              // Barre de recherche
              // Barre de recherche avec Consumer pour avoir accès au viewModel
              Padding(
                padding: const EdgeInsets.all(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(25),
                    border: Border.all(color: Colors.grey.shade300),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search, color: Colors.grey, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: searchController,
                          onChanged: (value) => viewModel.setSearchQuery(value),
                          decoration: const InputDecoration(
                            hintText: 'Rechercher...',
                            border: InputBorder.none,
                            hintStyle: TextStyle(color: Colors.grey),
                          ),
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                      if (searchController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: onClearSearch,
                        ),
                    ],
                  ),
                ),
              ),

              // Filtres
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Filtrer par:',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        FilterChip(
                          label: const Text('Tous'),
                          selected: viewModel.selectedGrandType == null,
                          onSelected: (selected) {
                            if (selected) {
                              viewModel.selectGrandType(null);
                            }
                          },
                        ),
                        ...viewModel.grandsTypes.map((type) {
                          return FilterChip(
                            label: Text(type.nom),
                            selected: viewModel.selectedGrandType?.id == type.id,
                            onSelected: (selected) {
                              viewModel.selectGrandType(
                                selected ? type : null,
                              );
                            },
                          );
                        }),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              const Divider(height: 1),

              // Liste des types
              Expanded(
                child: viewModel.filteredTypes.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.category_outlined,
                              size: 60,
                              color: Colors.grey.shade300,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              searchController.text.isEmpty
                                  ? 'Aucun type disponible'
                                  : 'Aucun résultat',
                              style: TextStyle(
                                color: Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: viewModel.filteredTypes.length,
                        itemBuilder: (context, index) {
                          final type = viewModel.filteredTypes[index];
                          return TypeItemWidget(
                            type: type,
                            isSelected: viewModel.selectedType?.id == type.id,
                            onTap: () {
                              if (type.isGrandType && type.hasSousTypes) {
                                viewModel.selectGrandType(type);
                              } else {
                                viewModel.selectType(type);
                              }
                            },
                            isCompact: true,
                          );
                        },
                      ),
              ),

              // Stats en bas
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    top: BorderSide(color: Colors.grey.shade300, width: 1),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total produits:',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              Text(
                                '${viewModel.totalProduits}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'Types:',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey.shade600,
                              ),
                            ),
                            Text(
                              '${viewModel.filteredTypes.length}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}