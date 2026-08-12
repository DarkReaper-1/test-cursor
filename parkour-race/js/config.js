export const TRACK_HALF = 5.5;
export const RACER_COUNT = 12;
export const BASE_SPEED = 16;
export const MAX_SPEED = 34;
export const BOOST_SPEED = 12;
export const GRAVITY = 38;
export const PLAYER_RADIUS = 0.35;
export const PLAYER_HEIGHT = 1.55;

export const SKINS = [
  { id: "blaze", name: "Blaze", color: 0xff5a18, price: 0 },
  { id: "ice", name: "Ice", color: 0x3ad4ff, price: 150 },
  { id: "volt", name: "Volt", color: 0x9dff2e, price: 200 },
  { id: "ember", name: "Ember", color: 0xff2d55, price: 250 },
  { id: "ghost", name: "Ghost", color: 0xf4f7ff, price: 300 },
  { id: "night", name: "Night", color: 0x2b3a7a, price: 350 },
  { id: "mango", name: "Mango", color: 0xffb000, price: 400 },
  { id: "orchid", name: "Orchid", color: 0xe14bff, price: 500 },
  { id: "gold", name: "Gold", color: 0xffd24a, price: 800 },
];

export const TRAILS = [
  { id: "default", name: "Classic", color: null, price: 0 },
  { id: "white", name: "Whiteout", color: 0xffffff, price: 120 },
  { id: "cyan", name: "Neon", color: 0x00fff0, price: 180 },
  { id: "gold", name: "Aureole", color: 0xffe066, price: 400 },
];

export const CITIES = [
  {
    id: "nyc",
    name: "NEW YORK",
    sky: 0x6ec6ea,
    skyDark: 0x5ab4dc,
    fog: 0x6ec6ea,
    sun: 0xfff3d0,
    silhouette: 0x4aa0c8,
    landmark: "crane",
  },
  {
    id: "paris",
    name: "PARIS",
    sky: 0x8ec8d8,
    skyDark: 0x74b4c8,
    fog: 0x8ec8d8,
    sun: 0xffe0b0,
    silhouette: 0x6aa0b0,
    landmark: "tower",
  },
  {
    id: "tokyo",
    name: "TOKYO",
    sky: 0x5b7fb8,
    skyDark: 0x486aa0,
    fog: 0x5b7fb8,
    sun: 0xffc8a0,
    silhouette: 0x3a5a88,
    landmark: "neon",
  },
  {
    id: "dubai",
    name: "DUBAI",
    sky: 0x7ad4f0,
    skyDark: 0x58c0e0,
    fog: 0x7ad4f0,
    sun: 0xfff6c8,
    silhouette: 0x3cb0d0,
    landmark: "spire",
  },
];

export const AI_NAMES = [
  "STREETCRED",
  "ROOFTOP",
  "VAULTKID",
  "FLIPZ",
  "DASH",
  "SKYLINE",
  "NITRO",
  "PARKOURPRO",
  "LEDGE",
  "SPRINT",
  "TRICKSHOT",
  "FREERUN",
  "WALLKICK",
  "BOOST",
  "GAPJUMP",
];

export const SAVE_KEY = "parkour-rush-save-v1";

export function defaultSave() {
  return {
    coins: 0,
    skin: "blaze",
    trail: "default",
    unlockedSkins: ["blaze"],
    unlockedTrails: ["default"],
    bestPlace: {},
    races: 0,
    city: "nyc",
    muted: false,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}TH`;
  switch (n % 10) {
    case 1:
      return `${n}ST`;
    case 2:
      return `${n}ND`;
    case 3:
      return `${n}RD`;
    default:
      return `${n}TH`;
  }
}

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
