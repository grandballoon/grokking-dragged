/**
 * The page layout for the recursive functions that call themselves on a
 * slice of their list (`count(arr[1:])`, `binary_search(arr[:mid], target)`).
 *
 * The input list sits at the top, and each call's card on the stack draws
 * the slice that call received, with every element under the column it came
 * from in the input. So the slices visibly shrink and shift as the stack
 * grows, and a slice's offset into the input is plain to see.
 */
import { translate, Vec2, type Svgx } from "dragology";
import { box, caption, label, uid } from "../../../ui/svg";
import { color } from "../../../ui/theme";
import { arrayEditor, type ArrayEditorArgs, type ArrayGeometry } from "./arrayEditor";
import { callStack, type Card, type StackLayout } from "./callStack";
import { PLAIN, type Paint } from "./paint";

const STACK_X = 20;
/** Card-local x of column 0. */
const COL_X = 180;
const PITCH = 36;
const CELL_W = 32;
const CELL_H = 24;
/** The longest list whose columns fit before the expressions. */
export const MAX_SLICE_LEN = 7;

const SLICE_STACK: StackLayout = {
  width: 720,
  cardHeight: 44,
  gap: 6,
  exprX: COL_X + MAX_SLICE_LEN * PITCH + 14,
};

/** Geometry for the input list at height `y`, its columns lined up with the cards'. */
function inputGeometry(y: number): ArrayGeometry {
  return { at: Vec2(STACK_X + COL_X, y), pitch: PITCH, cellW: CELL_W, cellH: 28 };
}

/** Values an input element can be dragged to, and the bar height per unit. */
export const VALUE_RANGE = [1, 12] as const;
export const BAR_UNIT = 4;

/**
 * A card body showing the slice `arr`, which starts at column `offset` of
 * the input. `paint(j)` colours element `j` of the slice.
 */
export function sliceBody(
  callId: string,
  arr: readonly number[],
  offset: number,
  paint: (j: number) => Paint = () => PLAIN,
): Svgx {
  const y = (SLICE_STACK.cardHeight - CELL_H) / 2;
  const x0 = COL_X + offset * PITCH;
  if (arr.length === 0) {
    return label("[]", Vec2(x0 + CELL_W / 2, SLICE_STACK.cardHeight / 2), {
      size: 13,
      mono: true,
      fill: color.muted,
    });
  }
  return (
    <g>
      {arr.map((v, j) => (
        <g id={uid(callId, "cell", j)} transform={translate(x0 + j * PITCH, y)}>
          {box(CELL_W, CELL_H, { ...paint(j), radius: 4 })}
          {label(String(v), Vec2(CELL_W / 2, CELL_H / 2), { size: 12, mono: true })}
        </g>
      ))}
    </g>
  );
}

export type SlicePageArgs<S extends object> = {
  /** What the page calls, at the top. */
  readonly caption: string;
  /** The top of the input list's cells. */
  readonly inputY: number;
  readonly stackTop: number;
  /** The diagram's height; the stack fills the room below `stackTop`. */
  readonly height: number;
  /** The input list's editor, less the geometry, which lines it up with the cards. */
  readonly editor: Omit<ArrayEditorArgs<S>, keyof ArrayGeometry>;
  readonly cards: readonly Card[];
};

/**
 * The input list under a caption, and under it the call stack, whose
 * cards draw their slices (`sliceBody`) in the list's columns.
 */
export function slicePage<S extends object>(args: SlicePageArgs<S>): Svgx {
  const { stackTop } = args;
  return (
    <g>
      {caption(args.caption, Vec2(20, 14))}
      {arrayEditor({ ...inputGeometry(args.inputY), ...args.editor })}
      {callStack(
        args.cards,
        Vec2(STACK_X, stackTop),
        args.height - stackTop - 14,
        SLICE_STACK,
      )}
    </g>
  );
}
