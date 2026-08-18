import { color, space, type as typeToken } from "@helix/design";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LoginScreen } from "../src/screens/LoginScreen";
import { OnboardingScreen } from "../src/screens/OnboardingScreen";
import { TodayScreen } from "../src/screens/TodayScreen";
import { useAuth } from "../src/lib/AuthProvider";

export default function Index() {
  const { status } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("register");

  if (status === "loading") {
    return (
      <View style={styles.center} accessibilityLabel="Loading">
        <Text style={styles.muted}>Helix is calibrating…</Text>
      </View>
    );
  }
  if (status === "anon") {
    return (
      <View style={styles.auth}>
        <LoginScreen mode={mode} />
        <Pressable
          accessibilityRole="button"
          onPress={() => setMode(mode === "login" ? "register" : "login")}
          style={styles.switcher}
          testID="auth-switch"
        >
          <Text style={styles.switcherLabel}>
            {mode === "login" ? "Need an operator? Create one" : "Already activated? Sign in"}
          </Text>
        </Pressable>
      </View>
    );
  }
  if (status === "needs-onboarding") {
    return <OnboardingScreen />;
  }
  return <TodayScreen />;
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" },
  auth: { flex: 1, backgroundColor: color.bg },
  muted: { ...typeToken.body, color: color.textMuted },
  switcher: { position: "absolute", bottom: space[7], left: space[5], right: space[5], minHeight: 44 },
  switcherLabel: { ...typeToken.body, color: color.accent, textAlign: "center" },
});
