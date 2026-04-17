class StockModel {
  final int id;
  final int productId;
  final String productName;
  final String sku;
  final int quantityOnHand;
  final int quantityReserved;
  final int quantityAvailable;
  final int minStockThreshold;
  final String stockStatus;
  final String? location;
  final DateTime lastUpdated;

  StockModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.sku,
    required this.quantityOnHand,
    required this.quantityReserved,
    required this.quantityAvailable,
    required this.minStockThreshold,
    required this.stockStatus,
    this.location,
    required this.lastUpdated,
  });

  factory StockModel.fromJson(Map<String, dynamic> json) {
    return StockModel(
      id: json['id'] ?? 0,
      productId: json['product_id'] ?? 0,
      productName: json['product_name'] ?? json['nom_produit'] ?? '',
      sku: json['sku'] ?? '',
      quantityOnHand: json['quantity_on_hand'] ?? 0,
      quantityReserved: json['quantity_reserved'] ?? 0,
      quantityAvailable: json['quantity_available'] ?? 0,
      minStockThreshold: json['min_stock_threshold'] ?? 5,
      stockStatus: json['stock_status'] ?? 'in_stock',
      location: json['location'],
      lastUpdated: DateTime.tryParse(json['last_updated'] ?? json['updated_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class StockMovementModel {
  final int id;
  final String reference;
  final String movementType;
  final DateTime movementDate;
  final int quantity;
  final String? notes;

  StockMovementModel({
    required this.id,
    required this.reference,
    required this.movementType,
    required this.movementDate,
    required this.quantity,
    this.notes,
  });

  factory StockMovementModel.fromJson(Map<String, dynamic> json) {
    return StockMovementModel(
      id: json['id'] ?? 0,
      reference: json['reference'] ?? '',
      movementType: json['movement_type'] ?? '',
      movementDate: DateTime.tryParse(json['movement_date'] ?? '') ?? DateTime.now(),
      quantity: json['quantity'] ?? json['total_items'] ?? 0,
      notes: json['notes'],
    );
  }
}