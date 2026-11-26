import { describe, expect, it } from "vitest";
import { labelName, localDay } from "../web/src/labels";

describe("localDay", () => {
  // 첫 배포 때의 실제 수집 시각. UTC로는 25일, 한국 시간으로는 26일 오전이다.
  const SYNCED = "2026-11-25T23:48:12.119Z";

  it("gives the calendar day in the given time zone", () => {
    expect(localDay(SYNCED, "UTC")).toBe("2026-11-25");
    expect(localDay(SYNCED, "Asia/Seoul")).toBe("2026-11-26");
    expect(localDay(SYNCED, "America/Los_Angeles")).toBe("2026-11-25");
  });

  it("zero-pads month and day and handles year boundaries", () => {
    expect(localDay("2026-01-05T00:30:00Z", "UTC")).toBe("2026-01-05");
    expect(localDay("2026-12-31T20:00:00Z", "Asia/Seoul")).toBe("2027-01-01");
  });

  it("returns null for a missing or invalid time", () => {
    expect(localDay(null)).toBeNull();
    expect(localDay("not a date", "UTC")).toBeNull();
  });

  it("uses the environment's time zone when none is given", () => {
    expect(localDay(SYNCED)).toMatch(/^2026-11-2[56]$/);
  });
});

describe("labelName", () => {
  it("drops the topic: prefix", () => {
    expect(labelName("topic:editor")).toBe("editor");
    expect(labelName("usability")).toBe("usability");
  });
});
