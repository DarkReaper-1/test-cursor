import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Card, Field, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../store/AppContext';

export function HistoryScreen() {
  const { colors, scale, localHistory } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () =>
      localHistory.filter(
        (h) =>
          !q ||
          h.title.toLowerCase().includes(q.toLowerCase()) ||
          (h.subtitle || '').toLowerCase().includes(q.toLowerCase()),
      ),
    [localHistory, q],
  );

  return (
    <Screen title="History" subtitle="Every scan is saved on this device.">
      <Field value={q} onChangeText={setQ} placeholder="Search history" />
      {filtered.map((h) => (
        <Pressable
          key={h.id}
          onPress={() => {
            if (h.payload && (h.payload as any).product) {
              navigation.navigate('ProductResult', { result: h.payload as any });
            } else if ((h.payload as any)?.analysis) {
              navigation.navigate('ProductResult', {
                result: {
                  product: {
                    name: h.title,
                    categories: [],
                    nutrition: {},
                    product_type: 'food',
                  },
                  analysis: (h.payload as any).analysis,
                  alternatives: [],
                  medicine_notes: [],
                  cosmetic_notes: [],
                },
              });
            }
          }}
        >
          <Card>
            <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700' }}>
              {h.status === 'halal' ? '✅' : h.status === 'doubtful' ? '⚠️' : '❌'} {h.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 4 }}>{h.subtitle}</Text>
            <Text style={{ color: colors.tabInactive, fontSize: scale(13), marginTop: 6 }}>
              {new Date(h.created_at).toLocaleString()} · {h.kind}
            </Text>
          </Card>
        </Pressable>
      ))}
      {!filtered.length && (
        <Card>
          <Text style={{ color: colors.textSecondary, fontSize: scale(17) }}>No history yet.</Text>
        </Card>
      )}
    </Screen>
  );
}
