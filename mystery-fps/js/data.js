export const BRIEF = [
  "Lord Reginald Ashworth was found dead in his library at 21:15. Cause: aconitine poisoning.",
  "The storm sealed Blackwood Manor. Hostiles are inside — private security gone rogue, or something worse.",
  "Recover evidence with E. Review the case with Tab. Accuse when you have five exhibits.",
  "Suspects: Elena Voss (heiress), Marcus Ashworth (son), Dr. Whitmore (physician), Thomas Graves (butler).",
];

export const SOLUTION = "elena";

export const CLUES = {
  body: {
    id: "body", title: "Ashworth's Body", category: "critical",
    text: "No trauma. Blue lips. Classic aconitine. The brandy beside him is clean — the poison came earlier, at dinner.",
    room: "library", implicates: ["elena", "whitmore"],
  },
  letter: {
    id: "letter", title: "Torn Threat Letter", category: "red-herring",
    text: "Fragments: '...amend the will by week's end...' Handwriting mimics Whitmore's, but the paper is decades old. A plant.",
    room: "library", implicates: ["whitmore"],
  },
  will: {
    id: "will", title: "Revised Will", category: "critical",
    text: "Three days old. Entire estate to Elena Voss. Marcus, Victoria, and Thomas cut out. Motive for everyone — including her.",
    room: "study", implicates: ["elena", "marcus", "thomas"],
  },
  safe: {
    id: "safe", title: "Unsigned Reversal", category: "critical",
    text: "Safe cracked tonight. Inside: an unsigned draft restoring the old heirs. Someone killed him before he could sign.",
    room: "study", implicates: ["elena"],
  },
  extract: {
    id: "extract", title: "Monkshood Extract", category: "critical",
    text: "Medical jar nearly empty. Seal broken tonight. Only Whitmore and kitchen staff knew the shelf — and Elena visited last month.",
    room: "kitchen", implicates: ["elena", "whitmore"],
  },
  ledger: {
    id: "ledger", title: "Kitchen Log", category: "critical",
    text: "7:15 PM — Elena Voss entered the kitchen for 'dietary restrictions.' Soup served 7:30. Ashworth collapsed 8:45.",
    room: "kitchen", implicates: ["elena"],
  },
  prints: {
    id: "prints", title: "Muddy Heels", category: "critical",
    text: "Size-six heels from garden gate to kitchen door. Match Elena's dinner shoes. She claimed she never left the ballroom.",
    room: "garden", implicates: ["elena"],
  },
  champagne: {
    id: "champagne", title: "Untouched Flute", category: "critical",
    text: "Elena's champagne still full on the sill. Victoria saw her slip out at 7:10. Her alibi collapses.",
    room: "ballroom", implicates: ["elena"],
  },
};

export const SUSPECTS = {
  elena: {
    id: "elena", name: "Elena Voss", role: "Heiress",
    bio: "Recently acknowledged daughter. Named sole heir three days ago. Nervous at dinner — left the ballroom before soup.",
  },
  marcus: {
    id: "marcus", name: "Marcus Ashworth", role: "Disinherited Son",
    bio: "Cut from the will entirely. Volatile temper. Was seen in the garden during dinner — but staff placed him at 7:30.",
  },
  whitmore: {
    id: "whitmore", name: "Dr. Reginald Whitmore", role: "Physician",
    bio: "Grew the monkshood. Taught Elena about aconitine 'for literature.' Threat letter resembles his hand — possibly forged.",
  },
  thomas: {
    id: "thomas", name: "Thomas Graves", role: "Butler",
    bio: "Forty years of service. Argued against the new will. Access to every room — no poison knowledge.",
  },
};

export const ROOM_BOUNDS = {
  entrance: { name: "Entrance Hall", min: { x: -6, z: -4 }, max: { x: 6, z: 6 } },
  library: { name: "Library", min: { x: -18, z: -4 }, max: { x: -6, z: 8 } },
  study: { name: "Study", min: { x: 6, z: -4 }, max: { x: 18, z: 6 } },
  kitchen: { name: "Kitchen", min: { x: -10, z: 6 }, max: { x: 2, z: 18 } },
  ballroom: { name: "Ballroom", min: { x: 2, z: 6 }, max: { x: 16, z: 18 } },
  garden: { name: "Moonlit Garden", min: { x: -4, z: 18 }, max: { x: 12, z: 30 } },
};

