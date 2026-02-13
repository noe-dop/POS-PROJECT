import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/constants/random_color.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:provider/provider.dart';
import '../widgets/add_type_dialog.dart';
import '../widgets/add_sous_type_dialog.dart';
import '../widgets/type_detail_panel.dart';
import '../widgets/type_list_sidebar.dart';

class TypesProduitsView extends StatefulWidget {
  const TypesProduitsView({super.key});

  @override
  State<TypesProduitsView> createState() => _TypesProduitsViewState();
}

class _TypesProduitsViewState extends State<TypesProduitsView> {
  final TextEditingController _searchController = TextEditingController();
  int _selectedMobileTab = 0; // Pour la navigation mobile

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _showAddGrandTypeDialog(BuildContext context) async {
    final viewModel = Provider.of<TypesProduitsViewModel>(
      context,
      listen: false,
    );

    final result = await showDialog<String>(
      context: context,
      builder: (context) => const AddTypeDialog(
        title: 'Créer un Grand Type',
        buttonText: 'Créer',
      ),
    );

    if (result != null && result.isNotEmpty) {
      await viewModel.addGrandType(result);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Grand type "$result" ajouté avec succès'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  void _onTabChanged(int index, BuildContext context) {
    setState(() {
      _selectedMobileTab = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => TypesProduitsViewModel(),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isMobile = constraints.maxWidth < 768;

          return Consumer<TypesProduitsViewModel>(
            builder: (context, viewModel, child) {
              if (isMobile) {
                return _buildMobileLayout(context, viewModel);
              } else {
                return _buildDesktopLayout(context, viewModel);
              }
            },
          );
        },
      ),
    );
  }

