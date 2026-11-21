/**
 * The drawing shared by the linked-list-based visualizations: a caption and
 * colour legend, the list as a row of nodes, and the lower band (script,
 * call stack, palette, returned values). A visualization supplies only what
 * differs: which fields hold the list, what a value dropped on the list
 * turns into, and which nodes can be pulled out to delete them.
 *
 * Two drags edit the script from the diagram (see `edits.ts`):
 * - the value in the palette, dropped onto one of the list's targets, adds
 *   the matching insert after the op on screen;
 * - a node pulled out of the row adds the matching delete.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { caption, label } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import type { DrawArgs } from "../../../defineViz";
import type { Call, Op } from "../../opScript";
import { band, PALETTE_CENTER } from "./band";
import { addOpState, canAddOp, nextOpId, type ScriptInput } from "./edits";
import type { NodeData, Slot } from "./layout";
import {
  linkedRow,
  maxSlots,
  NODE_H,
  NODE_W,
  nodeBody,
  nodeId,
  ROW_LEFT,
  rowFit,
  STYLE,
  type Kind,
  type Style,
} from "./linkedRow";
import type { Vars } from "./tracer";

export type ListVizConfig<O> = {
  readonly prefix: string;
  readonly kind: Kind;
  /** Caption over the list, e.g. `sll = SinglyLinkedList()`. */
  readonly title: string;
  /** The list's own node fields, e.g. `{ _head }` or `{ _head, _tail }`. */
  readonly fields: (obj: O) => Readonly<Record<string, NodeData | null>>;
  /** The calls the dragged-in value can become, given the list's data now. */
  readonly inserts: (ops: readonly Op[], data: readonly number[]) => readonly Call[];
  /** Text on the value to drag in. */
  readonly chipText: (ops: readonly Op[]) => string;
  /** Where the value can go, in a few words. */
  readonly hint: string;
  /** The call that pulling a node out of the row adds, if it can be. */
  readonly removal?: (
    slot: Slot,
    fields: Readonly<Record<string, NodeData | null>>,
  ) => Call | undefined;
};

/** Data along `_next` from `head`. */
function listData(head: NodeData | null): number[] {
  const result: number[] = [];
  for (let n = head; n !== null; n = n._next) result.push(n._data as number);
  return result;
}

const LEGEND: readonly (readonly [string, Style])[] = [
  ["a local points here", STYLE.current],
  ["new or returned", STYLE.done],
  ["out of the list", STYLE.dropped],
];

/** The colour roles of the nodes, right-aligned at the top of the diagram. */
export function legend(items: readonly (readonly [string, Style])[] = LEGEND): Svgx {
  const widths = items.map(([text]) => 14 + text.length * 6 + 16);
  let x = 744 - widths.reduce((a, b) => a + b, 0) + 16;
  return (
    <g>
      {items.map(([text, style], i) => {
        const at = Vec2(x, 20);
        x += widths[i]!;
        return (
          <g transform={translate(at)}>
            <rect
              transform={translate(0, -5)}
              width={10}
              height={10}
              rx={2}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={1.2}
            />
            {label(text, Vec2(14, 0), { size: 10, anchor: "start", fill: color.muted })}
          </g>
        );
      })}
    </g>
  );
}

export function listDraw<O>(config: ListVizConfig<O>) {
  const { prefix, kind } = config;
  const roots = (vars: Vars<O>) => {
    const f = config.fields(vars.obj);
    return [f._head ?? null, f._tail ?? null, vars.stack] as const;
  };

  return function draw(args: DrawArgs<ScriptInput, Vars<O>>): Svgx {
    const { frame, frames, input, state, d, draggedId } = args;
    const { vars } = frame;
    const fields = config.fields(vars.obj);
    const running = vars.op === null ? null : (input.ops[vars.op]?.id ?? null);
    const canAdd = canAddOp(input.ops);
    const add = (call: Call) => addOpState(input, vars.op, call, args.trace);

    const row = linkedRow({
      prefix,
      kind,
      fields,
      stack: vars.stack,
      found: vars.found,
      runningOp: running,
      fit: rowFit(kind, maxSlots(frames, roots)),
      draggedId,
      nodeDrag: (slot) => {
        const call = !slot.dropped && canAdd ? config.removal?.(slot, fields) : undefined;
        if (call === undefined) return undefined;
        return () => d.closest([state]).whenFar(add(call), { gap: 40 }).withFloating();
      },
    });

    const chipId = nodeId(prefix, nextOpId(input.ops));
    const data = listData(fields._head ?? null);
    const chip = (
      <g
        id={chipId}
        transform={translate(PALETTE_CENTER.sub(Vec2(NODE_W[kind] / 2, NODE_H / 2)))}
        dragologyZIndex={draggedId === chipId ? "/1" : 1}
        dragologyOnDrag={
          canAdd
            ? () =>
                d
                  .closest(config.inserts(input.ops, data).map(add))
                  .whenFar(state)
                  .withFloating()
            : undefined
        }
        style={canAdd ? { cursor: "grab" } : undefined}
        opacity={canAdd ? 1 : 0.4}
      >
        {nodeBody(kind, config.chipText(input.ops), STYLE.plain, {
          next: false,
          prev: false,
        })}
      </g>
    );

    return (
      <g>
        {caption(config.title, Vec2(ROW_LEFT, 20))}
        {legend()}
        {row}
        {band({
          ...args,
          prefix,
          vars,
          chip,
          hint: canAdd ? config.hint : "the script is full",
        })}
      </g>
    );
  };
}
