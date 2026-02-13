// store_types_data = [
//             {
//                 'name': 'Supermarché',
//                 'description': 'Grande surface avec alimentation et produits divers',
//                 'icon': '🛒',
//                 'category': 'FOOD',
//                 'display_order': 1,
//                 'default_config': {
//                     'departments': ['Frais', 'Épicerie', 'Boissons', 'Hygiène'],
//                     'has_bakery': True,
//                     'has_butchery': True,
//                     'min_employees': 5
//                 },
//                 'aliases': ['Supermarket', 'Grande surface', 'Hypermarché']
//             },
//             {
//                 'name': 'Épicerie',
//                 'description': 'Commerce de produits alimentaires et de première nécessité',
//                 'icon': '🏪',
//                 'category': 'FOOD',
//                 'display_order': 2,
//                 'default_config': {
//                     'typical_products': ['Riz', 'Huile', 'Sucre', 'Pâtes', 'Conserves'],
//                     'opening_hours_extended': True
//                 },
//                 'aliases': ['Groceries', 'Magasin', 'Boutique alimentaire']
//             },
//             {
//                 'name': 'Boulangerie',
//                 'description': 'Vente de pain, pâtisseries et viennoiseries',
//                 'icon': '🥐',
//                 'category': 'FOOD',
//                 'display_order': 3,
//                 'default_config': {
//                     'requires_oven': True,
//                     'opens_early': True,
//                     'products': ['Pain', 'Croissants', 'Gâteaux']
//                 },
//                 'aliases': ['Bakery', 'Pâtisserie']
//             },
//             {
//                 'name': 'Boucherie',
//                 'description': 'Vente de viandes fraîches',
//                 'icon': '🥩',
//                 'category': 'FOOD',
//                 'display_order': 4,
//                 'requires_health_permit': True,
//                 'default_config': {
//                     'refrigeration_required': True,
//                     'meat_types': ['Bœuf', 'Mouton', 'Poulet', 'Poisson']
//                 },
//                 'aliases': ['Butcher', 'Viandes']
//             },
//             {
//                 'name': 'Poissonnerie',
//                 'description': 'Vente de poissons et fruits de mer',
//                 'icon': '🐟',
//                 'category': 'FOOD',
//                 'display_order': 5,
//                 'requires_health_permit': True,
//                 'default_config': {
//                     'refrigeration_required': True,
//                     'fresh_daily': True
//                 },
//                 'aliases': ['Fish market', 'Poissons frais']
//             },
//             {
//                 'name': 'Dibiterie',
//                 'description': 'Restaurant spécialisé dans la viande grillée (dibi)',
//                 'icon': '🔥',
//                 'category': 'FOOD',
//                 'display_order': 6,
//                 'default_config': {
//                     'specialty': 'Dibi',
//                     'serves_alcohol': False,
//                     'takeaway_available': True
//                 },
//                 'aliases': ['Grill', 'Viande grillée']
//             },
//             {
//                 'name': 'Café & Terrasse',
//                 'description': 'Café avec espace détente et parfois petite restauration',
//                 'icon': '☕',
//                 'category': 'FOOD',
//                 'display_order': 7,
//                 'default_config': {
//                     'has_terrace': True,
//                     'wifi_available': True,
//                     'serves_food': True
//                 },
//                 'aliases': ['Coffee shop', 'Salon de thé']
//             },
//             {
//                 'name': 'Ataya Spot',
//                 'description': 'Lieu de consommation de thé vert et socialisation',
//                 'icon': '🫖',
//                 'category': 'FOOD',
//                 'display_order': 8,
//                 'default_config': {
//                     'specialty': 'Thé vert',
//                     'social_space': True,
//                     'long_stays': True
//                 },
//                 'aliases': ['Maison de thé', 'Thé sénégalais']
//             },
//             {
//                 'name': 'Boutique de vêtements',
//                 'description': 'Vente de prêt-à-porter et vêtements traditionnels',
//                 'icon': '👗',
//                 'category': 'FASHION',
//                 'display_order': 9,
//                 'default_config': {
//                     'clothing_types': ['Homme', 'Femme', 'Enfant'],
//                     'allows_try_on': True
//                 },
//                 'aliases': ['Fashion store', 'Boutique de mode', 'Tailleur']
//             },
//             {
//                 'name': 'Salon de coiffure',
//                 'description': 'Coiffure hommes et femmes, parfois barbier',
//                 'icon': '💇',
//                 'category': 'FASHION',
//                 'display_order': 10,
//                 'default_config': {
//                     'services': ['Coupe', 'Coiffure', 'Tressage', 'Barbier'],
//                     'by_appointment': True
//                 },
//                 'aliases': ['Hair salon', 'Coiffeur', 'Barbier']
//             },
//             {
//                 'name': 'Bijouterie',
//                 'description': 'Vente de bijoux en or, argent et fantaisie',
//                 'icon': '💎',
//                 'category': 'FASHION',
//                 'display_order': 11,
//                 'default_config': {
//                     'jewelry_types': ['Or', 'Argent', 'Fantaisie'],
//                     'security_required': True
//                 },
//                 'aliases': ['Jewelry', 'Orfèvrerie']
//             },
//             {
//                 'name': 'Cosmétiques',
//                 'description': 'Produits de beauté, soins et parfums',
//                 'icon': '💄',
//                 'category': 'FASHION',
//                 'display_order': 12,
//                 'default_config': {
//                     'product_types': ['Soins visage', 'Maquillage', 'Parfums', 'Soins corps']
//                 },
//                 'aliases': ['Beauty products', 'Parfumerie']
//             },
//             {
//                 'name': 'Téléphonie',
//                 'description': 'Vente de téléphones, recharge et accessoires',
//                 'icon': '📱',
//                 'category': 'ELECTRONICS',
//                 'display_order': 13,
//                 'default_config': {
//                     'services': ['Vente téléphones', 'Recharge', 'Réparation', 'Accessoires'],
//                     'mobile_money_available': True
//                 },
//                 'aliases': ['Phone shop', 'Télécom']
//             },
//             {
//                 'name': 'Électroménager',
//                 'description': 'Appareils électroménagers et électroniques',
//                 'icon': '🔌',
//                 'category': 'ELECTRONICS',
//                 'display_order': 14,
//                 'default_config': {
//                     'product_types': ['Réfrigérateurs', 'Téléviseurs', 'Cuisinières', 'Ventilateurs'],
//                     'delivery_service': True,
//                     'installation_service': True
//                 },
//                 'aliases': ['Electronics', 'Appareils ménagers']
//             },
//             {
//                 'name': 'Pharmacie',
//                 'description': 'Vente de médicaments et produits pharmaceutiques',
//                 'icon': '💊',
//                 'category': 'HEALTH',
//                 'display_order': 15,
//                 'requires_health_permit': True,
//                 'default_config': {
//                     'requires_pharmacist': True,
//                     'emergency_service': True
//                 },
//                 'aliases': ['Pharmacy', 'Officine']
//             },
//             {
//                 'name': 'Boutique BFF',
//                 'description': 'Espace collaboratif pour plusieurs commerçants/entrepreneurs',
//                 'icon': '🤝',
//                 'category': 'SERVICES',
//                 'display_order': 16,
//                 'default_config': {
//                     'multi_seller': True,
//                     'shared_space': True,
//                     'collaborative': True,
//                     'commission_based': True,
//                     'min_sellers': 3,
//                     'max_sellers': 10
//                 },
//                 'aliases': ['Espace collaboratif', 'Marketplace physique', 'Boutique multi-vendeurs']
//             },
//             {
//                 'name': 'Quincaillerie',
//                 'description': 'Outils, matériaux de construction et produits ménagers',
//                 'icon': '🛠️',
//                 'category': 'SERVICES',
//                 'display_order': 17,
//                 'default_config': {
//                     'product_types': ['Outils', 'Matériaux', 'Peinture', 'Quincaillerie'],
//                     'bulk_available': True
//                 },
//                 'aliases': ['Hardware store', 'Matériaux construction']
//             },
//             {
//                 'name': 'Librairie-Papeterie',
//                 'description': 'Fournitures scolaires, livres et papeterie',
//                 'icon': '📚',
//                 'category': 'SERVICES',
//                 'display_order': 18,
//                 'default_config': {
//                     'seasonal_peak': 'Rentrée scolaire',
//                     'product_types': ['Livres', 'Fournitures', 'Papeterie']
//                 },
//                 'aliases': ['Bookstore', 'Papeterie', 'Fournitures scolaires']
//             },
//             {
//                 'name': 'Agent Mobile Money',
//                 'description': 'Point de service pour transactions mobile money',
//                 'icon': '📲',
//                 'category': 'SERVICES',
//                 'display_order': 19,
//                 'default_config': {
//                     'services': ['Dépôt', 'Retrait', 'Paiement', 'Transfert'],
//                     'operator': 'Orange Money/Wari/Free Money',
//                     'cash_management': True
//                 },
//                 'aliases': ['Point Wari', 'Agent Orange Money', 'Service mobile money']
//             },
//             {
//                 'name': 'Point relais e-commerce',
//                 'description': 'Point de retrait pour les commandes en ligne',
//                 'icon': '📦',
//                 'category': 'SERVICES',
//                 'display_order': 20,
//                 'allows_delivery': False,  # C'est un point de retrait, pas de livraison
//                 'default_config': {
//                     'pickup_only': True,
//                     'storage_space': True,
//                     'notification_system': True
//                 },
//                 'aliases': ['Pickup point', 'Relais colis', 'Point retrait']
//             },
//             {
//                 'name': 'Autre',
//                 'description': 'Autre type de commerce non listé',
//                 'icon': '🏬',
//                 'category': 'OTHER',
//                 'display_order': 99,
//                 'default_config': {}
//             },
//         ]


