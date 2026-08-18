import { color, radius, space, type as typeToken } from "@helix/design";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type CharacterSnapshot } from "../lib/api";

export function CharacterScreen() {
  const [character, setCharacter] = useState<CharacterSnapshot | null>(null);

  useEffect(() => {
    void api.me().then((payload) => setCharacter(payload.character));
  }, []);

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Character" testID="character-screen">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to today"
        style={styles.back}
        testID="back-today"
      >
        <Text style={styles.backLabel}>Today</Text>
      </Pressable>
      <Text style={styles.title}>{character?.title ?? "Operator"}</Text>
      <Text style={styles.meta}>
        Rank {character?.rankKey ?? "spark"} · Level {character?.level ?? 1} · Momentum {character?.momentum ?? 50}
      </Text>
      <View style={styles.grid}>
        {Object.entries(character?.scores ?? {}).map(([key, value]) => (
          <View key={key} style={styles.stat} accessibilityLabel={`${key} ${value}`}>
            <Text style={styles.statKey}>{key}</Text>
            <Text style={styles.statValue}>{value}</Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space[5] },
  back: { marginTop: space[4], minHeight: 44, justifyContent: "center" },
  backLabel: { ...typeToken.body, color: color.accent },
  title: { ...typeToken.display, color: color.text, marginTop: space[3] },
  meta: { ...typeToken.body, color: color.textMuted, marginTop: space[2] },
  grid: { marginTop: space[6], flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  stat: {
    width: "47%",
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space[4],
    minHeight: 88,
  },
  statKey: { ...typeToken.label, color: color.textMuted },
  statValue: { ...typeToken.numeral, color: color.text, marginTop: space[2] },
});
