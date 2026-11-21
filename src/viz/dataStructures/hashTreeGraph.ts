import type { VizEntry } from "../defineViz";
import { bstViz } from "./hashTreeGraph/bst/viz";
import { bfsGraphViz } from "./hashTreeGraph/graph/bfsViz";
import { dfsGraphViz } from "./hashTreeGraph/graph/dfsViz";
import { hashTableViz } from "./hashTreeGraph/hashTable/viz";

/** Hash tables, binary search trees and graphs (chapters 11–13). */
export const ENTRIES: readonly VizEntry[] = [
  hashTableViz,
  bstViz,
  bfsGraphViz,
  dfsGraphViz,
];
