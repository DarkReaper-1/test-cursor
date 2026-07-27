import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Card, DisclaimerBanner, Field, LargeButton, Loading, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { analyzeText } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';

export function IngredientAnalyzeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const productType = route.params?.productType || 'food';
  const { colors, scale, addLocalHistory } = useApp();
  const school = useSchool();
  const [text, setText] = useState(
    route.params?.initialText ||
      'Water, sugar, gelatin, citric acid, natural flavors, mono and diglycerides',
  );
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { analysis, id } = await analyzeText(text, school, productType, 'Ingredient list');
      addLocalHistory({
        id: id || `${Date.now()}`,
        title: 'Ingredient analysis',
        subtitle: analysis.reason,
        status: analysis.status,
        kind: 'text',
        created_at: new Date().toISOString(),
        payload: { analysis },
      });
      navigation.navigate('ProductResult', {
        title: 'Ingredient Analysis',
        analysisOnly: analysis,
        result: {
          product: {
            name: 'Custom ingredient list',
            categories: [],
            nutrition: {},
            product_type: productType,
            ingredients_text: text,
          },
          analysis,
          alternatives: [],
          medicine_notes: [],
          cosmetic_notes: [],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!photo.canceled) {
      navigation.navigate('CameraOCR', { productType });
    }
  };

  return (
    <Screen title="AI Ingredient Analyzer" subtitle="Paste the ingredient list or take a photo.">
      <DisclaimerBanner />
      <Card>
        <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700', marginBottom: 8 }}>
          Ingredient text
        </Text>
        <Field
          value={text}
          onChangeText={setText}
          multiline
          style={{ minHeight: 160, textAlignVertical: 'top' }}
          placeholder="Paste ingredients here"
        />
        {loading ? (
          <Loading label="Reading ingredients…" />
        ) : (
          <>
            <LargeButton label="Analyze Ingredients" onPress={run} />
            <LargeButton label="Take Picture Instead" variant="secondary" onPress={pickPhoto} />
          </>
        )}
      </Card>
    </Screen>
  );
}