import 'dart:io';

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

class BoutiqueModel {
  final int id;
  final String name;
  final String slug;
  final String? phone;
  final String? email;
  final String? slogan;
  final AddressModel address;
  final bool isActive;
  final int storeType;
  final int? totalEmployee;
  final int? totalProducts;
  final int? totalPendingOrders;
  final Map<String, dynamic> openingHours;
  final Map<String, dynamic>? configuration;
  final String? logoUrl;
  final String? bannerUrl;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<int>? owners;
  // Champs supplémentaires de permissions
  final String? accessRole;
  final List<String>? permissions;

  BoutiqueModel({
    required this.id,
    required this.name,
    required this.slug,
    this.phone,
    this.email,
    this.slogan,
    required this.address,
    required this.isActive,
    this.totalEmployee,
    this.totalProducts,
    this.totalPendingOrders,
    required this.storeType,
    required this.openingHours,
    this.configuration,
    this.logoUrl,
    this.bannerUrl,
    required this.createdAt,
    required this.updatedAt,
    this.owners,
    this.accessRole,
    this.permissions,
  });
  Map<String,dynamic> toJsonUpdate() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'phone': phone,
      'email': email,
      'slogan': slogan,
      'address_line1': address.addressLine1,
      'address_line2': address.addressLine2,
      'city': address.city,
      'state': address.state,
      'postal_code': address.postalCode,
      'country': address.country,
      'latitude': address.latitude?.toString(),
      'longitude': address.longitude?.toString(),
      'store_type': storeType,
      'opening_hours': openingHours,
      'configuration': configuration,
      'is_active': isActive,
      "logo": logoUrl,
      "banner" : bannerUrl,
      "owners": owners,
      "access_role": accessRole,
      "permissions" : permissions,
      "created_at": createdAt.toIso8601String(),
      "updated_at" : updatedAt.toIso8601String()
    };
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'phone': phone,
      'email': email,
      'slogan': slogan,
      'address': address.toJson(),
      'store_type': storeType,
      'opening_hours': openingHours,
      'configuration': configuration,
      'is_active': isActive,
      "logo": logoUrl,
      "banner" : bannerUrl,
      "owners": owners,
      "access_role": accessRole,
      "permissions" : permissions,
      "created_at": createdAt.toIso8601String(),
      "updated_at" : updatedAt.toIso8601String()
    };
  }

  factory BoutiqueModel.fromJson(Map<String, dynamic> json) {
    return BoutiqueModel(
      id: json['id'],
      name: json['name'],
      slug: json['slug'],
      phone: json['phone'],
      email: json['email'],
      slogan: json['slogan'],
      address: json['address_details'] != null
          ? AddressModel.fromJson(Map<String, dynamic>.from(json['address_details']))
          : AddressModel(
              addressLine1: '',
              city: '',
              state: '',
              country: '',
            ),
      isActive: json['is_active'] ?? true,
      totalEmployee: json['total_employees'],
      totalProducts: json['total_products'],
      totalPendingOrders: json['pending_orders'],
      storeType: json['store_type'],
      openingHours: json['opening_hours'] != null
          ? Map<String, dynamic>.from(json['opening_hours'])
          : {},
      configuration: json['configuration'] != null
          ? Map<String, dynamic>.from(json['configuration'])
          : {},
      logoUrl: json['logo'],
      bannerUrl: json['banner'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      owners: json['owners'] != null
          ? List<int>.from(json['owners'])
          : [],
      accessRole: json['access_role'],
      permissions: json['permissions'] != null
          ? List<String>.from(json['permissions'])
          : null,
    );
  }

  // Propriétés calculées
  String get formattedOpeningHours {
    if (openingHours.containsKey('opening_time') && 
        openingHours.containsKey('closing_time')) {
      return '${openingHours['opening_time']} - ${openingHours['closing_time']}';
    }
    return 'Fermé';
  }

  String get ownerStatus {
    if (accessRole == 'owner_primary') return 'Propriétaire principal';
    if (accessRole == 'owner') return 'Propriétaire';
    if (accessRole == 'manager') return 'Gérant';
    if (accessRole == 'cashier') return 'Caissier';
    return 'Employé';
  }

  // Pour l'affichage
  String get displayAddress {
    return address.fullAddress ?? 'Adresse non spécifiée';
  }

}

