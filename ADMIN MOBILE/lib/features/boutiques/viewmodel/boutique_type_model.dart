class BoutiqueType {
  final int id;
  final String name;
  final String description;

  BoutiqueType({
    required this.id,
    required this.name,
    required this.description,
  });

  factory BoutiqueType.fromJson(Map<String, dynamic> json) {
    return BoutiqueType(
      id: json['id'],
      name: json['name'],
      description: json['description'],
    );
  }
}
