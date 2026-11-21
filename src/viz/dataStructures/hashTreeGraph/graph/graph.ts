/**
 * Port of graphs/graph.py: `Graph` with its nested `Vertex`, the methods
 * that build a graph (`insert_vertex`, `insert_edge`), and both searches,
 * `bfs` and `dfs`, statement for statement.
 *
 * As in the Python, each vertex keeps its outgoing edges in a
 * SinglyLinkedList filled with `insert_in_front`, so a vertex lists its
 * neighbours in the reverse of the order the edges were inserted; `bfs`
 * queues them through the circular Queue of queues/queue.py and `dfs` stacks
 * them on the Stack of stacks/stack.py, so that order decides the order of
 * both searches.
 *
 * Python dicts become `Map`s rather than keyed objects: the keys are ints,
 * and a JavaScript object would list integer keys in numeric order instead
 * of insertion order.
 */
import type { Tracer, Where } from "../../kit/tracer";
import { Queue } from "../../ports/queue";
import { SinglyLinkedList } from "../../ports/singly_linked_list";
import { Stack } from "../../ports/stack";
import { GRAPH } from "../../sources";

export const SRC = GRAPH;

export type Key = number;
export type Colour = "white" | "grey" | "black";
/** A `(mark_as_black, v)` tuple on `dfs`'s stack. */
export type StackEntry = readonly [boolean, Key];

/** `Graph.Vertex`: a key and the list of vertices its edges point to. */
export class Vertex {
  // `SinglyLinkedList()`: building a vertex records no steps in the list's file.
  _adj_list = new SinglyLinkedList<Vertex>();
  constructor(readonly id: Key) {}

  /** `__eq__`: vertices are equal when their keys are. */
  equals(other: Vertex): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return `<${this.id}>`;
  }

  has_edge_to(destination_vertex: Vertex, t: Tracer): boolean {
    const predicate = {
      source: "lambda v: v == destination_vertex",
      test: (v: Vertex) => v.equals(destination_vertex),
    };
    return this._adj_list.search(predicate, t) !== null;
  }

  add_edge_to(destination_vertex: Vertex, env: GraphEnv): void {
    // The has-edge check walks the list without stepping into it.
    if (this.has_edge_to(destination_vertex, env.t.quiet())) {
      env.raise(
        "raise ValueError(f'Edge already exists: {self} -> {destination_vertex}')",
        `Edge already exists: ${this} -> ${destination_vertex}`,
      );
    }
    this._adj_list.insert_in_front(destination_vertex, env.t);
  }

  /** Walks the list with a quiet `__iter__`: the searches step over it. */
  outgoing_edges(t: Tracer): [Key, Key][] {
    return this._adj_list.__iter__(t.quiet()).map((v) => [this.id, v.id]);
  }
}

/** The locals of `bfs` and `dfs`, as a frame shows them. */
export type SearchLocals = {
  // bfs
  distance: Map<Key, number> | null;
  predecessor: Map<Key, Key | null> | null;
  queue: Queue<Key> | null;
  u: Key | null;
  path: Key[] | null;
  /** `reconstruct_path`'s `target`, walking back along predecessors. */
  target: Key | null;
  // dfs
  color: Map<Key, Colour> | null;
  acyclic: boolean | null;
  stack: Stack<StackEntry> | null;
  mark_as_black: boolean | null;
  col: Colour | null;
  w: Key | null;
  // both
  v: Key | null;
  /** The call's return value, in Python's repr, once it has returned. */
  result: string | null;
  error: string | null;
};

export const NO_LOCALS: SearchLocals = {
  distance: null,
  predecessor: null,
  queue: null,
  u: null,
  path: null,
  target: null,
  color: null,
  acyclic: null,
  stack: null,
  mark_as_black: null,
  col: null,
  w: null,
  v: null,
  result: null,
  error: null,
};

/**
 * How a method records a step in graph.py, updating the shown locals first,
 * or raises a ValueError there; `t` traces the list, queue and stack calls.
 */
export type GraphEnv = {
  readonly at: (where: Where, note: string, locals?: Partial<SearchLocals>) => void;
  readonly raise: (where: Where, detail: string) => never;
  readonly t: Tracer;
};

const pyKeys = (keys: readonly Key[]) => `[${keys.join(", ")}]`;
const showEntry = ([black, v]: StackEntry) => `(${black ? "True" : "False"}, ${v})`;
export { showEntry };

export class Graph {
  _adj = new Map<Key, Vertex>();

