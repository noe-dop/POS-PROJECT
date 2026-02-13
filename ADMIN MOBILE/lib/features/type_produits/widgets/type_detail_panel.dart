import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class TypeDetailPanel extends StatelessWidget {
  final TypeProduit? selectedType;
  final TypeProduit? selectedGrandType;
  final Function(TypeProduit) onAddSousType;
  final Function(TypeProduit) onEditType;
  final Function(TypeProduit) onDeleteType;

  const TypeDetailPanel({
    super.key,
    required this.selectedType,
    required this.selectedGrandType,
    required this.onAddSousType,
    required this.onEditType,
    required this.onDeleteType,
  });

  @override
  Widget build(BuildContext context) {
    final type = selectedType ?? selectedGrandType;
    final isMobile = MediaQuery.of(context).size.width < 768;

    return Container(
      padding: isMobile 
          ? const EdgeInsets.all(16) 
          : const EdgeInsets.all(24),
      color: Colors.white,
      child: type == null
          ? _buildEmptyState(isMobile)
          : _buildDetailContent(type, isMobile, context),
    );
  }

  Widget _buildEmptyState(bool isMobile) {
    return Center(
      child: Padding(
        padding: isMobile 
            ? const EdgeInsets.all(16) 
            : const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.category_outlined,
              size: isMobile ? 60 : 80,
              color: Colors.grey.shade300,
            ),
            SizedBox(height: isMobile ? 16 : 24),
            Text(
              'Aucun type sélectionné',
              style: TextStyle(
                fontSize: isMobile ? 18 : 20,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: isMobile ? 8 : 12),
            Text(
              isMobile 
                  ? 'Sélectionnez un type dans la liste'
                  : 'Sélectionnez un type dans la liste de gauche\npour voir ses détails et le gérer.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: isMobile ? 14 : 16,
                color: Colors.grey.shade500,
              ),
            ),
            if (!isMobile) ...[
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.info_outline,
                      size: 40,
                      color: Colors.blue,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Conseil',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Les grands types permettent d\'organiser vos produits en catégories principales.\nAjoutez des sous-types pour une organisation plus détaillée.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailContent(TypeProduit type, bool isMobile, BuildContext context) {
    final isGrandType = type.isGrandType;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête avec titre et actions
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Icône
              Container(
                width: isMobile ? 50 : 60,
                height: isMobile ? 50 : 60,
                decoration: BoxDecoration(
                  color: _getColorFromName(type.nom),
                  borderRadius: BorderRadius.circular(isMobile ? 10 : 12),
                ),
                child: Center(
                  child: Text(
                    type.nom.substring(0, 1).toUpperCase(),
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: isMobile ? 20 : 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              SizedBox(width: isMobile ? 12 : 16),

              // Titre et infos
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            type.nom,
                            style: TextStyle(
                              fontSize: isMobile ? 20 : 24,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        if (isMobile)
                          PopupMenuButton<String>(
                            icon: const Icon(Icons.more_vert),
                            itemBuilder: (context) => [
                              PopupMenuItem(
                                value: 'edit',
                                child: Row(
                                  children: [
                                    const Icon(Icons.edit, color: Colors.blue),
                                    const SizedBox(width: 8),
                                    const Text('Modifier'),
                                  ],
                                ),
                              ),
                              PopupMenuItem(
                                value: 'delete',
                                child: Row(
                                  children: [
                                    const Icon(Icons.delete, color: Colors.red),
                                    const SizedBox(width: 8),
                                    const Text('Supprimer'),
                                  ],
                                ),
                              ),
                              if (isGrandType)
                                PopupMenuItem(
                                  value: 'add_sous',
                                  child: Row(
                                    children: [
                                      const Icon(Icons.add, color: Colors.green),
                                      const SizedBox(width: 8),
                                      const Text('Ajouter sous-type'),
                                    ],
                                  ),
                                ),
                            ],
                            onSelected: (value) {
                              switch (value) {
                                case 'edit':
                                  onEditType(type);
                                  break;
                                case 'delete':
                                  onDeleteType(type);
                                  break;
                                case 'add_sous':
                                  onAddSousType(type);
                                  break;
                              }
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      isMobile ? '${type.nombreProduits} produits' : 'ID: ${type.id}',
                      style: TextStyle(
                        fontSize: isMobile ? 12 : 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    if (!isMobile) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Créé le: ${_formatDate(type.dateCreation)}',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Boutons d'action (desktop seulement)
              if (!isMobile)
                Column(
                  children: [
                    IconButton(
                      onPressed: () => onEditType(type),
                      icon: const Icon(Icons.edit),
                      tooltip: 'Modifier',
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.blue.shade50,
                      ),
                    ),
                    const SizedBox(height: 8),
                    IconButton(
                      onPressed: () => onDeleteType(type),
                      icon: const Icon(Icons.delete),
                      tooltip: 'Supprimer',
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.red.shade50,
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // Badge (mobile)
          if (isMobile) ...[
            const SizedBox(height: 8),
            Chip(
              label: Text(
                isGrandType ? 'Grand Type' : 'Sous-Type',
                style: TextStyle(
                  fontSize: 12,
                  color: isGrandType ? Colors.blue.shade800 : Colors.green.shade800,
                  fontWeight: FontWeight.bold,
                ),
              ),
              backgroundColor: isGrandType 
                  ? Colors.blue.shade100 
                  : Colors.green.shade100,
            ),
          ],

          SizedBox(height: isMobile ? 16 : 32),

          // Cartes de statistiques
          isMobile
              ? _buildMobileStats(type)
              : _buildDesktopStats(type),

          SizedBox(height: isMobile ? 16 : 32),

          // Section Sous-types (si grand type)
          if (isGrandType && type.hasSousTypes) ...[
            _buildSousTypesSection(type, isMobile),
            SizedBox(height: isMobile ? 16 : 32),
          ],

          // Boutons d'action (desktop) / Bouton unique (mobile)
          if (isMobile) ...[
            if (isGrandType)
              ElevatedButton.icon(
                onPressed: () => onAddSousType(type),
                icon: const Icon(Icons.add),
                label: const Text('Ajouter Sous-Type'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: Colors.green,
                ),
              ),
            if (isGrandType) const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => onEditType(type),
              icon: const Icon(Icons.edit),
              label: const Text('Modifier'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ] else ...[
            Row(
              children: [
                if (isGrandType)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => onAddSousType(type),
                      icon: const Icon(Icons.add),
                      label: const Text('Ajouter un Sous-Type'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        backgroundColor: Colors.green,
                      ),
                    ),
                  ),
                if (isGrandType) const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => onEditType(type),
                    icon: const Icon(Icons.edit),
                    label: const Text('Modifier les Informations'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDesktopStats(TypeProduit type) {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            icon: Icons.shopping_bag,
            label: 'Produits',
            value: type.nombreProduits.toString(),
            color: Colors.blue,
            isMobile: false,
          ),
        ),
        const SizedBox(width: 16),
        if (type.isGrandType)
          Expanded(
            child: _buildStatCard(
              icon: Icons.subdirectory_arrow_right,
              label: 'Sous-types',
              value: type.sousTypes.length.toString(),
              color: Colors.green,
              isMobile: false,
            ),
          ),
      ],
    );
  }

  Widget _buildMobileStats(TypeProduit type) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        Column(
          children: [
            Text(
              type.nombreProduits.toString(),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
            Text(
              'Produits',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
        if (type.isGrandType) ...[
          Container(
            width: 1,
            height: 30,
            color: Colors.grey.shade300,
          ),
          Column(
            children: [
              Text(
                type.sousTypes.length.toString(),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
              Text(
                'Sous-types',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildSousTypesSection(TypeProduit grandType, bool isMobile) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.list, color: Colors.blue),
            const SizedBox(width: 8),
            const Text(
              'Sous-Types',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Chip(
              label: Text('${grandType.sousTypes.length}'),
              backgroundColor: Colors.blue.shade100,
            ),
          ],
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: isMobile ? 2 : 3,
            crossAxisSpacing: isMobile ? 8 : 12,
            mainAxisSpacing: isMobile ? 8 : 12,
            childAspectRatio: isMobile ? 2.5 : 3,
          ),
          itemCount: grandType.sousTypes.length,
          itemBuilder: (context, index) {
            final sousType = grandType.sousTypes[index];
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.green.shade100,
                  radius: isMobile ? 16 : 20,
                  child: Text(
                    sousType.nom.substring(0, 1),
                    style: TextStyle(
                      color: Colors.green.shade800,
                      fontSize: isMobile ? 14 : 16,
                    ),
                  ),
                ),
                title: Text(
                  sousType.nom,
                  style: TextStyle(fontSize: isMobile ? 12 : 14),
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  '${sousType.nombreProduits} produits',
                  style: TextStyle(
                    fontSize: isMobile ? 10 : 12, 
                    color: Colors.grey.shade600,
                  ),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.more_vert, size: 20),
                  onPressed: () => _showSousTypeMenu(context, sousType, isMobile),
                ),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: isMobile ? 4 : 8,
                  vertical: isMobile ? 0 : 4,
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
    required bool isMobile,
  }) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: isMobile ? const EdgeInsets.all(12) : const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: isMobile ? 12 : 14,
                      color: Colors.grey.shade600,
                    ),
                  ),
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: isMobile ? 18 : 20,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSousTypeMenu(BuildContext context, TypeProduit sousType, bool isMobile) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isMobile)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    sousType.nom,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ListTile(
                leading: const Icon(Icons.edit, color: Colors.blue),
                title: const Text('Modifier'),
                onTap: () {
                  Navigator.pop(context);
                  onEditType(sousType);
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text('Supprimer'),
                onTap: () {
                  Navigator.pop(context);
                  onDeleteType(sousType);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Color _getColorFromName(String name) {
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.indigo,
    ];
    final index = name.length % colors.length;
    return colors[index];
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} à ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}