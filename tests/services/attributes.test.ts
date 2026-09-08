import { describe, expect, it } from "vitest";
import { applyAttributeDeltas, attributeDeltas } from "@/server/services/attributes";
import { BASELINE_ATTRIBUTE } from "@/lib/constants/attributes";

describe("attributes", () => {
  it("maps movement types and always grants vitality and discipline", () => {
    const deltas = attributeDeltas(["push", "locomotion"]);
    expect(deltas.strength).toBeGreaterThan(0);
    expect(deltas.agility).toBeGreaterThan(0);
    expect(deltas.vitality).toBe(1);
    expect(deltas.discipline).toBe(1);
  });

  it("applies deltas onto a snapshot without UI math", () => {
    const next = applyAttributeDeltas(
      {
        strength: BASELINE_ATTRIBUTE,
        endurance: BASELINE_ATTRIBUTE,
        agility: BASELINE_ATTRIBUTE,
        vitality: BASELINE_ATTRIBUTE,
        discipline: BASELINE_ATTRIBUTE,
      },
      { strength: 2 },
    );
    expect(next.strength).toBe(12);
    expect(next.endurance).toBe(10);
  });
});
