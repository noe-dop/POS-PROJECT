class Variant {
  int? id;
  String barcode;
  String description;
  int quantity;
  double salePrice1;
  double? salePrice2;
  double? comparePrice;
  String? imageUrl;

  Variant({
    this.id,
    required this.barcode,
    required this.description,
    required this.quantity,
    required this.salePrice1,
    this.salePrice2,
    this.comparePrice,
    this.imageUrl,
  });

  factory Variant.fromJson(Map<String, dynamic> json) {
    return Variant(
      barcode: json['barcode'] ?? '',
      description: json['description'] ?? '',
      quantity: json['quantity'] ?? 0,
      salePrice1: (json['sale_price1'] as num?)?.toDouble() ?? 0.0,
      salePrice2: (json['sale_price2'] as num?)?.toDouble(),
      comparePrice: (json['compare_price'] as num?)?.toDouble(),
      imageUrl: json['image_url'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'barcode': barcode,
      'description': description,
      'quantity': quantity,
      'sale_price1': salePrice1,
      'sale_price2': salePrice2,
      'compare_price': comparePrice,
      'image_url': imageUrl,
    };
  }
}