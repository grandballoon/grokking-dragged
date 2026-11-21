import type { VizEntry } from "../defineViz";
import { checkVoterViz } from "./checkVoter/viz";
import { loopSumViz } from "./loopSum/viz";
import { priceOfGroceriesViz } from "./priceOfGroceries/viz";
import { quicksortViz } from "./quicksort/viz";
import { recursiveCountViz } from "./recursiveCount/viz";
import { recursiveMaxViz } from "./recursiveMax/viz";
import { recursiveSumViz } from "./recursiveSum/viz";

/** Chapters 4 (quicksort) and 5 (hash tables), in file order. */
export const ENTRIES: readonly VizEntry[] = [
  loopSumViz,
  recursiveSumViz,
  recursiveCountViz,
  recursiveMaxViz,
  quicksortViz,
  priceOfGroceriesViz,
  checkVoterViz,
];
