class InventaireModel {
  final int id;
  final String nom;
  final String reference;
  final int quantiteActuelle;
  final int quantiteTheorique;
  final int ecart;
  final String statut;
  final DateTime dateDernierInventaire;
  final String emplacement;
  final String? notes;

  InventaireModel({
    required this.id,
    required this.nom,
    required this.reference,
    required this.quantiteActuelle,
    required this.quantiteTheorique,
    required this.ecart,
    required this.statut,
    required this.dateDernierInventaire,
    required this.emplacement,
    this.notes,
  });

  factory InventaireModel.fromJson(Map<String, dynamic> json) {
    return InventaireModel(
      id: json['id'] ?? 0,
      nom: json['name'] ?? json['nom'] ?? '',
      reference: json['reference'] ?? json['sku'] ?? '',
      quantiteActuelle: json['quantity_on_hand'] ?? json['quantite_actuelle'] ?? 0,
      quantiteTheorique: json['theoretical_quantity'] ?? json['quantite_theorique'] ?? 0,
      ecart: json['difference'] ?? json['ecart'] ?? 0,
      statut: json['status'] ?? json['statut'] ?? 'en_attente',
      dateDernierInventaire: DateTime.tryParse(json['last_inventory_date'] ?? json['date_dernier_inventaire'] ?? '') ?? DateTime.now(),
      emplacement: json['location'] ?? json['emplacement'] ?? '',
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': nom,
      'reference': reference,
      'quantity_on_hand': quantiteActuelle,
      'theoretical_quantity': quantiteTheorique,
      'difference': ecart,
      'status': statut,
      'last_inventory_date': dateDernierInventaire.toIso8601String(),
      'location': emplacement,
      'notes': notes,
    };
  }
}

class InventaireItem {
  final int id;
  final String productName;
  final String sku;
  final int expectedQuantity;
  final int countedQuantity;
  final int difference;
  final String status;
  final String? notes;

  InventaireItem({
    required this.id,
    required this.productName,
    required this.sku,
    required this.expectedQuantity,
    required this.countedQuantity,
    required this.difference,
    required this.status,
    this.notes,
  });

  factory InventaireItem.fromJson(Map<String, dynamic> json) {
    return InventaireItem(
      id: json['id'] ?? 0,
      productName: json['product_name'] ?? json['nom_produit'] ?? '',
      sku: json['sku'] ?? '',
      expectedQuantity: json['expected_quantity'] ?? json['quantite_attendue'] ?? 0,
      countedQuantity: json['counted_quantity'] ?? json['quantite_comptee'] ?? 0,
      difference: json['difference'] ?? json['ecart'] ?? 0,
      status: json['status'] ?? 'pending',
      notes: json['notes'],
    );
  }
}