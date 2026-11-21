/**
 * An editable Python list literal, the input of every page whose program
 * takes a list of numbers: `[ 5 3 6 2 10 ]` as a row of cells, optionally
 * with a bar over each cell whose height is its value.
 *
 * - Drag a cell sideways to move it (when `reorder` is on).
 * - Drag the purple dot on top of a bar up or down to change that value.
 * - Drag the purple `]` sideways to make the list shorter or longer.
 */
import { translate, Vec2, type DragSpecBuilder, type Svgx } from "dragology";
import { box, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { PLAIN, type Paint } from "./paint";
import { reorders, resized, valueChoices, withValue, type ArrInput } from "./arrayEdits";

export type ArrayGeometry = {
  /** Top-left corner of cell 0. */
  readonly at: Vec2;
  /** Distance between the left edges of neighbouring cells. */
  readonly pitch: number;
  readonly cellW: number;
  readonly cellH: number;
};

export type ArrayEditorArgs<S extends object> = ArrayGeometry & {
  readonly list: ArrInput;
  /** The Python name of the list, shown as `name =` in front of it. */
  readonly name?: string;
  /** Prefix for every element id, unique within the page. */
  readonly idPrefix: string;
  readonly bars?: {
    /** Pixels of bar per unit of value. */
    readonly unit: number;
    readonly range: readonly [number, number];
    /** Keep the list sorted while values are dragged. */
    readonly sorted?: boolean;
  };
  readonly reorder?: boolean;
  /** How to paint cell `i`; plain where undefined. */
  readonly paint?: (i: number) => Paint | undefined;
  readonly length?: {
    readonly range: readonly [number, number];
    /** The value appended when the list grows, given the list so far. */
    readonly fill: (values: readonly number[]) => number;
  };
  readonly d: DragSpecBuilder<S>;
  readonly draggedId: string | null;
  /** The state to switch to if the input list became `list`. */
  readonly toState: (list: ArrInput) => S;
};

const BAR_GAP = 4;

/** Left edge of cell `i`. */
export function cellX(g: ArrayGeometry, i: number): number {
  return g.at.x + i * g.pitch;
}

/** Where the closing bracket of a list of length `n` sits (its centre). */
function closeX(g: ArrayGeometry, n: number): number {
  return n === 0 ? g.at.x + 3 : cellX(g, n - 1) + g.cellW + 9;
}

function range([lo, hi]: readonly [number, number]): number[] {
  return Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
}

export function arrayEditor<S extends object>(args: ArrayEditorArgs<S>): Svgx {
  const { list, d, draggedId, toState, bars, cellW, cellH } = args;
  const bracket = (text: string, x: number, fill: string) =>
    label(text, Vec2(x, cellH / 2), { size: 20, mono: true, fill });
  const endId = uid(args.idPrefix, "end");
  const n = list.arr.length;

  return (
    <g>
      {args.name !== undefined &&
        label(`${args.name} =`, Vec2(args.at.x - 24, args.at.y + cellH / 2), {
          size: 13,
          mono: true,
          anchor: "end",
        })}
      <g transform={translate(0, args.at.y)}>
        {bracket("[", args.at.x - 9, color.muted)}
      </g>
      {list.arr.map((value, i) => {
        const id = uid(args.idPrefix, list.ids[i]!);
        const handleId = uid(args.idPrefix, "set", list.ids[i]!);
        const barH = bars === undefined ? 0 : value * bars.unit;
        const barW = Math.round(cellW * 0.5);
        return (
          <g
            id={id}
            transform={translate(cellX(args, i), args.at.y)}
            dragologyZIndex={draggedId === id ? "/1" : false}
            dragologyOnDrag={
              args.reorder
                ? () => d.closest(reorders(list, i).map(toState)).withFloating()
                : undefined
            }
            style={args.reorder ? { cursor: "grab" } : undefined}
          >
            {bars !== undefined && (
              <rect
                transform={translate((cellW - barW) / 2, -BAR_GAP - barH)}
                width={barW}
                height={barH}
                rx={2}
                fill={color.cellEmpty}
                stroke={color.cellBorder}
                strokeWidth={1}
              />
            )}
            {box(cellW, cellH, args.paint?.(i) ?? PLAIN)}
            {label(String(value), Vec2(cellW / 2, cellH / 2), { size: 13, mono: true })}
            {bars !== undefined && (
              <g
                id={handleId}
                transform={translate(cellW / 2, -BAR_GAP - barH)}
                dragologyOnDrag={() =>
                  d.closest(
                    valueChoices(list, i, bars.range, bars.sorted).map((v) =>
                      toState(withValue(list, i, v)),
                    ),
                  )
                }
                style={{ cursor: "ns-resize" }}
              >
                <circle r={10} fill="transparent" />
                <circle r={5} fill={color.pointer} />
              </g>
            )}
          </g>
        );
      })}
      {args.length === undefined ? (
        <g transform={translate(closeX(args, n), args.at.y)}>
          {bracket("]", 0, color.muted)}
        </g>
      ) : (
        <g
          id={endId}
          transform={translate(closeX(args, n), args.at.y)}
          dragologyZIndex={draggedId === endId ? "/1" : false}
          dragologyOnDrag={() => {
            const grow = args.length!;
            return d
              .closest(
                range(grow.range).map((len) => toState(resized(list, len, grow.fill))),
              )
              .withFloating();
          }}
          style={{ cursor: "ew-resize" }}
        >
          <rect
            transform={translate(-9, -2)}
            width={18}
            height={cellH + 4}
            rx={4}
            fill="transparent"
          />
          {bracket("]", 0, color.pointer)}
        </g>
      )}
    </g>
  );
}
