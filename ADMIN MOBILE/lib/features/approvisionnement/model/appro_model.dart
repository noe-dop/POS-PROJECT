class ApprovisionnementModel {
  final int id;
  final String reference;
  final int fournisseurId;
  final String fournisseurNom;
  final DateTime dateCommande;
  final DateTime? dateLivraison;
  final double montantTotal;
  final String statut;
  final List<ApprovisionnementItem> items;
  final String? notes;

  ApprovisionnementModel({
    required this.id,
    required this.reference,
    required this.fournisseurId,
    required this.fournisseurNom,
    required this.dateCommande,
    this.dateLivraison,
    required this.montantTotal,
    required this.statut,
    required this.items,
    this.notes,
  });

  factory ApprovisionnementModel.fromJson(Map<String, dynamic> json) {
    return ApprovisionnementModel(
      id: json['id'] ?? 0,
      reference: json['reference'] ?? '',
      fournisseurId: json['supplier_id'] ?? json['fournisseur_id'] ?? 0,
      fournisseurNom: json['supplier_name'] ?? json['fournisseur_nom'] ?? '',
      dateCommande: DateTime.tryParse(json['order_date'] ?? json['date_commande'] ?? '') ?? DateTime.now(),
      dateLivraison: json['delivery_date'] != null ? DateTime.tryParse(json['delivery_date']) : null,
      montantTotal: (json['total_amount'] ?? json['montant_total'] ?? 0).toDouble(),
      statut: json['status'] ?? json['statut'] ?? 'en_attente',
      items: (json['items'] as List?)?.map((i) => ApprovisionnementItem.fromJson(i)).toList() ?? [],
      notes: json['notes'],
    );
  }
}

class ApprovisionnementItem {
  final int id;
  final int productId;
  final String productName;
  final int quantite;
  final double prixUnitaire;
  final double total;

  ApprovisionnementItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantite,
    required this.prixUnitaire,
    required this.total,
  });

  factory ApprovisionnementItem.fromJson(Map<String, dynamic> json) {
    return ApprovisionnementItem(
      id: json['id'] ?? 0,
      productId: json['product_id'] ?? 0,
      productName: json['product_name'] ?? json['nom_produit'] ?? '',
      quantite: json['quantity'] ?? json['quantite'] ?? 0,
      prixUnitaire: (json['unit_price'] ?? json['prix_unitaire'] ?? 0).toDouble(),
      total: (json['total'] ?? 0).toDouble(),
    );
  }
}

class FournisseurModel {
  final int id;
  final String nom;
  final String email;
  final String telephone;
  final String? adresse;

  FournisseurModel({
    required this.id,
    required this.nom,
    required this.email,
    required this.telephone,
    this.adresse,
  });

  factory FournisseurModel.fromJson(Map<String, dynamic> json) {
    return FournisseurModel(
      id: json['id'] ?? 0,
      nom: json['name'] ?? json['nom'] ?? '',
      email: json['email'] ?? '',
      telephone: json['phone'] ?? json['telephone'] ?? '',
      adresse: json['address'] ?? json['adresse'],
    );
  }
}