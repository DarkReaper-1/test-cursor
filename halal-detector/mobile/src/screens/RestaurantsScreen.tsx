import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Card, Field, LargeButton, Screen, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { searchRestaurants } from '../services/api';
import { useApp } from '../store/AppContext';
import type { Restaurant } from '../types/halal';

export function RestaurantsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, scale, toggleFavorite } = useApp();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Restaurant[]>([]);

  useEffect(() => {
    searchRestaurants(q).then(setRows);
  }, [q]);

  return (
    <Screen title="Restaurant Mode" subtitle="Find certified, mixed, or vegetarian-friendly places.">
      <Field value={q} onChangeText={setQ} placeholder="Search restaurants" />
      <LargeButton label="Scan a Menu Photo" variant="secondary" onPress={() => navigation.navigate('RestaurantMenu')} />
      {rows.map((r) => (
        <Card key={r.id}>
          <Text style={{ color: colors.text, fontSize: scale(20), fontWeight: '800' }}>{r.name}</Text>
          <Text style={{ color: colors.primary, fontSize: scale(17), marginTop: 4, fontWeight: '700' }}>
            {r.status}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 6 }}>{r.address}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 4 }}>
            ★ {r.rating.toFixed(1)}
            {typeof r.distance_km === 'number' ? ` · ${r.distance_km} km` : ''}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 8 }}>
            {[
              r.halal_certified && 'Halal Certified',
              r.serves_halal_meat && 'Serves Halal Meat',
              r.vegetarian_only && 'Vegetarian Only',
              r.mixed_kitchen && 'Mixed Kitchen',
              r.alcohol_served && 'Alcohol Served',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {!!r.notes && (
            <Text style={{ color: colors.textSecondary, fontSize: scale(15), marginTop: 8, lineHeight: 22 }}>
              {r.notes}
            </Text>
          )}
          <LargeButton
            label="Save Restaurant"
            variant="secondary"
            onPress={() =>
              toggleFavorite({
                id: r.id,
                title: r.name,
                kind: 'restaurant',
                status: r.halal_certified ? 'halal' : 'doubtful',
                payload: r as unknown as Record<string, unknown>,
              })
            }
          />
        </Card>
      ))}
      <Card>
        <SectionTitle>Legend</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: scale(16), lineHeight: 24 }}>
          Halal Certified · Serves Halal Meat · Vegetarian Only · Mixed Kitchen · Alcohol Served
        </Text>
      </Card>
    </Screen>
  );
}
