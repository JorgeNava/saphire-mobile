import { AudioRecorder } from '@/components/AudioRecorder';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';

const TEXT_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/text';
const AUDIO_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev';

export default function Send() {
  const [text, setText] = useState('');
  const [classification, setClassification] = useState('');
  const [showClassificationInput, setShowClassificationInput] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const userId = 'user123';

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowClassificationInput(!showClassificationInput);
  };

  const sendText = async () => {
    if (!text.trim()) {
      return;
    }

    setSendingText(true);

    const payload: Record<string, any> = {
      userId,
      text,
    };

    if (classification.trim()) {
      payload.classification = classification.trim();
    }

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

  const sendAudio = async (uri: string) => {
    setSendingAudio(true);

    const metadata: Record<string, any> = {
      userId,
      messageId: uuidv4(),
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      inputType: 'audio',
      originalContent: 'AUDIO_FILE',
      usedAI: false,
    };

    if (classification.trim()) {
      metadata.classification = classification.trim();
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: 'audio.m4a',
      type: 'audio/x-m4a',
    } as any);
    formData.append('metadata', JSON.stringify(metadata));

    try {
      await fetch(AUDIO_ENDPOINT, {
        method: 'POST',
        body: formData,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSendingAudio(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View>
        <Text style={styles.title}>Escribe tu mensaje</Text>
      </View>

      <View style={styles.flexSpace} />

      <View style={styles.bottomSection}>
        <TextInput
          placeholder="Escribe tu mensaje"
          placeholderTextColor="#000"
          value={text}
          onChangeText={setText}
          style={styles.input}
          editable={!sendingText}
        />

        {/* Accordion Clasificación */}
        <View style={styles.classificationContainer}>
          <TouchableOpacity onPress={toggleAccordion}>
            <Text style={styles.label}>
              Clasificación {showClassificationInput ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showClassificationInput && (
            <TextInput
              placeholder="Ej: reflexiones, lugares, emociones"
              placeholderTextColor="#000"
              value={classification}
              onChangeText={setClassification}
              style={styles.input}
            />
          )}
        </View>

        {sendingText ? (
          <ActivityIndicator size="small" color="#000" style={{ marginVertical: 8 }} />
        ) : (
          <Button title="Enviar texto" onPress={sendText} disabled={sendingText} />
        )}

        <View style={{ marginVertical: 20 }}>
          <Text style={styles.label}>Graba un mensaje de voz</Text>
          {sendingAudio ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <AudioRecorder onRecorded={sendAudio} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  flexSpace: {
    flex: 1,
  },
  bottomSection: {
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    color: '#000',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  classificationContainer: {
    marginBottom: 10,
  },
});
