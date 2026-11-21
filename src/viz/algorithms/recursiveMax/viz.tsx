import type { Svgx } from "dragology";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { localsLine, type Card, type CardExpr } from "../kit/callStack";
import {
  callHole,
  callId,
  cardStatus,
  known,
  returnChip,
  type LinearCall,
} from "../kit/linearCalls";
import { CURRENT, DONE, PLAIN, type Paint } from "../kit/paint";
import {
  BAR_UNIT,
  MAX_SLICE_LEN,
  sliceBody,
  slicePage,
  VALUE_RANGE,
} from "../kit/sliceStack";
import { DEFAULT_LIST, run, SRC, type Call, type Vars } from "./trace";

const POOL = [9, 1, 6, 4, 8, 2, 10];

/** `lst[0] if lst[0] > max_num else max_num`, with the values filled in. */
const pick = (a: number, b: number) => `${a} if ${a} > ${b} else ${b}`;

/** Which item of its list a call returned, if the winner came from its own list. */
function winner(call: Call): number | null {
  if (!call.returned || call.lst.length === 0) return null;
  if (call.lst.length === 1) return 0;
  return call.max_num !== null && call.lst[0]! > call.max_num ? 0 : null;
}

function expr(
  calls: readonly LinearCall<number | null>[],
  call: Call,
  i: number,
): CardExpr | undefined {
  if (call.returned && call.max_num !== null) {
    return { before: pick(call.lst[0]!, call.max_num) };
  }
  const hole = callHole(calls, i);
  return hole === undefined ? undefined : { before: "max_num = ", hole };
}

function cards(stack: Vars["stack"]): Card[] {
  // A linear recursion has one call per depth, so the depth names the call.
  const calls: LinearCall<number | null>[] = stack.map((call, depth) => ({
    uid: depth,
    got: known(call.max_num),
    returns: call.returned ? { value: call.returns } : null,
  }));
  return stack.map((call, i) => {
    const won = winner(call);
    const paint = (j: number): Paint =>
      j === won ? DONE : j === 0 && call.max_num !== null ? CURRENT : PLAIN;
    return {
      id: callId(calls[i]!),
      title: "max(lst)",
      locals: localsLine({ max_num: call.max_num }),
      status: cardStatus(calls, i),
      body: sliceBody(callId(calls[i]!), call.lst, i, paint),
      expr: expr(calls, call, i),
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
    caption: "input: the file only defines max, so this page calls max(lst)",
    inputY: 86,
    stackTop: 132,
    height: size.y,
    editor: {
      list: input,
      name: "lst",
      idPrefix: "max-in",
      bars: { unit: BAR_UNIT, range: VALUE_RANGE },
      reorder: true,
      length: {
        range: [0, MAX_SLICE_LEN],
        fill: (lst) => POOL[lst.length % POOL.length]!,
      },
      d,
      draggedId,
      toState: withInput,
    },
    cards: cards(frame.vars.stack),
  });
}

export const recursiveMaxViz = defineViz<ArrInput, Vars>({
  id: "recursive-max-04",
  title: "Recursive max",
  book: "Grokking Algorithms",
  chapter: "4 · Quicksort",
  summary:
    "Find a list's biggest item recursively: a one-item list's biggest is that item; otherwise compare the first item with the biggest of the rest. Each comparison happens as a call returns.",
  drags: [
    "the timeline knob to step through the calls",
    "a purple dot up or down to change which value is biggest",
    "a cell sideways to move the biggest item and see which call picks it",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput: arrInput(DEFAULT_LIST),
  run: (input) => run(input.arr),
  draw,
  diagramHeight: 570,
});
