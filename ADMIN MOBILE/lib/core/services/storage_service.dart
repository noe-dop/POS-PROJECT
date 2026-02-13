import 'dart:convert';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  // CORRIGEZ CES CONSTANTES - elles ne doivent pas être null !
  static const String _tokenKey = 'auth_token';
  static const String _userDataKey = 'user_data';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _selectedStore = 'selectedStore_data';
  static const String _allStores = "allstores_data";

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> saveRefreshToken(String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_refreshTokenKey, refreshToken);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }

  Future<void> saveUserData(Map<String, dynamic> userData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userDataKey, json.encode(userData));
  }

  Future<Map<String, dynamic>?> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_userDataKey);
    return data != null ? Map<String, dynamic>.from(json.decode(data)) : null;
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
  }

  Future<void> clearUserData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userDataKey);
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  // Stores
  Future<Map<String,dynamic>?> getSelectedStore() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_selectedStore);
    return data != null ? Map<String, dynamic>.from(json.decode(data)) : null;
  }

  Future<void> saveAllStoresData (List<StoreWithPermission>? stores) async {
    try {
    final prefs = await SharedPreferences.getInstance();
    
    // Convertir chaque StoreWithPermission en Map
    final List<Map<String, dynamic>> storesMapList = stores!
      .map((store) => store.toJson())
      .toList();
    
    // Encoder en JSON
    final String encodedStores = json.encode(storesMapList);
    
    // Sauvegarder
    await prefs.setString(_allStores, encodedStores);
    
  } catch (e) {
    print('❌ Erreur lors de la sauvegarde: $e');
    rethrow;
  }
}
  
  Future<Map<String , dynamic>?>  getAllStores() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_allStores);
    return data != null ? Map<String, dynamic>.from(json.decode(data)) : null;
  } 

}