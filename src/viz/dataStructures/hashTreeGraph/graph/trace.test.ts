import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { BFS_INPUT, DFS_INPUT } from "./input";
import {
  QUEUE_SRC,
  runBfs,
  runDfs,
  SLL_SRC,
  SRC,
  STACK_SRC,
  type Input,
  type Vars,
} from "./trace";

const on = (snippet: string) => (f: { file: string; line: number }) =>
  f.file === SRC.file && lineText(SRC, f.line).includes(snippet);

/** Python's `repr(graph)`. */
function graphRepr(vars: Vars): string {
  const lists = [...vars._adj.values()].map((v) => {
    const out: string[] = [];
    for (let n = v._adj_list._head; n !== null; n = n._next) out.push(`->${n._data.id}`);
    return `Vertex(${v.id}): [${out.join(", ")}]`;
  });
  return `Graph(${lists.join(" | ")})`;
}

const withoutBackEdge: Input = {
  ...DFS_INPUT,
  edges: DFS_INPUT.edges.map((e) => (e.from === 4 ? { ...e, to: 5 } : e)),
};

describe("graph build", () => {
  const frames = runBfs(BFS_INPUT);
  const built = frames
    .filter((f) => f.vars.op === BFS_INPUT.vertices.length + BFS_INPUT.edges.length - 1)
    .at(-1)!;

  it("lists neighbours in reverse insertion order, as the Python repr shows", () => {
    expect(graphRepr(built.vars)).toBe(
      "Graph(Vertex(1): [->3, ->2] | Vertex(2): [->4, ->3] | Vertex(3): [->5] | Vertex(4): [->1] | Vertex(5): [] | Vertex(6): [->7] | Vertex(7): [] | Vertex(8): [])",
    );
  });

  it("steps into the linked list for each edge", () => {
    const edgeFrames = frames.filter((f) => f.file === SLL_SRC.file);
    expect(edgeFrames.length).toBe(BFS_INPUT.edges.length);
  });
});

describe("bfs port", () => {
  it("returns the paths the Python returns", () => {
    const result = (start: number, target: number) =>
      runBfs({ ...BFS_INPUT, start, target }).at(-1)!.vars.result;
    expect(result(4, 5)).toBe("[4, 1, 3, 5]");
    expect(result(4, 3)).toBe("[4, 1, 3]");
    expect(result(2, 1)).toBe("[2, 4, 1]");
    expect(result(1, 6)).toBe("None");
    expect(result(5, 4)).toBe("None");
  });

  it("dequeues in the Python's order, through queue.py", () => {
    const frames = runBfs({ ...BFS_INPUT, start: 1, target: 6 });
    expect(frames.filter(on("u = queue.dequeue()")).map((f) => f.vars.u)).toEqual([
      1, 3, 2, 5, 4,
    ]);
    expect(frames.some((f) => f.file === QUEUE_SRC.file)).toBe(true);
  });

  it("records distances and predecessors", () => {
    const end = runBfs(BFS_INPUT).at(-1)!.vars;
    expect([...end.distance!]).toEqual([
      [1, 1],
      [2, 2],
      [3, 2],
      [4, 0],
      [5, 3],
      [6, Infinity],
      [7, Infinity],
      [8, Infinity],
    ]);
    expect(end.predecessor!.get(5)).toBe(3);
  });
});

describe("dfs port", () => {
  it("returns what the Python returns", () => {
    const result = (start: number, input = DFS_INPUT) =>
      runDfs({ ...input, start }).at(-1)!.vars.result;
    expect(result(4)).toBe(
      "(False, {1: 'black', 2: 'black', 3: 'black', 4: 'black', 5: 'black', 6: 'white', 7: 'white', 8: 'white'})",
    );
    expect(result(3)).toBe(
      "(True, {1: 'white', 2: 'white', 3: 'black', 4: 'white', 5: 'black', 6: 'white', 7: 'white', 8: 'white'})",
    );
    expect(result(6)).toBe(
      "(True, {1: 'white', 2: 'white', 3: 'white', 4: 'white', 5: 'white', 6: 'black', 7: 'black', 8: 'white'})",
    );
    expect(result(4, withoutBackEdge)).toBe(
      "(True, {1: 'white', 2: 'white', 3: 'white', 4: 'black', 5: 'black', 6: 'white', 7: 'white', 8: 'white'})",
    );
  });

  it("pops (mark_as_black, v) pairs in the Python's order, through stack.py", () => {
    const frames = runDfs(DFS_INPUT);
    expect(
      frames
        .filter(on("(mark_as_black, v) = stack.pop()"))
        .map((f) => [f.vars.mark_as_black, f.vars.v]),
    ).toEqual([
      [false, 4],
      [false, 1],
      [false, 2],
      [false, 3],
      [false, 5],
      [true, 5],
      [true, 3],
      [false, 4],
      [true, 2],
      [false, 3],
      [true, 1],
      [true, 4],
    ]);
    expect(frames.some((f) => f.file === STACK_SRC.file)).toBe(true);
  });

  it("finds the cycle when it pops a grey vertex", () => {
    const hit = runDfs(DFS_INPUT).find(on("acyclic = False"))!;
    expect(hit.vars.v).toBe(4);
    expect(hit.vars.color!.get(4)).toBe("grey");
  });
});
