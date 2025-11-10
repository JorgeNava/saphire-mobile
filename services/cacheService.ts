import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos para el caché
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Configuración de tiempos de expiración (en milisegundos)
const CACHE_EXPIRATION = {
  TAGS: 5 * 60 * 1000,      // 5 minutos
  LISTS: 2 * 60 * 1000,     // 2 minutos
  MESSAGES: 1 * 60 * 1000,  // 1 minuto
};

// Claves para el almacenamiento
const CACHE_KEYS = {
  TAGS: 'cache_tags',
  LISTS: 'cache_lists',
  MESSAGES: 'cache_messages',
};

class CacheService {
  private syncIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * Guarda datos en el caché con un tiempo de expiración
   */
  async set<T>(key: string, data: T, expirationMs: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expirationMs,
      };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`Error saving to cache (${key}):`, error);
    }
  }

  /**
   * Obtiene datos del caché si no han expirado
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      
      // Verificar si el caché ha expirado
      if (Date.now() > entry.expiresAt) {
        await this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Error reading from cache (${key}):`, error);
      return null;
    }
  }

  /**
   * Elimina una entrada del caché
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from cache (${key}):`, error);
    }
  }

  /**
   * Limpia todo el caché
   */
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Verifica si una entrada del caché es válida
   */
  async isValid(key: string): Promise<boolean> {
    try {
      const item = await AsyncStorage.getItem(key);
      if (!item) return false;

      const entry: CacheEntry<any> = JSON.parse(item);
      return Date.now() <= entry.expiresAt;
    } catch (error) {
      return false;
    }
  }

  // Métodos específicos para cada tipo de dato

  /**
   * Guarda etiquetas en el caché
   */
  async setTags(tags: Array<{tagId: string; name: string}>): Promise<void> {
    await this.set(CACHE_KEYS.TAGS, tags, CACHE_EXPIRATION.TAGS);
  }

  /**
   * Obtiene etiquetas del caché
   */
  async getTags(): Promise<Array<{tagId: string; name: string}> | null> {
    return await this.get(CACHE_KEYS.TAGS);
  }

  /**
   * Guarda listas en el caché
   */
  async setLists(lists: any[]): Promise<void> {
    await this.set(CACHE_KEYS.LISTS, lists, CACHE_EXPIRATION.LISTS);
  }

  /**
   * Obtiene listas del caché
   */
  async getLists(): Promise<any[] | null> {
    return await this.get(CACHE_KEYS.LISTS);
  }

  /**
   * Guarda mensajes en el caché
   */
  async setMessages(messages: any[]): Promise<void> {
    await this.set(CACHE_KEYS.MESSAGES, messages, CACHE_EXPIRATION.MESSAGES);
  }

  /**
   * Obtiene mensajes del caché
   */
  async getMessages(): Promise<any[] | null> {
    return await this.get(CACHE_KEYS.MESSAGES);
  }

  /**
   * Invalida el caché de etiquetas (útil después de crear/editar/eliminar)
   */
  async invalidateTags(): Promise<void> {
    await this.remove(CACHE_KEYS.TAGS);
  }

  /**
   * Invalida el caché de listas
   */
  async invalidateLists(): Promise<void> {
    await this.remove(CACHE_KEYS.LISTS);
  }

  /**
   * Invalida el caché de mensajes
   */
  async invalidateMessages(): Promise<void> {
    await this.remove(CACHE_KEYS.MESSAGES);
  }

  /**
   * Inicia sincronización automática en background
   * @param key - Clave del caché a sincronizar
   * @param fetchFunction - Función que obtiene datos frescos del servidor
   * @param intervalMs - Intervalo de sincronización en milisegundos
   */
  startBackgroundSync<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    intervalMs: number
  ): void {
    // Detener sincronización existente si hay una
    this.stopBackgroundSync(key);

    // Crear nuevo intervalo
    const interval = setInterval(async () => {
      try {
        console.log(`🔄 Background sync: ${key}`);
        const freshData = await fetchFunction();
        
        // Determinar tiempo de expiración basado en la clave
        let expirationMs = CACHE_EXPIRATION.TAGS;
        if (key === CACHE_KEYS.LISTS) expirationMs = CACHE_EXPIRATION.LISTS;
        if (key === CACHE_KEYS.MESSAGES) expirationMs = CACHE_EXPIRATION.MESSAGES;
        
        await this.set(key, freshData, expirationMs);
        console.log(`✅ Background sync completed: ${key}`);
      } catch (error) {
        console.error(`❌ Background sync failed for ${key}:`, error);
      }
    }, intervalMs);

    this.syncIntervals.set(key, interval);
  }

  /**
   * Detiene la sincronización en background para una clave específica
   */
  stopBackgroundSync(key: string): void {
    const interval = this.syncIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(key);
      console.log(`🛑 Stopped background sync: ${key}`);
    }
  }

  /**
   * Detiene todas las sincronizaciones en background
   */
  stopAllBackgroundSync(): void {
    this.syncIntervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`🛑 Stopped background sync: ${key}`);
    });
    this.syncIntervals.clear();
  }

  /**
   * Inicia sincronización automática para etiquetas
   */
  startTagsSync(fetchFunction: () => Promise<Array<{tagId: string; name: string}>>): void {
    // Sincronizar cada 4 minutos (antes de que expire el caché de 5 min)
    this.startBackgroundSync(CACHE_KEYS.TAGS, fetchFunction, 4 * 60 * 1000);
  }

  /**
   * Inicia sincronización automática para listas
   */
  startListsSync(fetchFunction: () => Promise<any[]>): void {
    // Sincronizar cada 90 segundos (antes de que expire el caché de 2 min)
    this.startBackgroundSync(CACHE_KEYS.LISTS, fetchFunction, 90 * 1000);
  }

  /**
   * Inicia sincronización automática para mensajes
   */
  startMessagesSync(fetchFunction: () => Promise<any[]>): void {
    // Sincronizar cada 45 segundos (antes de que expire el caché de 1 min)
    this.startBackgroundSync(CACHE_KEYS.MESSAGES, fetchFunction, 45 * 1000);
  }

  /**
   * Inicia sincronización automática para notas
   */
  startNotesSync(fetchFunction: () => Promise<any[]>): void {
    // Sincronizar cada 4 minutos (antes de que expire el caché de 5 min)
    this.startBackgroundSync('cache_notes', fetchFunction, 4 * 60 * 1000);
  }

  /**
   * Inicia sincronización automática para pensamientos
   */
  startThoughtsSync(fetchFunction: () => Promise<any[]>): void {
    // Sincronizar cada 90 segundos (antes de que expire el caché de 2 min)
    this.startBackgroundSync('cache_thoughts', fetchFunction, 90 * 1000);
  }
}

export const cacheService = new CacheService();
