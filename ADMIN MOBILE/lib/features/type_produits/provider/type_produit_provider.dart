import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/network_utils.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class TypesProduitsViewModel extends ChangeNotifier {
  // String baseUrl = 'http://127.0.0.1:8000/api/';
  String baseUrl = 'https://eboutik-api.onrender.com/api/';
  static final _dio = Dio();
  static final storage = StorageService();

  bool _isloading = false;

  // Données
  List<CategoriePrincipale> _categoriesPrincipales = [];
  List<Groupe> _groupes = [];
  List<TypeProduit> _typesProduits = [];

  // Sélections
  CategoriePrincipale? _selectedCategoriePrincipale;
  Groupe? _selectedGroupe;
  TypeProduit? _selectedTypeProduit;

  // Recherche
  String _searchQuery = '';

  // Getters
  bool get isloading => _isloading;
  List<CategoriePrincipale> get categoriesPrincipales => _categoriesPrincipales;
  List<Groupe> get groupes => _groupes;
  List<TypeProduit> get typesProduits => _typesProduits;

  CategoriePrincipale? get selectedCategoriePrincipale =>
      _selectedCategoriePrincipale;
  Groupe? get selectedGroupe => _selectedGroupe;
  TypeProduit? get selectedTypeProduit => _selectedTypeProduit;

  String get searchQuery => _searchQuery;

  // Méthodes de sélection
  void selectCategoriePrincipale(CategoriePrincipale? cat) {
    _selectedCategoriePrincipale = cat;
    _selectedGroupe = null;
    _selectedTypeProduit = null;
    notifyListeners();
  }

  void selectGroupe(Groupe? groupe) {
    _selectedGroupe = groupe;
    _selectedTypeProduit = null;
    notifyListeners();
  }

  void selectTypeProduit(TypeProduit? type) {
    _selectedTypeProduit = type;
    notifyListeners();
  }

  // Recherche
  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  TypesProduitsViewModel() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null,
    );
    loadData();
  }

  // Filtres pour l'affichage
  List<Groupe?> get groupesFiltres {
    if (_selectedCategoriePrincipale == null) return [];
    // Récupérer tous les groupes de toutes les catégories principales
    List<Groupe> allGroupes = _categoriesPrincipales
        .expand((cat) => cat.group as List<Groupe>)
        .toList();
    // Filtrer ceux dont la catégorie principale correspond
    return allGroupes
        .where(
          (g) => g.categoriePrincipaleId == _selectedCategoriePrincipale!.id,
        )
        .where(
          (g) =>
              _searchQuery.isEmpty ||
              g.nom.toLowerCase().contains(_searchQuery.toLowerCase()),
        )
        .toList();
  }

  List<TypeProduit> get typesFiltres {
    if (_selectedGroupe == null) return [];

    // Récupère tous les types de toutes les catégories (via les groupes)
    List<TypeProduit> allTypes = _categoriesPrincipales
        .expand((cat) => cat.group ?? [])
        .expand<TypeProduit>((g) => g.typeproduit ?? [])
        .toList();

    // Filtre par groupe sélectionné et par recherche
    return allTypes
        .where((t) => t.groupeId == _selectedGroupe!.id)
        .where(
          (t) =>
              _searchQuery.isEmpty ||
              t.nom.toLowerCase().contains(_searchQuery.toLowerCase()),
        )
        .toList();
  }

  // Nombre total de produits (à calculer selon votre modèle produit)
  int get totalProduits {
    // Implémentez la logique réelle avec vos produits
    return 0;
  }

  // Méthodes pour les catégories principales
  Future<void> addCategoriePrincipale(
    Map<String,dynamic> newCategorie,
  ) async {
    try {
      final token = await storage.getToken();
      final response = await _dio.post(
        '${baseUrl}categories/',
        data: {
          'name': newCategorie['nom'],
          'description': newCategorie['description'],
          'parent': null,
          'is_active': true,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 201) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories(); // recharger les données
      } else {
        // Gérer erreur
        print('Erreur ajout catégorie: ${response.data}');
      }
    } catch (e) {
      print('Exception addCategoriePrincipale: $e');
    }
  }

  

  Future<void> fetchCategories() async {
    if (await isServerReachable(baseUrl) == false) {}
    try {
      final response = await _dio.get('${baseUrl}categories/tree/');
      if (response.statusCode == 200) {
        final List<dynamic> treeData = response.data['tree'] as List<dynamic>;
        _categoriesPrincipales = treeData
            .map(
              (categorie) => CategoriePrincipale.fromJson(
                categorie as Map<String, dynamic>,
              ),
            )
            .toList();
        _groupes = _categoriesPrincipales
            .expand((c) => c.group as List<Groupe>)
            .toList();
        _typesProduits = _groupes
            .expand((g) => g.typeproduit as List<TypeProduit>)
            .toList();
      } else {
        print(
          "Erreur de recuperation: ${response.data} - ${response.statusCode}",
        );
        _categoriesPrincipales = [];
      }
    } catch (e) {
      print("Erreur rencontrée :$e");
    } finally {
      notifyListeners();
    }
  }

  // Méthodes pour les groupes
  // Ajout d'un gtokenroupe
  Future<void> addGroupe(
    Groupe group
  ) async {
    final token = await storage.getToken();
    if (token == null) return;
    try {
      _isloading = true;
      notifyListeners();
      final response = await _dio.post(
        '${baseUrl}categories/',
        data: {
          'name': group.nom,
          'description': group.description,
          'parent': group.categoriePrincipaleId,
          'is_active': true,
        },
        options: Options(headers: {"Authorization": 'Bearer $token'}),
      );
      if (response.statusCode == 201) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
      } else {
        print('Erreur ajout groupe: ${response.data}');
      }
    } catch (e) {
      print('Exception addGroupe: $e');
    } finally {
      _isloading = false;
      notifyListeners();
    }
  }

  // Méthodes pour les types de produits
  Future<void> addTypeProduit(
    TypeProduit type
    ) async {
    final token = await storage.getToken();
    if (token == null) return;
    try {
      _isloading = true;
      notifyListeners();
      final response = await _dio.post(
        '${baseUrl}categories/',
        data: {
          'name': type.nom,
          'description': '',
          'parent': type.groupeId,
          'is_active': true,
        },
        options: Options(headers: {"Authorization": 'Bearer $token'}),
      );
      if (response.statusCode == 201) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
      } else {
        print('Erreur ajout type: ${response.data}');
      }
    } catch (e) {
      print('Exception addTypeProduit: $e');
    } finally {
      _isloading = false;
      notifyListeners();
    }
  }

  // Mise à jour (immuable)
  Future<void> updateCategoriePrincipale(
    int id,
    Map<String, dynamic> newValue,
  ) async {
    final cat = _categoriesPrincipales.firstWhere((c) => c.id == id);
    try {
      final token = await storage.getToken();
      final response = await _dio.put(
        '${baseUrl}categories/$id/',
        data: {
          'name': newValue['nom'] ?? cat.nom,
          'description': newValue["description"] ?? cat.description,
          'parent': null,
          'is_active': true,
          'slug': cat.slug, // ou laisser le backend le générer?
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
      } else {
        print('Erreur update catégorie: ${response.data}');
      }
    } catch (e) {
      print('Exception updateCategoriePrincipale: $e');
    }
  }

  Future<void> updateGroupe(int id, Groupe newGroup) async {
    final token = await storage.getToken();
    if (token == null) return;
    final groupe = _groupes.firstWhere((g) => g.id == id);
    try {
      _isloading = true;
      notifyListeners();
      final response = await _dio.put('${baseUrl}categories/$id/',
          data: {
            'name': newGroup.nom,
            'description': newGroup.description,
            'parent': newGroup.categoriePrincipaleId,
            'is_active': true,
            'slug': groupe.slug,
          },
          options: Options(headers: {"Authorization": 'Bearer $token'}));
      if (response.statusCode == 200) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
      } else {
        print('Erreur update groupe: ${response.data}');
      }
    } catch (e) {
      print('Exception updateGroupe: $e');
    } finally {
      _isloading = false;
      notifyListeners();
    }
  }

  Future<void> updateTypeProduit(int id, TypeProduit newType) async {
    final token = await storage.getToken();
    if (token == null) return;
    final type = _typesProduits.firstWhere((t) => t.id == id);
    try {
      _isloading = true;
      notifyListeners();
      final response = await _dio.put('${baseUrl}categories/$id/',
          data: {
            'name': newType.nom,
            'description': '',
            'parent': newType.groupeId,
            'is_active': true,
            'slug': type.slug,
          },
          options: Options(headers: {"Authorization": 'Bearer $token'}));
      if (response.statusCode == 200) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
      } else {
        print('Erreur update type: ${response.data}');
      }
    } catch (e) {
      print('Exception updateTypeProduit: $e');
    } finally {
      _isloading = false;
      notifyListeners();
    }
  }

  // Suppression
  Future<void> deleteCategoriePrincipale(int id) async {
    try {
      final token = await storage.getToken();
      final response = await _dio.delete(
        '${baseUrl}categories/$id/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 204) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
        if (_selectedCategoriePrincipale?.id == id) {
          _selectedCategoriePrincipale= null;
          _selectedGroupe = null;
          _selectedTypeProduit = null;
        }
      } else {
        print('Erreur suppression catégorie: ${response.data}');
      }
    } catch (e) {
      print('Exception deleteCategoriePrincipale: $e');
    }
  }

  // Suppression groupe
  Future<void> deleteGroupe(int id) async {
    final token = await storage.getToken();
    if (token == null) return;
    try {
      _isloading = true;
      notifyListeners();
      final response = await _dio.delete('${baseUrl}categories/$id/',
          options: Options(headers: {"Authorization" : 'Bearer $token'}));
      if (response.statusCode == 204) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
        if (_selectedGroupe?.id == id) {
          _selectedGroupe = null;
          _selectedTypeProduit = null;
        }
      } else {
        print('Erreur suppression groupe: ${response.data}');
      }
    } catch (e) {
      print('Exception deleteGroupe: $e');
    } finally {
      _isloading = false;
      notifyListeners();
    }
  }

  // Suppression type
  Future<void> deleteTypeProduit(int id) async {
    final token = await storage.getToken();
    if (token == null) return;
    try {
      _isloading = true;
      notifyListeners();
      final response = await _dio.delete('${baseUrl}categories/$id/',
          options: Options(headers: {"Authorization" : 'Bearer $token'}));
      if (response.statusCode == 204) {
        await Future.delayed(Duration(seconds: 1));
        await fetchCategories();
        if (_selectedTypeProduit?.id == id) {
          _selectedTypeProduit = null;
        }
      } else {
        print('Erreur suppression type: ${response.data}');
      }
    } catch (e) {
      print('Exception deleteTypeProduit: $e');
    } finally {
      _isloading = false;
      notifyListeners();
    }
  }

  // Initialisation avec des données
  void loadData() async {
    if (_isloading) return;
    _isloading = true;
    await fetchCategories();
    _isloading = false;
    notifyListeners();
  }
}
