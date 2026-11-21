import type { VizEntry } from "../defineViz";
import { ENTRIES as ARRAYS } from "./arrays";
import { ENTRIES as HASH_TREE_GRAPH } from "./hashTreeGraph";
import { ENTRIES as LISTS } from "./lists";
import { ENTRIES as QUEUES } from "./queues";

/** Grokking Data Structures (grokking_data_structures-main/python), in chapter order. */
export const DATA_STRUCTURES: readonly VizEntry[] = [
  ...ARRAYS,
  ...LISTS,
  ...QUEUES,
  ...HASH_TREE_GRAPH,
];
