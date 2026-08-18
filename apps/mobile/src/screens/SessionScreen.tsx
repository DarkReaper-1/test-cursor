import { DEFAULT_REST_MS, formatRest, remainingMs } from "@helix/fitness";
import { color, radius, space, type as typeToken } from "@helix/design";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

type SetDraft = { load: string; reps: string };

export function SessionScreen() {
  const [directive, setDirective] = useState<Directive | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setNow(Date.now());
      }
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    void api.today().then((payload) => {
      setDirective(payload.directive);
      const next: Record<string, SetDraft[]> = {};
      for (const exercise of payload.directive.payload.exercises ?? []) {
        next[exercise.key] = Array.from({ length: exercise.targetSets }, () => ({
          load: String(exercise.load),
          reps: String(exercise.targetReps),
        }));
      }
      setDrafts(next);
    });
  }, []);

  const restMs = remainingMs(restEndsAt, now);
  const restLabel = restMs > 0 ? formatRest(restMs) : null;
  const restSeconds = directive?.payload.restSeconds ?? DEFAULT_REST_MS / 1000;

  const startRest = () => {
    setRestEndsAt(Date.now() + restSeconds * 1000);
  };

  const updateSet = (key: string, index: number, patch: Partial<SetDraft>) => {
    setDrafts((current) => {
      const rows = current[key] ?? [];
      return {
        ...current,
        [key]: rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
      };
    });
  };

  const complete = async () => {
    if (!directive) return;
    setBusy(true);
    setMessage(null);
    try {
      const sets = (directive.payload.exercises ?? []).flatMap((exercise) =>
        (drafts[exercise.key] ?? []).map((row) => ({
          exerciseKey: exercise.key,
          load: Number(row.load) || 0,
          reps: Number(row.reps) || 0,
        })),
      );
      const result = await api.complete({
        idempotencyKey: newId(),
        questId: directive.id,
        sets,
      });
      setRestEndsAt(null);
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

  const exercises = useMemo(() => directive?.payload.exercises ?? [], [directive]);

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Session">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}>
          <Text style={styles.backLabel}>Today</Text>
        </Pressable>
        <Text style={styles.title}>{directive?.title ?? "Session"}</Text>
        <Text style={styles.body}>
          Log each set. Rest uses the clock, so it still works if Helix leaves the foreground.
        </Text>
        {restLabel ? (
          <View style={styles.rest} accessibilityLiveRegion="polite" accessibilityLabel={`Rest ${restLabel}`}>
            <Text style={styles.restLabel}>REST {restLabel}</Text>
          </View>
        ) : null}
        {exercises.map((exercise) => (
          <View key={exercise.key} style={styles.block}>
            <Text style={styles.exercise}>
              {exercise.name} · target {exercise.targetSets} × {exercise.targetReps}
              {exercise.load ? ` @ ${exercise.load}` : ""}
            </Text>
            {(drafts[exercise.key] ?? []).map((row, index) => (
              <View key={`${exercise.key}-${index}`} style={styles.setRow}>
                <Text style={styles.setIndex}>SET {index + 1}</Text>
                <TextInput
                  accessibilityLabel={`${exercise.name} set ${index + 1} load`}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateSet(exercise.key, index, { load: value })}
                  style={styles.input}
                  value={row.load}
                />
                <TextInput
                  accessibilityLabel={`${exercise.name} set ${index + 1} reps`}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateSet(exercise.key, index, { reps: value })}
                  style={styles.input}
                  value={row.reps}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${exercise.name} set ${index + 1} and start rest`}
                  onPress={startRest}
                  style={styles.mini}
                >
                  <Text style={styles.miniLabel}>Log</Text>
                </Pressable>
              </View>
            ))}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingHorizontal: space[5], paddingBottom: space[8] },
  back: { marginTop: space[4], minHeight: 44, justifyContent: "center" },
  backLabel: { ...typeToken.body, color: color.accent },
  title: { ...typeToken.display, color: color.text, marginTop: space[2] },
  body: { ...typeToken.body, color: color.textMuted, marginTop: space[2], marginBottom: space[4] },
  rest: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    padding: space[4],
    marginBottom: space[4],
    borderWidth: 1,
    borderColor: color.accent,
  },
  restLabel: { ...typeToken.title, color: color.accent },
  block: { marginBottom: space[5] },
  exercise: { ...typeToken.body, color: color.text, marginBottom: space[3] },
  setRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginBottom: space[2] },
  setIndex: { ...typeToken.label, color: color.textMuted, width: 52 },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    color: color.text,
    backgroundColor: color.surface,
  },
  mini: {
    minHeight: 48,
    minWidth: 52,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  miniLabel: { ...typeToken.body, color: color.accent },
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
