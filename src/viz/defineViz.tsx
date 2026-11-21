/**
 * The seam between one algorithm's visualization and the app.
 *
 * A visualization supplies a pure `run` (input -> trace of frames) and a pure
 * `draw` (one frame -> SVG, with drag specs for editing the input). This
 * module wraps both into a single Dragology `Draggable` with the shared
 * chrome around it: the code panel, the narration line and the timeline.
 * Visualizations never touch React state, timers or the DOM.
 */
import {
  translate,
  Vec2,
  type DragSpecBuilder,
  type Draggable,
  type SetState,
  type Svgx,
} from "dragology";
import type { PythonSource } from "../core/pythonSource";
import { clampStep, withInput, type VizState } from "../core/stepping";
import { memoByValue, type Frame } from "../core/trace";
import { codePanel } from "../ui/codePanel";
import { scrubber } from "../ui/scrubber";
import { box, label } from "../ui/svg";
import { color } from "../ui/theme";

export type Book = "Grokking Algorithms" | "Grokking Data Structures";

export type DrawArgs<I, V> = {
  readonly frame: Frame<V>;
  readonly frames: readonly Frame<V>[];
  readonly state: VizState<I>;
  readonly input: I;
  /** The diagram area's size; draw within (0,0)–size. */
  readonly size: Vec2;
  readonly d: DragSpecBuilder<VizState<I>>;
  readonly draggedId: string | null;
  /** The state to switch to if the input became `input`. */
  readonly withInput: (input: I) => VizState<I>;
  /** The trace of any input, cached by value; use it instead of the raw port. */
  readonly trace: (input: I) => readonly Frame<V>[];
  readonly setState: SetState<VizState<I>>;
};

export type VizSpec<I extends object, V> = {
  readonly id: string;
  readonly title: string;
  readonly book: Book;
  readonly chapter: string;
  /** One or two sentences on what the algorithm does. */
  readonly summary: string;
  /** What the reader can drag, one short imperative per item. */
  readonly drags: readonly string[];
  readonly sources: readonly PythonSource[];
  readonly initialInput: I;
  readonly run: (input: I) => Frame<V>[];
  readonly draw: (args: DrawArgs<I, V>) => Svgx;
  readonly diagramHeight?: number;
};

/** A visualization with its types erased, as the app shell sees it. */
export type VizEntry = {
  readonly id: string;
  readonly title: string;
  readonly book: Book;
  readonly chapter: string;
  readonly summary: string;
  readonly drags: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly initialState: VizState<unknown>;
  readonly draggable: Draggable<VizState<unknown>>;
  readonly frameCount: (state: VizState<unknown>) => number;
};

export const CANVAS_WIDTH = 1300;
const MARGIN = 16;
const GAP = 16;
const DIAGRAM_WIDTH = 760;
const NOTE_HEIGHT = 40;
const SCRUB_HEIGHT = 40;

export function defineViz<I extends object, V>(spec: VizSpec<I, V>): VizEntry {
  const run = memoByValue(spec.run);
  const diagramHeight = spec.diagramHeight ?? 520;
  const codeX = MARGIN + DIAGRAM_WIDTH + GAP;
  const codeWidth = CANVAS_WIDTH - codeX - MARGIN;
  const noteY = MARGIN + diagramHeight + 12;
  const scrubY = noteY + NOTE_HEIGHT + 12 + SCRUB_HEIGHT / 2;
  const height = scrubY + SCRUB_HEIGHT / 2 + MARGIN;
  const size = Vec2(DIAGRAM_WIDTH, diagramHeight);

  const draggable: Draggable<VizState<I>> = ({ state, d, draggedId, setState }) => {
    const frames = run(state.input);
    const step = clampStep(state.step, frames.length);
    const frame = frames[step]!;
    const shown = step === state.step ? state : { ...state, step };
    return (
      <g>
        <rect width={CANVAS_WIDTH} height={height} fill={color.paper} />
        <g transform={translate(MARGIN, MARGIN)}>
          {box(DIAGRAM_WIDTH, diagramHeight, {
            fill: color.panel,
            stroke: color.panelBorder,
            radius: 10,
            strokeWidth: 1,
          })}
          {spec.draw({
            frame,
            frames,
            state: shown,
            input: state.input,
            size,
            d,
            draggedId,
            setState,
            trace: run,
            withInput: (input) =>
              withInput(shown, frames.length, input, run(input).length),
          })}
        </g>
        <g transform={translate(codeX, MARGIN)}>
          {codePanel(
            spec.sources,
            frame.file,
            frame.line,
            Vec2(codeWidth, diagramHeight),
          )}
        </g>
        <g transform={translate(MARGIN, noteY)}>
          {box(CANVAS_WIDTH - 2 * MARGIN, NOTE_HEIGHT, {
            fill: color.panel,
            stroke: color.panelBorder,
            radius: 8,
            strokeWidth: 1,
          })}
          {label(frame.note, Vec2(16, NOTE_HEIGHT / 2), { size: 14, anchor: "start" })}
        </g>
        <g transform={translate(MARGIN, scrubY)}>
          {scrubber(shown, frames.length, d, setState, CANVAS_WIDTH - 2 * MARGIN)}
        </g>
      </g>
    );
  };

  return {
    id: spec.id,
    title: spec.title,
    book: spec.book,
    chapter: spec.chapter,
    summary: spec.summary,
    drags: spec.drags,
    width: CANVAS_WIDTH,
    height,
    initialState: { input: spec.initialInput, step: 0 },
    // The one place types are erased: the shell only ever hands this
    // draggable states that it produced itself.
    draggable: draggable as unknown as Draggable<VizState<unknown>>,
    frameCount: (state) => run(state.input as I).length,
  };
}
