import { describe, expect, it } from "vitest";
import { STATUS_WEIGHT, statusOf } from "../pipeline/score";
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
