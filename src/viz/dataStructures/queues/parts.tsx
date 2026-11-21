/**
 * Drawing pieces the queue visualizations share: the column of results
 * beside an operation script, and small labelled value boxes for an
 * object's fields and a method's locals. Pointer tags are kit/tag.tsx.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, optional, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import type { Outcome } from "../kit/outcome";
import { opRowY, type Op } from "../opScript";

/** Advance of one character of the monospace font, per pixel of font size. */
const MONO_ADVANCE = 0.6;

function monoWidth(text: string, size: number): number {
  return text.length * size * MONO_ADVANCE;
}

/** How the column beside the script shows an outcome: `→ 3`, or `ValueError`. */
export function outcomeText(outcome: Outcome): string {
  return outcome.raised ?? `→ ${outcome.text}`;
}

/**
 * Each op's outcome, level with its chip in an `opScript` drawn at the same
 * origin with the same `chipWidth`.
 */
export function opOutcomes(
  ops: readonly Op[],
  outcomes: readonly (Outcome | null)[],
  chipWidth: number,
): Svgx {
  return (
    <g>
      {ops.map((op, i) => {
        const outcome = outcomes[i] ?? null;
        return (
          <g id={uid("outcome", op.id)} transform={translate(chipWidth + 8, opRowY(i))}>
            {outcome !== null &&
              label(outcomeText(outcome), Vec2(0, 0), {
                size: 11,
                mono: true,
                anchor: "start",
                fill: outcome.raised === null ? color.done : color.bad,
                weight: 600,
              })}
          </g>
        );
      })}
    </g>
  );
}

export type FieldStyle = { readonly fill?: string; readonly stroke?: string };

/**
 * A named value: the name as a caption and the value in a box below it,
 * top-left at the local origin. `None` and missing values show faintly.
 */
export function field(
  name: string,
  value: string | null,
  width: number,
  style: FieldStyle = {},
): Svgx {
  return (
    <g>
      {caption(name, Vec2(0, 0))}
      <g transform={translate(0, 10)}>
        {box(width, 26, {
          fill: style.fill ?? (value === null ? color.cellEmpty : color.cell),
          stroke: style.stroke ?? color.cellBorder,
          radius: 5,
        })}
        {label(value ?? "None", Vec2(width / 2, 13), {
          size: 13,
          mono: true,
          fill: value === null ? color.faint : color.ink,
        })}
      </g>
    </g>
  );
}

/** A red banner for the exception being raised, top-left at the origin. */
export function exceptionBanner(text: string): Svgx {
  const w = monoWidth(text, 12) + 24;
  return (
    <g>
      {box(w, 26, { fill: color.badFill, stroke: color.bad, radius: 6 })}
      {label(text, Vec2(12, 13), {
        size: 12,
        mono: true,
        anchor: "start",
        fill: color.bad,
        weight: 600,
      })}
    </g>
  );
}

/**
 * A row of numbered chips for picking one integer from `values`, with the
 * chosen one drawn as a draggable purple knob. `knob` builds the knob from
 * its centre; the caller attaches the drag.
 */
export function pickerTrack(
  values: readonly number[],
  chosen: number,
  chipW: number,
  knob: (at: Vec2) => Svgx,
): Svgx {
  const step = chipW + 4;
  const at = values.indexOf(chosen);
  return (
    <g>
      {values.map((v, i) => (
        <g transform={translate(i * step, 0)}>
          {box(chipW, 22, { fill: color.cellEmpty, stroke: color.rule, radius: 5 })}
          {label(String(v), Vec2(chipW / 2, 11), {
            size: 11,
            mono: true,
            fill: color.muted,
          })}
        </g>
      ))}
      {at >= 0 && knob(Vec2(at * step + chipW / 2, 11))}
    </g>
  );
}

/** The knob drawn by `pickerTrack`: a purple chip showing `text`. */
export function pickerKnob(text: string, chipW: number): Svgx {
  return (
    <g>
      <rect
        transform={translate(-chipW / 2 - 2, -13)}
        width={chipW + 4}
        height={26}
        rx={6}
        fill={color.pointer}
      />
      {label(text, Vec2(0, 0), { size: 12, mono: true, fill: "white", weight: 600 })}
    </g>
  );
}

/** One active call as a stack panel shows it: `fn(args)` and its locals. */
export type CallLine = { readonly call: string; readonly locals: readonly string[] };

/** `name=value` for each local that has a value. */
export function localsOf(
  pairs: readonly (readonly [string, string | undefined])[],
): string[] {
  return pairs.flatMap(([name, value]) =>
    value === undefined ? [] : [`${name}=${value}`],
  );
}

const callLabel = (text: string, innermost: boolean) =>
  label(text, Vec2(0, 0), {
    size: 12,
    mono: true,
    anchor: "start",
    weight: 600,
    fill: innermost ? color.current : color.ink,
  });

const localsLabel = (text: string, at: Vec2) =>
  label(text, at, { size: 12, mono: true, anchor: "start", fill: color.muted });

const noCall = label("(no call running)", Vec2(0, 20), {
  size: 12,
  mono: true,
  anchor: "start",
  fill: color.faint,
});

/**
 * The Python call stack, outermost call first: one indented row per call,
 * its locals after it. Top-left at the local origin; the innermost call is
 * blue.
 */
export function stackPanel(lines: readonly CallLine[]): Svgx {
  return (
    <g>
      {caption("call stack", Vec2(0, 0))}
      {optional("no-call", lines.length === 0 && noCall)}
      {lines.map((line, i) => (
        <g transform={translate(i * 14, 20 + i * 20)}>
          {callLabel(line.call, i === lines.length - 1)}
          {line.locals.length > 0 &&
            localsLabel(line.locals.join(", "), Vec2(monoWidth(line.call, 12) + 14, 0))}
        </g>
      ))}
    </g>
  );
}

/** The same stack for a narrow column: each local on a line of its own. */
export function stackColumn(lines: readonly CallLine[]): Svgx {
  let row = 0;
  return (
    <g>
      {caption("call stack", Vec2(0, 0))}
      {optional("no-call", lines.length === 0 && noCall)}
      {lines.map((line, i) => {
        const top = 18 + row * 15;
        row += 1 + line.locals.length;
        return (
          <g transform={translate(i * 12, top)}>
            {callLabel(line.call, i === lines.length - 1)}
            {line.locals.map((text, j) => localsLabel(text, Vec2(12, 15 * (j + 1))))}
          </g>
        );
      })}
    </g>
  );
}
