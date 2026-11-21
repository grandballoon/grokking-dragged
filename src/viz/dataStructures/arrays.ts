import type { VizEntry } from "../defineViz";
import { staticArrayViz } from "./arrays/core/viz";
import { dynamicArrayViz } from "./arrays/dynamic/viz";
import { sortedArrayViz } from "./arrays/sorted/viz";
import { unsortedArrayViz } from "./arrays/unsorted/viz";

export const ENTRIES: readonly VizEntry[] = [
  staticArrayViz,
  unsortedArrayViz,
  sortedArrayViz,
  dynamicArrayViz,
];
