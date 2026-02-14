import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F5F7FA', dark: '#0A0E27' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Saphire Mobile</ThemedText>
        <ThemedText>Versión 1.7.0</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">✨ Novedades v1.7.0</ThemedText>
        <ThemedText>• Modo offline: la app funciona sin internet</ThemedText>
        <ThemedText>• Banner de estado de conexión en tiempo real</ThemedText>
        <ThemedText>• Cola de operaciones pendientes offline</ThemedText>
        <ThemedText>• Caché persistente que no expira sin internet</ThemedText>
        <ThemedText>• Sincronización automática al restaurar conexión</ThemedText>
        <ThemedText>• Mensajes se envían al volver online</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">💬 Chat</ThemedText>
        <ThemedText>• Burbujas estilo WhatsApp con avatares</ThemedText>
        <ThemedText>• Separadores por día (Hoy, Ayer, fecha)</ThemedText>
        <ThemedText>• Hora dentro de cada burbuja</ThemedText>
        <ThemedText>• Selector de etiquetas con chips tappables</ThemedText>
        <ThemedText>• Búsqueda de etiquetas en panel horizontal</ThemedText>
        <ThemedText>• Estados visuales (enviando, enviado, error)</ThemedText>
        <ThemedText>• Historial de 100 mensajes con caché</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">� Pensamientos</ThemedText>
        <ThemedText>• Búsqueda por contenido (texto libre)</ThemedText>
        <ThemedText>• Filtros por etiquetas y fecha</ThemedText>
        <ThemedText>• Selección múltiple y eliminación masiva</ThemedText>
        <ThemedText>• Conversión a lista o nota</ThemedText>
        <ThemedText>• Edición/eliminación mantiene orden</ThemedText>
        <ThemedText>• Paginación bidireccional</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">� Notas</ThemedText>
        <ThemedText>• CRUD completo con página dedicada</ThemedText>
        <ThemedText>• Etiquetas editables como chips</ThemedText>
        <ThemedText>• Búsqueda full-text en tiempo real</ThemedText>
        <ThemedText>• Bloqueo biométrico por nota</ThemedText>
        <ThemedText>• Auto-guardado y paginación</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">� Listas</ThemedText>
        <ThemedText>• Crear listas manuales o desde etiquetas</ThemedText>
        <ThemedText>• Items completables con barra de progreso</ThemedText>
        <ThemedText>• Bloqueo biométrico por lista</ThemedText>
        <ThemedText>• Botón compartir directo</ThemedText>
        <ThemedText>• Búsqueda por nombre o etiqueta</ThemedText>
        <ThemedText>• Refresh automático desde tags</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">�️ Etiquetas</ThemedText>
        <ThemedText>• Pantalla dedicada con búsqueda</ThemedText>
        <ThemedText>• Detalle con recursos por tipo</ThemedText>
        <ThemedText>• Editar y eliminar etiquetas</ThemedText>
        <ThemedText>• Autocompletado inteligente</ThemedText>
        <ThemedText>• Filtrado local + servidor</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">⚡ Rendimiento</ThemedText>
        <ThemedText>• Caché inteligente con TTL (5-10 min)</ThemedText>
        <ThemedText>• Background sync cada 4-8 min</ThemedText>
        <ThemedText>• useFocusEffect con cooldown (30s)</ThemedText>
        <ThemedText>• Memoización de renderItem y filtros</ThemedText>
        <ThemedText>• Logs silenciados en producción</ThemedText>
        <ThemedText>• Comparación de datos antes de re-render</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">� Tecnologías</ThemedText>
        <ThemedText>• React Native + Expo SDK 52</ThemedText>
        <ThemedText>• TypeScript + Expo Router</ThemedText>
        <ThemedText>• AWS API Gateway + Lambda + DynamoDB</ThemedText>
        <ThemedText>• Gluestack UI + Material Icons</ThemedText>
        <ThemedText>• AsyncStorage para caché local</ThemedText>
        <ThemedText>• expo-local-authentication (biometría)</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 12,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
