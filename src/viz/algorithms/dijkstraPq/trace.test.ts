import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import type { Edges } from "../weightedGraph/graph";
import { INITIAL_INPUT, run, SRC, type Input } from "./trace";

const HEAP_LINES = [
  "current_distance, current_vertex = heapq.heappop(pq)",
  "heapq.heappush(pq, (distance, neighbor))",
];

/** `pq` after every heappop and heappush, in order. */
function pqLog(input: Input) {
  return run(input)
    .filter((f) => HEAP_LINES.includes(lineText(SRC, f.line).trim()))
    .map((f) => f.vars.pq);
}

describe("Dijkstra's algorithm with a priority queue", () => {
  const frames = run(INITIAL_INPUT);

  it("prints what the Python prints", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual(["{'a': 5, 'b': 2, 'fin': 6}"]);
  });

  // Recorded by wrapping heapq in CPython around the original function.
  it("keeps pq in Python's order after every heap call", () => {
    expect(pqLog(INITIAL_INPUT)).toEqual([
      [],
      [[6, "a"]],
      [
        [2, "b"],
        [6, "a"],
      ],
      [[6, "a"]],
      [
        [5, "a"],
        [6, "a"],
      ],
      [
        [5, "a"],
        [6, "a"],
        [7, "fin"],
      ],
      [
        [6, "a"],
        [7, "fin"],
      ],
      [
        [6, "a"],
        [7, "fin"],
        [6, "fin"],
      ],
      [
        [6, "fin"],
        [7, "fin"],
      ],
      [[7, "fin"]],
      [],
    ]);
  });

  it("skips stale entries", () => {
    const skipped = frames
      .filter((f) => lineText(SRC, f.line).trim() === "continue")
      .map((f) => [f.vars.current_distance, f.vars.current_vertex]);
    expect(skipped).toEqual([
      [6, "a"],
      [7, "fin"],
    ]);
  });

  it("matches Python on a graph with an edge back into start", () => {
    const edges: Edges = [
      { id: "1", from: "start", to: "a", weight: 9 },
      { id: "2", from: "start", to: "b", weight: 1 },
      { id: "3", from: "start", to: "fin", weight: 9 },
      { id: "4", from: "a", to: "start", weight: 0 },
      { id: "5", from: "b", to: "a", weight: 1 },
      { id: "6", from: "b", to: "fin", weight: 7 },
      { id: "7", from: "fin", to: "b", weight: 0 },
      { id: "8", from: "fin", to: "a", weight: 2 },
    ];
    const log = pqLog({ edges });
    expect(log[5]).toEqual([
      [2, "a"],
      [9, "fin"],
      [9, "a"],
    ]);
    expect(log[6]).toEqual([
      [2, "a"],
      [8, "fin"],
      [9, "a"],
      [9, "fin"],
    ]);
    expect(log[8]).toEqual([
      [2, "start"],
      [8, "fin"],
      [9, "a"],
      [9, "fin"],
    ]);
    expect(log).toHaveLength(13);
    expect(run({ edges }).at(-1)!.vars.stdout).toEqual(["{'a': 2, 'b': 1, 'fin': 8}"]);
  });
});
