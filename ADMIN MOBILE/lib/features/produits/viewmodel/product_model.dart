// product_model.dart
import 'variante_model.dart';

class Product {
  final String id;
  String name;
  String sku;
  String status;
  String brand;
  List<String> imageUrl;
  String description;
  double price;
  double cost;
  int stock;
  String location;
  List<Variant> variants;
  int? categorieId;  // ID de la catégorie principale
  int? groupeId;     // ID du groupe (obligatoire ?)
  int? typeId;       // ID du type (optionnel)
  int storeId;

  Product({
    required this.id,
    required this.name,
    required this.sku,
    required this.status,
    required this.brand,
    required this.imageUrl,
    required this.description,
    required this.price,
    required this.cost,
    required this.stock,
    required this.location,
    required this.variants,
    this.categorieId,
    this.groupeId,
    this.typeId,
    required this.storeId
  });

  factory Product.fromJson(Map<String, dynamic> json) {
  return Product(
    id: json['id'].toString(), // if int, convert to String
    name: json['name'] ?? '',
    sku: json['sku'] ?? '',
    status: json['status'] ?? '',
    brand: json['brand'] ?? '',
    imageUrl: (json['image_url'] as List?)?.map((e) => e.toString()).toList() ?? [],
    description: json['description'] ?? '',
    price: (json['price'] as num?)?.toDouble() ?? 0.0,
    cost: (json['cost'] as num?)?.toDouble() ?? 0.0,
    stock: json['stock'] ?? 0,
    location: json['location'] ?? '',
    variants: (json['variants'] as List?)?.map((v) => Variant.fromJson(v)).toList() ?? [],
    categorieId: json['categorie_id'],
    groupeId: json['groupe_id'],
    typeId: json['type_id'],
    storeId: json['store_id'] ?? 0,
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
    'variants': variants.map((v) => v.toJson()).toList(),
    'categorie_id': categorieId,
    'groupe_id': groupeId,
    'type_id': typeId,
    'store_id': storeId,
  };
}
}