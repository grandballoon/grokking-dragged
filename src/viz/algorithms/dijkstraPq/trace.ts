/**
 * Port of python-master/09/01_dijkstras_algorithm_pq.py.
 *
 * `calculate_distances` keeps the Python's shapes: `distances` is a dict in
 * graph order, and `pq` a list of `(distance, vertex)` tuples kept as a heap
 * by a faithful port of `heapq` (see ./heapq.ts), so the list's order matches
 * Python's at every step. The input is `example_graph`; unlike the plain
 * script, an edge may point back at "start" here, since `distances` has a
 * key for every vertex.
 */
import source from "@sources/python-master/09/01_dijkstras_algorithm_pq.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import { BOOK_EDGES, toGraph, type Edges } from "../weightedGraph/graph";
import { dictPop, pyRepr } from "../../../core/python";
import { heappop, heappush } from "./heapq";

export const SRC = pythonSource("python-master/09/01_dijkstras_algorithm_pq.py", source);

export type Input = { readonly edges: Edges };

export const INITIAL_INPUT: Input = { edges: BOOK_EDGES };

export type Entry = [number, string];

export type Vars = {
  distances: Record<string, number>;
  pq: Entry[];
  current_distance: number | null;
  current_vertex: string | null;
  neighbor: string | null;
  weight: number | null;
  distance: number | null;
  stdout: string[];
};

export function entryRepr([d, v]: readonly [number, string]): string {
  return `(${pyRepr(d)}, ${pyRepr(v)})`;
}

export function run({ edges }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const example_graph = toGraph(edges);
  const stdout: string[] = [];

  function calculate_distances(
    graph: Record<string, Record<string, number>>,
    starting_vertex: string,
  ): Record<string, number> {
    const distances: Record<string, number> = {};
    for (const vertex of Object.keys(graph)) distances[vertex] = Infinity;
    let pq: Entry[] = [];
    let current_distance: number | null = null;
    let current_vertex: string | null = null;
    let neighbor: string | null = null;
    let weight: number | null = null;
    let distance: number | null = null;
    const vars = (): Vars => ({
      distances,
      pq,
      current_distance,
      current_vertex,
      neighbor,
      weight,
      distance,
      stdout,
    });

    step(
      "distances = {vertex: float('infinity') for vertex in graph}",
      vars(),
      "Every vertex starts infinitely far away.",
    );
    pq = [[0, starting_vertex]];
    step(
      "pq = [(0, starting_vertex)]",
      vars(),
      `The priority queue starts with ${starting_vertex}, at distance 0.`,
    );
    while (pq.length > 0) {
      [current_distance, current_vertex] = heappop(pq);
      step(
        "current_distance, current_vertex = heapq.heappop(pq)",
        vars(),
        pq.length === 0
          ? `Pop the smallest tuple, ${entryRepr([current_distance, current_vertex])}, which leaves pq empty.`
          : `Pop the smallest tuple, ${entryRepr([current_distance, current_vertex])}; heapq moves the last item to the root and sifts it down.`,
      );
      if (current_distance > distances[current_vertex]!) {
        step(
          "continue",
          vars(),
          `${current_vertex} is already known at ${pyRepr(distances[current_vertex])}, closer than ${current_distance}: a stale entry, skip it.`,
        );
        continue;
      }
      const items = Object.entries(graph[current_vertex]!);
      if (items.length === 0) {
        step(
          "for neighbor, weight in graph[current_vertex].items():",
          vars(),
          `${current_vertex} has no neighbours.`,
        );
      }
      for ([neighbor, weight] of items) {
        distance = current_distance + weight;
        step(
          "distance = current_distance + weight",
          vars(),
          `Through ${current_vertex}, ${neighbor} is ${current_distance} + ${weight} = ${distance} away.`,
        );
        if (distance < distances[neighbor]!) {
          const old = distances[neighbor]!;
          distances[neighbor] = distance;
          step(
            "distances[neighbor] = distance",
            vars(),
            `${distance} beats ${pyRepr(old)}: ${neighbor} is now ${distance} away.`,
          );
          heappush(pq, [distance, neighbor]);
          step(
            "heapq.heappush(pq, (distance, neighbor))",
            vars(),
            `Push ${entryRepr([distance, neighbor])} onto the end; heapq sifts it up past any larger parents.`,
          );
        } else {
          step(
            "if distance < distances[neighbor]:",
            vars(),
            `${neighbor} is already ${pyRepr(distances[neighbor])} away, no farther than ${distance}. Skip it.`,
          );
        }
      }
    }
    dictPop(distances, starting_vertex);
    step(
      "distances.pop(starting_vertex)",
      vars(),
      `The queue is empty. Drop ${starting_vertex} itself from distances.`,
    );
    step("return distances", vars(), `Return ${pyRepr(distances)}.`);
    return distances;
  }

  const result = calculate_distances(example_graph, "start");
  stdout.push(pyRepr(result));
  step(
    "print(calculate_distances(example_graph, 'start'))",
    { ...emptyVars(), distances: result, stdout },
    `Print ${pyRepr(result)}.`,
  );
  return rec.frames;
}

function emptyVars(): Vars {
  return {
    distances: {},
    pq: [],
    current_distance: null,
    current_vertex: null,
    neighbor: null,
    weight: null,
    distance: null,
    stdout: [],
  };
}
