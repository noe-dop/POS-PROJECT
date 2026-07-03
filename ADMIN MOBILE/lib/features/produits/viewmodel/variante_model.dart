// variante_model.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';

class Variant {
  // Champs de ProductVariant (variante globale)
  int? id;
  String barcode;
  String name;
  double quantity; // quantité globale
  double salePrice1; // prix vente 1 global
  String? imageUrl; // photo globale

  // Champs de StoreProductVariant (spécifiques boutique)
  int? storeVariantId; // id de StoreProductVariant
  int? storeProductId; // id de StoreProduct (liaison produit-boutique)
  double? storeVariantPrice; // prix spécifique boutique
  double? storeOnlinePrice; // prix en ligne spécifique boutique
  double? storeVariantCost; // coût spécifique boutique
  double? prixReduction; // prix réduit (promotion)
  double storeQuantity; // quantité boutique
  double? weight; // poids
  bool selection; // sélectionnée
  String status; // statut (draft/active/archived)
  bool isActive; // active en boutique
  DateTime? createdAt; // date création liaison
  DateTime? updatedAt; // date modification liaison

  Variant({
    this.id,
    required this.barcode,
    required this.name,
    required this.quantity,
    required this.salePrice1,
    this.imageUrl,
    this.storeProductId,
    this.storeVariantId,
    this.storeVariantPrice,
    this.storeOnlinePrice,
    this.storeVariantCost,
    this.prixReduction,
    this.storeQuantity = 0,
    this.weight,
    this.selection = false,
    this.status = 'active',
    this.isActive = true,
    this.createdAt,
    this.updatedAt,
  });

  factory Variant.fromJson(Map<String, dynamic> json) {
    return Variant(
      // Champs globaux (ProductVariant)
      id: json['id'],
      barcode: json['barcode'] ?? '',
      name: json['name'] ?? '',
      quantity: FormatUtils.toDouble(json['quantity']) ?? 0,
      salePrice1: FormatUtils.toDouble(json['sale_price_1']) ?? 0,
      imageUrl: FormatUtils.formatImageUrl(json['photo']),

      // Champs boutique (StoreProductVariant)
      storeVariantId: json['store_variant_id'],
      storeProductId: json['store_product_id'],
      storeVariantPrice: FormatUtils.toDouble(json['store_variant_price']),
      storeVariantCost: FormatUtils.toDouble(json['store_variant_cost']),
      storeOnlinePrice: FormatUtils.toDouble(json['store_online_price']),
      prixReduction: FormatUtils.toDouble(json['prix_reduction']),
      storeQuantity:
          FormatUtils.toDouble(json['store_quantity']) ??
          FormatUtils.toDouble(json['quantity']) ??
          0,
      weight: FormatUtils.toDouble(json['weight']),
      selection: json['selection'] ?? false,
      status: json['status'] ?? 'active',
      isActive: json['is_active'] ?? true,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'barcode': barcode,
      'name': name,
      'quantity': quantity,
      'sale_price_1': salePrice1,
      'photo': imageUrl,
    };
  }

  // ========== GETTERS UTILES ==========

  // /// ID de la liaison boutique (pour les updates)
  // int? get storeVariantId => storeVariantId;

  /// Prix effectif (prix boutique ou prix global)
  double get effectivePrice {
    if (storeVariantPrice != null) return storeVariantPrice!;
    return salePrice1;
  }

  /// Prix final (avec promotion si applicable)
  double get finalPrice {
    if (prixReduction != null && prixReduction! < effectivePrice) {
      return prixReduction!;
    }
    return effectivePrice;
  }

  /// Quantité effective (quantité boutique ou quantité globale)
  double get effectiveQuantity {
    if (storeQuantity > 0) return storeQuantity;
    return quantity;
  }

  /// Vérifie si la variante est liée à une boutique
  bool get isLinkedToStore => storeVariantId != null;

  /// Vérifie si la variante est active en boutique
  bool get isActiveInStore => isActive && status == 'active';

  /// Vérifie si une promotion est active
  bool get isPromotionActive {
    if (prixReduction == null) return false;
    return prixReduction! < effectivePrice;
  }

  /// Prix barré (si promotion)
  double? get crossedOutPrice {
    return isPromotionActive ? effectivePrice : null;
  }

  /// Prix à afficher (avec ou sans promotion)
  String get displayPrice {
    if (isPromotionActive) {
      return '${finalPrice.toStringAsFixed(0)} FCFA';
    }
    return '${effectivePrice.toStringAsFixed(0)} FCFA';
  }

  /// Texte du prix avec promotion
  Widget get priceWidget {
    if (isPromotionActive) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${effectivePrice.toStringAsFixed(0)} FCFA',
            style: const TextStyle(
              decoration: TextDecoration.lineThrough,
              color: Colors.grey,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            '${finalPrice.toStringAsFixed(0)} FCFA',
            style: const TextStyle(
              color: Colors.red,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      );
    }
    return Text('${effectivePrice.toStringAsFixed(0)} FCFA');
  }

  /// Vérifie si l'image existe
  bool get hasValidImage => imageUrl != null && imageUrl!.isNotEmpty;

  /// Statut du stock
  String get stockStatus {
    if (effectiveQuantity <= 0) return 'Rupture';
    if (effectiveQuantity < 10) return 'Stock faible';
    return 'En stock';
  }

  /// Couleur du statut stock
  Color get stockStatusColor {
    if (effectiveQuantity <= 0) return Colors.red;
    if (effectiveQuantity < 10) return Colors.orange;
    return Colors.green;
  }

  /// Vérifie si le stock est disponible
  bool get isInStock => effectiveQuantity > 0;

  /// Icône du statut
  IconData get statusIcon {
    if (!isActiveInStore) return Icons.cancel;
    if (!isInStock) return Icons.warning;
    return Icons.check_circle;
  }

  /// Couleur du statut
  Color get statusColor {
    if (!isActiveInStore) return Colors.red;
    if (!isInStock) return Colors.orange;
    return Colors.green;
  }

  // ========== MÉTHODES ==========

  /// Crée une copie avec des valeurs modifiées
  Variant copyWith({
    int? id,
    String? barcode,
    String? name,
    double? quantity,
    double? salePrice1,
    String? imageUrl,
    int? storeVariantId,
    double? storeVariantPrice,
    double? storeVariantCost,
    double? prixReduction,
    double? storeQuantity,
    double? weight,
    bool? selection,
    String? status,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Variant(
      id: id ?? this.id,
      barcode: barcode ?? this.barcode,
      name: name ?? this.name,
      quantity: quantity ?? this.quantity,
      salePrice1: salePrice1 ?? this.salePrice1,
      imageUrl: imageUrl ?? this.imageUrl,
      storeVariantId: storeVariantId ?? this.storeVariantId,
      storeVariantPrice: storeVariantPrice ?? this.storeVariantPrice,
      storeVariantCost: storeVariantCost ?? this.storeVariantCost,
      prixReduction: prixReduction ?? this.prixReduction,
      storeQuantity: storeQuantity ?? this.storeQuantity,
      weight: weight ?? this.weight,
      selection: selection ?? this.selection,
      status: status ?? this.status,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
