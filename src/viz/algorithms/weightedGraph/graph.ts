/**
 * The editable input behind both Dijkstra visualizations: the book's four
 * nodes and a list of weighted edges, from which each port builds the
 * Python's dict of dicts.
 *
 * Edges are kept as a list with stable ids, rather than as the dict itself,
 * so an edge keeps its identity while the reader rewires one of its ends.
 * `toGraph` turns the list into the dict the Python builds: one inner dict
 * per node, in node order, with each node's edges in list order. Rewiring an
 * edge's target renames its key in place; moving its source appends it to
 * the new source's dict, as a fresh `graph[source][target] = weight` would.
 */

export const NODES = ["start", "a", "b", "fin"] as const;
export type NodeName = (typeof NODES)[number];

export type Edge = {
  readonly id: string;
  readonly from: NodeName;
  readonly to: NodeName;
  readonly weight: number;
};
export type Edges = readonly Edge[];

/** The Python's `graph`: node -> { neighbour: weight }, in insertion order. */
export type Graph = Record<string, Record<string, number>>;

export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 9;

/** The book's graph, in the order the scripts build it. */
export const BOOK_EDGES: Edges = [
  { id: "start-a", from: "start", to: "a", weight: 6 },
  { id: "start-b", from: "start", to: "b", weight: 2 },
  { id: "a-fin", from: "a", to: "fin", weight: 1 },
  { id: "b-a", from: "b", to: "a", weight: 3 },
  { id: "b-fin", from: "b", to: "fin", weight: 5 },
];

export function toGraph(edges: Edges): Graph {
  const graph: Graph = {};
  for (const node of NODES) graph[node] = {};
  for (const edge of edges) graph[edge.from]![edge.to] = edge.weight;
  return graph;
}

export function withWeight(edges: Edges, id: string, weight: number): Edges {
  return edges.map((e) => (e.id === id ? { ...e, weight } : e));
}

export type End = "from" | "to";

/** Whether an edge from `from` to `to` may exist, beyond the basic rules. */
export type Accepts = (from: NodeName, to: NodeName) => boolean;

/**
 * Every edge list reachable by moving one end of edge `id` to another node,
 * the current list included: no self-loops, no second edge between the same
 * ordered pair, and only pairs that `accepts` allows.
 */
export function rewirings(edges: Edges, id: string, end: End, accepts: Accepts): Edges[] {
  const edge = edges.find((e) => e.id === id);
  if (edge === undefined) throw new Error(`No edge ${id}`);
  const result: Edges[] = [edges];
  for (const node of NODES) {
    if (node === edge[end]) continue;
    const moved: Edge = { ...edge, [end]: node };
    const taken = edges.some(
      (e) => e.id !== id && e.from === moved.from && e.to === moved.to,
    );
    if (moved.from === moved.to || taken || !accepts(moved.from, moved.to)) continue;
    result.push(
      end === "to"
        ? edges.map((e) => (e.id === id ? moved : e))
        : [...edges.filter((e) => e.id !== id), moved],
    );
  }
  return result;
}

/** The edges as a sentence, e.g. "start→a 6, start→b 2". */
export function describeEdges(edges: Edges): string {
  if (edges.length === 0) return "no edges";
  return toGraphOrder(edges)
    .map((e) => `${e.from}→${e.to} ${e.weight}`)
    .join(", ");
}

/** The edges in the order the Python dict lists them. */
export function toGraphOrder(edges: Edges): Edge[] {
  return NODES.flatMap((node) => edges.filter((e) => e.from === node));
}
