/**
 * The call stack, drawn the way the book draws it: one card per active call,
 * the outermost at the bottom and the running call on top.
 *
 * A card names the call, lists its locals, and can show the expression the
 * call is waiting to finish (`5 * ?`). When a call returns, its value is a
 * chip on its card; the caller's card shows a chip with the same id where the
 * `?` was, so stepping forward slides the value down into the caller.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { pyRepr } from "../../../core/python";
import { box, caption, label, optional } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { chipWidth, monoWidth } from "./measure";
import { CURRENT, DONE, PENDING, type Paint } from "./paint";

/** running: the call executing now. waiting: paused on a call above it. returning: about to be popped. */
export type CardStatus = "running" | "waiting" | "returning";

/** A value with an identity, so it can travel from one card to another. */
export type ValueChip = { readonly id: string; readonly text: string };

/** The part of an expression a call is waiting on: still pending, or its value. */
export type Hole = { readonly pending: string } | { readonly value: ValueChip };

/** An expression shown on a card: text, then an optional hole, then text. */
export type CardExpr = {
  readonly before?: string;
  readonly hole?: Hole;
  readonly after?: string;
};

export type Card = {
  /** Stable for the whole life of the call. */
  readonly id: string;
  readonly title: string;
  readonly locals?: string;
  readonly status: CardStatus;
  readonly expr?: CardExpr;
  /** The value this call returns, once it does. */
  readonly ret?: ValueChip;
  /** Extra drawing in card coordinates, e.g. the slice a call works on. */
  readonly body?: Svgx;
};

export type StackLayout = {
  readonly width: number;
  readonly cardHeight: number;
  readonly gap: number;
  /** Card-local x where the expression starts. */
  readonly exprX: number;
};

/**
 * A card's locals line, `name = value, ...`, leaving out locals that aren't
 * assigned yet (null); undefined if none are.
 */
export function localsLine(
  locals: Readonly<Record<string, unknown>>,
): string | undefined {
  const parts = Object.entries(locals)
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `${name} = ${pyRepr(value)}`);
  return parts.length === 0 ? undefined : parts.join(", ");
}

const EXPR_SIZE = 12;
const CHIP_H = 22;

/** Width of a value chip, or of a pending hole, holding `text`. */
const holeWidth = (text: string) => Math.max(30, chipWidth(text, EXPR_SIZE));

const STATUS_PAINT: Record<CardStatus, Paint> = {
  running: CURRENT,
  waiting: PENDING,
  returning: DONE,
};

/** A value chip with its left edge at `x`, vertically centred on `cy`. */
function valueChip(chip: ValueChip, x: number, cy: number): Svgx {
  const w = holeWidth(chip.text);
  return (
    <g id={chip.id} transform={translate(x, cy - CHIP_H / 2)}>
      {box(w, CHIP_H, { fill: color.panel, stroke: color.done, radius: 11 })}
      {label(chip.text, Vec2(w / 2, CHIP_H / 2), {
        size: EXPR_SIZE,
        mono: true,
        weight: 600,
        fill: color.done,
      })}
    </g>
  );
}

function pendingHole(text: string, x: number, cy: number): Svgx {
  const w = holeWidth(text);
  return (
    <g transform={translate(x, cy - CHIP_H / 2)}>
      {box(w, CHIP_H, {
        fill: color.panel,
        stroke: color.pending,
        dash: "4 3",
        radius: 11,
      })}
      {label(text, Vec2(w / 2, CHIP_H / 2), {
        size: EXPR_SIZE,
        mono: true,
        fill: color.pending,
      })}
    </g>
  );
}

function expression(expr: CardExpr, x: number, cy: number): Svgx {
  const before = expr.before ?? "";
  const holeX = x + monoWidth(before, EXPR_SIZE);
  const holeW =
    expr.hole === undefined
      ? 0
      : holeWidth("pending" in expr.hole ? expr.hole.pending : expr.hole.value.text);
  const text = (t: string, at: number) =>
    label(t, Vec2(at, cy), { size: EXPR_SIZE, mono: true, anchor: "start" });
  const hole = expr.hole;
  return (
    <g>
      {optional("before", before !== "" && text(before, x))}
      {optional(
        "pending",
        hole !== undefined && "pending" in hole && pendingHole(hole.pending, holeX, cy),
      )}
      {optional(
        "value",
        hole !== undefined && "value" in hole && valueChip(hole.value, holeX, cy),
      )}
      {optional("after", expr.after !== undefined && text(expr.after, holeX + holeW + 4))}
    </g>
  );
}

function card(c: Card, y: number, layout: StackLayout): Svgx {
  const { width: w, cardHeight: h } = layout;
  const cy = h / 2;
  const retW = c.ret === undefined ? 0 : holeWidth(c.ret.text);
  return (
    <g id={c.id} transform={translate(0, y)}>
      {box(w, h, {
        ...STATUS_PAINT[c.status],
        radius: 8,
        strokeWidth: c.status === "running" ? 2 : 1.5,
      })}
      {label(c.title, Vec2(12, c.locals ? cy - 8 : cy), {
        size: 12.5,
        mono: true,
        weight: 600,
        anchor: "start",
      })}
      {optional(
        "locals",
        c.locals !== undefined &&
          label(c.locals, Vec2(12, cy + 8), {
            size: 11,
            mono: true,
            fill: color.muted,
            anchor: "start",
          }),
      )}
      {optional("body", c.body)}
      {optional("expr", c.expr !== undefined && expression(c.expr, layout.exprX, cy))}
      {optional(
        "ret",
        c.ret !== undefined && (
          <g>
            {label("→", Vec2(w - 10 - retW - 8, cy), {
              size: 13,
              fill: color.done,
              anchor: "end",
            })}
            {valueChip(c.ret, w - 10 - retW, cy)}
          </g>
        ),
      )}
    </g>
  );
}

/**
 * The stack inside the region whose top-left is `at`: a caption at the top,
 * cards piled up from the bottom of the region, outermost call first.
 */
export function callStack(
  cards: readonly Card[],
  at: Vec2,
  height: number,
  layout: StackLayout,
): Svgx {
  const pitch = layout.cardHeight + layout.gap;
  return (
    <g transform={translate(at)}>
      {caption("call stack", Vec2(0, 6))}
      <line
        x1={0}
        x2={layout.width}
        y1={height + 3}
        y2={height + 3}
        stroke={color.rule}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {cards.map((c, i) => card(c, height - (i + 1) * pitch + layout.gap, layout))}
    </g>
  );
}
