import Constants from 'expo-constants';
import type {
  AnalysisResult,
  FavoriteItem,
  HistoryItem,
  IngredientHit,
  ProductResult,
  Restaurant,
  ScholarSchool,
  UserProfile,
} from '../types/halal';
import { analyzeTextOffline, searchIngredientsOffline, toHit } from './offlineAnalyzer';

const DEFAULT_HOST =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

export function getApiBase(): string {
  return `${DEFAULT_HOST.replace(/\/$/, '')}/api/v1`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function analyzeText(
  text: string,
  school: ScholarSchool,
  productType = 'food',
  productName?: string,
): Promise<{ id?: string; analysis: AnalysisResult }> {
  try {
    return await request('/analyze/text', {
      method: 'POST',
      body: JSON.stringify({
        text,
        school,
        product_type: productType,
        product_name: productName,
      }),
    });
  } catch {
    return { analysis: analyzeTextOffline(text, school, productType) };
  }
}

export async function analyzeBarcode(
  barcode: string,
  school: ScholarSchool,
  productType = 'food',
): Promise<{ id?: string; result: ProductResult }> {
  try {
    return await request('/analyze/barcode', {
      method: 'POST',
      body: JSON.stringify({ barcode, school, product_type: productType }),
    });
  } catch {
    // Offline fallback: unknown barcode with empty ingredients → doubtful
    const analysis = analyzeTextOffline('', school, productType);
    analysis.reason = 'Offline mode: barcode lookup unavailable. Enter ingredients manually.';
    analysis.confidence = 20;
    analysis.confidence_reason = 'No network connection for product database.';
    return {
      result: {
        product: {
          barcode,
          name: `Product ${barcode}`,
          categories: [],
          nutrition: {},
          product_type: productType,
          ingredients_text: '',
        },
        analysis,
        certification: { detected: false },
        alternatives: [],
        medicine_notes: productType === 'medicine' ? ['Check gelatin and alcohol in inactive ingredients.'] : [],
        cosmetic_notes: productType === 'cosmetic' ? ['Check carmine, keratin, alcohol, glycerin, lanolin.'] : [],
      },
    };
  }
}

export async function analyzeOcr(
  text: string,
  school: ScholarSchool,
  demoKey?: string,
): Promise<{
  id?: string;
  raw_text: string;
  ingredients_text: string;
  lines: Array<{ text: string; status: string; mark: string; highlight: string; explanation?: string }>;
  analysis: AnalysisResult;
}> {
  try {
    const form = new FormData();
    form.append('school', school);
    if (demoKey) form.append('demo_key', demoKey);
    if (text) form.append('text', text);
    return await request('/analyze/ocr', { method: 'POST', body: form });
  } catch {
    const analysis = analyzeTextOffline(text, school);
    const lines = text
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((part) => {
        const hit = analysis.ingredients.find(
          (i) =>
            part.toLowerCase().includes(i.name.toLowerCase()) ||
            i.aliases.some((a) => part.toLowerCase().includes(a.toLowerCase())),
        );
        if (!hit) return { text: part, status: 'unknown', mark: '', highlight: 'none' };
        const mark = hit.status === 'haram' ? '❌' : hit.status === 'doubtful' ? '⚠️' : '✅';
        return {
          text: part,
          status: hit.status,
          mark,
          highlight: hit.highlight,
          explanation: hit.explanation,
        };
      });
    return { raw_text: text, ingredients_text: text, lines, analysis };
  }
}

export async function searchIngredients(q: string, school: ScholarSchool): Promise<IngredientHit[]> {
  try {
    const data = await request<{ results: IngredientHit[] }>(
      `/ingredients/search?q=${encodeURIComponent(q)}&school=${school}`,
    );
    return data.results;
  } catch {
    return searchIngredientsOffline(q).map((i) => toHit(i, school));
  }
}

export async function searchRestaurants(query: string): Promise<Restaurant[]> {
  try {
    const data = await request<{ results: Restaurant[] }>('/restaurants/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return data.results;
  } catch {
    return [
      {
        id: 'offline-1',
        name: 'Green Crescent Kitchen',
        address: 'Nearby (offline sample)',
        latitude: 0,
        longitude: 0,
        rating: 4.7,
        status: 'Halal Certified',
        tags: ['Halal Certified'],
        alcohol_served: false,
        halal_certified: true,
        serves_halal_meat: true,
        vegetarian_only: false,
        mixed_kitchen: false,
        notes: 'Offline sample restaurant.',
      },
    ].filter((r) => !query || r.name.toLowerCase().includes(query.toLowerCase()));
  }
}

export async function analyzeMenu(text: string) {
  try {
    const form = new FormData();
    form.append('text', text);
    return await request<{
      items: Array<{ name: string; status: string; reason: string }>;
      summary: string;
      disclaimer: string;
    }>('/restaurants/menu', { method: 'POST', body: form });
  } catch {
    return {
      items: text
        .split('\n')
        .filter(Boolean)
        .map((name) => ({
          name,
          status: /pork|bacon|wine|beer/i.test(name) ? 'haram' : 'doubtful',
          reason: /pork|bacon|wine|beer/i.test(name)
            ? 'Appears to contain pork or alcohol.'
            : 'Confirm with restaurant.',
        })),
      summary: 'Offline menu scan',
      disclaimer: 'Ask the restaurant to confirm.',
    };
  }
}

export async function chatAsk(message: string, school: ScholarSchool) {
  try {
    return await request<{ answer: string; status_hint?: string; disclaimer: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, school }),
    });
  } catch {
    const hits = searchIngredientsOffline(message, 1);
    if (hits[0]) {
      const hit = toHit(hits[0], school);
      return {
        answer: `${hit.name}: ${hit.status.toUpperCase()}. ${hit.explanation}`,
        status_hint: hit.status,
        disclaimer: 'Offline educational answer — not a fatwa.',
      };
    }
    return {
      answer: 'Offline mode: try asking about gelatin, E471, rennet, shellac, or carmine.',
      disclaimer: 'Offline educational answer — not a fatwa.',
    };
  }
}

export async function voiceAsk(transcript: string, school: ScholarSchool) {
  try {
    return await request<{ spoken_answer: string; detailed_answer: string; status_hint?: string }>(
      '/voice',
      {
        method: 'POST',
        body: JSON.stringify({ transcript, school }),
      },
    );
  } catch {
    const chat = await chatAsk(transcript, school);
    return {
      spoken_answer: chat.answer.slice(0, 280),
      detailed_answer: chat.answer,
      status_hint: chat.status_hint,
    };
  }
}

export async function fetchHistory(q = ''): Promise<HistoryItem[]> {
  try {
    return await request(`/history?q=${encodeURIComponent(q)}`);
  } catch {
    return [];
  }
}

export async function fetchFavorites(): Promise<FavoriteItem[]> {
  try {
    return await request('/favorites');
  } catch {
    return [];
  }
}

export async function saveFavorite(item: FavoriteItem): Promise<FavoriteItem> {
  try {
    return await request('/favorites', { method: 'POST', body: JSON.stringify(item) });
  } catch {
    return item;
  }
}

export async function fetchProfile(): Promise<UserProfile | null> {
  try {
    return await request('/profile');
  } catch {
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  try {
    return await request('/profile', { method: 'PUT', body: JSON.stringify(profile) });
  } catch {
    return profile;
  }
}

export async function fetchTip(): Promise<string> {
  try {
    const data = await request<{ tip: string }>('/tip');
    return data.tip;
  } catch {
    const { getDailyTip } = await import('./offlineAnalyzer');
    return getDailyTip();
  }
}
