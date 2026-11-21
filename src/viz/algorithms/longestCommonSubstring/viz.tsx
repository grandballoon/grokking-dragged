import { defineViz } from "../../defineViz";
import type { DpVars } from "../dpTable/dp";
import { DP_INITIAL_INPUT, dpDraw, type DpInput } from "../dpTable/draw";
import { run, SRC } from "./trace";

export const lcSubstringViz = defineViz<DpInput, DpVars>({
  id: "longest-common-substring",
  title: "Longest common substring",
  book: "Grokking Algorithms",
  chapter: "11 · Dynamic programming",
  summary:
    "Fill a table cell by cell to find the longest unbroken run of letters two words share. A match extends the diagonal run; a mismatch resets the cell to 0. At i = 0 or j = 0 the Python's [i-1] and [j-1] are -1, which reads the last row or column.",
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
