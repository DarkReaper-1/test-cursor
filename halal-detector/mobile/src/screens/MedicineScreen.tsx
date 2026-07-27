import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import { Card, DisclaimerBanner, LargeButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useApp } from '../store/AppContext';

export function MedicineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, scale } = useApp();
  return (
    <Screen title="Medicine Checker" subtitle="Alcohol, gelatin capsules, and animal-derived inactive ingredients.">
      <DisclaimerBanner text="Not medical advice. Emergency necessity considerations should be discussed with a doctor and scholar." />
      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: scale(17), lineHeight: 26 }}>
          Scan a medicine barcode or inactive-ingredient list. The app explains alcohol content, gelatin capsules,
          animal-derived ingredients, possible alternatives, and when necessity (darura) may apply.
        </Text>
      </Card>
      <LargeButton
        label="Scan Medicine Barcode"
        onPress={() => navigation.navigate('BarcodeScan', { productType: 'medicine' })}
      />
      <LargeButton
        label="Paste Inactive Ingredients"
        variant="secondary"
        onPress={() =>
          navigation.navigate('IngredientAnalyze', {
            productType: 'medicine',
            initialText: 'Ibuprofen, gelatin, glycerin, sorbitol, purified water',
          })
        }
      />
      <LargeButton
        label="Try Demo Softgels (0000000000003)"
        variant="secondary"
        onPress={() => navigation.navigate('BarcodeScan', { productType: 'medicine' })}
      />
    </Screen>
  );
}
