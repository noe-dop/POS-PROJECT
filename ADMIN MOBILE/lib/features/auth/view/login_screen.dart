import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/auth_viewmodel.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_form.dart';
import 'package:provider/provider.dart';
import '../../../localization/locale_keys.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _passwordIsHidden = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login(BuildContext context) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_formKey.currentState!.validate()) {
      setState(() {
        _isLoading = true;
      });
      try {
        final authService = Provider.of<AuthService>(context, listen: false);

        final loginRequest = LoginRequest(
          username: _usernameController.text,
          password: _passwordController.text,
        );

        final response = await authService.login(loginRequest);
        setState(() {
          _isLoading = false;
        });
        if (response.status == 200) {
          NotificationService.showSuccess(
            context,
            LocaleKeys.loginSuccessMessage.tr(),
          );

          // Simulation login
          await Future.delayed(const Duration(seconds: 2));
          if (mounted) {
            Navigator.pushReplacementNamed(context, "/dashboard");
          }
        } else {
          String errorMessage = LocaleKeys.loginErrorMessage.tr();
          if (response.message != null) {
            if (response.message is String) {
              errorMessage = response.message;
            } else if (response.message is Map) {
              errorMessage = response.message.values
                  .expand((e) => e is List ? e : [e])
                  .join('\n');
            }
          }
          NotificationService.showError(context, errorMessage);
        }
      } catch (e) {
        NotificationService.showError(
          context,
          LocaleKeys.loginErrorMessage.tr(),
        );
      } finally {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(8),
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.9,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 24.0,
                  horizontal: 8,
                ),
                child: SingleChildScrollView(
                  child: Form(
                    key: _formKey,
                    child: Card(
                      color: Theme.of(context).cardColor,
                      elevation: 5,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadiusGeometry.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16.0,
                          vertical: 8,
                        ),
                        child: Column(
                          children: [
                            Text(
                              LocaleKeys.loginTitle.tr(),
                              style: TextStyle(fontSize: 24),
                            ),
                            SizedBox(height: 30),
                            Text(
                              LocaleKeys.loginInfo.tr(),
                              style: TextStyle(fontSize: 18),
                              textAlign: TextAlign.center,
                            ),
                            SizedBox(height: 16),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                '${LocaleKeys.loginUsername.tr()}/${LocaleKeys.loginEmail.tr()}',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontFamily: "Inter",
                                ),
                              ),
                            ),
                            TextFormField(
                              controller: _usernameController,
                              autofocus: true,
                              keyboardType: TextInputType.name,
                              decoration: InputDecoration(
                                border: const OutlineInputBorder(
                                  borderSide: BorderSide(color: Colors.black26),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return LocaleKeys.loginUsernameRequired.tr();
                                }
                                if (value.length < 3) {
                                  return LocaleKeys.loginUsernameShort.tr();
                                }
                                if (value.contains('@')) {
                                  // Ajouter une logique de verification du format si c'est un email
                                  return null;
                                }
                                return null;
                              },
                            ),

                            /// Username
                            const SizedBox(height: 16), // .
                            Align(
                              alignment: AlignmentGeometry.centerLeft,
                              child: Text(
                                LocaleKeys.loginPassword.tr(),
                                style: TextStyle(
                                  fontSize: 14,
                                  fontFamily: "Inter",
                                ),
                              ),
                            ),
                            TextFormField(
                              controller: _passwordController,
                              obscureText: _passwordIsHidden,
                              keyboardType: TextInputType.visiblePassword,
                              textInputAction: TextInputAction.go,
                              decoration: InputDecoration(
                                hintText: "********",
                                border: const OutlineInputBorder(
                                  borderSide: BorderSide(color: Colors.black26),
                                ),
                                suffixIcon: IconButton(
                                  onPressed: () {
                                    setState(() {
                                      _passwordIsHidden = !_passwordIsHidden;
                                    });
                                  },
                                  icon: _passwordIsHidden
                                      ? Icon(CupertinoIcons.eye)
                                      : Icon(CupertinoIcons.eye_slash),
                                ),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return LocaleKeys.loginPasswordRequired.tr();
                                }
                                if (value.length < 6) {
                                  return LocaleKeys.loginPasswordShort.tr();
                                }
                                return null;
                              },
                              onFieldSubmitted: (_) {
                                if (!_isLoading &&
                                    _formKey.currentState!.validate() == true) {
                                  _login(context);
                                }
                              },
                            ),
                            const SizedBox(height: 24),

                            /// BUTTON
                            SizedBox(
                              width: double.infinity,
                              height: 50,
                              child: ElevatedButton(
                                onPressed: _isLoading
                                    ? null
                                    : () {
                                        _login(context);
                                      },
                                child: _isLoading
                                    ? const CircularProgressIndicator(
                                        color: Colors.white,
                                      )
                                    : Text(LocaleKeys.loginButton.tr()),
                              ),
                            ),

                            const SizedBox(height: 16),
                            TextButton(
                              onPressed: () {
                                Navigator.pushNamed(
                                  context,
                                  "/forgot_password",
                                );
                              },
                              child: Text(LocaleKeys.loginForgotPassword.tr()),
                            ),
                            const SizedBox(height: 32),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(LocaleKeys.loginNoAccount.tr()),
                                TextButton(
                                  onPressed: () {
                                    Navigator.pushNamed(context, "/signup");
                                  },
                                  child: Text(LocaleKeys.loginRegister.tr()),
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
      ),
    );
  }
}
