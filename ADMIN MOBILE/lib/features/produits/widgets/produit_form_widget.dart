// produit_form_widget.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/type_produits/provider/type_produit_provider.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';
import 'package:provider/provider.dart';

class ProduitFormWidget extends StatefulWidget {
  final Product? produit;
  final Function(Product)? onSave;
  final Function()? onCancel;

  const ProduitFormWidget({
    super.key,
    this.produit,
    this.onSave,
    this.onCancel,
  });

  @override
  State<ProduitFormWidget> createState() => _ProduitFormWidgetState();
}

class _ProduitFormWidgetState extends State<ProduitFormWidget> {
  final _formKey = GlobalKey<FormState>();

  // Contrôleurs
  late TextEditingController _nomController;
  late TextEditingController _skuController;
  late TextEditingController _prixVenteController;
  late TextEditingController _prixAchatController;
  late TextEditingController _descriptionController;
  late TextEditingController _stockController;
  late TextEditingController _locationController;
  late TextEditingController _rechercheTypeController;
  late TextEditingController _rechercheMarqueController;

  // Valeurs
  int? _selectedCategorieId;
  int? _selectedGroupeId;
  int? _selectedTypeId;
  String? _selectedMarque;
  String? _selectedStatus = 'Actif';
  List<String> _images = [];
  int _joursEcart = 15;

  // Données
  final List<String> _marques = ['Nike', 'Apple', 'Samsung'];
  final List<String> _statusList = ['Actif', 'Inactif', 'Rupture'];

  // Listes filtrées pour la recherche
  List<String> _filteredMarques = [];
  List<TypeProduit> _filteredTypes =
      []; // On stocke les objets TypeProduit pour avoir l'ID

  @override
  void initState() {
    super.initState();

    final produit = widget.produit;
    _nomController = TextEditingController(text: produit?.name ?? '');
    _skuController = TextEditingController(text: produit?.sku ?? '');
    _prixVenteController = TextEditingController(
      text: produit?.price.toString() ?? '',
    );
    _prixAchatController = TextEditingController(
      text: produit?.cost.toString() ?? '',
    );
    _descriptionController = TextEditingController(
      text: produit?.description ?? '',
    );
    _stockController = TextEditingController(
      text: produit?.stock.toString() ?? '0',
    );
    _locationController = TextEditingController(text: produit?.location ?? '');
    _rechercheTypeController = TextEditingController();
    _rechercheMarqueController = TextEditingController(
      text: produit?.brand ?? '',
    );

    _selectedCategorieId = produit?.categorieId;
    _selectedGroupeId = produit?.groupeId;
    _selectedTypeId = produit?.typeId;
    _selectedMarque = produit?.brand;
    _selectedStatus = produit?.status;
    _images = produit?.imageUrl ?? [];

    _filteredMarques = _marques;
    _rechercheMarqueController.addListener(_filterMarques);
    _rechercheTypeController.addListener(_filterTypes);
  }

  @override
  void dispose() {
    _nomController.dispose();
    _skuController.dispose();
    _prixVenteController.dispose();
    _prixAchatController.dispose();
    _descriptionController.dispose();
    _stockController.dispose();
    _locationController.dispose();
    _rechercheTypeController.dispose();
    _rechercheMarqueController.dispose();
    super.dispose();
  }

  void _filterMarques() {
    final query = _rechercheMarqueController.text.toLowerCase();
    setState(() {
      _filteredMarques = _marques
          .where((m) => m.toLowerCase().contains(query))
          .toList();
    });
  }

  void _filterTypes() {
    final query = _rechercheTypeController.text.toLowerCase();
    // On a besoin des types disponibles (dépend du groupe sélectionné)
    // Cette méthode sera appelée après que les types soient chargés via le provider
    // On mettra à jour _filteredTypes dans le build avec les données du provider
  }

  void _ajouterImage() {
    // TODO: Implémenter la sélection d'image
    if (_images.length < 10) {
      setState(() {
        // Simulation
        _images.add('assets/images/placeholder.jpg');
      });
    }
  }

