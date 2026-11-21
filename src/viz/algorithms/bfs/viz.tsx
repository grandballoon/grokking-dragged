import { translate, Vec2, type Svgx } from "dragology";
import { moveItem, moveTargets, type KeyedLists } from "../../../core/keyedLists";
import { arrow, caption, cell, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { defineViz, type DrawArgs } from "../../defineViz";
import { BOOK_GRAPH, person_is_seller, run, SRC, type Graph, type Vars } from "./trace";

/**
 * The editable input: the Python `graph` dict and start name, plus a stable
 * id for every friend entry (parallel to `graph`) so an entry keeps its
 * identity while it is dragged from one person's list to another's.
 */
type Input = {
  readonly graph: Graph;
  readonly start: string;
  readonly entryIds: KeyedLists<string>;
};

const MAX_FRIENDS = 5;
const NODE_R = 25;

const POSITIONS: Readonly<Record<string, Vec2>> = {
  you: Vec2(60, 190),
  alice: Vec2(190, 85),
  bob: Vec2(190, 190),
  claire: Vec2(190, 295),
  peggy: Vec2(330, 50),
  anuj: Vec2(330, 140),
  thom: Vec2(330, 240),
  jonny: Vec2(330, 330),
};

const initialInput: Input = {
  graph: BOOK_GRAPH,
  start: "you",
  entryIds: Object.fromEntries(
    Object.entries(BOOK_GRAPH).map(([who, friends]) => [
      who,
      friends.map((f) => `${who}-${f}`),
    ]),
  ),
};

function nodeStyle(name: string, vars: Vars): { fill: string; stroke: string } {
  if (vars.person === name) {
    return vars.result === true
      ? { fill: color.doneFill, stroke: color.done }
      : { fill: color.currentFill, stroke: color.current };
  }
  if (vars.searched.has(name)) return { fill: color.visitedFill, stroke: color.visited };
  if (vars.search_queue.includes(name))
    return { fill: color.pendingFill, stroke: color.pending };
  return { fill: color.cell, stroke: color.cellBorder };
}

/** Ids for queue chips, chosen so the chip popped into `person` keeps its id. */
function queueIds(vars: Vars): string[] {
  const seen = new Map<string, number>();
  if (vars.person !== null) seen.set(vars.person, 1);
  return vars.search_queue.map((name) => {
    const n = seen.get(name) ?? 0;
    seen.set(name, n + 1);
    return uid("queued", name, n);
  });
}

function draw({ frame, input, d, draggedId, withInput }: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const { graph } = input;
  const names = Object.keys(graph);

  const graphView = (
    <g transform={translate(20, 20)}>
      {names.flatMap((from) =>
        (graph[from] ?? []).map((to) =>
          arrow(POSITIONS[from]!, POSITIONS[to]!, {
            id: uid("edge", from, to),
            inset: NODE_R + 2,
            bend: graph[to]?.includes(from) ? 14 : 0,
            stroke: color.faint,
          }),
        ),
      )}
      {names.map((name) => {
        const style = nodeStyle(name, vars);
        return (
          <g id={uid("node", name)} transform={translate(POSITIONS[name]!)}>
            <circle r={NODE_R} fill={style.fill} stroke={style.stroke} strokeWidth={2} />
            {label(name, Vec2(0, 0), { size: 11.5, weight: 600 })}
            {person_is_seller(name) &&
              label("seller", Vec2(0, NODE_R + 10), { size: 10, fill: color.done })}
          </g>
        );
      })}
      <g
        id="start-flag"
        dragologyZIndex={draggedId === "start-flag" ? "/1" : 1}
        transform={translate(
          POSITIONS[input.start]!.add(Vec2(-NODE_R - 6, -NODE_R - 14)),
        )}
        dragologyOnDrag={() =>
          d.closest(names.map((start) => withInput({ ...input, start }))).withFloating()
        }
        style={{ cursor: "grab" }}
      >
        <rect width={62} height={20} rx={10} fill={color.pointer} />
        {label(`search()`, Vec2(31, 10), { size: 10.5, fill: "white", mono: true })}
      </g>
    </g>
  );

  const rowY = (i: number) => 52 + i * 33;
  const tableX = 410;
  const chipW = 52;
  const tableView = (
    <g transform={translate(tableX, 0)}>
      {caption("graph = {", Vec2(0, 22))}
      {names.map((who, i) => (
        <g>
          {label(`"${who}":`, Vec2(0, rowY(i)), {
            size: 11.5,
            anchor: "start",
            mono: true,
          })}
          {(graph[who] ?? []).map((friend, j) => {
            const id = input.entryIds[who]![j]!;
            return cell(Vec2(72 + j * (chipW + 4), rowY(i) - 12), chipW, 24, {
              id: uid("entry", id),
              text: friend,
              radius: 12,
              textOptions: { size: 11 },
              fill: nodeStyle(friend, vars).fill,
              stroke: nodeStyle(friend, vars).stroke,
              zIndex: draggedId === uid("entry", id) ? "/1" : 1,
              onDrag: () => {
                const from = { key: who, index: j };
                const accepts = (key: string, list: readonly string[], item: string) =>
                  key !== item && !list.includes(item) && list.length < MAX_FRIENDS;
                return d
                  .closest(
                    moveTargets(graph, from, accepts).map((to) =>
                      withInput({
                        ...input,
                        graph: moveItem(graph, from, to),
                        entryIds: moveItem(input.entryIds, from, to),
                      }),
                    ),
                  )
                  .withFloating();
              },
            });
          })}
        </g>
      ))}
      {caption("}", Vec2(0, rowY(names.length) - 6))}
    </g>
  );

  const ids = queueIds(vars);
  const chip = 60;
  const bottom = (
    <g transform={translate(20, 400)}>
      {caption("search_queue (deque) — popleft ←", Vec2(0, 0))}
      {vars.search_queue.map((name, i) =>
        cell(Vec2(i * (chip + 6), 14), chip, 30, {
          id: ids[i],
          text: name,
          textOptions: { size: 12 },
          fill: color.pendingFill,
          stroke: color.pending,
        }),
      )}
      {caption("person", Vec2(600, 0))}
      {vars.person !== null &&
        cell(Vec2(600, 14), 100, 30, {
          id: uid("queued", vars.person, 0),
          text: vars.person,
          textOptions: { size: 13, weight: 600 },
          ...nodeStyle(vars.person, vars),
        })}
      {caption("searched (set)", Vec2(0, 66))}
      {[...vars.searched].map((name, i) =>
        cell(Vec2(i * (chip + 6), 80), chip, 30, {
          id: uid("searched", name),
          text: name,
          textOptions: { size: 12 },
          fill: color.visitedFill,
          stroke: color.visited,
        }),
      )}
      {vars.result !== null &&
        label(`→ ${vars.result ? "True" : "False"}`, Vec2(650, 95), {
          size: 15,
          mono: true,
          weight: 600,
          fill: vars.result ? color.done : color.bad,
        })}
    </g>
  );

  return (
    <g>
      {graphView}
      {tableView}
      {bottom}
    </g>
  );
}

export const bfsViz = defineViz<Input, Vars>({
  id: "breadth-first-search",
  title: "Breadth-first search",
  book: "Grokking Algorithms",
  chapter: "6 · Breadth-first search",
  summary:
    "Search your network for a mango seller, nearest friends first. Friends are queued in the order the graph lists them, so the search fans out one layer at a time.",
  drags: [
    "the timeline knob to step through the search",
    "the purple search() tag onto someone else to start from them",
    "a friend chip in the graph dict to reorder a list or move the friendship to someone else",
  ],
  sources: [SRC],
  initialInput,
  run,
  draw,
});
