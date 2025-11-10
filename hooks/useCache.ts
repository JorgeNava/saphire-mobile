import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/cacheService';

/**
 * Hook personalizado para manejar datos con caché
 * @param fetchFunction - Función que obtiene los datos del servidor
 * @param cacheKey - Clave única para identificar el caché
 * @param cacheDuration - Duración del caché en milisegundos
 */
export function useCache<T>(
  fetchFunction: () => Promise<T>,
  getCacheFunction: () => Promise<T | null>,
  setCacheFunction: (data: T) => Promise<void>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Intentar obtener del caché primero
      if (!forceRefresh) {
        const cachedData = await getCacheFunction();
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      // Si no hay caché o se fuerza refresh, obtener del servidor
      const freshData = await fetchFunction();
      setData(freshData);
      
      // Guardar en caché
      await setCacheFunction(freshData);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, getCacheFunction, setCacheFunction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  return { data, loading, error, refresh };
}
