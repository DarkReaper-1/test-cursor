import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StatusCard } from '../components/StatusCard';
import { Card, DisclaimerBanner, LargeButton, Loading, Screen, SectionTitle } from '../components/ui';
import { searchIngredients } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';
import type { IngredientHit } from '../types/halal';

export function IngredientDetailScreen() {
  const route = useRoute<any>();
  const { colors, scale, toggleFavorite } = useApp();
  const school = useSchool();
  const [item, setItem] = useState<IngredientHit | null>(null);

  useEffect(() => {
    searchIngredients(route.params.ingredientId || route.params.name || '', school).then((rows) => {
      setItem(rows.find((r) => r.id === route.params.ingredientId) || rows[0] || null);
    });
  }, [route.params.ingredientId, school]);

  if (!item) {
    return (
      <Screen title="Ingredient">
        <Loading label="Loading ingredient…" />
      </Screen>
    );
  }

  return (
    <Screen title={item.name} subtitle={item.e_number || undefined}>
      <StatusCard status={item.status} reason={item.explanation} />
      <DisclaimerBanner />
      <LargeButton
        label="Save to Favorites"
        variant="secondary"
        onPress={() =>
          toggleFavorite({
            id: item.id,
            title: item.name,
            kind: 'ingredient',
            status: item.status,
            payload: item as unknown as Record<string, unknown>,
          })
        }
      />
      <Card>
        <SectionTitle>Definition</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          {item.definition || item.explanation}
        </Text>
      </Card>
      <Card>
        <SectionTitle>Scientific explanation</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          {item.scientific || 'N/A'}
        </Text>
      </Card>
      <Card>
        <SectionTitle>Alternative names</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          {(item.aliases || []).join(', ') || 'None listed'}
        </Text>
      </Card>
      <Card>
        <SectionTitle>Foods commonly found in</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          {(item.found_in || []).join(', ') || 'Various packaged foods'}
        </Text>
      </Card>
      <Card>
        <SectionTitle>Scholarly notes</SectionTitle>
        {item.differs_by_school && (
          <Text style={{ color: colors.doubtful, fontSize: scale(17), fontWeight: '700', marginBottom: 8 }}>
            Scholarly opinions differ on this ingredient.
          </Text>
        )}
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          {item.scholarly_notes}
        </Text>
        {Object.entries(item.school_summaries || {}).map(([k, v]) => (
          <Text key={k} style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 8, lineHeight: 22 }}>
            {k}: {v}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}
