import type { Edge, Input } from "./trace";

/** Edges in insertion order. Ids are positional, and stay with an edge as it is rewired or reordered. */
const edges = (...pairs: [number, number][]): Edge[] =>
  pairs.map(([from, to], i) => ({ id: `e${i}`, from, to }));

/**
 * The graph of the repo's own tests (`create_bfs_disconnected_graph` in
 * tests/test_graph.py): a cycle 1 → 2 → 4 → 1 with 3 and 5 hanging off it,
 * and 6 → 7 and 8 off on their own.
 */
const TEST_GRAPH = {
  vertices: [1, 2, 3, 4, 5, 6, 7, 8],
  edges: edges([1, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 1], [6, 7]),
};

/** `bfs(4, 5)`, which the tests expect to return [4, 1, 3, 5]. */
export const BFS_INPUT: Input = { ...TEST_GRAPH, start: 4, target: 5 };

/** `dfs(4)`, which runs into the cycle through 4. (`target` is unused by dfs.) */
export const DFS_INPUT: Input = { ...TEST_GRAPH, start: 4, target: 5 };