  _get_vertex(key: Key, env: GraphEnv): Vertex {
    const v = this._adj.get(key);
    if (v === undefined) {
      return env.raise(
        "raise ValueError(f'Vertex {key} does not exist!')",
        `Vertex ${key} does not exist!`,
      );
    }
    return v;
  }

  insert_vertex(key: Key, env: GraphEnv): void {
    if (this._adj.has(key)) {
      env.raise(
        "raise ValueError(f'Vertex {key} already exists!')",
        `Vertex ${key} already exists!`,
      );
    }
    this._adj.set(key, new Vertex(key));
    env.at(
      "self._adj[key] = Graph.Vertex(key)",
      `Add vertex ${key}, with an empty adjacency list.`,
    );
  }

  has_vertex(key: Key): boolean {
    return this._adj.has(key);
  }

  vertex_count(): number {
    return this._adj.size;
  }

  insert_edge(key1: Key, key2: Key, env: GraphEnv): void {
    const v1 = this._get_vertex(key1, env);
    const v2 = this._get_vertex(key2, env);
    v1.add_edge_to(v2, env);
    const neighbours = v1.outgoing_edges(env.t).map(([, b]) => b);
    env.at(
      "v1.add_edge_to(v2)",
      `Edge ${key1} → ${key2} added in front: ${key1}'s neighbours are now ${neighbours.join(", ")}.`,
    );
  }

  bfs(start_vertex: Key, target_vertex: Key, env: GraphEnv): Key[] | null {
    if (!this.has_vertex(start_vertex)) {
      return env.raise(
        {
          snippet: "raise ValueError(f'Start vertex {start_vertex} does not exist!')",
          after: "def bfs",
        },
        `Start vertex ${start_vertex} does not exist!`,
      );
    }
    if (!this.has_vertex(target_vertex)) {
      return env.raise(
        "raise ValueError(f'Target vertex {target_vertex} does not exist!')",
        `Target vertex ${target_vertex} does not exist!`,
      );
    }

    const reconstruct_path = (pred: Map<Key, Key | null>, start: Key): Key[] => {
      let target: Key | null = start;
      const path: Key[] = [];
      env.at("path = []", `Walk back from ${start} along the predecessors.`, {
        path,
        target,
      });
      // Python's `while target:` also stops on a falsy key such as 0.
      while (target !== null && target !== 0) {
        path.push(target);
        env.at("path.append(target)", `${target} is on the path.`, { path, target });
        target = pred.get(target) ?? null;
        env.at(
          "target = pred[target]",
          target === null
            ? "It has no predecessor: that's the start vertex."
            : `Its predecessor is ${target}.`,
          { target },
        );
      }
      const reversed = [...path].reverse();
      env.at("return path[::-1]", `Reverse it: ${pyKeys(reversed)}.`, { path: reversed });
      return reversed;
    };

    const distance = new Map<Key, number>(
      [...this._adj.keys()].map((v) => [v, Infinity]),
    );
    env.at(
      "distance = {v: float('inf') for v in self._adj}",
      "Every distance starts at infinity.",
      { distance },
    );
    const predecessor = new Map<Key, Key | null>(
      [...this._adj.keys()].map((v) => [v, null]),
    );
    env.at(
      "predecessor = {v: None for v in self._adj}",
      "Nobody has a predecessor yet.",
      { predecessor },
    );

    const queue = new Queue<Key>();
    queue.__init__(this.vertex_count(), env.t);
    env.at(
      "queue = Queue(self.vertex_count())",
      `A queue with room for all ${this.vertex_count()} vertices.`,
      { queue },
    );
    queue.enqueue(start_vertex, env.t);
    env.at("queue.enqueue(start_vertex)", `Start from ${start_vertex}.`);
    distance.set(start_vertex, 0);
    env.at("distance[start_vertex] = 0", `${start_vertex} is 0 steps from itself.`);

    while (!queue.is_empty()) {
      const u = queue.dequeue(env.t);
      env.at(
        "u = queue.dequeue()",
        `Visit ${u}, ${distance.get(u)} step${distance.get(u) === 1 ? "" : "s"} from ${start_vertex}.`,
        {
          u,
          v: null,
        },
      );
      env.at(
        "if u == target_vertex:",
        u === target_vertex
          ? `${u} is the target!`
          : `${u} isn't the target ${target_vertex}.`,
      );
      if (u === target_vertex) {
        const path = reconstruct_path(predecessor, target_vertex);
        env.at(
          "return reconstruct_path(predecessor, target_vertex)",
          `bfs returns the shortest path, ${pyKeys(path)}.`,
          {
            result: pyKeys(path),
          },
        );
        return path;
      }
      for (const [, v] of this._get_vertex(u, env).outgoing_edges(env.t)) {
        const fresh = distance.get(v) === Infinity;
        env.at(
          "if distance[v] == float('inf'):",
          fresh
            ? `${v} hasn't been reached yet.`
            : `${v} was already reached, ${distance.get(v)} steps away.`,
          { v },
        );
        if (fresh) {
          distance.set(v, distance.get(u)! + 1);
          env.at(
            "distance[v] = distance[u] + 1",
            `${v} is ${distance.get(v)} steps away.`,
          );
          predecessor.set(v, u);
          env.at("predecessor[v] = u", `We reach ${v} from ${u}.`);
          queue.enqueue(v, env.t);
          env.at("queue.enqueue(v)", `Queue ${v} up to visit later.`);
        }
      }
    }
    env.at(
      { snippet: "return None", after: "def bfs" },
      `The queue is empty and ${target_vertex} was never reached: bfs returns None.`,
      {
        u: null,
        v: null,
        result: "None",
      },
    );
    return null;
  }

