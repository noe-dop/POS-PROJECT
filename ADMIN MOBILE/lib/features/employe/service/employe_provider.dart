import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/dio_service.dart';
import 'package:nsp_pos_mobile/features/employe/viewmodel/employe_model.dart';

class EmployeeProvider extends ChangeNotifier {
  final DioService _dioService = DioService();
  
  List<Employee> _employees = [];
  List<Map<String, dynamic>> _boutiques = [];
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic>? _stats;

  List<Employee> get employees => _employees;
  List<Map<String, dynamic>> get boutiques => _boutiques;
  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get stats => _stats;
  EmployeeProvider() {
    initialize();
  }
  
  // Initialiser DIO
  void initialize() {
    _dioService.init();
  }

  // Charger tous les employés avec pagination
  Future<void> loadEmployees({int page = 1, int limit = 20}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _dioService.getEmployees();
      _employees = data.map((e) => Employee.fromJson(e)).toList();
      
      await loadBoutiques();
      await loadStats();
      
      _error = null;
    } catch (e) {
      _error = e.toString();
      print('Erreur chargement employés: $_error');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Charger les boutiques
  Future<void> loadBoutiques() async {
    try {
      final data = await _dioService.getBoutiques();
      _boutiques = List<Map<String, dynamic>>.from(data);
    } catch (e) {
      print('Erreur chargement boutiques: $e');
    }
  }

  // Charger les statistiques
  Future<void> loadStats() async {
    try {
      _stats = await _dioService.getEmployeeStats();
    } catch (e) {
      print('Erreur chargement stats: $e');
    }
  }

  // Ajouter un employé
  Future<bool> addEmployee(Employee employee) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await _dioService.createEmployee(employee.toJson());
      
      if (result.isNotEmpty) {
        final newEmployee = Employee.fromJson(result);
        _employees.add(newEmployee);
        await loadStats();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mettre à jour un employé
  Future<bool> updateEmployee(String id, Employee employee) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await _dioService.updateEmployee(id, employee.toJson());
      
      if (result.isNotEmpty) {
        final index = _employees.indexWhere((emp) => emp.id == id);
        if (index != -1) {
          _employees[index] = Employee.fromJson(result);
          notifyListeners();
          return true;
        }
      }
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Supprimer un employé
  Future<bool> deleteEmployee(String id) async {
    _isLoading = true;
    notifyListeners();

    try {
      final success = await _dioService.deleteEmployee(id);
      
      if (success) {
        _employees.removeWhere((emp) => emp.id == id);
        await loadStats();
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Télécharger une image de profil
  Future<String?> uploadProfileImage(Uint8List imageBytes, String filename) async {
    try {
      return await _dioService.uploadImage(imageBytes, filename);
    } catch (e) {
      _error = e.toString();
      return null;
    }
  }

  // Rechercher des employés
  Future<List<Employee>> searchEmployees(String query) async {
    try {
      final data = await _dioService.searchEmployees(query);
      return data.map((e) => Employee.fromJson(e)).toList();
    } catch (e) {
      print('Erreur recherche: $e');
      return [];
    }
  }

  // Filtrer les employés par boutique
  List<Employee> getEmployeesByBoutique(String? boutiqueName) {
    if (boutiqueName == null || boutiqueName.isEmpty) {
      return _employees;
    }
    
    return _employees.where((emp) => emp.boutique['name'] == boutiqueName).toList();
  }

  // Obtenir les rôles uniques
  List<String> getUniqueRoles() {
    final Set<String> roles = {};
    for (final emp in _employees) {
      roles.add(emp.role);
    }
    return roles.toList()..sort();
  }

  // Obtenir les noms de boutiques uniques
  List<String> getUniqueBoutiqueNames() {
    final Set<String> names = {};
    for (final emp in _employees) {
      names.add(emp.boutique['name'] as String);
    }
    return names.toList()..sort();
  }
}