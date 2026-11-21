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

const POOL = [1, 5, 9, 2, 6, 8, 3];

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
      title: "count(list)",
      status: cardStatus(calls, i),
      body: sliceBody(callId(calls[i]!), call.list, i, (j) =>
        j === 0 && call.rest !== null ? CURRENT : PLAIN,
      ),
      expr: hole === undefined ? undefined : { before: "1 + ", hole },
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
    caption: "input: the file only defines count, so this page calls count(list)",
    inputY: 86,
    stackTop: 132,
    height: size.y,
    editor: {
      list: input,
      name: "list",
      idPrefix: "count-in",
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

export const recursiveCountViz = defineViz<ArrInput, Vars>({
  id: "recursive-count-04",
  title: "Recursive count",
  book: "Grokking Algorithms",
  chapter: "4 · Quicksort",
  summary:
    "Count a list's items recursively: one for the first item plus the count of the rest, and an empty list has none. Change the values and nothing changes; add or remove one and the stack grows or shrinks.",
  drags: [
    "the timeline knob to step through the calls",
    "a purple dot up or down to change a value (the count ignores it)",
    "a cell sideways to reorder the list",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput: arrInput(DEFAULT_LIST),
  run: (input) => run(input.arr),
  draw,
  diagramHeight: 570,
});
