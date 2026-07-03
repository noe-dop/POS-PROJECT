import 'dart:async';
import 'dart:math';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/dashboard/service/dashboard_provider.dart';
import 'package:nsp_pos_mobile/features/dashboard/viewmodel/dashboard_stats_model.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isConnected = true;
  late StreamSubscription _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    _checkConnection();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      result,
    ) {
      if (mounted) {
        setState(() {
          _isConnected = result != ConnectivityResult.none;
        });
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadDashboardData();
    });
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    super.dispose();
  }

  Future<void> _checkConnection() async {
    var result = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() {
        _isConnected = result != ConnectivityResult.none;
      });
    }
  }

  Future<void> _loadDashboardData() async {
    final provider = context.read<DashboardProvider>();
    final storeService = context.read<BoutiqueService>();

    if (storeService.selectedStore != null) {
      await provider.loadDashboard(storeService.selectedStore!.boutique.id);
    } else if (storeService.accessibleStores.isNotEmpty) {
      await provider.loadDashboard(
        storeService.accessibleStores.first.boutique.id,
      );
    }
  }

  Future<void> _refreshData() async {
    final provider = context.read<DashboardProvider>();
    final success = await provider.refreshDashboard();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Données mises à jour'
                : 'Erreur lors du rafraîchissement',
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      drawer: const SideMenu(),
      appBar: AppBar(
        title: Text(
          LocaleKeys.dashboardTitle.tr(),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 1,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF2E3A59)),
            onPressed: _isConnected ? _refreshData : null,
          ),
          IconButton(
            icon: const Icon(Icons.language, color: Color(0xFF2E3A59)),
            onPressed: () {},
          ),
        ],
      ),
      body: Consumer<DashboardProvider>(
        builder: (context, provider, child) {
          return RefreshIndicator(
            onRefresh: _refreshData,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!_isConnected) _buildConnectionWarning(),
                  const SizedBox(height: 10),
                  _buildStoreSelector(context),
                  const SizedBox(height: 16),
                  _buildContent(provider),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ============================================
  // CONTENU PRINCIPAL
  // ============================================

  Widget _buildContent(DashboardProvider provider) {
    if (provider.isLoading && provider.dashboardStats == null) {
      return const Center(
        child: Padding(padding: EdgeInsets.all(40), child: _LoadingIndicator()),
      );
    }

    if (provider.hasError) {
      return _buildErrorWidget(provider.errorMessage);
    }

    if (provider.dashboardStats == null) {
      return _buildEmptyWidget();
    }

    return _buildDashboardContent(provider);
  }

  // ============================================
  // WIDGETS
  // ============================================

  Widget _buildConnectionWarning() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off, color: Colors.red[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              "Connexion Internet perdue - Mode hors ligne",
              style: TextStyle(
                color: Colors.red[800],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStoreSelector(BuildContext context) {
    final storeService = context.watch<BoutiqueService>();
    final accessibleStores = storeService.accessibleStores;

    if (accessibleStores.length <= 1) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          value: storeService.selectedStore?.boutique.id,
          isExpanded: true,
          hint: const Text('Sélectionner une boutique'),
          items: accessibleStores.map((store) {
            return DropdownMenuItem<int>(
              value: store.boutique.id,
              child: Row(
                children: [
                  const Icon(Icons.store, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      store.boutique.name,
                      style: const TextStyle(fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (store.accessRole == 'owner_primary')
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue[100],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Principal',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.blue[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            );
          }).toList(),
          onChanged: (value) async {
            if (value != null) {
              final selected = accessibleStores.firstWhere(
                (s) => s.boutique.id == value,
              );
              await storeService.selectStore(selected);
              final provider = context.read<DashboardProvider>();
              await provider.loadDashboard(value);
            }
          },
        ),
      ),
    );
  }

  Widget _buildErrorWidget(String? message) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
          const SizedBox(height: 16),
          Text(
            'Erreur de chargement',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            message ?? 'Une erreur est survenue',
            style: TextStyle(color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _refreshData,
            icon: const Icon(Icons.refresh),
            label: const Text('Réessayer'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2E3A59),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyWidget() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(Icons.dashboard, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            'Aucune donnée disponible',
            style: TextStyle(fontSize: 16, color: Colors.grey[600]),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _refreshData,
            icon: const Icon(Icons.refresh),
            label: const Text('Charger les données'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2E3A59),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardContent(DashboardProvider provider) {
    final stats = provider.dashboardStats!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildStoreHeader(stats),
        const SizedBox(height: 20),
        _buildKeyStats(stats),
        const SizedBox(height: 25),
        if (stats.lowStockDetails.isNotEmpty) ...[
          _buildLowStockAlert(stats),
          const SizedBox(height: 25),
        ],
        _buildPerformanceTrends(provider),
        const SizedBox(height: 25),
        _buildStockStatus(provider),
        const SizedBox(height: 25),
        _buildQuickAccess(),
        const SizedBox(height: 25),
        _buildRecentActivities(provider),
        const SizedBox(height: 20),
        _buildFooter(),
      ],
    );
  }

  // ============================================
  // EN-TÊTE DE LA BOUTIQUE
  // ============================================

  Widget _buildStoreHeader(DashboardStats stats) {
    final store = stats.storeInfo;
    final permissions = stats.userPermissions;

    String? getAddress(dynamic storeData) {
      if (storeData == null) return null;
      if (storeData is Map<String, dynamic>) {
        if (storeData['address_details'] != null) {
          final addr = storeData['address_details'];
          if (addr is Map<String, dynamic>) {
            return addr['full_address'] ??
                addr['address_line1'] ??
                addr['address'];
          }
        }
        if (storeData['address'] != null) {
          final addr = storeData['address'];
          if (addr is String) return addr;
          if (addr is Map<String, dynamic>) {
            return addr['full_address'] ??
                addr['address_line1'] ??
                addr['address'];
          }
        }
        if (storeData['address_line1'] != null) {
          return storeData['address_line1'];
        }
      }
      return null;
    }

    final address = getAddress(store);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2E3A59), Color(0xFF1A237E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.store, color: Colors.white, size: 28),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      store?['name'] ?? 'Boutique',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (address != null && address.isNotEmpty)
                      Text(
                        address,
                        style: TextStyle(
                          color: Colors.white.withAlpha(70),
                          fontSize: 12,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              // if (permissions != null)
                // Container(
                //   padding: const EdgeInsets.symmetric(
                //     horizontal: 12,
                //     vertical: 4,
                //   ),
                //   decoration: BoxDecoration(
                //     color: Colors.white.withAlpha(0.2),
                //     borderRadius: BorderRadius.circular(20),
                //   ),
                //   child: Text(
                //     permissions['role'] ?? 'employé',
                //     style: const TextStyle(
                //       color: Colors.white,
                //       fontSize: 12,
                //       fontWeight: FontWeight.w500,
                //     ),
                //   ),
                // ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMiniStat(
                'CA Journalier',
                stats.formattedDailyRevenue,
                Icons.today,
              ),
              const SizedBox(width: 16),
              _buildMiniStat(
                'CA Mensuel',
                stats.formattedMonthlyRevenue,
                Icons.calendar_month,
              ),
              const SizedBox(width: 16),
              _buildMiniStat(
                'Stock Total',
                stats.formattedTotalStock,
                Icons.inventory_2,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withAlpha(150),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white.withAlpha(70), size: 16),
            const SizedBox(width: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.white.withAlpha(60),
                    fontSize: 10,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ============================================
  // STATISTIQUES CLÉS
  // ============================================

  Widget _buildKeyStats(DashboardStats stats) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Statistiques Clés",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  "CA Mensuel",
                  stats.formattedMonthlyRevenue,
                  Icons.calendar_month,
                  Colors.purple,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  "CA Journalier",
                  stats.formattedDailyRevenue,
                  Icons.today,
                  Colors.blue,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  "Ventes totales",
                  stats.totalSales.toString(),
                  Icons.shopping_cart,
                  Colors.orange,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  "Stock total",
                  "${stats.totalStockQuantity} unités",
                  Icons.inventory_2,
                  Colors.teal,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  "Employés",
                  stats.totalEmployees.toString(),
                  Icons.people,
                  Colors.green,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildStatCard(
                  "Produits",
                  stats.totalProducts.toString(),
                  Icons.production_quantity_limits,
                  Colors.indigo,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withAlpha(10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(30)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 4),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[700],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ============================================
  // ALERTE STOCK FAIBLE
  // ============================================

  Widget _buildLowStockAlert(DashboardStats stats) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.red.withAlpha(5),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: Colors.red[700],
                size: 24,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '⚠️ ${stats.lowStockDetails.length} produit(s) en stock bas',
                  style: TextStyle(
                    color: Colors.red[700],
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...stats.lowStockDetails.take(5).map((item) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[200]!),
              ),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: item.statusColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.productName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Stock: ${item.currentStock} / Seuil: ${item.minThreshold} ${item.unit}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: item.statusColor.withAlpha(10),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      item.status,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: item.statusColor,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          if (stats.lowStockDetails.length > 5)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '... et ${stats.lowStockDetails.length - 5} autre(s) produit(s)',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ============================================
  // PERFORMANCE ET TENDANCES
  // ============================================

  Widget _buildPerformanceTrends(DashboardProvider provider) {
    final trend = provider.salesTrend;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Performance et Tendances",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  "Ventes Mensuelles",
                  style: TextStyle(
                    color: Colors.blue[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (trend != null && trend['data'] != null)
            _buildTrendChart(trend['data'])
          else
            Container(
              height: 150,
              alignment: Alignment.center,
              child: Text(
                'Aucune donnée de tendance disponible',
                style: TextStyle(color: Colors.grey[500]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTrendChart(dynamic data) {
    if (data is! List || data.isEmpty) {
      return Container(
        height: 150,
        alignment: Alignment.center,
        child: Text(
          'Aucune donnée disponible',
          style: TextStyle(color: Colors.grey[500]),
        ),
      );
    }

    double maxValue = 0;
    final values = data.map<double>((item) {
      final val = item is Map ? (item['value'] ?? 0) : item;
      maxValue = max(maxValue, val.toDouble());
      return val.toDouble();
    }).toList();

    if (maxValue == 0) maxValue = 1;

    return SizedBox(
      height: 200,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(min(values.length, 12), (index) {
          final value = values[index];
          final height = (value / maxValue) * 150;

          return Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (value > 0)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Text(
                      _formatNumber(value),
                      style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                    ),
                  ),
                Container(
                  width: 20,
                  height: height,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.blue[400]!, Colors.blue[700]!],
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                    ),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _getMonthLabel(index),
                  style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  String _getMonthLabel(int index) {
    const months = [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Jun',
      'Jul',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ];
    return months[index % 12];
  }

  // ============================================
  // ÉTAT DU STOCK
  // ============================================

  Widget _buildStockStatus(DashboardProvider provider) {
    final stock = provider.stockStatus;

    if (stock == null) {
      return const SizedBox.shrink();
    }

    final categories = stock['categories'] as List? ?? [];
    if (categories.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "État du Stock par Catégorie",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          ...categories.map((category) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: _getCategoryColor(category['name']),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          category['name'] ?? 'Catégorie',
                          style: TextStyle(
                            color: Colors.grey[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Text(
                        '${category['percentage'] ?? 0}%',
                        style: TextStyle(
                          color: Colors.grey[800],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: (category['percentage'] ?? 0) / 100,
                    backgroundColor: Colors.grey[200],
                    color: _getCategoryColor(category['name']),
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Color _getCategoryColor(String? name) {
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.pink,
      Colors.indigo,
    ];

    if (name == null) return colors[0];

    int hash = 0;
    for (int i = 0; i < name.length; i++) {
      hash = name.codeUnitAt(i) + ((hash << 5) - hash);
    }
    return colors[(hash % colors.length).abs()];
  }

  // ============================================
  // ACCÈS RAPIDE
  // ============================================

  Widget _buildQuickAccess() {
    final modules = [
      {
        'icon': Icons.inventory,
        'title': 'Produits',
        'description': 'Gérer votre catalogue de produits',
        'color': Colors.blue,
        'route': '/products',
      },
      {
        'icon': Icons.warehouse,
        'title': 'Stock',
        'description': 'Suivez les niveaux de stock',
        'color': Colors.green,
        'route': '/stock',
      },
      {
        'icon': Icons.list_alt,
        'title': 'Inventaire',
        'description': 'Effectuez des inventaires physiques',
        'color': Colors.orange,
        'route': '/inventory',
      },
      {
        'icon': Icons.local_shipping,
        'title': 'Approvisionnement',
        'description': 'Commandez auprès des fournisseurs',
        'color': Colors.red,
        'route': '/supply',
      },
    ];

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Accès Rapide",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: modules
                .map((module) => _buildModuleCard(module))
                .toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildModuleCard(Map<String, dynamic> module) {
    return InkWell(
      onTap: () {
        // Navigation vers le module
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: MediaQuery.of(context).size.width > 600 ? 160 : 140,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (module['color'] as Color).withAlpha(10),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                module['icon'] as IconData,
                color: module['color'] as Color,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              module['title'] as String,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              module['description'] as String,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // ============================================
  // ACTIVITÉS RÉCENTES
  // ============================================

  Widget _buildRecentActivities(DashboardProvider provider) {
    final activities = provider.recentActivities ?? [];

    if (activities.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Activités Récentes",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              TextButton(onPressed: () {}, child: const Text('Voir tout')),
            ],
          ),
          const SizedBox(height: 12),
          ...activities.take(5).map((activity) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    _getActivityIcon(activity['type']),
                    color: _getActivityColor(activity['type']),
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          activity['description'] ?? 'Activité',
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                        if (activity['date'] != null)
                          Text(
                            activity['date'],
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (activity['status'] != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(
                          activity['status'],
                        ).withAlpha(10),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        activity['status'],
                        style: TextStyle(
                          color: _getStatusColor(activity['status']),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  IconData _getActivityIcon(String? type) {
    switch (type?.toLowerCase()) {
      case 'vente':
      case 'sale':
        return Icons.shopping_cart;
      case 'stock':
      case 'inventory':
        return Icons.warehouse;
      case 'approvisionnement':
      case 'supply':
        return Icons.local_shipping;
      case 'alerte':
      case 'alert':
        return Icons.warning;
      default:
        return Icons.notifications;
    }
  }

  Color _getActivityColor(String? type) {
    switch (type?.toLowerCase()) {
      case 'vente':
      case 'sale':
        return Colors.green;
      case 'stock':
      case 'inventory':
        return Colors.blue;
      case 'approvisionnement':
      case 'supply':
        return Colors.orange;
      case 'alerte':
      case 'alert':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'terminée':
      case 'complétée':
      case 'reçue':
      case 'validée':
        return Colors.green;
      case 'en attente':
      case 'pending':
        return Colors.orange;
      case 'annulée':
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  // ============================================
  // FOOTER
  // ============================================

  Widget _buildFooter() {
    return Center(
      child: Text(
        "© 2025 NSP PRO POS. Tous droits réservés.",
        style: TextStyle(color: Colors.grey[500], fontSize: 12),
      ),
    );
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  String _formatNumber(dynamic value) {
    if (value == null) return '0';
    final num = value is int
        ? value.toDouble()
        : value is double
        ? value
        : double.tryParse(value.toString()) ?? 0;

    if (num >= 1000000) {
      return '${(num / 1000000).toStringAsFixed(1)}M';
    } else if (num >= 1000) {
      return '${(num / 1000).toStringAsFixed(1)}K';
    }
    return num.toStringAsFixed(0);
  }
}

// ============================================
// WIDGET DE CHARGEMENT
// ============================================

class _LoadingIndicator extends StatelessWidget {
  const _LoadingIndicator();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(
          width: 40,
          height: 40,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF2E3A59)),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Chargement des données...',
          style: TextStyle(color: Colors.grey[600], fontSize: 14),
        ),
      ],
    );
  }
}
