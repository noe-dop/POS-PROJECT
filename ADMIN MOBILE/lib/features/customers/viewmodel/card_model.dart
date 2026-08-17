import 'package:nsp_pos_mobile/core/utils/format_utils.dart';

class CardModel {
  final int id;
  final String cardNumber;
  final int typeCardId;
  String? nameCard;
  final double balance;
  final double maxCredit;
  final double plafond;
  final String typeCardName;
  double? remise;
  CardModel({
    required this.id,
    required this.cardNumber,
    required this.balance,
    required this.typeCardId,
    required this.typeCardName,
    this.nameCard,
    required this.maxCredit,
    required this.plafond,
    this.remise,
  });

  factory CardModel.fromJson(Map<String, dynamic> json) {
    return CardModel(
      id: json['id'],
      cardNumber: json['num_card'],
      balance: FormatUtils.toDouble(json['solde'])!,
      typeCardId: json['type_card'],
      typeCardName: json['type_card_name'],
      maxCredit: FormatUtils.toDouble(json['max_credit'])!,
      plafond: FormatUtils.toDouble(json['plafond'])!,
      remise: json['remise'] ?? 0.0,
    );
  }
  
  Map<String,dynamic> toJson (){
    return {
      'id': id,
      'num_card': cardNumber,
      'solde' : balance,
      'type_card' : typeCardId,
      'type_card_name ': typeCardName,
      'max_credit' : maxCredit,
      'plafond' : plafond,
      'remise' : remise ?? 0.0
    };
  }
}
