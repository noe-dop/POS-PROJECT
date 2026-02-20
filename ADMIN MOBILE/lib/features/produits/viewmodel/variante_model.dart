class Variant {
  final String barcode;
  final String description;
  final int quantity;
  final double salePrice1;
  final double? salePrice2;
  final double? comparePrice;
  final String? imageUrl;

  Variant({
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