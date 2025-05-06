import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';

const TEXT_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/text';
const AUDIO_UPLOAD_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/generate-upload-url';
const AUDIO_NOTIFY_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/audio';

export default function Send() {
  const colorScheme = useColorScheme();
  const [text, setText] = useState('');
  const [classification, setClassification] = useState('');
  const [showClassificationInput, setShowClassificationInput] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const userId = 'user123';
  const recordStart = useRef<number | null>(null);

  const theme = {
    background: colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC',
    text: colorScheme === 'dark' ? '#fff' : '#000',
    card: colorScheme === 'dark' ? '#1e1e1e' : '#fff',
    border: colorScheme === 'dark' ? '#444' : '#ccc',
    accent: '#004080',
  };

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowClassificationInput(!showClassificationInput);
  };

  const sendText = async () => {
    if (!text.trim()) return;
    setSendingText(true);
    const payload: Record<string, any> = { userId, text };
    if (classification.trim()) payload.classification = classification.trim();

    try {
      await fetch(TEXT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setText('');
      setClassification('');
    } catch (err) {
      console.error(err);
    } finally {
      setSendingText(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      recordStart.current = Date.now();
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return;

      setSendingAudio(true);
      const response = await fetch(AUDIO_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const { uploadUrl, s3Key } = await response.json();

      const audioBinary = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const buffer = Buffer.from(audioBinary, 'base64');

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'audio/mpeg',
        },
        body: buffer,
      });

      await fetch(AUDIO_NOTIFY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, s3Key }),
      });
    } catch (err) {
      console.error('Error sending audio:', err);
    } finally {
      setRecording(null);
      setSendingAudio(false);
    }
  };

  const handleMicPressIn = (e: GestureResponderEvent) => {
    if (!text.trim()) startRecording();
  };

  const handleMicPressOut = (e: GestureResponderEvent) => {
    if (!text.trim()) stopRecording();
  };

  const handleSendButton = () => {
    if (text.trim()) {
      sendText();
      Keyboard.dismiss();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Escribe tu mensaje</Text>
        </View>

        <View style={styles.flexSpace} />

        <View style={[styles.bottomSection, { borderColor: theme.border }]}>
          <View style={styles.classificationContainer}>
            <TouchableOpacity onPress={toggleAccordion}>
              <Text style={[styles.label, { color: theme.text }]}>Clasificación {showClassificationInput ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showClassificationInput && (
              <TextInput
                placeholder="Ej: reflexiones, lugares, emociones"
                placeholderTextColor={theme.text}
                value={classification}
                onChangeText={setClassification}
                style={[styles.input, {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }]}
              />
            )}
          </View>

          <View style={styles.rowInputContainer}>
            <TextInput
              placeholder="Escribe tu mensaje"
              placeholderTextColor="#fff"
              value={text}
              onChangeText={setText}
              style={[styles.inputRounded, { color: theme.text, backgroundColor: '#333' }]}
              editable={!sendingText}
            />

            <Pressable
              onPressIn={!text ? handleMicPressIn : undefined}
              onPressOut={!text ? handleMicPressOut : undefined}
              onPress={text ? handleSendButton : undefined}
              style={[styles.micButton, { backgroundColor: theme.accent }]}
            >
              <MaterialIcons
                name={text ? 'send' : 'mic'}
                size={22}
                color="#fff"
              />
            </Pressable>
          </View>

          {sendingText ? (
            <ActivityIndicator size="small" color={theme.text} style={{ marginVertical: 8 }} />
          ) : null}

          {sendingAudio && <ActivityIndicator size="small" color={theme.text} style={{ marginTop: 10 }} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, marginTop: 40 },
  flexSpace: { flex: 1 },
  bottomSection: { borderTopWidth: 1, paddingTop: 12 },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  inputRounded: {
    flex: 1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 16,
    height: 45,
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  classificationContainer: {
    marginBottom: 10,
  },
  rowInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  micButton: {
    width: 45,
    height: 45,
    borderRadius: 45 / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
