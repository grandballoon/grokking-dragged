import { describe, expect, it } from "vitest";
import { moveItem } from "../../../core/keyedLists";
import { lineText } from "../../../core/pythonSource";
import { BOOK_CONTENTS, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();
const opened = (frames: ReturnType<typeof run>) =>
  frames.filter((f) => lineOf(f).startsWith("def ")).map((f) => f.vars.stack.at(-1)!.box);

describe("look for key port", () => {
  const frames = run({ contents: BOOK_CONTENTS });

  it("prints 'found the key!' once, as the Python does", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual(["found the key!"]);
  });

  it("opens the boxes depth first, in the order they were packed", () => {
    expect(opened(frames)).toEqual([
      "main_box",
      "box_A",
      "box_B",
      "box_C",
      "box_D",
      "box_E",
    ]);
  });

  it("finds the key with the whole chain of boxes on the stack", () => {
    const found = frames.find((f) => lineOf(f) === 'print("found the key!")')!;
    expect(found.vars.stack.map((c) => c.box)).toEqual(["main_box", "box_D", "box_E"]);
    expect(found.vars.stack.at(-1)!.item).toBe("key");
  });

  it("keeps searching after the key is found", () => {
    const early = moveItem(
      BOOK_CONTENTS,
      { key: "box_E", index: 0 },
      { key: "box_B", index: 0 },
    );
    const f = run({ contents: early });
    const printAt = f.findIndex((x) => lineOf(x) === 'print("found the key!")');
    const after = opened(f.slice(printAt));
    expect(after).toEqual(["box_C", "box_D", "box_E"]);
  });
});
