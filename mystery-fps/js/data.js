export const BRIEF = [
  "Lord Reginald Ashworth was found dead in his library at 21:15. Cause: aconitine poisoning.",
  "The storm sealed Blackwood Manor. You are alone with the crime scene — and four suspects still on the grounds.",
  "Search every room. Press E to examine exhibits. Tab opens your case journal. Accuse when you have five pieces of evidence.",
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

/** Atmosphere notes found while searching */
export const PICKUPS = [
  { type: "note", amount: 0, x: -3, z: 0, text: "Staff note: 'Do not serve Lord A. the soup until Elena approves the menu.'" },
  { type: "note", amount: 0, x: 3, z: 2, text: "Guest card: Elena Voss — arrived early, requested kitchen access." },
  { type: "note", amount: 0, x: 14, z: -1, text: "Whitmore's appointment book: 'Monkshood — literature consultation w/ E.V.'" },
  { type: "note", amount: 0, x: 6, z: 25, text: "Garden gate log: size-six heels, 19:12 — outbound toward kitchen wing." },
];

/** Study door unlocks after securing the library body clue */
export const STUDY_LOCK = {
  clueRequired: "body",
  block: { x: 6, z: 2, w: 0.5, h: 2.6, d: 2.2 },
  message: "Study door sealed. Examine the body in the library first.",
};

export const RADIO = [
  { atClues: 0, text: "HQ: Comms live. Document the scene. Build a case before dawn." },
  { atClues: 1, text: "HQ: First exhibit logged. Follow the poison — not the brandy." },
  { atClues: 3, text: "HQ: Pattern forming. Cross-check the kitchen against the will." },
  { atClues: 5, text: "HQ: Enough for a charge. Open your journal and name the killer." },
  { atClues: 8, text: "HQ: Full dossier. Make your accusation when ready." },
];
