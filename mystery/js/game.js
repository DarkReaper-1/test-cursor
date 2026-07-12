/* ═══════════════════════════════════════════════════════════
   THE MIDNIGHT MANOR — Murder Mystery Game
   ═══════════════════════════════════════════════════════════ */

const SOLUTION = {
  killer: "elena",
  method: "poison",
  motive: "inheritance",
};

const CLUES_NEEDED_TO_ACCUSE = 4;

const LOCATIONS = {
  library: {
    id: "library",
    name: "The Library",
    desc: "Lord Ashworth's body was found slumped in his leather armchair. A half-empty brandy glass rests on the side table. Rain lashes the tall windows.",
    hotspots: [
      {
        id: "body",
        icon: "🪑",
        label: "The Body",
        hint: "Examine the victim",
        clue: {
          id: "cause_of_death",
          title: "Cause of Death",
          text: "No visible wounds. Lord Ashworth's lips have a faint bluish tint. The coroner would call this poisoning — but the brandy glass beside him smells perfectly normal.",
        },
      },
      {
        id: "brandy",
        icon: "🥃",
        label: "Brandy Glass",
        hint: "Inspect the drink",
        clue: {
          id: "untouched_brandy",
          title: "Untouched Brandy",
          text: "The brandy in the glass is genuine — expensive, untainted. Whoever poisoned Ashworth didn't use this drink. The poison was administered another way.",
        },
      },
      {
        id: "letter",
        icon: "📜",
        label: "Torn Letter",
        hint: "Read the fragments",
        clue: {
          id: "threatening_letter",
          title: "Threatening Letter",
          text: "Fragments of a letter: '...your will leaves everything to that woman... if you do not amend it by week's end, you will regret it.' The handwriting matches Dr. Whitmore's medical notes.",
        },
      },
      {
        id: "book",
        icon: "📕",
        label: "Fallen Book",
        hint: "Pick up the book",
        clue: {
          id: "poison_book",
          title: "Toxicology Volume",
          text: "A book on plant poisons lies open to a page on monkshood — aconitine. A passage is underlined: 'Odorless. Tasteless in small doses. Death within the hour.' A bookmark bears Dr. Whitmore's initials.",
        },
      },
    ],
  },
  kitchen: {
    id: "kitchen",
    name: "The Kitchen",
    desc: "Copper pots hang from hooks. The staff prepared dinner hours ago. Something was added to one of the courses — but which?",
    hotspots: [
      {
        id: "trash",
        icon: "🗑️",
        label: "Waste Bin",
        hint: "Search the trash",
        clue: {
          id: "glove_in_trash",
          title: "Latex Glove",
          text: "A single latex glove, turned inside out, buried under vegetable peels. Traces of white powder cling to the fingertips. The kitchen staff wear cloth gloves — this is surgical latex.",
        },
      },
      {
        id: "pantry",
        icon: "🏺",
        label: "Spice Pantry",
        hint: "Check the shelves",
        clue: {
          id: "missing_monkshood",
          title: "Missing Ingredient",
          text: "A jar labeled 'Monkshood Extract — MEDICAL USE ONLY' sits nearly empty on a high shelf. The seal was broken tonight. Only someone with medical knowledge would know where this was kept.",
        },
      },
      {
        id: "ledger",
        icon: "📋",
        label: "Staff Ledger",
        hint: "Review the log",
        clue: {
          id: "elena_in_kitchen",
          title: "Kitchen Log",
          text: "The ledger shows Elena Voss entered the kitchen at 7:15 PM — 'to speak with Cook about dietary restrictions.' Dinner was served at 7:30. Lord Ashworth fell ill at 8:45.",
        },
      },
    ],
  },
  study: {
    id: "study",
    name: "Lord Ashworth's Study",
    desc: "A private sanctuary of mahogany and leather. His will was revised here three days ago — and someone was not pleased.",
    hotspots: [
      {
        id: "will",
        icon: "📄",
        label: "Last Will & Testament",
        hint: "Read the will",
        clue: {
          id: "new_will",
          title: "Revised Will",
          text: "Dated three days ago: the entire Ashworth estate — manor, holdings, £2 million — goes to Elena Voss, his recently acknowledged daughter. Previous beneficiaries (Marcus, Victoria, Thomas) are cut out entirely.",
        },
      },
      {
        id: "safe",
        icon: "🔒",
        label: "Wall Safe",
        hint: "Examine the safe",
        clue: {
          id: "safe_open",
          title: "Opened Safe",
          text: "The safe was opened tonight — the combination known only to Ashworth and his solicitor. Inside: a second will draft, unsigned, restoring the original beneficiaries. Someone found it too late.",
        },
      },
      {
        id: "portrait",
        icon: "🖼️",
        label: "Family Portrait",
        hint: "Study the painting",
        clue: {
          id: "elena_portrait",
          title: "Hidden Daughter",
          text: "A portrait of a young woman hidden behind the main family painting — Elena Voss, Ashworth's illegitimate daughter, raised abroad. A note on the back: 'Reunited at last. My true heir.'",
        },
      },
    ],
  },
  garden: {
    id: "garden",
    name: "The Moonlit Garden",
    desc: "Rain-slicked paths wind through hedgerows. Footprints in the mud tell a story of someone who left in a hurry.",
    hotspots: [
      {
        id: "footprints",
        icon: "👣",
        label: "Muddy Footprints",
        hint: "Follow the tracks",
        clue: {
          id: "small_footprints",
          title: "Small Footprints",
          text: "Fresh footprints — size 6 women's heels — lead from the garden gate to the kitchen door. They match the heels Elena wore to dinner. She claimed she never left the ballroom.",
        },
      },
      {
        id: "monkshood_plant",
        icon: "🌿",
        label: "Garden Beds",
        hint: "Inspect the plants",
        clue: {
          id: "monkshood_garden",
          title: "Monkshood Plants",
          text: "Monkshood grows in the medicinal herb garden — planted by Dr. Whitmore for 'research.' Several stems were recently cut. Whitmore tends these plants, but he was in the ballroom all evening.",
        },
      },
      {
        id: "cigarette",
        icon: "🚬",
        label: "Discarded Cigarette",
        hint: "Pick it up",
        clue: {
          id: "marcus_alibi",
          title: "Marcus's Cigarette",
          text: "A gold-tipped cigarette stub — Marcus Ashworth's brand. Ash marks on the bench show someone sat here for at least thirty minutes during dinner. Marcus has an alibi for the ballroom, but not for this bench.",
        },
      },
    ],
  },
  ballroom: {
    id: "ballroom",
    name: "The Grand Ballroom",
    desc: "The guests gathered here after dinner. Music played. Champagne flowed. No one admits to leaving — but someone is lying.",
    hotspots: [
      {
        id: "champagne",
        icon: "🍾",
        label: "Champagne Table",
        hint: "Check the drinks",
        clue: {
          id: "elena_champagne",
          title: "Elena's Glass",
          text: "Elena's champagne flute sits untouched on the windowsill — she claimed she drank it during the toast. She was never at the table. Victoria noticed Elena slip out 'for air' at 7:10 PM.",
        },
      },
      {
        id: "piano",
        icon: "🎹",
        label: "Grand Piano",
        hint: "Look behind the piano",
        clue: {
          id: "thomas_argument",
          title: "Overheard Argument",
          text: "Thomas the Butler was heard arguing with Lord Ashworth yesterday: 'You cannot disinherit your own son!' Thomas has served the family forty years. He had access to every room — but no medical knowledge.",
        },
      },
    ],
  },
};

