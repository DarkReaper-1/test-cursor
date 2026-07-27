import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import { Card, DisclaimerBanner, LargeButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../store/AppContext';

export function CosmeticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, scale } = useApp();
  return (
    <Screen title="Cosmetics Checker" subtitle="Lipstick, cream, shampoo, soap, perfume, makeup.">
      <DisclaimerBanner />
      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          Detects animal collagen, alcohol, animal glycerin, keratin, carmine, and lanolin. External-use rulings can
          differ from food rulings — the app shows origin risk clearly.
        </Text>
      </Card>
      <LargeButton
        label="Scan Cosmetic Barcode"
        onPress={() => navigation.navigate('BarcodeScan', { productType: 'cosmetic' })}
      />
      <LargeButton
        label="Paste Cosmetic Ingredients"
        variant="secondary"
        onPress={() =>
          navigation.navigate('IngredientAnalyze', {
            productType: 'cosmetic',
            initialText: 'Castor oil, beeswax, lanolin, carmine, fragrance, alcohol denat, hydrolyzed keratin',
          })
        }
      />
      <LargeButton
        label="Try Demo Lipstick (0000000000004)"
        variant="secondary"
        onPress={() => navigation.navigate('BarcodeScan', { productType: 'cosmetic' })}
      />
    </Screen>
  );
}
