import { describe, expect, it } from "vitest";
import { resolveUserId } from "./identity.js";

describe("resolveUserId", () => {
  it("maps fixture contact IDs", () => {
    expect(resolveUserId(5001)).toBe("user-5001");
    expect(resolveUserId(5002)).toBe("user-5002");
    expect(resolveUserId(5003)).toBe("user-5003");
  });

  it("returns undefined for unknown contacts", () => {
    expect(resolveUserId(9999)).toBeUndefined();
  });
});
