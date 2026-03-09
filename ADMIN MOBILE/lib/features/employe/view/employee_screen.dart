import 'dart:typed_data';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/core/utils/password_generator.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_model.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/features/employe/service/employe_provider.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:nsp_pos_mobile/core/services/dio_service.dart';
import 'package:provider/provider.dart';

class EmployeeScreen extends StatefulWidget {
  const EmployeeScreen({super.key});

  @override
  State<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends State<EmployeeScreen> {
  final String currency = "FCFA";
  late final config = CurrencyConfig.currencies[currency];
  final DioService _dioService = DioService();

  final List<Map<String, dynamic>> listEmployee = [
    {
      "name": "Alice Dupont",
      "role": "Caissière",
      "boutique": {'id': 2, 'name': 'Boutique Centre'},
      "phone": "0123456789",
      "email": "",
      "salary": 300000,
      'hireDate': DateTime(2022, 5, 10),
      "address": "123 Rue Principale, Abidjan",
      "profileImage": null,
    },
    {
      "name": "John Smith",
      "role": "Manager",
      "boutique": {'id': 1, 'name': 'Boutique Principale'},
      "phone": "0987654321",
      "email": null,
      "salary": 500000,
      "hireDate": DateTime(2021, 3, 15),
      "address": "456 Avenue des Fleurs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Marie Curie",
      "role": "Serveuse",
      "boutique": {'id': 3, 'name': 'Boutique Sud'},
      "phone": "0112233445",
      "email": "mariecurie@example.com",
      "salary": 400000,
      "hireDate": DateTime(2023, 1, 20),
      "address": "123 Rue Principale, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Paul Martin",
      "role": "Chef de cuisine",
      "boutique": {'id': 2, 'name': 'Boutique Centre'},
      "phone": null,
      "email": "",
      "salary": 600000,
      "hireDate": DateTime(2020, 11, 5),
      "address": "456 Avenue des Fleurs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Sophie Laurent",
      "role": "Livreuse",
      "boutique": {'id': 1, 'name': 'Boutique Principale'},
      "phone": "0223344556",
      "email": "sophie.laurent@example.com",
      "salary": null,
      "hireDate": DateTime(2022, 7, 18),
      "address": "789 Boulevard des Champs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Bob Martin",
      "role": "Gestionnaire",
      "boutique": {'id': 3, 'name': 'Boutique Sud'},
      "phone": null,
      "email": null,
      "salary": null,
      "hireDate": DateTime(2019, 9, 30),
      "address": "123 Rue Principale, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Chloé Bernard",
      "role": "Caissière",
      "boutique": {'id': 2, 'name': 'Boutique Centre'},
      "email": null,
      "phone": "0334455667",
      "salary": null,
      "hireDate": DateTime(2022, 5, 10),
      "address": "456 Avenue des Fleurs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Lucas Dubois",
      "role": "Manager",
      "boutique": {'id': 1, 'name': 'Boutique Principale'},
      "email": null,
      "phone": "+2250733224455",
      "salary": null,
      "hireDate": DateTime(2022, 5, 10),
      "address": "789 Boulevard des Champs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Emma Fontaine",
      "role": "Serveuse",
      "boutique": {'id': 3, 'name': 'Boutique Sud'},
      "email": null,
      "phone": "+22505566778899",
      "salary": null,
      "hireDate": DateTime(2022, 5, 10),
      "address": "123 Rue Principale, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Maxime Leroy",
      "role": "Chef de cuisine",
      "boutique": {'id': 2, 'name': 'Boutique Centre'},
      "email": null,
      "phone": "+2250334455667",
      "salary": null,
      "hireDate": DateTime(2022, 5, 10),
      "address": "456 Avenue des Fleurs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Laura Morel",
      "role": "Livreuse",
      "boutique": {'id': 1, 'name': 'Boutique Principale'},
      "email": null,
      "phone": "0755667788",
      "salary": null,
      "hireDate": DateTime(2022, 5, 10),
      "address": "456 Avenue des Fleurs, Abidjan",
      "profileImage": null,
    },
    {
      "name": "Thomas Girard",
      "role": "Gestionnaire",
      "boutique": {'id': 3, 'name': 'Boutique Sud'},
      "email": "girard.thomas@example.com",
      "phone": "0102030405",
      "salary": null,
      "hireDate": DateTime(2022, 5, 10),
      "address": "123 Rue Principale, Abidjan",
      "profileImage": null,
    },
  ];
  String? selectedBoutique; // Filtre de la boutique sélectionnée

  String? selectedEmployee; // Employé sélectionné
  // Variable pour gerer la recherche d'un employe
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _filteredEmployees = [];

  // Getter pour les boutiques uniques
  List<Map<String, dynamic>> get _uniqueBoutiques {
    final Map<int, Map<String, dynamic>> uniqueMap = {};

    for (final employe in listEmployee) {
      final boutique = employe['boutique'] as Map<String, dynamic>;
      final id = boutique['id'] as int;

      // Utiliser l'ID comme clé unique
      if (!uniqueMap.containsKey(id)) {
        uniqueMap[id] = Map<String, dynamic>.from(boutique);
      }
    }

    return uniqueMap.values.toList();
  }

  // Getter pour les noms de boutiques
  List<String> get _boutiqueNames {
    return _uniqueBoutiques.map((b) => b['name'] as String).toList()..sort();
  }

  // Getter avec "Tous" inclus
  List<String> get _boutiqueNamesWithAll {
    return ['Tous'] + _boutiqueNames;
  }

  // Getter pour extraire les rôles uniques
  List<String> get _uniqueRoles {
    final Set<String> roles = {};

    for (final employe in listEmployee) {
      roles.add(employe['role'] as String);
    }

    return roles.toList()..sort();
  }

  // Getter pour les rôles avec "Ajouter nouveau"
  List<String> get _roleOptions {
    return _uniqueRoles + ['Ajouter un nouveau rôle...'];
  }

  void _showEditEmployeeSheet(Map<String, dynamic> employe) {
    // Contrôleurs
    final TextEditingController nameController = TextEditingController(
      text: employe['name'] as String? ?? '',
    );
    final TextEditingController roleController = TextEditingController(
      text: employe['role'] as String? ?? '',
    );
    final TextEditingController phoneController = TextEditingController(
      text: employe['phone'] as String? ?? '',
    );
    final TextEditingController salaryController = TextEditingController(
      text: (employe['salary'] as num?)?.toString() ?? '',
    );
    final TextEditingController emailController = TextEditingController(
      text: employe['email'] as String? ?? '',
    );

    final TextEditingController storeController = TextEditingController(
      text:
          (employe['boutique'] as Map<String, dynamic>)['name'] as String? ??
          '',
    );

    // Valeurs par défaut
    final boutique = employe['boutique'] as Map<String, dynamic>;
    String? selectedBoutique = boutique['name'] as String?;
    String? selectedRole = employe['role'] as String?;
    Uint8List? profileImage;

    // Variable pour gérer l'ajout d'un nouveau rôle
    final TextEditingController newRoleController = TextEditingController();
    bool showNewRoleField = false;

    Future<void> pickProfileImage(StateSetter setState) async {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: ImageSource.gallery);

      if (pickedFile != null) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          profileImage = bytes;
        });
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.9,
              minChildSize: 0.5,
              maxChildSize: 0.95,
              builder: (context, scrollController) {
                return Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                  ),
                  child: Column(
                    children: [
                      // Header
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          border: Border(
                            bottom: BorderSide(color: Colors.grey.shade300),
                          ),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.close),
                              onPressed: () => Navigator.pop(context),
                            ),
                            Expanded(
                              child: Text(
                                employe['name'] == null
                                    ? LocaleKeys.employeeAddEmployeeTitle.tr()
                                    : LocaleKeys.employeeEditProfileTitle.tr(),
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Formulaire
                      Expanded(
                        child: SingleChildScrollView(
                          controller: scrollController,
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              // Image de profil
                              GestureDetector(
                                onTap: () => pickProfileImage(setState),
                                child: Stack(
                                  children: [
                                    Container(
                                      width: 120,
                                      height: 120,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: Colors.blue.shade300,
                                          width: 3,
                                        ),
                                        color: Colors.grey.shade200,
                                      ),
                                      child: profileImage != null
                                          ? ClipOval(
                                              child: Image.memory(
                                                profileImage!,
                                                width: 120,
                                                height: 120,
                                                fit: BoxFit.cover,
                                              ),
                                            )
                                          : Icon(
                                              Icons.person,
                                              size: 60,
                                              color: Colors.grey.shade500,
                                            ),
                                    ),
                                    Positioned(
                                      bottom: 0,
                                      right: 0,
                                      child: Container(
                                        width: 36,
                                        height: 36,
                                        decoration: BoxDecoration(
                                          color: Colors.blue,
                                          shape: BoxShape.circle,
                                          border: Border.all(
                                            color: Colors.white,
                                            width: 2,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.camera_alt,
                                          size: 18,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Toucher pour modifier la photo',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),

                              const SizedBox(height: 24),

                              // Nom
                              TextFormField(
                                controller: nameController,
                                decoration: InputDecoration(
                                  labelText: LocaleKeys.employeeName.tr(),
                                  prefixIcon: const Icon(Icons.person),
                                  border: const OutlineInputBorder(),
                                ),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Le nom est obligatoire';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),

                              // Email
                              TextFormField(
                                controller: emailController,
                                decoration: InputDecoration(
                                  labelText: 'Email',
                                  prefixIcon: const Icon(Icons.email),
                                  border: const OutlineInputBorder(),
                                ),
                                keyboardType: TextInputType.emailAddress,
                              ),
                              const SizedBox(height: 16),

                              // Téléphone
                              TextFormField(
                                controller: phoneController,
                                decoration: InputDecoration(
                                  labelText: 'Téléphone',
                                  prefixIcon: const Icon(Icons.phone),
                                  border: const OutlineInputBorder(),
                                ),
                                keyboardType: TextInputType.phone,
                              ),
                              const SizedBox(height: 16),

                              // Rôle (Dropdown avec option d'ajout)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (!showNewRoleField)
                                    DropdownButtonFormField<String>(
                                      initialValue: selectedRole,
                                      decoration: InputDecoration(
                                        labelText: LocaleKeys.employeeRole.tr(),
                                        prefixIcon: const Icon(Icons.work),
                                        border: const OutlineInputBorder(),
                                      ),
                                      items: _roleOptions.map((role) {
                                        return DropdownMenuItem<String>(
                                          value: role,
                                          child: Text(role),
                                        );
                                      }).toList(),
                                      onChanged: (value) {
                                        if (value ==
                                            'Ajouter un nouveau rôle...') {
                                          setState(() {
                                            showNewRoleField = true;
                                            selectedRole = null;
                                          });
                                        } else {
                                          setState(() {
                                            selectedRole = value;
                                            roleController.text = value ?? '';
                                          });
                                        }
                                      },
                                    )
                                  else
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        TextFormField(
                                          controller: newRoleController,
                                          decoration: InputDecoration(
                                            labelText: 'Nouveau rôle',
                                            prefixIcon: const Icon(Icons.add),
                                            border: const OutlineInputBorder(),
                                            suffixIcon: IconButton(
                                              icon: const Icon(Icons.close),
                                              onPressed: () {
                                                setState(() {
                                                  showNewRoleField = false;
                                                  newRoleController.clear();
                                                });
                                              },
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        ElevatedButton(
                                          onPressed: () {
                                            if (newRoleController
                                                .text
                                                .isNotEmpty) {
                                              setState(() {
                                                selectedRole =
                                                    newRoleController.text;
                                                roleController.text =
                                                    newRoleController.text;
                                                showNewRoleField = false;
                                              });
                                            }
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.green,
                                            foregroundColor: Colors.white,
                                          ),
                                          child: const Text('Ajouter ce rôle'),
                                        ),
                                      ],
                                    ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Boutique
                              DropdownButtonFormField<String>(
                                initialValue: selectedBoutique,
                                decoration: InputDecoration(
                                  labelText: LocaleKeys.employeeStore.tr(),
                                  prefixIcon: const Icon(Icons.store),
                                  border: const OutlineInputBorder(),
                                ),
                                items: _boutiqueNames.map((boutique) {
                                  return DropdownMenuItem<String>(
                                    value: boutique,
                                    child: Text(boutique),
                                  );
                                }).toList(),
                                onChanged: (value) {
                                  setState(() {
                                    selectedBoutique = value;
                                  });
                                },
                                validator: (value) {
                                  if (value == null) {
                                    return 'Veuillez sélectionner une boutique';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),

                              // Salaire
                              TextFormField(
                                controller: salaryController,
                                decoration: InputDecoration(
                                  labelText: 'Salaire',
                                  prefixText: '${config!.symbol} ',
                                  prefixIcon: const Icon(Icons.monetization_on),
                                  border: const OutlineInputBorder(),
                                  suffixText: '/mois',
                                ),
                                keyboardType: TextInputType.number,
                              ),
                              const SizedBox(height: 32),

                              // Boutons d'action
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: () => Navigator.pop(context),
                                      child: Text(LocaleKeys.commonCancel.tr()),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: () {
                                        if (selectedBoutique == null) {
                                          ScaffoldMessenger.of(
                                            context,
                                          ).showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                'Veuillez sélectionner une boutique',
                                              ),
                                              backgroundColor: Colors.red,
                                            ),
                                          );
                                          return;
                                        }

                                        _updateEmployee(
                                          employe['name'] as String,
                                          nameController.text,
                                          roleController.text,
                                          selectedBoutique!,
                                          phoneController.text,
                                          emailController.text,
                                          double.tryParse(
                                                salaryController.text,
                                              ) ??
                                              0,
                                          profileImage,
                                        );
                                        Navigator.pop(context);
                                      },
                                      child: Text(LocaleKeys.commonSave.tr()),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }

  void _updateEmployee(
    String oldName,
    String newName,
    String newRole,
    String BoutiqueName,
    String phone,
    String email,
    double salary,
    Uint8List? profileImage,
  ) {
    setState(() {
      final index = listEmployee.indexWhere((emp) => emp['name'] == oldName);

      if (index != -1) {
        if (_boutiqueNames.contains(BoutiqueName) == false) {
          // Ajouter la nouvelle boutique à la liste
          final newBoutiqueId =
              (_uniqueBoutiques
                  .map((b) => b['id'] as int)
                  .fold<int>(
                    0,
                    (previousValue, element) =>
                        element > previousValue ? element : previousValue,
                  )) +
              1;
          final newBoutique = {'id': newBoutiqueId, 'name': BoutiqueName};
          _uniqueBoutiques.add(newBoutique);
        }
        final newBoutique = _uniqueBoutiques.firstWhere(
          (b) => b['name'] == BoutiqueName,
        );
        listEmployee[index] = {
          'name': newName,
          'role': newRole,
          'boutique': newBoutique,
          "phone": phone,
          "email": email,
          "salary": salary,
          "profileImage": ?profileImage,
        };

        // Mettre à jour la sélection si nécessaire
        if (selectedEmployee == oldName) {
          selectedEmployee = newName;
        }
      }
    });
  }

  void _showDeleteConfirmationDialog(Map<String, dynamic> employe) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(LocaleKeys.employeeDeleteProfileTitle.tr()),
        content: Text(
          LocaleKeys.employeeDeleteMessage.tr(
            args: [employe['name'].toString()],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocaleKeys.commonCancel.tr()),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              _deleteEmployee(employe['name'].toString());
              Navigator.pop(context);
            },
            child: Text(LocaleKeys.commonDelete.tr()),
          ),
        ],
      ),
    );
  }

  void _deleteEmployee(String employeeName) {
    setState(() {
      listEmployee.removeWhere((emp) => emp['name'] == employeeName);

      // Si l'employé supprimé était sélectionné, désélectionner
      if (selectedEmployee == employeeName) {
        selectedEmployee = null;
      }
    });
  }

  void _showAddEmployeeBottomSheet(BuildContext context) {
    final formKey = GlobalKey<FormState>();
    String? selectedBoutique;
    String? selectedRole;

    // Contrôleurs pour les champs du formulaire
    TextEditingController nameController = TextEditingController();
    TextEditingController emailController = TextEditingController();
    TextEditingController phoneController = TextEditingController();
    TextEditingController passwordController = TextEditingController();

    bool showPassword = false;

    // Liste des rôles
    final List<String> roles = [
      'Gérant',
      'Caissier',
      'Vendeur',
      'Stagiaire',
      'Administrateur',
    ];
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return SingleChildScrollView(
          child: Container(
            margin: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Nouvel employé",
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  SingleChildScrollView(
                    child: Form(
                      key: formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Champ Nom complet
                          TextFormField(
                            controller: nameController,
                            decoration: const InputDecoration(
                              labelText: "Nom complet *",
                              prefixIcon: Icon(Icons.person),
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Veuillez entrer le nom';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Champ Email
                          TextFormField(
                            controller: emailController,
                            decoration: const InputDecoration(
                              labelText: "Email *",
                              prefixIcon: Icon(Icons.email),
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Veuillez entrer l\'email';
                              }
                              if (!value.contains('@')) {
                                return 'Email invalide';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Champ Téléphone
                          TextFormField(
                            controller: phoneController,
                            decoration: const InputDecoration(
                              labelText: "Téléphone",
                              prefixIcon: Icon(Icons.phone),
                              border: OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 16),

                          // Champ Mot de passe
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: passwordController,
                                  obscureText: true,
                                  decoration: InputDecoration(
                                    labelText: "Mot de passe *",
                                    prefixIcon: const Icon(Icons.lock),
                                    border: const OutlineInputBorder(),
                                    suffix: Icon(showPassword==false ? CupertinoIcons.eye : CupertinoIcons.eye_slash),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Veuillez entrer un mot de passe';
                                    }
                                    if (value.length < 6) {
                                      return 'Minimum 6 caractères';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                style: ButtonStyle(
                                  shape: WidgetStateProperty.all<
                                      RoundedRectangleBorder>(
                                    RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(2.0),
                                    ),
                                  ),
                                ),
                                onPressed: () {
                                  final generatedPassword = generatePassword();
                                  passwordController.text = generatedPassword;
                                },
                                child: Text(LocaleKeys.generatePassword.tr()),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Dropdown Boutique
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButtonFormField<String>(
                                initialValue: selectedBoutique,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                ),
                                items: [
                                  const DropdownMenuItem(
                                    value: null,
                                    child: Text("Sélectionnez une boutique"),
                                  ),
                                  ..._boutiqueNamesWithAll
                                      .where((name) => name != "Tous")
                                      .map((boutique) {
                                        return DropdownMenuItem(
                                          value: boutique,
                                          child: Text(boutique),
                                        );
                                      }),
                                ],
                                onChanged: (value) {
                                  selectedBoutique = value;
                                },
                                validator: (value) {
                                  if (value == null) {
                                    return 'Veuillez sélectionner une boutique';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Dropdown Rôle
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButtonFormField<String>(
                                initialValue: selectedRole,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  border: InputBorder.none,
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12,
                                  ),
                                ),
                                items: [
                                  const DropdownMenuItem(
                                    value: null,
                                    child: Text("Sélectionnez un rôle"),
                                  ),
                                  ...roles.map((role) {
                                    return DropdownMenuItem(
                                      value: role,
                                      child: Text(role),
                                    );
                                  }),
                                ],
                                onChanged: (value) {
                                  selectedRole = value;
                                },
                                validator: (value) {
                                  if (value == null) {
                                    return 'Veuillez sélectionner un rôle';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Checkbox permissions
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Permissions :",
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Checkbox(value: true, onChanged: (_) {}),
                                  const Text("Accès caisse"),
                                ],
                              ),
                              Row(
                                children: [
                                  Checkbox(value: false, onChanged: (_) {}),
                                  const Text("Gestion stock"),
                                ],
                              ),
                              Row(
                                children: [
                                  Checkbox(value: false, onChanged: (_) {}),
                                  const Text("Gestion produits"),
                                ],
                              ),
                              Row(
                                children: [
                                  Checkbox(value: false, onChanged: (_) {}),
                                  const Text("Gestion des approvisionnements"),
                                ],
                              ),
                              Row(
                                children: [
                                  Checkbox(value: false, onChanged: (_) {}),
                                  const Text("Voir rapports"),
                                ],
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              OutlinedButton(
                                onPressed: () {},
                                child: Text(LocaleKeys.commonCancel.tr()),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton(
                                onPressed: () {
                                  if (formKey.currentState!.validate()) {
                                    // Ajouter l'employé
                                    setState(() {
                                      final newEmployee = {
                                        'name': nameController.text,
                                        'role': selectedRole!,
                                        'boutique': _uniqueBoutiques.firstWhere(
                                          (b) => b['name'] == selectedBoutique,
                                        ),
                                        'phone': phoneController.text,
                                        'email': emailController.text,
                                      };
                                      listEmployee.add(newEmployee);
                                    });
                                    Navigator.pop(context);
                                  }
                                },
                                child: Text(LocaleKeys.commonSave.tr()),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  bool showSalary = false;

  // Fonction de gestion de la recherche employe
  // Fonction pour basculer l'affichage de la recherche
  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _filteredEmployees = List.from(listEmployee);
      }
    });
  }

  // Fonction pour filtrer les employés
  void _filterEmployees(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredEmployees = List.from(listEmployee);
      } else {
        _filteredEmployees = listEmployee.where((employee) {
          final String name = employee['name']?.toLowerCase() ?? '';
          final email = employee['email']?.toLowerCase() ?? '';
          final phone = employee['phone']?.toString() ?? '';
          final searchLower = query.toLowerCase();

          return name.contains(searchLower) ||
              email.contains(searchLower) ||
              phone.contains(searchLower);
        }).toList();
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _dioService.init();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EmployeeProvider>().loadEmployees();
    });
    _filteredEmployees = List.from(listEmployee);

    // Écouteur pour le champ de recherche
    _searchController.addListener(() {
      _filterEmployees(_searchController.text);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      drawer: const SideMenu(),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              LocaleKeys.employeesTitle.tr(),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            SizedBox(height: 12),
            Text(
              LocaleKeys.employeesDescription.tr(),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const Divider(),

            // Zone liste + Details
            Expanded(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Liste des employés gauche
                  Expanded(
                    flex: 2, // 40% de l'espace
                    child: Container(
                      padding: EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        border: Border(
                          right: BorderSide(
                            color: Colors.grey.shade300,
                            width: 1.0,
                          ),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Container(
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: Colors.grey.shade300,
                                    ),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      isExpanded: true,
                                      value: selectedBoutique ?? "Tous",
                                      icon: const Icon(
                                        Icons.arrow_drop_down,
                                        size: 24,
                                      ),
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: Colors.black87,
                                      ),
                                      dropdownColor: Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                      ),
                                      onChanged: (String? value) {
                                        setState(() {
                                          selectedBoutique = value == "Tous"
                                              ? null
                                              : value;
                                        });
                                      },
                                      items: _boutiqueNamesWithAll
                                          .map<DropdownMenuItem<String>>((
                                            String value,
                                          ) {
                                            return DropdownMenuItem<String>(
                                              value: value,
                                              child: Text(value),
                                            );
                                          })
                                          .toList(),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              // Bouton ajouter employe
                              ElevatedButton(
                                onPressed: () =>
                                    _showAddEmployeeBottomSheet(context),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 20,
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.person_add, size: 20),
                                    SizedBox(width: 8),
                                    Text("Ajouter un employé"),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                            ],
                          ),
                          SizedBox(height: 16),
                          // En-tête avec titre et recherche
                          if (!_isSearching)
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    "Liste des employés",
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.bold),
                                  ),
                                ),
                                IconButton(
                                  onPressed: _toggleSearch,
                                  icon: const Icon(
                                    Icons.search,
                                    color: Colors.blue,
                                    size: 24,
                                  ),
                                  tooltip: "Rechercher un employé",
                                ),
                              ],
                            ),

                          // Champ de recherche (quand activé)
                          if (_isSearching)
                            Container(
                              margin: const EdgeInsets.only(bottom: 16),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey[50],
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFFE0E0E0),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.search,
                                    color: Colors.grey,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextField(
                                      controller: _searchController,
                                      autofocus: true,
                                      decoration: const InputDecoration(
                                        hintText:
                                            "Rechercher par nom, email ou téléphone...",
                                        border: InputBorder.none,
                                        contentPadding: EdgeInsets.zero,
                                      ),
                                      style: const TextStyle(fontSize: 14),
                                      onChanged: _filterEmployees,
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () {
                                      if (_searchController.text.isNotEmpty) {
                                        _searchController.clear();
                                      } else {
                                        _toggleSearch();
                                      }
                                    },
                                    icon: Icon(
                                      _searchController.text.isNotEmpty
                                          ? Icons.clear
                                          : Icons.close,
                                      color: Colors.grey,
                                      size: 20,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                          // Indicateur de recherche
                          if (_isSearching && _searchController.text.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                "${_filteredEmployees.length} résultat${_filteredEmployees.length > 1 ? 's' : ''} trouvé${_filteredEmployees.length > 1 ? 's' : ''}",
                                style: TextStyle(
                                  color: Colors.grey[600],
                                  fontSize: 12,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ),
                          SizedBox(height: 8),
                          Expanded(
                            child: ListView.builder(
                              itemCount: _filteredEmployees.length,
                              itemBuilder: (context, index) {
                                final employe = _filteredEmployees[index];
                                final boutique =
                                    employe['boutique'] as Map<String, dynamic>;

                                // Filtrer selon la boutique sélectionnée
                                if (selectedBoutique != null &&
                                    boutique['name'] != selectedBoutique) {
                                  return const SizedBox.shrink();
                                }

                                final isSelected =
                                    selectedEmployee ==
                                    employe['name'].toString();

                                return Container(
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    border: isSelected
                                        ? Border.all(
                                            color: Colors.blue.shade500,
                                            width: 2.0,
                                          )
                                        : null,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Card(
                                    elevation: isSelected ? 3 : 1,
                                    color: isSelected
                                        ? Colors.blue.shade50
                                        : null,
                                    child: ListTile(
                                      title: Text(
                                        employe['name'].toString(),
                                        style: TextStyle(
                                          fontWeight: isSelected
                                              ? FontWeight.bold
                                              : FontWeight.normal,
                                        ),
                                      ),
                                      subtitle: Text(
                                        '${employe['role']} • ${boutique['name']}',
                                      ),
                                      leading: CircleAvatar(
                                        backgroundColor: isSelected
                                            ? Colors.blue.shade500
                                            : Colors.grey.shade300,
                                        child: employe['profileImage'] != null
                                            ? ClipOval(
                                                child: Image.memory(
                                                  employe['profileImage']
                                                      as Uint8List,
                                                  width: 40,
                                                  height: 40,
                                                  fit: BoxFit.cover,
                                                ),
                                              )
                                            : Text(
                                                employe['name'].toString()[0],
                                                style: TextStyle(
                                                  color: isSelected
                                                      ? Colors.white
                                                      : Colors.black,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                      ),
                                      trailing: Icon(
                                        Icons.arrow_forward_ios,
                                        size: 16,
                                        color: isSelected
                                            ? Colors.blue.shade500
                                            : Colors.grey,
                                      ),
                                      onTap: () {
                                        setState(() {
                                          selectedEmployee = employe['name']
                                              .toString();
                                        });
                                      },
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Détails de l'employé sélectionné ou espace vide
                  if (selectedEmployee != null)
                    Expanded(
                      flex: 3, // 60% de l'espace
                      child: _buildEmployeeDetails(),
                    )
                  else
                    Expanded(
                      flex: 3,
                      child: Container(
                        color: Colors.grey.shade50,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.person_search,
                                size: 80,
                                color: Colors.grey,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                LocaleKeys.employeeSelectToViewDetails.tr(),
                                style: const TextStyle(
                                  fontSize: 16,
                                  color: Colors.grey,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmployeeDetails() {
    final Map<String, dynamic> employe = listEmployee.firstWhere(
      (emp) => emp['name'] == selectedEmployee,
    );

    if (employe.isEmpty) {
      return Center(child: Text(LocaleKeys.employeeNotFound.tr()));
    }

    final boutique = employe['boutique'] as Map<String, dynamic>;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // En-tête
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () {
                    setState(() {
                      selectedEmployee = null;
                    });
                  },
                  tooltip: LocaleKeys.commonBackToList.tr(),
                ),
                Text(
                  LocaleKeys.employeeProfileTitle.tr(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Photo et nom
            Center(
              child: Column(
                children: [
                  Container(
                    width: 65,
                    height: 65,
                    decoration: BoxDecoration(
                      color: Colors.blue.shade100,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.blue.shade300, width: 3),
                    ),
                    child: employe['profileImage'] != null
                        ? ClipOval(
                            child: Image.memory(
                              employe['profileImage'],
                              width: 65,
                              height: 65,
                              fit: BoxFit.cover,
                            ),
                          )
                        : Icon(
                            Icons.person,
                            size: 34,
                            color: Colors.blue.shade600,
                          ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    employe['name']?.toString() ?? '',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Chip(
                    label: Text(employe['role']?.toString() ?? 'Non spécifié'),
                    backgroundColor: Colors.blue.shade100,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Informations détaillées
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Tous les champs obligatoires et optionnels
                    ..._buildAllInfoItems(employe, boutique),

                    const SizedBox(height: 24),

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.edit, size: 18),
                            label: Text(LocaleKeys.commonEdit.tr()),
                            onPressed: () {
                              _showEditEmployeeSheet(employe);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.delete, size: 18),
                            label: Text(LocaleKeys.commonDelete.tr()),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade50,
                              foregroundColor: Colors.red,
                            ),
                            onPressed: () {
                              _showDeleteConfirmationDialog(employe);
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Statistiques
            const SizedBox(height: 8),
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      LocaleKeys.commonStatistics.tr(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatCard(
                          title: LocaleKeys.commonYears.tr(),
                          value: employe['hireDate'] != null
                              ? (DateTime.now().year -
                                        DateTime.parse(
                                          employe['hireDate'].toString(),
                                        ).year)
                                    .toString()
                              : 'N/A',
                          icon: Icons.calendar_today,
                        ),
                        _buildStatCard(
                          title: LocaleKeys.commonHours.tr(),
                          value: '160',
                          icon: Icons.access_time,
                        ),
                        _buildStatCard(
                          title: LocaleKeys.commonRating.tr(),
                          value: 'N/A',
                          icon: Icons.star,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Details des infos de l'employe
  List<Widget> _buildAllInfoItems(
    Map<String, dynamic> employe,
    Map<String, dynamic> boutique,
  ) {
    final dateString = employe['hireDate'] != null
        ? FormatUtils.formatDateTime(
            DateTime.parse(employe['hireDate'].toString()),
          )
        : 'Non renseignée';
    // Liste de toutes les informations à afficher
    final List<Map<String, dynamic>> infoItems = [
      {
        'icon': Icons.work,
        'label': LocaleKeys.employeeRole.tr(),
        'value': employe['role']?.toString() ?? 'Non spécifié',
        'isRequired': true,
      },
      {
        'icon': Icons.store,
        'label': LocaleKeys.employeeStore.tr(),
        'value': boutique['name']?.toString() ?? 'Non spécifié',
        'isRequired': true,
      },
      {
        'icon': Icons.email,
        'label': 'Email',
        'value': employe['email']?.toString() ?? 'Non renseigné',
        'isRequired': false,
      },
      {
        'icon': Icons.phone,
        'label': 'Téléphone',
        'value': employe['phone']?.toString() ?? 'Non renseigné',
        'isRequired': false,
      },
      {
        'icon': Icons.monetization_on,
        'label': 'Salaire',
        'value': employe['salary'] != null
            ? '${employe['salary']} ${config!.symbol}'
            : 'Non renseigné',
        'isRequired': false,
      },
      {
        'icon': Icons.date_range,
        'label': 'Date d\'embauche',
        'value': dateString,
        'isRequired': false,
      },
    ];

    // Grouper par 2 éléments par ligne
    final List<Widget> rows = [];

    for (int i = 0; i < infoItems.length; i += 2) {
      final firstItem = infoItems[i];
      final secondItem = i + 1 < infoItems.length ? infoItems[i + 1] : null;

      final row = Padding(
        padding: const EdgeInsets.only(bottom: 20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Premier élément
            Expanded(
              child: _buildDetailColumn(
                icon: firstItem['icon'] as IconData,
                label: firstItem['label'] as String,
                value: firstItem['value'] as String,
                isEmpty: _isValueEmpty(firstItem['value'] as String),
              ),
            ),

            // Deuxième élément (si existe)
            if (secondItem != null) ...[
              const SizedBox(width: 16),
              Expanded(
                child: _buildDetailColumn(
                  icon: secondItem['icon'] as IconData,
                  label: secondItem['label'] as String,
                  value: secondItem['value'] as String,
                  isEmpty: _isValueEmpty(secondItem['value'] as String),
                ),
              ),
            ],
          ],
        ),
      );

      rows.add(row);
    }

    return rows;
  }

  bool _isValueEmpty(String value) {
    final emptyIndicators = ['Non renseigné', 'Non spécifié', 'N/A', ''];
    return emptyIndicators.contains(value);
  }

  Widget _buildDetailColumn({
    required IconData icon,
    required String label,
    required String value,
    bool isEmpty = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label avec icône
        Row(
          children: [
            Icon(
              icon,
              color: isEmpty ? Colors.grey.shade500 : Colors.blue.shade600,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),

        // Valeur (avec style différent si vide)
        const SizedBox(height: 6),
        if (label == "Salaire")
          TextButton(
            onPressed: () {
              setState(() {
                showSalary = !showSalary;
              });
            },
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  showSalary == false ? "********" : value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isEmpty
                        ? Colors.grey.shade500
                        : const Color(0xFF1565C0),
                    fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
                  ),
                ),
                SizedBox(width: 8),
                Icon(
                  showSalary == false
                      ? CupertinoIcons.eye
                      : CupertinoIcons.eye_slash,
                ),
              ],
            ),
          )
        else
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isEmpty ? Colors.grey.shade500 : const Color(0xFF1565C0),
              fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
            ),
          ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: Colors.blue.shade100,
          child: Icon(icon, color: Colors.blue.shade600),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
