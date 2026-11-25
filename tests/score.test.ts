import { describe, expect, it } from "vitest";
import { ADDON_WEIGHT, roundScore, scoreOf, STATUS_WEIGHT, statusOf } from "../pipeline/score";
import type { RawProposal } from "../pipeline/types";

type StatusInput = Pick<RawProposal, "state" | "stateReason" | "labels">;
const closed = (stateReason: RawProposal["stateReason"], labels: string[] = []): StatusInput => ({
  state: "CLOSED",
  stateReason,
  labels,
});

describe("statusOf (SPEC 7, every row of the table)", () => {
  it("CLOSED + DUPLICATE is dup, even with the archived label", () => {
    expect(statusOf(closed("DUPLICATE"))).toBe("dup");
    expect(statusOf(closed("DUPLICATE", ["archived"]))).toBe("dup");
  });

  it("CLOSED + archived label is archived, whatever the close reason", () => {
    expect(statusOf(closed("COMPLETED", ["archived"]))).toBe("archived");
    expect(statusOf(closed("NOT_PLANNED", ["archived"]))).toBe("archived");
    expect(statusOf(closed(null, ["topic:editor", "archived"]))).toBe("archived");
  });

  it("compares the archived label case-insensitively", () => {
    expect(statusOf(closed("COMPLETED", ["Archived"]))).toBe("archived");
  });

  it("any other CLOSED is done, including NOT_PLANNED without the label", () => {
    expect(statusOf(closed("COMPLETED"))).toBe("done");
    expect(statusOf(closed("NOT_PLANNED"))).toBe("done");
    expect(statusOf(closed(null, ["topic:core"]))).toBe("done");
  });

  it("OPEN is open, even with the archived label or a REOPENED reason", () => {
    expect(statusOf({ state: "OPEN", stateReason: null, labels: [] })).toBe("open");
    expect(statusOf({ state: "OPEN", stateReason: "REOPENED", labels: ["archived"] })).toBe("open");
  });
});

describe("STATUS_WEIGHT", () => {
  it("matches the wStatus column", () => {
    expect(STATUS_WEIGHT).toEqual({ dup: 0, archived: 1.0, done: 0, open: 0.7 });
  });
});

describe("ADDON_WEIGHT", () => {
  it("matches the wAddon row", () => {
    expect(ADDON_WEIGHT).toEqual({ likely: 1.0, unclear: 0.5, noanswer: 0.5, hard: 0.1 });
  });
});

describe("scoreOf (SPEC 7: log2(1 + max(0, up - down)) × wAddon × wStatus)", () => {
  const votes = (up: number, down = 0) => ({ up, down });

  it("uses every wAddon value", () => {
    // log2(1 + 7) = 3, archived wStatus 1.0
    expect(scoreOf(votes(7), "likely", "archived")).toBe(3);
    expect(scoreOf(votes(7), "unclear", "archived")).toBe(1.5);
    expect(scoreOf(votes(7), "noanswer", "archived")).toBe(1.5);
    expect(scoreOf(votes(7), "hard", "archived")).toBe(0.3);
  });

  it("uses every wStatus value", () => {
    expect(scoreOf(votes(7), "likely", "open")).toBe(2.1);
    expect(scoreOf(votes(7), "likely", "done")).toBe(0);
    expect(scoreOf(votes(7), "likely", "dup")).toBe(0);
  });

  it("subtracts down votes and never goes below zero", () => {
    expect(scoreOf(votes(10, 3), "likely", "archived")).toBe(3);
    expect(scoreOf(votes(2, 9), "likely", "archived")).toBe(0);
    expect(scoreOf(votes(0), "likely", "archived")).toBe(0);
  });

  it("rounds to two decimals", () => {
    // log2(1 + 10) = 3.4594… → 3.46, × 0.7 = 2.4216… → 2.42
    expect(scoreOf(votes(10), "likely", "archived")).toBe(3.46);
    expect(scoreOf(votes(10), "likely", "open")).toBe(2.42);
  });
});

describe("roundScore", () => {
  it("rounds half up at the second decimal, including binary edge cases", () => {
    expect(roundScore(3.456)).toBe(3.46);
    expect(roundScore(3.454)).toBe(3.45);
    expect(roundScore(1.005)).toBe(1.01);
    expect(roundScore(0)).toBe(0);
  });
});
