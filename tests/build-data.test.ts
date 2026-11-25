import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildData, buildIndex } from "../pipeline/build-data";
import { toDataJson, toWebJson, writeIfChanged } from "../pipeline/io";

const NOW = "2026-11-25T00:00:00.000Z";

const tempDirs: string[] = [];
function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "panner-test-"));
  tempDirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function paths(root: string) {
  return {
    rawDir: join(root, "data", "raw"),
    statePath: join(root, "data", "state.json"),
    outDir: join(root, "web", "public", "data"),
  };
}

describe("io", () => {
  it("sorts keys recursively and keeps array order", () => {
    expect(toWebJson({ b: 1, a: { d: [3, 1], c: null } })).toBe('{"a":{"c":null,"d":[3,1]},"b":1}');
  });

  it("formats data JSON with 2-space indent and one trailing newline", () => {
    expect(toDataJson({ b: 1, a: 2 })).toBe('{\n  "a": 2,\n  "b": 1\n}\n');
  });

  it("writes only when the content changes", () => {
    const file = join(makeTempDir(), "nested", "a.json");
    expect(writeIfChanged(file, "1")).toBe(true);
    expect(writeIfChanged(file, "1")).toBe(false);
    expect(writeIfChanged(file, "2")).toBe(true);
    expect(readFileSync(file, "utf8")).toBe("2");
  });
});

describe("build-data (T1 minimum)", () => {
  it("builds an empty index", () => {
    expect(buildIndex({ rawCount: 0, lastSyncedAt: null, now: NOW })).toEqual({
      meta: { builtAt: NOW, lastSyncedAt: null, total: 0, included: 0 },
      labels: [],
      items: [],
    });
  });

  it("writes items: [] without indentation when data/raw does not exist", () => {
    const p = paths(makeTempDir());
    buildData({ ...p, now: NOW });
    const written = readFileSync(join(p.outDir, "index.json"), "utf8");
    expect(written).toBe(
      '{"items":[],"labels":[],"meta":{"builtAt":"2026-11-25T00:00:00.000Z","included":0,"lastSyncedAt":null,"total":0}}',
    );
  });

  it("writes items: [] when data/raw is empty and reads lastSyncedAt from state.json", () => {
    const p = paths(makeTempDir());
    mkdirSync(p.rawDir, { recursive: true });
    writeFileSync(p.statePath, toDataJson({ schemaVersion: 2, lastSyncedAt: "2026-11-23T18:17:00Z", total: 0 }));
    const { index } = buildData({ ...p, now: NOW });
    expect(index.items).toEqual([]);
    expect(index.meta.lastSyncedAt).toBe("2026-11-23T18:17:00Z");
  });

  it("produces the same bytes for the same input", () => {
    const a = paths(makeTempDir());
    const b = paths(makeTempDir());
    buildData({ ...a, now: NOW });
    buildData({ ...b, now: NOW });
    expect(readFileSync(join(a.outDir, "index.json"))).toEqual(readFileSync(join(b.outDir, "index.json")));
  });
});
