import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Card, Field, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { searchIngredients } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';
import type { IngredientHit } from '../types/halal';

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, scale } = useApp();
  const school = useSchool();
  const [q, setQ] = useState('gelatin');
  const [results, setResults] = useState<IngredientHit[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      searchIngredients(q, school).then(setResults);
    }, 200);
    return () => clearTimeout(t);
  }, [q, school]);

  return (
    <Screen title="Ingredient Search" subtitle="Works offline for common E-numbers and additives.">
      <Field
        value={q}
        onChangeText={setQ}
        placeholder="Search: Gelatin, E120, Rennet…"
        autoCapitalize="none"
      />
      {results.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => navigation.navigate('IngredientDetail', { ingredientId: item.id, name: item.name })}
        >
          <Card>
            <Text style={{ color: colors.text, fontSize: scale(20), fontWeight: '700' }}>
              {item.name} {item.e_number ? `(${item.e_number})` : ''}
            </Text>
            <Text
              style={{
                color:
                  item.status === 'haram'
                    ? colors.haram
                    : item.status === 'doubtful'
                      ? colors.doubtful
                      : colors.halal,
                fontSize: scale(17),
                marginTop: 4,
                fontWeight: '700',
              }}
            >
              {item.status.toUpperCase()}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 6 }} numberOfLines={2}>
              {item.explanation}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