  void _supprimerImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  void _soumettre() {
    if (_formKey.currentState!.validate()) {
      final boutiqueservice = Provider.of<BoutiqueService>(
        context,
        listen: false,
      );
      final storeId = boutiqueservice.selectedStore!.boutique.id;

      final produit = Product(
        id:
            widget.produit?.id ??
            DateTime.now().millisecondsSinceEpoch.toString(),
        name: _nomController.text,
        sku: _skuController.text,
        status: _selectedStatus ?? 'Actif',
        brand: _selectedMarque ?? '',
        imageUrl: _images,
        description: _descriptionController.text,
        price: double.tryParse(_prixVenteController.text) ?? 0.0,
        cost: double.tryParse(_prixAchatController.text) ?? 0.0,
        stock: int.tryParse(_stockController.text) ?? 0,
        location: _locationController.text,
        variants: widget.produit?.variants ?? [],
        categorieId: _selectedCategorieId,
        groupeId: _selectedGroupeId,
        typeId: _selectedTypeId,
        storeId: storeId,
      );
      widget.onSave?.call(produit);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<TypesProduitsViewModel>(
      builder: (context, typeProvider, child) {
        // Mise à jour des types filtrés en fonction de la recherche
        final typesDisponibles = _selectedGroupeId != null
            ? typeProvider.typesProduits
                  .where((t) => t.groupeId == _selectedGroupeId)
                  .toList()
            : <TypeProduit>[];
        _filteredTypes = typesDisponibles
            .where(
              (t) => t.nom.toLowerCase().contains(
                _rechercheTypeController.text.toLowerCase(),
              ),
            )
            .toList();
            
        return Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Section Images
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconButton(onPressed: ()=> Navigator.pop(context), icon: Icon(Icons.arrow_back),padding: EdgeInsets.all(8),),
                    Expanded(child: _buildImagesSection()),
                  ],
                ),

                const SizedBox(height: 24),

                // Informations de base
                const Text(
                  'Informations de base',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                _buildTextField(
                  label: 'Nom de produit *',
                  controller: _nomController,
                  validator: (value) =>
                      value!.isEmpty ? 'Ce champ est requis' : null,
                ),

                const SizedBox(height: 16),

                _buildTextField(
                  label: 'SKU *',
                  controller: _skuController,
                  validator: (value) =>
                      value!.isEmpty ? 'Ce champ est requis' : null,
                ),

                const SizedBox(height: 16),

                // Catégorie principale
                _buildCategorieDropdown(typeProvider),

                const SizedBox(height: 16),

                // Groupe (dépend de la catégorie)
                if (_selectedCategorieId != null)
                  _buildGroupeDropdown(typeProvider),

                const SizedBox(height: 16),

                // Type (optionnel) avec recherche
                if (_selectedGroupeId != null) _buildTypeField(typeProvider),

                const SizedBox(height: 16),

                // Marque avec recherche
                _buildMarqueField(),

                const SizedBox(height: 16),

                // Statut
                _buildStatusDropdown(),

                const SizedBox(height: 24),

                // Tarification
                const Text(
                  'Tarification',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        label: 'Prix de vente *',
                        controller: _prixVenteController,
                        keyboardType: TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        validator: (value) {
                          if (value!.isEmpty) return 'Ce champ est requis';
                          final price = double.tryParse(value);
                          if (price == null || price <= 0)
                            return 'Prix invalide';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildTextField(
                        label: 'Coût par article *',
                        controller: _prixAchatController,
                        keyboardType: TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        validator: (value) {
                          if (value!.isEmpty) return 'Ce champ est requis';
                          final cost = double.tryParse(value);
                          if (cost == null || cost < 0) return 'Coût invalide';
                          return null;
                        },
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Inventaire
                const Text(
                  'Inventaire',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        label: 'Stock initial *',
                        controller: _stockController,
                        keyboardType: TextInputType.number,
                        validator: (value) {
                          if (value!.isEmpty) return 'Ce champ est requis';
                          final stock = int.tryParse(value);
                          if (stock == null || stock < 0)
                            return 'Stock invalide';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildTextField(
                        label: 'Emplacement',
                        controller: _locationController,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Jours d'écart
                _buildCounterSection(
                  label: 'Jours d\'écart',
                  value: _joursEcart,
                  onDecrement: () => setState(
                    () => _joursEcart = _joursEcart > 0 ? _joursEcart - 1 : 0,
                  ),
                  onIncrement: () => setState(() => _joursEcart++),
                ),

                const SizedBox(height: 24),

                // Description
                const Text(
                  'Description',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                _buildTextField(
                  label: 'Description *',
                  controller: _descriptionController,
                  maxLines: 4,
                  validator: (value) =>
                      value!.isEmpty ? 'Ce champ est requis' : null,
                ),

                const SizedBox(height: 32),

                // Boutons d'action
                _buildActionButtons(),
              ],
            ),
          ),
        );
      },
    );
  }

  // Widgets d'aide

  Widget _buildCategorieDropdown(TypesProduitsViewModel provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Catégorie principale *',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        DropdownButtonFormField<int>(
          initialValue: _selectedCategorieId,
          hint: const Text('Sélectionner une catégorie'),
          items: provider.categoriesPrincipales.map<DropdownMenuItem<int>>((c) {
            return DropdownMenuItem<int>(
              value: c.id, // id est int
              child: Text(c.nom),
            );
          }).toList(),
          onChanged: (value) {
            setState(() {
              _selectedCategorieId = value;
              _selectedGroupeId = null; // Réinitialiser le groupe
              _selectedTypeId = null; // Réinitialiser le type
              _rechercheTypeController.clear();
            });
          },
          validator: (value) =>
              value == null ? 'Veuillez sélectionner une catégorie' : null,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildGroupeDropdown(TypesProduitsViewModel provider) {
    final groupes = provider.groupes
        .where((g) => g.categoriePrincipaleId == _selectedCategorieId)
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Groupe *', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        DropdownButtonFormField<int>(
          initialValue: _selectedGroupeId,
          hint: const Text('Sélectionner un groupe'),
          items: groupes.map<DropdownMenuItem<int>>((g) {
            return DropdownMenuItem<int>(value: g.id, child: Text(g.nom));
          }).toList(),
          onChanged: (value) {
            setState(() {
              _selectedGroupeId = value;
              _selectedTypeId = null;
              _rechercheTypeController.clear();
            });
          },
          validator: (value) =>
              value == null ? 'Veuillez sélectionner un groupe' : null,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
      ],
    );
  }

  Widget _buildTypeField(TypesProduitsViewModel provider) {
    // Les types disponibles sont déjà filtrés dans _filteredTypes
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Type (optionnel)',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        GestureDetector(
          onTap: () {
            _showTypeBottomSheet(context, provider,(selectedType){
              setState(() {
                _selectedTypeId = selectedType.id;
                _rechercheTypeController.text = selectedType.nom;
              });

            });
            setState(() {});
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[400]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    _selectedTypeId != null
                        ? provider.typesProduits
                              .firstWhere((t) => t.id == _selectedTypeId)
                              .nom
                        : 'Sélectionner un type...',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _selectedTypeId != null
                          ? Colors.black
                          : Colors.grey[600],
                    ),
                  ),
                ),
                Icon(Icons.arrow_drop_down, color: Colors.grey[600]),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showTypeBottomSheet(
    BuildContext context,
    TypesProduitsViewModel provider,
    Function(TypeProduit)
    onTypeSelected, // Callback appelé quand un type est choisi
  ) {
    final TextEditingController searchController = TextEditingController();
    List<TypeProduit> filteredTypes = provider.typesProduits
        .where((t) => t.groupeId == _selectedGroupeId)
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            final query = searchController.text.toLowerCase();
            final displayedTypes = filteredTypes
                .where((t) => t.nom.toLowerCase().contains(query))
                .toList();

            return Container(
              padding: const EdgeInsets.all(16),
              height: MediaQuery.of(context).size.height * 0.6,
              child: Column(
                children: [
                  const Text(
                    'Sélectionner un type',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: searchController,
                    decoration: const InputDecoration(
                      hintText: 'Rechercher...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: displayedTypes.isEmpty
                        ? const Center(child: Text('Aucun type trouvé'))
                        : ListView.builder(
                            itemCount: displayedTypes.length,
                            itemBuilder: (ctx, index) {
                              final type = displayedTypes[index];
                              return ListTile(
                                title: Text(type.nom),
                                trailing: _selectedTypeId == type.id
                                    ? const Icon(
                                        Icons.check,
                                        color: Colors.blue,
                                      )
                                    : null,
                                onTap: () {
                                  onTypeSelected(type); // ← on passe le type au parent
                                  Navigator.pop(context);
                                },
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _showCreateTypeDialog(context, provider);
                    },
                    child: const Text('+ Créer un nouveau type'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showCreateTypeDialog(
    BuildContext context,
    TypesProduitsViewModel provider,
  ) {
    final TextEditingController nomController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Nouveau type'),
          content: TextField(
            controller: nomController,
            decoration: const InputDecoration(
              hintText: 'Nom du type',
              border: OutlineInputBorder(),
            ),
            autofocus: true,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nomController.text.isNotEmpty &&
                    _selectedGroupeId != null) {
                  // Appeler la méthode d'ajout du provider
                  await provider.addTypeProduit(
                    TypeProduit(
                      id: 0, // l'id sera généré par le backend
                      nom: nomController.text,
                      groupeId: _selectedGroupeId!,
                      slug: '',
                    ),
                  );
                  // Après ajout, le provider recharge les données
                  // On peut alors récupérer le nouveau type (par exemple le dernier de la liste)
                  if (mounted) {
                    final nouveauType = provider.typesProduits.lastWhere(
                      (t) =>
                          t.nom == nomController.text &&
                          t.groupeId == _selectedGroupeId,
                    );
                    setState(() {
                      _selectedTypeId = nouveauType.id;
                      _rechercheTypeController.text = nouveauType.nom;
                    });
                    Navigator.pop(ctx);
                  }
                }
              },
              child: const Text('Créer'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildMarqueField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Marque *', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        GestureDetector(
          onTap: () => _showMarqueBottomSheet(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[400]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    _selectedMarque ?? 'Sélectionner une marque...',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _selectedMarque != null
                          ? Colors.black
                          : Colors.grey[600],
                    ),
                  ),
                ),
                Icon(Icons.arrow_drop_down, color: Colors.grey[600]),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showMarqueBottomSheet(BuildContext context) {
    final TextEditingController searchController = TextEditingController();
    List<String> filteredMarques = _marques;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            final query = searchController.text.toLowerCase();
            final displayedMarques = filteredMarques
                .where((m) => m.toLowerCase().contains(query))
                .toList();

            return Container(
              padding: const EdgeInsets.all(16),
              height: MediaQuery.of(context).size.height * 0.6,
              child: Column(
                children: [
                  const Text(
                    'Sélectionner une marque',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: searchController,
                    decoration: const InputDecoration(
                      hintText: 'Rechercher...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: displayedMarques.isEmpty
                        ? const Center(child: Text('Aucune marque trouvée'))
                        : ListView.builder(
                            itemCount: displayedMarques.length,
                            itemBuilder: (ctx, index) {
                              final marque = displayedMarques[index];
                              return ListTile(
                                title: Text(marque),
                                trailing: _selectedMarque == marque
                                    ? const Icon(
                                        Icons.check,
                                        color: Colors.blue,
                                      )
                                    : null,
                                onTap: () {
                                  setState(() {
                                    _selectedMarque = marque;
                                    _rechercheMarqueController.text = marque;
                                  });
                                  Navigator.pop(context);
                                },
                              );
                            },
                          ),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _showCreateMarqueDialog(context);
                    },
                    child: const Text('+ Créer une nouvelle marque'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showCreateMarqueDialog(BuildContext context) {
    final TextEditingController nomController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Nouvelle marque'),
          content: TextField(
            controller: nomController,
            decoration: const InputDecoration(
              hintText: 'Nom de la marque',
              border: OutlineInputBorder(),
            ),
            autofocus: true,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nomController.text.isNotEmpty) {
                  setState(() {
                    _marques.add(nomController.text);
                    _selectedMarque = nomController.text;
                    _rechercheMarqueController.text = nomController.text;
                  });
                  Navigator.pop(ctx);
                }
              },
              child: const Text('Créer'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildStatusDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Statut', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[400]!),
            borderRadius: BorderRadius.circular(4),
          ),
          child: DropdownButton<String>(
            value: _selectedStatus,
            isExpanded: true,
            underline: const SizedBox(),
            items: _statusList.map((status) {
              return DropdownMenuItem(value: status, child: Text(status));
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedStatus = value;
              });
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    String? Function(String?)? validator,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        TextFormField(
          controller: controller,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
          keyboardType: keyboardType,
          maxLines: maxLines,
          validator: validator,
        ),
      ],
    );
  }

  Widget _buildCounterSection({
    required String label,
    required int value,
    required VoidCallback onDecrement,
    required VoidCallback onIncrement,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                onPressed: onDecrement,
                icon: const Icon(Icons.remove),
              ),
              Text(
                '$value jours',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(onPressed: onIncrement, icon: const Icon(Icons.add)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildImagesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Images du produit',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),

        if (_images.isNotEmpty)
          Container(
            height: 150,
            margin: const EdgeInsets.only(bottom: 16),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _images.length,
              itemBuilder: (context, index) {
                return Container(
                  width: 150,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    image: DecorationImage(
                      image: AssetImage(_images[index]),
                      fit: BoxFit.cover,
                    ),
                  ),
                );
              },
            ),
          ),

        Container(
          width: double.infinity,
          height: 120,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: TextButton(
            onPressed: _ajouterImage,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.add_photo_alternate, color: Colors.blue, size: 40),
                const SizedBox(height: 8),
                const Text(
                  'Ajouter une image',
                  style: TextStyle(color: Colors.blue),
                ),
              ],
            ),
          ),
        ),

        if (_images.isNotEmpty) ...[
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_images.length, (index) {
              return Stack(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      image: DecorationImage(
                        image: AssetImage(_images[index]),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => _supprimerImage(index),
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.close,
                          size: 14,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),
          ),
        ],

        const SizedBox(height: 8),
        Text(
          '${_images.length}/10 images',
          style: TextStyle(color: Colors.grey[600]),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: (){
              widget.onCancel ?? Navigator.pop(context);
            },
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              side: BorderSide(color: Colors.grey),
            ),
            child: const Text('Annuler', style: TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _soumettre,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: Text(
              widget.produit != null ? 'Mettre à jour' : 'Créer',
              style: const TextStyle(fontSize: 16, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}
