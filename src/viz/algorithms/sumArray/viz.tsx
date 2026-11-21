import type { Svgx } from "dragology";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import type { Card } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { CURRENT, PLAIN } from "../kit/paint";
import {
  BAR_UNIT,
  MAX_SLICE_LEN,
  sliceBody,
  slicePage,
  VALUE_RANGE,
} from "../kit/sliceStack";
import { DEFAULT_ARR, run, SRC, type Vars } from "./trace";

const POOL = [3, 5, 1, 7, 2, 8, 4];

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => {
    const hole = callHole(stack, i);
    return {
      id: callId(call),
      title: "sum_array(arr)",
      status: cardStatus(stack, i),
      body: sliceBody(callId(call), call.arr, i, (j) =>
        j === 0 && call.got !== null ? CURRENT : PLAIN,
      ),
      expr: hole === undefined ? undefined : { before: `${call.arr[0]} + `, hole },
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
    caption: "input: the file never calls sum_array, so this page calls sum_array(arr)",
    inputY: 86,
    stackTop: 132,
    height: size.y,
    editor: {
      list: input,
      name: "arr",
      idPrefix: "sum-in",
      bars: { unit: BAR_UNIT, range: VALUE_RANGE },
      reorder: true,
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

export const sumArrayViz = defineViz<ArrInput, Vars>({
  id: "sum-array",
  title: "Recursive sum",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "sum_array(arr) is arr[0] + sum_array(arr[1:]): the stack grows one call per item, down to the empty list's 0, and the running sum builds up as it unwinds.",
  drags: [
    "the timeline knob to watch the partial sums flow back down the stack",
    "a purple dot up or down to change a value",
    "a cell sideways to reorder the list (the sum stays, the partial sums change)",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput: arrInput(DEFAULT_ARR),
  run,
  draw,
  diagramHeight: 570,
});
