import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">App de Mensajes</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Tecnologías</ThemedText>
        <ThemedText>- React Native (Expo)</ThemedText>
        <ThemedText>- Expo Router</ThemedText>
        <ThemedText>- AWS API Gateway</ThemedText>
        <ThemedText>- DateTime Picker, Toast, UUID</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Pantallas disponibles</ThemedText>
        <ThemedText>- Envío de texto y audio</ThemedText>
        <ThemedText>- Listado de mensajes con filtros</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Funcionalidades actuales</ThemedText>
        <ThemedText>- Envío de mensajes</ThemedText>
        <ThemedText>- Filtros dinámicos</ThemedText>
        <ThemedText>- Toasts de retroalimentación</ThemedText>
        <ThemedText>- Clasificación opcional</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Cómo probar la app</ThemedText>
        <ThemedText>Ejecuta `npx expo start` y escanea el QR con Expo Go.</ThemedText>
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
