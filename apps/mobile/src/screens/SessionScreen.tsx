import { color, radius, space, type as typeToken } from "@helix/design";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Directive } from "../lib/api";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function SessionScreen() {
  const [directive, setDirective] = useState<Directive | null>(null);
  const [reps, setReps] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.today().then((payload) => {
      setDirective(payload.directive);
      const next: Record<string, string> = {};
      for (const exercise of payload.directive.payload.exercises ?? []) {
        next[exercise.key] = String(exercise.targetReps);
      }
      setReps(next);
    });
  }, []);

  const complete = async () => {
    if (!directive) return;
    setBusy(true);
    setMessage(null);
    try {
      const sets = (directive.payload.exercises ?? []).flatMap((exercise) => {
        const count = Number(reps[exercise.key] ?? exercise.targetReps);
        return Array.from({ length: exercise.targetSets }, () => ({
          exerciseKey: exercise.key,
          load: exercise.load,
          reps: Number.isFinite(count) ? count : exercise.targetReps,
        }));
      });
      const result = await api.complete({
        idempotencyKey: newId(),
        questId: directive.id,
        sets,
      });
      setMessage(
        result.leveledUp
          ? `Level up. +${result.xp} XP.`
          : `Logged. +${result.xp} XP. Momentum ${result.character.momentum}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not complete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Session">
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}>
        <Text style={styles.backLabel}>Today</Text>
      </Pressable>
      <Text style={styles.title}>{directive?.title ?? "Session"}</Text>
      <Text style={styles.body}>Log what you did. Helix will interpret, then the server awards XP.</Text>
      {(directive?.payload.exercises ?? []).map((exercise) => (
        <View key={exercise.key} style={styles.row}>
          <Text style={styles.exercise}>
            {exercise.name} · {exercise.targetSets} × {exercise.targetReps}
          </Text>
          <TextInput
            accessibilityLabel={`${exercise.name} reps`}
            keyboardType="number-pad"
            onChangeText={(value) => setReps((current) => ({ ...current, [exercise.key]: value }))}
            style={styles.input}
            value={reps[exercise.key] ?? ""}
          />
        </View>
      ))}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy || directive?.status === "completed"}
        onPress={() => void complete()}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>{busy ? "Saving…" : "Confirm completion"}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[5] },
  back: { marginTop: space[4], minHeight: 44, justifyContent: "center" },
  backLabel: { ...typeToken.body, color: color.accent },
  title: { ...typeToken.display, color: color.text, marginTop: space[2] },
  body: { ...typeToken.body, color: color.textMuted, marginTop: space[2], marginBottom: space[4] },
  row: { marginBottom: space[4] },
  exercise: { ...typeToken.body, color: color.text },
  input: {
    marginTop: space[2],
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    color: color.text,
    backgroundColor: color.surface,
  },
  message: { ...typeToken.body, color: color.success, marginBottom: space[3] },
  cta: {
    backgroundColor: color.text,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  ctaLabel: { ...typeToken.body, fontWeight: "600", color: color.void },
});