class AddressModel {
  final int? id;
  final String? fullAddress;
  String addressLine1;
  String? addressLine2;
  String city;
  String state;
  String? postalCode;
  String country;
  double? latitude;
  double? longitude;

  AddressModel({
    this.id,
    this.fullAddress,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.state,
    this.postalCode,
    required this.country,
    this.latitude,
    this.longitude,
  });
  factory AddressModel.fromJson(Map<String, dynamic> json) {
    // Gérer la conversion des coordonnées
    double? parseCoordinate(dynamic value) {
      if (value == null || value == '') return null;
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) {
        return double.tryParse(value);
      }
      return null;
    }

    return AddressModel(
      id: json['id'],
      fullAddress: json['full_address'] ?? '',
      addressLine1: json['address_line1'] ?? '',
      addressLine2: json['address_line2'],
      city: json['city'] ?? '',
      state: json['state'] ?? '',
      postalCode: json['postal_code'],
      country: json['country'] ?? '',
      latitude: parseCoordinate(json['latitude']),
      longitude: parseCoordinate(json['longitude']),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'full_address': fullAddress,
      'address_line1': addressLine1,
      'address_line2': addressLine2,
      'city': city,
      'state': state,
      'postal_code': postalCode,
      'country': country,
      'latitude': latitude?.toString(),
      'longitude': longitude?.toString(),
    };
  }

  
}


