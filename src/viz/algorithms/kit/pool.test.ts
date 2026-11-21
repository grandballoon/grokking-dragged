import { describe, expect, it } from "vitest";
import { mapItems, pool, poolMoves, SPARE, USED } from "./pool";

const items = pool(["a", "b"], ["c"], (name, id) => ({ id, name }));
const names = (p: typeof items) => ({
  used: p[USED]!.map((i) => i.name),
  spare: p[SPARE]!.map((i) => i.name),
});

describe("pool", () => {
  it("numbers ids across both lists", () => {
    expect(items[USED]!.map((i) => i.id)).toEqual(["i0", "i1"]);
    expect(items[SPARE]!.map((i) => i.id)).toEqual(["i2"]);
  });

  it("offers every reorder and every drop into the other list", () => {
    const moves = poolMoves(items, { key: USED, index: 0 }, {}).map(names);
    expect(moves).toEqual([
      { used: ["a", "b"], spare: ["c"] },
      { used: ["b", "a"], spare: ["c"] },
      { used: ["b"], spare: ["a", "c"] },
      { used: ["b"], spare: ["c", "a"] },
    ]);
  });

  it("respects a list's capacity", () => {
    const moves = poolMoves(items, { key: SPARE, index: 0 }, { [USED]: 2 }).map(names);
    expect(moves).toEqual([{ used: ["a", "b"], spare: ["c"] }]);
  });

  it("updates items without touching the original", () => {
    const upper = (i: { id: string; name: string }) => ({
      ...i,
      name: i.name.toUpperCase(),
    });
    expect(names(mapItems(items, upper))).toEqual({ used: ["A", "B"], spare: ["C"] });
    expect(names(items).used).toEqual(["a", "b"]);
  });
});
