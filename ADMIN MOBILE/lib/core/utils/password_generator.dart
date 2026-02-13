import 'dart:math';

String generatePassword({int length = 12}) {
  const String chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#\$%^&*';
  final Random random = Random();
  
  return List.generate(length, (index) => chars[random.nextInt(chars.length)])
      .join();
}