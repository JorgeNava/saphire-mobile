import { Alert } from 'react-native';
import { networkService } from '../services/networkService';
import { offlineQueue } from '../services/offlineQueue';

/**
 * Wrapper para fetch que maneja el modo offline.
 * Para operaciones de lectura (GET): retorna null si no hay conexión.
 * Para operaciones de escritura (POST/PUT/DELETE): encola la operación.
 */
export async function fetchWithOffline(
  url: string,
  options?: RequestInit & { offlineDescription?: string }
): Promise<Response | null> {
  const method = (options?.method || 'GET').toUpperCase();

  if (!networkService.isConnected) {
    if (method === 'GET') {
      // Lectura: retornar null, el caller usará caché
      return null;
    }

    // Escritura: encolar operación
    if (options?.offlineDescription) {
      await offlineQueue.enqueue({
        url,
        method: method as 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        body: options.body ? JSON.parse(options.body as string) : undefined,
        headers: options.headers as Record<string, string>,
        description: options.offlineDescription,
      });
      Alert.alert(
        'Sin conexión',
        'Tu cambio se guardó localmente y se sincronizará cuando vuelva la conexión.'
      );
    }
    return null;
  }

  return fetch(url, options);
}

/**
 * Verifica si hay conexión antes de una operación.
 * Muestra alerta amigable si no hay.
 */
export function checkConnection(actionName?: string): boolean {
  if (!networkService.isConnected) {
    Alert.alert(
      'Sin conexión',
      actionName
        ? `No se puede ${actionName} sin conexión a internet.`
        : 'Esta acción requiere conexión a internet.'
    );
    return false;
  }
  return true;
}
