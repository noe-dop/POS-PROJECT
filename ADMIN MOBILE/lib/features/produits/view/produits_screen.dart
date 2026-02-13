import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/view/ajouter_produit.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({super.key});

  @override
  State<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends State<ProductsPage> {
  String _selectedStatus = 'Tous';
  Product? _selectedProduct;
  bool _showDetails = false; // Pour mobile: contrôle l'affichage des détails

  final List<Product> _products = [
    Product(
      id: '1',
      name: 'Bonnet rouge',
      sku: 'KV-R001',
      status: 'Actif',
      type: "Lait",
      brand: "FrieslandCampina",
      imageUrl: [],
      description:
          'Un ensemble de vaisselle artisanale, parfait pour les repas quotidiens ou les occasions spéciales. Chaque pièce est unique et apporte une touche d\'élégance rustique à votre table. Fabriqué à partir de céramique de haute qualité.',
      price: 49.99,
      cost: 25.00,
      stock: 150,
      location: 'Entrepôt A-12',
      variants: [
        Variant(
          barcode: '186000124558',
          description: 'Bonnet rouge sachet',
          quantity: 1,
          salePrice1: 100,
          salePrice2: 90,
          comparePrice: 125,
          imageUrl: '',
        ),
        Variant(
          barcode: '186000124999',
          description: 'Bonnet rouge sachet x11',
          quantity: 11,
          salePrice1: 1000,
          salePrice2: 950,
          comparePrice: null,
          imageUrl: '',
        ),
      ],
    ),
    Product(
      id: "2",
      name: 'Tasse à Café en Céramique',
      sku: 'TC-C002',
      type: "Machine à café",
      brand: "Nespresso",
      status: 'En rupture de',
      imageUrl: [],
      description: 'Tasse en céramique de haute qualité',
      price: 19.99,
      cost: 8.50,
      stock: 0,
      location: 'Entrepôt B-07',
      variants: [],
    ),
    // Ajoutez d'autres produits...
  ];
  
  void _ouvrirFormulaireProduit({Product? produit}) {
    final isMobile = MediaQuery.of(context).size.width < 768;
    
    if (isMobile) {
      // Mobile: Modal Bottom Sheet
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) {
          return Container(
            height: MediaQuery.of(context).size.height * 0.9,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: AjouterProduitPage(produit: produit),
          );
        },
      );
    } else {
      // Desktop: Nouvelle page
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => AjouterProduitPage(produit: produit),
          fullscreenDialog: true, // Animation slide-up
        ),
      );
    }
  }

//   // Dans votre build()
//   ElevatedButton(
//     onPressed: () => _ouvrirFormulaireProduit(),
//     child: Text('Ajouter un Produit'),
//   ),
  
