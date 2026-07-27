import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, DisclaimerBanner, Field, LargeButton, Loading, Screen, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { analyzeOcr } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';

export function CameraOCRScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { colors, scale, addLocalHistory } = useApp();
  const school = useSchool();
  const [text, setText] = useState(
    'Ingredients: Water, Sugar, Gelatin, Citric Acid, Natural Flavor, Carmine',
  );
  const [lines, setLines] = useState<
    Array<{ text: string; status: string; mark: string; highlight: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const run = async (raw: string, demoKey?: string) => {
    setLoading(true);
    try {
      const parsed = await analyzeOcr(raw, school, demoKey);
      setText(parsed.ingredients_text || raw);
      setLines(parsed.lines || []);
      addLocalHistory({
        id: parsed.id || `${Date.now()}`,
        title: 'Label OCR',
        subtitle: parsed.analysis.reason,
        status: parsed.analysis.status,
        kind: 'ocr',
        created_at: new Date().toISOString(),
        payload: parsed as unknown as Record<string, unknown>,
      });
      navigation.navigate('ProductResult', {
        title: 'Label Scan',
        analysisOnly: parsed.analysis,
        result: {
          product: {
            name: 'Scanned label',
            categories: [],
            nutrition: {},
            product_type: route.params?.productType || 'food',
            ingredients_text: parsed.ingredients_text,
          },
          analysis: parsed.analysis,
          alternatives: [],
          medicine_notes: [],
          cosmetic_notes: [],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const photo = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!photo.canceled) {
      // On-device OCR hooks in production; demo uses sample text after capture.
      await run(text, 'gummies');
    }
  };

  return (
    <Screen title="Camera OCR" subtitle="Photograph the ingredient label. Risky items are highlighted.">
      <DisclaimerBanner />
      <LargeButton label="Take Photo" onPress={takePhoto} />
      <LargeButton label="Use Demo Gummy Label" variant="secondary" onPress={() => run('', 'gummies')} />
      <Card>
        <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700', marginBottom: 8 }}>
          Or paste OCR text
        </Text>
        <Field
          value={text}
          onChangeText={setText}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        {loading ? <Loading label="Reading label…" /> : <LargeButton label="Detect Ingredients" onPress={() => run(text)} />}
      </Card>

      {!!lines.length && (
        <Card>
          <SectionTitle>Ingredients</SectionTitle>
          {lines.map((line, idx) => {
            const color =
              line.highlight === 'red'
                ? colors.haram
                : line.highlight === 'amber'
                  ? colors.doubtful
                  : colors.text;
            return (
              <View key={`${line.text}-${idx}`} style={{ marginBottom: 8 }}>
                <Text style={{ color, fontSize: scale(18), fontWeight: line.mark ? '700' : '500' }}>
                  {line.text} {line.mark}
                </Text>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
