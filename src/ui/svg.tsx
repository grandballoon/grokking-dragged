/**
 * Small SVG building blocks for diagrams.
 *
 * These are plain functions returning JSX, never React components: Dragology
 * only interpolates, layers and measures elements it can see, and it treats a
 * component as opaque. Positions always go in `transform`, never `x`/`y`, for
 * the same reason.
 */
import { translate, Vec2, type DragSpecBrand, type Svgx } from "dragology";
import { color, font } from "./theme";

/**
 * A Dragology element id built from parts. Ids must be unique across the
 * whole SVG and may not contain slashes, so anything outside a safe set of
 * characters is replaced.
 */
export function uid(...parts: (string | number)[]): string {
  return parts.map((p) => String(p).replace(/[^A-Za-z0-9_-]/g, "_")).join("-");
}

export type TextOptions = {
  size?: number;
  fill?: string;
  weight?: number | "bold";
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  id?: string;
  opacity?: number;
  italic?: boolean;
};

/**
 * A part of a drawing that is only there on some steps. Dragology matches
 * unkeyed siblings by position, so a part that comes and goes would shift
 * the siblings after it and make it blend with the wrong element (and throw
 * when the types differ). Pinning it with a `dragologyKey` keeps everyone
 * matched with themselves. `key` must be unique among its siblings.
 */
export function optional(
  key: string,
  content: Svgx | false | null | undefined,
): Svgx | null {
  return content ? <g dragologyKey={key}>{content}</g> : null;
}

/** A single line of text whose anchor point sits at `at`, vertically centred. */
export function label(text: string, at: Vec2, opts: TextOptions = {}): Svgx {
  return (
    <text
      id={opts.id}
      transform={translate(at)}
      fontFamily={opts.mono ? font.mono : font.ui}
      fontSize={opts.size ?? 13}
      fontWeight={opts.weight}
      fontStyle={opts.italic ? "italic" : undefined}
      fill={opts.fill ?? color.ink}
      opacity={opts.opacity}
      textAnchor={opts.anchor ?? "middle"}
      dominantBaseline="central"
    >
      {text}
    </text>
  );
}

export type BoxOptions = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  dash?: string;
  opacity?: number;
};

/** A rectangle with its top-left corner at the local origin. */
export function box(w: number, h: number, opts: BoxOptions = {}): Svgx {
  return (
    <rect
      width={w}
      height={h}
      rx={opts.radius ?? 6}
      fill={opts.fill ?? color.cell}
      stroke={opts.stroke ?? color.cellBorder}
      strokeWidth={opts.strokeWidth ?? 1.5}
      strokeDasharray={opts.dash}
      opacity={opts.opacity}
    />
  );
}

export type CellOptions = BoxOptions & {
  id?: string;
  text?: string;
  textOptions?: TextOptions;
  onDrag?: () => DragSpecBrand;
  zIndex?: number | string | false;
  cursor?: string;
};

/** A labelled box, positioned by its top-left corner. */
export function cell(at: Vec2, w: number, h: number, opts: CellOptions = {}): Svgx {
  return (
    <g
      id={opts.id}
      transform={translate(at)}
      dragologyOnDrag={opts.onDrag}
      dragologyZIndex={opts.id ? opts.zIndex : undefined}
      style={opts.onDrag || opts.cursor ? { cursor: opts.cursor ?? "grab" } : undefined}
    >
      {box(w, h, opts)}
      {opts.text !== undefined &&
        label(opts.text, Vec2(w / 2, h / 2), {
          size: 15,
          mono: true,
          ...opts.textOptions,
        })}
    </g>
  );
}

export type ArrowOptions = {
  stroke?: string;
  width?: number;
  dash?: string;
  /** Pull both ends in by this much, e.g. a node's radius. */
  inset?: number;
  insetEnd?: number;
  head?: number;
  opacity?: number;
  /** Bend the arrow sideways by this many pixels at its midpoint. */
  bend?: number;
  id?: string;
};

/**
 * An arrow from `a` to `b`. Drawn with path data rather than a transform, so
 * mid-interpolation its ends move in straight lines with whatever they are
 * attached to.
 */
export function arrow(a: Vec2, b: Vec2, opts: ArrowOptions = {}): Svgx {
  const dir = b.sub(a);
  const len = dir.len();
  const stroke = opts.stroke ?? color.muted;
  if (len < 1e-6) return <g id={opts.id} />;
  const unit = dir.div(len);
  const start = a.add(unit.mul(opts.inset ?? 0));
  const end = b.sub(unit.mul(opts.insetEnd ?? opts.inset ?? 0));
  const head = opts.head ?? 8;
  const bend = opts.bend ?? 0;
  const control = start.mid(end).add(unit.perp().mul(bend));
  const tangent = (bend === 0 ? end.sub(start) : end.sub(control)).norm();
  const tip = end;
  const base = tip.sub(tangent.mul(head));
  const wing = tangent.perp().mul(head * 0.45);
  const shaftEnd = tip.sub(tangent.mul(head * 0.7));
  const d =
    bend === 0
      ? `M ${start.str(" ")} L ${shaftEnd.str(" ")}`
      : `M ${start.str(" ")} Q ${control.str(" ")} ${shaftEnd.str(" ")}`;
  return (
    <g id={opts.id} opacity={opts.opacity}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={opts.width ?? 1.6}
        strokeDasharray={opts.dash}
      />
      <path
        d={`M ${tip.str(" ")} L ${base.add(wing).str(" ")} L ${base.sub(wing).str(" ")} Z`}
        fill={stroke}
      />
    </g>
  );
}

/** A small caption above a region, like "search_queue". */
export function caption(text: string, at: Vec2, opts: TextOptions = {}): Svgx {
  return label(text, at, {
    size: 12,
    fill: color.muted,
    anchor: "start",
    mono: true,
    ...opts,
  });
}

/** A rounded panel that groups part of a diagram, with an optional title. */
export function panel(at: Vec2, w: number, h: number, title?: string): Svgx {
  return (
    <g transform={translate(at)}>
      {box(w, h, {
        fill: color.panel,
        stroke: color.panelBorder,
        radius: 10,
        strokeWidth: 1,
      })}
      {title !== undefined && caption(title, Vec2(12, 16))}
    </g>
  );
}