  dfs(start_vertex: Key, env: GraphEnv): [boolean, Map<Key, Colour>] | null {
    if (!this.has_vertex(start_vertex)) {
      return env.raise(
        {
          snippet: "raise ValueError(f'Start vertex {start_vertex} does not exist!')",
          after: "def dfs",
        },
        `Start vertex ${start_vertex} does not exist!`,
      );
    }
    const color = new Map<Key, Colour>([...this._adj.keys()].map((v) => [v, "white"]));
    env.at(
      "color = {v: 'white' for v in self._adj}",
      "Every vertex starts white: not visited yet.",
      { color },
    );
    let acyclic = true;
    env.at("acyclic = True", "No cycle found so far.", { acyclic });
    // `Stack()`: its `__init__` records nothing; the next frame shows the empty stack.
    const stack = new Stack<StackEntry>();
    stack.__init__(env.t.quiet());
    env.at("stack = Stack()", "An empty stack of (mark_as_black, vertex) pairs.", {
      stack,
    });
    stack.push([false, start_vertex], env.t);
    env.at(
      "stack.push((False, start_vertex))",
      `Push (False, ${start_vertex}) to visit ${start_vertex}.`,
    );

    while (!stack.is_empty()) {
      const [mark_as_black, v] = stack.pop(env.t);
      env.at(
        "(mark_as_black, v) = stack.pop()",
        mark_as_black
          ? `Pop (True, ${v}): everything reachable from ${v} is done.`
          : `Pop (False, ${v}): visit ${v}.`,
        { mark_as_black, v, col: null, w: null },
      );
      const col = color.get(v) ?? "white";
      env.at("col = color.get(v, 'white')", `${v} is ${col}.`, { col });
      if (mark_as_black) {
        color.set(v, "black");
        env.at("color[v] = 'black'", `Colour ${v} black.`);
      } else if (col === "grey") {
        acyclic = false;
        env.at(
          "acyclic = False",
          `${v} is grey, still on the current path: an edge leads back to it, so there is a cycle.`,
          {
            acyclic,
          },
        );
      } else if (col === "white") {
        color.set(v, "grey");
        env.at("color[v] = 'grey'", `Colour ${v} grey: it is on the current path.`);
        stack.push([true, v], env.t);
        env.at(
          "stack.push((True, v))",
          `Push (True, ${v}) to blacken ${v} once its neighbours are done.`,
        );
        for (const [, w] of this._get_vertex(v, env).outgoing_edges(env.t)) {
          stack.push([false, w], env.t);
          env.at(
            "stack.push((False, w))",
            `Push (False, ${w}) for the edge ${v} → ${w}.`,
            { w },
          );
        }
      } else {
        env.at("elif col == 'white':", `${v} is already black: nothing to do.`);
      }
    }
    const shown = `(${acyclic ? "True" : "False"}, {${[...color].map(([k, c]) => `${k}: '${c}'`).join(", ")}})`;
    env.at(
      "return acyclic, color",
      `The stack is empty: dfs returns acyclic = ${acyclic ? "True" : "False"} and the colours.`,
      {
        mark_as_black: null,
        v: null,
        col: null,
        w: null,
        result: shown,
      },
    );
    return [acyclic, color];
  }
}
