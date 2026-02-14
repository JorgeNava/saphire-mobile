let LocalAuthentication: typeof import('expo-local-authentication') | null = null;

try {
  LocalAuthentication = require('expo-local-authentication');
} catch (e) {
  console.warn('expo-local-authentication native module not available. Biometric auth disabled.');
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!LocalAuthentication) return false;
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    if (!LocalAuthentication) {
      console.warn('Biometric auth not available — native module missing. Allowing access.');
      return true;
    }

    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return true;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    return !!result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return true;
  }
}
