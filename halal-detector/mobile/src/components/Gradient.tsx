import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useApp } from '../store/AppContext';

/** Soft brand hero without extra gradient dependency. */
export function LinearGradientFallback({ children }: { children: React.ReactNode }) {
  const { colors } = useApp();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.primaryDark }]}>
      <View style={[styles.blob, { backgroundColor: colors.primary }]} />
      <View style={[styles.blob2, { backgroundColor: '#2FA86A' }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 24,
    minHeight: 140,
    marginBottom: 12,
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -40,
    top: -50,
    opacity: 0.35,
  },
  blob2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    left: -20,
    bottom: -40,
    opacity: 0.25,
  },
  content: { zIndex: 1 },
});
