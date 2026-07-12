/* Game data — The Midnight Manor */

const SOLUTION = { killer: "elena", method: "poison", motive: "inheritance" };
const CLUES_NEEDED = 4;
const DEDUCTIONS_NEEDED = 3;

const INTRO_LINES = [
  "Blackwood Manor rises against the moors like a clenched fist — all stone teeth and leaded glass.",
  "Tonight, Lord Reginald Ashworth hosted a birthday dinner for twelve. By midnight, the guest list had shrunk to five suspects and one corpse.",
  "The body was found in the library at 9:15 PM. No wounds. Blue lips. The brandy glass beside him was untouched.",
  "A storm has washed out the roads. The constable won't arrive until dawn. Until then, the killer is in this house — and everyone has a motive.",
  "You are the detective they sent for. Examine every room. Question every suspect. Find the truth before the sun comes up.",
];

const TIMELINE = [
  { id: "t1", time: "6:00 PM", event: "Dr. Whitmore examines Lord Ashworth — healthy", requires: null },
  { id: "t2", time: "7:10 PM", event: "Elena leaves the ballroom 'for air'", requires: "elena_champagne" },
  { id: "t3", time: "7:15 PM", event: "Elena enters the kitchen", requires: "elena_in_kitchen" },
  { id: "t4", time: "7:30 PM", event: "Dinner served — soup course first", requires: null },
  { id: "t5", time: "8:45 PM", event: "Lord Ashworth complains of numbness, retires to library", requires: "cause_of_death" },
  { id: "t6", time: "9:15 PM", event: "Body discovered by Thomas Graves", requires: null },
];

const DEDUCTIONS = [
  {
    id: "who",
    label: "Who had opportunity?",
    correct: "elena",
    options: [
      { id: "elena", label: "Elena Voss — left ballroom, entered kitchen before dinner" },
      { id: "marcus", label: "Marcus Ashworth — in garden during dinner" },
      { id: "whitmore", label: "Dr. Whitmore — never left the ballroom" },
      { id: "thomas", label: "Thomas Graves — supervising service" },
    ],
    requires: ["elena_in_kitchen", "elena_champagne"],
  },
  {
    id: "how",
    label: "How was he killed?",
    correct: "poison",
    options: [
      { id: "poison", label: "Monkshood poison in the soup course" },
      { id: "brandy", label: "Poisoned brandy in the library" },
      { id: "stabbing", label: "Blade wound" },
      { id: "natural", label: "Heart failure — natural causes" },
    ],
    requires: ["cause_of_death", "missing_monkshood", "untouched_brandy"],
  },
  {
    id: "why",
    label: "Why now?",
    correct: "inheritance",
    options: [
      { id: "inheritance", label: "Secure inheritance before will reversal" },
      { id: "revenge", label: "Revenge for disinheritance" },
      { id: "blackmail", label: "Silence a blackmail threat" },
      { id: "accident", label: "Accidental overdose" },
    ],
    requires: ["new_will", "safe_open"],
  },
];

const LOCATIONS = {
  library: {
    id: "library",
    name: "The Library",
    desc: "Leather and mahogany. Rain hammers the tall windows. Lord Ashworth's body still sits in his armchair, as though he merely dozed off — but the blue tint of his lips tells another story.",
    scene: "library",
    hotspots: [
      { id: "body", label: "The Body", x: 42, y: 58, clue: "cause_of_death" },
      { id: "brandy", label: "Brandy Glass", x: 68, y: 52, clue: "untouched_brandy" },
      { id: "letter", label: "Torn Letter", x: 28, y: 68, clue: "threatening_letter" },
      { id: "book", label: "Fallen Book", x: 55, y: 78, clue: "poison_book" },
    ],
  },
  kitchen: {
    id: "kitchen",
    name: "The Kitchen",
    desc: "Copper pots gleam in the firelight. The staff prepared a four-course dinner. Something was added to the first course — and only someone who knew the house could have done it.",
    scene: "kitchen",
    hotspots: [
      { id: "trash", label: "Waste Bin", x: 18, y: 72, clue: "glove_in_trash" },
      { id: "pantry", label: "Spice Pantry", x: 78, y: 38, clue: "missing_monkshood" },
      { id: "ledger", label: "Staff Ledger", x: 48, y: 62, clue: "elena_in_kitchen" },
    ],
  },
  study: {
    id: "study",
    name: "Lord Ashworth's Study",
    desc: "A private world of contracts and secrets. Three days ago, the will was rewritten. Tonight, someone discovered it could still be undone.",
    scene: "study",
    hotspots: [
      { id: "will", label: "Last Will", x: 35, y: 55, clue: "new_will" },
      { id: "safe", label: "Wall Safe", x: 72, y: 35, clue: "safe_open" },
      { id: "portrait", label: "Family Portrait", x: 50, y: 28, clue: "elena_portrait" },
    ],
  },
  garden: {
    id: "garden",
    name: "The Moonlit Garden",
    desc: "Rain-slicked gravel and clipped hedgerows. The storm has turned the paths to mud — and mud remembers every footstep.",
    scene: "garden",
    hotspots: [
      { id: "footprints", label: "Muddy Tracks", x: 40, y: 75, clue: "small_footprints" },
      { id: "monkshood_plant", label: "Herb Garden", x: 65, y: 48, clue: "monkshood_garden" },
      { id: "cigarette", label: "Garden Bench", x: 22, y: 58, clue: "marcus_alibi" },
    ],
  },
  ballroom: {
    id: "ballroom",
    name: "The Grand Ballroom",
    desc: "Crystal chandeliers. A grand piano. Champagne gone flat. The guests gathered here after dinner — but not everyone stayed.",
    scene: "ballroom",
    hotspots: [
      { id: "champagne", label: "Champagne Table", x: 75, y: 45, clue: "elena_champagne" },
      { id: "piano", label: "Grand Piano", x: 30, y: 50, clue: "thomas_argument" },
    ],
  },
};

