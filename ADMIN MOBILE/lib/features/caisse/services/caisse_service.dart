
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session.dart';

class CaisseService {
  static final CaisseService _instance = CaisseService._internal();
  factory CaisseService() => _instance;
  CaisseService._internal();

  CaisseSession? _currentSession;
  final Map<String, CaisseSession> _clientSessions = {};

  // Initialiser une nouvelle caisse
  CaisseSession initializeCaisse({
    required String userId,
    required String currency,
    required Map<int, int> initialCash,
  }) {
    final sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    
    final session = CaisseSession(
      id: sessionId,
      userId: userId,
      startTime: DateTime.now(),
      initialCash: initialCash,
      currency: currency,
    );
    
    _currentSession = session;
    return session;
  }

  // Créer une session pour un client
  String createClientSession() {
    if (_currentSession == null) {
      throw Exception('Aucune caisse active. Veuillez d\'abord initialiser une caisse.');
    }
    
    final clientId = 'client_${DateTime.now().millisecondsSinceEpoch}';
    
    _clientSessions[clientId] = CaisseSession(
      id: clientId,
      userId: _currentSession!.userId,
      startTime: DateTime.now(),
      initialCash: Map.from(_currentSession!.currentCash),
      currency: _currentSession!.currency,
      currentCash: Map.from(_currentSession!.currentCash),
    );
    
    return clientId;
  }

  // Fermer une session client
  void closeClientSession(String clientId, CaisseTransaction transaction) {
    if (_clientSessions.containsKey(clientId)) {
      _clientSessions.remove(clientId);
      _currentSession?.transactions.add(transaction);
    }
  }

  // Clôturer la caisse principale
  CaisseSession closeMainCaisse() {
    if (_currentSession == null) {
      throw Exception('Aucune caisse active.');
    }
    
    _currentSession!.endTime = DateTime.now();
    final closedSession = _currentSession!;
    
    _currentSession = null;
    _clientSessions.clear();
    
    return closedSession;
  }

  // Getters
  CaisseSession? get currentSession => _currentSession;
  List<CaisseSession> get clientSessions => _clientSessions.values.toList();
  bool get hasActiveSession => _currentSession != null;
  int get activeClientsCount => _clientSessions.length;
}