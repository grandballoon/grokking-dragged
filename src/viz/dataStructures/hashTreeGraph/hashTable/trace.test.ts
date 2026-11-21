import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { INITIAL_INPUT } from "./input";
import { run, SLL_SRC, SRC, type Vars } from "./trace";

/** A bucket's values, head first, read off a frame's plain-data copy. */
function values(list: Vars["_data"][number]): number[] {
  const out: number[] = [];
  for (let n = list._head; n !== null; n = n._next) out.push(n._data);
  return out;
}

const buckets = (vars: Vars) => vars._data.map(values);

/** The frame that ends each op: the last one recorded while it ran. */
function lastOfEachOp(frames: ReturnType<typeof run>) {
  const ends = new Map<number, (typeof frames)[number]>();
  for (const f of frames) if (f.vars.op !== null) ends.set(f.vars.op, f);
  return [...ends.values()];
}

describe("hash table port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("ends with the buckets the Python ends with", () => {
    // Python: [list(b) for b in t._data]
    expect(buckets(last.vars)).toEqual([[], [-1, 2], [9], [6], []]);
  });

  it("returns and raises what the Python does, op by op", () => {
    const ends = lastOfEachOp(frames);
    expect(ends.map((f) => f.vars.result ?? f.vars.error)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      "6",
      "None",
      "True",
      null,
      null,
      "ValueError: No element with value 7 was found in the hash table.",
    ]);
    expect(lineText(SRC, last.line)).toContain("raise ValueError");
  });

  it("hashes -1 by its key, hash(-1) == -2", () => {
    const insert = frames.find((f) => f.vars.op === 4 && f.vars.hashing !== null)!;
    expect(insert.vars.hashing!.key).toBe(-2);
    expect(insert.vars.hashing!.index).toBe(1);
  });

  it("inserts collisions in front of the bucket", () => {
    const afterSecond = frames.filter((f) => f.vars.op === 2).at(-1)!;
    expect(lineText(SLL_SRC, afterSecond.line)).toContain(
      "SinglyLinkedList.Node(data, old_head)",
    );
    expect(buckets(afterSecond.vars)[3]).toEqual([11, 6]);
  });

  it("walks the chain while searching", () => {
    const visits = frames
      .filter(
        (f) => f.vars.op === 6 && lineText(SLL_SRC, f.line).includes("if predicate"),
      )
      .map((f) => f.vars.current!._data);
    expect(visits).toEqual([11, 6]);
  });

  it("raises from the list first, then from the table", () => {
    const tail = frames.slice(-2).map((f) => f.file);
    expect(tail).toEqual([SLL_SRC.file, SRC.file]);
  });

  it("raises for a non-positive size, as the constructor does", () => {
    const bad = run({ buckets: 0, ops: script(["insert", 1]) });
    expect(bad.length).toBe(1);
    expect(bad[0]!.note).toBe(
      "ValueError: Invalid size for the hash table (must be positive): 0",
    );
  });
});
