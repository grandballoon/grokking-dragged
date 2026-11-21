/**
 * Draws a linked list as a row of nodes, shared by every list-based
 * visualization in this folder.
 *
 * A singly linked node is `[data|•]`, a doubly linked one `[•|data|•]`; the
 * dot in a link compartment starts the arrow to the node it points at, and
 * a slash across it means None. The list's own fields (`_head`, `_tail`)
 * point down at nodes from above, the running methods' node locals point up
 * from below, and a node the list no longer reaches hangs lowered beneath
 * the gap it left. Positions come from `layoutList`; this module only turns
 * them into SVG.
 */
import { scale, translate, Vec2, type DragSpecBrand, type Svgx } from "dragology";
import type { Frame } from "../../../../core/trace";
import { arrow, box, label, uid } from "../../../../ui/svg";
import { pyRepr } from "../../../../core/python";
import { color } from "../../../../ui/theme";
import {
  layoutList,
  localNodes,
  pointers,
  type NodeData,
  type Pointer,
  type Slot,
} from "./layout";
import type { Call } from "./tracer";

export type Kind = "singly" | "doubly";

export const NODE_H = 40;
export const NODE_W: Readonly<Record<Kind, number>> = { singly: 64, doubly: 80 };
/** Left edge of the first slot and right limit of the last, in the diagram. */
export const ROW_LEFT = 24;
const ROW_RIGHT = 736;
/** Top of the row of nodes. */
export const ROW_Y = 76;
/** How far a node the list no longer reaches is lowered. */
const DROP = 86;
const GAP = 36;
const MIN_GAP = 18;

/** Link lanes: where in a node each link's dot sits, and where arrows meet it. */
const NEXT = { singly: Vec2(54, 20), doubly: Vec2(71, 13) } as const;
const PREV = Vec2(9, 27);

export type Style = { readonly fill: string; readonly stroke: string };

export const STYLE = {
  plain: { fill: color.cell, stroke: color.cellBorder },
  current: { fill: color.currentFill, stroke: color.current },
  visited: { fill: color.visitedFill, stroke: color.visited },
  done: { fill: color.doneFill, stroke: color.done },
  dropped: { fill: color.badFill, stroke: color.bad },
} as const satisfies Record<string, Style>;

export function nodeId(prefix: string, nodeUid: string): string {
  return uid(prefix, "node", nodeUid);
}

export type Fit = { readonly pitch: number; readonly scale: number };

/**
 * How a row of `slots` nodes fits the diagram's width: the distance between
 * neighbouring slots shrinks down to a minimum gap, and past that the whole
 * row is scaled down.
 */
export function rowFit(kind: Kind, slots: number): Fit {
  const w = NODE_W[kind];
  const room = ROW_RIGHT - ROW_LEFT;
  const full = w + GAP;
  const pitch =
    slots <= 1 ? full : Math.min(full, Math.max(w + MIN_GAP, (room - w) / (slots - 1)));
  const span = Math.max(0, slots - 1) * pitch + w;
  return { pitch, scale: Math.min(1, room / span) };
}

/**
 * A node's body, its top-left at the local origin. `links` says which link
 * compartments hold a reference (a dot) rather than None (a slash).
 */
export function nodeBody(
  kind: Kind,
  text: string,
  style: Style,
  links: { readonly next: boolean; readonly prev: boolean },
): Svgx {
  const w = NODE_W[kind];
  const h = NODE_H;
  const dataX = kind === "singly" ? 0 : 18;
  const dataW = 44;
  const compartment = (x0: number, dot: Vec2, linked: boolean) => (
    <g>
      <circle
        transform={translate(dot)}
        r={2.6}
        fill={color.ink}
        opacity={linked ? 1 : 0}
      />
      <path
        d={`M ${x0 + 3} ${h - 5} L ${x0 + (kind === "singly" ? 17 : 15)} 5`}
        stroke={color.muted}
        strokeWidth={1.3}
        opacity={linked ? 0 : 1}
      />
    </g>
  );
  return (
    <g>
      {box(w, h, { ...style, radius: 5 })}
      <path
        d={
          kind === "singly"
            ? `M ${dataW} 0 V ${h}`
            : `M ${dataX} 0 V ${h} M ${dataX + dataW} 0 V ${h}`
        }
        stroke={style.stroke}
        strokeWidth={1.2}
      />
      {label(text, Vec2(dataX + dataW / 2, h / 2), { size: 15, mono: true })}
      {compartment(dataX + dataW, NEXT[kind], links.next)}
      {kind === "doubly" && compartment(0, PREV, links.prev)}
    </g>
  );
}

