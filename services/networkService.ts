import * as Network from 'expo-network';

type NetworkListener = (isConnected: boolean) => void;

class NetworkService {
  private _isConnected: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Inicia el monitoreo de red. Llamar una vez al inicio de la app.
   */
  start(): void {
    // Check initial state
    this.checkConnection();

    // Poll every 5 seconds (expo-network doesn't have a listener API)
    this.pollInterval = setInterval(() => {
      this.checkConnection();
    }, 5000);
  }

  private async checkConnection(): Promise<void> {
    try {
      const state = await Network.getNetworkStateAsync();
      const connected = !!(state.isConnected && state.isInternetReachable);
      if (connected !== this._isConnected) {
        this._isConnected = connected;
        this.notifyListeners(connected);
        if (__DEV__) console.log(`🌐 Network: ${connected ? 'Online' : 'Offline'}`);
      }
    } catch {
      // If we can't check, assume connected
    }
  }

  /**
   * Detiene el monitoreo de red.
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Suscribe un listener para cambios de conectividad.
   * Retorna función para desuscribirse.
   */
  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(isConnected: boolean): void {
    this.listeners.forEach(listener => listener(isConnected));
  }
}

export const networkService = new NetworkService();
