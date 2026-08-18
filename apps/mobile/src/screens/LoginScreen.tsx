import { color, radius, space, type as typeToken } from "@helix/design";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/AuthProvider";
import { ApiError } from "../lib/api";

export function LoginScreen({ mode }: { mode: "login" | "register" }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password, mode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel={mode === "register" ? "Create operator" : "Sign in"}>
      <Text style={styles.kicker}>HELIX</Text>
      <Text style={styles.title}>{mode === "register" ? "Create your Operator" : "Return to the System"}</Text>
      <Text style={styles.body}>Email and password. Apple and Google land in a later phase.</Text>
      <Text nativeID="email-label" style={styles.label}>
        EMAIL
      </Text>
      <TextInput
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        style={styles.input}
        value={email}
      />
      <Text style={styles.label}>PASSWORD</Text>
      <TextInput
        accessibilityLabel="Password"
        autoComplete="password"
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaLabel}>{busy ? "Working…" : mode === "register" ? "Create operator" : "Sign in"}</Text>
      </Pressable>
      <View style={{ height: space[4] }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[5] },
  kicker: { ...typeToken.label, color: color.accent, marginTop: space[6] },
  title: { ...typeToken.display, color: color.text, marginTop: space[2] },
  body: { ...typeToken.body, color: color.textMuted, marginTop: space[3], marginBottom: space[5] },
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
