import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { INITIAL_INPUT, run, SRC } from "./trace";

describe("greet port", () => {
  const frames = run(INITIAL_INPUT);

  it("prints the four lines the Python prints, spacing and all", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual([
      "hello,  adit !",
      "how are you,  adit ?",
      "getting ready to say bye...",
      "ok bye!",
    ]);
  });

  it("stacks greet2 and then bye on top of greet", () => {
    const shapes = frames.map((f) => f.vars.stack.map((c) => c.fn).join(" "));
    expect([...new Set(shapes)]).toEqual(["", "greet", "greet greet2", "greet bye"]);
  });

  it("is in bye's print while greet waits beneath", () => {
    const f = frames.find((x) => lineText(SRC, x.line).includes('"ok bye!"'))!;
    expect(f.vars.stack.map((c) => c.fn)).toEqual(["greet", "bye"]);
  });

  it("greets whoever is passed in", () => {
    expect(run({ name: "maggie" }).at(-1)!.vars.stdout[0]).toBe("hello,  maggie !");
  });
});
