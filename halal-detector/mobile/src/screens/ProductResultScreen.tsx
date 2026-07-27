import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Speech from 'expo-speech';
import React from 'react';
import { Share, Text, View } from 'react-native';
import { StatusCard } from '../components/StatusCard';
import { Card, DisclaimerBanner, LargeButton, Screen, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../store/AppContext';
import type { AnalysisResult, ProductResult } from '../types/halal';

export function ProductResultScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, scale, profile, toggleFavorite, localFavorites } = useApp();
  const result: ProductResult = route.params.result;
  const analysis: AnalysisResult = route.params.analysisOnly || result.analysis;
  const title = route.params.title || result.product.name;
  const favId = result.product.barcode || title;
  const isFav = localFavorites.some((f) => f.id === favId);

  const speak = () => {
    if (!profile.voice_reading) return;
    Speech.speak(
      `${analysis.status_label}. Reason: ${analysis.reason}. Confidence ${analysis.confidence} percent.`,
      { rate: 0.9 },
    );
  };

  return (
    <Screen title={title} subtitle={result.product.brand || undefined}>
      <StatusCard
        status={analysis.status}
        reason={analysis.reason}
        confidence={analysis.confidence}
        confidenceReason={analysis.confidence_reason}
      />
      <DisclaimerBanner text={analysis.disclaimer} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <LargeButton label="Read Aloud" variant="secondary" onPress={speak} />
        </View>
        <View style={{ flex: 1 }}>
          <LargeButton
            label={isFav ? 'Saved' : 'Save'}
            variant="secondary"
            onPress={() =>
              toggleFavorite({
                id: favId,
                title,
                kind: result.product.product_type,
                status: analysis.status,
                payload: result as unknown as Record<string, unknown>,
              })
            }
          />
        </View>
      </View>
      <LargeButton
        label="Share Result"
        variant="secondary"
        onPress={() =>
          Share.share({
            message: `${title}: ${analysis.status_label}\nReason: ${analysis.reason}\n(Informational only — not a fatwa)`,
          })
        }
      />

      {(result.product.manufacturer || result.product.country) && (
        <Card>
          <SectionTitle>Product info</SectionTitle>
          {!!result.product.manufacturer && (
            <Text style={{ color: colors.textSecondary, fontSize: scale(17), marginBottom: 6 }}>
              Manufacturer: {result.product.manufacturer}
            </Text>
          )}
          {!!result.product.country && (
            <Text style={{ color: colors.textSecondary, fontSize: scale(17), marginBottom: 6 }}>
              Country: {result.product.country}
            </Text>
          )}
          {!!result.product.ingredients_text && (
            <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 6, lineHeight: 24 }}>
              Ingredients: {result.product.ingredients_text}
            </Text>
          )}
          {!!Object.keys(result.product.nutrition || {}).length && (
            <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 8 }}>
              Nutrition: {JSON.stringify(result.product.nutrition)}
            </Text>
          )}
        </Card>
      )}

      {result.certification?.detected && (
        <Card>
          <SectionTitle>Certified Halal</SectionTitle>
          <Text style={{ color: colors.halal, fontSize: scale(20), fontWeight: '800' }}>
            {result.certification.label}
          </Text>
          <Text style={{ color: colors.text, fontSize: scale(17), marginTop: 8 }}>
            Certified by: {result.certification.organization}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: scale(16) }}>
            {result.certification.full_name} — {result.certification.country}
          </Text>
          {!!result.certification.verification_url && (
            <Text style={{ color: colors.primary, fontSize: scale(16), marginTop: 8 }}>
              Verify: {result.certification.verification_url}
            </Text>
          )}
        </Card>
      )}

      {!!analysis.scholarly_banner && (
        <Card>
          <Text style={{ color: colors.doubtful, fontSize: scale(18), fontWeight: '700' }}>
            {analysis.scholarly_banner}
          </Text>
          {analysis.interpretations.map((line, i) => (
            <Text key={i} style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 8, lineHeight: 24 }}>
              {line}
            </Text>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle>Ingredient analysis</SectionTitle>
        {analysis.ingredients.map((ing) => (
          <View key={ing.id} style={{ marginBottom: 14 }}>
            <Text
              style={{
                color:
                  ing.status === 'haram'
                    ? colors.haram
                    : ing.status === 'doubtful'
                      ? colors.doubtful
                      : colors.halal,
                fontSize: scale(18),
                fontWeight: '700',
              }}
            >
              {ing.name} {ing.e_number ? `(${ing.e_number})` : ''} — {ing.status.toUpperCase()}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 4, lineHeight: 24 }}>
              {ing.explanation}
            </Text>
            <LargeButton
              label="More about this ingredient"
              variant="secondary"
              onPress={() => navigation.navigate('IngredientDetail', { ingredientId: ing.id, name: ing.name })}
            />
          </View>
        ))}
        {!analysis.ingredients.length && (
          <Text style={{ color: colors.textSecondary, fontSize: scale(16) }}>No matched ingredients.</Text>
        )}
      </Card>

      {!!result.medicine_notes?.length && (
        <Card>
          <SectionTitle>Medicine notes</SectionTitle>
          {result.medicine_notes.map((n, i) => (
            <Text key={i} style={{ color: colors.textSecondary, fontSize: scale(16), marginBottom: 8, lineHeight: 24 }}>
              • {n}
            </Text>
          ))}
        </Card>
      )}

      {!!result.cosmetic_notes?.length && (
        <Card>
          <SectionTitle>Cosmetics notes</SectionTitle>
          {result.cosmetic_notes.map((n, i) => (
            <Text key={i} style={{ color: colors.textSecondary, fontSize: scale(16), marginBottom: 8, lineHeight: 24 }}>
              • {n}
            </Text>
          ))}
        </Card>
      )}

      {!!result.alternatives?.length && (
        <Card>
          <SectionTitle>Smart alternatives</SectionTitle>
          {result.alternatives.map((alt, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700' }}>{alt.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 4 }}>{alt.reason}</Text>
              {!!alt.nearby_hint && (
                <Text style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 4 }}>
                  Nearby: {alt.nearby_hint}
                </Text>
              )}
              {!!alt.online_hint && (
                <Text style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 2 }}>
                  Online: {alt.online_hint}
                </Text>
              )}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
