export const BRIEF = [
  "Lord Reginald Ashworth was found dead in his library at 21:15. Cause: aconitine poisoning.",
  "The storm sealed Blackwood Manor. Hostiles are inside — private security gone rogue, or something worse.",
  "Your orders: neutralize threats, recover eight pieces of evidence, and identify the killer before dawn.",
  "Suspects: Elena Voss (heiress), Marcus Ashworth (son), Dr. Whitmore (physician), Thomas Graves (butler).",
];

export const SOLUTION = "elena";

export const CLUES = {
  body: {
    id: "body",
    title: "Ashworth's Body",
    text: "No trauma. Blue lips. Classic aconitine. The brandy beside him is clean — the poison came earlier, at dinner.",
    room: "library",
  },
  letter: {
    id: "letter",
    title: "Torn Threat Letter",
    text: "Fragments: '...amend the will by week's end...' Handwriting mimics Whitmore's, but the paper is decades old. A plant.",
    room: "library",
  },
  will: {
    id: "will",
    title: "Revised Will",
    text: "Three days old. Entire estate to Elena Voss. Marcus, Victoria, and Thomas cut out. Motive for everyone — including her.",
    room: "study",
  },
  safe: {
    id: "safe",
    title: "Unsigned Reversal",
    text: "Safe cracked tonight. Inside: an unsigned draft restoring the old heirs. Someone killed him before he could sign.",
    room: "study",
  },
  extract: {
    id: "extract",
    title: "Monkshood Extract",
    text: "Medical jar nearly empty. Seal broken tonight. Only Whitmore and kitchen staff knew the shelf — and Elena visited last month.",
    room: "kitchen",
  },
  ledger: {
    id: "ledger",
    title: "Kitchen Log",
    text: "7:15 PM — Elena Voss entered the kitchen for 'dietary restrictions.' Soup served 7:30. Ashworth collapsed 8:45.",
    room: "kitchen",
  },
  prints: {
    id: "prints",
    title: "Muddy Heels",
    text: "Size-six heels from garden gate to kitchen door. Match Elena's dinner shoes. She claimed she never left the ballroom.",
    room: "garden",
  },
  champagne: {
    id: "champagne",
    title: "Untouched Flute",
    text: "Elena's champagne still full on the sill. Victoria saw her slip out at 7:10. Her alibi collapses.",
    room: "ballroom",
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

export const ENEMY_SPAWNS = [
  { x: -10, z: 4 },
  { x: 10, z: 1 },
  { x: -4, z: 12 },
  { x: 8, z: 14 },
  { x: 4, z: 22 },
  { x: -12, z: 0 },
  { x: 14, z: 8 },
];
