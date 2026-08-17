import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';

/// Écran affichant l'historique des sessions de caisse avec filtres
class HistoriqueSessionsScreen extends StatefulWidget {
  final int? initialStoreId;

  const HistoriqueSessionsScreen({super.key, this.initialStoreId});

  @override
  State<HistoriqueSessionsScreen> createState() =>
      _HistoriqueSessionsScreenState();
}

class _HistoriqueSessionsScreenState extends State<HistoriqueSessionsScreen> {
  // Filtres
  String? _selectedStatus;
  DateTime? _dateFrom;
  DateTime? _dateTo;
  int? _selectedStoreId;
  int? _selectedCashRegisterId;

  // Liste des boutiques accessibles
  List<StoreWithPermission> accessibleStores = [];

  // Statuts
  final List<String> _statusOptions = ['Tous', 'open', 'closed', 'suspended'];

  // Contrôleur
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  // Indicateur pour éviter de charger deux fois
  bool _initialLoadDone = false;

  @override
  void initState() {
    super.initState();
    _selectedStoreId = widget.initialStoreId;
    _scrollController.addListener(_onScroll);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // On charge les données une seule fois après le premier attachement
    if (!_initialLoadDone) {
      _initialLoadDone = true;
      _loadAccessibleStores();
      // On charge les sessions après le premier build
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _loadSessions();
        }
      });
    }
  }

  /// Charge la liste des boutiques accessibles
  void _loadAccessibleStores() {
    final boutiqueService = context.read<BoutiqueService>();
    final authService = context.read<AuthService>();
    final user = authService.currentUser;

    if (user == null) {
      setState(() => accessibleStores = []);
      return;
    }

    List<StoreWithPermission> stores = [];

    if (user.isOwner) {
      stores = boutiqueService.accessibleStores;
    } else if (user.isEmployee && user.employeeProfile != null) {
      final profile = user.employeeProfile!;
      if (profile.canAccessMultipleStores) {
        // On filtre les boutiques assignées par celles globalement accessibles
        stores = boutiqueService.accessibleStores
            .where(
              (s) => profile.assignedStores.any(
                (store) => store.id == s.boutique.id,
              ),
            )
            .toList();
      } else {
        // Une seule boutique : on vérifie qu'elle est dans la liste accessible
        stores = boutiqueService.accessibleStores
            .where((s) => s.boutique.id == profile.storeId)
            .toList();
      }
    }

    // Mise à jour sécurisée de l'état
    if (mounted) {
      setState(() {
        accessibleStores = stores;
        // Si la boutique sélectionnée n'est plus disponible, on la réinitialise
        if (_selectedStoreId != null &&
            !accessibleStores.any((s) => s.boutique.id == _selectedStoreId)) {
          _selectedStoreId = null;
        }
      });
    }
  }

  /// Charge les sessions avec les filtres actuels
  Future<void> _loadSessions({bool refresh = true}) async {
    if (!mounted) return;
    final provider = context.read<CaisseProvider>();
    await provider.fetchSessions(
      storeId: _selectedStoreId,
      cashRegisterId: _selectedCashRegisterId,
      status: _selectedStatus == 'Tous' ? null : _selectedStatus,
      dateFrom: _dateFrom,
      dateTo: _dateTo,
      refresh: refresh,
    );
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      // Charger plus de sessions
      final provider = context.read<CaisseProvider>();
      if (provider.hasMore && !provider.isLoadingMore) {
        provider.loadMoreSessions();
      }
    }
  }

  /// Applique les filtres et recharge
  void _applyFilters() {
    setState(() {});
    _loadSessions();
  }

  /// Réinitialise tous les filtres
  void _resetFilters() {
    setState(() {
      _selectedStatus = null;
      _dateFrom = null;
      _dateTo = null;
      _selectedStoreId = null;
      _selectedCashRegisterId = null;
      _searchController.clear();
    });
    _loadSessions();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historique des sessions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSessions,
            tooltip: 'Rafraîchir',
          ),
        ],
      ),
      drawer: const SideMenu(),
      body: Consumer<CaisseProvider>(
        builder: (context, provider, child) {
          final sessions = provider.sessionHistory;
          final isLoading = provider.isLoading;
          final isLoadingMore = provider.isLoadingMore;

          return Column(
            children: [
              _buildFilterBar(context, accessibleStores),
              Expanded(
                child: isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : sessions.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history, size: 80, color: Colors.grey),
                            SizedBox(height: 16),
                            Text(
                              'Aucune session trouvée',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey,
                              ),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Essayez de modifier les filtres',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                      key: const PageStorageKey('historique_sessions_list'),
                      controller: _scrollController,
                        padding: const EdgeInsets.all(8),
                        itemCount: sessions.length + (isLoadingMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == sessions.length) {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                          final session = sessions[index];
                          return _buildSessionCard(session);
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  /// Construit la barre de filtres
  Widget _buildFilterBar(
    BuildContext context,
    List<StoreWithPermission> stores,
  ) {
    // Filtrer les stores pour n'afficher que ceux avec des sessions (optionnel)
    final storeItems = <DropdownMenuItem<int>>[
      const DropdownMenuItem<int>(
        value: null,
        child: Text('Toutes les boutiques'),
      ),
    ];
    for (var store in stores) {
      storeItems.add(
        DropdownMenuItem<int>(
          value: store.boutique.id,
          child: Text(store.boutique.name),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        children: [
          // Ligne 1 : Filtre boutique + statut
          Row(
            children: [
              // Filtre boutique
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<int>(
                  initialValue: _selectedStoreId,
                  hint: const Text('Boutique'),
                  isDense: true,
                  items: storeItems,
                  onChanged: (value) {
                    setState(() {
                      _selectedStoreId = value;
                    });
                    _applyFilters();
                  },
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    isDense: true,
                    filled: true,
                    fillColor: Colors.grey[50],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Filtre statut
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedStatus,
                  hint: const Text('Statut'),
                  isDense: true,
                  items: _statusOptions.map((status) {
                    return DropdownMenuItem<String>(
                      value: status == 'Tous' ? null : status,
                      child: Text(status == 'Tous' ? 'Tous' : status),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() => _selectedStatus = value);
                    _applyFilters();
                  },
                  decoration: InputDecoration(
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    isDense: true,
                    filled: true,
                    fillColor: Colors.grey[50],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Ligne 2 : Dates + boutons
          Row(
            children: [
              // Date début
              Expanded(
                child: TextButton.icon(
                  onPressed: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                    );
                    if (date != null) {
                      setState(() => _dateFrom = date);
                      _applyFilters();
                    }
                  },
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(
                    _dateFrom != null
                        ? 'Du ${_dateFrom!.day}/${_dateFrom!.month}/${_dateFrom!.year}'
                        : 'Début',
                    style: const TextStyle(fontSize: 12),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.grey[100],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Date fin
              Expanded(
                child: TextButton.icon(
                  onPressed: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                    );
                    if (date != null) {
                      setState(() => _dateTo = date);
                      _applyFilters();
                    }
                  },
                  icon: const Icon(Icons.calendar_today, size: 16),
                  label: Text(
                    _dateTo != null
                        ? 'Au ${_dateTo!.day}/${_dateTo!.month}/${_dateTo!.year}'
                        : 'Fin',
                    style: const TextStyle(fontSize: 12),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.grey[100],
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Bouton Filtrer
              ElevatedButton.icon(
                onPressed: _applyFilters,
                icon: const Icon(Icons.filter_list, size: 18),
                label: const Text('Filtrer'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Bouton Réinitialiser
              OutlinedButton.icon(
                onPressed: _resetFilters,
                icon: const Icon(Icons.clear, size: 18),
                label: const Text('Réinit.'),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Construit une carte pour une session
  Widget _buildSessionCard(Map<String, dynamic> session) {
    final isClosed = session['status'] == 'closed';
    final startTime = DateTime.parse(session['start_time']);
    final endTime = session['end_time'] != null
        ? DateTime.parse(session['end_time'])
        : null;

    // Couleurs selon le statut
    final Color statusColor = isClosed ? Colors.green : Colors.orange;
    final IconData statusIcon = isClosed ? Icons.check_circle : Icons.timer;

    // Différence en valeur absolue pour affichage
    final diffValue = session['difference'];
    final double diff = (diffValue is num)
        ? diffValue.toDouble()
        : double.tryParse(diffValue?.toString() ?? '0.0') ?? 0.0;
    final bool hasDiff = diff != 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withAlpha(51), // 0.2 * 255
          child: Icon(statusIcon, color: statusColor),
        ),
        title: Row(
          children: [
            Text(
              'Session #${session['id']}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withAlpha(51),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                session['status'] ?? 'inconnu',
                style: TextStyle(
                  color: statusColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text('Caisse: ${session['cash_register_name'] ?? 'N/A'}'),
            Text('Employé: ${session['employee_name'] ?? 'N/A'}'),
            Row(
              children: [
                const Icon(Icons.access_time, size: 14, color: Colors.grey),
                const SizedBox(width: 4),
                Text(_formatDate(startTime)),
                if (endTime != null) ...[
                  const Text(' → '),
                  Text(_formatDate(endTime)),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text('Solde attendu: ${session['expected_balance']} FCFA'),
                const SizedBox(width: 16),
                if (isClosed)
                  Text(
                    'Solde réel: ${session['actual_balance']} FCFA',
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
              ],
            ),
            if (isClosed && hasDiff)
              Text(
                'Écart: ${diff.toStringAsFixed(0)} FCFA',
                style: TextStyle(
                  color: diff > 0 ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            if (session['notes'] != null &&
                session['notes'].toString().isNotEmpty)
              Text(
                'Notes: ${session['notes']}',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
          ],
        ),
        isThreeLine: true,
        trailing: isClosed
            ? Icon(Icons.check_circle, color: Colors.green[700])
            : Icon(Icons.timer, color: Colors.orange[700]),
        onTap: () {
          _showSessionDetails(context, session);
        },
      ),
    );
  }

  /// Affiche les détails d'une session dans une boîte de dialogue
  void _showSessionDetails(BuildContext context, Map<String, dynamic> session) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Détails session #${session['id']}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _detailRow('Statut', session['status']),
              _detailRow('Caisse', session['cash_register_name']),
              _detailRow('Employé', session['employee_name']),
              _detailRow(
                'Ouverture',
                _formatDate(DateTime.parse(session['start_time'])),
              ),
              if (session['end_time'] != null)
                _detailRow(
                  'Fermeture',
                  _formatDate(DateTime.parse(session['end_time'])),
                ),
              _detailRow(
                'Solde attendu',
                '${session['expected_balance']} FCFA',
              ),
              if (session['status'] == 'closed')
                _detailRow('Solde réel', '${session['actual_balance']} FCFA'),
              if (session['difference'] != null)
                _detailRow('Écart', '${session['difference']} FCFA'),
              if (session['notes'] != null &&
                  session['notes'].toString().isNotEmpty)
                _detailRow('Notes', session['notes']),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              value?.toString() ?? 'N/A',
              style: const TextStyle(color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  /// Formate une date pour l'affichage
  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
