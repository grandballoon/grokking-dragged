import { translate, Vec2, type Svgx } from "dragology";
import { lineText } from "../../../../core/pythonSource";
import { box, caption, cell, uid } from "../../../../ui/svg";
import { color } from "../../../../ui/theme";
import { defineViz, type DrawArgs } from "../../../defineViz";
import { opScript, reorder } from "../../opScript";
import { exceptionBanner, opOutcomes, stackPanel } from "../parts";
import { heapCallLine, heapPicture, type HeapGeometry, type HeapLook } from "./picture";
import { INITIAL_INPUT, run, SRC, type Input, type Item, type Vars } from "./trace";

const CHIP_W = 150;
const ELEMENT_W = 26;
const ARRAY_LEFT = 290;
const ARRAY_WIDTH = 460;

const look: HeapLook<Item> = {
  prefix: "heap",
  key: (item) => item.uid,
  main: (item) => String(item.value),
};

function geometry(capacity: number): HeapGeometry {
  const levels = Math.max(1, Math.floor(Math.log2(Math.max(1, capacity))) + 1);
  const step = Math.min(48, Math.floor((ARRAY_WIDTH + 4) / Math.max(1, capacity)));
  return {
    tree: {
      left: ARRAY_LEFT,
      top: 44,
      width: ARRAY_WIDTH,
      levels,
      levelGap: levels <= 1 ? 0 : Math.min(64, 174 / (levels - 1)),
    },
    node: { w: 34, h: 34 },
    array: { left: ARRAY_LEFT, top: 330, cellW: step - 4, cellH: 36, gap: 4 },
    removedAt: Vec2(20, 334),
    removedIs: "result",
  };
}

function draw({
  frame,
  frames,
  input,
  d,
  draggedId,
  setState,
  withInput,
}: DrawArgs<Input, Vars>): Svgx {
  const { vars } = frame;
  const capacity = Math.max(...frames.map((f) => f.vars._elements.length));
  const geo = geometry(capacity);
  const raising = lineText(SRC, frame.line).trim().startsWith("raise");
  const { elements } = input;

  return (
    <g>
      <g transform={translate(20, 20)}>
        {opScript({
          ops: input.ops,
          current: vars.op,
          d,
          draggedId,
          setState,
          withOps: (ops) => withInput({ ...input, ops }),
          width: CHIP_W,
          argRange: [0, 99],
        })}
        {opOutcomes(input.ops, vars.outcomes, CHIP_W)}
      </g>
      <g transform={translate(20, 250)}>
        {caption("Heap(elements)", Vec2(0, 0))}
        {elements.map((item, i) => {
          const id = uid("element", item.uid);
          return cell(Vec2(i * (ELEMENT_W + 4), 14), ELEMENT_W, 26, {
            id,
            text: String(item.value),
            textOptions: { size: 12 },
            zIndex: draggedId === id ? "/1" : 1,
            onDrag: () =>
              d
                .closest(
                  elements.map((_, j) =>
                    withInput({
                      ...input,
                      elements: reorder(elements, i, j),
                    }),
                  ),
                )
                .withFloating(),
          });
        })}
      </g>
      {caption("top()'s element", Vec2(20, 320))}
      <g transform={translate(geo.removedAt!)}>
        {box(geo.array.cellW, geo.array.cellH, {
          fill: "none",
          stroke: color.rule,
          dash: "4 3",
        })}
      </g>
      {caption("the tree", Vec2(ARRAY_LEFT, 14))}
      {caption("_elements", Vec2(ARRAY_LEFT, 262))}
      {heapPicture(vars._elements, vars.stack, geo, look)}
      <g transform={translate(ARRAY_LEFT, 446)}>
        {stackPanel(vars.stack.map((call) => heapCallLine(call, look.main)))}
      </g>
      {raising && <g transform={translate(20, 390)}>{exceptionBanner(frame.note)}</g>}
      {vars._elements.length === 0 &&
        caption("(empty)", Vec2(ARRAY_LEFT, 348), { fill: color.faint })}
    </g>
  );
}

export const heapViz = defineViz<Input, Vars>({
  id: "ds-heap",
  title: "Binary heap",
  book: "Grokking Data Structures",
  chapter: "10 · Priority queues and heaps",
  summary:
    "A max-heap stored in a plain list: the children of index i live at 2i + 1 and 2i + 2. Building it pushes every inner node down; insert bubbles the new element up, and top moves the last element to the root and pushes it down.",
  drags: [
    "an operation chip to reorder the script, or − and + to change a value",
    "an element of Heap(elements) to reorder the list and watch _heapify change",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  draw,
});
