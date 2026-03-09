// product_model.dart
import 'variante_model.dart';

class Product {
  int? id;
  String name;
  String? sku;
  String status;
  int? brand;
  List<String>? imageUrl;
  String description;
  double? price;
  double? cost;
  int? nombreItem;
  int? stock;
  String? location;
  List<Variant>? variants;
  int categorieId; // ID de la catégorie principale
  int groupeId; // ID du groupe (obligatoire ?)
  int? typeId; // ID du type (optionnel)
  int storeId;
  List<String>? searchVector;

  Product({
    this.id,
    required this.name,
    this.sku,
    required this.status,
    required this.brand,
    required this.imageUrl,
    required this.description,
    required this.price,
    required this.cost,
    required this.nombreItem,
    this.stock,
    this.location,
    required this.variants,
    required this.categorieId,
    required this.groupeId,
    this.typeId,
    required this.storeId,
    this.searchVector,
  });

  factory Product.fromJson(Map<String, dynamic> json,int? storeId) {
    List<String>? imagesList = [];
    if (json['photo'] != null && json['photo'].toString().isNotEmpty) {
      imagesList.add(json['photo'].toString());
    }
    if (json['additional_images_urls'] is List) {
      imagesList.addAll(
        (json['additional_images_urls'] as List)
            .map((e) => e.toString())
            .where((url) => url.isNotEmpty)
            .toList(),
      );
    }
    if (json['images_urls'] is List) {
      imagesList.addAll(
        (json['images_urls'] as List)
            .map((e) => e.toString())
            .where((url) => url.isNotEmpty)
            .toList(),
      );
    }
    for (var  element in json.values) {
      print(element);
      print(element.runtimeType);
    }
    return Product(
      id: json['id'],
      name: json['name'] ?? '',
      sku: json['sku'] ?? '',
      status: json['status'] ?? '',
      brand: json['brand'],
      imageUrl: imagesList,
      description: json['description'] ?? '',
      price: double.tryParse(json['base_price'].toString()) ?? 0.0,
      cost: double.tryParse(json['cost_price'].toString()) ?? 0.0,
      nombreItem: json["nombre_item"] ?? 0,
      stock: json['stock'] ?? 0,
      location: json['location'] ?? '',
      variants:
          (json['variants'] as List?)
              ?.map((v) => Variant.fromJson(v))
              .toList() ??
          [],
      categorieId: json['main_category_id'],
      groupeId: json['group'],
      typeId: json['product_type'],
      storeId: json['store_id'] ?? storeId!,
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
      'image_url': imageUrl,
      'description': description,
      'price': price,
      'cost': cost,
      'stock': stock,
      'location': location,
      'variants': variants?.map((v) => v.toJson()).toList(),
      'categorie_id': categorieId,
      'groupe_id': groupeId,
      'type_id': typeId,
      'store_id': storeId,
    };
  }
}
