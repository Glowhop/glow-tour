import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

describe("styles package", () => {
  test("exports the default CSS stylesheet", async () => {
    const packageJson = JSON.parse(await readFile("packages/styles/package.json", "utf8")) as {
      exports: Record<string, string>;
      name: string;
    };
    const css = await readFile("packages/styles/default.css", "utf8");

    assert.equal(packageJson.name, "@glowhop/styles-tour");
    assert.equal(packageJson.exports["./default.css"], "./default.css");
    assert.match(css, /\[data-glow-tour-popover\]/);
    assert.match(css, /\[data-glow-tour-overlay\]/);
    assert.match(css, /--glow-tour-animation-duration/);
  });
});
