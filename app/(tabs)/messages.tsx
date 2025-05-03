import { InputType, Message } from '@/types/message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

const API_BASE = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev/messages';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function toISOStringWithZ(date: Date) {
  return new Date(date).toISOString().split('.')[0] + 'Z';
}

export default function MessagesScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const [usedAI, setUsedAI] = useState<boolean | null>(null);
  const [classification, setClassification] = useState('');
  const [inputType, setInputType] = useState<InputType>('text');
  const userId = 'user123';

  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [lastUpdatedFrom, setLastUpdatedFrom] = useState<Date | null>(null);
  const [lastUpdatedTo, setLastUpdatedTo] = useState<Date | null>(null);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [pickerVisible, setPickerVisible] = useState<{
    field: string;
    show: boolean;
  }>({ field: '', show: false });

  const showPicker = (field: string) => {
    setPickerVisible({ field, show: true });
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (!event || event.type === 'dismissed') {
        setPickerVisible({ field: '', show: false });
        return;
      }
    }

    if (selectedDate) {
      switch (pickerVisible.field) {
        case 'dateFrom':
          setDateFrom(selectedDate);
          break;
        case 'dateTo':
          setDateTo(selectedDate);
          break;
        case 'lastUpdatedFrom':
          setLastUpdatedFrom(selectedDate);
          break;
        case 'lastUpdatedTo':
          setLastUpdatedTo(selectedDate);
          break;
      }
    }

    setPickerVisible({ field: '', show: false });
  };

  const fetchMessages = async (applyFilters = true) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('userId', userId);

      if (applyFilters) {
        if (classification.trim()) params.append('classification', classification.toLowerCase());
        if (inputType) params.append('inputType', inputType.toLowerCase());
        if (dateFrom) params.append('dateFrom', toISOStringWithZ(dateFrom));
        if (dateTo) params.append('dateTo', toISOStringWithZ(dateTo));
        if (lastUpdatedFrom) params.append('lastUpdatedFrom', toISOStringWithZ(lastUpdatedFrom));
        if (lastUpdatedTo) params.append('lastUpdatedTo', toISOStringWithZ(lastUpdatedTo));
        if (usedAI !== null) {
          params.append('usedAI', usedAI.toString());
        }
      }

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(false);
  }, []);

  const toggleInputType = () => {
    setInputType((prev) => (prev === 'audio' ? 'text' : 'audio'));
  };

  const toggleUsedAI = () => {
    setUsedAI((prev) => (prev === null ? true : prev === true ? false : null));
  };

  const toggleDateFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDateFilters(!showDateFilters);
  };

  const formatDateDisplay = (date: Date | null) =>
    date ? toISOStringWithZ(date) : 'Seleccionar fecha';

  const getPickerValue = (): Date => {
    switch (pickerVisible.field) {
      case 'dateFrom':
        return dateFrom ?? new Date();
      case 'dateTo':
        return dateTo ?? new Date();
      case 'lastUpdatedFrom':
        return lastUpdatedFrom ?? new Date();
      case 'lastUpdatedTo':
        return lastUpdatedTo ?? new Date();
      default:
        return new Date();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mensajes</Text>

      <View style={styles.filters}>
        <Text style={styles.label}>Clasificación</Text>
        <TextInput
          placeholder="Clasificación"
          value={classification}
          onChangeText={setClassification}
          style={styles.input}
          placeholderTextColor="#000"
        />

        <View style={styles.switchContainer}>
          <Text>Tipo: {inputType}</Text>
          <Switch value={inputType === 'audio'} onValueChange={toggleInputType} />
        </View>

        <View style={styles.switchContainer}>
          <Text>Usó IA:</Text>
          <TouchableOpacity onPress={toggleUsedAI} style={styles.toggleButton}>
            <Text style={styles.toggleText}>
              {usedAI === null ? 'Cualquiera' : usedAI ? 'Sí' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity onPress={toggleDateFilters} style={styles.dropdownToggle}>
            <Text style={styles.label}>Por fechas {showDateFilters ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showDateFilters && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Desde (fecha creación)</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => showPicker('dateFrom')}>
                <Text style={styles.dateText}>{formatDateDisplay(dateFrom)}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Hasta (fecha creación)</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => showPicker('dateTo')}>
                <Text style={styles.dateText}>{formatDateDisplay(dateTo)}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Desde (última actualización)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => showPicker('lastUpdatedFrom')}
              >
                <Text style={styles.dateText}>{formatDateDisplay(lastUpdatedFrom)}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Hasta (última actualización)</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => showPicker('lastUpdatedTo')}
              >
                <Text style={styles.dateText}>{formatDateDisplay(lastUpdatedTo)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Button title="Aplicar filtros" onPress={() => fetchMessages(true)} />
      </View>

      {pickerVisible.show && (
        <DateTimePicker
          value={getPickerValue()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
          onChange={onChangeDate}
        />
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.messageId}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.text}>Tipo: {item.inputType}</Text>
              <Text style={styles.text}>Contenido: {item.originalContent}</Text>
              <Text style={styles.text}>Clasificación: {item.classification}</Text>
              <Text style={styles.text}>Usó IA: {item.usedAI ? 'Sí' : 'No'}</Text>
              <Text style={styles.text}>Creado: {new Date(item.timestamp).toLocaleString()}</Text>
              {item.lastUpdated && (
                <Text style={styles.text}>
                  Actualizado: {new Date(item.lastUpdated).toLocaleString()}
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f2f2f2',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  filters: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 4,
    color: '#000',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
    color: '#000',
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  toggleText: {
    color: '#000',
    fontWeight: '500',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  dateText: {
    color: '#000',
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownToggle: {
    paddingVertical: 6,
  },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  text: {
    color: '#000',
  },
});