class BoutiqueFormModel {
  String name;
  File? logoFile;
  File? bannerFile;
  String? logoUrl;
  String? bannerUrl;
  String? slogan;
  AddressModel address;
  String phone;
  String email;
  int storeTypeId;  // Changé de boutiqueTypeId à storeTypeId
  Map<String, dynamic> openingHours;
  bool isActive;
  Map<String, dynamic>? configuration;
  // Pour upload d'images
  String? logoPath;
  String? bannerPath;

  BoutiqueFormModel({
    required this.name,
    required this.address,
    required this.phone,
    required this.email,
    required this.storeTypeId,
    this.logoFile,
    this.bannerFile,
    this.logoUrl,
    this.bannerUrl,
    this.slogan,
    this.openingHours = const {},
    this.isActive = true,
    this.configuration,
    this.logoPath,
    this.bannerPath,
  });

  // Pour les heures d'ouverture formatées
  String get formattedOpeningHours {
    if (openingHours.containsKey('opening_time') && 
        openingHours.containsKey('closing_time')) {
      return '${openingHours['opening_time']} - ${openingHours['closing_time']}';
    }
    return '08:00 - 20:00';
  }

  Map<String, dynamic> toJson() {
    final json = {
      'name': name,
      'slogan': slogan,
      'address': address.toJson(),  // Objet Address complet
      'phone': phone,
      'email': email,
      'store_type': storeTypeId,  // ID seulement
      'opening_hours': openingHours,
      'is_active': isActive,
      'configuration': configuration ?? {},
    };

    // Ajouter les URLs si disponibles
    if (logoUrl != null) {
      json['logo'] = logoUrl;
    }
    if (bannerUrl != null) {
      json['banner'] = bannerUrl;
    }

    return json;
  }

