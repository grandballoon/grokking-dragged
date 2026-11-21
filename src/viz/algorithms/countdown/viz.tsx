import { Vec2, type Svgx } from "dragology";
import { label } from "../../../ui/svg";
import { defineViz, type DrawArgs } from "../../defineViz";
import { callStack, type Card, type StackLayout } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { numberSlider } from "../kit/numberSlider";
import { stdoutPanel } from "../kit/stdout";
import { INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

const VALUES = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const SLIDER_X = 80;
const SLIDER_STEP = 36;
const SLIDER_Y = 44;

const STACK_TOP = 100;
const STACK: StackLayout = { width: 470, cardHeight: 36, gap: 6, exprX: 190 };

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => {
    const hole = callHole(stack, i);
    return {
      id: callId(call),
      title: `countdown(i=${call.i})`,
      status: cardStatus(stack, i),
      expr: hole === undefined ? undefined : { before: "return ", hole },
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
}: DrawArgs<Input, Vars>): Svgx {
  const { stack, stdout } = frame.vars;
  const stackHeight = size.y - STACK_TOP - 16;
  return (
    <g>
      {label("i =", Vec2(SLIDER_X - 30, SLIDER_Y), {
        size: 13,
        mono: true,
        anchor: "end",
      })}
      {numberSlider({
        id: "countdown-i",
        at: Vec2(SLIDER_X, SLIDER_Y),
        width: (VALUES.length - 1) * SLIDER_STEP,
        values: VALUES,
        value: input.i,
        d,
        draggedId,
        toState: (i) => withInput({ i }),
        baseCase: { upTo: 0, label: "base case: i <= 0" },
      })}
      {callStack(cards(stack), Vec2(20, STACK_TOP), stackHeight, STACK)}
      {stdoutPanel(stdout, Vec2(510, STACK_TOP + 6), 230, stackHeight - 12)}
    </g>
  );
}

export const countdownViz = defineViz<Input, Vars>({
  id: "countdown",
  title: "Countdown",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "A function that calls itself: countdown prints i, then hands i - 1 to a fresh call of itself, until the base case i <= 0 stops the recursion.",
  drags: [
    "the timeline knob to watch the stack grow and unwind",
    "the purple i knob to count down from another number; at 0 or below the base case hits at once",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
});
