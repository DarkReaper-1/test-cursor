import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { LargeButton, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';

export function ScanHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Screen title="Scan" subtitle="One tap. Clear answer. Large buttons for easy use.">
      <LargeButton label="Scan Barcode" onPress={() => navigation.navigate('BarcodeScan')} />
      <LargeButton
        label="Scan Ingredients (text)"
        variant="secondary"
        onPress={() => navigation.navigate('IngredientAnalyze')}
      />
      <LargeButton
        label="Take Picture of Label"
        variant="secondary"
        onPress={() => navigation.navigate('CameraOCR')}
      />
      <LargeButton
        label="Medicine Checker"
        variant="secondary"
        onPress={() => navigation.navigate('Medicine')}
      />
      <LargeButton
        label="Cosmetics Checker"
        variant="secondary"
        onPress={() => navigation.navigate('Cosmetics')}
      />
      <LargeButton
        label="Restaurant Menu Camera"
        variant="secondary"
        onPress={() => navigation.navigate('RestaurantMenu')}
      />
    </Screen>
  );
}
