import { color, radius, space, type as typeToken } from "@helix/design";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/AuthProvider";
import { ApiError } from "../lib/api";

const GOALS = ["strength", "consistency", "energy", "hybrid"] as const;
const GEAR = ["none", "dumbbells", "gym"] as const;
const MINUTES = [10, 20, 45] as const;

export function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("consistency");
  const [equipment, setEquipment] = useState<(typeof GEAR)[number]>("none");
  const [minutes, setMinutes] = useState<(typeof MINUTES)[number]>(20);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding({
        displayName: displayName.trim() || undefined,
        goal,
        equipment,
        minutes,
        experience: "beginner",
        constraints: "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save onboarding.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Onboarding">
      <Text style={styles.kicker}>OPERATOR SETUP</Text>
      <Text style={styles.title}>What should today make better?</Text>
      <Text style={styles.label}>NAME</Text>
      <TextInput
        accessibilityLabel="Display name"
        onChangeText={setDisplayName}
        placeholder="Optional"
        placeholderTextColor={color.textFaint}
        style={styles.input}
        value={displayName}
      />
      <Text style={styles.label}>GOAL</Text>
      <ChipRow options={GOALS} value={goal} onChange={setGoal} />
      <Text style={styles.label}>EQUIPMENT</Text>
      <ChipRow options={GEAR} value={equipment} onChange={setEquipment} />
      <Text style={styles.label}>MINUTES AVAILABLE</Text>
      <ChipRow options={MINUTES.map(String)} value={String(minutes)} onChange={(value) => setMinutes(Number(value) as 10 | 20 | 45)} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>{busy ? "Saving…" : "Activate operator"}</Text>
      </Pressable>
      <View style={{ height: space[4] }} />
    </SafeAreaView>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
          onPress={() => onChange(option)}
          style={[styles.chip, option === value && styles.chipOn]}
        >
          <Text style={[styles.chipLabel, option === value && styles.chipLabelOn]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[5] },
  kicker: { ...typeToken.label, color: color.accent, marginTop: space[6] },
  title: { ...typeToken.display, color: color.text, marginTop: space[2], marginBottom: space[4] },
  label: { ...typeToken.label, color: color.textMuted, marginTop: space[4] },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    color: color.text,
    backgroundColor: color.surface,
    marginTop: space[2],
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[2], marginTop: space[2] },
  chip: {
    minHeight: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: "center",
  },
  chipOn: { backgroundColor: color.surfaceRaised, borderColor: color.accent },
  chipLabel: { ...typeToken.body, color: color.textMuted },
  chipLabelOn: { color: color.text },
  error: { ...typeToken.body, color: color.danger, marginTop: space[3] },
  cta: {
    marginTop: space[5],
    backgroundColor: color.text,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  ctaLabel: { ...typeToken.body, fontWeight: "600", color: color.void },
});
