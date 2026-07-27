import React, { useState } from 'react';
import { Text } from 'react-native';
import { Card, DisclaimerBanner, Field, LargeButton, Loading, Screen, SectionTitle } from '../components/ui';
import { analyzeMenu } from '../services/api';
import { useApp } from '../store/AppContext';

export function RestaurantMenuScreen() {
  const { colors, scale } = useApp();
  const [text, setText] = useState(
    'Chicken Shawarma\nBacon Cheeseburger\nVegetable Falafel\nWine Spritzer\nLamb Kofta\nMarshmallow Sundae',
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    items: Array<{ name: string; status: string; reason: string }>;
    summary: string;
    disclaimer: string;
  } | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      setResult(await analyzeMenu(text));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Restaurant Menu Camera" subtitle="AI highlights pork, alcohol, and questionable items.">
      <DisclaimerBanner />
      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginBottom: 10 }}>
          Take a menu photo in production OCR mode, or paste menu lines below.
        </Text>
        <Field
          value={text}
          onChangeText={setText}
          multiline
          style={{ minHeight: 160, textAlignVertical: 'top' }}
        />
        {loading ? <Loading /> : <LargeButton label="Analyze Menu" onPress={run} />}
      </Card>
      {result && (
        <Card>
          <SectionTitle>Results</SectionTitle>
          <Text style={{ color: colors.text, fontSize: scale(17), marginBottom: 12 }}>{result.summary}</Text>
          {result.items.map((item, idx) => (
            <Text
              key={idx}
              style={{
                color:
                  item.status === 'haram'
                    ? colors.haram
                    : item.status === 'doubtful'
                      ? colors.doubtful
                      : colors.halal,
                fontSize: scale(17),
                marginBottom: 10,
                lineHeight: 24,
              }}
            >
              {item.status === 'haram' ? '❌' : item.status === 'doubtful' ? '⚠️' : '✅'} {item.name}
              {'\n'}
              <Text style={{ color: colors.textSecondary }}>{item.reason}</Text>
            </Text>
          ))}
          <Text style={{ color: colors.tabInactive, fontSize: scale(14), marginTop: 8 }}>{result.disclaimer}</Text>
        </Card>
      )}
    </Screen>
  );
}
