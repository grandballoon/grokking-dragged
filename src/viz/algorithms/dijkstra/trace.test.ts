import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import type { Edges } from "../weightedGraph/graph";
import { INITIAL_INPUT, run, SRC } from "./trace";

const at = (line: number) => lineText(SRC, line).trim();

describe("Dijkstra's algorithm port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("prints what the Python prints", () => {
    expect(last.vars.stdout).toEqual([
      "Cost from the start to each node:",
      "{'a': 5, 'b': 2, 'fin': 6}",
    ]);
    expect(at(last.line)).toBe("print(costs)");
  });

  it("ends with the same parents and processing order as the Python", () => {
    expect(last.vars.parents).toEqual({ a: "b", b: "start", fin: "a" });
    expect(last.vars.processed).toEqual(["b", "a", "fin"]);
  });

  it("seeds costs and parents from start's edges, as the script hard-codes them", () => {
    const seeded = frames.find((f) => at(f.line) === "processed = []")!;
    expect(seeded.vars.costs).toEqual({ a: 6, b: 2, fin: Infinity });
    expect(seeded.vars.parents).toEqual({ a: "start", b: "start", fin: null });
  });

  it("calls find_lowest_cost_node with its own locals, shadowing node and cost", () => {
    const firstReturn = frames.find((f) => at(f.line) === "return lowest_cost_node")!;
    expect(firstReturn.vars.call).toEqual({
      lowest_cost: 2,
      lowest_cost_node: "b",
      node: "fin",
      cost: Infinity,
    });
    expect(firstReturn.vars.node).toBeNull();
    const assigned = frames[frames.indexOf(firstReturn) + 1]!;
    expect(assigned.vars.call).toBeNull();
    expect(assigned.vars.node).toBe("b");
  });

  it("updates a through b", () => {
    const update = frames.find(
      (f) => at(f.line) === "parents[n] = node" && f.vars.n === "a",
    )!;
    expect(update.vars.costs["a"]).toBe(5);
    expect(update.vars.node).toBe("b");
  });

  // Expected values from running the script's loop on these graphs in Python.
  it("matches Python on an edited graph", () => {
    const edges: Edges = [
      { id: "1", from: "start", to: "a", weight: 9 },
      { id: "2", from: "start", to: "fin", weight: 9 },
      { id: "3", from: "a", to: "b", weight: 0 },
      { id: "4", from: "b", to: "a", weight: 1 },
      { id: "5", from: "fin", to: "b", weight: 0 },
      { id: "6", from: "fin", to: "a", weight: 2 },
    ];
    const end = run({ edges }).at(-1)!;
    expect(end.vars.stdout[1]).toBe("{'a': 9, 'b': 9, 'fin': 9}");
    expect(end.vars.parents).toEqual({ a: "start", b: "a", fin: "start" });
    expect(end.vars.processed).toEqual(["a", "b", "fin"]);
  });

  it("leaves unreachable nodes at inf", () => {
    const edges: Edges = [
      { id: "1", from: "start", to: "a", weight: 4 },
      { id: "2", from: "b", to: "fin", weight: 1 },
    ];
    const end = run({ edges }).at(-1)!;
    expect(end.vars.stdout[1]).toBe("{'a': 4, 'b': inf, 'fin': inf}");
    expect(end.vars.processed).toEqual(["a"]);
  });
});
