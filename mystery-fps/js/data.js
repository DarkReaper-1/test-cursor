/** Voiceover-style opening — detective movie narration */
export const BRIEF = [
  "Rain on the manor. A dead lord in the library. Poison in the blood.",
  "The storm locked every door. Four suspects. No escape until dawn.",
  "Walk the rooms. Examine what the night left behind. Pin your theories — then name the killer.",
  "Elena Voss. Marcus Ashworth. Dr. Whitmore. Thomas Graves. One of them poured the death.",
];

export const SOLUTION = "elena";

/** Room cards as film chapter titles */
export const ROOM_CARDS = {
  entrance: { act: "ACT I", line: "The Threshold" },
  library: { act: "ACT I", line: "The Body in the Library" },
  study: { act: "ACT II", line: "Paper Knives" },
  kitchen: { act: "ACT II", line: "Where Poison Waits" },
  ballroom: { act: "ACT III", line: "Broken Alibis" },
  garden: { act: "ACT III", line: "Tracks in the Rain" },
};

/** Display kinds are non-spoiling; implicates are truth data for case resolution only */
export const CLUES = {
  body: {
    id: "body", title: "Ashworth's Body", kind: "physical",
    text: "No trauma. Blue lips. Classic aconitine. The brandy beside him is clean — the poison came earlier, at dinner.",
    room: "library", implicates: ["elena", "whitmore"],
    sting: "The camera finds him first.",
  },
  letter: {
    id: "letter", title: "Torn Threat Letter", kind: "document",
    text: "Fragments: '...amend the will by week's end...' Handwriting mimics Whitmore's, but the paper is decades old. A plant.",
    room: "library", implicates: ["whitmore"],
    sting: "Someone wanted a convenient villain.",
  },
  will: {
    id: "will", title: "Revised Will", kind: "document",
    text: "Three days old. Entire estate to Elena Voss. Marcus, Victoria, and Thomas cut out. Motive for everyone — including her.",
    room: "study", implicates: ["elena", "marcus", "thomas"],
    sting: "Fortune redrawn in ink.",
  },
  safe: {
    id: "safe", title: "Unsigned Reversal", kind: "document",
    text: "Safe cracked tonight. Inside: an unsigned draft restoring the old heirs. Someone killed him before he could sign.",
    room: "study", implicates: ["elena"],
    sting: "The rewrite that never happened.",
  },
  extract: {
    id: "extract", title: "Monkshood Extract", kind: "chemical",
    text: "Medical jar nearly empty. Seal broken tonight. Only Whitmore and kitchen staff knew the shelf — and Elena visited last month.",
    room: "kitchen", implicates: ["elena", "whitmore"],
    sting: "Death in a glass vial.",
  },
  ledger: {
    id: "ledger", title: "Kitchen Log", kind: "document",
    text: "7:15 PM — Elena Voss entered the kitchen for 'dietary restrictions.' Soup served 7:30. Ashworth collapsed 8:45.",
    room: "kitchen", implicates: ["elena"],
    sting: "The clock never lies.",
  },
  prints: {
    id: "prints", title: "Muddy Heels", kind: "trace",
    text: "Size-six heels from garden gate to kitchen door. Match Elena's dinner shoes. She claimed she never left the ballroom.",
    room: "garden", implicates: ["elena"],
    sting: "A path cut through the storm.",
  },
  champagne: {
    id: "champagne", title: "Untouched Flute", kind: "physical",
    text: "Elena's champagne still full on the sill. Victoria saw her slip out at 7:10. Her alibi collapses.",
    room: "ballroom", implicates: ["elena"],
    sting: "The glass she never drank.",
  },
};

export const KIND_LABELS = {
  physical: "Physical",
  document: "Document",
  chemical: "Chemical",
  trace: "Trace",
  flavor: "Observation",
  note: "Field Note",
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

/** Non-clue examines — searchable manor atmosphere */
export const FLAVOR = [
  {
    id: "brandy", pos: [-11.2, 1.15, 1.4], label: "Inspect brandy",
    title: "Brandy Snifter",
    text: "Untouched. No residue. If the poison was in a drink, it was not this glass.",
  },
  {
    id: "desk", pos: [10.5, 1.1, -1.5], label: "Search desk",
    title: "Study Desk",
    text: "Ink still wet on a blotter. Ashworth was drafting something tonight — interrupted before he finished.",
  },
  {
    id: "window", pos: [14, 1.6, 12], label: "Look through window",
    title: "Ballroom Window",
    text: "Rain sheets the glass. The garden path below gleams — someone walked it after the storm began.",
  },
  {
    id: "shelf", pos: [-7.5, 1.4, 10.5], label: "Scan shelf",
    title: "Kitchen Medicine Shelf",
    text: "Whitmore's labels, neat and clinical. One jar is missing from a marked space — the monkshood.",
  },
  {
    id: "portrait", pos: [0, 2.2, -2.8], label: "Study portrait",
    title: "Ashworth Portrait",
    text: "Oil of a younger Lord Ashworth. A newer frame card tucked behind: 'E.V. — acknowledged.'",
  },
  {
    id: "gate", pos: [4, 1.0, 27], label: "Check gate latch",
    title: "Garden Gate",
    text: "Latch sticky with mud. Fresh heel marks on the inner side — outbound toward the kitchen wing.",
  },
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
  message: "The study stays sealed. The body in the library must speak first.",
};

/** Detective narration — film voiceover, not HQ radio */
export const RADIO = [
  { atClues: 0, text: "Voiceover: The manor holds its breath. So do you." },
  { atClues: 1, text: "Voiceover: First cut of the reel. Follow the poison — not the brandy." },
  { atClues: 3, text: "Voiceover: The plot thickens. Kitchen against will. Time against alibi." },
  { atClues: 5, text: "Voiceover: Enough for the final act. Pin your theory. Name the killer." },
  { atClues: 8, text: "Voiceover: Every frame in place. The accusation waits." },
];
