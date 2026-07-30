import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext';

export function Screen({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { colors, scale } = useApp();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!!title && (
          <Text style={[styles.title, { color: colors.text, fontSize: scale(30) }]}>{title}</Text>
        )}
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scale(17) }]}>
            {subtitle}
          </Text>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LargeButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { colors, scale } = useApp();
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.haram
        : colors.surface;
  const fg = variant === 'secondary' ? colors.primary : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'secondary' ? colors.primary : bg,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg, fontSize: scale(20) }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useApp();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function Field(props: TextInputProps) {
  const { colors, scale } = useApp();
  return (
    <TextInput
      placeholderTextColor={colors.tabInactive}
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.text,
          fontSize: scale(18),
        },
        props.style,
      ]}
    />
  );
}

export function DisclaimerBanner({ text }: { text?: string }) {
  const { colors, scale } = useApp();
  return (
    <View style={[styles.disclaimer, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
      <Text style={[styles.disclaimerText, { color: colors.textSecondary, fontSize: scale(15) }]}>
        {text ||
          'Informational only — not a religious ruling. Unknown origins are marked Doubtful. Verify with manufacturers or trusted local scholars when unsure.'}
      </Text>
    </View>
  );
}

export function Loading({ label = 'Analyzing…' }: { label?: string }) {
  const { colors, scale } = useApp();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={{ color: colors.textSecondary, fontSize: scale(18), marginTop: 12 }}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors, scale } = useApp();
  return (
    <Text style={{ color: colors.text, fontSize: scale(22), fontWeight: '700', marginBottom: 10, marginTop: 8 }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { fontWeight: '800', marginBottom: 6 },
  subtitle: { lineHeight: 26, marginBottom: 18 },
  button: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
    borderWidth: 1.5,
  },
  buttonText: { fontWeight: '700', letterSpacing: -0.2 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  disclaimer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  disclaimerText: { lineHeight: 22 },
  loading: { alignItems: 'center', padding: 28 },
});
