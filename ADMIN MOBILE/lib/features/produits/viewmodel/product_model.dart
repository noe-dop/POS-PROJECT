import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class Product {
  final String id;
  final String name;
  final String sku;
  final String type;
  final String brand;
  final String status;
  final List<String> imageUrl;
  final String description;
  final double price;
  final double cost;
  final int stock;
  final String location;
  final List<Variant> variants;

  Product({
    required this.id,
    required this.name,
    required this.sku,
    required this.status,
    required this.type,
    required this.brand,
    required this.imageUrl,
    required this.description,
    required this.price,
    required this.cost,
    required this.stock,
    required this.location,
    required this.variants,
  });
}
