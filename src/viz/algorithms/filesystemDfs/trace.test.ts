import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_TREE, isfile, join, listdir, moves } from "./fs";
import { INITIAL_INPUT, run, SRC } from "./trace";

const at = (line: number) => lineText(SRC, line).trim();

describe("virtual filesystem", () => {
  it("lists a folder in stored order, like an unsorted os.listdir", () => {
    expect(listdir(BOOK_TREE, "pics")).toEqual(["odyssey.png", "2002", "2001"]);
    expect(listdir(BOOK_TREE, "pics/2002/trip")).toEqual(["sea.png", "beach.png"]);
  });

  it("tells files from folders and joins paths", () => {
    expect(isfile(BOOK_TREE, "pics/2001/a.png")).toBe(true);
    expect(isfile(BOOK_TREE, "pics/2001")).toBe(false);
    expect(isfile(BOOK_TREE, "pics/nope.png")).toBe(false);
    expect(join("pics", "2001")).toBe("pics/2001");
  });

  it("never moves a folder into itself or next to a namesake", () => {
    const targets = moves(BOOK_TREE, "2002").map(
      (tree) => tree.find((e) => e.id === "2002")!.parent,
    );
    expect(targets).toEqual(["pics", "2001"]);
  });
});

describe("printnames port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  // The Python, run on a real copy of this tree, prints exactly these lines.
  it("prints what the Python prints", () => {
    expect(last.vars.stdout).toEqual([
      "a.png",
      "space.png",
      "london.png",
      "beach.png",
      "sea.png",
      "odyssey.png",
    ]);
    expect(last.vars.finished).toBe(true);
    expect(last.vars.stack).toEqual([]);
  });

  it("recurses three calls deep into pics/2002/trip", () => {
    const deepest = Math.max(...frames.map((f) => f.vars.stack.length));
    expect(deepest).toBe(3);
    const inTrip = frames.find((f) => f.vars.stack.length === 3)!;
    expect(inTrip.vars.stack.map((c) => c.dir)).toEqual([
      "pics",
      "pics/2002",
      "pics/2002/trip",
    ]);
    expect(inTrip.vars.stack[2]!.listing).toEqual(["beach.png", "sea.png"]);
  });

  it("walks each folder's sorted listing", () => {
    const first = frames.find((f) => at(f.line) === "for file in sorted(listdir(dir)):")!;
    expect(first.vars.stack[0]!.listing).toEqual(["2001", "2002", "odyssey.png"]);
  });

  it("prints a moved file in its new place", () => {
    const tree = BOOK_TREE.map((e) =>
      e.id === "odyssey" ? { ...e, parent: "trip" } : e,
    );
    expect(run({ tree }).at(-1)!.vars.stdout).toEqual([
      "a.png",
      "space.png",
      "london.png",
      "beach.png",
      "odyssey.png",
      "sea.png",
    ]);
  });
});
