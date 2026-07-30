import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { HalalStatus } from '../types/halal';
import { useApp } from '../store/AppContext';

const LABELS: Record<HalalStatus, string> = {
  halal: 'HALAL',
  doubtful: 'DOUBTFUL',
  haram: 'HARAM',
};

const PATTERN: Record<HalalStatus, string> = {
  halal: '●●●',
  doubtful: '▲▲▲',
  haram: '■■■',
};

export function StatusCard({
  status,
  reason,
  confidence,
  confidenceReason,
}: {
  status: HalalStatus;
  reason: string;
  confidence?: number;
  confidenceReason?: string;
}) {
  const { colors, scale, profile } = useApp();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }).start();
  }, [pop, status]);

  const bg =
    status === 'halal' ? colors.halalBg : status === 'doubtful' ? colors.doubtfulBg : colors.haramBg;
  const fg =
    status === 'halal' ? colors.halal : status === 'doubtful' ? colors.doubtful : colors.haram;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderColor: fg + '30',
          opacity: pop,
          transform: [
            {
              translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
            },
            {
              scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
            },
          ],
        },
      ]}
      accessibilityRole="summary"
    >
      <View style={styles.top}>
        <Text style={[styles.pattern, { color: fg, fontSize: scale(14) }]}>
          {profile.color_blind_friendly ? PATTERN[status] : ' '}
        </Text>
        <Text style={[styles.label, { color: fg, fontSize: scale(34) }]}>{LABELS[status]}</Text>
      </View>
      <Text style={[styles.reasonTitle, { color: colors.text, fontSize: scale(15) }]}>Reason</Text>
      <Text style={[styles.reason, { color: colors.textSecondary, fontSize: scale(17) }]}>{reason}</Text>
      {typeof confidence === 'number' && (
        <View style={styles.confidenceBox}>
          <View style={[styles.ring, { borderColor: fg }]}>
            <Text style={{ color: fg, fontWeight: '800', fontSize: scale(13) }}>{confidence}%</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.confidence, { color: colors.text, fontSize: scale(16) }]}>
              Confidence {confidence}%
            </Text>
            {!!confidenceReason && (
              <Text style={[styles.confReason, { color: colors.textSecondary, fontSize: scale(14) }]}>
                {confidenceReason}
              </Text>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    marginBottom: 16,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  pattern: { fontWeight: '700', letterSpacing: 3 },
  label: { fontWeight: '800', letterSpacing: -0.5 },
  reasonTitle: { fontWeight: '700', marginBottom: 4, letterSpacing: 0.4, textTransform: 'uppercase' },
  reason: { lineHeight: 26 },
  confidenceBox: { flexDirection: 'row', gap: 14, alignItems: 'center', marginTop: 16 },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  confidence: { fontWeight: '700' },
  confReason: { marginTop: 4, lineHeight: 20 },
});
