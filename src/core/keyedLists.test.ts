import { describe, expect, it } from "vitest";
import { moveItem, moveTargets } from "./keyedLists";

const lists = { a: ["x", "y"], b: ["z"], c: [] as string[] };

describe("keyedLists", () => {
  it("moves within a list", () => {
    expect(moveItem(lists, { key: "a", index: 0 }, { key: "a", index: 1 })).toEqual({
      a: ["y", "x"],
      b: ["z"],
      c: [],
    });
  });

  it("moves between lists without touching the original", () => {
    expect(moveItem(lists, { key: "a", index: 1 }, { key: "c", index: 0 })).toEqual({
      a: ["x"],
      b: ["z"],
      c: ["y"],
    });
    expect(lists.a).toEqual(["x", "y"]);
  });

  it("keeps key order, as a Python dict would", () => {
    const moved = moveItem(lists, { key: "b", index: 0 }, { key: "a", index: 2 });
    expect(Object.keys(moved)).toEqual(["a", "b", "c"]);
  });

  it("rejects bad slots", () => {
    expect(() =>
      moveItem(lists, { key: "c", index: 0 }, { key: "a", index: 0 }),
    ).toThrow();
    expect(() =>
      moveItem(lists, { key: "a", index: 0 }, { key: "b", index: 5 }),
    ).toThrow();
  });

  it("lists every slot in its own list and in accepting lists", () => {
    const targets = moveTargets(lists, { key: "a", index: 0 }, (key) => key !== "b");
    expect(targets).toEqual([
      { key: "a", index: 0 },
      { key: "a", index: 1 },
      { key: "c", index: 0 },
    ]);
  });
});
