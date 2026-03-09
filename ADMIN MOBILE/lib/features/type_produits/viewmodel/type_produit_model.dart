class CategoriePrincipale {
  final int id;
  final String nom;
  final String slug;
  final String description;
  final List<Groupe>? group;
  CategoriePrincipale({
    required this.id,
    required this.nom,
    required this.slug,
    required this.description,
    this.group,
  });

  factory CategoriePrincipale.fromJson(Map<String, dynamic> json) {
    final List<dynamic>? childrenJson = json['children'] as List<dynamic>?;
    List<Groupe>? group;
    if (childrenJson != null) {
      group = childrenJson
          .map((child) => Groupe.fromJson(child as Map<String, dynamic>))
          .toList();
    }
    return CategoriePrincipale(
      id: json['id'],
      nom: json["name"],
      slug: json['slug'],
      description: json["description"],
      group: group,
    );
  }
}

class Groupe {
  final int? id;
  final String nom;
  final String? slug;
  final String description;
  final int categoriePrincipaleId;
  final List<TypeProduit>? typeproduit;
  Groupe({
    required this.id,
    required this.nom,
    required this.slug,
    required this.description,
    required this.categoriePrincipaleId,
    this.typeproduit,
  });

  factory Groupe.fromJson(Map<String, dynamic> json) {
    final List<dynamic>? childrenJson = json['children'] as List<dynamic>?;
    List<TypeProduit>? typeProduit;
    if (childrenJson != null) {
      typeProduit = childrenJson
          .map((child) => TypeProduit.fromJson(child as Map<String, dynamic>))
          .toList();
    }
    return Groupe(
      id: json['id'],
      nom: json['name'],
      slug: json['slug'],
      description: json['description'],
      categoriePrincipaleId: json['parent_id'],
      typeproduit: typeProduit,
    );
  }
}

class TypeProduit {
  final int? id;
  final String nom;
  final String? slug;
  final int groupeId;
  TypeProduit({
    required this.id,
    required this.nom,
    required this.slug,
    required this.groupeId,
  });

  factory TypeProduit.fromJson(Map<String, dynamic> json) {
    return TypeProduit(
      id: json['id'],
      nom: json['name'],
      slug: json['slug'],
      groupeId: json['parent_id'],
    );
  }
}
