import { Text } from '@gluestack-ui/themed';
import { Stack, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const USER_ID = 'user123';

interface DriveStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

export default function DriveSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const theme = {
    bg: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    subtext: isDark ? '#A0A5C0' : '#6B7280',
    accent: '#6C63FF',
    success: '#4CAF50',
    danger: '#f44336',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/drive/oauth/status?userId=${USER_ID}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching drive status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = `${API_BASE}/drive/oauth/start?userId=${USER_ID}`;
      const result = await WebBrowser.openBrowserAsync(url);
      console.log('OAuth browser result:', result.type);
      // Refrescar estado después de cerrar el browser
      await fetchStatus();
    } catch (err) {
      console.error('Error opening OAuth:', err);
      Alert.alert('Error', 'No se pudo abrir el navegador para conectar Google Drive.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar Google Drive',
      '¿Estás seguro? Ya no podrás consultar tus documentos desde el chat.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              const res = await fetch(`${API_BASE}/drive/oauth?userId=${USER_ID}`, {
                method: 'DELETE',
              });
              if (res.ok) {
                setStatus({ connected: false, email: null, connectedAt: null });
                Alert.alert('Desconectado', 'Google Drive ha sido desvinculado.');
              } else {
                throw new Error('Error al desconectar');
              }
            } catch (err) {
              console.error('Error disconnecting:', err);
              Alert.alert('Error', 'No se pudo desconectar Google Drive.');
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Google Drive',
          headerBackTitle: 'Atrás',
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.bg },
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: status?.connected ? theme.success + '20' : theme.accent + '20' }]}>
            <MaterialIcons
              name="cloud"
              size={48}
              color={status?.connected ? theme.success : theme.accent}
            />
          </View>
        </View>

        {/* Status card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.accent} />
          ) : status?.connected ? (
            <>
              <View style={styles.statusRow}>
                <MaterialIcons name="check-circle" size={24} color={theme.success} />
                <Text style={[styles.statusText, { color: theme.success }]}>
                  Conectado
                </Text>
              </View>
              {status.email && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="email" size={20} color={theme.subtext} />
                  <Text style={[styles.infoText, { color: theme.text }]}>
                    {status.email}
                  </Text>
                </View>
              )}
              {status.connectedAt && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="access-time" size={20} color={theme.subtext} />
                  <Text style={[styles.infoText, { color: theme.subtext }]}>
                    Conectado: {formatDate(status.connectedAt)}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.statusRow}>
              <MaterialIcons name="cloud-off" size={24} color={theme.subtext} />
              <Text style={[styles.statusText, { color: theme.subtext }]}>
                No conectado
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: theme.subtext }]}>
          {status?.connected
            ? 'Tu Google Drive está conectado. Puedes preguntar sobre tus libros y documentos directamente desde el chat.'
            : 'Conecta tu Google Drive para consultar tus resúmenes de libros, documentos y más directamente desde el chat de Saphira.'}
        </Text>

        {/* Action button */}
        {!loading && (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: status?.connected ? 'transparent' : theme.accent,
                borderColor: status?.connected ? theme.danger : theme.accent,
                borderWidth: status?.connected ? 1.5 : 0,
              },
            ]}
            onPress={status?.connected ? handleDisconnect : handleConnect}
            disabled={connecting || disconnecting}
          >
            {connecting || disconnecting ? (
              <ActivityIndicator size="small" color={status?.connected ? theme.danger : '#fff'} />
            ) : (
              <>
                <MaterialIcons
                  name={status?.connected ? 'link-off' : 'link'}
                  size={20}
                  color={status?.connected ? theme.danger : '#fff'}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: status?.connected ? theme.danger : '#fff' },
                  ]}
                >
                  {status?.connected ? 'Desconectar Drive' : 'Conectar Google Drive'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Capabilities list */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 24 }]}>
          <Text style={[styles.capTitle, { color: theme.text }]}>
            Lo que puedes hacer:
          </Text>
          {[
            '¿Qué libros he leído?',
            '¿Qué puse sobre The Psychology of Money?',
            '¿Qué libros hablan sobre liderazgo?',
            'Dame el link al resumen de un libro',
            'Compara lo que dicen mis libros sobre X tema',
          ].map((example, i) => (
            <View key={i} style={styles.capRow}>
              <MaterialIcons name="chat-bubble-outline" size={16} color={theme.accent} />
              <Text style={[styles.capText, { color: theme.subtext }]}>
                "{example}"
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  capTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  capText: {
    fontSize: 13,
    flex: 1,
    fontStyle: 'italic',
  },
});
