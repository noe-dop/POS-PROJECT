// product_detail_view.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';

class ProductDetailView extends StatefulWidget {
  final Product product;
  final bool isMobile;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback? onBack;

  const ProductDetailView({
    super.key,
    required this.product,
    required this.isMobile,
    required this.onEdit,
    required this.onDelete,
    this.onBack,
  });

  @override
  State<ProductDetailView> createState() => _ProductDetailViewState();
}

class _ProductDetailViewState extends State<ProductDetailView> {
  int _currentImageIndex = 0;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(widget.isMobile ? 16 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Bouton retour mobile
          if (widget.isMobile && widget.onBack != null) ...[
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: widget.onBack,
                ),
                const Text(
                  'Retour à la liste',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],

          // Carrousel d'images
          if (widget.product.imageUrl.isNotEmpty)
            _buildImageCarousel(),

          const SizedBox(height: 16),

          // En-tête
          _buildHeader(),

          const Divider(height: 32),

          // Description
          _buildSectionTitle('Description'),
          const SizedBox(height: 8),
          Text(
            widget.product.description,
            style: TextStyle(
              fontSize: widget.isMobile ? 14 : 16,
              color: Colors.grey[700],
            ),
          ),

          const SizedBox(height: 24),

          // Tarification
          _buildSectionTitle('Tarification'),
          const SizedBox(height: 12),
          _buildPriceSection(),

          const SizedBox(height: 24),

          // Inventaire
          _buildSectionTitle('Inventaire'),
          const SizedBox(height: 12),
          _buildInventorySection(),

          const SizedBox(height: 24),

          // Variantes
          _buildVariantsSection(),

          if (!widget.isMobile) const SizedBox(height: 40),
          if (!widget.isMobile)
            const Center(
              child: Text(
                '© 2025 GestPro Complet. Tous droits réservés.',
                style: TextStyle(color: Colors.grey),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildImageCarousel() {
    return Column(
      children: [
        // Image principale
        Container(
          height: widget.isMobile ? 250 : 350,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Colors.grey[200],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: widget.product.imageUrl.isNotEmpty
                ? Image.asset(
                    widget.product.imageUrl[_currentImageIndex],
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

        if (widget.product.imageUrl.length > 1) ...[
          const SizedBox(height: 12),
          // Indicateurs
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.product.imageUrl.length,
              (index) => GestureDetector(
                onTap: () => setState(() => _currentImageIndex = index),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _currentImageIndex == index
                        ? Colors.blue
                        : Colors.grey[300],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Miniatures
          SizedBox(
            height: 70,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: widget.product.imageUrl.length,
              itemBuilder: (context, index) {
                return GestureDetector(
                  onTap: () => setState(() => _currentImageIndex = index),
                  child: Container(
                    width: 70,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _currentImageIndex == index
                            ? Colors.blue
                            : Colors.transparent,
                        width: 2,
                      ),
                      image: DecorationImage(
                        image: AssetImage(widget.product.imageUrl[index]),
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

  Widget _buildHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.product.name,
                style: TextStyle(
                  fontSize: widget.isMobile ? 20 : 24,
                  fontWeight: FontWeight.bold,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                widget.product.sku,
                style: TextStyle(
                  fontSize: widget.isMobile ? 14 : 16,
                  color: Colors.grey[600],
                ),
              ),
              // Afficher le groupe et le type (à venir)
              const SizedBox(height: 8),
              // TODO: Afficher groupe/type
            ],
          ),
        ),
        if (!widget.isMobile)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.edit, color: Colors.blue),
                onPressed: widget.onEdit,
                tooltip: 'Modifier',
              ),
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.red),
                onPressed: widget.onDelete,
                tooltip: 'Supprimer',
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: widget.isMobile ? 16 : 18,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildPriceSection() {
    if (widget.isMobile) {
      return Column(
        children: [
          _buildInfoCard(
            'Prix de vente',
            '${widget.product.price.toStringAsFixed(2)} €',
            Colors.blue[50]!,
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            'Coût par article',
            '${widget.product.cost.toStringAsFixed(2)} €',
            Colors.green[50]!,
          ),
        ],
      );
    } else {
      return Row(
        children: [
          Expanded(
            child: _buildInfoCard(
              'Prix de vente',
              '${widget.product.price.toStringAsFixed(2)} €',
              Colors.blue[50]!,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildInfoCard(
              'Coût par article',
              '${widget.product.cost.toStringAsFixed(2)} €',
              Colors.green[50]!,
            ),
          ),
        ],
      );
    }
  }

  Widget _buildInventorySection() {
    if (widget.isMobile) {
      return Column(
        children: [
          _buildInfoCard(
            'Stock actuel',
            '${widget.product.stock}',
            Colors.orange[50]!,
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            'Statut',
            widget.product.status,
            widget.product.status == 'Actif' ? Colors.green[50]! : Colors.orange[50]!,
          ),
          const SizedBox(height: 12),
          _buildInfoCard(
            'Emplacement',
            widget.product.location,
            Colors.purple[50]!,
          ),
        ],
      );
    } else {
      return Row(
        children: [
          Expanded(
            child: _buildInfoCard(
              'Stock actuel',
              '${widget.product.stock}',
              Colors.orange[50]!,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildInfoCard(
              'Statut',
              widget.product.status,
              widget.product.status == 'Actif' ? Colors.green[50]! : Colors.orange[50]!,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildInfoCard(
              'Emplacement',
              widget.product.location,
              Colors.purple[50]!,
            ),
          ),
        ],
      );
    }
  }

  Widget _buildInfoCard(String title, String value, Color color) {
    return Container(
      width: widget.isMobile ? double.infinity : null,
      padding: EdgeInsets.all(widget.isMobile ? 12 : 16),
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
              fontSize: widget.isMobile ? 12 : 14,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: widget.isMobile ? 16 : 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVariantsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildSectionTitle('Variantes'),
            ElevatedButton.icon(
              onPressed: () {
                // TODO: Ouvrir formulaire d'ajout de variante
              },
              icon: Icon(Icons.add, size: widget.isMobile ? 16 : 18),
              label: Text(
                'Ajouter une variante',
                style: TextStyle(fontSize: widget.isMobile ? 12 : 14),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Tableau des variantes
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey[300]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minWidth: widget.isMobile
                    ? MediaQuery.of(context).size.width - 32
                    : 900,
              ),
              child: DataTable(
                columnSpacing: 16,
                headingRowHeight: widget.isMobile ? 40 : 48,
                dataRowMinHeight: widget.isMobile ? 40 : 48,
                columns: [
                  _buildDataColumn('Code barre'),
                  _buildDataColumn('Description'),
                  _buildDataColumn('Qté'),
                  _buildDataColumn('Prix 1'),
                  _buildDataColumn('Prix 2'),
                  _buildDataColumn('Prix comp.'),
                  _buildDataColumn('Actions'),
                ],
                rows: widget.product.variants.map((variant) {
                  return DataRow(
                    cells: [
                      DataCell(Text(variant.barcode, style: _cellStyle())),
                      DataCell(Text(variant.description, style: _cellStyle())),
                      DataCell(Text('${variant.quantity}', style: _cellStyle())),
                      DataCell(Text('${variant.salePrice1} €', style: _cellStyle())),
                      DataCell(
                        Text(
                          variant.salePrice2 != null ? '${variant.salePrice2} €' : '-',
                          style: _cellStyle(),
                        ),
                      ),
                      DataCell(
                        Text(
                          variant.comparePrice != null ? '${variant.comparePrice} €' : '-',
                          style: _cellStyle(),
                        ),
                      ),
                      DataCell(
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: Icon(Icons.edit, size: widget.isMobile ? 16 : 18),
                              onPressed: () {},
                              padding: EdgeInsets.zero,
                            ),
                            IconButton(
                              icon: Icon(
                                Icons.delete,
                                size: widget.isMobile ? 16 : 18,
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
      ],
    );
  }

  DataColumn _buildDataColumn(String label) {
    return DataColumn(
      label: Text(
        label,
        style: TextStyle(fontSize: widget.isMobile ? 12 : 14),
      ),
    );
  }

  TextStyle _cellStyle() {
    return TextStyle(fontSize: widget.isMobile ? 11 : 13);
  }
}