import 'package:nsp_pos_mobile/features/boutiques/viewmodel/address_model.dart';

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