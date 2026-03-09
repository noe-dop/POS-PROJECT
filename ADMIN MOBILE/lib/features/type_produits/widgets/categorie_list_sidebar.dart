import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/type_produits/widgets/add_categorie_dialog.dart';
import 'package:provider/provider.dart';
import '../provider/type_produit_provider.dart';
import 'package:nsp_pos_mobile/core/constants/random_color.dart';

class CategorieListSidebar extends StatefulWidget {
  final TextEditingController searchController;
  final VoidCallback onClearSearch;

  const CategorieListSidebar({
    super.key,
    required this.searchController,
    required this.onClearSearch,
  });

  @override
  State<CategorieListSidebar> createState() => _CategorieListSidebarState();
}

class _CategorieListSidebarState extends State<CategorieListSidebar> {
  bool? _isStaff; // null = en cours de chargement
  late final StorageService _storage = StorageService(); // singleton
  @override
  void initState() {
    super.initState();
    _loadStaffStatus();
  }

  Future<void> _loadStaffStatus() async {
    final staff = await _storage.getStaffStatus(); // retourne bool?
    if (mounted) {
      setState(() {
        _isStaff = staff ?? false; // par défaut false
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TypesProduitsViewModel>(
      builder: (context, viewModel, child) {
        return Container(
          color: Colors.grey.shade50,
          child: Column(
            children: [
              // Barre de recherche
              Row(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(width: 16),
                            const Icon(
                              Icons.search,
                              size: 20,
                              color: Colors.grey,
                            ),
                            Expanded(
                              child: TextField(
                                controller: widget.searchController,
                                onChanged: (value) =>
                                    viewModel.setSearchQuery(value),
                                decoration: const InputDecoration(
                                  hintText: 'Rechercher...',
                                  border: InputBorder.none,
                                  hintStyle: TextStyle(color: Colors.grey),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 8,
                                  ),
                                ),
                              ),
                            ),
                            if (widget.searchController.text.isNotEmpty)
                              IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: widget.onClearSearch,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: ElevatedButton(
                      onPressed: () {
                        viewModel.loadData();
                      },
                      child: Icon(Icons.refresh_rounded),
                    ),
                  ),
                ],
              ),

              // En-tête
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Row(
                  children: [
                    const Text(
                      'Catégories principales',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    Chip(
                      label: Text('${viewModel.categoriesPrincipales.length}'),
                      backgroundColor: Colors.blue.shade100,
                    ),
                  ],
                ),
              ),

              // Liste des catégories
              Expanded(
                child: ListView.builder(
                  itemCount: viewModel.categoriesPrincipales.length,
                  itemBuilder: (context, index) {
                    final cat = viewModel.categoriesPrincipales[index];
                    final isSelected =
                        viewModel.selectedCategoriePrincipale?.id == cat.id;
                    final nbGroupes = viewModel.groupes
                        .where((g) => g.categoriePrincipaleId == cat.id)
                        .length;
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: RandomColor().getColorFromName(
                          cat.nom,
                        ),
                        child: Text(
                          cat.nom.substring(0, 1).toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      title: Text(
                        cat.nom,
                        style: TextStyle(
                          fontWeight: isSelected
                              ? FontWeight.bold
                              : FontWeight.normal,
                        ),
                      ),
                      subtitle: Text('$nbGroupes groupes'),
                      selected: isSelected,
                      selectedColor:
                          const Color(0xFF589FD8), // Couleur de fond plus visible
                      trailing: isSelected
                          ? const Icon(Icons.arrow_forward_ios, color:  Color(0xFF589FD8))
                          : null, // Icône de validation
                      onTap: () => viewModel.selectCategoriePrincipale(
                        isSelected ? null : cat,
                      ),
                    );
                  },
                ),
              ),

              // Bouton d'ajout de catégorie
              Padding(
                padding: const EdgeInsets.all(16),
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final result = await showDialog<Map<String, dynamic>>(
                      context: context,
                      builder: (context) =>
                          AddCategorieDialog(canEdit: _isStaff!),
                    );
                    if (result != null && result.isNotEmpty) {
                      await viewModel.addCategoriePrincipale(result);
                    }
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Ajouter une catégorie'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(40),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
