import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class TypeItemWidget extends StatelessWidget {
  final TypeProduit type;
  final bool isSelected;
  final VoidCallback onTap;
  final bool isCompact;

  const TypeItemWidget({
    super.key,
    required this.type,
    required this.isSelected,
    required this.onTap,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isCompact) {
      return _buildCompactItem();
    }
    return _buildDefaultItem();
  }

  Widget _buildCompactItem() {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: isSelected ? Colors.blue.shade50 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: isSelected ? Colors.blue : Colors.grey.shade200,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: ListTile(
        dense: true,
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: _getColorFromName(type.nom),
          radius: 16,
          child: Text(
            type.nom.substring(0, 1).toUpperCase(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          type.nom,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: Text(
          '${type.nombreProduits} produits',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade600,
          ),
        ),
        trailing: Chip(
                label: type.isGrandType && type.hasSousTypes
            ?  Text('${type.sousTypes.length}') : Text('0'),
                backgroundColor: Colors.blue.shade100,
                labelStyle: TextStyle(
                  fontSize: 10,
                  color: Colors.blue.shade800,
                ),
              )
            
      ),
    );
  }

  Widget _buildDefaultItem() {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isSelected ? 4 : 1,
      color: isSelected ? Colors.blue.shade50 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? Colors.blue : Colors.grey.shade200,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            color: _getColorFromName(type.nom),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              type.nom.substring(0, 1).toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        title: Row(
          children: [
            Text(
              type.nom,
              style: TextStyle(
                fontSize: 16,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
              ),
            ),
            if (type.isSousType) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Sous-type',
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.green.shade800,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
            if (type.isGrandType && type.hasSousTypes) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.blue.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.subdirectory_arrow_right, size: 12),
                    const SizedBox(width: 2),
                    Text(
                      '${type.sousTypes.length}',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.blue.shade800,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${type.nombreProduits} produits',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade600,
              ),
            ),
            if (type.isGrandType && type.hasSousTypes)
              Text(
                '${type.sousTypes.length} sous-types',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.orange.shade600,
                ),
              ),
          ],
        ),
      ),
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
}