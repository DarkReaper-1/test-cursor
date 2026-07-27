import db from '../data/ingredients.json';
import type { AnalysisResult, HalalStatus, IngredientHit, ScholarSchool } from '../types/halal';

type DbIngredient = (typeof db.ingredients)[number];

const STATUS_RANK: Record<HalalStatus, number> = { halal: 0, doubtful: 1, haram: 2 };
const STATUS_LABEL: Record<HalalStatus, string> = {
  halal: '✅ HALAL',
  doubtful: '⚠️ DOUBTFUL',
  haram: '❌ HARAM',
};
const HIGHLIGHT: Record<HalalStatus, string> = {
  halal: 'green',
  doubtful: 'amber',
  haram: 'red',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLookup(): Map<string, DbIngredient> {
  const map = new Map<string, DbIngredient>();
  for (const item of db.ingredients) {
    const keys = [item.name, item.id, item.e_number || '', ...(item.aliases || [])];
    for (const key of keys) {
      const n = normalize(key);
      if (n) map.set(n, item);
    }
  }
  return map;
}

const LOOKUP = buildLookup();

export function findIngredient(query: string): DbIngredient | null {
  const norm = normalize(query);
  if (!norm) return null;
  if (LOOKUP.has(norm)) return LOOKUP.get(norm)!;
  const candidates: Array<[number, DbIngredient]> = [];
  for (const [key, item] of LOOKUP.entries()) {
    if (key.length < 4) continue;
    if (key === norm) return item;
    if (key.length >= 5 && norm.includes(key)) candidates.push([key.length, item]);
    else if (norm.length >= 6 && key.includes(norm)) candidates.push([norm.length, item]);
  }
  candidates.sort((a, b) => b[0] - a[0]);
  return candidates[0]?.[1] ?? null;
}

export function searchIngredientsOffline(query: string, limit = 25): DbIngredient[] {
  const norm = normalize(query);
  if (!norm) return db.ingredients.slice(0, limit);
  const scored: Array<[number, DbIngredient]> = [];
  const seen = new Set<string>();
  for (const item of db.ingredients) {
    if (seen.has(item.id)) continue;
    const blob = normalize(
      [item.name, item.id, item.e_number || '', ...(item.aliases || []), item.definition].join(' '),
    );
    let score = 0;
    if (norm === normalize(item.name) || norm === normalize(item.e_number || '')) score = 100;
    else if (blob.includes(norm)) score = blob.startsWith(norm) ? 80 : 60;
    else continue;
    seen.add(item.id);
    scored.push([score, item]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, limit).map((x) => x[1]);
}

function applySchoolStatus(item: DbIngredient, school: ScholarSchool): HalalStatus {
  const base = item.default_status as HalalStatus;
  if (school === 'custom_strictest' && item.differs_by_school) {
    if (['shellac', 'wine_vinegar', 'lanolin', 'natural_flavors', 'e471', 'gelatin', 'e441'].includes(item.id)) {
      return 'haram';
    }
  }
  return base;
}

export function toHit(item: DbIngredient, school: ScholarSchool): IngredientHit {
  const status = applySchoolStatus(item, school);
  const reason =
    (item.reason_templates as Record<string, string>)[status] || item.definition;
  const notes = item.scholarly_notes as Record<string, string>;
  return {
    id: item.id,
    name: item.name,
    status,
    explanation: reason,
    e_number: item.e_number,
    aliases: item.aliases || [],
    found_in: item.found_in || [],
    scientific: item.scientific,
    scholarly_notes: notes[school] || notes.general_sunni,
    differs_by_school: !!item.differs_by_school,
    school_summaries: notes,
    sources: ['Offline ingredient database'],
    highlight: HIGHLIGHT[status],
    definition: item.definition,
  };
}

function extractTokens(text: string): string[] {
  const cleaned = text.replace(/\n/g, ',').replace(/;/g, ',').replace(/\([^)]*\)/g, ' ');
  const parts = cleaned
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const tokens: string[] = [];
  for (const part of parts) {
    tokens.push(part);
    const eMatch = part.match(/\be\s?-?\s?(\d{3,4}[a-z]?)\b/gi) || [];
    for (const m of eMatch) tokens.push(m.replace(/\s+/g, '').toUpperCase());
    for (const word of part.split(/[/\s]+/)) {
      if (word.length >= 4) tokens.push(word);
    }
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const n = normalize(t);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(t);
    }
  }
  return out;
}