export const INTERACTABLES = [
  { id: "body", clue: "body", pos: [-12, 1.2, 2], label: "Examine body" },
  { id: "letter", clue: "letter", pos: [-14, 1.1, -1], label: "Read letter" },
  { id: "will", clue: "will", pos: [12, 1.2, 0], label: "Read will" },
  { id: "safe", clue: "safe", pos: [15, 1.4, 2], label: "Open safe" },
  { id: "extract", clue: "extract", pos: [-6, 1.3, 12], label: "Inspect jar" },
  { id: "ledger", clue: "ledger", pos: [-2, 1.1, 14], label: "Check ledger" },
  { id: "prints", clue: "prints", pos: [2, 0.4, 24], label: "Inspect footprints" },
  { id: "champagne", clue: "champagne", pos: [12, 1.2, 10], label: "Examine glass" },
];

export const ENEMY_TYPES = {
  runner: { hp: 3, speed: 3.6, ranged: false, scale: 0.92, color: 0x1a1820, eye: 0xff4466, dmg: 12 },
  shooter: { hp: 4, speed: 2.0, ranged: true, scale: 1.0, color: 0x1a1218, eye: 0xff2233, dmg: 14 },
  brute: { hp: 8, speed: 1.55, ranged: false, scale: 1.25, color: 0x221018, eye: 0xff6622, dmg: 22 },
};

export const ENEMY_SPAWNS = [
  { x: -10, z: 4, type: "shooter" },
  { x: 10, z: 1, type: "runner" },
  { x: -4, z: 12, type: "brute" },
  { x: 8, z: 14, type: "shooter" },
  { x: 4, z: 22, type: "runner" },
  { x: -12, z: 0, type: "shooter" },
  { x: 14, z: 8, type: "brute" },
  { x: 0, z: 16, type: "runner" },
  { x: -8, z: 10, type: "shooter" },
];

export const WEAPONS = {
  pistol: {
    id: "pistol", name: ".45 ACP",
    magSize: 12, reserveStart: 48,
    fireRate: 0.15, adsFireRate: 0.2,
    damage: 1, pellets: 1, range: 32,
    recoil: 0.14, adsRecoil: 0.06, spreadLabel: ".45 ACP",
  },
  shotgun: {
    id: "shotgun", name: "12-GAUGE",
    magSize: 6, reserveStart: 18,
    fireRate: 0.7, adsFireRate: 0.85,
    damage: 1, pellets: 6, range: 14,
    recoil: 0.28, adsRecoil: 0.18, rangeLabel: "12-GA",
  },
};

export const PICKUPS = [
  { type: "health", amount: 25, x: -3, z: 0 },
  { type: "ammo", amount: 12, x: 3, z: 2 },
  { type: "health", amount: 35, x: -14, z: 5 },
  { type: "ammo", amount: 18, x: 14, z: -1 },
  { type: "ammo", amount: 12, x: -7, z: 15 },
  { type: "health", amount: 25, x: 10, z: 15 },
  { type: "ammo", amount: 12, x: 6, z: 25 },
  { type: "shotgun", amount: 1, x: -5, z: 10 },
];

/** Study door unlocks after securing the library body clue */
export const STUDY_LOCK = {
  clueRequired: "body",
  block: { x: 6, z: 2, w: 0.5, h: 2.6, d: 2.2 },
  message: "Study door sealed. Examine the body in the library first.",
};

export const RADIO = [
  { atClues: 0, atKills: 0, once: false, text: "HQ: Comms live. Sweep the manor. Recover evidence." },
  { atClues: 1, text: "HQ: First exhibit logged. Watch your six — hostiles are aggressive." },
  { atClues: 3, text: "HQ: Pattern forming. Poison, not the brandy. Check the kitchen." },
  { atClues: 5, text: "HQ: Enough for a charge. Confirm motive in the study, then accuse." },
  { atClues: 8, text: "HQ: Full dossier. Confront the heiress if she shows herself." },
  { atKills: 3, text: "HQ: Multiple hostiles down. Someone armed the estate on purpose." },
  { atKills: 6, text: "HQ: Brutes in the east wing. Keep distance — or bash when close." },
  { atBossPhase: 2, text: "HQ: She's calling reinforcements. Clear the adds, then finish her." },
];
