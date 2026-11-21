/**
 * Drawing pieces shared by the array visualizations: a row of slots whose
 * values keep their identity as they are copied around, index pointers, the
 * `_size` marker, the capacity handle, and the boxes for a pending value and
 * for what a call returned or raised.
 *
 * All positions are absolute (diagram coordinates), so a value can slide
 * from one row to another, e.g. from `old_array` into a resized array.
 */
import { translate, Vec2, type DragSpecBrand, type Svgx } from "dragology";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { opScript, type OpScriptArgs } from "../opScript";
import type { ArrayData } from "./coreArray";
import type { Outcome } from "../kit/outcome";

/** Shared layout: the op script on the left, arrays to its right. */
export const LAYOUT = {
  scriptAt: Vec2(20, 24),
  scriptWidth: 186,
  /** Left edge of slot 0. Leaves room for a pointer at index -1. */
  arrayX: 270,
  /** The widest a row of slots may get. */
  arrayWidth: 432,
  /** Right edge of the diagram's content. */
  right: 740,
  /** Where a row's caption sits, above its `_size` marker and indices. */
  captionY: 30,
  /** Top of the first row of slots. */
  rowY: 96,
  /** Where pending values wait: right-aligned on the caption line. */
  pendingAt: Vec2(688, 30),
  /** The outcome box: left edge, top and width. */
  outcomeX: 230,
  outcomeY: 226,
  outcomeWidth: 510,
} as const;

export type Geometry = { readonly pitch: number; readonly w: number; readonly h: number };

const GAP = 6;

/** Slot sizes for rows of up to `slots` slots. */
export function geometry(slots: number): Geometry {
  const pitch = Math.min(54, Math.floor(LAYOUT.arrayWidth / Math.max(1, slots)));
  return { pitch, w: pitch - GAP, h: 48 };
}

/** What a slot means right now, which picks its colours. */
export type SlotRole =
  /** Holds one of the structure's elements. */
  | "used"
  /** Past `_size`: allocated, but its value is a leftover. */
  | "unused"
  /** The slot the current line reads or writes. */
  | "current"
  /** Where the search found its target. */
  | "found"
  /** Ruled out by binary search. */
  | "discarded";

const SLOT_STYLE: Record<SlotRole, { fill: string; stroke: string; text: string }> = {
  used: { fill: color.cell, stroke: color.cellBorder, text: color.ink },
  unused: { fill: color.cellEmpty, stroke: color.rule, text: color.faint },
  current: { fill: color.currentFill, stroke: color.current, text: color.ink },
  found: { fill: color.doneFill, stroke: color.done, text: color.ink },
  discarded: { fill: color.visitedFill, stroke: color.visited, text: color.muted },
};

/** The id of a value's newest copy; older copies get `staleValueId`. */
export function valueId(uidOfValue: string): string {
  return uid("val", uidOfValue);
}

/**
 * Element ids for the values in `arrays`, slot by slot. When a value has
 * been copied, its newest copy keeps the value's own id, so on screen the
 * value slides to where it was copied and the older copy is the one that
 * appears in its place.
 */
export function valueIds(arrays: readonly ArrayData[]): string[][] {
  const newest = new Map<string, number>();
  for (const a of arrays) {
    for (const item of a._array) {
      newest.set(item.uid, Math.max(newest.get(item.uid) ?? -Infinity, item.born));
    }
  }
  return arrays.map((a) =>
    a._array.map((item) =>
      item.born === newest.get(item.uid)
        ? valueId(item.uid)
        : uid("val", item.uid, "b", item.born),
    ),
  );
}

/** Whether a value with this uid is stored in any of `arrays`. */
export function isStored(arrays: readonly ArrayData[], uidOfValue: string): boolean {
  return arrays.some((a) => a._array.some((item) => item.uid === uidOfValue));
}

export type RowArgs = {
  readonly array: ArrayData;
  /** From `valueIds`. */
  readonly ids: readonly string[];
  /** Top-left of slot 0. */
  readonly at: Vec2;
  readonly geo: Geometry;
  readonly role: (i: number) => SlotRole;
};

