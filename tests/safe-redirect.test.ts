import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it("allows same-site paths with query and hash", () => {
    expect(safeRedirect("/dashboard/abc?tab=1#x")).toBe("/dashboard/abc?tab=1#x");
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "", "/\u0000x", 42, null])("rejects %s", (value) => {
    expect(safeRedirect(value, "/home")).toBe("/home");
  });
});
