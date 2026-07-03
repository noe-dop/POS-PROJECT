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
