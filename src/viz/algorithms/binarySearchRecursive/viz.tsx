import { translate, Vec2, type DragSpecBuilder, type Svgx } from "dragology";
import type { VizState } from "../../../core/stepping";
import { label } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { arrInput, type ArrInput } from "../kit/arrayEdits";
import { localsLine, type Card, type CardExpr } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { CURRENT, DONE, PLAIN, type Paint } from "../kit/paint";
import { MAX_SLICE_LEN, sliceBody, slicePage } from "../kit/sliceStack";
import { stdoutPanel } from "../kit/stdout";
import { BOOK_INPUT, run, SRC, type Call, type Vars } from "./trace";

type Input = ArrInput & { readonly targets: readonly [number, number] };

const INPUT_Y = 116;
const UNIT = 4;
const VALUE_RANGE = [1, 20] as const;
/** Targets 0 to 20: the bars' range, and one below it. */
const TARGETS = Array.from({ length: 21 }, (_, t) => t);

/** The height of a bar of value `v`, and of the line for target `v`. */
const levelY = (v: number) => INPUT_Y - 4 - v * UNIT;

const initialInput: Input = { ...arrInput(BOOK_INPUT.arr), targets: BOOK_INPUT.targets };

const goesLeft = (call: Call) => call.mid !== null && call.arr[call.mid]! > call.target;
const found = (call: Call) => call.mid !== null && call.arr[call.mid] === call.target;

/** Where each call's slice starts in the input list. */
function offsets(stack: readonly Call[]): number[] {
  const result: number[] = [];
  stack.forEach((_, i) => {
    const parent = stack[i - 1];
    const base = result[i - 1] ?? 0;
    result.push(parent === undefined || goesLeft(parent) ? base : base + parent.mid! + 1);
  });
  return result;
}

function expr(stack: Vars["stack"], i: number): CardExpr | undefined {
  const call = stack[i]!;
  if (found(call)) return { before: `arr[${call.mid}] == ${call.target}` };
  const hole = callHole(stack, i);
  if (hole === undefined) return undefined;
  if (goesLeft(call)) return { hole };
  if (call.got !== null && call.got.value === null) return { hole, after: "is None" };
  return { before: `(${call.mid} + 1) + `, hole };
}

function cards(stack: Vars["stack"]): Card[] {
  const at = offsets(stack);
  return stack.map((call, i) => {
    const paint = (j: number): Paint =>
      j !== call.mid ? PLAIN : found(call) ? DONE : CURRENT;
    return {
      id: callId(call),
      title: "binary_search",
      locals: localsLine({ target: call.target, mid: call.mid }),
      status: cardStatus(stack, i),
      body: sliceBody(callId(call), call.arr, at[i]!, paint),
      expr: expr(stack, i),
      ret: returnChip(stack, i),
    };
  });
}

/** The draggable level line for the target of print number `k`. */
function targetLine(
  input: Input,
  k: 0 | 1,
  active: boolean,
  d: DragSpecBuilder<VizState<Input>>,
  withInput: (input: Input) => VizState<Input>,
): Svgx {
  const t = input.targets[k];
  const y = levelY(t);
  const pillX = k === 0 ? 140 : 476;
  const lineEnds = k === 0 ? [180, 452] : [196, 476];
  const id = k === 0 ? "bs-target-1" : "bs-target-2";
  const retarget = (v: number): Input => ({
    ...input,
    targets: k === 0 ? [v, input.targets[1]] : [input.targets[0], v],
  });
  return (
    <g opacity={active ? 1 : 0.55}>
      <line
        x1={lineEnds[0]}
        x2={lineEnds[1]}
        y1={y}
        y2={y}
        stroke={color.pointer}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      <g
        id={id}
        transform={translate(pillX, y)}
        dragologyOnDrag={() => d.closest(TARGETS.map((v) => withInput(retarget(v))))}
        style={{ cursor: "ns-resize" }}
      >
        <rect
          transform={translate(0, -10)}
          width={40}
          height={20}
          rx={10}
          fill={color.pointer}
        />
        {label(String(t), Vec2(20, 0), {
          size: 12,
          mono: true,
          weight: 600,
          fill: "white",
        })}
        {label(k === 0 ? "1st target" : "2nd target", Vec2(k === 0 ? -6 : 46, 0), {
          size: 11,
          fill: color.muted,
          anchor: k === 0 ? "end" : "start",
        })}
      </g>
    </g>
  );
}

function draw({
  frame,
  input,
  size,
  d,
  draggedId,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { stack, stdout } = frame.vars;
  const activeCall = stack.length > 0 ? stdout.length : -1;
  return (
    <g>
      {slicePage({
        caption: "both prints search arr; it stays sorted as you drag",
        inputY: INPUT_Y,
        stackTop: 162,
        height: size.y,
        editor: {
          list: input,
          name: "arr",
          idPrefix: "bs-in",
          bars: { unit: UNIT, range: VALUE_RANGE, sorted: true },
          length: {
            range: [0, MAX_SLICE_LEN],
            fill: (arr) => Math.min(VALUE_RANGE[1], (arr.at(-1) ?? 5) + 1),
          },
          d,
          draggedId,
          toState: (list) => withInput({ ...input, ...list }),
        },
        cards: cards(stack),
      })}
      {targetLine(input, 0, activeCall !== 1, d, withInput)}
      {targetLine(input, 1, activeCall !== 0, d, withInput)}
      {stdoutPanel(stdout, Vec2(600, 14), 140, 120)}
    </g>
  );
}

export const binarySearchRecursiveViz = defineViz<Input, Vars>({
  id: "binary-search-recursive",
  title: "Recursive binary search",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "Binary search as recursion: look at the middle, then call yourself on the half that could hold the target. An index found in a right half is shifted back by (mid + 1) on the way out.",
  drags: [
    "the timeline knob to follow the halves and the index arithmetic on the way back",
    "a purple target pill up or down to search for another value; its dashed line shows which bars it matches",
    "a purple dot on a bar to change a value (it can't pass its neighbours, so arr stays sorted)",
    "the purple ] to make the list shorter or longer",
  ],
  sources: [SRC],
  initialInput,
  run,
  draw,
  diagramHeight: 410,
});
