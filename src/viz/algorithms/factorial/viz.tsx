import { Vec2, type Svgx } from "dragology";
import { label } from "../../../ui/svg";
import { defineViz, type DrawArgs } from "../../defineViz";
import { callStack, type Card, type StackLayout } from "../kit/callStack";
import { callHole, callId, cardStatus, returnChip } from "../kit/linearCalls";
import { numberSlider } from "../kit/numberSlider";
import { stdoutPanel } from "../kit/stdout";
import { INITIAL_INPUT, run, SRC, type Input, type Vars } from "./trace";

/** fact(x) only stops at x == 1, so smaller inputs would recurse forever. */
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8];
const SLIDER_X = 80;
const SLIDER_STEP = 44;
const SLIDER_Y = 44;

const STACK_TOP = 100;
const STACK: StackLayout = { width: 470, cardHeight: 40, gap: 6, exprX: 170 };

function cards(stack: Vars["stack"]): Card[] {
  return stack.map((call, i) => {
    const hole = callHole(stack, i);
    return {
      id: callId(call),
      title: `fact(x=${call.x})`,
      status: cardStatus(stack, i),
      expr: hole === undefined ? undefined : { before: `${call.x} * `, hole },
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
      {label("x =", Vec2(SLIDER_X - 30, SLIDER_Y), {
        size: 13,
        mono: true,
        anchor: "end",
      })}
      {numberSlider({
        id: "fact-x",
        at: Vec2(SLIDER_X, SLIDER_Y),
        width: (VALUES.length - 1) * SLIDER_STEP,
        values: VALUES,
        value: input.x,
        d,
        draggedId,
        toState: (x) => withInput({ x }),
        baseCase: { upTo: 1, label: "base case: x == 1" },
      })}
      {callStack(cards(stack), Vec2(20, STACK_TOP), stackHeight, STACK)}
      {stdoutPanel(stdout, Vec2(510, STACK_TOP + 6), 230, stackHeight - 12)}
    </g>
  );
}

export const factorialViz = defineViz<Input, Vars>({
  id: "factorial",
  title: "Factorial",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "fact(x) is x * fact(x - 1), so each call must wait for the one above it. The stack piles up to fact(1), then the products flow back down it.",
  drags: [
    "the timeline knob to watch each return value slide down into the call waiting for it",
    "the purple x knob to take the factorial of another number",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
});
