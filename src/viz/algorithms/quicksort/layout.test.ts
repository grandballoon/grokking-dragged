import { describe, expect, it } from "vitest";
import { centerSlot, placeCalls } from "./layout";
import { BOOK_ARRAY, run } from "./trace";

describe("quicksort tree layout", () => {
  const calls = run(BOOK_ARRAY).at(-1)!.vars.finished;
  const places = placeCalls(calls);

  it("gives each call the final positions of its elements", () => {
    // sorted: [2, 3, 5, 10]; 10 is the root's pivot at position 3.
    expect(places.get("q")).toEqual({ depth: 0, lo: 0, hi: 4, side: "root" });
    expect(places.get("ql")).toEqual({ depth: 1, lo: 0, hi: 3, side: "less" });
    expect(places.get("qg")).toEqual({ depth: 1, lo: 4, hi: 4, side: "greater" });
    expect(places.get("qllg")).toEqual({ depth: 3, lo: 1, hi: 2, side: "greater" });
  });

  it("hangs empty calls inside their caller's pivot slot", () => {
    expect(centerSlot(places.get("qg")!)).toBe(3.75);
    expect(centerSlot(places.get("qlll")!)).toBe(0.25);
  });

  it("never overlaps two calls at the same depth", () => {
    const inputs = [
      BOOK_ARRAY,
      [1, 2, 3, 4, 5, 6],
      [6, 5, 4, 3, 2, 1],
      [3, 3, 3, 1],
      [4, 9, 1, 7, 2, 8],
    ];
    for (const input of inputs) {
      const placed = [...placeCalls(run(input).at(-1)!.vars.finished).values()];
      const spans = placed.map((p) => ({
        depth: p.depth,
        from: p.hi > p.lo ? p.lo : centerSlot(p) - 0.2,
        to: p.hi > p.lo ? p.hi : centerSlot(p) + 0.2,
      }));
      for (const a of spans)
        for (const b of spans)
          if (a !== b && a.depth === b.depth)
            expect(a.to <= b.from || b.to <= a.from).toBe(true);
    }
  });
});
