import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, optional } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import {
  currentStyle,
  doneStyle,
  neutral,
  pendingStyle,
  visitedStyle,
  type Style,
} from "../shared/draw";
import type { Queue } from "../../ports/queue";
import {
  adjacencyView,
  argTag,
  dictTable,
  graphView,
  local,
  scriptView,
  type EdgeLook,
} from "./draw";
import type { Key } from "./graph";
import { BFS_INPUT } from "./input";
import {
  QUEUE_SRC,
  runBfs,
  SLL_SRC,
  SRC,
  type Edge,
  type Input,
  type Vars,
} from "./trace";

/** The keys between the queue's front and rear, front first. */
function queued(queue: Queue<Key> | null): Key[] {
  if (queue === null) return [];
  return Array.from(
    { length: queue._size },
    (_, i) => queue._data[(queue._front + i) % queue._max_size]!,
  );
}

/** Whether edge `e` is the last step into `e.to` on the path being rebuilt. */
function onPath(vars: Vars, e: Edge): boolean {
  return (
    vars.path !== null &&
    vars.path.includes(e.from) &&
    vars.path.includes(e.to) &&
    vars.predecessor?.get(e.to) === e.from
  );
}

function vertexStyle(vars: Vars, key: Key): Style {
  if (vars.path?.includes(key)) return doneStyle;
  if (key === vars.u) return currentStyle;
  if (queued(vars.queue).includes(key)) return pendingStyle;
  const d = vars.distance?.get(key);
  if (d !== undefined && d !== Infinity) return visitedStyle;
  return neutral;
}

function edgeLook(vars: Vars, e: Edge, inserted: boolean): EdgeLook {
  if (!inserted) return { stroke: color.faint, width: 1.4, dash: "4 4" };
  if (onPath(vars, e)) return { stroke: color.done, width: 2.6 };
  if (e.from === vars.u && e.to === vars.v) return { stroke: color.current, width: 2.4 };
  if (vars.predecessor?.get(e.to) === e.from) return { stroke: color.ink, width: 2 };
  return { stroke: color.muted, width: 1.6 };
}

const BOTTOM_X = 200;
const SLOT_X = BOTTOM_X + 100;
const SLOT_STEP = 40;
const SLOT_W = 36;

/** The circular array behind `queue`, with its front and rear. */
function queueView(queue: Queue<Key>, y: number): Svgx {
  const live = new Set(
    Array.from({ length: queue._size }, (_, i) => (queue._front + i) % queue._max_size),
  );
  // Front and rear get a line each, so neighbouring markers never collide.
  const marker = (slot: number, text: string, line: number) =>
    label(text, Vec2(SLOT_X + slot * SLOT_STEP + SLOT_W / 2, y + 32 + 14 * line), {
      size: 10.5,
      mono: true,
      fill: color.pointer,
    });
  const same = queue._front === queue._rear;
  return (
    <g>
      {caption(
        `queue: Queue(${queue._max_size}), a circular array`,
        Vec2(BOTTOM_X, y - 14),
      )}
      {label("_data", Vec2(BOTTOM_X, y + 10), {
        size: 12,
        mono: true,
        anchor: "start",
        fill: color.muted,
      })}
      {queue._data.map((value, i) => {
        const style = live.has(i)
          ? pendingStyle
          : { fill: color.cellEmpty, stroke: color.cellBorder };
        return (
          <g transform={translate(SLOT_X + i * SLOT_STEP, y)}>
            {box(SLOT_W, 20, {
              fill: style.fill,
              stroke: style.stroke,
              radius: 4,
              strokeWidth: 1.2,
            })}
            {label(value === null ? "None" : String(value), Vec2(SLOT_W / 2, 10), {
              size: 10.5,
              mono: true,
              fill: live.has(i) ? color.ink : color.faint,
            })}
          </g>
        );
      })}
      {marker(queue._front, same ? "▲ front, rear" : "▲ front", 0)}
      {optional("rear", !same && marker(queue._rear, "▲ rear", 1))}
    </g>
  );
}

