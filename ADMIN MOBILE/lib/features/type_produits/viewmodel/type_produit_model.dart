class TypeProduit {
  final String id;
  final String nom;
  final int nombreProduits;
  final DateTime dateCreation;
  final DateTime? dateModification;
  final String? parentId;
  final bool isSousType;
  final List<TypeProduit> sousTypes;
  final int nombreSousTypes;

  TypeProduit({
    required this.id,
    required this.nom,
    required this.nombreProduits,
    required this.dateCreation,
    this.dateModification,
    this.parentId,
    this.isSousType = false,
    this.sousTypes = const [],
    this.nombreSousTypes = 0,
  });

  factory TypeProduit.fromJson(Map<String, dynamic> json) {
    return TypeProduit(
      id: json['id'],
      nom: json['nom'],
      nombreProduits: json['nombreProduits'],
      dateCreation: DateTime.parse(json['dateCreation']),
      dateModification: json['dateModification'] != null
          ? DateTime.parse(json['dateModification'])
          : null,
      parentId: json['parentId'],
      isSousType: json['isSousType'] ?? false,
      sousTypes: json['sousTypes'] != null
          ? (json['sousTypes'] as List)
                .map((e) => TypeProduit.fromJson(e))
                .toList()
          : [],
      nombreSousTypes: json['nombreSousTypes'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nom': nom,
      'nombreProduits': nombreProduits,
      'dateCreation': dateCreation.toIso8601String(),
      'dateModification': dateModification?.toIso8601String(),
      'parentId': parentId,
      'isSousType': isSousType,
      'sousTypes': sousTypes.map((e) => e.toJson()).toList(),
      'nombreSousTypes': nombreSousTypes,
    };
  }

  TypeProduit copyWith({
    String? id,
    String? nom,
    int? nombreProduits,
    DateTime? dateCreation,
    DateTime? dateModification,
    String? parentId,
    bool? isSousType,
    List<TypeProduit>? sousTypes,
    int? nombreSousTypes,
  }) {
    return TypeProduit(
      id: id ?? this.id,
      nom: nom ?? this.nom,
      nombreProduits: nombreProduits ?? this.nombreProduits,
      dateCreation: dateCreation ?? this.dateCreation,
      dateModification: dateModification ?? this.dateModification,
      parentId: parentId ?? this.parentId,
      isSousType: isSousType ?? this.isSousType,
      sousTypes: sousTypes ?? this.sousTypes,
      nombreSousTypes: nombreSousTypes ?? this.nombreSousTypes,
    );
  }
  bool get hasSousTypes => sousTypes.isNotEmpty;
  bool get isGrandType => !isSousType && parentId == null;
}
