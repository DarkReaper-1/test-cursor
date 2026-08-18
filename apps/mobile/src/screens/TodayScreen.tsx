import { color, radius, space, type as typeToken } from "@helix/design";
import { levelFromTotalXp, rankFromLevel } from "@helix/rpg";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

const SAMPLE_XP = 0;

export function TodayScreen() {
  const progress = levelFromTotalXp(SAMPLE_XP);
  const rank = rankFromLevel(progress.level);

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Today">
      <View style={styles.header}>
        <Text style={styles.kicker}>HELIX</Text>
        <Text style={styles.greeting}>Good morning, Operator.</Text>
      </View>

      <View style={styles.identity} accessibilityRole="summary">
        <Text style={styles.identityLabel}>LEVEL {progress.level}</Text>
        <Text style={styles.identityMeta}>
          {rank.toUpperCase()} · {progress.xpIntoLevel} / {progress.xpToNext} XP · MOMENTUM 50
        </Text>
        <View
          style={styles.xpTrack}
          accessibilityLabel={`Experience ${progress.xpIntoLevel} of ${progress.xpToNext}`}
        >
          <View style={[styles.xpFill, { width: "4%" }]} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardKicker}>TODAY’S DIRECTIVE</Text>
        <Text style={styles.cardTitle}>The Quiet Foundation</Text>
        <Text style={styles.cardBody}>
          Complete a 20-minute full-body session. No equipment required. This is an estimate of
          what will move you forward—not medical advice.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Begin today’s directive"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>Begin</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push("/character")}
        accessibilityRole="link"
        accessibilityLabel="Open character"
        style={styles.link}
      >
        <Text style={styles.linkLabel}>Character</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
  },
  header: {
    marginTop: space[5],
    gap: space[2],
  },
  kicker: {
    ...typeToken.label,
    color: color.accent,
  },
  greeting: {
    ...typeToken.display,
    color: color.text,
  },
  identity: {
    marginTop: space[6],
    padding: space[4],
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    gap: space[2],
  },
  identityLabel: {
    ...typeToken.label,
    color: color.textMuted,
  },
  identityMeta: {
    ...typeToken.body,
    color: color.text,
  },
  xpTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
    marginTop: space[2],
  },
  xpFill: {
    height: 6,
    backgroundColor: color.accent,
  },
  card: {
    marginTop: space[5],
    padding: space[5],
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.lg,
    gap: space[3],
  },
  cardKicker: {
    ...typeToken.label,
    color: color.accent,
  },
  cardTitle: {
    ...typeToken.title,
    color: color.text,
  },
  cardBody: {
    ...typeToken.body,
    color: color.textMuted,
  },
  cta: {
    marginTop: space[3],
    backgroundColor: color.text,
    borderRadius: radius.md,
    paddingVertical: space[4],
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...typeToken.body,
    fontWeight: "600",
    color: color.void,
  },
  link: {
    marginTop: space[5],
    minHeight: 44,
    justifyContent: "center",
  },
  linkLabel: {
    ...typeToken.body,
    color: color.accent,
  },
});
