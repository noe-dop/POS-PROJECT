import 'dart:io';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/address_model.dart';

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
  int storeTypeId;  
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
