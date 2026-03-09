class Employee {
  final String id;
  final String name;
  final String role;
  final Map<String, dynamic> boutique;
  final String? phone;
  final String? email;
  final double? salary;
  final DateTime? hireDate;
  final String? address;
  final Map permission;
  final String? profileImageUrl;
  final DateTime createdAt;
  final DateTime updatedAt;

  Employee({
    required this.id,
    required this.name,
    required this.role,
    required this.boutique,
    this.phone,
    this.email,
    this.salary,
    this.hireDate,
    this.address,
    this.permission = const {},
    this.profileImageUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      role: json['role'] ?? '',
      boutique: json['boutique'] is Map ? json['boutique'] : {'id': 0, 'name': 'Inconnue'},
      phone: json['phone'],
      email: json['email'],
      salary: json['salary'] != null ? double.tryParse(json['salary'].toString()) : null,
      hireDate: json['hireDate'] != null ? DateTime.parse(json['hireDate']) : null,
      address: json['address'],
      permission: json["permission"],
      profileImageUrl: json['profileImageUrl'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'role': role,
      'boutique': boutique,
      'phone': phone,
      'email': email,
      'salary': salary,
      'hireDate': hireDate?.toIso8601String(),
      'address': address,
      'permission':permission,
      'profileImageUrl': profileImageUrl,
    };
  }

  // Pour la compatibilité avec votre code existant
  Map<String, dynamic> toLegacyFormat() {
    return {
      'name': name,
      'role': role,
      'boutique': boutique,
      'phone': phone,
      'email': email,
      'salary': salary,
      'hireDate': hireDate,
      'address': address,
      'profileImage': null, // À gérer séparément
    };
  }
}