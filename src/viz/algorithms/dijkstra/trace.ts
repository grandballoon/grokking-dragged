/**
 * Port of python-master/09/01_dijkstras_algorithm.py.
 *
 * The script is module-level code: it builds `graph` (a dict of dicts), then
 * hard-codes the `costs` and `parents` tables from start's neighbours, then
 * runs the loop with the global `processed` list and `find_lowest_cost_node`.
 *
 * The graph here is editable, so the hard-coded tables are derived the way
 * the script's author derived them: every node but "start", in node order,
 * costs its edge weight from "start" with parent "start" if it is one of
 * start's neighbours, and `infinity` with parent `None` otherwise. For the
 * book's graph that is exactly what the script writes. Nobody can point an
 * edge at "start": `costs` has no "start" key, so the script would raise a
 * KeyError at `costs[n]`.
 */
import { pyRepr } from "../../../core/python";
import source from "@repo/python-master/09/01_dijkstras_algorithm.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import {
  BOOK_EDGES,
  describeEdges,
  NODES,
  toGraph,
  type Edges,
  type NodeName,
} from "../weightedGraph/graph";

export const SRC = pythonSource("python-master/09/01_dijkstras_algorithm.py", source);

export type Input = { readonly edges: Edges };

export const INITIAL_INPUT: Input = { edges: BOOK_EDGES };

/** The script's `costs[n]` would raise a KeyError for an edge into start. */
export const acceptsEdge = (_from: NodeName, to: NodeName) => to !== "start";

/** The locals of the `find_lowest_cost_node` call in progress. */
export type FindCall = {
  lowest_cost: number;
  lowest_cost_node: string | null;
  node: string | null;
  cost: number | null;
};

export type Vars = {
  costs: Record<string, number>;
  parents: Record<string, string | null>;
  processed: string[];
  /** The module-level `node`, `cost`, `neighbors`, `n` and `new_cost`. */
  node: string | null;
  cost: number | null;
  neighbors: Record<string, number> | null;
  n: string | null;
  new_cost: number | null;
  /** The active `find_lowest_cost_node(costs)` call, while one runs. */
  call: FindCall | null;
  stdout: string[];
};

const show = (cost: number) => pyRepr(cost);

export function run({ edges }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);

  const graph = toGraph(edges);
  const infinity = Infinity;
  const costs: Record<string, number> = {};
  const parents: Record<string, string | null> = {};
  const processed: string[] = [];
  let node: string | null = null;
  let cost: number | null = null;
  let neighbors: Record<string, number> | null = null;
  let n: string | null = null;
  let new_cost: number | null = null;
  let call: FindCall | null = null;
  const stdout: string[] = [];
  const vars = (): Vars => ({
    costs,
    parents,
    processed,
    node,
    cost,
    neighbors,
    n,
    new_cost,
    call,
    stdout,
  });

  step('graph["fin"] = {}', vars(), `Build the graph: ${describeEdges(edges)}.`);

  const others = NODES.filter((v) => v !== "start");
  for (const v of others) costs[v] = graph["start"]![v] ?? infinity;
  step(
    'costs["fin"] = infinity',
    vars(),
    `costs, as the script hard-codes them from start's edges: ${others.map((v) => `${v} ${show(costs[v]!)}`).join(", ")}. No edge from start means infinity.`,
  );
  for (const v of others) parents[v] = v in graph["start"]! ? "start" : null;
  step(
    'parents["fin"] = None',
    vars(),
    "parents, hard-coded the same way: start for start's neighbours, None for the rest.",
  );
  step("processed = []", vars(), "Nothing has been processed yet.");

  function find_lowest_cost_node(costs: Record<string, number>): string | null {
    const locals: FindCall = {
      lowest_cost: Infinity,
      lowest_cost_node: null,
      node: null,
      cost: null,
    };
    call = locals;
    for (const node of Object.keys(costs)) {
      const cost = costs[node]!;
      locals.node = node;
      locals.cost = cost;
      if (cost < locals.lowest_cost && !processed.includes(node)) {
        const previous = locals.lowest_cost;
        locals.lowest_cost = cost;
        locals.lowest_cost_node = node;
        step(
          "lowest_cost_node = node",
          vars(),
          `${node} costs ${show(cost)}, less than ${show(previous)}, and isn't processed: the cheapest so far.`,
        );
      } else {
        step(
          "if cost < lowest_cost and node not in processed:",
          vars(),
          processed.includes(node)
            ? `${node} is already processed, so skip it.`
            : `${node} costs ${show(cost)}, not less than ${show(locals.lowest_cost)}.`,
        );
      }
    }
    step(
      "return lowest_cost_node",
      vars(),
      locals.lowest_cost_node === null
        ? "No unprocessed node has a finite cost: return None."
        : `Return ${locals.lowest_cost_node}, the cheapest unprocessed node.`,
    );
    call = null;
    return locals.lowest_cost_node;
  }

  node = find_lowest_cost_node(costs);
  step(
    { snippet: "node = find_lowest_cost_node(costs)", after: "return lowest_cost_node" },
    vars(),
    node === null ? "node is None, so the loop never runs." : `Process ${node} first.`,
  );
  while (node !== null) {
    cost = costs[node]!;
    step(
      { snippet: "cost = costs[node]", after: "while node is not None" },
      vars(),
      `It costs ${show(cost)} to get to ${node}.`,
    );
    neighbors = graph[node]!;
    const names = Object.keys(neighbors);
    step(
      "neighbors = graph[node]",
      vars(),
      names.length === 0
        ? `${node} has no neighbours.`
        : `${node}'s neighbours: ${names.map((m) => `${m} (${neighbors![m]})`).join(", ")}.`,
    );
    for (const neighbor of names) {
      n = neighbor;
      new_cost = cost + neighbors[n]!;
      step(
        "new_cost = cost + neighbors[n]",
        vars(),
        `Getting to ${n} through ${node} costs ${show(cost)} + ${neighbors[n]} = ${show(new_cost)}.`,
      );
      if (costs[n]! > new_cost) {
        const old = costs[n]!;
        costs[n] = new_cost;
        parents[n] = node;
        step(
          "parents[n] = node",
          vars(),
          `${show(new_cost)} beats ${show(old)}: ${n} now costs ${show(new_cost)}, with parent ${node}.`,
        );
      } else {
        step(
          "if costs[n] > new_cost:",
          vars(),
          `${n} already costs ${show(costs[n]!)}, which is no more than ${show(new_cost)}. Keep it.`,
        );
      }
    }
    processed.push(node);
    step("processed.append(node)", vars(), `${node} is processed.`);
    node = find_lowest_cost_node(costs);
    step(
      { snippet: "node = find_lowest_cost_node(costs)", after: "processed.append(node)" },
      vars(),
      node === null
        ? "Every reachable node is processed: node is None, so the loop ends."
        : `Next, process ${node}.`,
    );
  }

  stdout.push("Cost from the start to each node:");
  step('print("Cost from the start to each node:")', vars(), "Print the heading.");
  stdout.push(pyRepr(costs));
  step("print(costs)", vars(), `Print the costs: ${pyRepr(costs)}.`);
  return rec.frames;
}
