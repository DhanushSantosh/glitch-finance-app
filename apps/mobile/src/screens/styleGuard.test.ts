import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HEX_COLOR_PATTERN = /#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/g;

const getScreenFiles = (): string[] => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return readdirSync(currentDir)
    .filter((name) => name.endsWith("Screen.tsx"))
    .map((name) => join(currentDir, name));
};

describe("screen style guard", () => {
  it("does not use raw hex colors inside screen files", () => {
    const screenFiles = getScreenFiles();

    for (const filePath of screenFiles) {
      const source = readFileSync(filePath, "utf8");
      const matches = source.match(HEX_COLOR_PATTERN);
      expect(matches, `Raw hex colors found in ${filePath}: ${matches?.join(", ")}`).toBeNull();
    }
  });
});
