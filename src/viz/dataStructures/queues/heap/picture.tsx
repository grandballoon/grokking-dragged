/**
 * A heap drawn twice: as the complete binary tree it stands for, and as the
 * Python list `_elements` that stores it. Every element is one tree node and
 * one array chip, each with an id built from the element's key, so when
 * `_bubble_up` or `_push_down` moves an element it slides in both views.
 *
 * The Python sifts don't swap: they hold the moving `element` aside and copy
 * neighbours over the slot it left. While a slot holds such a stale copy,
 * the array shows the copy faintly in a dashed slot with the held element
 * lifted above it, and the tree shows the held element in that position.
 *
 * Shared by the heap demo and k_largest_elements.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { box, label, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { tag, TAG_H } from "../../kit/tag";
import { localsOf, type CallLine } from "../parts";
import type { HeapCall } from "./heap";

export type HeapGeometry = {
  /** The tree: its left edge, the root's centre y, its width, depth and level spacing. */
  readonly tree: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly levels: number;
    readonly levelGap: number;
  };
  /** Tree node size; a node as wide as it is tall is a circle. */
  readonly node: { readonly w: number; readonly h: number };
  /** The array row: top-left of slot 0, slot size and gap. */
  readonly array: {
    readonly left: number;
    readonly top: number;
    readonly cellW: number;
    readonly cellH: number;
    readonly gap: number;
  };
  /** Top-left of where `top()`'s element waits once it has left the array. */
  readonly removedAt: Vec2 | null;
  /** Whether that element is a result (green) or thrown away (grey). */
  readonly removedIs: "result" | "discarded";
};

export type HeapLook<T> = {
  /** Prefixes every id, so two heaps could share a diagram. */
  readonly prefix: string;
  /** The element's identity across frames. */
  readonly key: (element: T) => string;
  /** The main label, in nodes and chips. */
  readonly main: (element: T) => string;
  /** A small second line in the array chips. */
  readonly sub?: (element: T) => string;
};

/** A local index variable shown as a tag under the array slot it names. */
type Mark = { readonly name: string; readonly slot: number };

export type HeapRoles<T> = {
  /** The element a sift holds aside, and the slot it is drawn at. */
  readonly held: T | null;
  readonly heldSlot: number | null;
  /** True while `heldSlot` holds a stale copy of another element. */
  readonly lifted: boolean;
  /** The slot being compared with: a parent, a child. */
  readonly compare: number | null;
  /** The slot a loop is at: `_heapify`'s index, `_validate`'s node. */
  readonly focus: number | null;
  /** The root, while `peek` returns it. */
  readonly peeked: boolean;
  /** `top()`'s element, once it is no longer in the list. */
  readonly removed: T | null;
  readonly marks: readonly Mark[];
};

const defined = <V,>(v: V | undefined | null): v is V => v !== undefined && v !== null;

/** What each slot and element is doing in this frame, from the innermost calls. */
export function heapRoles<T>(
  elements: readonly T[],
  stack: readonly HeapCall<T>[],
  key: (element: T) => string,
): HeapRoles<T> {
  const call = stack.at(-1);
  const inList = new Set(elements.map(key));
  const topCall = stack.find((c) => c.fn === "top");
  const removedElement = topCall?.fn === "top" ? topCall.locals.element : undefined;
  const removed =
    defined(removedElement) && !inList.has(key(removedElement)) ? removedElement : null;
  const none = {
    held: null,
    heldSlot: null,
    lifted: false,
    compare: null,
    focus: null,
    peeked: false,
    removed,
    marks: [],
  };
  if (call === undefined) return none;

  const sift = (
    held: T | undefined,
    slot: number,
    slotName: string,
    other: number | null | undefined,
    otherName: string,
  ): HeapRoles<T> => {
    const compare = defined(other) && other !== slot ? other : null;
    const lifted =
      held !== undefined &&
      elements[slot] !== undefined &&
      key(elements[slot]!) !== key(held);
    return {
      ...none,
      held: held ?? null,
      heldSlot: held === undefined ? null : slot,
      lifted,
      compare,
      marks: [
        { name: slotName, slot },
        ...(compare === null ? [] : [{ name: otherName, slot: compare }]),
      ],
    };
  };

  switch (call.fn) {
    case "_bubble_up": {
      const { element, index, parent_index, parent } = call.locals;
      return sift(
        element,
        index,
        "index",
        parent === undefined ? null : parent_index,
        "parent_index",
      );
    }
    case "_push_down": {
      const { element, index, current_index, child_index } = call.locals;
      return current_index === undefined
        ? sift(element, index, "index", null, "")
        : sift(element, current_index, "current_index", child_index, "child_index");
    }
    case "_heapify": {
      const { index } = call.locals;
      return index === undefined
        ? none
        : { ...none, focus: index, marks: [{ name: "index", slot: index }] };
    }
    case "_validate": {
      const { current_index, child_index } = call.locals;
      if (current_index === undefined || child_index === undefined) return none;
      return {
        ...none,
        focus: current_index,
        compare: child_index,
        marks: [
          { name: "current_index", slot: current_index },
          { name: "child_index", slot: child_index },
        ],
      };
    }
    case "peek":
      return { ...none, peeked: elements.length > 0 };
    default:
      return none;
  }
}

