// product_model.dart
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';

import 'variante_model.dart';

class Product {
  int? id;
  String name;
  String? sku;
  String status;
  int? brand;
  List<String>? imagesUrls;
  String description;
  double? price;
  double? cost;
  double? nombreItem;
  int? minStockThreshold;
  List<Variant>? variants;
  int categorieId; // ID de la catégorie principale
  int groupeId; // ID du groupe (obligatoire ?)
  int? typeId; // ID du type (optionnel)
  List<String>? searchVector;

  Product({
    this.id,
    required this.name,
    this.sku,
    this.brand,
    required this.imagesUrls,
    required this.description,
    required this.price,
    required this.cost,
    required this.nombreItem,
    this.minStockThreshold,
    required this.variants,
    required this.categorieId,
    required this.groupeId,
    this.typeId,
    this.searchVector,
    required this.status,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    List<String>? imagesList = [];
    if (json['photo'] != null && json['photo'].toString().isNotEmpty) {
      imagesList.add(json['photo'].toString());
    }
    if (json['additional_images_urls'] != null &&
        json["additional_images_urls"] is List) {
      imagesList.addAll(
        (json['additional_images_urls'] as List)
            .map((e) => e.toString())
            .where((url) => url.isNotEmpty)
            .toList(),
      );
    }
    if (json['images_urls'] != null && json["images_urls"] is List) {
      imagesList.addAll(
        (json['images_urls'] as List)
            .map((e) => e.toString())
            .where((url) => url.isNotEmpty)
            .toList(),
      );
    }
    return Product(
      id: json['id'],
      name: json['name'],
      sku: json['sku'],
      status: json['status'],
      brand: json['brand'],
      imagesUrls: imagesList,
      description: json['description'] ?? '',
      price: FormatUtils.toDouble(json["base_price"]),
      cost: FormatUtils.toDouble(json["cost_price"]),
      nombreItem: FormatUtils.toDouble(json["nombre_item"]),
      variants:
          (json['variants'] as List?)
              ?.map((v) => Variant.fromJson(v))
              .toList() ??
          [],
      categorieId: FormatUtils.toInt(json['main_category_id']) as int,
      groupeId: FormatUtils.toInt(json['group']) as int,
      typeId: FormatUtils.toInt(json['product_type']),
      // searchVector: json()
    );
  }
  

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'sku': sku,
      'status': status,
      'brand': brand,
      'image_url': imagesUrls,
      'description': description,
      'price': price,
      'cost': cost,
      'qt_item': nombreItem,
      'min_stock_threshold': minStockThreshold,
      'variants': variants?.map((v) => v.toJson()).toList(),
      'categorie_id': categorieId,
      'groupe_id': groupeId,
      'type_id': typeId,
    };
  }
}
