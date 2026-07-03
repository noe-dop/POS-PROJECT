import 'package:nsp_pos_mobile/core/utils/format_utils.dart';

class PaymentMethod {
  final int id;
  final String code;
  final String name;
  final bool isActive;
  final bool requiresReference;
  final double feePercentage;

  PaymentMethod({
    required this.id,
    required this.code,
    required this.name,
    required this.isActive,
    required this.requiresReference,
    required this.feePercentage,
  });

  factory PaymentMethod.fromJson(Map<String, dynamic> json) {
    return PaymentMethod(
      id: json['id'] as int,
      code: json['code'] as String,
      name: json['name'] as String,
      isActive: json['is_active'] as bool,
      requiresReference: json['requires_reference'] as bool,
      feePercentage: FormatUtils.toDouble(json['fee_percentage']) as double,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'code': code,
      'name': name,
      'is_active': isActive,
      'requires_reference': requiresReference,
      'fee_percentage': feePercentage,
    };
  }
}