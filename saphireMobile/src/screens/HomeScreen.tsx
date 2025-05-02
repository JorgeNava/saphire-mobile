/* import React from 'react';
import { View,  ScrollView, Text, StyleSheet, Button  } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import TextInputForm from '../components/TextInputForm';
import AudioRecorder from '../components/AudioRecorder';
import MessageList from '../components/MessageList';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tu espacio personal</Text>
      <TextInputForm />

      <AudioRecorder />

      <Text style={styles.subtitle}>Historial reciente</Text>
      <MessageList />

      <View style={styles.buttonWrapper}>
        <Button
          title="Ver historial completo"
          onPress={() => navigation.navigate('History')}
        />
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonWrapper: {
    marginTop: 24,
    marginBottom: 32,
  },
});
 */

import { View, Text} from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Pantalla cargada 🎉</Text>
    </View>
  );
}
