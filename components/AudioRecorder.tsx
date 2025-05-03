import { Audio } from 'expo-av';
import { useState } from 'react';
import { Button } from 'react-native';

interface Props {
  onRecorded: (uri: string) => void;
}

export function AudioRecorder({ onRecorded }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
    } catch (err) {
      console.error('Error al comenzar grabación:', err);
    }
  };

  const stopRecording = async () => {
    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      if (uri) onRecorded(uri);
    } catch (err) {
      console.error('Error al detener grabación:', err);
    }
  };

  return (
    <Button
      title={recording ? 'Detener grabación' : 'Grabar audio'}
      onPress={recording ? stopRecording : startRecording}
    />
  );
}
