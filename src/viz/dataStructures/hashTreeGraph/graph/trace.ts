/**
 * Runs a graph script: build the graph with `insert_vertex` and
 * `insert_edge`, then call `bfs` or `dfs` on it, recording steps in
 * graph.py and in the files its helpers live in.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { pyRepr } from "../../../../core/python";
import { PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";
import { stepOver, tracer } from "../../kit/tracer";
import type { Op } from "../../opScript";
import { SRC as QUEUE_SRC } from "../../ports/queue";
import { SRC as SLL_SRC } from "../../ports/singly_linked_list";
import { SRC as STACK_SRC } from "../../ports/stack";
import {
  Graph,
  NO_LOCALS,
  showEntry,
  SRC,
  Vertex,
  type GraphEnv,
  type Key,
  type SearchLocals,
  type StackEntry,
} from "./graph";

export { QUEUE_SRC, SLL_SRC, SRC, STACK_SRC };

export type Edge = { readonly id: string; readonly from: Key; readonly to: Key };

export type Input = {
  /** `insert_vertex` calls, in order. */
  readonly vertices: readonly Key[];
  /** `insert_edge` calls, in order. */
  readonly edges: readonly Edge[];
  readonly start: Key;
  /** `bfs`'s target; `dfs` takes none. */
  readonly target: Key;
};

export type Search = "bfs" | "dfs";

/** What a frame shows: the graph, which script call is running, and the search's locals. */
export type Vars = SearchLocals & {
  _adj: Map<Key, Vertex>;
  /** Index into the script: vertices, then edges, then the search call. */
  op: number | null;
};

/**
 * The script the input stands for, one op per call: the vertices, then the
 * edges, then the search. An edge's op keeps the edge's id, so the list node
 * its `insert_edge` makes (whose uid is named after the op) keeps its
 * identity when the edges are reordered.
 */
export function graphScript(search: Search, input: Input): Op[] {
  return [
    ...input.vertices.map((key) => ({
      id: `vertex${key}`,
      name: "insert_vertex",
      args: [key],
    })),
    ...input.edges.map((e) => ({ id: e.id, name: "insert_edge", args: [e.from, e.to] })),
    search === "bfs"
      ? { id: "search", name: "bfs", args: [input.start, input.target] }
      : { id: "search", name: "dfs", args: [input.start] },
  ];
}

/** A stored value as a note shows it: a vertex by its key, a stack entry as its tuple. */
function show(value: unknown): string {
  if (value instanceof Vertex) return String(value.id);
  if (Array.isArray(value)) return showEntry(value as unknown as StackEntry);
  return pyRepr(value);
}

/** Files whose calls show as one step each: the search's steps are graph.py's. */
const BRIEF = new Set([SLL_SRC.file, QUEUE_SRC.file, STACK_SRC.file]);

export function run(search: Search, input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const stepGraph = rec.in(SRC);
  const runner = scriptRunner(graphScript(search, input));

  const graph = new Graph();
  let locals: SearchLocals = NO_LOCALS;
  const vars = (): Vars => ({ ...locals, _adj: graph._adj, op: runner.op });
  const at: GraphEnv["at"] = (where, note, patch = {}) => {
    locals = { ...locals, ...patch };
    stepGraph(where, vars(), note);
  };
  const env: GraphEnv = {
    at,
    raise(where, detail) {
      const error = new PyError("ValueError", detail);
      at(where, error.message, { error: error.message });
      throw error;
    },
    t: tracer({
      newUid: runner.newUid,
      show,
      record: stepOver(
        (event) => {
          if (event.raised !== undefined) locals = { ...locals, error: event.note };
          rec.in(event.src)(event.where, vars(), event.note);
        },
        rec.frames,
        (call) => BRIEF.has(call.file),
      ),
    }),
  };

  stepGraph("self._adj = {}", vars(), "An empty graph: no vertices, no edges.");
  runner.run((op) => {
    locals = NO_LOCALS;
    const [a = 0, b = 0] = op.args;
    if (op.name === "insert_vertex") graph.insert_vertex(a, env);
    else if (op.name === "insert_edge") graph.insert_edge(a, b, env);
    else if (op.name === "bfs") graph.bfs(a, b, env);
    else graph.dfs(a, env);
  });
  return rec.frames;
}

export const runBfs = (input: Input) => run("bfs", input);
export const runDfs = (input: Input) => run("dfs", input);
