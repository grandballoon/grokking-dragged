import type { VizEntry } from "../defineViz";
import { binarySearchRecursiveViz } from "./binarySearchRecursive/viz";
import { countViz } from "./count03/viz";
import { countdownViz } from "./countdown/viz";
import { factorialViz } from "./factorial/viz";
import { findMaxViz } from "./findMax/viz";
import { greetViz } from "./greet/viz";
import { lookForKeyViz } from "./lookForKey/viz";
import { selectionSortViz } from "./selectionSort/viz";
import { sumArrayViz } from "./sumArray/viz";

/** Chapter 2 (selection sort) and chapter 3 (recursion), in file order. */
export const ENTRIES: readonly VizEntry[] = [
  selectionSortViz,
  countdownViz,
  greetViz,
  factorialViz,
  countViz,
  binarySearchRecursiveViz,
  findMaxViz,
  sumArrayViz,
  lookForKeyViz,
];
