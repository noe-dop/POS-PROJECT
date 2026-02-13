import 'package:flutter/foundation.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class TypesProduitsViewModel extends ChangeNotifier {
  List<TypeProduit> _typesProduits = [];
  String _searchQuery = '';
  bool _isLoading = false;
  TypeProduit? _selectedType;
  bool _showGrandsTypesOnly = true;
  TypeProduit? _selectedGrandType;

  List<TypeProduit> get typesProduits => _typesProduits;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  TypeProduit? get selectedType => _selectedType;
  bool get showGrandsTypesOnly => _showGrandsTypesOnly;
  TypeProduit? get selectedGrandType => _selectedGrandType;

  List<TypeProduit> get grandsTypes =>
      _typesProduits.where((type) => type.isGrandType).toList();

  List<TypeProduit> get filteredTypes {
    List<TypeProduit> sourceList;

    if (_selectedGrandType != null) {
      // Afficher les sous-types du grand type sélectionné
      sourceList = _selectedGrandType!.sousTypes;
    } else if (_showGrandsTypesOnly) {
      // Afficher uniquement les grands types
      sourceList = grandsTypes;
    } else {
      // Afficher tous les types
      sourceList = _typesProduits;
    }

    if (_searchQuery.isEmpty) {
      return sourceList;
    }

    return sourceList
        .where(
          (type) => type.nom.toLowerCase().contains(_searchQuery.toLowerCase()),
        )
        .toList();
  }

  int get totalProduits {
    if (_selectedGrandType != null) {
      // Somme des produits du grand type et de ses sous-types
      int total = _selectedGrandType!.nombreProduits;
      for (var sousType in _selectedGrandType!.sousTypes) {
        total += sousType.nombreProduits;
      }
      return total;
    }

    // Total de tous les produits
    return _typesProduits.fold(0, (sum, type) => sum + type.nombreProduits);
  }

  TypesProduitsViewModel() {
    _loadInitialData();
  }

  void _loadInitialData() {
    _isLoading = true;
    notifyListeners();

    // Données initiales (simulées)
    Future.delayed(const Duration(milliseconds: 500), () {
      _typesProduits = [
        TypeProduit(
          id: '1',
          nom: 'Électronique',
          nombreProduits: 150,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '1_1',
              nom: 'Téléphones',
              nombreProduits: 80,
              dateCreation: DateTime.now(),
              parentId: '1',
              isSousType: true,
            ),
            TypeProduit(
              id: '1_2',
              nom: 'Ordinateurs',
              nombreProduits: 50,
              dateCreation: DateTime.now(),
              parentId: '1',
              isSousType: true,
            ),
            TypeProduit(
              id: '1_3',
              nom: 'Accessoires',
              nombreProduits: 20,
              dateCreation: DateTime.now(),
              parentId: '1',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
        TypeProduit(
          id: '2',
          nom: 'Vêtements',
          nombreProduits: 320,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '2_1',
              nom: 'Hommes',
              nombreProduits: 150,
              dateCreation: DateTime.now(),
              parentId: '2',
              isSousType: true,
            ),
            TypeProduit(
              id: '2_2',
              nom: 'Femmes',
              nombreProduits: 120,
              dateCreation: DateTime.now(),
              parentId: '2',
              isSousType: true,
            ),
            TypeProduit(
              id: '2_3',
              nom: 'Enfants',
              nombreProduits: 50,
              dateCreation: DateTime.now(),
              parentId: '2',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
        TypeProduit(
          id: '3',
          nom: 'Maison',
          nombreProduits: 85,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '3_1',
              nom: 'Mobilier',
              nombreProduits: 40,
              dateCreation: DateTime.now(),
              parentId: '3',
              isSousType: true,
            ),
            TypeProduit(
              id: '3_2',
              nom: 'Décoration',
              nombreProduits: 25,
              dateCreation: DateTime.now(),
              parentId: '3',
              isSousType: true,
            ),
            TypeProduit(
              id: '3_3',
              nom: 'Électroménager',
              nombreProduits: 20,
              dateCreation: DateTime.now(),
              parentId: '3',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
        TypeProduit(
          id: '4',
          nom: 'Alimentation',
          nombreProduits: 210,
          dateCreation: DateTime.now(),
        ),
        TypeProduit(
          id: '5',
          nom: 'Livres et Papeterie',
          nombreProduits: 400,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '4_1',
              nom: 'Riz',
              nombreProduits: 50,
              dateCreation: DateTime.now(),
              parentId: '4',
              isSousType: true,
            ),
            TypeProduit(
              id: '4_2',
              nom: 'Eau',
              nombreProduits: 30,
              dateCreation: DateTime.now(),
              parentId: '4',
              isSousType: true,
            ),
            TypeProduit(
              id: '4_3',
              nom: 'Huile',
              nombreProduits: 25,
              dateCreation: DateTime.now(),
              parentId: '4',
              isSousType: true,
            ),
            TypeProduit(
              id: '4_4',
              nom: 'Sardine',
              nombreProduits: 35,
              dateCreation: DateTime.now(),
              parentId: '4',
              isSousType: true,
            ),
            TypeProduit(
              id: '4_5',
              nom: 'Farine',
              nombreProduits: 40,
              dateCreation: DateTime.now(),
              parentId: '4',
              isSousType: true,
            ),
            TypeProduit(
              id: '4_6',
              nom: 'Biere',
              nombreProduits: 30,
              dateCreation: DateTime.now(),
              parentId: '4',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 6,
        ),
        TypeProduit(
          id: '5',
          nom: 'Beauté',
          nombreProduits: 120,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '5_1',
              nom: 'Soins visage',
              nombreProduits: 40,
              dateCreation: DateTime.now(),
              parentId: '5',
              isSousType: true,
            ),
            TypeProduit(
              id: '5_2',
              nom: 'Parfums',
              nombreProduits: 30,
              dateCreation: DateTime.now(),
              parentId: '5',
              isSousType: true,
            ),
            TypeProduit(
              id: '5_3',
              nom: 'Maquillage',
              nombreProduits: 50,
              dateCreation: DateTime.now(),
              parentId: '5',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
        TypeProduit(
          id: '6',
          nom: 'Enfants',
          nombreProduits: 180,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '6_1',
              nom: 'Jouets',
              nombreProduits: 80,
              dateCreation: DateTime.now(),
              parentId: '6',
              isSousType: true,
            ),
            TypeProduit(
              id: '6_2',
              nom: 'Vêtements bébé',
              nombreProduits: 60,
              dateCreation: DateTime.now(),
              parentId: '6',
              isSousType: true,
            ),
            TypeProduit(
              id: '6_3',
              nom: 'Puériculture',
              nombreProduits: 40,
              dateCreation: DateTime.now(),
              parentId: '6',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
        TypeProduit(
          id: '7',
          nom: 'Sport',
          nombreProduits: 95,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '7_1',
              nom: 'Équipement',
              nombreProduits: 40,
              dateCreation: DateTime.now(),
              parentId: '7',
              isSousType: true,
            ),
            TypeProduit(
              id: '7_2',
              nom: 'Vêtements sport',
              nombreProduits: 35,
              dateCreation: DateTime.now(),
              parentId: '7',
              isSousType: true,
            ),
            TypeProduit(
              id: '7_3',
              nom: 'Nutrition',
              nombreProduits: 20,
              dateCreation: DateTime.now(),
              parentId: '7',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
        TypeProduit(
          id: '8',
          nom: 'Auto',
          nombreProduits: 110,
          dateCreation: DateTime.now(),
          sousTypes: [
            TypeProduit(
              id: '8_1',
              nom: 'Pièces détachées',
              nombreProduits: 60,
              dateCreation: DateTime.now(),
              parentId: '8',
              isSousType: true,
            ),
            TypeProduit(
              id: '8_2',
              nom: 'Accessoires',
              nombreProduits: 30,
              dateCreation: DateTime.now(),
              parentId: '8',
              isSousType: true,
            ),
            TypeProduit(
              id: '8_3',
              nom: 'Entretien',
              nombreProduits: 20,
              dateCreation: DateTime.now(),
              parentId: '8',
              isSousType: true,
            ),
          ],
          nombreSousTypes: 3,
        ),
      ];
      _isLoading = false;
      notifyListeners();
    });
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void selectType(TypeProduit type) {
    _selectedType = type;
    notifyListeners();
  }

  void clearSelection() {
    _selectedType = null;
    _selectedGrandType = null;
    notifyListeners();
  }

  void selectGrandType(TypeProduit? grandType) {
  _selectedGrandType = grandType;
  _selectedType = null;
  notifyListeners();
  }

  void toggleShowGrandsTypesOnly() {
    _showGrandsTypesOnly = !_showGrandsTypesOnly;
    _selectedGrandType = null;
    notifyListeners();
  }

  Future<void> addGrandType(String nom) async {
    _isLoading = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 300));
    
    final newType = TypeProduit(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      nom: nom,
      nombreProduits: 0,
      dateCreation: DateTime.now(),
    );
    
    _typesProduits = [..._typesProduits, newType];
    _isLoading = false;
    notifyListeners();
  }

  Future<void> addSousType(String nom, String parentId) async {
    _isLoading = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 300));
    
    final parentIndex = _typesProduits.indexWhere((type) => type.id == parentId);
    if (parentIndex != -1) {
      final parent = _typesProduits[parentIndex];
      final newSousType = TypeProduit(
        id: '${parentId}_${DateTime.now().millisecondsSinceEpoch}',
        nom: nom,
        nombreProduits: 0,
        dateCreation: DateTime.now(),
        parentId: parentId,
        isSousType: true,
      );
      
      final updatedParent = parent.copyWith(
        sousTypes: [...parent.sousTypes, newSousType],
        nombreSousTypes: parent.sousTypes.length + 1,
      );
      
      _typesProduits = [
        for (var type in _typesProduits)
          if (type.id == parentId) updatedParent else type,
      ];
    }
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> deleteType(String id) async {
    _isLoading = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 300));
    
    // Vérifier si c'est un grand type
    final typeIndex = _typesProduits.indexWhere((type) => type.id == id);
    
    if (typeIndex != -1) {
      // C'est un grand type, le supprimer
      _typesProduits = _typesProduits.where((type) => type.id != id).toList();
    } else {
      // C'est un sous-type, le chercher dans les sous-types
      for (var grandType in _typesProduits) {
        final sousTypeIndex = grandType.sousTypes.indexWhere((st) => st.id == id);
        if (sousTypeIndex != -1) {
          final updatedSousTypes = List<TypeProduit>.from(grandType.sousTypes);
          updatedSousTypes.removeAt(sousTypeIndex);
          
          final updatedGrandType = grandType.copyWith(
            sousTypes: updatedSousTypes,
            nombreSousTypes: updatedSousTypes.length,
          );
          
          _typesProduits = _typesProduits.map((type) {
            return type.id == grandType.id ? updatedGrandType : type;
          }).toList();
          break;
        }
      }
    }
    
    if (_selectedType?.id == id) {
      _selectedType = null;
    }
    
    if (_selectedGrandType?.id == id) {
      _selectedGrandType = null;
    }
    
    _isLoading = false;
    notifyListeners();
  }

  Future<void> updateType(String id, String newNom) async {
    _isLoading = true;
    notifyListeners();

    await Future.delayed(const Duration(milliseconds: 300));
    
    // Chercher d'abord dans les grands types
    final grandTypeIndex = _typesProduits.indexWhere((type) => type.id == id);
    
    if (grandTypeIndex != -1) {
      // Mettre à jour un grand type
      _typesProduits = _typesProduits.map((type) {
        if (type.id == id) {
          return type.copyWith(
            nom: newNom,
            dateModification: DateTime.now(),
          );
        }
        return type;
      }).toList();
    } else {
      // Chercher dans les sous-types
      for (var grandType in _typesProduits) {
        final sousTypeIndex = grandType.sousTypes.indexWhere((st) => st.id == id);
        if (sousTypeIndex != -1) {
          final updatedSousTypes = List<TypeProduit>.from(grandType.sousTypes);
          updatedSousTypes[sousTypeIndex] = updatedSousTypes[sousTypeIndex].copyWith(
            nom: newNom,
            dateModification: DateTime.now(),
          );
          
          final updatedGrandType = grandType.copyWith(
            sousTypes: updatedSousTypes,
          );
          
          _typesProduits = _typesProduits.map((type) {
            return type.id == grandType.id ? updatedGrandType : type;
          }).toList();
          break;
        }
      }
    }
    
    // Mettre à jour le type sélectionné
    if (_selectedType?.id == id) {
      final updatedType = _typesProduits.expand((gt) => [gt, ...gt.sousTypes])
          .firstWhere((type) => type.id == id);
      _selectedType = updatedType;
    }
    
    if (_selectedGrandType?.id == id) {
      _selectedGrandType = _typesProduits.firstWhere((type) => type.id == id);
    }
    
    _isLoading = false;
    notifyListeners();
  }

  void refresh() {
    _loadInitialData();
  }
}
