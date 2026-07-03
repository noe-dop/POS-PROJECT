class CashRegisterModel {
  final int? id;
  final int store;
  final String name;
  final String? code;
  final String? location;
  final bool isActive;
  final String? createdAt;
  final String? updatedAt;

  CashRegisterModel({
    this.id,
    required this.store,
    required this.name,
    this.code,
    this.location,
    required this.isActive,
    this.createdAt,
    this.updatedAt,
  });

  factory CashRegisterModel.fromJson(Map<String, dynamic> json) {
    return CashRegisterModel(
      id: json['id'],
      store: json['store'] is int ? json['store'] : int.tryParse(json['store'].toString()),
      name: json['name'],
      code: json['code'],
      location: json['location'],
      isActive: json['is_active'],
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }
}