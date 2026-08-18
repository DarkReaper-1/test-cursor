import { color, radius, space, type as typeToken } from "@helix/design";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type CharacterSnapshot, type CoachCopy, type Directive } from "../lib/api";
import { useAuth } from "../lib/AuthProvider";

export function TodayScreen() {
  const { signOut } = useAuth();
  const [character, setCharacter] = useState<CharacterSnapshot | null>(null);
  const [directive, setDirective] = useState<Directive | null>(null);
  const [coach, setCoach] = useState<CoachCopy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .today()
      .then((payload) => {
        setCharacter(payload.character);
        setDirective(payload.directive);
        setCoach(payload.coach);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load today."));
  }, []);

  const fill = character ? Math.max(4, Math.round((character.xpIntoLevel / character.xpToNext) * 100)) : 4;

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Today">
      <View style={styles.header}>
        <Text style={styles.kicker}>HELIX</Text>
        <Text style={styles.greeting}>What should you do now?</Text>
      </View>
      {character ? (
        <View style={styles.identity} accessibilityRole="summary">
          <Text style={styles.identityLabel}>LEVEL {character.level}</Text>
          <Text style={styles.identityMeta}>
            {character.rankKey.toUpperCase()} · {character.xpIntoLevel} / {character.xpToNext} XP · MOMENTUM{" "}
            {character.momentum}
          </Text>
          <View
            style={styles.xpTrack}
            accessibilityLabel={`Experience ${character.xpIntoLevel} of ${character.xpToNext}`}
          >
            <View style={[styles.xpFill, { width: `${fill}%` }]} />
          </View>
        </View>
      ) : null}
      {directive ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>
            {directive.category === "recovery" ? "RECOVERY DIRECTIVE" : "TODAY’S DIRECTIVE"}
          </Text>
          <Text style={styles.cardTitle}>{directive.title}</Text>
          <Text style={styles.cardBody}>{directive.body}</Text>
          {coach ? <Text style={styles.cardBody}>{coach.why}</Text> : null}
          {directive.status === "completed" ? (
            <Text style={styles.done}>Complete. Return tomorrow.</Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Begin today’s directive"
              onPress={() => router.push("/session")}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaLabel}>Begin</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Text style={styles.cardBody}>{error ?? "Loading today’s directive…"}</Text>
      )}
      <Pressable onPress={() => router.push("/character")} accessibilityRole="link" style={styles.link}>
        <Text style={styles.linkLabel}>Character</Text>
      </Pressable>
      <Pressable onPress={() => void signOut()} accessibilityRole="button" style={styles.link}>
        <Text style={styles.linkLabel}>Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[5] },
  header: { marginTop: space[5], gap: space[2] },
  kicker: { ...typeToken.label, color: color.accent },
  greeting: { ...typeToken.display, color: color.text },
  identity: {
    marginTop: space[6],
    padding: space[4],
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    gap: space[2],
  },
  identityLabel: { ...typeToken.label, color: color.textMuted },
  identityMeta: { ...typeToken.body, color: color.text },
  xpTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden",
    marginTop: space[2],
  },
  xpFill: { height: 6, backgroundColor: color.accent },
  card: {
    marginTop: space[5],
    padding: space[5],
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.lg,
    gap: space[3],
  },
  cardKicker: { ...typeToken.label, color: color.accent },
  cardTitle: { ...typeToken.title, color: color.text },
  cardBody: { ...typeToken.body, color: color.textMuted, marginTop: space[4] },
  done: { ...typeToken.body, color: color.success },
  cta: {
    marginTop: space[3],
    backgroundColor: color.text,
    borderRadius: radius.md,
    paddingVertical: space[4],
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: { ...typeToken.body, fontWeight: "600", color: color.void },
  link: { marginTop: space[4], minHeight: 44, justifyContent: "center" },
  linkLabel: { ...typeToken.body, color: color.accent },
});