export function analyzeTextOffline(
  text: string,
  school: ScholarSchool = 'general_sunni',
  productType = 'food',
): AnalysisResult {
  const tokens = extractTokens(text);
  const hits: IngredientHit[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const item = findIngredient(token);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    hits.push(toHit(item, school));
  }
  const lower = text.toLowerCase();
  for (const item of db.ingredients) {
    if (seen.has(item.id)) continue;
    const names = [item.name, ...(item.aliases || []), item.e_number || ''];
    if (names.some((n) => n && n.length >= 4 && lower.includes(n.toLowerCase()))) {
      seen.add(item.id);
      hits.push(toHit(item, school));
    }
  }

  const disclaimer =
    'This is informational guidance, not a religious ruling. When origin is unknown, status is Doubtful. Verify uncertain cases with manufacturers or trusted local scholars.';

  if (!hits.length) {
    return {
      status: 'doubtful',
      status_label: STATUS_LABEL.doubtful,
      confidence: 45,
      confidence_reason: 'No known sensitive ingredients matched. Complex additives could not be verified.',
      reason: 'Ingredients could not be fully verified from available data.',
      ingredients: [],
      school,
      disclaimer,
      facts: ['Offline analysis — no known high-risk matches.'],
      interpretations: ['Unknown additives should be verified.'],
      sources: ['Offline ingredient database'],
    };
  }

  let worst: HalalStatus = 'halal';
  for (const h of hits) {
    if (STATUS_RANK[h.status] > STATUS_RANK[worst]) worst = h.status;
  }
  const haram = hits.filter((h) => h.status === 'haram');
  const doubtful = hits.filter((h) => h.status === 'doubtful');
  const differs = hits.filter((h) => h.differs_by_school);

  let reason: string;
  let confidence: number;
  let confidence_reason: string;
  if (haram.length) {
    reason = haram[0].explanation;
    confidence = 92;
    confidence_reason = 'A clearly impermissible ingredient was identified.';
  } else if (doubtful.length) {
    reason = doubtful[0].explanation;
    confidence = 61;
    confidence_reason = 'One or more ingredients need source verification.';
  } else {
    reason = 'No known haram or doubtful ingredients were detected.';
    confidence = 88;
    confidence_reason = 'Matched ingredients are generally accepted as halal.';
  }

  const interpretations: string[] = [];
  let scholarly_banner: string | undefined;
  if (differs.length) {
    scholarly_banner =
      differs.length === 1
        ? 'Scholarly opinions differ on this ingredient.'
        : 'Scholarly opinions differ on some ingredients.';
    interpretations.push(scholarly_banner);
  }
  if (productType === 'medicine') {
    interpretations.push(
      'For medicines, necessity may allow restricted inactive ingredients when no alternative exists. Ask a doctor and scholar.',
    );
  }

  return {
    status: worst,
    status_label: STATUS_LABEL[worst],
    confidence,
    confidence_reason,
    reason,
    ingredients: hits.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.name.localeCompare(b.name)),
    scholarly_banner,
    school,
    disclaimer,
    facts: [`Matched ${hits.length} known ingredient(s) offline.`],
    interpretations,
    sources: ['Offline ingredient database'],
  };
}

export function getDailyTip(): string {
  const tips = db.daily_tips || [];
  if (!tips.length) return 'Scan labels carefully and verify uncertain ingredients.';
  const day = new Date().getDate();
  return tips[day % tips.length];
}

export function getCertifications() {
  return db.certifications;
}