const SUSPECTS = {
  elena: {
    id: "elena",
    name: "Elena Voss",
    role: "Acknowledged Daughter & Heiress",
    portrait: "👩",
    dialogue: {
      greeting: "Detective. I suppose you want to know about my... father. We only met six months ago. This is all so dreadful.",
      topics: [
        {
          id: "alibi",
          label: "Where were you during dinner?",
          response: "In the ballroom, of course. We toasted Father's birthday. I barely left my seat — ask anyone.",
          contradicts: ["elena_in_kitchen", "small_footprints", "elena_champagne"],
          lie: true,
        },
        {
          id: "will",
          label: "Did you know about the new will?",
          response: "Father told me three days ago. I was shocked — I never wanted his money. I have my own career abroad.",
          requires: ["new_will"],
        },
        {
          id: "mother",
          label: "Tell me about your mother.",
          response: "She passed when I was young. Father never acknowledged me publicly — until now. Marcus and Victoria always resented me.",
          requires: ["elena_portrait"],
        },
        {
          id: "kitchen",
          label: "The kitchen log says you were there at 7:15.",
          response: "I... I only went to tell Cook about my allergies. I was back in the ballroom before the first course. It took two minutes.",
          requires: ["elena_in_kitchen"],
          contradicts: ["small_footprints"],
          lie: true,
        },
        {
          id: "poison",
          label: "Do you know anything about monkshood?",
          response: "Monkshood? That's a poison. Why would I — I'm a literature professor, not a chemist. Dr. Whitmore is the expert here.",
          requires: ["poison_book", "missing_monkshood"],
        },
      ],
    },
  },
  marcus: {
    id: "marcus",
    name: "Marcus Ashworth",
    role: "Disinherited Son",
    portrait: "👨",
    dialogue: {
      greeting: "My father is dead and I'm the prime suspect. How predictable. Yes, he cut me from the will. No, I didn't kill him.",
      topics: [
        {
          id: "alibi",
          label: "Your alibi for the evening?",
          response: "Ballroom all night. Victoria sat beside me — she'll confirm. I stepped out once for a cigarette in the garden, but that was before dinner.",
          contradicts: ["marcus_alibi"],
          lie: true,
        },
        {
          id: "will",
          label: "How did you react to the new will?",
          response: "Furious. Obviously. Forty years of Ashworth legacy, gone to a stranger. But I was in London on business until yesterday — I didn't even know about the revision until Thomas told me.",
          requires: ["new_will"],
        },
        {
          id: "elena",
          label: "What do you think of Elena?",
          response: "She's not a stranger — she's Father's bastard. Pardon the bluntness. She appeared from nowhere and took everything. But killing Father doesn't restore my inheritance.",
        },
        {
          id: "threat",
          label: "Did you threaten your father?",
          response: "I may have said some harsh things at dinner last week. Everyone did. Thomas was the loudest, frankly.",
          requires: ["threatening_letter"],
        },
      ],
    },
  },
  victoria: {
    id: "victoria",
    name: "Victoria Ashworth",
    role: "Disinherited Daughter",
    portrait: "👩‍🦰",
    dialogue: {
      greeting: "I loved my father, despite everything. This manor was my home. Now it's Elena's — and he's dead. How convenient for her.",
      topics: [
        {
          id: "alibi",
          label: "Where were you tonight?",
          response: "Ballroom. I was at the piano — Father asked me to play. I didn't leave until we found him. Elena, though... she vanished during the soup course.",
          reveals: ["elena_champagne"],
        },
        {
          id: "elena_suspicious",
          label: "What did you see Elena do?",
          response: "She left the ballroom before dinner. Came back flushed, wouldn't meet anyone's eyes. I thought she'd been crying. Now I wonder.",
          requires: ["elena_champagne"],
        },
        {
          id: "whitmore",
          label: "What about Dr. Whitmore?",
          response: "He's been Father's physician for twenty years. He knew about the will change — Father consulted him about stress. Whitmore was furious about the monkshood in the garden. Said it was irresponsible.",
          requires: ["monkshood_garden"],
        },
        {
          id: "will",
          label: "The will disinherited you too.",
          response: "I was to receive the London townhouse and £200,000. Now nothing. Elena gets it all. But I was in plain sight all evening — ask the servants.",
        },
      ],
    },
  },
  whitmore: {
    id: "whitmore",
    name: "Dr. Reginald Whitmore",
    role: "Family Physician",
    portrait: "👨‍⚕️",
    dialogue: {
      greeting: "I warned Lord Ashworth about his heart. I did not warn him that someone in this house would poison him. Though I should have suspected.",
      topics: [
        {
          id: "alibi",
          label: "Your whereabouts tonight?",
          response: "Ballroom. I examined Lord Ashworth at 6 PM — he was healthy. I was at the champagne table when dinner was served. I never entered the kitchen.",
        },
        {
          id: "monkshood",
          label: "You grow monkshood in the garden.",
          response: "For legitimate research. The extract in the pantry is mine — medically sealed. I noticed it was disturbed tonight. Someone with access to this house knew exactly what to take.",
          requires: ["monkshood_garden", "missing_monkshood"],
        },
        {
          id: "letter",
          label: "Did you write the threatening letter?",
          response: "That is outrageous. I wrote no such letter. My concern was medical, not financial. I stood to gain nothing from Ashworth's death.",
          requires: ["threatening_letter"],
        },
        {
          id: "poison_knowledge",
          label: "Who else knows about aconitine?",
          response: "I taught Elena about it, actually. She visited my study last month — asked about poisons in literature. De Agatha Christie, she said. I showed her my reference books.",
          requires: ["poison_book"],
        },
      ],
    },
  },
  thomas: {
    id: "thomas",
    name: "Thomas Graves",
    role: "Head Butler — 40 Years of Service",
    portrait: "🧑‍🦳",
    dialogue: {
      greeting: "I've served the Ashworth family since before Marcus was born. This is a tragedy. I would never harm Lord Ashworth — though I begged him to reconsider the will.",
      topics: [
        {
          id: "alibi",
          label: "Where were you during dinner?",
          response: "Supervising service in the dining room and kitchen. I was in and out — but I never left the ground floor. Cook can confirm.",
        },
        {
          id: "will",
          label: "You knew about the will change.",
          response: "Lord Ashworth told me himself. He said Thomas, you've been loyal, but blood is blood. I was to receive a cottage and pension. Now that's void too.",
          requires: ["new_will"],
        },
        {
          id: "elena",
          label: "Did you see Elena in the kitchen?",
          response: "I did. At quarter past seven. She spoke with Cook briefly, then left through the garden door. I thought it odd — dinner was about to be served.",
          requires: ["elena_in_kitchen"],
          reveals: ["small_footprints"],
        },
        {
          id: "safe",
          label: "Who knew the safe combination?",
          response: "Only Lord Ashworth and his solicitor, Mr. Pemberton. Though... last week I saw Dr. Whitmore leaving the study with Lord Ashworth. They were discussing 'contingencies.'",
          requires: ["safe_open"],
        },
      ],
    },
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
    { id: "inheritance", label: "Secure the inheritance before the will was reversed" },
    { id: "revenge", label: "Revenge for being disinherited" },
    { id: "blackmail", label: "Silence a blackmail victim" },
    { id: "jealousy", label: "Jealous rage" },
  ],
};

