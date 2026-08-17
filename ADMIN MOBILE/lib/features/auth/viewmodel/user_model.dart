import 'package:nsp_pos_mobile/core/utils/format_utils.dart';

class User {
  // Informations de base
  final int id;
  final String username;
  final String email;
  final String firstName;
  final String lastName;
  final String phone;
  final String? address;
  final bool isStaff;
  final bool isSuperuser;
  final DateTime lastLogin;
  final DateTime createdAt;

  // Rôle de l'utilisateur
  final String role; // 'owner', 'employee', 'shareholder', 'customer', 'user'

  // Profils spécifiques (un seul est non-null selon le rôle)
  final OwnerProfile? ownerProfile;
  final EmployeeProfile? employeeProfile;
  final ShareholderProfile? shareholderProfile;
  final CustomerProfile? customerProfile;

  // Tokens JWT
  String? accessToken;
  String? refreshToken;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.address,
    required this.isStaff,
    required this.isSuperuser,
    required this.lastLogin,
    required this.createdAt,
    required this.role,
    this.ownerProfile,
    this.employeeProfile,
    this.shareholderProfile,
    this.customerProfile,
    this.accessToken,
    this.refreshToken,
  });

  String get fullName => '$firstName $lastName';

  bool get isOwner => role == 'owner';
  bool get isEmployee => role == 'employee';
  bool get isShareholder => role == 'shareholder';
  bool get isCustomer => role == 'customer';
  bool get isAuthenticated => accessToken != null && accessToken!.isNotEmpty;

  // Permissions combinées (profil + rôle)
  bool get isManager => isOwner || (isEmployee && employeeProfile != null && employeeProfile!.roleName.toLowerCase() == 'manager');
  bool get canManageSales {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canManageSales;
    }
    return false;
  }

  bool get canManageProducts {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canManageProducts;
    }
    return false;
  }

  bool get canManageEmployees {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canManageEmployees;
    }
    return false;
  }

  bool get canViewReports {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canViewReports;
    }
    return false;
  }

  // Ajouter ces getters dans la classe User
  bool get canManageInventory {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canManageInventory;
    }
    return false;
  }

  bool get canManageSupply {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canManageSupply;
    }
    return false;
  }

  bool get canManageCashbox {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canManageCashbox;
    }
    return false;
  }

  bool get canManageSubscriptions {
    if (isOwner) return true;
    return false; // Seul le owner peut gérer les abonnements
  }

  bool get canAccessMultipleStores {
    if (isOwner) return true;
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.canAccessMultipleStores;
    }
    return false;
  }

  // Boutiques accessibles
  List<AssignedStore> get accessibleStores {
    if (isOwner) {
      return []; // Owner voit toutes ses boutiques via BoutiqueService
    }
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.assignedStores;
    }
    return [];
  }

  // Store ID principal (pour les employés)
  int? get primaryStoreId {
    if (isEmployee && employeeProfile != null) {
      return employeeProfile!.storeId;
    }
    return null;
  }

  String? get photoUrl {
    if (isOwner && ownerProfile != null) return ownerProfile!.photo;
    if (isEmployee && employeeProfile != null) return employeeProfile!.photo;
    if (isShareholder && shareholderProfile != null) {
      return shareholderProfile!.photo;
    }
    if (isCustomer && customerProfile != null) return customerProfile!.photo;
    return null;
  }

  factory User.fromJson(Map<String, dynamic> json) {
    final userData = json['user'] ?? json;

    return User(
      id: userData['id'] ?? 0,
      username: userData['username'] ?? '',
      email: userData['email'] ?? '',
      firstName: userData['first_name'] ?? '',
      lastName: userData['last_name'] ?? '',
      phone: userData['phone'] ?? '',
      address: userData['address'],
      isStaff: userData['is_staff'] ?? false,
      isSuperuser: userData['is_superuser'] ?? false,
      lastLogin:
          DateTime.tryParse(userData['last_login'] ?? '') ?? DateTime.now(),
      createdAt:
          DateTime.tryParse(userData['created_at'] ?? '') ?? DateTime.now(),
      role: userData['role'] ?? 'user',
      ownerProfile: userData['owner_profile'] != null
          ? OwnerProfile.fromJson(userData['owner_profile'])
          : null,
      employeeProfile: userData['employee_profile'] != null
          ? EmployeeProfile.fromJson(userData['employee_profile'])
          : null,
      shareholderProfile: userData['shareholder_profile'] != null
          ? ShareholderProfile.fromJson(userData['shareholder_profile'])
          : null,
      customerProfile: userData['customer_profile'] != null
          ? CustomerProfile.fromJson(userData['customer_profile'])
          : null,
      accessToken: json['access'],
      refreshToken: json['refresh'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'full_name': fullName,
      'phone': phone,
      'address': address,
      'is_staff': isStaff,
      'is_superuser': isSuperuser,
      'last_login': lastLogin.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'role': role,
      if (ownerProfile != null) 'owner_profile': ownerProfile!.toJson(),
      if (employeeProfile != null)
        'employee_profile': employeeProfile!.toJson(),
      if (shareholderProfile != null)
        'shareholder_profile': shareholderProfile!.toJson(),
      if (customerProfile != null)
        'customer_profile': customerProfile!.toJson(),
    };
  }

  User copyWith({
    int? id,
    String? username,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? address,
    bool? isStaff,
    bool? isSuperuser,
    DateTime? lastLogin,
    DateTime? createdAt,
    String? role,
    OwnerProfile? ownerProfile,
    EmployeeProfile? employeeProfile,
    ShareholderProfile? shareholderProfile,
    CustomerProfile? customerProfile,
    String? accessToken,
    String? refreshToken,
    List<AssignedStore>? assignedStores,
  }) {
    return User(
      id: id ?? this.id,
      username: username ?? this.username,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      isStaff: isStaff ?? this.isStaff,
      isSuperuser: isSuperuser ?? this.isSuperuser,
      lastLogin: lastLogin ?? this.lastLogin,
      createdAt: createdAt ?? this.createdAt,
      role: role ?? this.role,
      ownerProfile: ownerProfile ?? this.ownerProfile,
      employeeProfile: employeeProfile ?? this.employeeProfile,
      shareholderProfile: shareholderProfile ?? this.shareholderProfile,
      customerProfile: customerProfile ?? this.customerProfile,
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
    );
  }
}

