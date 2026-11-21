import type { VizEntry } from "../defineViz";
import { dijkstraViz } from "./dijkstra/viz";
import { dijkstraPqViz } from "./dijkstraPq/viz";
import { filesystemDfsViz } from "./filesystemDfs/viz";
import { lcsViz } from "./longestCommonSubsequence/viz";
import { lcSubstringViz } from "./longestCommonSubstring/viz";
import { setCoveringViz } from "./setCovering/viz";

export const ENTRIES: readonly VizEntry[] = [
  filesystemDfsViz,
  dijkstraViz,
  dijkstraPqViz,
  setCoveringViz,
  lcsViz,
  lcSubstringViz,
];
