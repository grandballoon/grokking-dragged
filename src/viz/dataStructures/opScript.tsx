/**
 * An operation script: the sequence of method calls a data-structure demo
 * runs, like `insert(8)`, `insert_edge(1, 2)`, `delete(8)`. It is the input
 * of most data-structure visualizations. Each call is a chip that can be
 * dragged to reorder the script, and each of its numeric arguments can be
 * nudged with its own − and +; the structure is rebuilt from the edited
 * script immediately.
 */
import {
  translate,
  Vec2,
  type DragSpecBuilder,
  type SetState,
  type Svgx,
} from "dragology";
import type { VizState } from "../../core/stepping";
import { box, caption, label, uid } from "../../ui/svg";
import { color } from "../../ui/theme";

export type Op = {
  /** Stable identity, so a chip keeps its id while it is dragged. */
  readonly id: string;
  /** The method name, as in the Python. */
  readonly name: string;
  /** The call's numeric arguments, in order. */
  readonly args: readonly number[];
  /**
   * How the call reads in the script, with `{0}`, `{1}`, ... standing for
   * its arguments: `a[{0}] = {1}`, `list(bag)`. By default `name(arg, ...)`.
   */
  readonly label?: string;
};

/** One call of a script: the method name, then its arguments. */
export type Call = readonly [name: string, ...args: number[]];

/** Build a script from calls, numbering the ids. */
export function script(...calls: readonly Call[]): Op[] {
  return calls.map(([name, ...args], i) => ({ id: `op${i}`, name, args }));
}

/** The ops with the label given for their method name, if any. */
export function withLabels(
  ops: readonly Op[],
  labels: Readonly<Record<string, string>>,
): Op[] {
  return ops.map((op) => {
    const text = labels[op.name];
    return text === undefined ? op : { ...op, label: text };
  });
}

export function opText(op: Op): string {
  if (op.label === undefined) return `${op.name}(${op.args.join(", ")})`;
  return op.label.replace(/\{(\d+)\}/g, (_, k: string) => String(op.args[Number(k)]));
}

/** Move the item at `from` to position `to`. */
export function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const result = items.filter((_, i) => i !== from);
  result.splice(to, 0, items[from]!);
  return result;
}

/** The script with argument `position` of op `index` set to `value`. */
export function withArg(
  ops: readonly Op[],
  index: number,
  position: number,
  value: number,
): Op[] {
  return ops.map((op, i) =>
    i === index
      ? { ...op, args: op.args.map((a, k) => (k === position ? value : a)) }
      : op,
  );
}

/**
 * Where op `i` can be dragged to: every position that leaves each locked op
 * where it is.
 */
export function reorderTargets(
  ops: readonly Op[],
  i: number,
  locked: (op: Op) => boolean = () => false,
): number[] {
  return ops
    .map((_, j) => j)
    .filter((j) =>
      reorder(ops, i, j).every((op, k) => !locked(op) || op.id === ops[k]!.id),
    );
}

export type ArgRange = readonly [number, number];

export type OpScriptArgs<I> = {
  readonly ops: readonly Op[];
  /** Index of the op the current frame is inside, or null before the first. */
  readonly current: number | null;
  readonly d: DragSpecBuilder<VizState<I>>;
  readonly draggedId: string | null;
  readonly setState: SetState<VizState<I>>;
  /** The state to switch to if the script became `ops`. */
  readonly withOps: (ops: readonly Op[]) => VizState<I>;
  readonly width?: number;
  readonly title?: string;
  /** Clamp nudged arguments to this range, or to one range per argument position. */
  readonly argRange?: ArgRange | readonly ArgRange[];
  /** Ops the page sets up itself: they can't be dragged or nudged, and stay put. */
  readonly locked?: (op: Op) => boolean;
  /** Whether arguments get − and + nudges; off when the page edits them some other way. */
  readonly nudges?: boolean;
};

/** Distance between the tops of two consecutive chips. */
export const OP_ROW = 30;
export const OP_CHIP_H = 24;
/** Top of the first chip, below the script's title. */
export const OP_FIRST_TOP = 14;

/** The vertical centre of chip `i`, relative to the script's origin. */
export function opRowY(i: number): number {
  return OP_FIRST_TOP + i * OP_ROW + OP_CHIP_H / 2;
}

/** The height of a script of `count` chips, title included. */
export function opScriptHeight(count: number): number {
  return OP_FIRST_TOP + (count - 1) * OP_ROW + OP_CHIP_H;
}

const DEFAULT_RANGE: ArgRange = [-99, 99];
/** Horizontal space one argument's pair of nudges takes. */
const NUDGE_PAIR = 46;

function rangeFor(range: OpScriptArgs<unknown>["argRange"], position: number): ArgRange {
  if (range === undefined) return DEFAULT_RANGE;
  if (typeof range[0] === "number") return range as ArgRange;
  return (range as readonly ArgRange[])[position] ?? DEFAULT_RANGE;
}

/** The script as a column of chips, its top-left at the local origin. */
export function opScript<I>(args: OpScriptArgs<I>): Svgx {
  const { ops, current, d, draggedId, setState, withOps } = args;
  const width = args.width ?? 150;
  const locked = args.locked ?? (() => false);

  return (
    <g>
      {caption(args.title ?? "script", Vec2(0, 0))}
      {ops.map((op, i) => {
        const id = uid("op", op.id);
        const done = current !== null && i < current;
        const active = current === i;
        const fixed = locked(op);
        const nudge = (position: number, delta: number, at: number, glyph: string) => {
          const [lo, hi] = rangeFor(args.argRange, position);
          const next = Math.min(hi, Math.max(lo, op.args[position]! + delta));
          return (
            <g
              transform={translate(at, OP_CHIP_H / 2)}
              style={{ cursor: "pointer" }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                setState(withOps(withArg(ops, i, position, next)), { transition: false })
              }
            >
              <circle r={8} fill={color.cellEmpty} />
              {label(glyph, Vec2(0, -0.5), { size: 12, fill: color.muted })}
            </g>
          );
        };
        const nudges =
          args.nudges === false || fixed
            ? []
            : op.args.flatMap((_, k) => {
                const plus = width - 14 - (op.args.length - 1 - k) * NUDGE_PAIR;
                return [nudge(k, -1, plus - 20, "−"), nudge(k, 1, plus, "+")];
              });
        return (
          <g
            id={id}
            transform={translate(0, OP_FIRST_TOP + i * OP_ROW)}
            dragologyZIndex={draggedId === id ? "/1" : 1}
            dragologyOnDrag={
              fixed
                ? undefined
                : () =>
                    d
                      .closest(
                        reorderTargets(ops, i, locked).map((j) =>
                          withOps(reorder(ops, i, j)),
                        ),
                      )
                      .withFloating()
            }
            style={fixed ? undefined : { cursor: "grab" }}
          >
            {box(width, OP_CHIP_H, {
              radius: 6,
              fill: active ? color.currentFill : done ? color.visitedFill : color.cell,
              stroke: active
                ? color.current
                : done
                  ? color.visited
                  : fixed
                    ? color.rule
                    : color.cellBorder,
            })}
            {label(opText(op), Vec2(10, OP_CHIP_H / 2), {
              size: 12,
              mono: true,
              anchor: "start",
              fill: done ? color.muted : color.ink,
              weight: active ? 600 : undefined,
            })}
            {nudges}
          </g>
        );
      })}
    </g>
  );
}
