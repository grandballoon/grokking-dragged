import { describe, expect, it } from "vitest";
import { BOOK_EDGES, rewirings, toGraph, toGraphOrder, withWeight } from "./graph";

describe("weighted graph input", () => {
  it("builds the book's dict of dicts in insertion order", () => {
    const graph = toGraph(BOOK_EDGES);
    expect(graph).toEqual({
      start: { a: 6, b: 2 },
      a: { fin: 1 },
      b: { a: 3, fin: 5 },
      fin: {},
    });
    expect(Object.keys(graph["b"]!)).toEqual(["a", "fin"]);
  });

  it("changes one weight", () => {
    expect(toGraph(withWeight(BOOK_EDGES, "b-a", 9))["b"]).toEqual({ a: 9, fin: 5 });
  });

  it("renames a rewired target in place", () => {
    const targets = rewirings(BOOK_EDGES, "b-fin", "to", () => true);
    // b -> start is new; b -> a is taken and b -> b is a loop.
    expect(targets.map((edges) => Object.keys(toGraph(edges)["b"]!))).toEqual([
      ["a", "fin"],
      ["a", "start"],
    ]);
  });

  it("appends an edge whose source moves, as a fresh assignment would", () => {
    // a -> a would be a loop and b -> a is taken, so only fin -> a is new.
    const sources = rewirings(BOOK_EDGES, "start-a", "from", () => true);
    expect(sources).toHaveLength(2);
    const moved = sources[1]!;
    expect(toGraph(moved)).toEqual({
      start: { b: 2 },
      a: { fin: 1 },
      b: { a: 3, fin: 5 },
      fin: { a: 6 },
    });
    expect(moved.at(-1)!.id).toBe("start-a");
    expect(toGraphOrder(moved).map((e) => e.id)).toEqual([
      "start-b",
      "a-fin",
      "b-a",
      "b-fin",
      "start-a",
    ]);
  });

  it("respects the accepts rule", () => {
    const noStart = rewirings(BOOK_EDGES, "b-fin", "to", (_f, to) => to !== "start");
    expect(noStart).toEqual([BOOK_EDGES]);
  });
});