const CLUES = {
  cause_of_death: {
    id: "cause_of_death", title: "Cause of Death", category: "critical",
    text: "No visible wounds. Lord Ashworth's lips bear a faint bluish tint — classic aconitine poisoning. Yet the brandy glass beside him smells perfectly ordinary. The poison came elsewhere.",
    location: "library",
  },
  untouched_brandy: {
    id: "untouched_brandy", title: "Untouched Brandy", category: "critical",
    text: "The brandy is genuine — a 30-year reserve, untainted. The killer wanted you to look here. The real delivery was at dinner.",
    location: "library",
  },
  threatening_letter: {
    id: "threatening_letter", title: "Threatening Letter", category: "red-herring",
    text: "Fragments read: '...your will leaves everything to that woman... amend it by week's end or regret it.' Handwriting resembles Dr. Whitmore's — but the paper is twenty years old. A misdirection.",
    location: "library",
  },
  poison_book: {
    id: "poison_book", title: "Toxicology Volume", category: "critical",
    text: "Open to monkshood — aconitine. Underlined: 'Odorless. Tasteless in small doses. Death within the hour.' Dr. Whitmore's bookmark. He taught someone else to read this page too.",
    location: "library",
  },
  glove_in_trash: {
    id: "glove_in_trash", title: "Latex Glove", category: "critical",
    text: "A surgical glove, inside-out, buried under peels. White powder on the fingertips. Kitchen staff wear cloth — this is medical latex, used to handle poison without leaving prints.",
    location: "kitchen",
  },
  missing_monkshood: {
    id: "missing_monkshood", title: "Missing Monkshood Extract", category: "critical",
    text: "A jar labeled 'Monkshood Extract — MEDICAL USE ONLY' is nearly empty. Seal broken tonight. Stored on a high shelf only Dr. Whitmore and the head cook knew about.",
    location: "kitchen",
  },
  elena_in_kitchen: {
    id: "elena_in_kitchen", title: "Kitchen Log Entry", category: "critical",
    text: "7:15 PM — Elena Voss entered kitchen, 'dietary restrictions.' Dinner served 7:30. Lord Ashworth fell ill 8:45. The soup course was the only window.",
    location: "kitchen",
  },
  new_will: {
    id: "new_will", title: "Revised Will", category: "critical",
    text: "Dated three days ago: entire estate — manor, holdings, £2 million — to Elena Voss. Marcus, Victoria, and Thomas cut out entirely.",
    location: "study",
  },
  safe_open: {
    id: "safe_open", title: "Opened Safe", category: "critical",
    text: "Opened tonight. Inside: unsigned draft will restoring original beneficiaries. Lord Ashworth planned to reverse his decision. Someone acted before he could sign.",
    location: "study",
  },
  elena_portrait: {
    id: "elena_portrait", title: "Hidden Portrait", category: "normal",
    text: "Behind the family painting: Elena Voss, raised abroad, recently acknowledged. Note on back: 'Reunited at last. My true heir.'",
    location: "study",
  },
  small_footprints: {
    id: "small_footprints", title: "Garden Footprints", category: "critical",
    text: "Size 6 heels in fresh mud — garden gate to kitchen door. Match Elena's dinner shoes. She claimed she never left the ballroom.",
    location: "garden",
  },
  monkshood_garden: {
    id: "monkshood_garden", title: "Cut Monkshood Stems", category: "normal",
    text: "Several monkshood stems freshly cut in Dr. Whitmore's herb garden. He tends these plants — but the extract jar in the kitchen is what was used tonight.",
    location: "garden",
  },
  marcus_alibi: {
    id: "marcus_alibi", title: "Marcus's Cigarette", category: "red-herring",
    text: "Gold-tipped stub on the garden bench. Marcus's brand. Ash marks suggest thirty minutes — during dinner. Suspicious, but he was visible to staff at 7:30.",
    location: "garden",
  },
  elena_champagne: {
    id: "elena_champagne", title: "Untouched Champagne", category: "critical",
    text: "Elena's flute sits on the windowsill, full. She claimed she drank during the toast. Victoria saw her slip out at 7:10 — before dinner.",
    location: "ballroom",
  },
  thomas_argument: {
    id: "thomas_argument", title: "Overheard Argument", category: "normal",
    text: "Thomas argued with Lord Ashworth yesterday: 'You cannot disinherit your own son!' He had access to every room — but no knowledge of poisons.",
    location: "ballroom",
  },
};

