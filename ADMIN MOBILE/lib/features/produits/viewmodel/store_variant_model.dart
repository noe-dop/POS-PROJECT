import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class StoreVariant {
  final int id;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String storeProductName;
  final String variantName;
  final double effectiveCost;
  final double effectivePrice;
  final double finalPrice;
  final double? storeVariantCost;
  final double? storeVariantPrice;
  final double? prixReduction;
  final double quantity;
  final double? weight;
  final bool selection;
  final String status;
  final bool isActive;
  final int storeProductId;
  final int variantId;
  
  // Données de la variante (optionnel, pour avoir accès aux infos)
  Variant? variant;

  StoreVariant({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    required this.storeProductName,
    required this.variantName,
    required this.effectiveCost,
    required this.effectivePrice,
    required this.finalPrice,
    this.storeVariantCost,
    this.storeVariantPrice,
    this.prixReduction,
    required this.quantity,
    this.weight,
    required this.selection,
    required this.status,
    required this.isActive,
    required this.storeProductId,
    required this.variantId,
    this.variant,
  });

  factory StoreVariant.fromJson(Map<String, dynamic> json) {
    return StoreVariant(
      id: json['id'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      storeProductName: json['store_product_name'] ?? '',
      variantName: json['variant_name'] ?? '',
      effectiveCost: FormatUtils.toDouble(json['effective_cost']) ?? 0.0,
      effectivePrice: FormatUtils.toDouble(json['effective_price']) ?? 0.0,
      finalPrice: FormatUtils.toDouble(json['final_price']) ?? 0.0,
      storeVariantCost: FormatUtils.toDouble(json['store_variant_cost']),
      storeVariantPrice: FormatUtils.toDouble(json['store_variant_price']),
      prixReduction: FormatUtils.toDouble(json['prix_reduction']),
      quantity: FormatUtils.toDouble(json['quantity']) ?? 0.0,
      weight: FormatUtils.toDouble(json['weight']),
      selection: json['selection'] ?? false,
      status: json['status'] ?? 'active',
      isActive: json['is_active'],
      storeProductId: json['store_product'] ?? 0,
      variantId: json['variant'] ?? 0,
    );
  }

  /// Vérifie si c'est une promotion
  bool get isPromotionActive {
    return prixReduction != null && prixReduction! < effectivePrice;
  }

  /// Retourne le prix à afficher
  double get displayPrice {
    return isPromotionActive ? prixReduction! : effectivePrice;
  }

  /// Retourne le prix barré (si promotion)
  double? get crossedOutPrice {
    return isPromotionActive ? effectivePrice : null;
  }

  /// Vérifie si le stock est disponible
  bool get isInStock => quantity > 0;

  /// Retourne le statut du stock en texte
  String get stockStatus {
    if (quantity <= 0) return 'Rupture';
    if (quantity < 10) return 'Stock faible';
    return 'En stock';
  }

  /// Couleur du statut
  Color get stockStatusColor {
    if (quantity <= 0) return Colors.red;
    if (quantity < 10) return Colors.orange;
    return Colors.green;
  }
}