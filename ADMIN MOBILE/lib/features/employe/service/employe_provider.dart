// lib/features/employe/service/employe_provider.dart
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/user_model.dart';
import 'package:nsp_pos_mobile/features/employe/viewmodel/employe_model.dart';

class EmployeeProvider extends ChangeNotifier {
  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  final AuthService _authService;

  bool _isLoading = false;

  String? _errorMessage;
  List<Employee> _employees = [];
  List<Map<String, dynamic>> _stores = [];
  List<Map<String, dynamic>> _roles = [];
  Map<String, dynamic>? _stats;

  // Pagination
  bool _hasMore = true;
  bool _isLoadingMore = false;

  // Boutique sélectionnée
  int? _selectedStoreId;

  // Getters
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  String? get errorMessage => _errorMessage;

  List<Employee> get employees {
    try {
      final currentUser = _authService.currentUser;
      final currentEmployeeId = currentUser?.employeeProfile?.id;

      if (currentUser == null) {
        return _employees;
      }

      if (currentUser.employeeProfile == null) {
        return _employees;
      }

      return _employees
          .where((employee) => employee.id != currentEmployeeId)
          .toList();
    } catch (e) {
      return _employees;
    }
  }

  List<Map<String, dynamic>> get stores => _stores;
  List<Map<String, dynamic>> get roles => _roles;
  Map<String, dynamic>? get stats => _stats;
  bool get hasMore => _hasMore;
  int? get selectedStoreId => _selectedStoreId;

