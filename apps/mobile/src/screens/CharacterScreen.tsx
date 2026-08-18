import { color, radius, space, type as typeToken } from "@helix/design";
import { DEFAULT_ATTRIBUTE_KEYS } from "@helix/shared";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function CharacterScreen() {
  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Character">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back to today"
        style={styles.back}
      >
        <Text style={styles.backLabel}>Today</Text>
      </Pressable>
      <Text style={styles.title}>Operator</Text>
      <Text style={styles.meta}>Rank Spark · Level 1 · Title Operator</Text>
      <View style={styles.grid}>
        {DEFAULT_ATTRIBUTE_KEYS.map((key) => (
          <View key={key} style={styles.stat} accessibilityLabel={`${key} 10`}>
            <Text style={styles.statKey}>{key}</Text>
            <Text style={styles.statValue}>10</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Attribute names are catalog entries. New stats can be added without rewriting the app.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
  },
  back: {
    marginTop: space[4],
    minHeight: 44,
    justifyContent: "center",
  },
  backLabel: {
    ...typeToken.body,
    color: color.accent,
  },
  title: {
    ...typeToken.display,
    color: color.text,
    marginTop: space[3],
  },
  meta: {
    ...typeToken.body,
    color: color.textMuted,
    marginTop: space[2],
  },
  grid: {
    marginTop: space[6],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[3],
  },
  stat: {
    width: "47%",
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    padding: space[4],
    minHeight: 88,
  },
  statKey: {
    ...typeToken.label,
    color: color.textMuted,
  },
  statValue: {
    ...typeToken.numeral,
    color: color.text,
    marginTop: space[2],
  },
  note: {
    ...typeToken.body,
    color: color.textFaint,
    marginTop: space[5],
  },
});
