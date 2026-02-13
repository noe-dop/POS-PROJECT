class CurrencyConfig {
  final String code;
  final String symbol;
  final List<int> banknotes;
  final List<int> coins;
  
  const CurrencyConfig({
    required this.code,
    required this.symbol,
    required this.banknotes,
    this.coins = const [],
  });
  
  static final Map<String, CurrencyConfig> currencies = {
    'FCFA': CurrencyConfig(
      code: 'FCFA',
      symbol: 'FCFA',
      banknotes: [10000, 5000, 2000, 1000, 500],
      coins: [200, 100, 50, 25, 10, 5],
    ),
  };
}