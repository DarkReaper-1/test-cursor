import { describe, expect, it } from "vitest";
import { isPostgresUrl, resolveDatabaseUrl } from "@/lib/runtime-env";

describe("resolveDatabaseUrl", () => {
  it("ignores leftover Postgres URLs", () => {
    process.env.DATABASE_URL = "postgresql://system:system@127.0.0.1:5432/system";
    expect(isPostgresUrl(process.env.DATABASE_URL)).toBe(true);
    expect(resolveDatabaseUrl()).toBe("file:./dev.db");
  });

  it("keeps an explicit sqlite file URL", () => {
    process.env.DATABASE_URL = "file:./test.db";
    expect(resolveDatabaseUrl()).toBe("file:./test.db");
  });
});
