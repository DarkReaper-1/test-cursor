import type { AnalysisResult, ProductResult } from '../types/halal';

export type RootStackParamList = {
  MainTabs: undefined;
  BarcodeScan: { productType?: string } | undefined;
  IngredientAnalyze: { productType?: string; initialText?: string } | undefined;
  CameraOCR: { productType?: string } | undefined;
  ProductResult: { result: ProductResult; analysisOnly?: AnalysisResult; title?: string };
  IngredientDetail: { ingredientId: string; name?: string };
  Restaurants: undefined;
  RestaurantMenu: undefined;
  Medicine: undefined;
  Cosmetics: undefined;
  VoiceAssistant: undefined;
  Chat: undefined;
  Favorites: undefined;
  Search: undefined;
};

export type TabParamList = {
  Home: undefined;
  Scan: undefined;
  Search: undefined;
  History: undefined;
  Profile: undefined;
};
