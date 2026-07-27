import React from 'react';
import { Text } from 'react-native';
import { Card, LargeButton, Screen } from '../components/ui';
import { useApp } from '../store/AppContext';

export function FavoritesScreen() {
  const { colors, scale, localFavorites, toggleFavorite } = useApp();
  return (
    <Screen title="Favorites" subtitle="Products, restaurants, ingredients, medicines, cosmetics.">
      {localFavorites.map((f) => (
        <Card key={f.id}>
          <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700' }}>★ {f.title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 4 }}>
            {f.kind}
            {f.status ? ` · ${f.status}` : ''}
          </Text>
          <LargeButton label="Remove" variant="secondary" onPress={() => toggleFavorite(f)} />
        </Card>
      ))}
      {!localFavorites.length && (
        <Card>
          <Text style={{ color: colors.textSecondary, fontSize: scale(17) }}>No favorites yet.</Text>
        </Card>
      )}
    </Screen>
  );
}
