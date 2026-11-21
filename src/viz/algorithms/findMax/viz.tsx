import type { Svgx } from "dragology";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { localsLine, type Card, type CardExpr } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { CURRENT, DONE, PLAIN, type Paint } from "../kit/paint";
import {
  BAR_UNIT,
  MAX_SLICE_LEN,
  sliceBody,
  slicePage,
  VALUE_RANGE,
} from "../kit/sliceStack";
import { DEFAULT_ARR, run, SRC, type Call, type Vars } from "./trace";

const POOL = [6, 1, 9, 4, 7, 2, 10];

/** `a if a > b else b`, with the values filled in. */
const pick = (a: number, b: number) => `${a} if ${a} > ${b} else ${b}`;

/** Which item of its slice a call returned, if the winner came from its own slice. */
function winner(call: Call): number | null {
  if (call.returns === null) return null;
  const [a, b] = call.arr;
  if (call.arr.length === 1) return 0;
  if (call.arr.length === 2) return a! > b! ? 0 : 1;
  if (call.sub_max !== null && a! > call.sub_max) return 0;
  return null;
}

function expr(stack: Vars["stack"], i: number): CardExpr | undefined {
  const call = stack[i]!;
  const [a, b] = call.arr;
  if (call.returns !== null && call.arr.length === 2) return { before: pick(a!, b!) };
  if (call.returns !== null && call.sub_max !== null) {
    return { before: pick(a!, call.sub_max) };
  }
  const hole = callHole(stack, i);
  return hole === undefined ? undefined : { before: "sub_max = ", hole };
}

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => {
    const won = winner(call);
    const paint = (j: number): Paint =>
      j === won ? DONE : j === 0 && call.got !== null ? CURRENT : PLAIN;
    return {
      id: callId(call),
      title: "find_max(arr)",
      locals: localsLine({ sub_max: call.sub_max }),
      status: cardStatus(stack, i),
      body: sliceBody(callId(call), call.arr, i, paint),
      expr: expr(stack, i),
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
    caption: "input: the file never calls find_max, so this page calls find_max(arr)",
    inputY: 86,
    stackTop: 132,
    height: size.y,
    editor: {
      list: input,
      name: "arr",
      idPrefix: "max-in",
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

export const findMaxViz = defineViz<ArrInput, Vars>({
  id: "find-max",
  title: "Recursive max",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "find_max(arr) compares the first item with the largest of the rest, found by calling itself on arr[1:]. Lists of two or fewer are answered directly.",
  drags: [
    "the timeline knob to watch sub_max come back down and get compared",
    "a purple dot up or down to change a value",
    "a cell sideways to move the largest item and see which call picks it",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput: arrInput(DEFAULT_ARR),
  run,
  draw,
});
