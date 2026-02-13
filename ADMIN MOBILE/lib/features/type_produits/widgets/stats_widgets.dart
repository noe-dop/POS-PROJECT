import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';
class StatsWidget extends StatelessWidget {
  final TypeProduit? selectedGrandType;
  final int totalProduits;

  const StatsWidget({
    super.key,
    required this.selectedGrandType,
    required this.totalProduits,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Statistiques',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (selectedGrandType != null) ...[
              _buildStatRow(
                'Total produits dans "${selectedGrandType!.nom}"',
                totalProduits.toString(),
                Colors.blue,
              ),
              const SizedBox(height: 8),
              _buildStatRow(
                'Produits directs',
                selectedGrandType!.nombreProduits.toString(),
                Colors.green,
              ),
              const SizedBox(height: 8),
              _buildStatRow(
                'Sous-types',
                selectedGrandType!.sousTypes.length.toString(),
                Colors.orange,
              ),
              const SizedBox(height: 8),
              _buildStatRow(
                'Produits par sous-types',
                _calculateProduitsSousTypes(selectedGrandType!).toString(),
                Colors.purple,
              ),
            ] else ...[
              _buildStatRow(
                'Total produits tous types',
                totalProduits.toString(),
                Colors.blue,
              ),
              const SizedBox(height: 8),
              _buildStatRow(
                'Grands types',
                '8',
                Colors.green,
              ),
              const SizedBox(height: 8),
              _buildStatRow(
                'Moyenne produits/type',
                (totalProduits / 8).toStringAsFixed(1),
                Colors.orange,
              ),
            ],
          ],
        ),
      ),
    );
  }

  int _calculateProduitsSousTypes(TypeProduit grandType) {
    return grandType.sousTypes.fold(0, (sum, st) => sum + st.nombreProduits);
  }

  Widget _buildStatRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}