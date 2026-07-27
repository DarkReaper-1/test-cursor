import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, DisclaimerBanner, Field, LargeButton, Loading, Screen } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { analyzeBarcode } from '../services/api';
import { useApp, useSchool } from '../store/AppContext';

export function BarcodeScanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const productType = route.params?.productType || 'food';
  const { colors, scale, addLocalHistory } = useApp();
  const school = useSchool();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('0000000000001');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState('');

  const run = async (barcode: string) => {
    if (!barcode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { result, id } = await analyzeBarcode(barcode.trim(), school, productType);
      addLocalHistory({
        id: id || `${Date.now()}`,
        title: result.product.name,
        subtitle: result.analysis.reason,
        status: result.analysis.status,
        kind: 'barcode',
        created_at: new Date().toISOString(),
        payload: result as unknown as Record<string, unknown>,
      });
      navigation.replace('ProductResult', { result });
    } catch (e: any) {
      setError(e?.message || 'Could not analyze barcode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Barcode Scanner" subtitle="Point at the barcode, or type the numbers.">
      <DisclaimerBanner />
      {!permission?.granted ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: scale(18), marginBottom: 12 }}>
            Camera permission is needed to scan barcodes.
          </Text>
          <LargeButton label="Allow Camera" onPress={requestPermission} />
        </Card>
      ) : (
        <View style={[styles.cameraWrap, { borderColor: colors.border }]}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={
              scanned || loading
                ? undefined
                : ({ data }) => {
                    setScanned(true);
                    run(data);
                  }
            }
          />
          <Text style={[styles.hint, { color: '#fff', fontSize: scale(16) }]}>Align barcode inside the frame</Text>
        </View>
      )}

      <Card>
        <Text style={{ color: colors.text, fontSize: scale(18), fontWeight: '700', marginBottom: 8 }}>
          Or enter barcode
        </Text>
        <Field value={manual} onChangeText={setManual} keyboardType="number-pad" placeholder="Barcode numbers" />
        <Text style={{ color: colors.textSecondary, fontSize: scale(14), marginBottom: 8 }}>
          Try demo: 0000000000001 (gummies), 0000000000003 (medicine), 0000000000004 (lipstick)
        </Text>
        {loading ? <Loading /> : <LargeButton label="Analyze Product" onPress={() => run(manual)} />}
        {scanned && !loading && (
          <LargeButton label="Scan Again" variant="secondary" onPress={() => setScanned(false)} />
        )}
        {!!error && <Text style={{ color: colors.haram, fontSize: scale(16), marginTop: 8 }}>{error}</Text>}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 16,
  },
  camera: { flex: 1 },
  hint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});