  // Pour FormData (avec fichiers)
  Future<Map<String, dynamic>> toFormData() async {
    final formData = {
      'name': name,
      'slogan': slogan ?? '',
      'address_line1': address.addressLine1,
      'address_line2': address.addressLine2 ?? '',
      'city': address.city,
      'state': address.state,
      'postal_code': address.postalCode,
      'country': address.country,
      'latitude': address.latitude?.toString() ?? '',
      'longitude': address.longitude?.toString() ?? '',
      'phone': phone,
      'email': email,
      'store_type': storeTypeId.toString(),
      'opening_hours': openingHours.isNotEmpty 
          ? openingHours 
          : {'opening_time': '08:00', 'closing_time': '20:00'},
      'is_active': isActive.toString(),
      'configuration': configuration != null 
          ? configuration.toString() 
          : '{}',
    };

    return formData;
  }

  factory BoutiqueFormModel.empty() {
    return BoutiqueFormModel(
      name: '',
      address: AddressModel(
        addressLine1: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      ),
      phone: '',
      email: '',
      storeTypeId: 0,
      openingHours: {
        'opening_time': '08:00',
        'closing_time': '20:00',
      },
      isActive: true,
    );
  }
}

class StoreWithPermission {
  final BoutiqueModel boutique;
  final String accessRole; // 'owner', 'owner_primary', 'manager', 'cashier', etc.
  final List<String>? permissions;
  
  StoreWithPermission({
    required this.boutique,
    required this.accessRole,
    this.permissions,
  });
  
  factory StoreWithPermission.fromJson(Map<String, dynamic> json) {
    return StoreWithPermission(
      boutique: BoutiqueModel.fromJson(json),
      accessRole: json['access_role'] ?? 'no_access',
      permissions: json['permissions'] != null
          ? List<String>.from(json['permissions'])
          : null,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      ...boutique.toJson(),
      'access_role': accessRole,
      'permissions': permissions,
    };
  }
  
  bool get canSwitchStores {
    // Peut changer de boutique si: superadmin, owner, ou manager avec accès multiple
    return accessRole == 'superadmin' || 
           accessRole == 'owner' ||
           accessRole == 'owner_primary' ||
           (accessRole == 'manager' && (permissions?.contains('multiple_stores') ?? false));
  }
}