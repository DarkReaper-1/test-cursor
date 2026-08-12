import { ordinal, seeded, defaultSave, SKINS, CITIES, BASE_SPEED, BOOST_SPEED } from "./config.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(ordinal(1) === "1ST", "1ST");
assert(ordinal(2) === "2ND", "2ND");
assert(ordinal(3) === "3RD", "3RD");
assert(ordinal(4) === "4TH", "4TH");
assert(ordinal(11) === "11TH", "11TH");
assert(ordinal(12) === "12TH", "12TH");
assert(ordinal(21) === "21ST", "21ST");

const rng = seeded(1);
const a = rng();
const b = rng();
assert(a !== b, "rng advances");
assert(seeded(1)() === a, "rng is deterministic");

const save = defaultSave();
assert(save.skin === "blaze", "default skin");
assert(save.coins === 0, "default coins");
assert(SKINS[0].price === 0, "starter skin free");
assert(CITIES.length === 4, "four cities");
assert(CITIES.every((c) => c.sky && c.name), "city fields");
assert(BASE_SPEED === 17, "cruise speed");
assert(BOOST_SPEED === 8, "pad burst");

console.log("config tests passed");
