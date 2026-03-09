import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class StoreProduct {
  final int id;
  final int productId;
  final int storeId;
  final String name;
  final String sku;
  final String description;
  final int? brandId;
  final String brandName;
  final List<String> imagesUrls;
  final int? groupId;
  final int? productTypeId;
  final int? mainCategoryId;
  final double quantityItem;
  final double? price;        // store_base_price
  final double? cost;         // store_cost_price
  final StockDetails? stockDetails; // à définir
  final String? location;
  final int? seuilAlerte;
  final List<Variant> variants; // variantes globales
  final String status;

  StoreProduct({
    required this.id,
    required this.productId,
    required this.storeId,
    required this.name,
    required this.sku,
    required this.description,
    this.brandId,
    required this.brandName,
    required this.imagesUrls,
    this.groupId,
    this.productTypeId,
    this.mainCategoryId,
    required this.quantityItem,
    this.price,
    this.cost,
    this.stockDetails,
    this.location,
    this.seuilAlerte,
    required this.variants,
    required this.status,
  });

  factory StoreProduct.fromJson(Map<String, dynamic> json) {
    return StoreProduct(
      id: json['id'],
      productId: json['product_id'],
      storeId: json['store_id'],
      name: json['name'] ?? '',
      sku: json['sku'] ?? '',
      description: json['description'] ?? '',
      brandId: json['brand'],
      brandName: json['brand_name'] ?? '',
      imagesUrls: (json['images_urls'] as List?)?.cast<String>() ?? [],
      groupId: json['group'],
      productTypeId: json['product_type'],
      mainCategoryId: json['main_category_id'],
      quantityItem: (json['quantity_item'] as num?)?.toDouble() ?? 1.0,
      price: (json['price'] as num?)?.toDouble(),
      cost: (json['cost'] as num?)?.toDouble(),
      stockDetails: json['stock_details'] != null ? StockDetails.fromJson(json['stock_details']) : null,
      location: json['location'],
      seuilAlerte: json['seuil_alerte'],
      variants: (json['variants'] as List?)?.map((v) => Variant.fromJson(v)).toList() ?? [],
      status: json['status'] ?? 'active',
    );
  }
}

// Modèle pour les détails du stock (optionnel)
class StockDetails {
  final int quantityOnHand;
  final int quantityReserved;
  final int quantityAvailable;
  final String stockStatus;
  // ... autres champs

  StockDetails({required this.quantityOnHand, required this.quantityReserved, required this.quantityAvailable, required this.stockStatus});

  factory StockDetails.fromJson(Map<String, dynamic> json) {
    return StockDetails(
      quantityOnHand: json['quantity_on_hand'] ?? 0,
      quantityReserved: json['quantity_reserved'] ?? 0,
      quantityAvailable: json['quantity_available'] ?? 0,
      stockStatus: json['stock_status'] ?? 'unknown',
    );
  }
}