/** Every node a frame's list fields and locals reach, laid out in a row. */
export function slotsOf(
  head: NodeData | null,
  tail: NodeData | null,
  stack: readonly Call[],
): Slot[] {
  return layoutList(head, tail, localNodes(stack));
}

const slotCounts = new WeakMap<object, number>();

/** The most slots any frame needs, so the pitch stays put along the trace. */
export function maxSlots<V>(
  frames: readonly Frame<V>[],
  roots: (vars: V) => readonly [NodeData | null, NodeData | null, readonly Call[]],
): number {
  const hit = slotCounts.get(frames);
  if (hit !== undefined) return hit;
  const most = Math.max(1, ...frames.map((f) => slotsOf(...roots(f.vars)).length));
  slotCounts.set(frames, most);
  return most;
}

export type RowArgs = {
  /** Prefix for element ids. */
  readonly prefix: string;
  readonly kind: Kind;
  /** The list's own node fields, e.g. `{ _head, _tail }`, drawn above. */
  readonly fields: Readonly<Record<string, NodeData | null>>;
  readonly stack: readonly Call[];
  /** Node to draw green: the one whose value was just returned or created. */
  readonly found: string | null;
  /** Nodes whose uid starts with this op id were made by the running op. */
  readonly runningOp: string | null;
  /** How the row fits the width, from `rowFit`. */
  readonly fit: Fit;
  readonly draggedId: string | null;
  /** A drag for a node, if it can be dragged. */
  readonly nodeDrag?: (slot: Slot) => (() => DragSpecBrand) | undefined;
};

type Placed = { readonly slot: Slot; readonly at: Vec2 };

function styleFor(slot: Slot, args: RowArgs, inner: readonly Pointer[]): Style {
  const u = slot.node.uid;
  if (slot.dropped) return STYLE.dropped;
  if (args.found === u) return STYLE.done;
  if (
    args.runningOp !== null &&
    (u === args.runningOp || u.startsWith(`${args.runningOp}_`))
  )
    return STYLE.done;
  const names = inner.filter((p) => p.uid === u).map((p) => p.name);
  if (names.some((n) => n !== "previous")) return STYLE.current;
  if (names.length > 0) return STYLE.visited;
  return STYLE.plain;
}

/** Ends of the arrow for `from`'s link to `to`, in diagram coordinates. */
function linkEnds(
  kind: Kind,
  from: Placed,
  to: Placed,
  link: "_next" | "_prev",
): { a: Vec2; b: Vec2; bend: number } {
  const w = NODE_W[kind];
  const dot = link === "_next" ? NEXT[kind] : PREV;
  const a = from.at.add(dot);
  const forward = link === "_next" ? to.at.x > from.at.x : to.at.x < from.at.x;
  if (!forward) return { a, b: to.at.add(Vec2(w / 2, 0)), bend: 36 };
  if (from.slot.dropped !== to.slot.dropped) {
    // Up from a lowered node into the bottom of its neighbour in the row.
    return { a, b: to.at.add(Vec2(link === "_next" ? 12 : w - 12, NODE_H)), bend: 0 };
  }
  return { a, b: to.at.add(Vec2(link === "_next" ? 0 : w, dot.y)), bend: 0 };
}

type PointerLabel = {
  readonly id: string;
  readonly text: string;
  readonly fill: string;
  readonly opacity: number;
};

/**
 * A stack of pointer names over (side "above") or under ("below") a node,
 * with one arrow onto the node's edge at `edge`. Returned flat, every
 * element with its own id, so a name can slide from node to node.
 */
