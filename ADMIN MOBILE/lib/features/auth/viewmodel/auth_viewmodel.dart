class SignupRequest {
  final String surname;
  final String name;
  final String username;
  final String email;
  final String password;
  final String confirmPassword;
  final String phone ;
  final String phone2 ;
  final String address ;

  SignupRequest({
    required this.surname,
    required this.name,
    required this.username,
    required this.email,
    required this.password,
    required this.confirmPassword,
    required this.phone,
    this.phone2 = "",
    this.address = "",
  });

  Map<String, dynamic> toJson() {
    return {
      'last_name': surname,
      'first_name': name,
      'username': username,
      'email': email,
      'password': password,
      'password_confirm': confirmPassword,
      "phone": phone,
      "phone2": phone2,
      "address":address,

    };
  }
}

class SignupResponse {
  final bool success;
  final String message;
  final Map user;
  final int status;

  SignupResponse({
    required this.success,
    required this.message,
    required this.user,
    required this.status,
  });

  factory SignupResponse.fromJson(Map<String, dynamic> json,status) {
    return SignupResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? 'Unknown error',
      user: json['user'],
      status: status,
    );
  }

  factory SignupResponse.error({
    required String message,
    required int status,
  }) {
    return SignupResponse(
      success: false,
      message: message,
      user: {},
      status: status,
    );
  }
}

class LoginRequest {
  final String username;
  final String password;

  LoginRequest({
    required this.username,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'username': username,
      'password': password,
    };
  }
}

class LoginResponse {
  final bool success;
  final dynamic message;
  final dynamic accessToken;
  final dynamic refreshToken;
  final int status;
  final Map user;

  LoginResponse({
    required this.success,
    required this.accessToken,
    required this.refreshToken,
    required this.status,
    required this.user,
    required this.message,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json,status) {
    return LoginResponse(
      success: json['success'],
      accessToken: json['access'],
      refreshToken: json['refresh'],
      user: json['user'] ,
      message: json['message'] ?? json['errors'] ?? 'Unknown error',
      status: status,
    );
  }

  factory LoginResponse.error({
    required Map message,
    required int status,
  }) {
    return LoginResponse(
      success: message['success'] ?? false,
      message: message['message'] ?? message['errors'] ?? 'Unknown error',
      status: status,
      accessToken: null,
      refreshToken: null,
      user: {}
    );
  }
  
  operator [](String other) {}
}

class PasswordResetRequest {
  final String email;

  PasswordResetRequest({
    required this.email,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
    };
  }
}

class PasswordResetResponse {
  final bool success;
  final String message;
  final int status;

  PasswordResetResponse({
    required this.success,
    required this.message,
    required this.status,
  });

  factory PasswordResetResponse.fromJson(Map<String, dynamic> json, int status) {
    return PasswordResetResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? 'Unknown error',
      status: status,
    );
  }

  factory PasswordResetResponse.error({
    required String message,
    required int status,
  }) {
    return PasswordResetResponse(
      success: false,
      message: message,
      status: status,
    );
  }
}

class PasswordResetConfirmRequest {
  final String uid;
  final String token;
  final String newPassword;
  final String confirmPassword;

  PasswordResetConfirmRequest({
    required this.uid,
    required this.token,
    required this.newPassword,
    required this.confirmPassword,
  });

  Map<String, dynamic> toJson() {
    return {
      'uid': uid,
      'token': token,
      'new_password': newPassword,
      'confirm_password': confirmPassword,
    };
  }
}

class PasswordResetConfirmResponse {
  final bool success;
  final String message;
  final int status;

  PasswordResetConfirmResponse({
    required this.success,
    required this.message,
    required this.status,
  });

  factory PasswordResetConfirmResponse.fromJson(Map<String, dynamic> json, int status) {
    return PasswordResetConfirmResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? 'Unknown error',
      status: status,
    );
  }

  factory PasswordResetConfirmResponse.error({
    required String message,
    required int status,
  }) {
    return PasswordResetConfirmResponse(
      success: false,
      message: message,
      status: status,
    );
  }
}