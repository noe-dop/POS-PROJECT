class ApiConfig {
  static const String baseUrl = 'https://127.0.0.1:8000/api/';
  static const String onlineBaseUrl = 'https://eboutik-api.onrender.com/api/';
  
  static const String apiKey = 'VOTRE_CLE_API';
  static const int connectTimeout = 30000; // 30 secondes
  static const int receiveTimeout = 30000; // 30 secondes

  // Clés de stockage
  static const String authTokenKey = 'auth_token';
  static const String userDataKey = 'user_data';
  static const String isFirstLaunchKey = 'is_first_launch';
}