/** Centre of tree position `i`. */
function treePos(i: number, geo: HeapGeometry): Vec2 {
  const level = Math.floor(Math.log2(i + 1));
  const across = i - (2 ** level - 1);
  const { left, top, width, levelGap } = geo.tree;
  return Vec2(left + ((across + 0.5) * width) / 2 ** level, top + level * levelGap);
}

/** Top-left of array slot `i`. */
function cellPos(i: number, geo: HeapGeometry): Vec2 {
  const { left, top, cellW, gap } = geo.array;
  return Vec2(left + i * (cellW + gap), top);
}

export type Style = { readonly fill: string; readonly stroke: string };

const plain: Style = { fill: color.cell, stroke: color.cellBorder };
const current: Style = { fill: color.currentFill, stroke: color.current };
const pending: Style = { fill: color.pendingFill, stroke: color.pending };
export const done: Style = { fill: color.doneFill, stroke: color.done };
const discarded: Style = { fill: color.visitedFill, stroke: color.visited };

/** An element as an array chip, `w` by `h`, top-left at the local origin. */
export function elementChip<T>(
  element: T,
  look: HeapLook<T>,
  w: number,
  h: number,
  style: Style,
): Svgx {
  const { main, sub } = look;
  return (
    <g>
      {box(w, h, { fill: style.fill, stroke: style.stroke })}
      {sub === undefined ? (
        label(main(element), Vec2(w / 2, h / 2), { size: 14, mono: true, weight: 600 })
      ) : (
        <g>
          {label(main(element), Vec2(w / 2, h / 2 - 6), {
            size: 13,
            mono: true,
            weight: 600,
          })}
          {label(sub(element), Vec2(w / 2, h / 2 + 9), {
            size: 9,
            mono: true,
            fill: color.muted,
          })}
        </g>
      )}
    </g>
  );
}

