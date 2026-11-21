import type { VizEntry } from "../defineViz";
import { bfsViz } from "./bfs/viz";
import { binarySearchViz } from "./binarySearch/viz";
import { ENTRIES as CH02_03 } from "./ch02_03";
import { ENTRIES as CH04_05 } from "./ch04_05";
import { ENTRIES as CH07_11 } from "./ch07_11";

/** Grokking Algorithms (python-master), in chapter order. */
export const ALGORITHMS: readonly VizEntry[] = [
  binarySearchViz,
  ...CH02_03,
  ...CH04_05,
  bfsViz,
  ...CH07_11,
];
