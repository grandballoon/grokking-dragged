import {
  translate,
  Vec2,
  type DragSpecBuilder,
  type SetState,
  type Svgx,
} from "dragology";
import { stepBy, type VizState } from "../core/stepping";
import { label } from "./svg";
import { color } from "./theme";

const BUTTON = 30;

/**
 * The timeline of the trace. Its knob is dragged with `d.between` over every
 * step, so mid-drag Dragology blends the whole picture between neighbouring
 * steps of the algorithm: values slide into their new slots, the code
 * highlight glides to the next line.
 */
export function scrubber<I>(
  state: VizState<I>,
  frameCount: number,
  d: DragSpecBuilder<VizState<I>>,
  setState: SetState<VizState<I>>,
  width: number,
): Svgx {
  const trackStart = BUTTON * 2 + 24;
  const trackEnd = width - 96;
  const trackLen = trackEnd - trackStart;
  const xOf = (i: number) =>
    trackStart + (frameCount <= 1 ? 0 : (i * trackLen) / (frameCount - 1));
  const knobX = xOf(state.step);
  const steps = Array.from({ length: frameCount }, (_, i) => ({ ...state, step: i }));

  const button = (at: number, glyph: string, delta: number, id: string) => {
    const enabled = delta < 0 ? state.step > 0 : state.step < frameCount - 1;
    return (
      <g
        id={id}
        transform={translate(at, 0)}
        style={{ cursor: enabled ? "pointer" : "default" }}
        onClick={() => enabled && setState(stepBy(state, delta, frameCount))}
      >
        <rect
          width={BUTTON}
          height={BUTTON}
          rx={7}
          fill={color.panel}
          stroke={color.panelBorder}
          transform={translate(0, -BUTTON / 2)}
        />
        {label(glyph, Vec2(BUTTON / 2, 0), {
          size: 13,
          fill: enabled ? color.ink : color.faint,
        })}
      </g>
    );
  };

  return (
    <g>
      {button(0, "◀", -1, "scrub-prev")}
      {button(BUTTON + 8, "▶", 1, "scrub-next")}
      <line
        x1={trackStart}
        x2={trackEnd}
        y1={0}
        y2={0}
        stroke={color.rule}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {frameCount <= 160 && (
        <path
          d={steps.map((_, i) => `M ${xOf(i)} -6 V 6`).join(" ")}
          stroke={color.faint}
          strokeWidth={1}
          opacity={0.7}
        />
      )}
      <line
        x1={trackStart}
        x2={knobX}
        y1={0}
        y2={0}
        stroke={color.current}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <g
        id="scrub-knob"
        dragologyZIndex="/1"
        transform={translate(knobX, 0)}
        dragologyOnDrag={() => d.between(steps)}
        style={{ cursor: "grab" }}
      >
        <circle r={16} fill="transparent" />
        <circle r={9} fill={color.panel} stroke={color.current} strokeWidth={3} />
      </g>
      {label(`step ${state.step + 1} / ${frameCount}`, Vec2(width, 0), {
        size: 12,
        fill: color.muted,
        anchor: "end",
        mono: true,
      })}
    </g>
  );
}
