module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'flowtype'],
  rules: {
    // Opcional: agrega reglas personalizadas aquí
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    'flowtype/define-flow-type': 1,
    'flowtype/use-flow-type': 1
  }
};
