# Grokking, dragged

Visual, draggable re-implementations of the Python from the Grokking books, built on [Dragology](https://declarative-dragging.github.io/), the library from _Declarative Dragging_ by Horowitz, Blinn and Heer.
It covers the book chapters in [`sources/python-master/`](sources/python-master) and the data structures in [`sources/grokking_data_structures-main/python/`](sources/grokking_data_structures-main/python).

```bash
cd visual
npm install
npm run dev
```

`npm run check` runs the type checker, ESLint, Prettier and the tests.

## What you see

Every page traces one Python program.
The left panel draws the program's own data structures, the right panel shows the original Python file with the line being executed highlighted, and the strip below narrates the step.
The timeline knob at the bottom is a Dragology `d.between` over every recorded step, so dragging it blends the whole picture between neighbouring steps of the algorithm.
Each page also lets you drag its input: reorder an array, rewire a graph, move the key into another box, reorder an operation script.
The trace is recomputed from the edited input as you drag, so you see where the algorithm would go before you let go.

## Architecture

The app is a functional core with a thin imperative shell.

| Layer    | Where                              | Pure? | Job                                                                                                                           |
| -------- | ---------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| Source   | `src/core/pythonSource.ts`         | yes   | Holds a Python file's text; finds a line by a snippet of its text; picks which lines the code panel shows.                    |
| Trace    | `src/core/trace.ts`                | yes   | `Frame` type, the `recorder` a port uses to record frames, and `memoByValue`, which caches a trace by the value of its input. |
| Stepping | `src/core/stepping.ts`             | yes   | `VizState = { input, step }` and the rules for moving between steps and inputs.                                               |
| Port     | `src/viz/**/trace.ts`              | yes   | One Python program ported to TypeScript: `run(input) -> Frame[]`.                                                             |
| Drawing  | `src/viz/**/viz.tsx`               | yes   | One frame -> SVG, with Dragology drag specs that produce new inputs.                                                          |
| Chrome   | `src/viz/defineViz.tsx`, `src/ui/` | yes   | Wraps a port and a drawing into one Dragology `Draggable` with the code panel, narration and timeline.                        |
| Shell    | `src/app/`                         | no    | Routing, React state, keyboard, autoplay.                                                                                     |

Only `src/app/` holds state or touches the DOM.
Everything else is a function of its arguments, and tested by plain equality on its outputs.

## The contract for one visualization

A visualization lives in its own folder, `src/viz/<book>/<name>/`, with three files.

### `trace.ts`: the port

- Import the original Python file with `?raw` (via `@sources/...`, or the shared module `src/viz/dataStructures/sources.ts`) and wrap it with `pythonSource`.
  The code panel shows this text, so never copy or edit the Python.
- Export `run(input): Frame<Vars>[]`.
  It must be a pure function of `input`.
  Inside, mutate local variables exactly the way the Python does, statement for statement.
- Keep the Python's data structures and names.
  A `dict` stays a keyed object (insertion order matters, as in Python), a `list` an array, a `deque` an array used from both ends, a `set` a `Set`, a class a class with the same fields (`_head`, `_next`, `_size`, ...) and the same method names.
  `Vars` uses the Python variable names (`search_queue`, `dp_table`, `states_needed`).
  The one permitted addition is a `uid` field on node-like objects, so a node keeps its identity across frames; document it where you add it.
- Record a frame with the step function from `recorder().in(SRC)`: `step("snippet of the line", vars, "what just happened")`.
  The snippet must match exactly one code line of the file, or pass `{ snippet, after }` to take the first match after an anchor line.
  Record _after_ the line has executed, so the frame shows its effect.
  Frames are deep-copied with `structuredClone`, so pass the live variables.
- When a port calls into another file (a `Stack` built on a `SinglyLinkedList`), record with that file's step function, and list every file in the visualization's `sources`.
- Write the narration as a plain sentence about this step, in the book's voice, using the real values.
- What the program prints goes in a `stdout: string[]` var, one entry per `print`, formatted the way Python would print it.
- Recursion shows up as a `stack` var: one entry per active call, outermost first, with that call's arguments and locals under their Python names.
- Python semantics win over JavaScript ones: negative indexes wrap (`dp_table[-1]` is the last row), slices copy, `//` floors, integer and `Decimal` arithmetic must give Python's exact results.
- When a data-structure method raises, record a frame at the `raise` line whose note gives the exception (`ValueError: The array is already full`); the script then carries on with the next call, as if the demo had caught it.

### `trace.test.ts`: equality tests on the port

Check the final result against what the Python actually prints (run it), and pin down a few interesting intermediate frames.
Use `lineText(SRC, frame.line)` to assert which line a frame is on.

### `viz.tsx`: the drawing

- Export one `defineViz({...})` entry.
- `draw` receives the current `frame`, the `input`, the diagram `size` (760 wide; set `diagramHeight` if you need more or less than 520), the spec builder `d`, `draggedId`, `withInput(input)`, which gives the `VizState` for an edited input, and `trace(input)`, which gives an input's frames.
- `defineViz` caches traces by the value of their input, so build candidate inputs freshly in every drag spec and never add a cache of your own.
  Call `trace(input)` rather than the raw `run` when a drawing needs another input's frames.
- Draw with plain functions (`cell`, `label`, `arrow`, `caption`, `uid` in `src/ui/svg.tsx`), never React components: Dragology cannot see inside components.
- Position everything with `transform={translate(...)}`, never `x`/`y`/`cx`/`cy`.
- Give an `id` to every element whose identity matters across frames, and to the outer element of every `.map` whose length can change.
  Ids must be unique across the whole SVG and contain no `/`; build them with `uid(...)`.
  Never use React `key`, and never use fragments (`<>`); wrap in `<g>`.
- Wrap every part that is drawn on some steps and not others in `optional(key, part)` from `src/ui/svg.tsx`.
  Dragology matches siblings without an id by position, so a part that comes and goes would shift its siblings, and dragging the timeline between two steps would try to blend a `<text>` into a `<g>` and throw.
  `optional` pins the part with a `dragologyKey`.
  When one spot shows one of two different drawings, give each its own `optional` with its own key.
  The same goes for a non-numeric prop such as `textAnchor`: it cannot blend, so draw the two variants under different keys.
- Use the colour roles in `src/ui/theme.ts` consistently: blue is "looking at this now", amber "waiting its turn", grey "already handled", green "done or found".
- Offer at least one drag that edits the input, and describe every drag in `drags`.
  The usual shapes are `d.closest(candidateStates).withFloating()` for picking an item up and dropping it somewhere (reordering, moving between lists), and `d.vary(state, param(...))` for continuous values.
  Candidate states come from `withInput(...)`.
  `src/core/keyedLists.ts` moves items within a dict of lists; `src/viz/dataStructures/opScript.tsx` renders an editable script of method calls.

`src/viz/vizzes.test.ts` renders every step of every registered visualization through Dragology's own renderer, checks ids, keys and fragments, and builds every drag spec, so a broken snippet, a duplicate id or a crash in a candidate input fails the tests.
It also drags the timeline knob half-way between every pair of neighbouring steps, which catches drawings that render fine one step at a time but cannot be blended.

### Registering it

Add the entry to its book's registry under `src/viz/algorithms/` or `src/viz/dataStructures/`.
Its `chapter` label is the book's chapter number and title, such as `"9 · Queues"`; the sidebar sorts chapters by that number.
