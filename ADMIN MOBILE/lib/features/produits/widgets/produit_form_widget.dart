// widgets/produit_form_widget.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';

class ProduitFormWidget extends StatefulWidget {
  final Product? produit; // Pour l'édition, null pour création
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
  String? _selectedType;
  String? _selectedMarque;
  String? _selectedStatus = 'Actif';
  List<String> _images = [];
  int _joursEcart = 15;
  
  // Données
  final List<String> _typesProduit = ['Électronique', 'Vêtements', 'Alimentation'];
  final List<String> _marques = ['Nike', 'Apple', 'Samsung'];
  final List<String> _statusList = ['Actif', 'Inactif', 'Rupture'];
  List<String> _filteredTypes = [];
  List<String> _filteredMarques = [];

  @override
  void initState() {
    super.initState();
    
    // Initialiser les contrôleurs avec les valeurs du produit (si édition)
    final produit = widget.produit;
    _nomController = TextEditingController(text: produit?.name ?? '');
    _skuController = TextEditingController(text: produit?.sku ?? '');
    _prixVenteController = TextEditingController(text: produit?.price.toString() ?? '');
    _prixAchatController = TextEditingController(text: produit?.cost.toString() ?? '');
    _descriptionController = TextEditingController(text: produit?.description ?? '');
    _stockController = TextEditingController(text: produit?.stock.toString() ?? '0');
    _locationController = TextEditingController(text: produit?.location ?? '');
    _rechercheTypeController = TextEditingController(text: produit?.type ?? '');
    _rechercheMarqueController = TextEditingController(text: produit?.brand ?? '');
    
    _selectedType = produit?.type;
    _selectedMarque = produit?.brand;
    _selectedStatus = produit?.status;
    _images = produit?.imageUrl ?? [];
    
    _filteredTypes = _typesProduit;
    _filteredMarques = _marques;
    
    _rechercheTypeController.addListener(_filterTypes);
    _rechercheMarqueController.addListener(_filterMarques);
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

  void _filterTypes() {
    final query = _rechercheTypeController.text.toLowerCase();
    setState(() {
      _filteredTypes = _typesProduit
          .where((type) => type.toLowerCase().contains(query))
          .toList();
    });
  }

  void _filterMarques() {
    final query = _rechercheMarqueController.text.toLowerCase();
    setState(() {
      _filteredMarques = _marques
          .where((marque) => marque.toLowerCase().contains(query))
          .toList();
    });
  }

  void _ajouterImage() {
    // Simuler l'ajout d'image
    if (_images.length < 3) {
      setState(() {
        // TODO: Intégrer un sélecteur d'images réel
        print("Selection d'images...");
        // _images.add('assets/images/placeholder_${_images.length + 1}.jpg');
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
      final produit = Product(
        id: widget.produit?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
        name: _nomController.text,
        sku: _skuController.text,
        type: _selectedType ?? '',
        brand: _selectedMarque ?? '',
        status: _selectedStatus ?? 'Actif',
        imageUrl: _images,
        description: _descriptionController.text,
        price: double.tryParse(_prixVenteController.text) ?? 0.0,
        cost: double.tryParse(_prixAchatController.text) ?? 0.0,
        stock: int.tryParse(_stockController.text) ?? 0,
        location: _locationController.text,
        variants: widget.produit?.variants ?? [], // Conserver les variantes existantes
      );
      
      widget.onSave?.call(produit);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Images avec carrousel preview
            _buildImagesSection(),
            
            SizedBox(height: 24),
            
            // Informations de base
            Text(
              'Informations de base',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            
            _buildTextField(
              label: 'Nom de produit *',
              controller: _nomController,
              validator: (value) => value!.isEmpty ? 'Ce champ est requis' : null,
            ),
            
            SizedBox(height: 16),
            
            _buildTextField(
              label: 'SKU *',
              controller: _skuController,
              validator: (value) => value!.isEmpty ? 'Ce champ est requis' : null,
            ),
            
            SizedBox(height: 16),
            
            // Type et Marque
            Row(
              children: [
                Expanded(
                  child: _buildDropdownWithSearch(
                    label: 'Type',
                    selectedValue: _selectedType,
                    items: _filteredTypes,
                    searchController: _rechercheTypeController,
                    onChanged: (value) => setState(() => _selectedType = value),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: _buildDropdownWithSearch(
                    label: 'Marque',
                    selectedValue: _selectedMarque,
                    items: _filteredMarques,
                    searchController: _rechercheMarqueController,
                    onChanged: (value) => setState(() => _selectedMarque = value),
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 16),
            
            // Statut - CORRECTION : dropdown standard
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Statut', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[400]!),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: DropdownButton<String>(
                    value: _selectedStatus,
                    isExpanded: true,
                    underline: SizedBox(),
                    items: _statusList.map((status) {
                      return DropdownMenuItem(
                        value: status,
                        child: Text(status),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedStatus = value;
                      });
                    },
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 24),
            
            // Tarification
            Text(
              'Tarification',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildTextField(
                    label: 'Prix de vente *',
                    controller: _prixVenteController,
                    keyboardType: TextInputType.numberWithOptions(decimal: true),
                    validator: (value) {
                      if (value!.isEmpty) return 'Ce champ est requis';
                      final price = double.tryParse(value);
                      if (price == null || price <= 0) return 'Prix invalide';
                      return null;
                    },
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: _buildTextField(
                    label: 'Coût par article *',
                    controller: _prixAchatController,
                    keyboardType: TextInputType.numberWithOptions(decimal: true),
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
            
            SizedBox(height: 24),
            
            // Inventaire
            Text(
              'Inventaire',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            
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
                      if (stock == null || stock < 0) return 'Stock invalide';
                      return null;
                    },
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: _buildTextField(
                    label: 'Emplacement',
                    controller: _locationController,
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 16),
            
            // Jours d'écart
            _buildCounterSection(
              label: 'Jours d\'écart',
              value: _joursEcart,
              onDecrement: () => setState(() => _joursEcart = _joursEcart > 0 ? _joursEcart - 1 : 0),
              onIncrement: () => setState(() => _joursEcart++),
            ),
            
            SizedBox(height: 24),
            
            // Description
            Text(
              'Description',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            
            _buildTextField(
              label: 'Description *',
              controller: _descriptionController,
              maxLines: 4,
              validator: (value) => value!.isEmpty ? 'Ce champ est requis' : null,
            ),
            
            SizedBox(height: 32),
            
            // Boutons d'action
            _buildActionButtons(),
          ],
        ),
      ),
    );
  }

  Widget _buildImagesSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Images du produit',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 8),
        
        // Aperçu carrousel
        if (_images.isNotEmpty)
          Container(
            height: 150,
            margin: EdgeInsets.only(bottom: 16),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _images.length,
              itemBuilder: (context, index) {
                return Container(
                  width: 150,
                  margin: EdgeInsets.only(right: 8),
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
        
        // Bouton d'ajout d'images - SIMPLIFIÉ
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
                SizedBox(height: 8),
                Text('Ajouter une image', style: TextStyle(color: Colors.blue)),
              ],
            ),
          ),
        ),
        
        // Miniatures des images ajoutées
        if (_images.isNotEmpty) ...[
          SizedBox(height: 16),
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
                        padding: EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              );
            }),
          ),
        ],
        
        SizedBox(height: 8),
        Text(
          '${_images.length}/10 images',
          style: TextStyle(color: Colors.grey[600]),
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
        Text(
          label,
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        SizedBox(height: 4),
        TextFormField(
          controller: controller,
          decoration: InputDecoration(
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

  Widget _buildDropdownWithSearch({
    required String label,
    required String? selectedValue,
    required List<String> items,
    required TextEditingController searchController,
    required Function(String?) onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontWeight: FontWeight.bold)),
        SizedBox(height: 4),
        
        GestureDetector(
          onTap: () {
            _showSearchableBottomSheet(
              context: context,
              title: 'Sélectionner un $label',
              items: items,
              searchController: searchController,
              selectedValue: selectedValue,
              onSelected: onChanged,
            );
          },
          child: Container(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[400]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    selectedValue ?? 'Sélectionner...',
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: selectedValue != null ? Colors.black : Colors.grey[600],
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

  Widget _buildCounterSection({
    required String label,
    required int value,
    required VoidCallback onDecrement,
    required VoidCallback onIncrement,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontWeight: FontWeight.bold)),
        SizedBox(height: 8),
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
                icon: Icon(Icons.remove),
              ),
              Text(
                '$value jours',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              IconButton(
                onPressed: onIncrement,
                icon: Icon(Icons.add),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: widget.onCancel,
            style: OutlinedButton.styleFrom(
              padding: EdgeInsets.symmetric(vertical: 16),
              side: BorderSide(color: Colors.grey),
            ),
            child: Text('Annuler', style: TextStyle(fontSize: 16)),
          ),
        ),
        SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: _soumettre,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              padding: EdgeInsets.symmetric(vertical: 16),
            ),
            child: Text(
              widget.produit != null ? 'Mettre à jour' : 'Créer',
              style: TextStyle(fontSize: 16, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  void _showSearchableBottomSheet({
    required BuildContext context,
    required String title,
    required List<String> items,
    required TextEditingController searchController,
    required String? selectedValue,
    required Function(String?) onSelected,
  }) {
    String tempSearch = searchController.text;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            List<String> filteredItems = items
                .where((item) => item.toLowerCase().contains(tempSearch.toLowerCase()))
                .toList();
            
            return Container(
              padding: EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  SizedBox(height: 16),
                  TextField(
                    autofocus: true,
                    controller: TextEditingController(text: tempSearch),
                    decoration: InputDecoration(
                      hintText: 'Rechercher...',
                      prefixIcon: Icon(Icons.search),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (value) {
                      print("Valeur de recherche: $value");
                      tempSearch = value;
                      setState(() {});
                    },
                  ),
                  SizedBox(height: 16),
                  Expanded(
                    child: filteredItems.isEmpty
                        ? Center(
                            child: Text(
                              'Aucun résultat',
                              style: TextStyle(color: Colors.grey),
                            ),
                          )
                        : ListView.builder(
                            itemCount: filteredItems.length,
                            itemBuilder: (context, index) {
                              final item = filteredItems[index];
                              return ListTile(
                                title: Text(item),
                                trailing: selectedValue == item ? Icon(Icons.check, color: Colors.blue) : null,
                                onTap: () {
                                  onSelected(item);
                                  searchController.text = item;
                                  Navigator.pop(context);
                                },
                              );
                            },
                          ),
                  ),
                  SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _showCreateDialog("Création de produit", searchController, onSelected);
                    },
                    child: Text('+ Créer nouveau'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showCreateDialog(String type, TextEditingController controller, Function(String?) onSelected) {
    showDialog(
      context: context,
      builder: (context) {
        String nouveauNom = '';
        return AlertDialog(
          title: Text('Nouveau $type'),
          content: TextField(
            autofocus: true,
            decoration: InputDecoration(
              hintText: 'Nom du $type',
              border: OutlineInputBorder(),
            ),
            onChanged: (value) => nouveauNom = value,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                if (nouveauNom.isNotEmpty) {
                  onSelected(nouveauNom);
                  controller.text = nouveauNom;
                  Navigator.pop(context);
                }
              },
              child: Text('Créer'),
            ),
          ],
        );
      },
    );
  }
}