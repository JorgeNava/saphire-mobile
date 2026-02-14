import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { networkService } from '../services/networkService';
import { offlineQueue } from '../services/offlineQueue';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!networkService.isConnected);
  const [pendingOps, setPendingOps] = useState(0);
  const [showSynced, setShowSynced] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = networkService.subscribe(async (connected) => {
      setIsOffline(!connected);

      if (connected) {
        // Procesar cola cuando vuelve la conexión
        const result = await offlineQueue.processQueue();
        if (result.success > 0) {
          setShowSynced(true);
          setTimeout(() => setShowSynced(false), 3000);
        }
        setPendingOps(0);
      } else {
        const count = await offlineQueue.pendingCount();
        setPendingOps(count);
      }
    });

    // Check initial
    offlineQueue.pendingCount().then(setPendingOps);

    return unsubscribe;
  }, []);

  useEffect(() => {
    const show = isOffline || showSynced;
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, showSynced]);

  if (!isOffline && !showSynced) return null;

  return (
    <Animated.View style={[
      styles.container,
      { opacity, backgroundColor: showSynced ? '#10B981' : '#EF4444' }
    ]}>
      <Ionicons
        name={showSynced ? 'checkmark-circle' : 'cloud-offline'}
        size={16}
        color="#fff"
      />
      <Text style={styles.text}>
        {showSynced
          ? 'Conexión restaurada - datos sincronizados'
          : `Sin conexión${pendingOps > 0 ? ` • ${pendingOps} cambios pendientes` : ' • usando datos locales'}`
        }
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