const SUSPECTS = {
  elena: {
    id: "elena", name: "Elena Voss", role: "Acknowledged Daughter & Heiress",
    color: "#7c5cbf", initials: "EV",
    greeting: "Detective. I suppose you want to know about my father. We only met six months ago. This is all so dreadful.",
    topics: [
      { id: "alibi", label: "Where were you during dinner?",
        response: "In the ballroom, of course. We toasted Father's birthday. I barely left my seat — ask anyone.",
        contradicts: ["elena_in_kitchen", "small_footprints", "elena_champagne"], lie: true },
      { id: "will", label: "Did you know about the new will?", requires: ["new_will"],
        response: "Father told me three days ago. I was shocked — I never wanted his money. I have my own career abroad." },
      { id: "mother", label: "Tell me about your mother.", requires: ["elena_portrait"],
        response: "She passed when I was young. Father never acknowledged me publicly — until now. Marcus and Victoria always resented me." },
      { id: "kitchen", label: "The kitchen log places you there at 7:15.", requires: ["elena_in_kitchen"],
        response: "I... I only went to tell Cook about my allergies. I was back in the ballroom before the first course. Two minutes, nothing more.",
        contradicts: ["small_footprints"], lie: true },
      { id: "poison", label: "What do you know about monkshood?", requires: ["poison_book", "missing_monkshood"],
        response: "Monkshood? That's a poison. Why would I — I'm a literature professor, not a chemist. Dr. Whitmore is the expert here.",
        contradicts: ["poison_book"], lie: true },
      { id: "confront", label: "Your footprints lead from the garden to the kitchen.", requires: ["small_footprints", "elena_in_kitchen"],
        response: "I... very well. I went to the kitchen. I went through the garden because the main hall was crowded. But I did not harm my father. You must believe me.",
        lie: true, confrontation: true },
    ],
  },
  marcus: {
    id: "marcus", name: "Marcus Ashworth", role: "Disinherited Son",
    color: "#4a7c59", initials: "MA",
    greeting: "My father is dead and I'm the prime suspect. How predictable. Yes, he cut me from the will. No, I didn't kill him.",
    topics: [
      { id: "alibi", label: "Your alibi for the evening?",
        response: "Ballroom all night. Victoria sat beside me — she'll confirm. I stepped out once for a cigarette, but that was before dinner.",
        contradicts: ["marcus_alibi"], lie: true },
      { id: "will", label: "How did you react to the new will?", requires: ["new_will"],
        response: "Furious. Obviously. Forty years of Ashworth legacy, gone to a stranger. But killing Father doesn't restore my inheritance." },
      { id: "elena", label: "What do you think of Elena?",
        response: "She's not a stranger — she's Father's bastard. She appeared from nowhere and took everything. Though I will say: she seemed nervous at dinner." },
      { id: "threat", label: "Did you threaten your father?", requires: ["threatening_letter"],
        response: "I may have said harsh things last week. Everyone did. That letter isn't even mine — look at the date on the paper." },
    ],
  },
  victoria: {
    id: "victoria", name: "Victoria Ashworth", role: "Disinherited Daughter",
    color: "#b85c38", initials: "VA",
    greeting: "I loved my father, despite everything. This manor was my home. Now it's Elena's — and he's dead. How terribly convenient.",
    topics: [
      { id: "alibi", label: "Where were you tonight?",
        response: "Ballroom. I was at the piano — Father asked me to play. I didn't leave until we found him. Elena, though... she vanished during the soup course.",
        reveals: ["elena_champagne"] },
      { id: "elena_suspicious", label: "What did you see Elena do?", requires: ["elena_champagne"],
        response: "She left before dinner. Came back flushed, wouldn't meet anyone's eyes. I thought she'd been crying. Now I wonder what she was really doing." },
      { id: "whitmore", label: "What about Dr. Whitmore?", requires: ["monkshood_garden"],
        response: "He's been Father's physician for twenty years. He was furious about the monkshood in the garden — said it was irresponsible to grow poison on the estate." },
      { id: "will", label: "The will disinherited you too.",
        response: "I was to receive the London townhouse and £200,000. Now nothing. But I was in plain sight all evening — ask the servants." },
    ],
  },
  whitmore: {
    id: "whitmore", name: "Dr. Reginald Whitmore", role: "Family Physician",
    color: "#3d6b8e", initials: "RW",
    greeting: "I warned Lord Ashworth about his heart. I did not warn him that someone in this house would poison him. Though I should have suspected.",
    topics: [
      { id: "alibi", label: "Your whereabouts tonight?",
        response: "Ballroom. I examined Lord Ashworth at 6 PM — he was healthy. I was at the champagne table when dinner was served. I never entered the kitchen." },
      { id: "monkshood", label: "You grow monkshood in the garden.", requires: ["monkshood_garden", "missing_monkshood"],
        response: "For legitimate research. The extract in the pantry is mine — medically sealed. I noticed it was disturbed tonight. Someone knew exactly what to take." },
      { id: "letter", label: "Did you write the threatening letter?", requires: ["threatening_letter"],
        response: "That is outrageous. I wrote no such letter. My concern was medical, not financial. I stood to gain nothing from Ashworth's death." },
      { id: "poison_knowledge", label: "Who else knows about aconitine?", requires: ["poison_book"],
        response: "I taught Elena about it, actually. She visited my study last month — asked about poisons in literature. De Agatha Christie, she said. I showed her my reference books.",
        reveals: ["poison_book"] },
    ],
  },
  thomas: {
    id: "thomas", name: "Thomas Graves", role: "Head Butler — 40 Years",
    color: "#8b7355", initials: "TG",
    greeting: "I've served the Ashworth family since before Marcus was born. I would never harm Lord Ashworth — though I begged him to reconsider the will.",
    topics: [
      { id: "alibi", label: "Where were you during dinner?",
        response: "Supervising service in the dining room and kitchen. I was in and out — but I never left the ground floor. Cook can confirm." },
      { id: "will", label: "You knew about the will change.", requires: ["new_will"],
        response: "Lord Ashworth told me himself. 'Thomas, you've been loyal, but blood is blood.' I was to receive a cottage and pension. Now that's void too." },
      { id: "elena", label: "Did you see Elena in the kitchen?", requires: ["elena_in_kitchen"],
        response: "I did. At quarter past seven. She spoke with Cook briefly, then left through the garden door. I thought it odd — dinner was about to be served.",
        reveals: ["small_footprints"] },
      { id: "safe", label: "Who knew the safe combination?", requires: ["safe_open"],
        response: "Only Lord Ashworth and his solicitor, Mr. Pemberton. Though last week I saw Dr. Whitmore leaving the study with him — discussing 'contingencies.'" },
    ],
  },
};

const ACCUSATION_OPTIONS = {
  killer: [
    { id: "elena", label: "Elena Voss" },
    { id: "marcus", label: "Marcus Ashworth" },
    { id: "victoria", label: "Victoria Ashworth" },
    { id: "whitmore", label: "Dr. Reginald Whitmore" },
    { id: "thomas", label: "Thomas Graves" },
  ],
  method: [
    { id: "poison", label: "Monkshood poison (aconitine) in the soup" },
    { id: "brandy", label: "Poisoned brandy in the library" },
    { id: "stabbing", label: "Stab wound" },
    { id: "strangling", label: "Strangulation" },
  ],
  motive: [
    { id: "inheritance", label: "Secure inheritance before will reversal" },
    { id: "revenge", label: "Revenge for being disinherited" },
    { id: "blackmail", label: "Silence a blackmail victim" },
    { id: "jealousy", label: "Jealous rage" },
  ],
};

const CATEGORY_LABELS = {
  critical: "Critical Evidence",
  "red-herring": "Possible Red Herring",
  normal: "Supporting Evidence",
};