/* ── State ── */

const state = {
  currentLocation: "library",
  currentSuspect: null,
  clues: new Set(),
  examined: new Set(),
  talkedTopics: new Set(),
  liesFound: new Set(),
};

/* ── DOM refs ── */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screens = {
  title: $("#screen-title"),
  game: $("#screen-game"),
  result: $("#screen-result"),
};

const panels = {
  location: $("#location-view"),
  dialogue: $("#dialogue-view"),
  journal: $("#journal-view"),
  accusation: $("#accusation-view"),
};

/* ── Helpers ── */

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function showPanel(name) {
  Object.values(panels).forEach((p) => p.classList.remove("active"));
  panels[name].classList.add("active");
}

function setStatus(msg) {
  $("#status-message").textContent = msg;
}

let toastTimer;
function showToast(msg) {
  const toast = $("#toast");
  $("#toast-text").textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

function updateClueCount() {
  const count = state.clues.size;
  $("#clue-count").textContent = `${count} clue${count !== 1 ? "s" : ""}`;
  $("#btn-accuse").disabled = count < CLUES_NEEDED_TO_ACCUSE;
}

function addClue(clue) {
  if (state.clues.has(clue.id)) return;
  state.clues.add(clue.id);
  updateClueCount();
  showToast(`Evidence found: ${clue.title}`);
  setStatus(`New evidence recorded: "${clue.title}"`);
}

/* ── Location rendering ── */

function renderLocationList() {
  const list = $("#location-list");
  list.innerHTML = "";
  Object.values(LOCATIONS).forEach((loc) => {
    const li = document.createElement("li");
    li.textContent = loc.name.replace("The ", "");
    li.dataset.id = loc.id;
    if (loc.id === state.currentLocation) li.classList.add("active");
    li.addEventListener("click", () => visitLocation(loc.id));
    list.appendChild(li);
  });
}

function renderSuspectList() {
  const list = $("#suspect-list");
  list.innerHTML = "";
  Object.values(SUSPECTS).forEach((sus) => {
    const li = document.createElement("li");
    li.textContent = sus.name.split(" ")[0];
    li.dataset.id = sus.id;
    if (sus.id === state.currentSuspect) li.classList.add("active");

    const lies = countLiesForSuspect(sus.id);
    if (lies > 0) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = `${lies} lie${lies > 1 ? "s" : ""}`;
      li.appendChild(badge);
    }

    li.addEventListener("click", () => talkToSuspect(sus.id));
    list.appendChild(li);
  });
}