// ============================================================================
// PROFIL PROPRIÉTAIRE
// ============================================================================

class OwnerProfile {
  final int id;
  final String? photo;
  final DateTime createdAt;

  OwnerProfile({required this.id, this.photo, required this.createdAt});

  factory OwnerProfile.fromJson(Map<String, dynamic> json) {
    return OwnerProfile(
      id: json['id'] ?? 0,
      photo: json['photo'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'photo': photo,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// ============================================================================
// PROFIL EMPLOYÉ
// ============================================================================

class AssignedStore {
  final int id;
  final String name;
  final String permissionType;
  final bool canManageEmployees;
  final bool canManageProducts;
  final bool canManageStores;
  final bool canManageSales;
  final bool canViewReports;
  final bool canManageInventory;
  final bool canManageSupply;
  final bool canManageCashbox;
  final bool canManageSubscriptions;
  final bool isPrimary;

  AssignedStore({
    required this.id,
    required this.name,
    required this.permissionType,
    required this.canManageEmployees,
    required this.canManageProducts,
    required this.canManageStores,
    required this.canManageSales,
    required this.canViewReports,
    required this.canManageInventory,
    required this.canManageSupply,
    required this.canManageCashbox,
    required this.canManageSubscriptions,
    this.isPrimary = false,
  });

  factory AssignedStore.fromJson(Map<String, dynamic> json) {
    return AssignedStore(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      permissionType: json['permission_type'] ?? 'viewer',
      canManageEmployees: json['can_manage_employees'] ?? false,
      canManageProducts: json['can_manage_products'] ?? false,
      canManageStores: json['can_manage_stores'] ?? false,
      canManageSales: json['can_manage_sales'] ?? false,
      canViewReports: json['can_view_reports'] ?? false,
      canManageInventory: json['can_manage_inventory'] ?? false,
      canManageSupply: json['can_manage_supply'] ?? false,
      canManageCashbox: json['can_manage_cashbox'] ?? false,
      canManageSubscriptions: json['can_manage_subscriptions'] ?? false,
      isPrimary: json['is_primary'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'permission_type': permissionType,
      'can_manage_employees': canManageEmployees,
      'can_manage_products': canManageProducts,
      'can_manage_stores': canManageStores,
      'can_manage_sales': canManageSales,
      'can_view_reports': canViewReports,
      'can_manage_inventory': canManageInventory,
      'can_manage_supply': canManageSupply,
      'can_manage_cashbox': canManageCashbox,
      'can_manage_subscriptions': canManageSubscriptions,
      'is_primary': isPrimary,
    };
  }
}

class EmployeeProfile {
  final int id;
  final String? photo;
  final int storeId;
  final String? storeName;
  final int roleId;
  final String roleName;
  final String? department;
  final double? salary;
  final String? emergencyContact;
  final DateTime? hireDate;
  final bool canManageEmployees;
  final bool canManageStores;
  final bool canManageProducts;
  final bool canManageSales;
  final bool canViewReports;
  final bool canManageInventory;
  final bool canManageSupply;
  final bool canManageCashbox;
  final bool canManageSubscriptions;
  final bool canAccessMultipleStores;
  final List<AssignedStore> assignedStores;


  EmployeeProfile({
    required this.id,
    this.photo,
    required this.storeId,
    this.storeName,
    required this.roleId,
    required this.roleName,
    this.department,
    this.salary,
    this.emergencyContact,
    this.hireDate,
    this.canManageEmployees = false,
    this.canManageStores = false,
    this.canManageProducts = false,
    this.canManageSales = false,
    this.canViewReports = false,
    this.canManageInventory = false,
    this.canManageSupply = false,
    this.canManageCashbox = false,
    this.canManageSubscriptions = false,
    this.canAccessMultipleStores = false,
    this.assignedStores = const [],
  });

  factory EmployeeProfile.fromJson(Map<String, dynamic> json) {
    String? photoUrl; // Par défaut, pas d'URL de photo
    photoUrl = FormatUtils.formatImageUrl(json['photo']);
    // Récupérer la liste des assigned stores
    List<AssignedStore> assigned =
        (json['assigned_stores'] as List?)
            ?.map((s) => AssignedStore.fromJson(s))
            .toList() ??
        [];
    // Permissions par défaut
    bool canManageEmployees = false;
    bool canManageProducts = false;
    bool canManageSales = false;/// The above Dart code snippet declares boolean variables for different
    /// permissions related to a user's role. These permissions include
    /// `canViewReports`, `canManageInventory`, `canManageSupply`,
    /// `canManageCashbox`, `canManageSubscriptions`, and `canManageStores`,
    /// all initially set to `false`. The comment at the end of the code
    /// snippet seems to be incomplete and does not provide a clear
    /// indication of what the code is intended to do.
    
    bool canViewReports = false;
    bool canManageInventory = false;
    bool canManageSupply = false;
    bool canManageCashbox = false;
    bool canManageSubscriptions = false;
    bool canManageStores = false;

    // Si au moins une boutique assignée, prendre les permissions de la première
    if (assigned.isNotEmpty) {
      final first = assigned.first;
      canManageEmployees = first.canManageEmployees;
      canManageProducts = first.canManageProducts;
      canManageSales = first.canManageSales;
      canViewReports = first.canViewReports;
      canManageInventory = first.canManageInventory;
      canManageSupply = first.canManageSupply;
      canManageCashbox = first.canManageCashbox;
      canManageSubscriptions = first.canManageSubscriptions;
      canManageStores = first.canManageStores;
    }
    bool canAccessMultipleStores = json['can_access_multiple_stores'] ?? false;

    return EmployeeProfile(
      id: json['id'] ?? 0,
      photo: photoUrl,
      storeId: json['store'],
      storeName: json['store_name'],
      roleId: json['role'],
      roleName: json['role_name'] ?? '',
      department: json['department'],
      salary: json['salary'] != null ? (json['salary'] as num).toDouble() : null,
      emergencyContact: json['emergency_contact']?.toString(),
      hireDate: DateTime.tryParse(json['hire_date'] ?? ''),
      canManageEmployees: canManageEmployees,
      canManageProducts: canManageProducts,
      canManageStores: canManageStores,
      canManageSales: canManageSales,
      canViewReports: canViewReports,
      canManageInventory: canManageInventory,
      canManageSupply: canManageSupply,
      canManageCashbox: canManageCashbox,
      canManageSubscriptions: canManageSubscriptions,
      canAccessMultipleStores: canAccessMultipleStores,
      assignedStores:
          (json['assigned_stores'] as List?)
              ?.map((s) => AssignedStore.fromJson(s))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'photo': photo,
      'store': storeId,
      'store_name': storeName,
      'role_name': roleName,
      'department': department,
      'can_manage_employees': canManageEmployees,
      'can_manage_products': canManageProducts,
      'can_manage_sales': canManageSales,
      'can_view_reports': canViewReports,
      'can_manage_inventory': canManageInventory,
      'can_manage_supply': canManageSupply,
      'can_manage_cashbox': canManageCashbox,
      'can_manage_subscriptions': canManageSubscriptions,
      'can_access_multiple_stores': canAccessMultipleStores,
      'assigned_stores': assignedStores.map((s) => s.toJson()).toList(),
    };
  }
}

// ============================================================================
// PROFIL ACTIONNAIRE
// ============================================================================

class ShareholderProfile {
  final int id;
  final double investmentAmount;
  final String? photo;

  ShareholderProfile({
    required this.id,
    required this.investmentAmount,
    this.photo,
  });

  factory ShareholderProfile.fromJson(Map<String, dynamic> json) {
    return ShareholderProfile(
      id: json['id'] ?? 0,
      investmentAmount: (json['investment_amount'] ?? 0).toDouble(),
      photo: json['photo'],
    );
  }

  Map<String, dynamic> toJson() {
    return {'id': id, 'investment_amount': investmentAmount, 'photo': photo};
  }
}

// ============================================================================
// PROFIL CLIENT
// ============================================================================

class CustomerProfile {
  final int id;
  final int loyaltyPoints;
  final double totalSpent;
  final DateTime? firstPurchase;
  final DateTime? lastPurchase;
  final String? photo;

  CustomerProfile({
    required this.id,
    required this.loyaltyPoints,
    required this.totalSpent,
    this.firstPurchase,
    this.lastPurchase,
    this.photo,
  });

  factory CustomerProfile.fromJson(Map<String, dynamic> json) {
    return CustomerProfile(
      id: json['id'] ?? 0,
      loyaltyPoints: json['loyalty_points'] ?? 0,
      totalSpent: (json['total_spent'] ?? 0).toDouble(),
      firstPurchase: json['first_purchase'] != null
          ? DateTime.tryParse(json['first_purchase'])
          : null,
      lastPurchase: json['last_purchase'] != null
          ? DateTime.tryParse(json['last_purchase'])
          : null,
      photo: json['photo'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'loyalty_points': loyaltyPoints,
      'total_spent': totalSpent,
      'first_purchase': firstPurchase?.toIso8601String(),
      'last_purchase': lastPurchase?.toIso8601String(),
      'photo': photo,
    };
  }
}
