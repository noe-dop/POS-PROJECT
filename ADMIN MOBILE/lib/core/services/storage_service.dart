import 'dart:convert';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  // Instance unique partagée (singleton)
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  // Future partagée pour éviter plusieurs appels à getInstance()
  late final Future<SharedPreferences> _prefsFuture = SharedPreferences.getInstance();

  // Clés constantes (privées)
  static const String _tokenKey = 'auth_token';
  static const String _userDataKey = 'user_data';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _selectedStoreKey = 'selectedStore_data';
  static const String _allStoresKey = 'allstores_data';

  // Méthode utilitaire pour récupérer l'instance (optionnel, mais garde la cohérence)
  Future<SharedPreferences> get _prefs => _prefsFuture;

  // --- Gestion du token ---
  Future<void> saveToken(String token) async {
    final prefs = await _prefs;
    await prefs.setString(_tokenKey, token);
  }

  Future<String?> getToken() async {
    final prefs = await _prefs;
    return prefs.getString(_tokenKey);
  }

  Future<void> saveRefreshToken(String refreshToken) async {
    final prefs = await _prefs;
    await prefs.setString(_refreshTokenKey, refreshToken);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await _prefs;
    return prefs.getString(_refreshTokenKey);
  }

  // --- Gestion des données utilisateur ---
  Future<void> saveUserData(Map<String, dynamic> userData) async {
    final prefs = await _prefs;
    await prefs.setString(_userDataKey, json.encode(userData));
  }

  Future<Map<String, dynamic>?> getUserData() async {
    final prefs = await _prefs;
    final data = prefs.getString(_userDataKey);
    if (data == null) return null;
    try {
      return Map<String, dynamic>.from(json.decode(data));
    } catch (e) {
      // En cas de corruption des données, on retourne null et on pourrait logger l'erreur
      return null;
    }
  }

  /// Retourne true si l'utilisateur est staff, false sinon (ou null si aucune donnée)
  Future<bool?> getStaffStatus() async {
    final userData = await getUserData();
    return userData?['is_staff'] as bool?;
  }

  // --- Gestion des magasins ---
  Future<void> saveSelectedStore(Map<String, dynamic> storeData) async {
    final prefs = await _prefs;
    await prefs.setString(_selectedStoreKey, json.encode(storeData));
  }

  Future<Map<String, dynamic>?> getSelectedStore() async {
    final prefs = await _prefs;
    final data = prefs.getString(_selectedStoreKey);
    if (data == null) return null;
    try {
      return Map<String, dynamic>.from(json.decode(data));
    } catch (e) {
      return null;
    }
  }

  /// Sauvegarde la liste complète des magasins avec leurs permissions
  Future<void> saveAllStores(List<StoreWithPermission> stores) async {
    final prefs = await _prefs;
    try {
      final storesMapList = stores.map((store) => store.toJson()).toList();
      await prefs.setString(_allStoresKey, json.encode(storesMapList));
    } catch (e) {
      // Logger l'erreur si nécessaire
      rethrow; // ou gérer silencieusement selon le besoin
    }
  }

  /// Récupère la liste des magasins (retourne null si aucune donnée)
  Future<List<StoreWithPermission>?> getAllStores() async {
    final prefs = await _prefs;
    final data = prefs.getString(_allStoresKey);
    if (data == null) return null;
    try {
      final List<dynamic> decoded = json.decode(data);
      return decoded.map((item) => StoreWithPermission.fromJson(item)).toList();
    } catch (e) {
      return null;
    }
  }

  // --- Nettoyage ---
  Future<void> clearToken() async {
    final prefs = await _prefs;
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
  }

  Future<void> clearUserData() async {
    final prefs = await _prefs;
    await prefs.remove(_userDataKey);
  }

  Future<void> clearSelectedStore() async {
    final prefs = await _prefs;
    await prefs.remove(_selectedStoreKey);
  }

  Future<void> clearAllStores() async {
    final prefs = await _prefs;
    await prefs.remove(_allStoresKey);
  }

  /// Efface toutes les données stockées
  Future<void> clearAll() async {
    final prefs = await _prefs;
    await prefs.clear();
  }
}