function countLiesForSuspect(suspectId) {
  const suspect = SUSPECTS[suspectId];
  let count = 0;
  for (const topic of suspect.dialogue.topics) {
    if (topic.lie && state.talkedTopics.has(`${suspectId}:${topic.id}`)) {
      const exposed = topic.contradicts?.some((c) => state.clues.has(c));
      if (exposed) count++;
    }
  }
  return count;
}

function visitLocation(id) {
  state.currentLocation = id;
  state.currentSuspect = null;
  showPanel("location");
  renderLocationList();
  renderSuspectList();

  const loc = LOCATIONS[id];
  $("#location-name").textContent = loc.name;
  $("#location-desc").textContent = loc.desc;

  const container = $("#hotspots");
  container.innerHTML = "";

  loc.hotspots.forEach((hs) => {
    const key = `${id}:${hs.id}`;
    const div = document.createElement("div");
    div.className = "hotspot" + (state.examined.has(key) ? " examined" : "");
    div.innerHTML = `
      <div class="hotspot-icon">${hs.icon}</div>
      <div class="hotspot-label">${hs.label}</div>
      <div class="hotspot-hint">${hs.hint}</div>
    `;
    div.addEventListener("click", () => examineHotspot(id, hs));
    container.appendChild(div);
  });

  setStatus(`Searching: ${loc.name}`);
}