  // Layout Desktop
  Widget _buildDesktopLayout(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestion des Types de Produits'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 2,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddGrandTypeDialog(context),
            tooltip: 'Ajouter un grand type',
          ),
          IconButton(
            icon: Icon(
              viewModel.showGrandsTypesOnly ? Icons.list : Icons.category,
            ),
            onPressed: viewModel.toggleShowGrandsTypesOnly,
            tooltip: viewModel.showGrandsTypesOnly
                ? 'Voir tous les types'
                : 'Voir uniquement les grands types',
          ),
        ],
      ),
      body: Row(
        children: [
          // Sidebar gauche (responsive)
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400, minWidth: 300),
            child: Consumer<TypesProduitsViewModel>(
              builder: (context, vm, child) {
                return TypeListSidebar(
                  searchController: _searchController,
                  onClearSearch: () {
                    _searchController.clear();
                    vm.setSearchQuery('');
                  }, 
                );
              },
            ),
          ),

          // Panneau de détails droite (responsive)
          Expanded(child: _buildDetailPanel(context, viewModel)),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddGrandTypeDialog(context),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        tooltip: 'Ajouter un type',
        child: const Icon(Icons.add),
      ),
    );
  }

  // Layout Mobile
  Widget _buildMobileLayout(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return DefaultTabController(
      length: 2,
      initialIndex: _selectedMobileTab,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Types de Produits'),
          backgroundColor: Colors.blue.shade700,
          foregroundColor: Colors.white,
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showAddGrandTypeDialog(context),
            ),
          ],
          bottom: TabBar(
            onTap: (index) => _onTabChanged(index, context),
            tabs: const [
              Tab(icon: Icon(Icons.list), text: 'Liste'),
              Tab(icon: Icon(Icons.info_outline), text: 'Détails'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Onglet Liste
            _buildMobileListTab(context, viewModel),

            // Onglet Détails
            _buildMobileDetailTab(context, viewModel),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => _showAddGrandTypeDialog(context),
          backgroundColor: Colors.blue,
          child: const Icon(Icons.add),
        ),
      ),
    );
  }

  // Onglet Liste pour mobile
  Widget _buildMobileListTab(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return Column(
      children: [
        // Barre de recherche mobile
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
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
                          controller: _searchController,
                          onChanged: (value) => viewModel.setSearchQuery(value),
                          decoration: const InputDecoration(
                            hintText: 'Rechercher...',
                            border: InputBorder.none,
                            hintStyle: TextStyle(color: Colors.grey),
                          ),
                          style: const TextStyle(fontSize: 14),
                        ),
                      ),
                      if (_searchController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            viewModel.setSearchQuery('');
                          },
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<String>(
                icon: const Icon(Icons.filter_list),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'toggle_view',
                    child: Row(
                      children: [
                        Icon(
                          viewModel.showGrandsTypesOnly
                              ? Icons.check_box
                              : Icons.check_box_outline_blank,
                        ),
                        const SizedBox(width: 8),
                        const Text('Grands types seulement'),
                      ],
                    ),
                  ),
                  const PopupMenuDivider(),
                  const PopupMenuItem(
                    value: 'all',
                    child: Text('Tous les types'),
                  ),
                  ...viewModel.grandsTypes.map((type) {
                    return PopupMenuItem(value: type.id, child: Text(type.nom));
                  }),
                ],
                onSelected: (value) {
                  if (value == 'toggle_view') {
                    viewModel.toggleShowGrandsTypesOnly();
                  } else if (value == 'all') {
                    viewModel.selectGrandType(null);
                  } else {
                    final type = viewModel.grandsTypes.firstWhere(
                      (t) => t.id == value,
                    );
                    viewModel.selectGrandType(type);
                  }
                },
              ),
            ],
          ),
        ),

        // Filtres rapides (chips scrollables)
        SizedBox(
          height: 50,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: [
              ActionChip(
                label: const Text('Tous'),
                onPressed: () => viewModel.selectGrandType(null),
                backgroundColor: viewModel.selectedGrandType == null
                    ? Colors.blue.shade100
                    : Colors.grey.shade100,
              ),
              const SizedBox(width: 8),
              ...viewModel.grandsTypes.map((type) {
                final isSelected = viewModel.selectedGrandType?.id == type.id;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ActionChip(
                    label: Text(type.nom),
                    onPressed: () =>
                        viewModel.selectGrandType(isSelected ? null : type),
                    backgroundColor: isSelected
                        ? Colors.blue.shade100
                        : Colors.grey.shade100,
                  ),
                );
              }),
            ],
          ),
        ),

        // En-tête de liste
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Text(
                viewModel.selectedGrandType != null
                    ? 'Sous-types'
                    : viewModel.showGrandsTypesOnly
                    ? 'Grands Types'
                    : 'Tous les types',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const Spacer(),
              Chip(
                label: Text('${viewModel.filteredTypes.length}'),
                backgroundColor: Colors.blue.shade100,
              ),
            ],
          ),
        ),

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
                        _searchController.text.isEmpty
                            ? 'Aucun type disponible'
                            : 'Aucun résultat',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: viewModel.filteredTypes.length,
                  itemBuilder: (context, index) {
                    final type = viewModel.filteredTypes[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: RandomColor().getColorFromName(type.nom),
                          child: Text(
                            type.nom.substring(0, 1).toUpperCase(),
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(
                          type.nom,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        subtitle: Text(
                          '${type.nombreProduits} produits',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                        trailing: type.isGrandType && type.hasSousTypes
                            ? const Icon(Icons.chevron_right)
                            : null,
                        onTap: () {
                          if (type.isGrandType && type.hasSousTypes) {
                            viewModel.selectGrandType(type);
                          } else {
                            viewModel.selectType(type);
                          }
                          // Basculer vers l'onglet Détails
                          setState(() {
                            _selectedMobileTab = 1;
                          });
                        },
                      ),
                    );
                  },
                ),
        ),

        // Stats en bas
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            border: Border(top: BorderSide(color: Colors.grey.shade300)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Column(
                children: [
                  Text(
                    '${viewModel.totalProduits}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                  Text(
                    'Produits',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              Column(
                children: [
                  Text(
                    '${viewModel.grandsTypes.length}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                  Text(
                    'Grands types',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
              Column(
                children: [
                  Text(
                    viewModel.typesProduits
                        .fold<int>(
                          0,
                          (sum, type) => sum + type.sousTypes.length,
                        )
                        .toString(),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange,
                    ),
                  ),
                  Text(
                    'Sous-types',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // Onglet Détails pour mobile
  Widget _buildMobileDetailTab(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return _buildDetailPanel(context, viewModel);
  }

  // Panneau de détails (commun desktop/mobile)
  Widget _buildDetailPanel(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return TypeDetailPanel(
      selectedType: viewModel.selectedType,
      selectedGrandType: viewModel.selectedGrandType,
      onAddSousType: (parentType) async {
        final result = await showDialog<String>(
          context: context,
          builder: (context) => AddSousTypeDialog(parentType: parentType),
        );

        if (result != null && result.isNotEmpty) {
          await viewModel.addSousType(result, parentType.id);

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Sous-type "$result" ajouté'),
              backgroundColor: Colors.blue,
            ),
          );
        }
      },
      onEditType: (type) async {
        final result = await showDialog<String>(
          context: context,
          builder: (context) => AddTypeDialog(
            initialName: type.nom,
            title: type.isSousType
                ? 'Modifier le Sous-Type'
                : 'Modifier le Type',
            buttonText: 'Mettre à jour',
          ),
        );

        if (result != null && result.isNotEmpty) {
          await viewModel.updateType(type.id, result);

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Type modifié en "$result"'),
              backgroundColor: Colors.blue,
            ),
          );
        }
      },
      onDeleteType: (type) async {
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Confirmer la suppression'),
            content: Text(
              type.isSousType
                  ? 'Voulez-vous vraiment supprimer le sous-type "${type.nom}" ?'
                  : 'Voulez-vous vraiment supprimer le type "${type.nom}" et tous ses sous-types ?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('Supprimer'),
              ),
            ],
          ),
        );

        if (confirmed == true) {
          await viewModel.deleteType(type.id);

          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Type "${type.nom}" supprimé'),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
    );
  }
}
