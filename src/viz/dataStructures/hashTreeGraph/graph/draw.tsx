/**
 * Drawing shared by the bfs and dfs pages: the graph script, the graph
 * itself with draggable arrowheads, the adjacency lists, and the start and
 * target tags. Each page supplies its own colouring of vertices and edges.
 */
import {
  translate,
  Vec2,
  type DragSpecBuilder,
  type SetState,
  type Svgx,
} from "dragology";
import type { VizState } from "../../../../core/stepping";
import { arrow, box, caption, label, optional, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { dragTag } from "../../kit/tag";
import { opScript } from "../../opScript";
import { chain, neutral, type Style } from "../shared/draw";
import type { Key, Vertex } from "./graph";
import { graphScript, type Edge, type Input, type Search, type Vars } from "./trace";

export const R = 20;
const CENTER = Vec2(350, 190);
const RADIUS = 118;
/** Clockwise from the top. On a circle no edge can pass through a vertex. */
const CIRCLE_ORDER: readonly Key[] = [4, 2, 3, 5, 8, 7, 6, 1];

export function position(key: Key): Vec2 {
  const k = CIRCLE_ORDER.indexOf(key);
  const angle = ((-90 + 45 * k) * Math.PI) / 180;
  return CENTER.add(Vec2(Math.cos(angle), Math.sin(angle)).mul(RADIUS));
}

type Drag = DragSpecBuilder<VizState<Input>>;
type WithInput = (input: Input) => VizState<Input>;

/** Keys of the vertices inserted so far. */
function insertedVertices(vars: Vars): Set<Key> {
  return new Set(vars._adj.keys());
}

/** Whether `insert_edge(from, to)` has run in this frame. */
function isInserted(vars: Vars, e: Edge): boolean {
  const v = vars._adj.get(e.from);
  for (let n = v?._adj_list._head ?? null; n !== null; n = n._next) {
    if (n._data.id === e.to) return true;
  }
  return false;
}

/**
 * The script: `insert_vertex` for each vertex, then `insert_edge` for each
 * edge, then the search. Only the edge calls move: dragging one into another
 * order changes the order of every adjacency list. Their arguments have no
 * nudges, since the arrowheads rewire edges, and a nudge could make a
 * self-loop or a duplicate edge the drawing can't show.
 */
export function scriptView(args: {
  search: Search;
  input: Input;
  op: number | null;
  d: Drag;
  draggedId: string | null;
  setState: SetState<VizState<Input>>;
  withInput: WithInput;
}): Svgx {
  const { input } = args;
  const edgeById = new Map(input.edges.map((e) => [e.id, e]));
  return (
    <g transform={translate(20, 22)}>
      {opScript({
        ops: graphScript(args.search, input),
        current: args.op,
        d: args.d,
        draggedId: args.draggedId,
        setState: args.setState,
        withOps: (ops) =>
          args.withInput({
            ...input,
            edges: ops.flatMap((op) => edgeById.get(op.id) ?? []),
          }),
        locked: (op) => op.name !== "insert_edge",
        nudges: false,
      })}
    </g>
  );
}

/** Where an edge's arrow ends, just outside its target vertex. */
function tip(e: Edge): Vec2 {
  const a = position(e.from);
  const b = position(e.to);
  return b.sub(
    b
      .sub(a)
      .norm()
      .mul(R + 2),
  );
}

/** Every input that points edge `e` at another vertex it has no edge to yet. */
function retargets(input: Input, e: Edge): Input[] {
  return input.vertices
    .filter(
      (t) =>
        t !== e.from &&
        (t === e.to || !input.edges.some((o) => o.from === e.from && o.to === t)),
    )
    .map((to) => ({
      ...input,
      edges: input.edges.map((o) => (o.id === e.id ? { ...o, to } : o)),
    }));
}

export type EdgeLook = {
  readonly stroke: string;
  readonly width: number;
  readonly dash?: string;
};

/**
 * The graph: every edge of the input (dashed until `insert_edge` has run),
 * each with a purple handle on its arrowhead that rewires it to another
 * vertex, and every vertex coloured by the page.
 */
export function graphView(args: {
  input: Input;
  vars: Vars;
  vertexStyle: (key: Key) => Style & { readonly ink?: string; readonly ring?: string };
  edgeLook: (e: Edge, inserted: boolean) => EdgeLook;
  d: Drag;
  draggedId: string | null;
  withInput: WithInput;
}): Svgx {
  const { input, vars, d, draggedId, withInput } = args;
  const inserted = insertedVertices(vars);
  const hasEdge = (from: Key, to: Key) =>
    input.edges.some((e) => e.from === from && e.to === to);
  return (
    <g>
      {input.edges.map((e) => {
        const look = args.edgeLook(e, isInserted(vars, e));
        const handleId = uid("g-head", e.id);
        return (
          <g id={uid("g-edge", e.id)}>
            {arrow(position(e.from), position(e.to), {
              inset: R + 2,
              bend: hasEdge(e.to, e.from) ? 14 : 0,
              stroke: look.stroke,
              width: look.width,
              dash: look.dash,
            })}
            <g
              id={handleId}
              transform={translate(tip(e))}
              dragologyZIndex={draggedId === handleId ? "/1" : 2}
              dragologyOnDrag={() =>
                d.closest(retargets(input, e).map(withInput)).withFloating()
              }
              style={{ cursor: "grab" }}
            >
              <circle r={9} fill="transparent" />
              <circle r={4} fill={color.panel} stroke={color.pointer} strokeWidth={1.5} />
            </g>
          </g>
        );
      })}
      {input.vertices.map((key) => {
        const s = args.vertexStyle(key);
        const present = inserted.has(key);
        return (
          <g
            id={uid("g-vertex", key)}
            transform={translate(position(key))}
            dragologyZIndex={1}
          >
            <circle
              r={R}
              fill={present ? s.fill : color.panel}
              stroke={present ? (s.ring ?? s.stroke) : color.faint}
              strokeWidth={s.ring ? 3 : 2}
              strokeDasharray={present ? undefined : "4 3"}
            />
            {label(String(key), Vec2(0, 0), {
              size: 14,
              weight: 700,
              fill: present ? (s.ink ?? color.ink) : color.faint,
            })}
          </g>
        );
      })}
    </g>
  );
}

/** A purple tag naming a search argument, dragged from vertex to vertex. */
export function argTag(args: {
  id: string;
  text: string;
  at: Key;
  below: boolean;
  d: Drag;
  draggedId: string | null;
  candidates: (key: Key) => Input;
  input: Input;
  withInput: WithInput;
}): Svgx {
  const offset = args.below ? Vec2(0, R + 14) : Vec2(0, -R - 14);
  return dragTag({
    id: args.id,
    at: position(args.at).add(offset),
    text: args.text,
    draggedId: args.draggedId,
    onDrag: () =>
      args.d
        .closest(args.input.vertices.map((k) => args.withInput(args.candidates(k))))
        .withFloating(),
  });
}

const ADJ_X = 520;
const ADJ_TOP = 44;
const ADJ_ROW = 28;

/** Each vertex's `_adj_list`, head first: the order its neighbours are searched in. */
export function adjacencyView(
  vars: Vars,
  input: Input,
  nodeStyle: (from: Key, to: Key) => Style = () => neutral,
): Svgx {
  return (
    <g>
      {caption("_adj: each vertex's SinglyLinkedList", Vec2(ADJ_X, 22))}
      {input.vertices.map((key, i) => {
        const v = vars._adj.get(key);
        const y = ADJ_TOP + i * ADJ_ROW;
        return (
          <g id={uid("g-adj", key)}>
            {label(`${key}:`, Vec2(ADJ_X + 12, y + 10), {
              size: 12,
              mono: true,
              anchor: "end",
              fill: v === undefined ? color.faint : color.ink,
            })}
            {optional(
              "empty",
              v !== undefined &&
                v._adj_list._head === null &&
                label("[]", Vec2(ADJ_X + 22, y + 10), {
                  size: 12,
                  mono: true,
                  anchor: "start",
                  fill: color.faint,
                }),
            )}
            {chain<Vertex>(v?._adj_list._head ?? null, {
              id: (n) => uid("g-adj-node", key, n.uid),
              at: Vec2(ADJ_X + 22, y),
              nodeW: 26,
              nodeH: 20,
              gap: 12,
              text: (w) => String(w.id),
              textSize: 11,
              style: (n) => nodeStyle(key, n._data.id),
            })}
          </g>
        );
      })}
    </g>
  );
}

/** A `name = value` line for a local variable. */
export function local(
  name: string,
  value: string,
  at: Vec2,
  fill: string = color.ink,
): Svgx {
  return (
    <g transform={translate(at)}>
      {label(`${name} =`, Vec2(0, 0), {
        size: 12,
        mono: true,
        anchor: "start",
        fill: color.muted,
      })}
      {label(value, Vec2(8 + 7.3 * (name.length + 2), 0), {
        size: 12,
        mono: true,
        anchor: "start",
        weight: 600,
        fill,
      })}
    </g>
  );
}

/** A dict keyed by vertex, as a header row of keys and one row per dict. */
export function dictTable(
  at: Vec2,
  keys: readonly Key[],
  rows: readonly {
    name: string;
    cell: (key: Key) => { text: string; style: Style; ink?: string };
  }[],
): Svgx {
  const x0 = 100;
  const w = 36;
  const step = 40;
  return (
    <g transform={translate(at)}>
      {keys.map((k, i) =>
        label(String(k), Vec2(x0 + i * step + w / 2, 0), {
          size: 11,
          mono: true,
          fill: color.muted,
        }),
      )}
      {rows.map((row, r) => (
        <g transform={translate(0, 24 * (r + 1))}>
          {label(row.name, Vec2(0, 0), {
            size: 12,
            mono: true,
            anchor: "start",
            fill: color.muted,
          })}
          {keys.map((k, i) => {
            const c = row.cell(k);
            return (
              <g transform={translate(x0 + i * step, -10)}>
                {box(w, 20, {
                  fill: c.style.fill,
                  stroke: c.style.stroke,
                  radius: 4,
                  strokeWidth: 1.2,
                })}
                {label(c.text, Vec2(w / 2, 10), {
                  size: 10.5,
                  mono: true,
                  fill: c.ink ?? color.ink,
                })}
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}