function examineHotspot(locId, hotspot) {
  const key = `${locId}:${hotspot.id}`;
  if (state.examined.has(key)) {
    showToast("You've already examined this.");
    return;
  }

  state.examined.add(key);
  addClue(hotspot.clue);
  visitLocation(locId);
}

/* ── Dialogue ── */

function talkToSuspect(id) {
  state.currentSuspect = id;
  showPanel("dialogue");
  renderLocationList();
  renderSuspectList();

  const sus = SUSPECTS[id];
  $("#suspect-name").textContent = sus.name;
  $("#suspect-role").textContent = sus.role;
  $("#suspect-portrait").textContent = sus.portrait;

  const talked = state.talkedTopics.has(`${id}:greeting`);
  $("#dialogue-text").textContent = talked
    ? `"Is there anything else, Detective?"`
    : `"${sus.dialogue.greeting}"`;

  if (!talked) state.talkedTopics.add(`${id}:greeting`);

  renderDialogueOptions(sus);
  setStatus(`Interviewing: ${sus.name}`);
}

function renderDialogueOptions(sus) {
  const container = $("#dialogue-options");
  container.innerHTML = "";

  sus.dialogue.topics.forEach((topic) => {
    const topicKey = `${sus.id}:${topic.id}`;
    const alreadyAsked = state.talkedTopics.has(topicKey);

    const btn = document.createElement("button");
    btn.className = "dialogue-option";

    const missingClues = (topic.requires || []).filter((c) => !state.clues.has(c));
    const locked = missingClues.length > 0;

    if (locked) {
      btn.disabled = true;
      btn.innerHTML = `${topic.label}<span class="lock-reason">Requires more evidence</span>`;
    } else if (alreadyAsked) {
      btn.textContent = `(Asked) ${topic.label}`;
      btn.addEventListener("click", () => {
        $("#dialogue-text").textContent = `"${topic.response}"`;
        highlightContradictions(topic, sus);
      });
    } else {
      btn.textContent = topic.label;
      btn.addEventListener("click", () => askTopic(sus, topic));
    }

    container.appendChild(btn);
  });

  const backBtn = document.createElement("button");
  backBtn.className = "dialogue-option";
  backBtn.textContent = "End interview";
  backBtn.addEventListener("click", () => {
    state.currentSuspect = null;
    showPanel("location");
    renderSuspectList();
    visitLocation(state.currentLocation);
  });
  container.appendChild(backBtn);
}

function askTopic(sus, topic) {
  const topicKey = `${sus.id}:${topic.id}`;
  state.talkedTopics.add(topicKey);

  $("#dialogue-text").textContent = `"${topic.response}"`;

  if (topic.reveals) {
    topic.reveals.forEach((clueId) => {
      if (!state.clues.has(clueId)) {
        const clue = findClueById(clueId);
        if (clue) addClue(clue);
      }
    });
  }

  highlightContradictions(topic, sus);
  renderDialogueOptions(sus);
  renderSuspectList();
}

function highlightContradictions(topic, sus) {
  if (!topic.lie || !topic.contradicts) return;

  const exposed = topic.contradicts.filter((c) => state.clues.has(c));
  if (exposed.length > 0) {
    const lieKey = `${sus.id}:${topic.id}`;
    if (!state.liesFound.has(lieKey)) {
      state.liesFound.add(lieKey);
      showToast(`${sus.name} may be lying!`);
      setStatus(`Contradiction detected in ${sus.name}'s statement.`);
    }
  }
}

function findClueById(id) {
  for (const loc of Object.values(LOCATIONS)) {
    for (const hs of loc.hotspots) {
      if (hs.clue.id === id) return hs.clue;
    }
  }
  return null;
}