function pointerStack(
  prefix: string,
  side: "above" | "below",
  nodeUid: string,
  edge: Vec2,
  items: readonly PointerLabel[],
): Svgx[] {
  const dir = side === "above" ? -1 : 1;
  return [
    arrow(edge.add(Vec2(0, dir * 13)), edge.add(Vec2(0, dir)), {
      id: uid(prefix, "ptrs", side, nodeUid),
      stroke: items[0]!.fill,
      opacity: items[0]!.opacity,
      head: 6,
      width: 1.5,
    }),
    ...items.map((item, k) =>
      label(item.text, edge.add(Vec2(0, dir * (21 + 13 * k))), {
        id: item.id,
        size: 11.5,
        mono: true,
        weight: 600,
        fill: item.fill,
        opacity: item.opacity,
      }),
    ),
  ];
}

export function linkedRow(args: RowArgs): Svgx {
  const { prefix, kind, fields, stack, draggedId } = args;
  const { pitch } = args.fit;
  const w = NODE_W[kind];
  const head = fields._head ?? null;
  const tail = fields._tail ?? null;
  const slots = slotsOf(head, tail, stack);
  const placed = new Map<string, Placed>(
    slots.map((slot) => [
      slot.node.uid,
      {
        slot,
        at: Vec2(ROW_LEFT + slot.index * pitch, ROW_Y + (slot.dropped ? DROP : 0)),
      },
    ]),
  );
  const all = pointers(fields, stack);
  const innerDepth = stack.length - 1;
  const inner = all.filter((p) => p.depth === innerDepth);

  const links = slots.flatMap((slot) =>
    (["_next", "_prev"] as const).flatMap((link) => {
      const target = slot.node[link];
      const to = target ? placed.get(target.uid) : undefined;
      if (to === undefined) return [];
      const ends = linkEnds(kind, placed.get(slot.node.uid)!, to, link);
      return [
        arrow(ends.a, ends.b, {
          id: uid(prefix, link, slot.node.uid),
          bend: ends.bend,
          stroke: color.muted,
          width: 1.6,
          head: 7,
          insetEnd: 0.5,
        }),
      ];
    }),
  );

  const nodes = slots.map((slot) => {
    const id = nodeId(prefix, slot.node.uid);
    const drag = args.nodeDrag?.(slot);
    return (
      <g
        id={id}
        transform={translate(placed.get(slot.node.uid)!.at)}
        dragologyZIndex={draggedId === id ? "/1" : 1}
        dragologyOnDrag={drag}
        style={drag ? { cursor: "grab" } : undefined}
      >
        {nodeBody(kind, pyRepr(slot.node._data), styleFor(slot, args, inner), {
          next: slot.node._next !== null,
          prev: (slot.node._prev ?? null) !== null,
        })}
      </g>
    );
  });

  const labelsOn = (side: "above" | "below") =>
    slots.flatMap((slot) => {
      const mine = all
        .filter((p) => p.uid === slot.node.uid && p.depth < 0 === (side === "above"))
        .sort((p, q) => q.depth - p.depth);
      if (mine.length === 0) return [];
      const at = placed.get(slot.node.uid)!.at;
      const edge = at.add(Vec2(w / 2, side === "above" ? 0 : NODE_H));
      return pointerStack(
        prefix,
        side,
        slot.node.uid,
        edge,
        mine.map((p) => ({
          id: uid(prefix, "ptr", p.depth < 0 ? "own" : p.depth, p.name),
          text: p.name,
          fill: p.depth < 0 ? color.ink : color.pointer,
          opacity: p.depth < 0 || p.depth === innerDepth ? 1 : 0.45,
        })),
      );
    });

  const empty = slots.length === 0 && (
    <g id={uid(prefix, "empty")}>
      {label(
        `${Object.keys(fields).join(" = ")} = None`,
        Vec2(ROW_LEFT, ROW_Y + NODE_H / 2),
        { size: 13, mono: true, anchor: "start", fill: color.muted },
      )}
    </g>
  );

  return (
    <g
      transform={
        translate(ROW_LEFT, ROW_Y) + scale(args.fit.scale) + translate(-ROW_LEFT, -ROW_Y)
      }
    >
      {links}
      {nodes}
      {labelsOn("above")}
      {labelsOn("below")}
      {empty}
    </g>
  );
}
