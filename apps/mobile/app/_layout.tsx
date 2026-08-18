import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { color } from "@helix/design";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
          animation: "fade",
        }}
      />
    </SafeAreaProvider>
  );
}