/* ── Journal ── */

function renderJournal() {
  const entries = $("#journal-entries");
  const empty = $("#journal-empty");
  entries.innerHTML = "";

  if (state.clues.size === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const clueList = [];
  for (const loc of Object.values(LOCATIONS)) {
    for (const hs of loc.hotspots) {
      if (state.clues.has(hs.clue.id)) {
        clueList.push({ clue: hs.clue, location: loc.name });
      }
    }
  }

  clueList.forEach(({ clue, location }) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="clue-title">${clue.title}</div>
      <div class="clue-location">Found in: ${location}</div>
      <div>${clue.text}</div>
    `;
    entries.appendChild(li);
  });
}

/* ── Accusation ── */

function populateAccusationForm() {
  ["killer", "method", "motive"].forEach((field) => {
    const select = $(`#accuse-${field}`);
    select.innerHTML = '<option value="">— Select —</option>';
    ACCUSATION_OPTIONS[field].forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt.id;
      o.textContent = opt.label;
      select.appendChild(o);
    });
  });
}

function handleAccusation(e) {
  e.preventDefault();

  const killer = $("#accuse-killer").value;
  const method = $("#accuse-method").value;
  const motive = $("#accuse-motive").value;

  const correct =
    killer === SOLUTION.killer &&
    method === SOLUTION.method &&
    motive === SOLUTION.motive;

  showResult(correct, { killer, method, motive });
}

function showResult(won, choices) {
  showScreen("result");
  const resultScreen = screens.result;

  if (won) {
    resultScreen.classList.remove("failure");
    $("#result-icon").textContent = "⚖️";
    $("#result-title").textContent = "Case Closed";
    $("#result-text").textContent =
      "Your evidence was irrefutable. The constables have arrested the killer.";
    $("#result-reveal").innerHTML = `
      <strong>The Truth:</strong> Elena Voss poisoned her father's soup with monkshood extract
      she stole from Dr. Whitmore's pantry. She knew a second will was being drafted to
      reverse her inheritance. With Marcus, Victoria, and Thomas disinherited, she acted
      before Lord Ashworth could sign the new document.<br><br>
      Her footprints, the kitchen log, and Victoria's testimony exposed her lies.
      Justice is served.
    `;
  } else {
    resultScreen.classList.add("failure");
    $("#result-icon").textContent = "❌";
    $("#result-title").textContent = "Wrong Accusation";
    const killerName = ACCUSATION_OPTIONS.killer.find((k) => k.id === choices.killer)?.label;
    $("#result-text").textContent = `You accused ${killerName}, but the evidence tells a different story.`;
    $("#result-reveal").innerHTML = `
      <strong>What really happened:</strong> Elena Voss poisoned Lord Ashworth's soup with
      aconitine (monkshood extract) from the kitchen pantry. She needed the inheritance secured
      before he signed a reversal of the will.<br><br>
      Key evidence you may have missed: her footprints in the garden, the kitchen log placing
      her there at 7:15 PM, the missing monkshood extract, and her contradictory alibi about
      staying in the ballroom all evening.
    `;
  }
}

/* ── Reset ── */

function resetGame() {
  state.currentLocation = "library";
  state.currentSuspect = null;
  state.clues = new Set();
  state.examined = new Set();
  state.talkedTopics = new Set();
  state.liesFound = new Set();

  updateClueCount();
  showScreen("game");
  showPanel("location");
  visitLocation("library");
  setStatus("Arrived at Blackwood Manor. The storm has trapped everyone inside.");
}

/* ── Event listeners ── */

$("#btn-start").addEventListener("click", resetGame);

$("#btn-journal").addEventListener("click", () => {
  renderJournal();
  showPanel("journal");
});

$("#btn-close-journal").addEventListener("click", () => {
  showPanel(state.currentSuspect ? "dialogue" : "location");
});

$("#btn-close-dialogue").addEventListener("click", () => {
  state.currentSuspect = null;
  showPanel("location");
  renderSuspectList();
});

$("#btn-accuse").addEventListener("click", () => {
  if (state.clues.size < CLUES_NEEDED_TO_ACCUSE) return;
  populateAccusationForm();
  showPanel("accusation");
});

$("#btn-cancel-accuse").addEventListener("click", () => {
  showPanel("location");
});

$("#accusation-form").addEventListener("submit", handleAccusation);

$("#btn-replay").addEventListener("click", () => {
  screens.result.classList.remove("failure");
  resetGame();
});

/* ── Init ── */

updateClueCount();
