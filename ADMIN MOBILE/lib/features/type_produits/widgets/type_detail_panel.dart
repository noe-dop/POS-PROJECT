import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/constants/random_color.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';
import 'package:nsp_pos_mobile/features/type_produits/widgets/add_categorie_dialog.dart';
import 'package:nsp_pos_mobile/features/type_produits/widgets/add_group_dialog.dart';
import 'package:provider/provider.dart';
import '../provider/type_produit_provider.dart';
import 'add_type_produit_dialog.dart';

class TypeDetailPanel extends StatefulWidget {
  final VoidCallback? onBack; // Pour navigation mobile

  const TypeDetailPanel({super.key, this.onBack});

  @override
  State<TypeDetailPanel> createState() => _TypeDetailPanelState();
}

class _TypeDetailPanelState extends State<TypeDetailPanel> {
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
        // Si un type de produit est sélectionné
        if (viewModel.selectedTypeProduit != null) {
          return _buildTypeDetail(context, viewModel);
        }
        // Si un groupe est sélectionné
        else if (viewModel.selectedGroupe != null) {
          return _buildGroupeDetail(context, viewModel);
        }
        // Si une catégorie principale est sélectionnée
        else if (viewModel.selectedCategoriePrincipale != null) {
          return _buildCategorieDetail(context, viewModel);
        }
        // Aucune sélection
        else {
          return _buildEmptyState(context);
        }
      },
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.folder_open, size: 80, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            'Sélectionnez une catégorie',
            style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorieDetail(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    final categorie = viewModel.selectedCategoriePrincipale!;
    final groupes = viewModel.groupesFiltres;

    return Column(
      children: [
        // En-tête avec retour (mobile) et titre
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.blue.shade50,
          child: Row(
            children: [
              if (widget.onBack != null)
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: widget.onBack,
                ),
              Expanded(
                child: ListTile(
                  title: Text(
                    categorie.nom,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    categorie.description,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w300,
                    ),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () async {
                  final result = await showDialog<Map<String, dynamic>>(
                    context: context,
                    builder: (context) => AddCategorieDialog(
                      categorie: categorie,
                      canEdit: _isStaff!,
                    ),
                  );
                  if (result != null && result.isNotEmpty) {
                    await viewModel.updateCategoriePrincipale(
                      categorie.id,
                      result,
                    );
                  }
                },
              ),
              _isStaff == true
                  ? IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () => _confirmDeleteCategorie(
                        context,
                        viewModel,
                        categorie,
                      ),
                    )
                  : SizedBox.shrink(),
            ],
          ),
        ),

        // Liste des groupes
        Expanded(
          child: groupes.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.folder, size: 60, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      Text(
                        'Aucun groupe dans cette catégorie',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: groupes.length,
                  itemBuilder: (context, index) {
                    final groupe = groupes[index]!;
                    final nbTypes = viewModel.typesProduits
                        .where((t) => t.groupeId == groupe.id)
                        .length;
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: RandomColor().getColorFromName(
                            groupe.nom,
                          ),
                          child: Text(
                            groupe.nom.substring(0, 1).toUpperCase(),
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(groupe.nom),
                        subtitle: Text('$nbTypes types de produits'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => viewModel.selectGroupe(groupe),
                      ),
                    );
                  },
                ),
        ),

        // Bouton d'ajout de groupe
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: () async {
              final result = await showDialog<Groupe>(
                context: context,
                builder: (context) => AddGroupeDialog(
                  categories: viewModel.categoriesPrincipales,
                  canEdit: _isStaff!,
                ),
              );
              if (result != null) {
                await viewModel.addGroupe(result);
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Ajouter un groupe'),
          ),
        ),
      ],
    );
  }

  Widget _buildGroupeDetail(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    final groupe = viewModel.selectedGroupe!;
    final types = viewModel.typesFiltres;

    return Column(
      children: [
        // En-tête avec retour
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.green.shade50,
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => viewModel.selectGroupe(null),
              ),
              Expanded(
                child: ListTile(
                  title: Text(
                    groupe.nom,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(groupe.description,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w300
                  ),),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () async {
                  final result = await showDialog<Groupe?>(
                    context: context,
                    builder: (context) => AddGroupeDialog(
                      categories: viewModel.categoriesPrincipales,
                      groupe: groupe,
                      canEdit: _isStaff!,
                    ),
                  );
                  // Il faut au moins que le nom change pour
                  // lancer la mise à jour
                  if (result != null && (result.nom != groupe.nom ||
                      result.description != groupe.description)) {
                    await viewModel.updateGroupe(groupe.id!, result);
                  }
                },
              ),
              _isStaff == true
                  ? IconButton(
                      icon: const Icon(Icons.delete, color: Colors.red),
                      onPressed: () =>
                          _confirmDeleteGroupe(context, viewModel, groupe),
                    )
                  : SizedBox.shrink(),
            ],
          ),
        ),

        // Liste des types de produits
        Expanded(
          child: types.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.inventory_2,
                        size: 60,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucun type de produit dans ce groupe',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: types.length,
                  itemBuilder: (context, index) {
                    final type = types[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: RandomColor().getColorFromName(
                            type.nom,
                          ),
                          child: Text(
                            type.nom.substring(0, 1).toUpperCase(),
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(type.nom),
                        trailing: _isStaff == false
                            ? null
                            : Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit, size: 20),
                                    onPressed: () async {
                                      final result =
                                          await showDialog<TypeProduit?>(
                                            context: context,
                                            builder: (context) =>
                                                AddTypeProduitDialog(
                                                  initial: type,
                                                  groupes: viewModel.groupes,
                                                  groupeId: type.groupeId,
                                                ),
                                          );
                                      // Pas de mise à jour si le nom est le même
                                      if (result != null &&
                                          result.nom != type.nom) {
                                        await viewModel.updateTypeProduit(
                                          type.id!,
                                          result,
                                        );
                                      }
                                    },
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete,
                                      size: 20,
                                      color: Colors.red,
                                    ),
                                    onPressed: () => _confirmDeleteType(
                                      context,
                                      viewModel,
                                      type,
                                    ),
                                  ),
                                ],
                              ),
                        // Pas Besoin d'action sur les types
                        onTap: _isStaff == false
                            ? null
                            : () => viewModel.selectTypeProduit(type),
                      ),
                    );
                  },
                ),
        ),

        // Bouton d'ajout de type
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton.icon(
            onPressed: () async {
              final result = await showDialog<TypeProduit>(
                context: context,
                builder: (context) => AddTypeProduitDialog(
                  groupes: viewModel.groupes,
                  groupeId: groupe.id,
                ),
              );
              if (result != null) {
                await viewModel.addTypeProduit(
                  result
                );
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Ajouter un type de produit'),
          ),
        ),
      ],
    );
  }

  Widget _buildTypeDetail(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    final type = viewModel.selectedTypeProduit!;

    return Column(
      children: [
        // En-tête avec retour
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.orange.shade50,
          child: Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => viewModel.selectTypeProduit(null),
              ),
              Expanded(
                child: Text(
                  type.nom,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () async {
                  final result = await showDialog<TypeProduit>(
                    context: context,
                    builder: (context) => AddTypeProduitDialog(
                      initial: type,
                      groupes: viewModel.groupes,
                      groupeId: type.groupeId,
                    ),
                  );
                  if (result != null && result.nom != type.nom) {
                    await viewModel.updateTypeProduit(type.id!, result);
                  }
                },
              ),
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.red),
                onPressed: () => _confirmDeleteType(context, viewModel, type),
              ),
            ],
          ),
        ),

        // Informations détaillées
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(Icons.folder),
                          title: const Text('Groupe associé'),
                          subtitle: Text(
                            viewModel.groupes
                                .firstWhere((g) => g.id == type.groupeId)
                                .nom,
                          ),
                        ),
                        const Divider(),
                        // ListTile(
                        //   leading: const Icon(Icons.production_quantity_limits),
                        //   title: const Text('Nombre de produits'),
                        //   subtitle: const Text('0'), // À remplacer
                        // ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Ici vous pourriez ajouter une liste des produits de ce type
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _confirmDeleteCategorie(
    BuildContext context,
    TypesProduitsViewModel viewModel,
    CategoriePrincipale cat,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text(
          'Voulez-vous vraiment supprimer la catégorie "${cat.nom}" ? Tous les groupes et types associés seront également supprimés.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await viewModel.deleteCategoriePrincipale(cat.id);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteGroupe(
    BuildContext context,
    TypesProduitsViewModel viewModel,
    Groupe groupe,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text(
          'Voulez-vous vraiment supprimer le groupe "${groupe.nom}" ? Tous les types associés seront également supprimés.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await viewModel.deleteGroupe(groupe.id!);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteType(
    BuildContext context,
    TypesProduitsViewModel viewModel,
    TypeProduit type,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text(
          'Voulez-vous vraiment supprimer le type de produit "${type.nom}" ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await viewModel.deleteTypeProduit(type.id!);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}
