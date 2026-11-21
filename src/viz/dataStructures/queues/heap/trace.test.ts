import { describe, expect, it } from "vitest";
import { outcomeText } from "../parts";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { INITIAL_INPUT, run, SRC } from "./trace";

const values = (items: readonly { value: number }[]) => items.map((e) => e.value);
const at = (snippet: string) => (f: { line: number }) =>
  lineText(SRC, f.line).trim() === snippet;

describe("heap port", () => {
  const frames = run(INITIAL_INPUT);

  it("leaves _elements as the Python does after every _push_down and _bubble_up", () => {
    // From instrumenting queues/heap.py's _push_down and _bubble_up with the same demo.
    const settled = frames.filter(
      (f) =>
        at("self._elements[current_index] = element")(f) ||
        at("self._elements[index] = element")(f),
    );
    expect(
      settled.map((f) => [f.vars.stack.at(-1)!.fn, values(f.vars._elements)]),
    ).toEqual([
      ["_push_down", [3, 1, 4, 6, 5, 9, 2, 1]],
      ["_push_down", [3, 1, 9, 6, 5, 4, 2, 1]],
      ["_push_down", [3, 6, 9, 1, 5, 4, 2, 1]],
      ["_push_down", [9, 6, 4, 1, 5, 3, 2, 1]],
      ["_bubble_up", [9, 7, 4, 6, 5, 3, 2, 1, 1]],
      ["_push_down", [7, 6, 4, 1, 5, 3, 2, 1]],
      ["_push_down", [6, 5, 4, 1, 1, 3, 2]],
      ["_bubble_up", [8, 6, 4, 5, 1, 3, 2, 1]],
      ["_push_down", [6, 5, 4, 1, 1, 3, 2]],
    ]);
  });

  it("returns what the Python does", () => {
    expect(
      frames.at(-1)!.vars.outcomes.map((o) => (o === null ? null : outcomeText(o))),
    ).toEqual([null, "→ 9", "→ 7", null, "→ 8", "→ 8"]);
  });

  it("copies a parent down before moving the held element up, as the Python does", () => {
    const copy = frames.find(at("self._elements[index] = parent"))!;
    const bubble = copy.vars.stack.at(-1)!;
    expect(bubble.fn).toBe("_bubble_up");
    if (bubble.fn !== "_bubble_up") return;
    // The parent now sits in both slots; 7 is only in the local `element`.
    expect(values(copy.vars._elements)).toEqual([9, 6, 4, 1, 5, 3, 2, 1, 1]);
    expect(bubble.locals.element?.value).toBe(7);
    expect(bubble.locals.index).toBe(8);
  });

  it("keeps each element's uid, even between equal values", () => {
    const end = frames.at(-1)!.vars._elements;
    expect(new Set(end.map((e) => e.uid)).size).toBe(end.length);
    expect(
      end
        .filter((e) => e.value === 1)
        .map((e) => e.uid)
        .sort(),
    ).toEqual(["e1", "e3"]);
  });

  it("starts empty without elements, and raises on top of an empty heap", () => {
    const empty = run({ elements: [], ops: script(["top"], ["insert", 2]) });
    expect(lineText(SRC, empty[0]!.line).trim()).toBe("self._elements = []");
    const raise = empty.find(
      at("raise ValueError('Method top called on an empty heap.')"),
    )!;
    expect(raise.note).toBe("ValueError: Method top called on an empty heap.");
    expect(values(empty.at(-1)!.vars._elements)).toEqual([2]);
    expect(empty.at(-1)!.vars.outcomes[0]?.raised).toBe("ValueError");
  });
});
