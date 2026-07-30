import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradientFallback } from '../components/Gradient';
import { Screen } from '../components/ui';
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
  { key: 'BarcodeScan', label: 'Scan barcode', icon: 'barcode-outline', hint: 'Food, drink, medicine' },
  { key: 'IngredientAnalyze', label: 'Read ingredients', icon: 'flask-outline', hint: 'Paste a label or photo' },
  { key: 'CameraOCR', label: 'Take a picture', icon: 'camera-outline', hint: 'Read the label automatically' },
  { key: 'Search', label: 'Search an ingredient', icon: 'search-outline', hint: 'E-numbers & additives', tab: true },
  { key: 'Restaurants', label: 'Find restaurants', icon: 'restaurant-outline', hint: 'Certified or mixed kitchens' },
  { key: 'Medicine', label: 'Check medicine', icon: 'medkit-outline', hint: 'Capsules & syrups' },
  { key: 'Cosmetics', label: 'Check cosmetics', icon: 'color-palette-outline', hint: 'Makeup & care' },
  { key: 'VoiceAssistant', label: 'Ask by voice', icon: 'mic-outline', hint: 'Speak a simple question' },
  { key: 'Chat', label: 'Ask the guide', icon: 'chatbubbles-outline', hint: 'Learn why, in plain words' },
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
        <Text style={[styles.brand, { color: '#F4FFF8', fontSize: scale(38) }]}>Halal Detector</Text>
        <Text style={[styles.headline, { color: '#E8FFF2', fontSize: scale(24) }]}>
          Know what’s in it — in one glance.
        </Text>
        <Text style={[styles.heroSub, { color: 'rgba(244,255,248,0.78)', fontSize: scale(16) }]}>
          Clear answers for food, medicine, and cosmetics.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('BarcodeScan')}
          style={({ pressed }) => [styles.heroCta, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <Text style={{ color: colors.primaryDark, fontSize: scale(17), fontWeight: '700' }}>Scan a product</Text>
        </Pressable>
      </LinearGradientFallback>

      <Text style={[styles.trust, { color: colors.tabInactive, fontSize: scale(13) }]}>
        Informational guidance · Not a religious ruling
      </Text>

      <View style={styles.list}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => {
              if (action.tab && action.key === 'Search') navigation.navigate('Search' as never);
              else navigation.navigate(action.key as never);
            }}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={action.icon} size={scale(22)} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: scale(17), fontWeight: '700' }}>{action.label}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: scale(14), marginTop: 2 }}>{action.hint}</Text>
            </View>
            <Text style={{ color: colors.tabInactive, fontSize: scale(22) }}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.divider, { borderTopColor: colors.border }]}>
        <Text style={[styles.kicker, { color: colors.primary, fontSize: scale(12) }]}>TODAY</Text>
        <Text style={{ color: colors.textSecondary, fontSize: scale(16), lineHeight: 24 }}>{tip}</Text>
      </View>

      {(localHistory.length > 0 || localFavorites.length > 0) && (
        <View style={[styles.divider, { borderTopColor: colors.border }]}>
          {localHistory.slice(0, 2).map((h) => (
            <Text key={h.id} style={{ color: colors.textSecondary, fontSize: scale(15), marginBottom: 8 }}>
              {h.status === 'halal' ? '●' : h.status === 'doubtful' ? '▲' : '■'} {h.title}
            </Text>
          ))}
          {localFavorites.slice(0, 2).map((f) => (
            <Text key={f.id} style={{ color: colors.textSecondary, fontSize: scale(15), marginBottom: 6 }}>
              ★ {f.title}
            </Text>
          ))}
          <Text style={{ color: colors.tabInactive, fontSize: scale(13), marginTop: 4 }}>
            Scholar mode: {profile.school.replace('_', ' ')}
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { fontWeight: '800', letterSpacing: -0.8 },
  headline: { marginTop: 14, fontWeight: '600', lineHeight: 32, maxWidth: 280 },
  heroSub: { marginTop: 10, lineHeight: 22, maxWidth: 280 },
  heroCta: {
    marginTop: 22,
    alignSelf: 'flex-start',
    backgroundColor: '#F4FFF8',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  trust: { fontWeight: '600', marginBottom: 8, marginTop: 4 },
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },
  kicker: {
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
});
