import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useApp } from '../store/AppContext';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanHubScreen } from '../screens/ScanHubScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BarcodeScanScreen } from '../screens/BarcodeScanScreen';
import { IngredientAnalyzeScreen } from '../screens/IngredientAnalyzeScreen';
import { CameraOCRScreen } from '../screens/CameraOCRScreen';
import { ProductResultScreen } from '../screens/ProductResultScreen';
import { IngredientDetailScreen } from '../screens/IngredientDetailScreen';
import { RestaurantsScreen } from '../screens/RestaurantsScreen';
import { RestaurantMenuScreen } from '../screens/RestaurantMenuScreen';
import { MedicineScreen } from '../screens/MedicineScreen';
import { CosmeticsScreen } from '../screens/CosmeticsScreen';
import { VoiceAssistantScreen } from '../screens/VoiceAssistantScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const { colors, scale } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: scale(12), fontWeight: '700' },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home',
            Scan: 'scan',
            Search: 'search',
            History: 'time',
            Profile: 'person',
          };
          return <Ionicons name={map[route.name]} size={size + 4} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanHubScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors, profile } = useApp();
  const theme = {
    ...(profile.dark_mode ? DarkTheme : DefaultTheme),
    colors: {
      ...(profile.dark_mode ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', fontSize: 20 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} options={{ title: 'Scan Barcode' }} />
        <Stack.Screen name="IngredientAnalyze" component={IngredientAnalyzeScreen} options={{ title: 'Ingredients' }} />
        <Stack.Screen name="CameraOCR" component={CameraOCRScreen} options={{ title: 'Label Camera' }} />
        <Stack.Screen name="ProductResult" component={ProductResultScreen} options={{ title: 'Result' }} />
        <Stack.Screen name="IngredientDetail" component={IngredientDetailScreen} options={{ title: 'Ingredient' }} />
        <Stack.Screen name="Restaurants" component={RestaurantsScreen} options={{ title: 'Restaurants' }} />
        <Stack.Screen name="RestaurantMenu" component={RestaurantMenuScreen} options={{ title: 'Menu Scan' }} />
        <Stack.Screen name="Medicine" component={MedicineScreen} options={{ title: 'Medicine' }} />
        <Stack.Screen name="Cosmetics" component={CosmeticsScreen} options={{ title: 'Cosmetics' }} />
        <Stack.Screen name="VoiceAssistant" component={VoiceAssistantScreen} options={{ title: 'Voice' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Chat' }} />
        <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Search' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
