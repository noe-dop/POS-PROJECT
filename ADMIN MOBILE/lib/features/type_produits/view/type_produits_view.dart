import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:nsp_pos_mobile/features/type_produits/widgets/categorie_list_sidebar.dart';
import 'package:provider/provider.dart';
import '../widgets/add_categorie_dialog.dart';
import '../widgets/type_detail_panel.dart';

class TypesProduitsView extends StatefulWidget {
  const TypesProduitsView({super.key});

  @override
  State<TypesProduitsView> createState() => _TypesProduitsViewState();
}

class _TypesProduitsViewState extends State<TypesProduitsView> {
  final TextEditingController _searchController = TextEditingController();
  int _selectedMobileTab = 0;
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
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _showAddCategorieDialog(BuildContext context) async {
    final viewModel = Provider.of<TypesProduitsViewModel>(
      context,
      listen: false,
    );
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AddCategorieDialog(canEdit: _isStaff!),
    );
    if (result != null && result.isNotEmpty) {
      await viewModel.addCategoriePrincipale(result);
      if (!mounted) return;
      NotificationService.showSuccess(context, 'Catégorie "$result" ajoutée');
    }
  }

  void _onTabChanged(int index) {
    setState(() => _selectedMobileTab = index);
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
              if (viewModel.isloading) {
                return _buildLoadingScreen();
              }
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

  // Écran de chargement élégant
  Widget _buildLoadingScreen() {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo ou icône animée
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.blue.shade50,
              ),
              child: const Icon(
                Icons.category_rounded,
                size: 64,
                color: Colors.blue,
              ),
            ),
            const SizedBox(height: 32),
            // Indicateur de progression moderne
            const SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 4,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Chargement des catégories...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDesktopLayout(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestion des types de produits'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        elevation: 2,
      ),
      drawer: const SideMenu(),
      body: Row(
        children: [
          // Sidebar des catégories
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400, minWidth: 300),
            child: CategorieListSidebar(
              searchController: _searchController,
              onClearSearch: () {
                _searchController.clear();
                viewModel.setSearchQuery('');
              },
            ),
          ),
          // Panneau de détails
          Expanded(child: TypeDetailPanel()),
        ],
      ),
    );
  }

  Widget _buildMobileLayout(
    BuildContext context,
    TypesProduitsViewModel viewModel,
  ) {
    return DefaultTabController(
      length: 2,
      initialIndex: _selectedMobileTab,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Types de produits'),
          backgroundColor: Colors.blue.shade700,
          foregroundColor: Colors.white,
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showAddCategorieDialog(context),
            ),
          ],
          bottom: TabBar(
            onTap: _onTabChanged,
            tabs: const [
              Tab(icon: Icon(Icons.list), text: 'Catégories'),
              Tab(icon: Icon(Icons.info_outline), text: 'Détails'),
            ],
            indicatorColor:
                Colors.white, // Couleur de l'indicateur (soulignement)
            indicatorWeight: 3.0, // Épaisseur de l'indicateur
            labelColor: Colors.white, // Couleur du texte/icône pour l'onglet sélectionné
            unselectedLabelColor:
                Colors.white70, // Couleur pour les onglets non sélection
          ),
        ),
        drawer: const SideMenu(),
        body: TabBarView(
          children: [
            // Onglet Liste : affiche la sidebar des catégories
            CategorieListSidebar(
              searchController: _searchController,
              onClearSearch: () {
                _searchController.clear();
                viewModel.setSearchQuery('');
              },
            ),
            // Onglet Détails : affiche le panneau avec possibilité de retour
            TypeDetailPanel(
              onBack: () {
                // Si on est dans un sous-niveau, on peut gérer la navigation
                if (viewModel.selectedTypeProduit != null) {
                  viewModel.selectTypeProduit(null);
                } else if (viewModel.selectedGroupe != null) {
                  viewModel.selectGroupe(null);
                } else if (viewModel.selectedCategoriePrincipale != null) {
                  viewModel.selectCategoriePrincipale(null);
                }
                // Basculer éventuellement vers l'onglet liste
                setState(() => _selectedMobileTab = 0);
              },
            ),
          ],
        ),
      ),
    );
  }
}
