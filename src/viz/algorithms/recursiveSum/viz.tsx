import type { Svgx } from "dragology";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import type { Card } from "../kit/callStack";
import {
  callHole,
  callId,
  cardStatus,
  known,
  returnChip,
  type LinearCall,
} from "../kit/linearCalls";
import { CURRENT, PLAIN } from "../kit/paint";
import {
  BAR_UNIT,
  MAX_SLICE_LEN,
  sliceBody,
  slicePage,
  VALUE_RANGE,
} from "../kit/sliceStack";
import { DEFAULT_LIST, run, SRC, type Vars } from "./trace";

const POOL = [1, 5, 8, 3, 7, 2, 9];

function cards(stack: Vars["stack"]): Card[] {
  // A linear recursion has one call per depth, so the depth names the call.
  const calls: LinearCall<number>[] = stack.map((call, depth) => ({
    uid: depth,
    got: known(call.rest),
    returns: known(call.returns),
  }));
  return stack.map((call, i) => {
    const hole = callHole(calls, i);
    return {
      id: callId(calls[i]!),
      title: "sum(list)",
      status: cardStatus(calls, i),
      body: sliceBody(callId(calls[i]!), call.list, i, (j) =>
        j === 0 && call.rest !== null ? CURRENT : PLAIN,
      ),
      expr: hole === undefined ? undefined : { before: `${call.list[0]} + `, hole },
      ret: returnChip(calls, i),
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
    caption: "input: the file only defines sum, so this page calls sum(list)",
    inputY: 86,
    stackTop: 132,
    height: size.y,
    editor: {
      list: input,
      name: "list",
      idPrefix: "sum-in",
      bars: { unit: BAR_UNIT, range: VALUE_RANGE },
      reorder: true,
      length: {
        range: [0, MAX_SLICE_LEN],
        fill: (list) => POOL[list.length % POOL.length]!,
      },
      d,
      draggedId,
      toState: withInput,
    },
    cards: cards(frame.vars.stack),
  });
}

export const recursiveSumViz = defineViz<ArrInput, Vars>({
  id: "recursive-sum",
  title: "Recursive sum",
  book: "Grokking Algorithms",
  chapter: "4 · Quicksort",
  summary:
    "Add up a list without a loop: the sum is the first item plus the sum of the rest, and an empty list sums to 0. Each call waits on a shorter slice until the base case answers, then the additions happen on the way back up.",
  drags: [
    "the timeline knob to step through the calls",
    "a purple dot up or down to change a value",
    "a cell sideways to reorder the list",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput: arrInput(DEFAULT_LIST),
  run: (input) => run(input.arr),
  draw,
  diagramHeight: 570,
});
