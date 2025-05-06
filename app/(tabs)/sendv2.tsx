import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import {
  ComposerProps,
  GiftedChat,
  IMessage,
  InputToolbar,
  User,
} from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEXT_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/text';
const AUDIO_UPLOAD_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/generate-upload-url';
const AUDIO_NOTIFY_ENDPOINT = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/audio';

export default function Send() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [classification, setClassification] = useState('');
  const [showClassificationInput, setShowClassificationInput] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
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

  const onSend = async (newMessages: IMessage[] = []) => {
    const message = newMessages[0];
    const payload: Record<string, any> = {
      userId,
      text: message.text,
    };
    if (classification.trim()) payload.classification = classification.trim();

    setSendingText(true);
    try {
      await fetch(TEXT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
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

  const renderInputToolbar = (props: any) => (
    <InputToolbar
      {...props}
      containerStyle={{
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        paddingHorizontal: 8,
        paddingBottom: Platform.OS === 'ios' ? 0 : 0,
      }}
    />
  );

  const renderComposer = (props: ComposerProps) => (
    <View style={styles.rowInputContainer}>
      <TextInput
        {...props}
        placeholder="Escribe tu mensaje"
        placeholderTextColor="#fff"
        value={text}
        onChangeText={setText}
        style={[styles.inputRounded, { color: theme.text, backgroundColor: 'transparent' }]}
        editable={!sendingText}
      />
      <Pressable
        onPressIn={!text ? handleMicPressIn : undefined}
        onPressOut={!text ? handleMicPressOut : undefined}
        onPress={
          text
            ? () =>
                onSend([
                  {
                    _id: Date.now().toString(),
                    text,
                    user: { _id: userId },
                    createdAt: new Date(),
                  },
                ])
            : undefined
        }
        style={[styles.micButton, { backgroundColor: theme.accent }]}
      >
        <MaterialIcons name={text ? 'send' : 'mic'} size={22} color="#fff" />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.select({
          ios: 'padding',
          android: undefined
        })}
        keyboardVerticalOffset={Platform.select({
          ios: 0,
          android: 0
        })}
      >
        <View style={[styles.header, { marginTop: insets.top }]}>
          <Text style={[styles.title, { color: theme.text }]}>Escribe tu mensaje</Text>
        </View>

        <View style={styles.classificationContainer}>
          <TouchableOpacity onPress={toggleAccordion}>
            <Text style={[styles.label, { color: theme.text }]}>
              Clasificación {showClassificationInput ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showClassificationInput && (
            <TextInput
              placeholder="Ej: reflexiones, lugares, emociones"
              placeholderTextColor={theme.text}
              value={classification}
              onChangeText={setClassification}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            />
          )}
        </View>

        <View style={styles.chatContainer}>
          <GiftedChat
            messages={messages}
            onSend={newMessages => onSend(newMessages)}
            user={{ _id: userId } as User}
            renderInputToolbar={renderInputToolbar}
            renderComposer={renderComposer}
            placeholder=""
            text={text}
            onInputTextChanged={setText}
            isTyping={sendingText}
            maxComposerHeight={100}
            minComposerHeight={45}
            bottomOffset={0}
            renderAvatar={null}
            alwaysShowSend
            inverted={true}
            messagesContainerStyle={styles.messagesContainer}
            renderFooter={() =>
              sendingAudio ? (
                <ActivityIndicator size="small" color={theme.text} style={{ marginBottom: 10 }} />
              ) : null
            }
            listViewProps={{
              scrollEventThrottle: 16,
              keyboardDismissMode: 'interactive',
              keyboardShouldPersistTaps: 'handled',
              contentContainerStyle: {
                flexGrow: 1,
                justifyContent: 'flex-end',
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  classificationContainer: {
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flexGrow: 1,
  },
  rowInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
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
  micButton: {
    width: 45,
    height: 45,
    borderRadius: 45 / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
