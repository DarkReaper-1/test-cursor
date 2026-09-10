import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { uniqueConstraintFields, AuthError } from "@/server/services/identity";
import { fromUnknown } from "@/server/http/errors";
import { ZodError } from "zod";
import { PLAYTEST_OPERATOR } from "@/lib/constants/playtest";

describe("uniqueConstraintFields", () => {
  it("only treats Prisma P2002 username as taken, not any error that mentions username", () => {
    const generic = new Error(
      "Invalid prisma.player.create() invocation: { username: \"tester\", timezone: \"UTC\" }",
    );
    expect(uniqueConstraintFields(generic)).toEqual([]);

    const taken = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.19.3",
      meta: { target: ["username"] },
    });
    expect(uniqueConstraintFields(taken)).toEqual(["username"]);
  });
});

describe("auth validation copy", () => {
  it("explains a missing database instead of a generic 500", async () => {
    const response = fromUnknown(new Error("Can't reach database server at `127.0.0.1:5432`"));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.error).toBe("DATABASE");
  });

  it("explains callsign rules instead of a generic contract error", async () => {
    const response = fromUnknown(
      new ZodError([
        {
          code: "too_small",
          minimum: 3,
          type: "string",
          inclusive: true,
          exact: false,
          message: "Too small",
          path: ["username"],
        },
      ]),
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("INVALID_CALLSIGN");
    expect(String(body.message)).toMatch(/underscores/i);
  });
});

describe("playtest operator", () => {
  it("keeps a disposable file in source until launch", () => {
    expect(PLAYTEST_OPERATOR.username).toBe("tester");
    expect(PLAYTEST_OPERATOR.email).toBe("tester@system.test");
    expect(PLAYTEST_OPERATOR.password.length).toBeGreaterThanOrEqual(8);
  });
});

describe("AuthError", () => {
  it("carries a stable code", () => {
    const err = new AuthError("USERNAME_TAKEN", "That callsign is taken.");
    expect(err.code).toBe("USERNAME_TAKEN");
  });
});
