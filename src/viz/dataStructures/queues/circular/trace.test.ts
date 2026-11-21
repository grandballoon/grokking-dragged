import { describe, expect, it } from "vitest";
import { outcomeText } from "../parts";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { INITIAL_INPUT, run, SRC, type Vars } from "./trace";
import type { Frame } from "../../../../core/trace";

/** The last frame of each op: the queue as the op leaves it. */
function afterEachOp(frames: readonly Frame<Vars>[]): Frame<Vars>[] {
  return frames.filter(
    (f, i) => f.vars.op !== null && frames[i + 1]?.vars.op !== f.vars.op,
  );
}

describe("circular-array queue port", () => {
  const frames = run(INITIAL_INPUT);
  const ends = afterEachOp(frames);

  it("starts with five empty slots", () => {
    expect(frames[0]!.vars.queue).toEqual({
      _data: [null, null, null, null, null],
      _max_size: 5,
      _front: 0,
      _rear: 0,
      _size: 0,
    });
  });

  it("leaves _data, _front, _rear and _size as the Python does after every op", () => {
    // From running the same script against queues/queue.py.
    expect(
      ends.map((f) => {
        const q = f.vars.queue!;
        return [q._data, q._front, q._rear, q._size];
      }),
    ).toEqual([
      [[null, null, null, null, null], 0, 0, 0],
      [[3, null, null, null, null], 0, 1, 1],
      [[3, 1, null, null, null], 0, 2, 2],
      [[3, 1, 4, null, null], 0, 3, 3],
      [[3, 1, 4, null, null], 1, 3, 2],
      [[3, 1, 4, null, null], 2, 3, 1],
      [[3, 1, 4, 1, null], 2, 4, 2],
      [[3, 1, 4, 1, 5], 2, 0, 3],
      [[9, 1, 4, 1, 5], 2, 1, 4],
      [[9, 2, 4, 1, 5], 2, 2, 5],
      [[9, 2, 4, 1, 5], 2, 2, 5],
      [[9, 2, 4, 1, 5], 3, 2, 4],
    ]);
  });

  it("returns and raises what the Python does", () => {
    expect(
      frames.at(-1)!.vars.outcomes.map((o) => (o === null ? null : outcomeText(o))),
    ).toEqual([
      "ValueError",
      null,
      null,
      null,
      "→ 3",
      "→ 1",
      null,
      null,
      null,
      null,
      "ValueError",
      "→ 4",
    ]);
  });

  it("records each exception at its raise line and carries on", () => {
    const raises = frames.filter((f) => lineText(SRC, f.line).trim().startsWith("raise"));
    expect(raises.map((f) => [f.vars.op, f.note])).toEqual([
      [0, "ValueError: Cannot dequeue from an empty queue"],
      [10, "ValueError: The queue is already full!"],
    ]);
    expect(raises[0]!.vars.outcomes[0]?.raised).toBe("ValueError");
  });

  it("wraps _rear around to slot 0", () => {
    const wrap = frames.find((f) => f.note.includes("wraps around to the first slot"));
    expect(wrap?.vars.queue?._rear).toBe(0);
    expect(wrap?.vars.op).toBe(7);
  });

  it("raises from the constructor for a queue too small to use", () => {
    const tiny = run({ max_size: 1, ops: script(["enqueue", 1]) });
    expect(tiny).toHaveLength(1);
    expect(tiny[0]!.vars.queue).toBeNull();
    expect(tiny[0]!.note).toBe(
      "ValueError: Invalid size (a queue must have at least two elements): 1",
    );
  });
});