//   // Pour modifier un produit
//   IconButton(
//     icon: Icon(Icons.edit),
//     onPressed: () => _ouvrirFormulaireProduit(produit: selectedProduct),
//   ),
// }

  @override
  Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.of(context).size.width < 768;
    final bool isTablet = MediaQuery.of(context).size.width < 1024;

    return Scaffold(
      appBar: AppBar(
        title: Text('Gestion des Produits'),
        centerTitle: true,
        actions: _showDetails && isMobile
            ? [
                IconButton(
                  icon: Icon(Icons.close),
                  onPressed: () {
                    setState(() {
                      _showDetails = false;
                    });
                  },
                ),
              ]
            : null,
      ),
      body: isMobile ? _buildMobileLayout() : _buildDesktopLayout(isTablet),
      floatingActionButton: isMobile && !_showDetails
          ? FloatingActionButton(
              onPressed: () {
                _ouvrirFormulaireProduit();
              },
              tooltip: 'Ajouter un produit',
              child: Icon(Icons.add),
            )
          : null,
    );
  }

  // Layout pour desktop/tablette
  Widget _buildDesktopLayout(bool isTablet) {
    return Row(
      children: [
        // Partie gauche - Liste des produits
        Expanded(
          flex: isTablet ? 3 : 2,
          child: Container(
            color: Colors.grey[50],
            padding: EdgeInsets.all(16),
            child: _buildProductListSection(),
          ),
        ),

        // Partie droite - Détails du produit
        Expanded(
          flex: isTablet ? 5 : 3,
          child: _selectedProduct != null
              ? _buildProductDetail(_selectedProduct!, false)
              : Center(
                  child: Text(
                    'Sélectionnez un produit pour voir les détails',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
        ),
      ],
    );
  }

  // Layout pour mobile
  Widget _buildMobileLayout() {
    return _showDetails
        ? _buildProductDetail(_selectedProduct!, true)
        : _buildProductListSection();
  }

  // Section liste des produits (utilisée dans les deux layouts)
  Widget _buildProductListSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Barre de recherche
        Container(
          padding: EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: TextField(
            decoration: InputDecoration(
              hintText: 'Rechercher des produits...',
              border: InputBorder.none,
              prefixIcon: Icon(Icons.search, color: Colors.grey),
              suffixIcon: Icon(Icons.filter_list, color: Colors.grey),
            ),
          ),
        ),

        SizedBox(height: 16),

        // Filtres de statut - Scroll horizontal sur mobile
        SizedBox(
          height: 40,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _buildStatusFilter('Tous'),
              SizedBox(width: 8),
              _buildStatusFilter('Actif'),
              SizedBox(width: 8),
              _buildStatusFilter('Rupture'),
            ],
          ),
        ),

        SizedBox(height: 16),

        // Bouton Ajouter un produit (caché sur mobile si FAB présent)
        if (MediaQuery.of(context).size.width >= 768)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                _ouvrirFormulaireProduit();
              },
              icon: Icon(Icons.add, size: 20),
              label: Text('Ajouter un Produit'),
              style: ElevatedButton.styleFrom(
                padding: EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

        SizedBox(height: 16),

        // Liste des produits
        Expanded(
          child: ListView.builder(
            itemCount: _products.length,
            itemBuilder: (context, index) {
              final product = _products[index];
              return _buildProductItem(product);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStatusFilter(String status) {
    return ChoiceChip(
      label: Text(status),
      selected: _selectedStatus == status,
      onSelected: (selected) {
        setState(() {
          _selectedStatus = status;
        });
      },
    );
  }

  Widget _buildProductItem(Product product) {
    final bool isMobile = MediaQuery.of(context).size.width < 768;

    return Card(
      margin: EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: product.imageUrl.isNotEmpty
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(product.imageUrl[0], fit: BoxFit.cover),
                )
              : Icon(Icons.shopping_bag, color: Colors.grey[600]),
        ),
        title: Text(
          product.name,
          style: TextStyle(fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: product.status == 'Actif'
                        ? Colors.green[50]
                        : Colors.orange[50],
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: product.status == 'Actif'
                          ? Colors.green
                          : Colors.orange,
                    ),
                  ),
                  child: Text(
                    product.status,
                    style: TextStyle(
                      color: product.status == 'Actif'
                          ? Colors.green
                          : Colors.orange,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 4),
            Text(
              product.sku,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: Icon(
          isMobile ? Icons.chevron_right : Icons.chevron_right,
          color: Colors.grey,
        ),
        onTap: () {
          setState(() {
            _selectedProduct = product;
            if (isMobile) {
              _showDetails = true;
            }
          });
        },
        selected: _selectedProduct?.sku == product.sku,
        selectedTileColor: Colors.blue[50],
      ),
    );
  }

  Widget _buildProductDetail(Product product, bool isMobile) {
    return StatefulBuilder(
      builder: (context, setStateDetail) {
        int currentImageIndex = 0;

        return SingleChildScrollView(
          padding: EdgeInsets.all(isMobile ? 16 : 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Bouton retour sur mobile
              if (isMobile) ...[
                Row(
                  children: [
                    IconButton(
                      icon: Icon(Icons.arrow_back),
                      onPressed: () {
                        setState(() {
                          _showDetails = false;
                        });
                      },
                    ),
                    Text(
                      'Retour à la liste',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                SizedBox(height: 8),
              ],

              // Carrousel d'images
              if (product.imageUrl.isNotEmpty)
                _buildImageCarousel(
                  product,
                  currentImageIndex,
                  setStateDetail,
                  isMobile,
                ),

              SizedBox(height: 16),

              // En-tête avec nom, SKU et boutons d'action
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Nom et SKU
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: TextStyle(
                            fontSize: isMobile ? 20 : 24,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: 4),
                        Text(
                          product.sku,
                          style: TextStyle(
                            fontSize: isMobile ? 14 : 16,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Boutons d'action (desktop uniquement)
                  if (!isMobile)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(Icons.edit, color: Colors.blue),
                          onPressed: () {
                            _ouvrirFormulaireProduit(produit: product);
                          },
                          tooltip: 'Modifier',
                        ),
                        IconButton(
                          icon: Icon(Icons.delete, color: Colors.red),
                          onPressed: () {
                            // Action supprimer
                          },
                          tooltip: 'Supprimer',
                        ),
                        IconButton(
                          icon: Icon(Icons.more_vert),
                          onPressed: () {
                            // Menu d'actions supplémentaires
                          },
                        ),
                      ],
                    ),
                ],
              ),

              // Boutons d'action en bas sur mobile
              if (isMobile) ...[
                SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        _ouvrirFormulaireProduit(produit: product);
                      },
                      icon: Icon(Icons.edit, size: 18),
                      label: Text('Modifier'),
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        // Action supprimer
                      },
                      icon: Icon(Icons.delete, size: 18),
                      label: Text('Supprimer'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[50],
                        foregroundColor: Colors.red,
                      ),
                    ),
                  ],
                ),
              ],

              Divider(height: 32),

              // Description
              Text(
                'Description',
                style: TextStyle(
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 8),
              Text(
                product.description,
                style: TextStyle(
                  fontSize: isMobile ? 14 : 16,
                  color: Colors.grey[700],
                ),
              ),

              SizedBox(height: isMobile ? 20 : 24),

              // Tarification
              Text(
                'Tarification',
                style: TextStyle(
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 12),
              isMobile
                  ? Column(
                      children: [
                        _buildInfoCard(
                          'Prix de vente',
                          '${product.price.toStringAsFixed(2)} €',
                          Colors.blue[50]!,
                          isMobile,
                        ),
                        SizedBox(height: 12),
                        _buildInfoCard(
                          'Coût par article',
                          '${product.cost.toStringAsFixed(2)} €',
                          Colors.green[50]!,
                          isMobile,
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: _buildInfoCard(
                            'Prix de vente',
                            '${product.price.toStringAsFixed(2)} €',
                            Colors.blue[50]!,
                            isMobile,
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoCard(
                            'Coût par article',
                            '${product.cost.toStringAsFixed(2)} €',
                            Colors.green[50]!,
                            isMobile,
                          ),
                        ),
                      ],
                    ),

              SizedBox(height: isMobile ? 20 : 24),

              // Inventaire
              Text(
                'Inventaire',
                style: TextStyle(
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 12),
              isMobile
                  ? Column(
                      children: [
                        _buildInfoCard(
                          'Stock actuel',
                          '${product.stock}',
                          Colors.orange[50]!,
                          isMobile,
                        ),
                        SizedBox(height: 12),
                        _buildInfoCard(
                          'Statut',
                          product.status,
                          product.status == 'Actif'
                              ? Colors.green[50]!
                              : Colors.orange[50]!,
                          isMobile,
                        ),
                        SizedBox(height: 12),
                        _buildInfoCard(
                          'Emplacement',
                          product.location,
                          Colors.purple[50]!,
                          isMobile,
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: _buildInfoCard(
                            'Stock actuel',
                            '${product.stock}',
                            Colors.orange[50]!,
                            isMobile,
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoCard(
                            'Statut',
                            product.status,
                            product.status == 'Actif'
                                ? Colors.green[50]!
                                : Colors.orange[50]!,
                            isMobile,
                          ),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: _buildInfoCard(
                            'Emplacement',
                            product.location,
                            Colors.purple[50]!,
                            isMobile,
                          ),
                        ),
                      ],
                    ),

              SizedBox(height: isMobile ? 20 : 24),

              // Variantes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Variantes',
                    style: TextStyle(
                      fontSize: isMobile ? 16 : 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () {
                      // Ajouter une variante
                    },
                    icon: Icon(Icons.add, size: isMobile ? 16 : 18),
                    label: Text(
                      'Ajouter une variante',
                      style: TextStyle(fontSize: isMobile ? 12 : 14),
                    ),
                  ),
                ],
              ),
              SizedBox(height: 12),

              // Tableau des variantes - Scroll horizontal sur mobile
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minWidth: isMobile
                          ? MediaQuery.of(context).size.width - 32
                          : 900,
                    ),
                    child: DataTable(
                      columnSpacing: 16,
                      headingRowHeight: isMobile ? 40 : 48,
                      dataRowMinHeight: isMobile ? 40 : 48,
                      columns: [
                        DataColumn(
                          label: Text(
                            'Code barre',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Description',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Qté',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Prix 1',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Prix 2',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Prix comp.',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                        DataColumn(
                          label: Text(
                            'Actions',
                            style: TextStyle(fontSize: isMobile ? 12 : 14),
                          ),
                        ),
                      ],
                      rows: product.variants.map((variant) {
                        return DataRow(
                          cells: [
                            DataCell(
                              Text(
                                variant.barcode,
                                style: TextStyle(fontSize: isMobile ? 11 : 13),
                              ),
                            ),
                            DataCell(
                              Text(
                                variant.description,
                                style: TextStyle(fontSize: isMobile ? 11 : 13),
                              ),
                            ),
                            DataCell(
                              Text(
                                '${variant.quantity}',
                                style: TextStyle(fontSize: isMobile ? 11 : 13),
                              ),
                            ),
                            DataCell(
                              Text(
                                '${variant.salePrice1} €',
                                style: TextStyle(fontSize: isMobile ? 11 : 13),
                              ),
                            ),
                            DataCell(
                              Text(
                                variant.salePrice2 != null
                                    ? '${variant.salePrice2} €'
                                    : '-',
                                style: TextStyle(fontSize: isMobile ? 11 : 13),
                              ),
                            ),
                            DataCell(
                              Text(
                                variant.comparePrice != null
                                    ? '${variant.comparePrice} €'
                                    : '-',
                                style: TextStyle(fontSize: isMobile ? 11 : 13),
                              ),
                            ),
                            DataCell(
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      Icons.edit,
                                      size: isMobile ? 16 : 18,
                                    ),
                                    onPressed: () {},
                                    padding: EdgeInsets.zero,
                                  ),
                                  IconButton(
                                    icon: Icon(
                                      Icons.delete,
                                      size: isMobile ? 16 : 18,
                                      color: Colors.red,
                                    ),
                                    onPressed: () {},
                                    padding: EdgeInsets.zero,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ),

              if (!isMobile) SizedBox(height: 40),

              // Footer (uniquement sur desktop)
              if (!isMobile)
                Center(
                  child: Text(
                    '© 2025 GestPro Complet. Tous droits réservés.',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildImageCarousel(
    Product product,
    int currentIndex,
    Function(void Function()) setStateDetail,
    bool isMobile,
  ) {
    return Column(
      children: [
        // Image principale
        Container(
          height: isMobile ? 250 : 350,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Colors.grey[200],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: product.imageUrl.isNotEmpty
                ? Image.asset(
                    product.imageUrl[currentIndex],
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Center(
                        child: Icon(
                          Icons.photo,
                          size: 80,
                          color: Colors.grey[400],
                        ),
                      );
                    },
                  )
                : Center(
                    child: Icon(Icons.photo, size: 80, color: Colors.grey[400]),
                  ),
          ),
        ),

        if (product.imageUrl.length > 1) ...[
          SizedBox(height: 12),

          // Indicateurs
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              product.imageUrl.length,
              (index) => GestureDetector(
                onTap: () {
                  setStateDetail(() {
                    currentIndex = index;
                  });
                },
                child: Container(
                  margin: EdgeInsets.symmetric(horizontal: 4),
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: currentIndex == index
                        ? Colors.blue
                        : Colors.grey[300],
                  ),
                ),
              ),
            ),
          ),

          SizedBox(height: 12),

          // Miniatures
          SizedBox(
            height: 70,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: product.imageUrl.length,
              itemBuilder: (context, index) {
                return GestureDetector(
                  onTap: () {
                    setStateDetail(() {
                      currentIndex = index;
                    });
                  },
                  child: Container(
                    width: 70,
                    margin: EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: currentIndex == index
                            ? Colors.blue
                            : Colors.transparent,
                        width: 2,
                      ),
                      image: DecorationImage(
                        image: AssetImage(product.imageUrl[index]),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildInfoCard(
    String title,
    String value,
    Color color,
    bool isMobile,
  ) {
    return Container(
      width: isMobile ? double.infinity : null,
      padding: EdgeInsets.all(isMobile ? 12 : 16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: isMobile ? 12 : 14,
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: isMobile ? 16 : 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
