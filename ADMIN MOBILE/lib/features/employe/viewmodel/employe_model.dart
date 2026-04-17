// lib/features/employe/viewmodel/employe_model.dart
import 'package:nsp_pos_mobile/core/config/app_config.dart';

class Employee {
  final int id;
  final String username;
  final String email;
  final String firstName;
  final String lastName;
  final String phone;
  final String? address;
  final bool isActive;
  final DateTime dateJoined;
  final DateTime? lastLogin;

  // Données spécifiques à Employee
  final int storeId;
  final String storeName;
  final int roleId;
  final String roleName;
  final int? departmentId;
  final String? departmentName;
  final DateTime hireDate;
  final double? salary;
  final String? emergencyContact;
  final String? photoUrl;
  final Map<String, dynamic> permissions;
  final bool canAccessMultipleStores;
  final List<Map<String, dynamic>>? assignedStores;

  Employee({
    required this.id,
    required this.username,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.address,
    required this.isActive,
    required this.dateJoined,
    this.lastLogin,
    required this.storeId,
    required this.storeName,
    required this.roleId,
    required this.roleName,
    this.departmentId,
    this.departmentName,
    required this.hireDate,
    this.salary,
    this.emergencyContact,
    this.photoUrl,
    this.permissions = const {},
    required this.canAccessMultipleStores,
    this.assignedStores,
  });

  String get fullName => '$firstName $lastName';
  String get displayName => fullName.isNotEmpty ? fullName : username;

  factory Employee.fromJson(Map<String, dynamic> json) {
    final userData = json['user'] ?? json;
    // Gérer assigned_stores qui pourrait être null ou absent
    List<Map<String, dynamic>> assignedStores = [];
    if (json['assigned_stores'] != null && json['assigned_stores'] is List) {
      assignedStores = List<Map<String, dynamic>>.from(
        (json['assigned_stores'] as List).map(
          (store) => Map<String, dynamic>.from(store),
        ),
      );
    }
    String? photoUrl; // Par défaut, pas d'URL de photo
    if (json['photo'] != null && json['photo'] is String) {
      var rawUrl = json['photo'] as String;
      // Nettoyer l'URL de la photo
      photoUrl = rawUrl.contains('http') ? rawUrl : ApiConfig.mediaBaseUrl + rawUrl;
    }
    
    return Employee(
      id: json['id'] ?? 0,
      username: userData['username'] ?? '',
      email: userData['email'] ?? '',
      firstName: userData['first_name'] ?? '',
      lastName: userData['last_name'] ?? '',
      phone: userData['phone'] ?? '',
      address: userData['address'],
      isActive: json['is_active'] ?? true,
      dateJoined:
          DateTime.tryParse(userData['date_joined'] ?? '') ?? DateTime.now(),
      lastLogin: userData['last_login'] != null
          ? DateTime.tryParse(userData['last_login'])
          : null,
      storeId: json['store'],
      storeName: json['store_name'] ?? '',
      roleId: json['role'] ?? 0,
      roleName: json['role_name'] ?? '',
      departmentId: json['department'],
      departmentName: json['department_name'],
      hireDate: DateTime.tryParse(json['hire_date'] ?? '') ?? DateTime.now(),
      salary: json['salary'] != null
          ? double.tryParse(json['salary'].toString())
          : null,
      emergencyContact: json['emergency_contact'],
      photoUrl: photoUrl,
      permissions: json['permissions'] ?? {},
      canAccessMultipleStores: json['can_access_multiple_stores'] ?? false,
      assignedStores: assignedStores,
    );
  }

  Map<String, dynamic> toLegacyFormat() {
    return {
      'name': fullName,
      'role': roleName,
      'boutique': {'id': storeId, 'name': storeName},
      'phone': phone,
      'email': email,
      'salary': salary,
      'hireDate': hireDate,
      'address': address,
      'is_active': isActive,
      'profileImageUrl': photoUrl,
      'id': id,
    };
  }
}
