import { OfflineBanner } from '@/components/OfflineBanner';
import { useColorScheme } from '@/hooks/useColorScheme';
import { config } from '@gluestack-ui/config';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { networkService } from '../services/networkService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    networkService.start();
    return () => networkService.stop();
  }, []);

  if (!loaded) return null;

  return (
    <GluestackUIProvider config={config}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="tags" options={{ headerShown: false }} />
          <Stack.Screen 
            name="list/[id]" 
            options={{ 
              headerShown: true,
              headerBackTitle: 'Listas',
              headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#1A1F3A',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#0A0E27' : '#F5F7FA',
              },
            }} 
          />
          <Stack.Screen 
            name="settings/drive" 
            options={{ 
              headerShown: true,
              headerBackTitle: 'Info',
              headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#1A1F3A',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#0A0E27' : '#F5F7FA',
              },
            }} 
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        <OfflineBanner />
        <StatusBar style="auto" />
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
