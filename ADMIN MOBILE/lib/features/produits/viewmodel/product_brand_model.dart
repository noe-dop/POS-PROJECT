class ProductBrand {
  int? id;
  String name;
  String? description;

  ProductBrand({
    this.id,
    required this.name,
    this.description
  });

  factory ProductBrand.fromJson(Map<String,dynamic> json) {
    return ProductBrand(
      id: json['id'],
      name: json['name'],
      description: json["description"]
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
    };
  }


}