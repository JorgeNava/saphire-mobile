import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from './networkService';

const QUEUE_KEY = 'offline_queue';

export interface QueuedOperation {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  description: string;
  createdAt: number;
}

class OfflineQueue {
  private processing = false;

  /**
   * Agrega una operación a la cola offline
   */
  async enqueue(operation: Omit<QueuedOperation, 'id' | 'createdAt'>): Promise<void> {
    const queue = await this.getQueue();
    const entry: QueuedOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    if (__DEV__) console.log(`📥 Operación encolada: ${entry.description}`);
  }

  /**
   * Obtiene todas las operaciones pendientes
   */
  async getQueue(): Promise<QueuedOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Cantidad de operaciones pendientes
   */
  async pendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Procesa todas las operaciones pendientes (llamar cuando vuelve la conexión)
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.processing) return { success: 0, failed: 0 };
    if (!networkService.isConnected) return { success: 0, failed: 0 };

    this.processing = true;
    const queue = await this.getQueue();
    if (queue.length === 0) {
      this.processing = false;
      return { success: 0, failed: 0 };
    }

    if (__DEV__) console.log(`🔄 Procesando ${queue.length} operaciones pendientes...`);

    let success = 0;
    let failed = 0;
    const remaining: QueuedOperation[] = [];

    for (const op of queue) {
      try {
        const response = await fetch(op.url, {
          method: op.method,
          headers: op.headers || { 'Content-Type': 'application/json' },
          body: op.body ? JSON.stringify(op.body) : undefined,
        });

        if (response.ok) {
          success++;
          if (__DEV__) console.log(`✅ ${op.description}`);
        } else {
          // Si es error 4xx, no reintentar (datos inválidos)
          if (response.status >= 400 && response.status < 500) {
            failed++;
            if (__DEV__) console.log(`❌ ${op.description} (${response.status}, descartado)`);
          } else {
            // Error 5xx, reintentar después
            remaining.push(op);
            failed++;
          }
        }
      } catch {
        // Error de red, mantener en cola
        remaining.push(op);
        failed++;
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    this.processing = false;

    if (__DEV__) console.log(`📊 Cola procesada: ${success} éxito, ${failed} fallidos, ${remaining.length} pendientes`);
    return { success, failed };
  }

  /**
   * Limpia la cola
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

export const offlineQueue = new OfflineQueue();
