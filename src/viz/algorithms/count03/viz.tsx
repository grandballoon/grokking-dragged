import type { Svgx } from "dragology";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import type { Card } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { CURRENT, PLAIN } from "../kit/paint";
import { MAX_SLICE_LEN, sliceBody, slicePage } from "../kit/sliceStack";
import { DEFAULT_ARR, run, SRC, type Vars } from "./trace";

const POOL = [2, 4, 6, 8, 1, 3, 5];

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => {
    const hole = callHole(stack, i);
    return {
      id: callId(call),
      title: "count(arr)",
      status: cardStatus(stack, i),
      body: sliceBody(callId(call), call.arr, i, (j) =>
        j === 0 && call.got !== null ? CURRENT : PLAIN,
      ),
      expr: hole === undefined ? undefined : { before: "1 + ", hole },
      ret: returnChip(stack, i),
    };
  });
}

function draw({
  frame,
  input,
  size,
  d,
  draggedId,
  withInput,
}: DrawArgs<ArrInput, Vars>): Svgx {
  return slicePage({
    caption: "input: the file never calls count, so this page calls count(arr)",
    inputY: 32,
    stackTop: 84,
    height: size.y,
    editor: {
      list: input,
      name: "arr",
      idPrefix: "count-in",
      length: {
        range: [0, MAX_SLICE_LEN],
        fill: (arr) => POOL[arr.length % POOL.length]!,
      },
      d,
      draggedId,
      toState: withInput,
    },
    cards: cards(frame.vars.stack),
  });
}

export const countViz = defineViz<ArrInput, Vars>({
  id: "count-03",
  title: "Recursive count",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "count(arr) is 1 + count(arr[1:]): each call counts one item and hands a copy of the rest to a new call, until the empty list returns 0.",
  drags: [
    "the timeline knob to watch the slices shrink and the counts add up on the way back",
    "the purple ] to make the list shorter or longer; one more item means one more call",
  ],
  sources: [SRC],
  initialInput: arrInput(DEFAULT_ARR),
  run,
  draw,
  diagramHeight: 530,
});
