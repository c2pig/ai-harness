import { describe, expect, it } from "vitest";
import { buildFixtureEntityId } from "./identity.js";

describe("buildFixtureEntityId", () => {
  it("maps fixture contact IDs with domain suffix", () => {
    expect(buildFixtureEntityId(5001, "legacy")).toBe("user-5001-legacy");
    expect(buildFixtureEntityId(5001, "journey")).toBe("user-5001-journey");
    expect(buildFixtureEntityId(5002, "legacy")).toBe("user-5002-legacy");
    expect(buildFixtureEntityId(5003, "journey")).toBe("user-5003-journey");
  });

  it("returns undefined for unknown contacts", () => {
    expect(buildFixtureEntityId(9999, "legacy")).toBeUndefined();
  });
});
