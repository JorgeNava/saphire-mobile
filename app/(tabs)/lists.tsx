import {
  Box,
  HStack,
  Icon,
  Pressable,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, ListRenderItem, useColorScheme } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface List {
  listId: string;
  name: string;
  tags: string[];
  items: string[];
}

const API_BASE = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev';

export default function ListsScreen() {
  const router = useRouter();
  const themeBg = useColorScheme() === 'dark' ? '#1D3D47' : '#A1CEDC';
  const [lists, setLists] = useState<List[]>([]);

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    try {
      const res = await fetch(`${API_BASE}/lists?userId=user123`);
      const { lists } = await res.json();
      setLists(lists);
    } catch {
      Alert.alert('Error', 'No se pudo cargar las listas');
    }
  }

  const renderListItem: ListRenderItem<List> = ({ item }) => (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: '$2', bg: '$gray700', px: '$3', py: '$2', borderRadius: '$md' }}
    >
      <Pressable onPress={() => router.push(`/list/${item.listId}`)}>
        <VStack>
          <Text sx={{ color: '$white', fontSize: '$lg' }}>{item.name}</Text>
          <HStack sx={{ flexWrap: 'wrap', gap: '$1', mt: '$1' }}>
            {item.tags.map(t => (
              <Box
                key={t}
                sx={{ bg: '$gray600', px: '$2', py: '$1', borderRadius: '$sm' }}
              >
                <Text sx={{ color: '$white', fontSize: '$xs' }}>{t}</Text>
              </Box>
            ))}
          </HStack>
        </VStack>
      </Pressable>
      <HStack sx={{ gap: '$2', alignItems: 'center' }}>
        <Pressable onPress={() => router.push(`/list/${item.listId}`)}>
          <Icon as={MaterialIcons} name="chevron-right" size="md" color="$white" />
        </Pressable>
        <Pressable
          onPress={() => {
            Alert.alert('Confirmar', '¿Eliminar esta lista?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await fetch(`${API_BASE}/lists`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: 'user123',
                        listId: item.listId,
                      }),
                    });
                    setLists(prev => prev.filter(l => l.listId !== item.listId));
                  } catch {
                    Alert.alert('Error', 'No se pudo eliminar la lista');
                  }
                },
              },
            ]);
          }}
        >
          <Icon as={MaterialIcons} name="delete" size="md" color="$red500" />
        </Pressable>
      </HStack>
    </HStack>
  );

  return (
    <Box sx={{ flex: 1, bg: themeBg, px: '$4', pt: '$4' }}>
      <Text
        sx={{
          color: '$white',
          fontSize: 24,
          fontWeight: 'bold',
          mb: '$3',
          mt: 40,
        }}
      >
        Listas
      </Text>
      <FlatList
        data={lists}
        keyExtractor={l => l.listId}
        renderItem={renderListItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </Box>
  );
}