/** The x of the centre of slot `i`. */
function slotCenterX(at: Vec2, geo: Geometry, i: number): number {
  return at.x + i * geo.pitch + geo.w / 2;
}

/** A row of slots with their index numbers above and values inside. */
export function slotRow({ array, ids, at, geo, role }: RowArgs): Svgx {
  const textSize = geo.w >= 40 ? 15 : 13;
  return (
    <g>
      {array._array.map((_, i) => {
        const style = SLOT_STYLE[role(i)];
        return (
          <g
            id={uid("slot", array._id, i)}
            dragologyKey={uid("slot", array._id, i)}
            transform={translate(at.x + i * geo.pitch, at.y)}
          >
            {box(geo.w, geo.h, { fill: style.fill, stroke: style.stroke, radius: 5 })}
            {label(String(i), Vec2(geo.w / 2, -10), {
              size: 10.5,
              mono: true,
              fill: color.faint,
            })}
          </g>
        );
      })}
      {array._array.map((item, i) => {
        const r = role(i);
        return (
          <g
            id={ids[i]}
            dragologyKey={ids[i]}
            dragologyZIndex={1}
            transform={translate(slotCenterX(at, geo, i), at.y + geo.h / 2)}
          >
            {label(String(item.value), Vec2(0, 0), {
              size: textSize,
              mono: true,
              fill: SLOT_STYLE[r].text,
              weight: r === "current" || r === "found" ? 600 : undefined,
            })}
          </g>
        );
      })}
    </g>
  );
}

export type Pointer = {
  /** The Python variable, shown under the arrow. */
  readonly name: string;
  readonly index: number;
  readonly stroke: string;
  /** Makes the pointer a handle that drags its variable to another slot. */
  readonly onDrag?: () => DragSpecBrand;
};

const POINTER_LINE = 14;

/**
 * Arrows under slots for index variables (`i`, `left`, `mid_index`, ...).
 * Pointers on the same slot stack their names; each keeps its id so it
 * slides as its variable changes. `key` keeps ids unique per row.
 */
export function pointers(
  key: string,
  at: Vec2,
  geo: Geometry,
  list: readonly Pointer[],
  draggedId: string | null = null,
): Svgx {
  const levels = new Map<number, number>();
  // An index far outside the array is pinned to the nearest edge slot and
  // its value spelled out, so the pointer stays inside the diagram.
  const last = Math.floor((LAYOUT.right - at.x - geo.w / 2) / geo.pitch);
  return (
    <g>
      {list.map((p) => {
        const shownAt = Math.min(last, Math.max(-1, p.index));
        const pinned = shownAt !== p.index;
        const level = levels.get(shownAt) ?? 0;
        levels.set(shownAt, level + 1);
        const id = uid("ptr", key, p.name);
        return (
          <g
            id={id}
            dragologyKey={id}
            transform={translate(slotCenterX(at, geo, shownAt), at.y + geo.h)}
            dragologyOnDrag={p.onDrag}
            dragologyZIndex={draggedId === id ? "/1" : 1}
            style={p.onDrag ? { cursor: "ew-resize" } : undefined}
          >
            {p.onDrag && (
              <rect
                transform={translate(-16, 2)}
                width={32}
                height={34}
                fill="transparent"
              />
            )}
            <path d="M 0 5 L -5 12 L 5 12 Z" fill={p.stroke} />
            <path d="M 0 11 L 0 20" stroke={p.stroke} strokeWidth={1.6} />
            {pointerName(p, pinned, geo, 29 + level * POINTER_LINE)}
          </g>
        );
      })}
    </g>
  );
}

/**
 * A pointer's name under its arrow, or `name = index` beside an arrow pinned
 * to an edge. The three placements anchor the text differently, and an
 * anchor cannot blend, so each gets its own key.
 */
function pointerName(p: Pointer, pinned: boolean, geo: Geometry, y: number): Svgx {
  const side = !pinned ? "middle" : p.index < 0 ? "start" : "end";
  const x = side === "middle" ? 0 : side === "start" ? -geo.w / 2 : geo.w / 2;
  return (
    <g dragologyKey={`name-${side}`}>
      {label(pinned ? `${p.name} = ${p.index}` : p.name, Vec2(x, y), {
        size: 11,
        mono: true,
        fill: p.stroke,
        weight: 600,
        anchor: side,
      })}
    </g>
  );
}

