import type { VizEntry } from "../defineViz";
import { circularQueueViz } from "./queues/circular/viz";
import { heapViz } from "./queues/heap/viz";
import { kLargestViz } from "./queues/kLargest/viz";
import { linkedQueueViz } from "./queues/linked/viz";

/** Chapter 9 (queues) and chapter 10 (priority queues and heaps). */
export const ENTRIES: readonly VizEntry[] = [
  circularQueueViz,
  linkedQueueViz,
  heapViz,
  kLargestViz,
];
