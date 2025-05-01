import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { Picker } from '@react-native-picker/picker';
import { generateUploadUrl, sendAudioForProcessing } from '../services/api';

const audioRecorderPlayer = new AudioRecorderPlayer();

export default function AudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('notas');

  const path = useRef(`${RNFS.DocumentDirectoryPath}/audio_note.m4a`);

  const onStartRecord = async () => {
    setRecording(true);
    await audioRecorderPlayer.startRecorder(path.current);
  };

  const onStopRecord = async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    setRecording(false);
    handleUpload(result);
  };

  const handleUpload = async (filePath: string) => {
    try {
      setUploading(true);

      const { uploadUrl, s3AudioUrl } = await generateUploadUrl({ userId: 'abc123' });

      const file = await RNFS.readFile(filePath, 'base64');
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'audio/m4a',
        },
        body: Buffer.from(file, 'base64'),
      });

      if (!response.ok) throw new Error('Error subiendo el audio');

      await sendAudioForProcessing({
        userId: 'abc123',
        s3AudioUrl,
        classification: category,
      });

      Alert.alert('Audio enviado', 'Se envió y procesó correctamente.');
    } catch (error) {
      console.error('Error en subida:', error);

      if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Error inesperado');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grabadora de audio</Text>

      {/* Picker para seleccionar categoría */}
      <Picker
        selectedValue={category}
        onValueChange={setCategory}
        style={styles.picker}
      >
        <Picker.Item label="Notas" value="notas" />
        <Picker.Item label="Ideas" value="ideas" />
        <Picker.Item label="Lista de deseos" value="lista de deseos" />
        <Picker.Item label="Lugares por visitar" value="lugares por visitar" />
        <Picker.Item label="Pendiente" value="pendiente" />
      </Picker>

      {recording ? (
        <Button title="Detener grabación" onPress={onStopRecord} />
      ) : (
        <Button title="Iniciar grabación" onPress={onStartRecord} />
      )}

      {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 6,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  picker: {
    marginVertical: 10,
  },
});