/** Both views of the heap, in the diagram's coordinates. */
export function heapPicture<T>(
  elements: readonly T[],
  stack: readonly HeapCall<T>[],
  geo: HeapGeometry,
  look: HeapLook<T>,
): Svgx {
  const { key, main, prefix } = look;
  const roles = heapRoles(elements, stack, key);
  const { cellW, cellH } = geo.array;
  const { w: nodeW, h: nodeH } = geo.node;

  const styleAt = (slot: number, element: T): Style => {
    if (roles.held !== null && key(element) === key(roles.held)) return current;
    if (slot === roles.compare) return pending;
    if (slot === roles.focus) return current;
    if (roles.peeked && slot === 0) return done;
    return plain;
  };

  // Which element each tree position and chip shows. A lifted slot shows
  // the held element in the tree, and only a stale copy in the array.
  const placed: { element: T; slot: number }[] = [];
  const seen = new Set<string>();
  elements.forEach((element, slot) => {
    const shown = roles.lifted && slot === roles.heldSlot ? null : element;
    if (shown === null || seen.has(key(shown))) return;
    seen.add(key(shown));
    placed.push({ element: shown, slot });
  });

  const chipFace = (element: T, style: Style) =>
    elementChip(element, look, cellW, cellH, style);

  const node = (id: string, element: T, at: Vec2, style: Style) => (
    <g
      id={id}
      dragologyZIndex={1}
      transform={translate(at.x - nodeW / 2, at.y - nodeH / 2)}
    >
      {box(nodeW, nodeH, {
        fill: style.fill,
        stroke: style.stroke,
        radius: nodeH / 2,
        strokeWidth: 1.8,
      })}
      {label(main(element), Vec2(nodeW / 2, nodeH / 2), {
        size: 13,
        mono: true,
        weight: 600,
      })}
    </g>
  );

  const edges = elements.slice(1).map((_, k) => {
    const i = k + 1;
    const parent = Math.floor((i - 1) / 2);
    const a = treePos(parent, geo);
    const b = treePos(i, geo);
    const active =
      roles.heldSlot !== null &&
      roles.compare !== null &&
      [parent, i].includes(roles.heldSlot) &&
      [parent, i].includes(roles.compare);
    return (
      <line
        id={uid(prefix, "edge", i)}
        {...a.xy1()}
        {...b.xy2()}
        stroke={active ? color.pending : color.rule}
        strokeWidth={active ? 2.5 : 1.5}
      />
    );
  });

  const treeNodes = placed.map(({ element, slot }) =>
    node(
      uid(prefix, "t", key(element)),
      element,
      treePos(slot, geo),
      styleAt(slot, element),
    ),
  );
  const heldNode =
    roles.lifted && roles.held !== null && roles.heldSlot !== null
      ? node(
          uid(prefix, "t", key(roles.held)),
          roles.held,
          treePos(roles.heldSlot, geo),
          current,
        )
      : null;

  const slots = elements.map((element, i) => {
    const stale = roles.lifted && i === roles.heldSlot;
    return (
      <g id={uid(prefix, "slot", i)} transform={translate(cellPos(i, geo))}>
        {box(cellW, cellH, {
          fill: stale ? color.cellEmpty : color.cell,
          stroke: stale ? color.faint : color.rule,
          dash: stale ? "4 3" : undefined,
        })}
        {stale &&
          label(main(element), Vec2(cellW / 2, cellH / 2), {
            size: 13,
            mono: true,
            fill: color.faint,
          })}
        {label(String(i), Vec2(cellW / 2, cellH + 9), {
          size: 9,
          mono: true,
          fill: color.faint,
        })}
      </g>
    );
  });

  const chips = placed.map(({ element, slot }) => (
    <g
      id={uid(prefix, "a", key(element))}
      dragologyZIndex={1}
      transform={translate(cellPos(slot, geo))}
    >
      {chipFace(element, styleAt(slot, element))}
    </g>
  ));
  const heldChip =
    roles.lifted && roles.held !== null && roles.heldSlot !== null ? (
      <g
        id={uid(prefix, "a", key(roles.held))}
        dragologyZIndex={2}
        transform={translate(cellPos(roles.heldSlot, geo).add(Vec2(0, -cellH - 10)))}
      >
        {chipFace(roles.held, current)}
      </g>
    ) : null;
  const removedChip =
    roles.removed !== null && geo.removedAt !== null ? (
      <g
        id={uid(prefix, "a", key(roles.removed))}
        dragologyZIndex={2}
        transform={translate(geo.removedAt)}
      >
        {chipFace(roles.removed, geo.removedIs === "result" ? done : discarded)}
      </g>
    ) : null;

  const marks = roles.marks.map((mark, row) => (
    <g
      id={uid(prefix, "mark", mark.name)}
      transform={translate(
        cellPos(mark.slot, geo).add(Vec2(cellW / 2, cellH + 20 + TAG_H / 2 + row * 22)),
      )}
    >
      {tag(mark.name)}
    </g>
  ));

  return (
    <g>
      {edges}
      {treeNodes}
      {heldNode}
      {slots}
      {chips}
      {heldChip}
      {removedChip}
      {marks}
    </g>
  );
}

/** How the stack panel shows one Heap call, naming elements with `show`. */
export function heapCallLine<T>(
  call: HeapCall<T>,
  show: (element: T) => string,
): CallLine {
  const locals = localsOf;
  const el = (e: T | undefined) => (e === undefined ? undefined : show(e));
  const num = (n: number | null | undefined) =>
    n === undefined ? undefined : n === null ? "None" : String(n);
  switch (call.fn) {
    case "__init__":
      return { call: "Heap(...)", locals: [] };
    case "_heapify":
      return {
        call: "_heapify(elements)",
        locals: locals([
          ["last_inner_node_index", num(call.locals.last_inner_node_index)],
          ["index", num(call.locals.index)],
        ]),
      };
    case "insert":
      return { call: `insert(${show(call.locals.element)})`, locals: [] };
    case "top":
      return { call: "top()", locals: locals([["element", el(call.locals.element)]]) };
    case "peek":
      return { call: "peek()", locals: [] };
    case "_bubble_up":
      return {
        call: "_bubble_up(...)",
        locals: locals([
          ["index", num(call.locals.index)],
          ["element", el(call.locals.element)],
          ["parent_index", num(call.locals.parent_index)],
          ["parent", el(call.locals.parent)],
        ]),
      };
    case "_push_down":
      return {
        call: `_push_down(${call.locals.index})`,
        locals: locals([
          ["element", el(call.locals.element)],
          ["current_index", num(call.locals.current_index)],
          ["child_index", num(call.locals.child_index)],
        ]),
      };
    case "_validate":
      return {
        call: "_validate()",
        locals: locals([
          ["current_index", num(call.locals.current_index)],
          ["child_index", num(call.locals.child_index)],
        ]),
      };
  }
}