  EmployeeProvider(this._authService) {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null && status < 500,
    );
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  Future<List<Employee>> fetchEmployees({
    int? storeId,
    bool refresh = false,
  }) async {
    if (refresh) {
      _employees = [];
      _hasMore = true;
    }

    _isLoading = _employees.isEmpty;
    if (!_isLoading) _isLoadingMore = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      String url = '${baseUrl}employees/my_employees/';
      if (storeId != null) url += '?store=$storeId';

      final response = await _dio.get(
        url,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        final newEmployees = data
            .map((json) => Employee.fromJson(json))
            .toList();
        if (refresh) {
          _employees = newEmployees;
        } else {
          _employees.addAll(newEmployees);
        }

        _hasMore = response.data['next'] != null;

        notifyListeners();
        return _employees;
      }
      return [];
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
      notifyListeners();
      return [];
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return [];
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  Future<List<Map<String, dynamic>>> fetchStores() async {
    try {
      final token = await _storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        '${baseUrl}stores/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _stores = data
            .map((store) => {'id': store['id'], 'name': store['name']})
            .toList();
        notifyListeners();
        return _stores;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> fetchRoles() async {
    try {
      final token = await _storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        '${baseUrl}employee-roles/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _roles = data
            .map(
              (role) => {
                'id': role['id'],
                'name': role['name'],
                'code': role['code'],
                'can_access_multiple_stores':
                    role['can_access_multiple_stores'] ?? false,
                'permissions': role['permissions'] ?? {},
              },
            )
            .toList();
        notifyListeners();
        return _roles;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> fetchStats() async {
    try {
      final token = await _storage.getToken();
      if (token == null) return {};

      final response = await _dio.get(
        '${baseUrl}employees/stats/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        _stats = response.data;
        notifyListeners();
        return _stats!;
      }
      return {};
    } catch (e) {
      return {};
    }
  }

  Future<void> loadAllData({int? storeId}) async {
    _isLoading = true;
    _selectedStoreId = storeId;
    notifyListeners();

    try {
      await Future.wait([
        fetchStores(),
        fetchRoles(),
        fetchEmployees(storeId: storeId, refresh: true),
        fetchStats(),
      ]);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== CRUD EMPLOYÉS ====================

  Future<Map<String, dynamic>> createEmployee({
    required String username,
    required String firstName,
    required String lastName,
    required String email,
    required String phone,
    String? address,
    required String password,
    required int storeId,
    required int roleId,
    int? departmentId,
    DateTime? hireDate,
    double? salary,
    String? emergencyContact,
    Uint8List? photo,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final formData = FormData.fromMap({
        'username': username,
        'first_name': firstName,
        'last_name': lastName,
        'email': email,
        'phone': phone,
        'address': address ?? '',
        'password': password,
        'password_confirm': password,
        'store_id': storeId,
        'role_id': roleId,
        'hire_date': (hireDate ?? DateTime.now()).toIso8601String().split(
          'T',
        )[0],
        'salary': salary?.toString() ?? '',
        'emergency_contact': emergencyContact ?? '',
      });

      if (departmentId != null) {
        formData.fields.add(MapEntry('department_id', departmentId.toString()));
      }

      if (photo != null) {
        formData.files.add(
          MapEntry(
            'photo',
            MultipartFile.fromBytes(
              photo,
              filename: 'profile_${DateTime.now().millisecondsSinceEpoch}.jpg',
            ),
          ),
        );
      }

      final response = await _dio.post(
        '${baseUrl}employees/',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      if (response.statusCode == 201) {
        final newEmployee = Employee.fromJson(response.data);
        _employees.insert(0, newEmployee);
        await fetchStats();
        notifyListeners();

        return {
          'status': true,
          'message': 'Employé créé avec succès',
          'employee': newEmployee,
        };
      }
      return {
        'status': false,
        'message': 'Erreur ${response.statusCode}: ${response.data}',
      };
    } on DioException catch (e) {
      final errorMsg = _handleDioError(e);
      return {'status': false, 'message': errorMsg};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Dans employe_provider.dart, modifiez la méthode updateEmployee :

  Future<Map<String, dynamic>> updateEmployee({
    required int employeeId,
    String? firstName,
    String? lastName,
    String? email,
    String? phone,
    String? address,
    int? storeId,
    int? roleId,
    int? departmentId,
    DateTime? hireDate,
    double? salary,
    String? emergencyContact,
    List<int>? assignedStoreIds,
    bool? isActive,
    Uint8List? photo,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      // Récupérer l'employé existant
      final existingEmployee = _employees.firstWhere(
        (e) => e.id == employeeId,
        orElse: () => throw Exception('Employé non trouvé'),
      );

      final formData = FormData();

      final hireDateValue = hireDate ?? existingEmployee.hireDate;
      formData.fields.add(
        MapEntry('hire_date', hireDateValue.toIso8601String().split('T')[0]),
      );

      final storeIdValue = storeId ?? existingEmployee.storeId;
      formData.fields.add(MapEntry('store', storeIdValue.toString()));

      final roleIdValue = roleId ?? existingEmployee.roleId;
      formData.fields.add(MapEntry('role', roleIdValue.toString()));

      // Champs utilisateur
      final finalFirstName = firstName ?? existingEmployee.firstName;
      if (finalFirstName.isNotEmpty) {
        formData.fields.add(MapEntry('first_name', finalFirstName));
      }

      final finalLastName = lastName ?? existingEmployee.lastName;
      if (finalLastName.isNotEmpty) {
        formData.fields.add(MapEntry('last_name', finalLastName));
      }

      final finalEmail = email ?? existingEmployee.email;
      if (finalEmail.isNotEmpty) {
        formData.fields.add(MapEntry('email', finalEmail));
      }

      final finalPhone = phone ?? existingEmployee.phone;
      if (finalPhone.isNotEmpty) {
        formData.fields.add(MapEntry('phone', finalPhone));
      }

      if (address != null) {
        formData.fields.add(MapEntry('address', address));
      } else if (existingEmployee.address != null &&
          existingEmployee.address!.isNotEmpty) {
        formData.fields.add(MapEntry('address', existingEmployee.address!));
      }

      if (departmentId != null) {
        formData.fields.add(MapEntry('department_id', departmentId.toString()));
      }

      if (salary != null) {
        formData.fields.add(MapEntry('salary', salary.toString()));
      }

      if (emergencyContact != null) {
        formData.fields.add(MapEntry('emergency_contact', emergencyContact));
      }

      if (assignedStoreIds != null && assignedStoreIds.isNotEmpty) {
        // Envoyer comme une liste JSON valide
        formData.fields.add(
          MapEntry('assigned_store_ids', assignedStoreIds.join(',')),
        );
      }

      if (isActive != null) {
        formData.fields.add(MapEntry('is_active', isActive.toString()));
      } else {
        formData.fields.add(MapEntry('is_active', 'true'));
      }

      if (photo != null) {
        formData.files.add(
          MapEntry(
            'photo',
            MultipartFile.fromBytes(
              photo,
              filename: 'profile_${DateTime.now().millisecondsSinceEpoch}.jpg',
            ),
          ),
        );
      }

      final response = await _dio.put(
        '${baseUrl}employees/$employeeId/',
        data: formData,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'multipart/form-data',
          },
        ),
      );
      if (response.statusCode == 200) {
        final updatedEmployee = Employee.fromJson(response.data);

        // Mettre à jour l'employé dans la liste locale
        final index = _employees.indexWhere((e) => e.id == employeeId);
        if (index != -1) {
          _employees[index] = updatedEmployee;
        }

        await fetchStats();
        notifyListeners();

        return {
          'status': true,
          'message': 'Employé mis à jour avec succès',
          'employee': updatedEmployee,
        };
      }
      return {
        'status': false,
        'message': 'Erreur ${response.statusCode}: ${response.data}',
      };
    } on DioException catch (e) {
      final errorMsg = _handleDioError(e);
      print('e.response?.data: ${e.response?.data}');
      print('Erreur lors de la mise à jour de l\'employé: $errorMsg');
      return {'status': false, 'message': errorMsg};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> deleteEmployee(int employeeId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.delete(
        '${baseUrl}employees/$employeeId/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 204) {
        _employees.removeWhere((e) => e.id == employeeId);
        await fetchStats();
        notifyListeners();

        return {'status': true, 'message': 'Employé supprimé avec succès'};
      }

      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } on DioException catch (e) {
      final errorMsg = _handleDioError(e);
      return {'status': false, 'message': errorMsg};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> toggleEmployeeStatus(int employeeId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}employees/$employeeId/toggle_active/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final updatedEmployee = Employee.fromJson(response.data);
        final index = _employees.indexWhere((e) => e.id == employeeId);
        if (index != -1) {
          _employees[index] = updatedEmployee;
        }
        notifyListeners();

        return {
          'status': true,
          'message': updatedEmployee.isActive
              ? 'Employé activé'
              : 'Employé désactivé',
          'employee': updatedEmployee,
        };
      }

      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } on DioException catch (e) {
      return {'status': false, 'message': _handleDioError(e)};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ==================== ASSIGNATION À PLUSIEURS BOUTIQUES ====================

  // Dans EmployeeProvider
  Future<List<AssignedStore>> fetchAssignedStores(int employeeId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}employees/$employeeId/assigned_stores/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        return data.map((json) => AssignedStore.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> assignEmployeeToStores({
    required int employeeId,
    required List<int> storeIds,
    required String permissionType,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}employees/assign_to_store/',
        data: {
          'employee_id': employeeId,
          'store_ids': storeIds,
          'permission_type': permissionType,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        await fetchEmployees(refresh: true);
        return {
          'status': true,
          'message':
              response.data['message'] ??
              'Employé assigné aux boutiques avec succès',
          'assigned_stores': response.data['assigned_stores'] ?? [],
        };
      }

      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } on DioException catch (e) {
      final errorMsg = _handleDioError(e);
      return {'status': false, 'message': errorMsg};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> assignEmployeeToStore({
    required int employeeId,
    required int storeId,
    required String permissionType,
  }) async {
    return assignEmployeeToStores(
      employeeId: employeeId,
      storeIds: [storeId],
      permissionType: permissionType,
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  void setSelectedStoreId(int? storeId) {
    _selectedStoreId = storeId;
    notifyListeners();
  }

  List<Employee> searchEmployees(String query) {
    if (query.isEmpty) return _employees;
    return _employees.where((emp) {
      return emp.fullName.toLowerCase().contains(query.toLowerCase()) ||
          emp.email.toLowerCase().contains(query.toLowerCase()) ||
          emp.phone.contains(query);
    }).toList();
  }

  List<Employee> getEmployeesByStore(int? storeId) {
    final currentEmployeeId = _authService.currentUser?.employeeProfile?.id;

    Iterable<Employee> filteredEmployees = _employees;
    if (storeId != null) {
      filteredEmployees = filteredEmployees.where(
        (emp) => emp.storeId == storeId,
      );
    }

    if (currentEmployeeId != null) {
      filteredEmployees = filteredEmployees.where(
        (emp) => emp.id != currentEmployeeId,
      );
    }

    return filteredEmployees.toList();
  }

  List<String> getUniqueRoleNames() {
    return _roles.map((r) => r['name'] as String).toList();
  }

  List<String> getUniqueStoreNames() {
    return _stores.map((s) => s['name'] as String).toList();
  }

  List<Map<String, dynamic>> getStoresForDropdown() {
    return _stores;
  }

  List<Map<String, dynamic>> getRolesForDropdown() {
    return _roles;
  }

  int? getRoleIdByName(String roleName) {
    final role = _roles.firstWhere(
      (r) => r['name'] == roleName,
      orElse: () => {},
    );
    return role['id'];
  }

  int? getStoreIdByName(String storeName) {
    final store = _stores.firstWhere(
      (s) => s['name'] == storeName,
      orElse: () => {},
    );
    return store['id'];
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  String _handleDioError(DioException e) {
    if (e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map) {
        if (data.containsKey('error')) return data['error'];
        if (data.containsKey('message')) return data['message'];
        if (data.containsKey('non_field_errors')) {
          return (data['non_field_errors'] as List).join(', ');
        }
        final firstError = data.values.first;
        if (firstError is List && firstError.isNotEmpty) {
          return firstError.first;
        }
      }
    }
    return e.message ?? 'Erreur de connexion';
  }
}
