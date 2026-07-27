export type HalalStatus = 'halal' | 'doubtful' | 'haram';

export type ScholarSchool =
  | 'hanafi'
  | 'shafii'
  | 'maliki'
  | 'hanbali'
  | 'general_sunni'
  | 'custom_strictest';

export interface IngredientHit {
  id: string;
  name: string;
  status: HalalStatus;
  explanation: string;
  e_number?: string | null;
  aliases: string[];
  found_in: string[];
  scientific?: string | null;
  scholarly_notes?: string | null;
  differs_by_school: boolean;
  school_summaries: Record<string, string>;
  sources: string[];
  highlight: string;
  definition?: string;
}

export interface AnalysisResult {
  status: HalalStatus;
  status_label: string;
  confidence: number;
  confidence_reason: string;
  reason: string;
  ingredients: IngredientHit[];
  scholarly_banner?: string | null;
  school: ScholarSchool;
  disclaimer: string;
  facts: string[];
  interpretations: string[];
  sources: string[];
}

export interface ProductInfo {
  barcode?: string | null;
  name: string;
  brand?: string | null;
  manufacturer?: string | null;
  country?: string | null;
  categories: string[];
  ingredients_text?: string | null;
  nutrition: Record<string, number | string>;
  image_url?: string | null;
  quantity?: string | null;
  product_type: string;
}

export interface CertificationInfo {
  detected: boolean;
  organization?: string | null;
  full_name?: string | null;
  country?: string | null;
  verification_url?: string | null;
  label?: string | null;
}

export interface AlternativeProduct {
  name: string;
  reason: string;
  halal_certified: boolean;
  nearby_hint?: string | null;
  online_hint?: string | null;
}

export interface ProductResult {
  product: ProductInfo;
  analysis: AnalysisResult;
  certification?: CertificationInfo | null;
  alternatives: AlternativeProduct[];
  medicine_notes: string[];
  cosmetic_notes: string[];
  analyzed_at?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km?: number | null;
  rating: number;
  status: string;
  tags: string[];
  alcohol_served: boolean;
  halal_certified: boolean;
  serves_halal_meat: boolean;
  vegetarian_only: boolean;
  mixed_kitchen: boolean;
  notes?: string | null;
}

export interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string | null;
  status: HalalStatus;
  kind: string;
  created_at: string;
  payload: Record<string, unknown>;
}

export interface FavoriteItem {
  id: string;
  title: string;
  kind: string;
  status?: HalalStatus | null;
  payload: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  display_name: string;
  school: ScholarSchool;
  text_scale: number;
  dark_mode: boolean;
  color_blind_friendly: boolean;
  voice_reading: boolean;
  language: string;
}

export const SCHOOL_LABELS: Record<ScholarSchool, string> = {
  hanafi: 'Hanafi',
  shafii: "Shafi'i",
  maliki: 'Maliki',
  hanbali: 'Hanbali',
  general_sunni: 'General Sunni',
  custom_strictest: 'Custom (strictest)',
};

export const STATUS_EMOJI: Record<HalalStatus, string> = {
  halal: '✅',
  doubtful: '⚠️',
  haram: '❌',
};
