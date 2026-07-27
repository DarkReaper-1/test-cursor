import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { HalalStatus } from '../types/halal';
import { useApp } from '../store/AppContext';

const LABELS: Record<HalalStatus, string> = {
  halal: 'HALAL',
  doubtful: 'DOUBTFUL',
  haram: 'HARAM',
};

const EMOJI: Record<HalalStatus, string> = {
  halal: '✅',
  doubtful: '⚠️',
  haram: '❌',
};

// Color-blind friendly patterns via text markers, not color alone.
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
  const bg =
    status === 'halal' ? colors.halalBg : status === 'doubtful' ? colors.doubtfulBg : colors.haramBg;
  const fg =
    status === 'halal' ? colors.halal : status === 'doubtful' ? colors.doubtful : colors.haram;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: fg }]} accessibilityRole="summary">
      <Text style={[styles.pattern, { color: fg, fontSize: scale(18) }]}>
        {profile.color_blind_friendly ? PATTERN[status] : ' '}
      </Text>
      <Text style={[styles.emoji, { fontSize: scale(42) }]}>{EMOJI[status]}</Text>
      <Text style={[styles.label, { color: fg, fontSize: scale(36) }]}>{LABELS[status]}</Text>
      <Text style={[styles.reasonTitle, { color: colors.text, fontSize: scale(18) }]}>Reason</Text>
      <Text style={[styles.reason, { color: colors.textSecondary, fontSize: scale(18) }]}>{reason}</Text>
      {typeof confidence === 'number' && (
        <View style={styles.confidenceBox}>
          <Text style={[styles.confidence, { color: colors.text, fontSize: scale(20) }]}>
            Confidence {confidence}%
          </Text>
          {!!confidenceReason && (
            <Text style={[styles.confReason, { color: colors.textSecondary, fontSize: scale(16) }]}>
              {confidenceReason}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 3,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  pattern: { fontWeight: '700', letterSpacing: 4, marginBottom: 4 },
  emoji: { marginBottom: 4 },
  label: { fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  reasonTitle: { fontWeight: '700', alignSelf: 'flex-start' },
  reason: { alignSelf: 'stretch', lineHeight: 28, marginTop: 4 },
  confidenceBox: { alignSelf: 'stretch', marginTop: 16 },
  confidence: { fontWeight: '700' },
  confReason: { marginTop: 4, lineHeight: 24 },
});