function draw({
  frame,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const keys = input.vertices;
  const fmt = (n: number | undefined) =>
    n === undefined ? "" : n === Infinity ? "inf" : String(n);
  return (
    <g>
      {scriptView({
        search: "bfs",
        input,
        op: vars.op,
        d,
        setState,
        draggedId,
        withInput,
      })}
      {graphView({
        input,
        vars,
        vertexStyle: (key) => vertexStyle(vars, key),
        edgeLook: (e, inserted) => edgeLook(vars, e, inserted),
        d,
        draggedId,
        withInput,
      })}
      {argTag({
        id: "g-start",
        text: "start",
        at: input.start,
        below: false,
        candidates: (start) => ({ ...input, start }),
        input,
        d,
        draggedId,
        withInput,
      })}
      {argTag({
        id: "g-target",
        text: "target",
        at: input.target,
        below: true,
        candidates: (target) => ({ ...input, target }),
        input,
        d,
        draggedId,
        withInput,
      })}
      {adjacencyView(vars, input, (from, to) =>
        from === vars.u && to === vars.v ? currentStyle : neutral,
      )}
      <g>
        {optional(
          "u",
          vars.u !== null && local("u", String(vars.u), Vec2(520, 276), color.current),
        )}
        {optional("v", vars.v !== null && local("v", String(vars.v), Vec2(600, 276)))}
        {optional(
          "target",
          vars.target !== null && local("target", String(vars.target), Vec2(520, 300)),
        )}
        {optional(
          "path",
          vars.path !== null &&
            local(
              "path",
              `[${vars.path.join(", ")}]`,
              Vec2(520, 300 + (vars.target === null ? 0 : 24)),
              color.done,
            ),
        )}
        {optional(
          "result",
          vars.result !== null &&
            label(`returns ${vars.result}`, Vec2(520, 350), {
              size: 13,
              mono: true,
              anchor: "start",
              weight: 700,
              fill: vars.result === "None" ? color.bad : color.done,
            }),
        )}
      </g>
      {optional(
        "dicts-pending",
        vars.distance === null &&
          caption(
            "distance and predecessor are made when bfs starts",
            Vec2(BOTTOM_X, 410),
          ),
      )}
      {optional(
        "dicts",
        vars.distance !== null &&
          dictTable(Vec2(BOTTOM_X, 400), keys, [
            {
              name: "distance",
              cell: (k) => ({
                text: fmt(vars.distance!.get(k)),
                style:
                  k === vars.v && vars.predecessor?.get(k) === vars.u
                    ? currentStyle
                    : neutral,
              }),
            },
            ...(vars.predecessor === null
              ? []
              : [
                  {
                    name: "predecessor",
                    cell: (k: Key) => {
                      const p = vars.predecessor!.get(k);
                      return {
                        text: p === null || p === undefined ? "None" : String(p),
                        style: neutral,
                      };
                    },
                  },
                ]),
          ]),
      )}
      {optional("queue", vars.queue !== null && queueView(vars.queue, 500))}
    </g>
  );
}

export const bfsGraphViz = defineViz<Input, Vars>({
  id: "ds-graph-bfs",
  title: "Graph: breadth-first search",
  book: "Grokking Data Structures",
  chapter: "13 · Graphs",
  summary:
    "Build a directed graph from adjacency lists, then search it breadth first with a circular queue, recording each vertex's distance and predecessor; the shortest path is read back from the predecessors.",
  drags: [
    "the timeline knob to step through the build and the search",
    "an insert_edge call in the script to reorder the edges: each vertex lists its neighbours newest first",
    "a purple dot on an arrowhead to point that edge at another vertex",
    "the purple start or target tag onto another vertex",
  ],
  sources: [SRC, SLL_SRC, QUEUE_SRC],
  initialInput: BFS_INPUT,
  run: runBfs,
  draw,
  diagramHeight: 560,
});
