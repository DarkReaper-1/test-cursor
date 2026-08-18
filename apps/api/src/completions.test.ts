import { describe, expect, it } from "vitest";
import { POST as preview } from "../app/api/v1/rewards/preview/route";
import { POST as complete } from "../app/api/v1/completions/route";

describe("API authorization", () => {
  it("does not persist completions without a session", async () => {
    const response = await complete();
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("preview never sets granted true even if the client sends xp", async () => {
    const response = await preview(
      new Request("http://helix.local/api/v1/rewards/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activityType: "workout", xp: 99999 }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { granted: boolean; xp: number };
    expect(body.granted).toBe(false);
    expect(body.xp).toBeLessThan(400);
  });
});
