import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradientFallback } from '../components/Gradient';
import { Card, DisclaimerBanner, Screen } from '../components/ui';
import { fetchTip } from '../services/api';
import { useApp } from '../store/AppContext';
import type { RootStackParamList } from '../navigation/types';

const ACTIONS: Array<{
  key: keyof RootStackParamList | 'ScanTab';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint: string;
  tab?: boolean;
}> = [
  { key: 'BarcodeScan', label: 'Scan Barcode', icon: 'barcode-outline', hint: 'Food, drink, medicine' },
  { key: 'IngredientAnalyze', label: 'Scan Ingredients', icon: 'flask-outline', hint: 'Paste or type list' },
  { key: 'CameraOCR', label: 'Take Picture', icon: 'camera-outline', hint: 'Read the label' },
  { key: 'Search', label: 'Search Ingredient', icon: 'search-outline', hint: 'E-numbers & names', tab: true },
  { key: 'Restaurants', label: 'Restaurant Search', icon: 'restaurant-outline', hint: 'Nearby options' },
  { key: 'Medicine', label: 'Medicine', icon: 'medkit-outline', hint: 'Capsules & syrups' },
  { key: 'Cosmetics', label: 'Cosmetics', icon: 'color-palette-outline', hint: 'Makeup & care' },
  { key: 'VoiceAssistant', label: 'Voice Ask', icon: 'mic-outline', hint: 'Speak a question' },
  { key: 'Chat', label: 'AI Chat', icon: 'chatbubbles-outline', hint: 'Learn why' },
];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, scale, localHistory, localFavorites, profile } = useApp();
  const [tip, setTip] = useState('Loading tip…');

  useEffect(() => {
    fetchTip().then(setTip);
  }, []);

  return (
    <Screen>
      <LinearGradientFallback>
        <Text style={[styles.brand, { color: '#FFFFFF', fontSize: scale(34) }]}>Halal Detector</Text>
        <Text style={[styles.tagline, { color: '#E8FFF2', fontSize: scale(18) }]}>
          Scan once. Understand clearly.
        </Text>
      </LinearGradientFallback>

      <DisclaimerBanner />

      <Text style={[styles.section, { color: colors.text, fontSize: scale(22) }]}>Quick actions</Text>
      <View style={styles.grid}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => {
              if (action.tab && action.key === 'Search') {
                navigation.navigate('Search' as never);
              } else {
                navigation.navigate(action.key as never);
              }
            }}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={action.icon} size={scale(28)} color={colors.primary} />
            </View>
            <Text style={{ color: colors.text, fontSize: scale(17), fontWeight: '700' }}>{action.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: scale(14), marginTop: 4 }}>{action.hint}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <Text style={{ color: colors.text, fontSize: scale(20), fontWeight: '700' }}>Daily Halal Tip</Text>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), marginTop: 8, lineHeight: 26 }}>{tip}</Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: scale(20), fontWeight: '700' }}>Recent Scans</Text>
        {localHistory.slice(0, 3).map((h) => (
          <Text key={h.id} style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 8 }}>
            {h.status === 'halal' ? '✅' : h.status === 'doubtful' ? '⚠️' : '❌'} {h.title}
          </Text>
        ))}
        {!localHistory.length && (
          <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 8 }}>
            No scans yet. Start with Scan Barcode.
          </Text>
        )}
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontSize: scale(20), fontWeight: '700' }}>Favorites</Text>
        {localFavorites.slice(0, 3).map((f) => (
          <Text key={f.id} style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 8 }}>
            ★ {f.title}
          </Text>
        ))}
        {!localFavorites.length && (
          <Text style={{ color: colors.textSecondary, fontSize: scale(16), marginTop: 8 }}>
            Save products and ingredients you check often.
          </Text>
        )}
        <Text style={{ color: colors.tabInactive, fontSize: scale(14), marginTop: 10 }}>
          Scholar mode: {profile.school.replace('_', ' ')}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontWeight: '900', letterSpacing: 0.3 },
  tagline: { marginTop: 6, fontWeight: '500' },
  section: { fontWeight: '800', marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  action: {
    width: '47%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    minHeight: 128,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
});
