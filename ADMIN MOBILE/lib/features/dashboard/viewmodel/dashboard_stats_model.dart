import 'package:flutter/material.dart';

/// Modèle pour les statistiques du dashboard
class DashboardStats {
  // Informations de la boutique
  final Map<String, dynamic>? storeInfo;
  final Map<String, dynamic>? userPermissions;

  // Chiffre d'affaires
  final double dailyRevenue;
  final int dailySalesCount;
  final double monthlyRevenue;
  final int monthlySalesCount;
  final double totalRevenue;
  final int totalSales;

  // Stock
  final int totalProducts;
  final int totalStockQuantity; // Quantité totale en stock
  final int lowStockItemsCount;
  final List<LowStockItem> lowStockDetails;

  // Employés
  final int activeEmployees;
  final int totalEmployees;

  // Autres
  final List<Map<String, dynamic>>? recentActivities;
  final Map<String, dynamic>? stockStatus;
  final Map<String, dynamic>? salesTrend;

  DashboardStats({
    this.storeInfo,
    this.userPermissions,
    this.dailyRevenue = 0,
    this.dailySalesCount = 0,
    this.monthlyRevenue = 0,
    this.monthlySalesCount = 0,
    this.totalRevenue = 0,
    this.totalSales = 0,
    this.totalProducts = 0,
    this.totalStockQuantity = 0,
    this.lowStockItemsCount = 0,
    this.lowStockDetails = const [],
    this.activeEmployees = 0,
    this.totalEmployees = 0,
    this.recentActivities,
    this.stockStatus,
    this.salesTrend,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    final statistics = json['statistics'] ?? {};
    final store = json['store'] ?? {};
    final permissions = json['user_permissions'] ?? {};

    // Extraire les détails du stock bas
    List<LowStockItem> lowStockItems = [];
    if (statistics['low_stock_details'] != null) {
      final details = statistics['low_stock_details'] as List? ?? [];
      lowStockItems = details
          .map((item) => LowStockItem.fromJson(item as Map<String, dynamic>))
          .toList();
    }

    return DashboardStats(
      storeInfo: store,
      userPermissions: permissions,
      dailyRevenue: _toDouble(statistics['daily_revenue']),
      dailySalesCount: _toInt(statistics['daily_sales_count']),
      monthlyRevenue: _toDouble(statistics['monthly_revenue']),
      monthlySalesCount: _toInt(statistics['monthly_sales_count']),
      totalRevenue: _toDouble(statistics['total_revenue']),
      totalSales: _toInt(statistics['total_sales']),
      totalProducts: _toInt(statistics['total_products']),
      totalStockQuantity: _toInt(statistics['total_stock_quantity']),
      lowStockItemsCount: _toInt(statistics['low_stock_items_count']),
      lowStockDetails: lowStockItems,
      activeEmployees: _toInt(statistics['active_employees']),
      totalEmployees: _toInt(statistics['total_employees']),
      recentActivities: _toList(statistics['recent_activities']),
      stockStatus: statistics['stock_status'],
      salesTrend: statistics['sales_trend'],
    );
  }

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is int) return value.toDouble();
    if (value is double) return value;
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  static int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  static List<Map<String, dynamic>> _toList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.map((e) => e as Map<String, dynamic>).toList();
    }
    return [];
  }

  // Getters pour faciliter l'affichage
  String get formattedDailyRevenue {
    return _formatCurrency(dailyRevenue);
  }

  String get formattedMonthlyRevenue {
    return _formatCurrency(monthlyRevenue);
  }

  String get formattedTotalRevenue {
    return _formatCurrency(totalRevenue);
  }

  String get formattedTotalStock {
    return _formatNumber(totalStockQuantity);
  }

  String _formatCurrency(double value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    return value.toStringAsFixed(0);
  }

  String _formatNumber(int value) {
    if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(1)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    return value.toString();
  }

  // Vérifier si l'utilisateur a des permissions de gestion
  bool get canManageProducts {
    return userPermissions?['can_manage_products'] ?? false;
  }

  bool get canViewReports {
    return userPermissions?['can_view_reports'] ?? false;
  }

  bool get canManageEmployees {
    return userPermissions?['can_manage_employees'] ?? false;
  }

  bool get canManageSales {
    return userPermissions?['can_manage_sales'] ?? false;
  }
}

/// Modèle pour les articles en stock bas
class LowStockItem {
  final String productName;
  final int productId;
  final int currentStock;
  final int minThreshold;
  final String unit;

  LowStockItem({
    required this.productName,
    required this.productId,
    required this.currentStock,
    required this.minThreshold,
    required this.unit,
  });

  factory LowStockItem.fromJson(Map<String, dynamic> json) {
    return LowStockItem(
      productName: json['product_name'] ?? 'Produit inconnu',
      productId: json['product_id'] ?? 0,
      currentStock: json['current_stock'] ?? 0,
      minThreshold: json['min_threshold'] ?? 0,
      unit: json['unit'] ?? 'unité',
    );
  }

  String get status {
    if (currentStock == 0) return 'Rupture de stock';
    if (currentStock <= minThreshold * 0.5) return 'Stock critique';
    return 'Stock bas';
  }

  Color get statusColor {
    switch (status) {
      case 'Rupture de stock':
        return Colors.red;
      case 'Stock critique':
        return Colors.orange;
      default:
        return Colors.amber;
    }
  }

  double get stockRatio {
    if (minThreshold <= 0) return 0;
    return (currentStock / minThreshold).clamp(0.0, 1.0);
  }
}