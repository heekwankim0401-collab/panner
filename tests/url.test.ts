import { describe, expect, it } from "vitest";
import { applyChange, DEFAULT_FILTER, normalizeFilter, type FilterState } from "../web/src/filter";
import { fromQuery, toQuery } from "../web/src/url";

const state = (change: Partial<FilterState>): FilterState => ({ ...DEFAULT_FILTER, f: [...DEFAULT_FILTER.f], ...change });

describe("toQuery (SPEC 9)", () => {
  it("is empty for the default view", () => {
    expect(toQuery(DEFAULT_FILTER)).toBe("");
  });

  it("omits values equal to the default", () => {
    expect(toQuery(state({ sort: "score", p: 1, min: 0, q: "  " }))).toBe("");
  });

  it("writes f=all when feasibility has no filter", () => {
    expect(toQuery(state({ f: [] }))).toBe("?f=all");
    expect(toQuery(state({ f: ["noanswer", "unclear", "hard", "likely"] }))).toBe("?f=all"); // 전부 = 필터 없음
  });

  it("joins multiple values with commas in a fixed order", () => {
    expect(toQuery(state({ f: ["unclear", "likely"], st: ["archived"] }))).toBe("?f=likely,unclear&st=archived");
    expect(toQuery(state({ st: ["archived", "open"] }))).toBe(""); // 상태 둘 다 = 상태 전체
  });

  it("uses label names and escapes commas inside them", () => {
    expect(toQuery(state({ lb: ["topic:gui", "topic:editor", "a,b"] }))).toBe("?lb=a%2Cb,topic%3Aeditor,topic%3Agui");
  });

  it("writes every key", () => {
    expect(toQuery(state({ q: "terrain node", f: ["hard"], st: ["open"], lb: ["topic:2d"], min: 5, sort: "votes", p: 3 }))).toBe(
      "?q=terrain%20node&f=hard&st=open&lb=topic%3A2d&min=5&sort=votes&p=3",
    );
  });
});

describe("fromQuery", () => {
  it("reads the default view from an empty query", () => {
    expect(fromQuery("")).toEqual(DEFAULT_FILTER);
    expect(fromQuery("?")).toEqual(DEFAULT_FILTER);
  });

  it("reads f=all, comma lists and label names", () => {
    expect(fromQuery("?f=all")).toMatchObject({ f: [] });
    expect(fromQuery("?f=unclear,likely&st=archived&lb=topic%3Agui,a%2Cb")).toMatchObject({
      f: ["likely", "unclear"],
      st: ["archived"],
      lb: ["a,b", "topic:gui"],
    });
  });

  it("reads + as a space and keeps the search text as typed", () => {
    expect(fromQuery("?q=Terrain+Node").q).toBe("Terrain Node");
  });

  it("ignores unknown keys and bad values", () => {
    expect(fromQuery("?f=bogus&st=closed&min=-3&sort=random&p=0&p=x&zzz=1")).toEqual(DEFAULT_FILTER);
    expect(fromQuery("?min=abc&p=2.5")).toEqual(DEFAULT_FILTER);
    expect(fromQuery("?q=%E0%A4%A")).toMatchObject({ q: "%E0%A4%A" }); // 깨진 인코딩은 그대로
  });

  it("keeps the first value when a key repeats", () => {
    expect(fromQuery("?sort=votes&sort=comments").sort).toBe("votes");
  });
});

describe("round trip", () => {
  const cases: Array<Partial<FilterState>> = [
    {},
    { f: [] },
    { q: "smooth camera, pixel", f: ["likely", "hard"], st: ["open"], lb: ["topic:rendering", "x,y"], min: 12, sort: "updated", p: 4 },
    { sort: "comments" },
    { st: ["archived"], p: 2 },
  ];
  for (const change of cases) {
    it(JSON.stringify(change), () => {
      const s = normalizeFilter(state(change));
      expect(fromQuery(toQuery(s))).toEqual(s);
      expect(toQuery(fromQuery(toQuery(s)))).toBe(toQuery(s));
    });
  }
});

describe("applyChange", () => {
  it("goes back to page 1 when a filter or the sort changes", () => {
    const onPage3 = state({ p: 3 });
    expect(applyChange(onPage3, { q: "x" }).p).toBe(1);
    expect(applyChange(onPage3, { sort: "votes" }).p).toBe(1);
    expect(applyChange(onPage3, { lb: ["topic:gui"] }).p).toBe(1);
  });

  it("keeps the new page when only the page changes", () => {
    expect(applyChange(state({ p: 3 }), { p: 4 }).p).toBe(4);
  });

  it("normalizes the result", () => {
    expect(applyChange(DEFAULT_FILTER, { f: ["likely", "unclear", "hard", "noanswer"], min: 2.7 })).toMatchObject({ f: [], min: 2 });
  });
});
