import 'dart:math';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/auth_viewmodel.dart';
import 'package:nsp_pos_mobile/features/auth/widgets/auth_form.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController surnameController = TextEditingController();
  final TextEditingController nameController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmpasswordController =
      TextEditingController();
  final TextEditingController _phone1Controller = TextEditingController();
  final TextEditingController _phone2Controller = TextEditingController();
  final TextEditingController _addressController = TextEditingController();

  bool _isLoading = false;
  bool _showPassword = true;
  bool _showConfirmPassword = true;

  // --- Ajout ---
  bool _isConfirmPasswordMatch = false;
  bool _confirmPasswordTouched = false;
  // --- Fin ajout ---

  @override
  void initState() {
    super.initState();
    // Met à jour en direct si l'utilisateur modifie le champ mot de passe
    _passwordController.addListener(() {
      if (_confirmpasswordController.text.isNotEmpty) {
        final match =
            _confirmpasswordController.text == _passwordController.text;
        if (match != _isConfirmPasswordMatch) {
          setState(() {
            _isConfirmPasswordMatch = match;
          });
        }
      }
    });
  }

  @override
  void dispose() {
    // Libère les controllers
    surnameController.dispose();
    nameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmpasswordController.dispose();
    _phone1Controller.dispose();
    _phone2Controller.dispose();
    _addressController.dispose();
    super.dispose();
  }

  // Widget _buildLoadingOverlay() {
  //   return _isLoading
  //       ? Stack(
  //           children: [
  //             Positioned.fill(
  //               child: ModalBarrier(
  //                 color: Colors.black.withValues(alpha: 0.5),
  //                 dismissible: false,
  //               ),
  //             ),
  //             Center(
  //               child: Container(
  //                 padding: EdgeInsets.all(20),
  //                 decoration: BoxDecoration(
  //                   color: Colors.white,
  //                   borderRadius: BorderRadius.circular(10),
  //                 ),
  //                 child: Column(
  //                   mainAxisSize: MainAxisSize.min,
  //                   children: [
  //                     CircularProgressIndicator(),
  //                     SizedBox(height: 16),
  //                     Text(
  //                       'Creating your account...',
  //                       style: TextStyle(fontWeight: FontWeight.w500),
  //                     ),
  //                   ],
  //                 ),
  //               ),
  //             ),
  //           ],
  //         )
  //       : SizedBox.shrink();
  // }

  Future<void> _signup() async {
    // Validation du formulaire
    if (!_formKey.currentState!.validate()) {
      NotificationService.showWarning(
        context,
        LocaleKeys.validationIncorrectForm.tr(),
      );
      return;
    }

    // Validation du mot de passe
    if (_passwordController.text != _confirmpasswordController.text) {
      NotificationService.showError(
        context,
        LocaleKeys.registerPasswordNoMatching.tr(),
      );
      return;
    }

    // Vérification de la force du mot de passe
    if (_passwordController.text.length < 6) {
      NotificationService.showWarning(
        context,
        LocaleKeys.registerPasswordShort.tr(),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Préparation des données
      final signupRequest = SignupRequest(
        surname: surnameController.text.trim(),
        name: nameController.text.trim(),
        username: _usernameController.text.trim(),
        email: _emailController.text.trim(),
        password: _passwordController.text,
        confirmPassword: _confirmpasswordController.text,
        phone: _phone1Controller.text.trim(),
        phone2: _phone2Controller.text.trim(),
        address: _addressController.text.trim(),
      );

      // Appel API
      final response = await AuthService().signup(signupRequest);
      if (response.success) {
        // Succès
        NotificationService.showSuccess(
          context,
          LocaleKeys.registerSuccessMessage.tr(),
        );

        // Navigation vers le login après un délai
        await Future.delayed(Duration(seconds: 2));
        Navigator.pushReplacementNamed(context, "/login");
      } else {
        // Erreur de l'API
        NotificationService.showError(context, response.message);
      }
    } on Exception catch (e) {
      // Gestion des erreurs
      String errorMessage = 'An error occurred during registration';

      if (e.toString().contains('Network error')) {
        errorMessage = 'Network error. Please check your connection';
      } else if (e.toString().contains('email already exists')) {
        errorMessage = 'This email is already registered';
      } else if (e.toString().contains('username taken')) {
        errorMessage = 'This username is already taken';
      } else {
        errorMessage = e.toString().replaceFirst('Exception: ', '');
      }

      NotificationService.showError(context, errorMessage);
    } finally {
      // Arrêt du loading
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void generateUsername() {
    String firstName = nameController.text.trim().toLowerCase();
    String lastName = surnameController.text.trim().toLowerCase();

    if (firstName.isNotEmpty && lastName.isNotEmpty) {
      // Générer un nombre aléatoire entre 1 et 999
      int randomNumber = Random().nextInt(999) + 1; // 1 à 999

      // Formater avec des zéros devant si nécessaire (001, 023, 456)
      String formattedNumber = randomNumber.toString().padLeft(3, '0');
      String rawLastName = lastName.replaceAll(' ', '');
      String lastNamePart = rawLastName.length > 5
          ? rawLastName.substring(0, 5)
          : rawLastName;
      String username = '${firstName[0]}$lastNamePart$formattedNumber';
      _usernameController.text = username;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.95,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Form(
                  key: _formKey,
                  child: Card(
                    color: Colors.white,
                    elevation: 5,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(
                        vertical: 8.0,
                        horizontal: 12,
                      ),
                      child: Column(
                        children: [
                          Text(
                            LocaleKeys.registerTitle.tr(),
                            style: TextStyle(fontSize: 24),
                          ),
                          SizedBox(height: 24),
                          Text(
                            LocaleKeys.registerInfo.tr(),
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 18),
                          ),
                          SizedBox(height: 30),
                          // NOM ET PRENOM
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(LocaleKeys.registerName.tr()),
                                    TextFormField(
                                      controller: nameController,
                                      keyboardType: TextInputType.name,
                                      decoration: InputDecoration(
                                        hintText: LocaleKeys.registerName.tr(),
                                        border: const OutlineInputBorder(),
                                      ),
                                      validator: (value) {
                                        if (value == null || value.isEmpty) {
                                          return LocaleKeys.registerNameRequired
                                              .tr();
                                        }
                                        return null;
                                      },
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(LocaleKeys.registerSurname.tr()),
                                    TextFormField(
                                      controller: surnameController,
                                      keyboardType: TextInputType.name,
                                      decoration: InputDecoration(
                                        hintText: LocaleKeys.registerSurname
                                            .tr(),
                                        border: const OutlineInputBorder(),
                                      ),
                                      validator: (value) {
                                        if (value == null || value.isEmpty) {
                                          return LocaleKeys
                                              .registerSurnameRequired
                                              .tr();
                                        }
                                        return null;
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 16),
                          // NOM D'UTILISATEUR
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              LocaleKeys.registerUsername.tr(),
                              style: TextStyle(fontSize: 18),
                            ),
                          ),
                          TextFormField(
                            controller: _usernameController,
                            decoration: InputDecoration(
                              hintText: LocaleKeys.registerUsername.tr(),
                              border: const OutlineInputBorder(),
                              prefixIcon: Icon(CupertinoIcons.person),
                              suffix: ElevatedButton(
                                onPressed: () {
                                  generateUsername();
                                },
                                child: Text(LocaleKeys.registerGenerateUsername.tr()),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return LocaleKeys.registerUsernameRequired.tr();
                              }
                              return null;
                            },
                          ),
                          // EMAIL
                          SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              LocaleKeys.registerEmail.tr(),
                              style: TextStyle(
                                fontSize: 18,
                                fontFamily: "Inter",
                              ),
                            ),
                          ),
                          TextFormField(
                            controller: _emailController,
                            decoration: InputDecoration(
                              hintText: LocaleKeys.registerEmail.tr(),
                              border: const OutlineInputBorder(),
                              prefixIcon: Icon(CupertinoIcons.mail),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return LocaleKeys.registerEmailRequired.tr();
                              }
                              if (RegExp(
                                    r'^[^@]+@[^@]+\.[^@]+',
                                  ).hasMatch(value) ==
                                  false) {
                                return LocaleKeys.registerEmailInvalid.tr();
                              }
                              return null;
                            },
                          ),
                          SizedBox(height: 16),
                          // PASSWORD
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              LocaleKeys.registerPassword.tr(),
                              style: TextStyle(
                                fontSize: 18,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ),
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _showPassword,
                            keyboardType: TextInputType.visiblePassword,
                            decoration: InputDecoration(
                              hintText: "*******",
                              border: const OutlineInputBorder(),
                              prefixIcon: Icon(CupertinoIcons.lock),
                              suffixIcon: IconButton(
                                onPressed: () {
                                  setState(() {
                                    _showPassword = !_showPassword;
                                  });
                                },
                                icon: _showPassword
                                    ? Icon(CupertinoIcons.eye_slash)
                                    : Icon(CupertinoIcons.eye),
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return LocaleKeys.registerPasswordRequired.tr();
                              }
                              if (value.length < 6) {
                                return LocaleKeys.validationMinLength.tr(
                                  namedArgs: {"min": '6'},
                                );
                              }
                              return null;
                            },
                          ),
                          SizedBox(height: 16),
                          //CONFIRM PASSWORD
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              LocaleKeys.registerConfirmPassword.tr(),
                              style: TextStyle(
                                fontSize: 18,
                                fontFamily: "Inter",
                              ),
                            ),
                          ),
                          TextFormField(
                            controller: _confirmpasswordController,
                            autovalidateMode:
                                AutovalidateMode.onUserInteraction,
                            keyboardType: TextInputType.visiblePassword,
                            obscureText: _showConfirmPassword,
                            decoration: InputDecoration(
                              hintText: "*******",
                              border: const OutlineInputBorder(),
                              enabledBorder: OutlineInputBorder(
                                borderSide: BorderSide(
                                  color:
                                      (_confirmPasswordTouched &&
                                          _isConfirmPasswordMatch)
                                      ? Colors.green
                                      : Colors.grey,
                                ),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderSide: BorderSide(
                                  color:
                                      (_confirmPasswordTouched &&
                                          _isConfirmPasswordMatch)
                                      ? Colors.green
                                      : Theme.of(context).primaryColor,
                                  width: 2,
                                ),
                              ),
                              prefixIcon: Icon(CupertinoIcons.lock),
                              suffixIcon: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (_confirmPasswordTouched &&
                                      _isConfirmPasswordMatch)
                                    Padding(
                                      padding: const EdgeInsets.only(
                                        right: 6.0,
                                      ),
                                      child: Icon(
                                        Icons.check_circle,
                                        color: Colors.green,
                                      ),
                                    ),
                                  IconButton(
                                    onPressed: () {
                                      setState(() {
                                        _showConfirmPassword =
                                            !_showConfirmPassword;
                                      });
                                    },
                                    icon: _showConfirmPassword
                                        ? Icon(CupertinoIcons.eye_slash)
                                        : Icon(CupertinoIcons.eye),
                                  ),
                                ],
                              ),
                            ),
                            onChanged: (value) {
                              // Ne pas retourner de String : mise à jour du state pour validation dynamique
                              setState(() {
                                _confirmPasswordTouched = true;
                                _isConfirmPasswordMatch =
                                    value == _passwordController.text;
                              });
                            },
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return LocaleKeys
                                    .registerConfirmPasswordRequired
                                    .tr();
                              }
                              if (value.length < 6) {
                                return LocaleKeys.validationMinLength.tr(
                                  namedArgs: {"min": '6'},
                                );
                              }
                              if (value != _passwordController.text) {
                                return LocaleKeys.registerPasswordNoMatching
                                    .tr();
                              }
                              return null;
                            },
                          ),
                          // Phone 1 et Phone 2
                          SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(LocaleKeys.registerPhone1.tr()),
                                    TextFormField(
                                      controller: _phone1Controller,
                                      keyboardType: TextInputType.name,
                                      decoration: InputDecoration(
                                        hintText: LocaleKeys.registerHintPhone1
                                            .tr(),
                                        border: const OutlineInputBorder(),
                                      ),
                                      validator: (value) {
                                        if (value == null || value.isEmpty) {
                                          return LocaleKeys
                                              .registerPhone1Required
                                              .tr();
                                        }
                                        if (value.length < 10) {
                                          return LocaleKeys.validationMinLength
                                              .tr(namedArgs: {"min": '10'});
                                        }
                                        return null;
                                      },
                                    ),
                                  ],
                                ),
                              ),
                              SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(LocaleKeys.registerPhone2.tr()),
                                    TextFormField(
                                      controller: _phone2Controller,
                                      keyboardType: TextInputType.name,
                                      decoration: InputDecoration(
                                        hintText: LocaleKeys.registerHintPhone2
                                            .tr(),
                                        border: const OutlineInputBorder(),
                                      ),
                                      validator: (value) {
                                        if (value!.isNotEmpty &&
                                            value.length < 10) {
                                          return LocaleKeys.validationMinLength
                                              .tr(namedArgs: {"min": '10'});
                                        }
                                        return null;
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 16),
                          // ADDRESS
                          Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              LocaleKeys.registerAddress.tr(),
                              style: TextStyle(fontSize: 18),
                            ),
                          ),
                          TextFormField(
                            controller: _addressController,
                            keyboardType: TextInputType.streetAddress,
                            decoration: InputDecoration(
                              hintText: LocaleKeys.registerAddress.tr(),
                              border: const OutlineInputBorder(),
                            ),
                            validator: (value) {
                              return null;
                            },
                          ),
                          SizedBox(height: 24),

                          /// BUTTON
                          SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _signup,
                              child: _isLoading
                                  ? const CircularProgressIndicator(
                                      color: Colors.white,
                                    )
                                  : Text(LocaleKeys.registerButton.tr()),
                            ),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () {
                              Navigator.pushNamed(context, "/forgot_password");
                            },
                            child: Text(LocaleKeys.loginForgotPassword.tr()),
                          ),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(LocaleKeys.registerAlreadyAccount.tr()),
                              TextButton(
                                onPressed: () {
                                  Navigator.pushNamed(context, "/login");
                                },
                                child: Text(LocaleKeys.registerLogin.tr()),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
