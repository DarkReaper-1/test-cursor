import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useApp } from '../store/AppContext';

/** Full-bleed brand hero with soft motion. */
export function LinearGradientFallback({ children }: { children: React.ReactNode }) {
  const { colors } = useApp();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={[styles.wrap, { backgroundColor: colors.primaryDark }]}>
      <View style={styles.wash} />
      <Animated.View
        style={[
          styles.crescent,
          { transform: [{ translateY }], borderColor: 'rgba(183,228,203,0.22)' },
        ]}
      />
      <View style={[styles.blob, { backgroundColor: colors.primary }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    minHeight: 280,
    marginHorizontal: -20,
    marginTop: -8,
    marginBottom: 8,
    justifyContent: 'flex-end',
  },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(31,122,82,0.35)',
  },
  crescent: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -40,
    top: 48,
    borderRightWidth: 28,
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    left: -70,
    bottom: -90,
    opacity: 0.28,
  },
  content: { zIndex: 1 },
});
