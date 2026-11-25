import { describe, expect, it } from "vitest";
import type { IndexItem } from "../pipeline/types";
import {
  DEFAULT_FILTER,
  filterItems,
  PAGE_SIZE,
  pageCount,
  pageItems,
  sortItems,
  topOfDefaultView,
  type FilterState,
} from "../web/src/filter";

const LABELS = ["topic:2d", "topic:editor", "topic:gui"];

function item(n: number, overrides: Partial<IndexItem> = {}): IndexItem {
  return { n, t: `Proposal ${n}`, u: 0, d: 0, c: 0, l: [], st: "open", f: "likely", s: 0, a: false, m: null, up: "2024-01-01", ...overrides };
}

const ITEMS: IndexItem[] = [
  item(1, { t: "Add Terrain node", u: 10, s: 3, l: [0], st: "archived", c: 2, up: "2023-05-01" }),
  item(2, { t: "Editor dock tweaks", u: 5, s: 3, l: [1, 2], f: "unclear", c: 9, up: "2025-02-02" }),
  item(3, { t: "GUI theme", u: 50, s: 1, l: [2], f: "hard", up: "2024-07-07" }),
  item(4, { t: "terrain brushes", u: 1, s: 5, f: "noanswer", st: "archived", up: "2025-02-02" }),
];

const state = (overrides: Partial<FilterState>): FilterState => ({ ...DEFAULT_FILTER, f: [], ...overrides });
const numbers = (items: IndexItem[]) => items.map((i) => i.n);

describe("filterItems (SPEC 9)", () => {
  it("has no filter when every field is empty", () => {
    expect(numbers(filterItems(ITEMS, LABELS, state({})))).toEqual([1, 2, 3, 4]);
  });

  it("searches titles case-insensitively", () => {
    expect(numbers(filterItems(ITEMS, LABELS, state({ q: "  TERRAIN " })))).toEqual([1, 4]);
  });

  it("filters feasibility and status with OR inside each", () => {
    expect(numbers(filterItems(ITEMS, LABELS, state({ f: ["likely", "hard"] })))).toEqual([1, 3]);
    expect(numbers(filterItems(ITEMS, LABELS, state({ st: ["archived"] })))).toEqual([1, 4]);
  });

  it("filters labels by name with OR", () => {
    expect(numbers(filterItems(ITEMS, LABELS, state({ lb: ["topic:2d", "topic:gui"] })))).toEqual([1, 2, 3]);
    expect(numbers(filterItems(ITEMS, LABELS, state({ lb: ["topic:unknown"] })))).toEqual([]);
  });

  it("keeps items with at least min up votes", () => {
    expect(numbers(filterItems(ITEMS, LABELS, state({ min: 10 })))).toEqual([1, 3]);
  });

  it("combines different filters with AND", () => {
    expect(numbers(filterItems(ITEMS, LABELS, state({ q: "terrain", st: ["archived"], f: ["noanswer"] })))).toEqual([4]);
  });

  it("defaults to likely only", () => {
    expect(numbers(filterItems(ITEMS, LABELS, DEFAULT_FILTER))).toEqual([1]);
  });
});

describe("sortItems", () => {
  it("sorts each key descending with ties by number ascending", () => {
    expect(numbers(sortItems(ITEMS, "score"))).toEqual([4, 1, 2, 3]);
    expect(numbers(sortItems(ITEMS, "votes"))).toEqual([3, 1, 2, 4]);
    expect(numbers(sortItems(ITEMS, "updated"))).toEqual([2, 4, 3, 1]);
    expect(numbers(sortItems(ITEMS, "comments"))).toEqual([2, 1, 3, 4]);
  });

  it("does not change the input", () => {
    const copy = [...ITEMS];
    sortItems(ITEMS, "votes");
    expect(ITEMS).toEqual(copy);
  });
});

describe("pages", () => {
  const many = Array.from({ length: 120 }, (_, i) => item(i + 1));

  it(`shows ${PAGE_SIZE} rows per page and clamps the page number`, () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(120)).toBe(3);
    expect(pageItems(many, 1).items).toHaveLength(50);
    expect(pageItems(many, 3)).toMatchObject({ page: 3, pages: 3 });
    expect(pageItems(many, 3).items).toHaveLength(20);
    expect(pageItems(many, 9).page).toBe(3);
    expect(pageItems(many, 0).page).toBe(1);
    expect(pageItems([], 5)).toEqual({ items: [], page: 1, pages: 1 });
  });
});

describe("topOfDefaultView", () => {
  it("takes the top n likely items by score, ties by number", () => {
    const items = [
      item(10, { s: 2 }),
      item(5, { s: 2 }),
      item(7, { s: 9, f: "unclear" }),
      item(8, { s: 4, st: "archived" }),
      item(9, { s: 1 }),
    ];
    expect(numbers(topOfDefaultView(items, [], 3))).toEqual([8, 5, 10]);
  });
});
