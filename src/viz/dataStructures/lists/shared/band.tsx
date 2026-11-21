/**
 * The lower band every list-based visualization shares: the editable
 * operation script on the left; on the right the call stack with each
 * active call's locals, a palette holding a value to drag into the
 * structure, and what each op returned (or raised).
 *
 * Everything is drawn in diagram coordinates. The list itself sits above
 * `BAND_Y`.
 */
import {
  translate,
  Vec2,
  type DragSpecBuilder,
  type SetState,
  type Svgx,
} from "dragology";
import type { VizState } from "../../../../core/stepping";
import { caption, label, panel, uid } from "../../../../ui/svg";
import { pyRepr } from "../../../../core/python";
import { color } from "../../../../ui/theme";
import { opScript, opScriptHeight, opText, type Op } from "../../opScript";
import { ARG_RANGE, MAX_OPS, type ScriptInput } from "./edits";
import { isPyFunction } from "../../kit/tracer";
import { isNode } from "./layout";
import type { Call, Echo } from "./tracer";

const BAND_Y = 272;
const SCRIPT_Y = BAND_Y + 16;
/** Tall enough for a full script of `MAX_OPS` chips. */
export const DIAGRAM_HEIGHT = SCRIPT_Y + opScriptHeight(MAX_OPS) + 16;

const SCRIPT_X = 16;
/** Wide enough for `search(lambda x: x == -99)` beside its nudges. */
const SCRIPT_W = 240;
const RIGHT_X = SCRIPT_X + SCRIPT_W + 20;
const RIGHT_W = 744 - RIGHT_X;
const CALLS_W = RIGHT_W - 148;
const TOP_H = 120;
const PALETTE_X = RIGHT_X + CALLS_W + 16;
const PALETTE_W = RIGHT_W - CALLS_W - 16;
const ECHO_Y = BAND_Y + TOP_H + 12;
const ECHO_H = DIAGRAM_HEIGHT - 16 - ECHO_Y;
const LINE = 18;
const CHAR_W = 6.6;

/** Centre of the palette, where the value to drag in sits. */
export const PALETTE_CENTER = Vec2(PALETTE_X + PALETTE_W / 2, BAND_Y + 60);

export type BandArgs<I extends ScriptInput> = {
  readonly prefix: string;
  readonly input: I;
  readonly vars: {
    readonly stack: readonly Call[];
    readonly op: number | null;
    readonly echoes: readonly Echo[];
  };
  readonly d: DragSpecBuilder<VizState<I>>;
  readonly draggedId: string | null;
  readonly setState: SetState<VizState<I>>;
  readonly withInput: (input: I) => VizState<I>;
  /** The draggable value in the palette. */
  readonly chip: Svgx;
  /** One short line under it saying where it can go. */
  readonly hint: string;
};

function localText(name: string, value: unknown): string {
  if (isNode(value)) return `${name}→${pyRepr(value._data)}`;
  if (isPyFunction(value)) return `${name}=${value.source}`;
  return `${name}=${pyRepr(value)}`;
}

function callStack(prefix: string, stack: readonly Call[]): Svgx {
  const innermost = stack.length - 1;
  return (
    <g>
      {panel(Vec2(RIGHT_X, BAND_Y), CALLS_W, TOP_H, "call stack")}
      {stack.map((call, depth) => {
        const y = BAND_Y + 38 + depth * LINE;
        const fill = depth === innermost ? color.pointer : color.muted;
        const locals = Object.entries(call.locals)
          .map(([name, value]) => localText(name, value))
          .join("  ");
        return (
          <g id={uid(prefix, "call", depth)} transform={translate(RIGHT_X + 12, y)}>
            {label(call.fn, Vec2(0, 0), {
              size: 11.5,
              mono: true,
              weight: 600,
              anchor: "start",
              fill,
            })}
            {label(locals, Vec2((call.fn.length + 2) * 6.9, 0), {
              size: 11.5,
              mono: true,
              anchor: "start",
              fill,
            })}
          </g>
        );
      })}
    </g>
  );
}

/** An echo as lines of at most `room` pixels, broken between words. */
function echoLines(echo: Echo, room: number): string[] {
  const text = echo.raised === null ? `→ ${echo.text}` : echo.text;
  const fits = Math.max(1, Math.floor(room / CHAR_W));
  const lines: string[] = [];
  for (const word of text.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= fits) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

function returned(
  prefix: string,
  ops: readonly Op[],
  echoes: readonly Echo[],
  running: string | null,
): Svgx {
  const valueX = 186;
  const room = RIGHT_W - valueX - 12;
  const capacity = Math.floor((ECHO_H - 30) / LINE);
  // The most recent echoes that fit, oldest first, each with its first line.
  const shown: { echo: Echo; op: Op; lines: string[]; top: number }[] = [];
  let used = 0;
  for (let i = echoes.length - 1; i >= 0; i--) {
    const echo = echoes[i]!;
    const op = ops.find((o) => o.id === echo.op);
    if (op === undefined) continue;
    const lines = echoLines(echo, room);
    if (used + lines.length > capacity) break;
    used += lines.length;
    shown.unshift({ echo, op, lines, top: 0 });
  }
  shown.reduce((top, entry) => {
    entry.top = top;
    return top + entry.lines.length;
  }, 0);
  return (
    <g>
      {panel(Vec2(RIGHT_X, ECHO_Y), RIGHT_W, ECHO_H, "returned")}
      {shown.map(({ echo, op, lines, top }) => {
        const y = ECHO_Y + 38 + top * LINE;
        const weight = echo.op === running ? 600 : undefined;
        return (
          <g id={uid(prefix, "echo", echo.op)} transform={translate(RIGHT_X + 12, y)}>
            {label(opText(op), Vec2(0, 0), {
              size: 11,
              mono: true,
              anchor: "start",
              weight,
            })}
            {lines.map((text, k) =>
              label(text, Vec2(valueX - 12, k * LINE), {
                size: 11,
                mono: true,
                anchor: "start",
                weight,
                fill: echo.raised === null ? color.ink : color.bad,
              }),
            )}
          </g>
        );
      })}
    </g>
  );
}

export function band<I extends ScriptInput>(args: BandArgs<I>): Svgx {
  const { prefix, input, vars } = args;
  const running = vars.op === null ? null : (input.ops[vars.op]?.id ?? null);
  return (
    <g>
      <g transform={translate(SCRIPT_X, SCRIPT_Y)}>
        {opScript({
          ops: input.ops,
          current: vars.op,
          d: args.d,
          draggedId: args.draggedId,
          setState: args.setState,
          withOps: (ops) => args.withInput({ ...input, ops }),
          width: SCRIPT_W,
          argRange: ARG_RANGE,
        })}
      </g>
      {callStack(prefix, vars.stack)}
      {panel(Vec2(PALETTE_X, BAND_Y), PALETTE_W, TOP_H, "drag in")}
      {caption(args.hint, Vec2(PALETTE_X + PALETTE_W / 2, BAND_Y + TOP_H - 14), {
        anchor: "middle",
        size: 10.5,
      })}
      {args.chip}
      {returned(prefix, input.ops, vars.echoes, running)}
    </g>
  );
}
