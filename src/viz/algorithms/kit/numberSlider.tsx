import { translate, Vec2, type DragSpecBuilder, type Svgx } from "dragology";
import { box, caption, label } from "../../../ui/svg";
import { color } from "../../../ui/theme";

export type NumberSliderArgs<S extends object> = {
  /** Element id of the knob. */
  readonly id: string;
  /** Left end of the track. */
  readonly at: Vec2;
  readonly width: number;
  /** The values the knob can rest on, left to right. */
  readonly values: readonly number[];
  readonly value: number;
  readonly d: DragSpecBuilder<S>;
  readonly draggedId: string | null;
  /** The state to switch to if the value became `v`. */
  readonly toState: (v: number) => S;
  /** Shade the values that hit the base case, from `values[0]` to `upTo`. */
  readonly baseCase?: { readonly upTo: number; readonly label: string };
};

const KNOB_W = 34;
const KNOB_H = 22;

/**
 * A number line with a knob for an integer input. The knob floats with the
 * pointer and snaps to the nearest value on drop; while it floats, the rest
 * of the picture already shows the run for that value.
 */
export function numberSlider<S extends object>(args: NumberSliderArgs<S>): Svgx {
  const { values, value, width } = args;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const xOf = (v: number) => Math.max(0, values.indexOf(v)) * step;
  const base = args.baseCase;
  const baseRight = base === undefined ? 0 : xOf(base.upTo) + 16;
  return (
    <g transform={translate(args.at)}>
      {base !== undefined && (
        <g transform={translate(-16, -18)}>
          {box(baseRight + 16, 46, { fill: color.doneFill, stroke: "none", radius: 8 })}
          {caption(base.label, Vec2(0, -12), { fill: color.done })}
        </g>
      )}
      <line
        x1={0}
        x2={width}
        y1={0}
        y2={0}
        stroke={color.rule}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {values.map((v) => (
        <g transform={translate(xOf(v), 0)}>
          <line y1={-5} y2={5} stroke={color.faint} strokeWidth={1.5} />
          {label(String(v), Vec2(0, 20), { size: 11, mono: true, fill: color.muted })}
        </g>
      ))}
      <g
        id={args.id}
        transform={translate(xOf(value), 0)}
        dragologyZIndex={args.draggedId === args.id ? "/1" : 1}
        dragologyOnDrag={() =>
          args.d.closest(values.map((v) => args.toState(v))).withFloating()
        }
        style={{ cursor: "grab" }}
      >
        <rect
          transform={translate(-KNOB_W / 2, -KNOB_H / 2)}
          width={KNOB_W}
          height={KNOB_H}
          rx={KNOB_H / 2}
          fill={color.pointer}
        />
        {label(String(value), Vec2(0, 0), {
          size: 12,
          mono: true,
          weight: 600,
          fill: "white",
        })}
      </g>
    </g>
  );
}
