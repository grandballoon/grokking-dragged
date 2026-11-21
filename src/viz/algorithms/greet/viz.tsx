import { pyRepr } from "../../../core/python";
import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { callStack, type Card, type StackLayout } from "../kit/callStack";
import { callId, cardStatus, returnChip } from "../kit/linearCalls";
import { stdoutPanel } from "../kit/stdout";
import { INITIAL_INPUT, run, SRC, type Call, type Input, type Vars } from "./trace";

const NAMES = ["adit", "maggie", "jonny", "peggy"];
const CHIP_W = 90;
const CHIP_H = 28;
const ROW_Y = 30;
const SLOT_X = 84;
const PALETTE_X = 250;
const PALETTE_PITCH = 104;

const STACK_TOP = 100;
const STACK: StackLayout = { width: 400, cardHeight: 44, gap: 6, exprX: 190 };

/** How the call `above` reads in its caller's body: `greet2(name)`, `bye()`. */
const callText = (above: Call) => `${above.fn}(${above.name === null ? "" : "name"})`;

function cards({ stack }: Vars): Card[] {
  return stack.map((call, i) => {
    const above = stack[i + 1];
    return {
      id: callId(call),
      title:
        call.name === null ? `${call.fn}()` : `${call.fn}(name=${pyRepr(call.name)})`,
      status: cardStatus(stack, i),
      expr: above === undefined ? undefined : { before: `paused at ${callText(above)}` },
      ret: returnChip(stack, i),
    };
  });
}

function nameChip(name: string, draggable: boolean): Svgx {
  return (
    <g>
      {box(CHIP_W, CHIP_H, {
        fill: color.panel,
        stroke: draggable ? color.pointer : color.cellBorder,
        radius: CHIP_H / 2,
      })}
      {label(pyRepr(name), Vec2(CHIP_W / 2, CHIP_H / 2), {
        size: 13,
        mono: true,
        fill: draggable ? color.pointer : color.ink,
      })}
    </g>
  );
}

function draw({
  frame,
  input,
  state,
  size,
  d,
  draggedId,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const rowMid = ROW_Y + CHIP_H / 2;
  const stackHeight = size.y - STACK_TOP - 16;
  return (
    <g>
      {label("greet(", Vec2(20, rowMid), { size: 14, mono: true, anchor: "start" })}
      {label(")", Vec2(SLOT_X + CHIP_W + 4, rowMid), {
        size: 14,
        mono: true,
        anchor: "start",
      })}
      {caption("names", Vec2(PALETTE_X, 14))}
      {NAMES.map((name, k) => {
        const id = uid("greet-name", name);
        const chosen = name === input.name;
        const home = Vec2(PALETTE_X + k * PALETTE_PITCH, ROW_Y);
        return (
          <g>
            <g transform={translate(home)}>
              {box(CHIP_W, CHIP_H, {
                fill: "none",
                stroke: color.rule,
                dash: "4 3",
                radius: CHIP_H / 2,
              })}
            </g>
            <g
              id={id}
              transform={translate(chosen ? Vec2(SLOT_X, ROW_Y) : home)}
              dragologyZIndex={draggedId === id ? "/1" : 1}
              dragologyOnDrag={
                chosen
                  ? undefined
                  : () => d.closest([state, withInput({ name })]).withFloating()
              }
              style={chosen ? undefined : { cursor: "grab" }}
            >
              {nameChip(name, !chosen)}
            </g>
          </g>
        );
      })}
      {callStack(cards(frame.vars), Vec2(20, STACK_TOP), stackHeight, STACK)}
      {stdoutPanel(frame.vars.stdout, Vec2(440, STACK_TOP + 6), 300, stackHeight - 12)}
    </g>
  );
}

export const greetViz = defineViz<Input, Vars>({
  id: "greet",
  title: "Greet",
  book: "Grokking Algorithms",
  chapter: "3 · Recursion",
  summary:
    "The call stack without recursion: greet calls greet2, then bye. Each call goes on top of the stack, and greet waits, paused half-way, until the call above it returns.",
  drags: [
    "the timeline knob to watch calls go on and come off the stack",
    "a name into the greet( ) slot to greet someone else",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
  diagramHeight: 360,
});