/** A divider after the first `size` slots, labelled `_size = n`. */
export function sizeMarker(at: Vec2, geo: Geometry, size: number): Svgx {
  const x = at.x + size * geo.pitch - GAP / 2;
  return (
    <g id="size-marker" transform={translate(x, at.y)}>
      <path
        d={`M 0 -22 L 0 ${geo.h + 6}`}
        stroke={color.ink}
        strokeWidth={1.6}
        strokeDasharray="4 3"
      />
      {label(`_size = ${size}`, Vec2(0, -32), { size: 11.5, mono: true, weight: 600 })}
    </g>
  );
}

/**
 * A grip just right of the last of `capacity` slots. Dragging it picks a
 * new capacity; `onDrag` builds the spec, with the grip at each candidate.
 */
export function capacityHandle(
  at: Vec2,
  geo: Geometry,
  capacity: number,
  dragged: boolean,
  onDrag: () => DragSpecBrand,
): Svgx {
  return (
    <g
      id="capacity-handle"
      dragologyZIndex={dragged ? "/1" : 2}
      transform={translate(at.x + capacity * geo.pitch - 1, at.y)}
      dragologyOnDrag={onDrag}
      style={{ cursor: "ew-resize" }}
    >
      <rect width={12} height={geo.h} rx={6} fill={color.pointer} />
      {[-8, 0, 8].map((dy) => (
        <circle transform={translate(6, geo.h / 2 + dy)} r={1.6} fill="white" />
      ))}
    </g>
  );
}

/**
 * A value waiting outside the array (amber), or a search target (blue),
 * with its Python name. `valueUid` makes a pending value the same element
 * as the copy it becomes, so it slides into its slot when stored.
 */
export function pendingValue(
  at: Vec2,
  name: string,
  value: number,
  kind: "pending" | "target",
  valueUid: string | null,
): Svgx {
  const fill = kind === "pending" ? color.pendingFill : color.currentFill;
  const stroke = kind === "pending" ? color.pending : color.current;
  return (
    <g>
      <g id={uid("pending", name)} transform={translate(at)}>
        {caption(name, Vec2(0, 0), { anchor: "end" })}
        <g transform={translate(8, -15)}>{box(44, 30, { fill, stroke, radius: 5 })}</g>
      </g>
      <g
        id={valueUid === null ? uid("pending", name, "value") : valueId(valueUid)}
        dragologyZIndex={1}
        transform={translate(at.add(Vec2(30, 0)))}
      >
        {label(String(value), Vec2(0, 0), { size: 15, mono: true, weight: 600 })}
      </g>
    </g>
  );
}

/**
 * A one-line result: what a method returned (green) or the exception the
 * call raised (red). `args` are the arguments the method was called with.
 */
export function outcome(
  at: Vec2,
  width: number,
  args: readonly number[],
  returned: Outcome | null,
  error: string | null,
): Svgx | null {
  if (error === null && returned === null) return null;
  const bad = error !== null;
  const text = bad
    ? error
    : `${returned!.from}(${args.join(", ")}) returned ${returned!.text}`;
  return (
    <g id="outcome" transform={translate(at)}>
      {box(width, 32, {
        fill: bad ? color.badFill : color.doneFill,
        stroke: bad ? color.bad : color.done,
        radius: 6,
        strokeWidth: 1,
      })}
      {label(text, Vec2(12, 16), {
        size: 11.5,
        mono: true,
        anchor: "start",
        fill: bad ? color.bad : color.done,
        weight: 600,
      })}
    </g>
  );
}

/** The op script, in its usual place on the left. */
export function scriptColumn<I>(args: Omit<OpScriptArgs<I>, "width">): Svgx {
  return (
    <g transform={translate(LAYOUT.scriptAt)}>
      {opScript({ ...args, width: LAYOUT.scriptWidth })}
    </g>
  );
}

/** The candidates for a capacity drag: one input per capacity in `range`. */
export function capacityRange(lo: number, hi: number): number[] {
  return Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
}
