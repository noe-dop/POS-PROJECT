import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/constants/random_color.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/auth/widgets/auth_form.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/detail_boutique_view.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/edit_boutique_view.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/features/dashboard/widgets/side_menu.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';

class BoutiquesView extends StatefulWidget {
  const BoutiquesView({super.key});

  @override
  State<BoutiquesView> createState() => _BoutiquesViewState();
}

class _BoutiquesViewState extends State<BoutiquesView> {
  bool _isGridView = true;
  String _statusFilter = 'all'; // 'all', 'active', 'inactive'
  final TextEditingController _searchController = TextEditingController();

  List<BoutiqueType>? boutiqueTypes;
  List<StoreWithPermission> listStores = [];
  List<StoreWithPermission> filteredStoresList = [];

  // Dans le même fichier ou dans un fichier de dialogues séparé
  Future<bool> showDeleteConfirmationDialog(
    /// Fenêtre de dialogue pour demander confirmation à l'utilisateur
    /// avant de pouvoir lancer la suppression
    BuildContext context, {
    required String storeName,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: Text(
          'Voulez-vous vraiment supprimer la boutique "$storeName" ?\nCette action est irréversible.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<BoutiqueService>(
      builder: (context, boutiqueService, child) {
        final isLoading = boutiqueService.isLoading;
        boutiqueTypes = boutiqueService.getBoutiqueTypes;
        listStores = boutiqueService.accessibleStores;
        filteredStoresList = listStores.where((store) {
          // Filtre par statut
          if (_statusFilter == 'active' && !store.boutique.isActive)
            return false;
          if (_statusFilter == 'inactive' && store.boutique.isActive)
            return false;

          // Filtre par recherche textuelle (nom, ville, adresse, email)
          if (_searchController.text.isNotEmpty) {
            final query = _searchController.text.toLowerCase();
            final boutique = store.boutique;
            return boutique.name.toLowerCase().contains(query) ||
                boutique.address.city.toLowerCase().contains(query) ||
                boutique.address.addressLine1.toLowerCase().contains(query) ||
                (boutique.email?.toLowerCase().contains(query) ?? false);
          }
          return true;
        }).toList();
        final String? errorMessage = boutiqueService.errorMessage;
        return Scaffold(
          drawer: const SideMenu(),
          appBar: AppBar(
            centerTitle: true,
            backgroundColor: const Color(0xFF2E3A59),
            elevation: 0,
          ),
          body: _buildBody(
            boutiqueService,
            boutiqueTypes,
            isLoading,
            errorMessage,
          ),
          floatingActionButton: FloatingActionButton(
            onPressed: () {},
            backgroundColor: Colors.blue,
            child: const Icon(Icons.add, color: Colors.white),
          ),
        );
      },
    );
  }

  Widget _buildBody(
    BoutiqueService boutiqueService,
    List<BoutiqueType>? boutiqueTypes,
    bool isLoading,
    String? errorMessage,
  ) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            SizedBox(height: 16),
            Text(
              'Erreur de chargement',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => boutiqueService.init(),
              child: Text('Réessayer'),
            ),
          ],
        ),
      );
    }

    if (boutiqueTypes == null || boutiqueTypes.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.store_mall_directory_outlined,
              size: 64,
              color: Colors.blue,
            ),
            SizedBox(height: 16),
            Text(
              'Aucun type de boutique disponible',
              style: TextStyle(fontSize: 18),
            ),
            SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => boutiqueService.fetchBoutiqueTypes(),
              child: Text('Actualiser'),
            ),
          ],
        ),
      );
    }

    // Tout est bon, afficher le contenu normal
    return SingleChildScrollView(
      child: Column(
        children: [
          // En-tête utilisateur
          _buildUserHeader(),

          // Section "Mes Stores"
          _buildStoresSection(boutiqueService),

          // Section Catalogue
          _buildCatalogueSection(),

          // Section de recherche
          _buildSearchSection(boutiqueService),

          // En-tête de la liste
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Boutiques (${filteredStoresList.length})',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                onPressed: () {
                  setState(() {
                    _isGridView = !_isGridView;
                  });
                },
                icon: Icon(
                  _isGridView ? Icons.list : Icons.grid_view,
                  color: Colors.blue,
                ),
              ),
            ],
          ),

          // Liste/Grille des boutiques
          _isGridView
              ? _buildGridView(boutiqueService)
              : _buildListView(boutiqueService),

          // Espace en bas
          SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildUserHeader() {
    final user = Provider.of<AuthService>(context, listen: false).userData;
    String role = '';
    switch (user['role']) {
      case "owner":
        role = LocaleKeys.owner;
        break;
      case "employee":
        role = LocaleKeys.employee;
        break;
    }
    // Extraire les informations utilisateur
    final fullName = user['full_name'];
    final firstName = user['first_name'];
    final lastName = user['last_name'];

    // Créer les initiales pour l'avatar
    String getInitials() {
      /// Générer les initiales à partir du nom complet ou prénom/nom
      if (firstName.isNotEmpty && lastName.isNotEmpty) {
        return '${firstName[0]}${lastName[0]}'.toUpperCase();
      } else if (firstName.isNotEmpty) {
        return firstName[0].toUpperCase();
      } else if (lastName.isNotEmpty) {
        return lastName[0].toUpperCase();
      } else if (fullName.isNotEmpty) {
        final parts = fullName.split(' ');
        if (parts.length >= 2) {
          return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
        }
        return fullName[0].toUpperCase();
      }
      return 'U';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(color: Color(0xFF2E3A59)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: Colors.white,
            child: Text(getInitials()),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user['full_name'],
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        role.tr(),
                        style: TextStyle(color: Colors.white, fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStoresSection(BoutiqueService boutiqueService) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey[50],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Mes Stores',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2E3A59),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Gérez l\'ensemble de vos points de vente',
            style: TextStyle(color: Colors.grey[600], fontSize: 14),
          ),
          const SizedBox(height: 20),

          // Statistiques
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  title: 'Total Stores',
                  value: listStores.length.toString(),
                  subtitle: '',
                  icon: Icons.store,
                  color: Colors.blue,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  title: 'Employés',
                  value: boutiqueService.totalEmployeesAllStores.toString(),
                  subtitle:
                      'Moyenne : ${boutiqueService.moyenneEmployeesAllStores} par store',
                  icon: Icons.people,
                  color: Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildStatCard(
            title: 'Nombre de Produits',
            value: boutiqueService.totalProductsAllStores.toString(),
            subtitle: 'En stock total',
            icon: Icons.inventory,
            color: Colors.orange,
          ),
          const SizedBox(height: 20),

          // Contrôles d'affichage
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => setState(() => _isGridView = true),
                      icon: Icon(
                        Icons.grid_view,
                        color: _isGridView ? Colors.blue : Colors.grey,
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _isGridView = false),
                      icon: Icon(
                        Icons.list,
                        color: !_isGridView ? Colors.blue : Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
              // Creation d'une nouvelle boutique
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pushNamed(context, '/create_store');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                icon: const Icon(Icons.add),
                label: const Text('Nouveau Store'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey[500], fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCatalogueSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Catalogue',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2E3A59),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchSection(BoutiqueService boutiqueService) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: Colors.white,
      child: Row(
        children: [
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(25),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (_) =>
                    setState(() {}), // Pour rafraichir la liste filtrée
                decoration: const InputDecoration(
                  hintText: 'Rechercher un store, une ville...',
                  border: InputBorder.none,
                  prefixIcon: Icon(Icons.search, color: Colors.grey),
                  contentPadding: EdgeInsets.symmetric(
                    vertical: 0,
                    horizontal: 16,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Dropdown de filtre par statut
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(20),
            ),
            child: DropdownButton<String>(
              value: _statusFilter,
              underline: const SizedBox(),
              icon: const Icon(Icons.arrow_drop_down, color: Colors.grey),
              items: const [
                DropdownMenuItem(value: 'all', child: Text('Tous les statuts')),
                DropdownMenuItem(value: 'active', child: Text('Actif')),
                DropdownMenuItem(value: 'inactive', child: Text('Inactif')),
              ],
              onChanged: (value) {
                setState(() {
                  _statusFilter = value!;
                });
              },
            ),
          ),
          IconButton(
            onPressed: () async {
              boutiqueService.fetchAccessibleStores();
              //Rafraichissement de la page apres
              setState(() {});
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
    );
  }

  Widget _buildGridView(BoutiqueService boutiqueService) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: filteredStoresList.isNotEmpty
          ? GridView.builder(
              // 👇 On utilise GridView.builder, pas SliverGrid.builder
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 350,
                mainAxisExtent: 310,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.9,
              ),
              itemCount: filteredStoresList.length,
              shrinkWrap: true, // important si dans un SingleChildScrollView
              physics:
                  const NeverScrollableScrollPhysics(), // pour désactiver le défilement interne
              itemBuilder: (context, index) {
                return _buildStoreCard(
                  filteredStoresList[index].boutique,
                  boutiqueService,
                );
              },
            )
          : const Center(child: Text("Aucune boutique créée pour l'instant")),
    );
  }

  Widget _buildListView(BoutiqueService boutiqueService) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: filteredStoresList.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildStoreCard(
            filteredStoresList[index].boutique,
            boutiqueService,
          ),
        );
      },
    );
  }

  Widget _buildStoreCard(BoutiqueModel store, BoutiqueService boutiqueService) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête de la carte
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: RandomColor().getColorFromName(store.name),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: store.isActive ? Colors.green : Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  store.isActive == true ? "Active" : "Inactive",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue[50],
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    boutiqueTypes!
                        .firstWhere((type) => type.id == store.storeType)
                        .name,
                    style: TextStyle(
                      color: Colors.blue[700],
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Corps de la carte
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  store.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),

                // Localisation
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        store.address.addressLine1,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  store.address.city,
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 12),

                // Contact
                Row(
                  children: [
                    const Icon(Icons.phone, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        store.phone!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    const Icon(Icons.email, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        store.email!,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Métriques
                // Stat Employee et produits
                Row(
                  children: [
                    _buildMetricItem(
                      Icons.people,
                      '${store.totalEmployee} emp',
                    ),
                    const SizedBox(width: 8),
                    _buildMetricItem(
                      Icons.inventory,
                      '${store.totalProducts} prod',
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Actions
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey, width: 0.5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Modification
                IconButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => EditBoutiqueView(store: store),
                      ),
                    ).then((updated) {
                      if (updated == true) {}
                    });
                  },
                  icon: const Icon(Icons.edit, size: 18, color: Colors.blue),
                  padding: EdgeInsets.zero,
                ),
                // Suppression
                IconButton(
                  onPressed: () async {
                    // Vérifier si l'utilisateur a le droit de supprimer
                    final storeWithPermission = filteredStoresList.firstWhere(
                      (s) => s.boutique.id == store.id,
                    );
                    final canDelete =
                        storeWithPermission.accessRole == 'owner_primary' ||
                        storeWithPermission.accessRole == 'owner' ||
                        storeWithPermission.accessRole == 'superadmin';

                    if (!canDelete) {
                      NotificationService.showWarning(
                        context,
                        'Vous n\'avez pas les permissions pour supprimer cette boutique',
                      );
                      return;
                    }

                    // Afficher la confirmation
                    final confirm = await showDeleteConfirmationDialog(
                      context,
                      storeName: store.name,
                    );

                    if (confirm == true) {
                      // Appel du service
                      final success = await boutiqueService.deleteStore(
                        store.id,
                      );

                      if (success && mounted) {
                        NotificationService.showSuccess(
                          context,
                          'Boutique "${store.name}" supprimée avec succès',
                        );
                        // le notifylisteners ne lance pas un rebuild
                        //du coup le setstate est necessaire
                        setState(() {});
                      } else if (mounted) {
                        final errorMsg = 'Erreur lors de la suppression';
                        NotificationService.showError(context, errorMsg);
                      }
                    }
                  },
                  icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                  padding: EdgeInsets.zero,
                ),
                // Detail view
                IconButton(
                  onPressed: () {
                    // Déterminer si l'utilisateur peut modifier cette boutique
                    final storeWithPermission = filteredStoresList.firstWhere(
                      (s) => s.boutique.id == store.id,
                    );
                    final canEdit =
                        storeWithPermission.accessRole == 'owner_primary' ||
                        storeWithPermission.accessRole == 'owner';

                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            DetailBoutiqueView(store: store, canEdit: canEdit),
                      ),
                    );
                  },
                  icon: const Icon(
                    Icons.visibility,
                    size: 18,
                    color: Colors.green,
                  ),
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(IconData icon, String text) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 12, color: Colors.grey[600]),
            const SizedBox(width: 4),
            Text(text, style: TextStyle(fontSize: 10, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}
