import { defineViz } from "../../defineViz";
import type { DpVars } from "../dpTable/dp";
import { DP_INITIAL_INPUT, dpDraw, type DpInput } from "../dpTable/draw";
import { run, SRC } from "./trace";

export const lcsViz = defineViz<DpInput, DpVars>({
  id: "longest-common-subsequence",
  title: "Longest common subsequence",
  book: "Grokking Algorithms",
  chapter: "11 · Dynamic programming",
  summary:
    "Fill a table cell by cell to find the longest run of letters two words share in order, gaps allowed. A match extends the diagonal; otherwise a cell keeps the better of its neighbours above and to the left. At i = 0 or j = 0 the Python's [i-1] and [j-1] are -1, which reads the last row or column.",
  drags: [
    "the timeline knob to fill the table step by step",
    "a letter to reorder its word, move it to the other word, or swap it with a spare letter",
  ],
  sources: [SRC],
  initialInput: DP_INITIAL_INPUT,
  run,
  draw: dpDraw(SRC),
  diagramHeight: 520,
});
