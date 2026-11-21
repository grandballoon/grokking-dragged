import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_INPUT, run, SRC, type Input } from "./trace";

const at = (line: number) => lineText(SRC, line).trim();
const final = (input: Input) => run(input).at(-1)!;

describe("set covering port", () => {
  const frames = run(BOOK_INPUT);

  it("chooses the stations the Python prints", () => {
    const last = frames.at(-1)!;
    expect([...last.vars.final_stations!].sort()).toEqual([
      "kfive",
      "kone",
      "kthree",
      "ktwo",
    ]);
    expect(last.vars.stdout).toEqual(["{'kone', 'ktwo', 'kthree', 'kfive'}"]);
    expect(at(last.line)).toBe("print(my_set_covering(states_needed, stations))");
  });

  it("picks greedily, in the order the rounds find them", () => {
    const chosen = frames
      .filter((f) => at(f.line) === "final_stations.add(best_station)")
      .map((f) => f.vars.best_station);
    expect(chosen).toEqual(["kone", "ktwo", "kthree", "kfive"]);
  });

  it("mutates states_needed and pops chosen stations, as the Python does", () => {
    const firstPop = frames.find((f) => at(f.line) === "stations.pop(best_station)")!;
    expect([...firstPop.vars.states_needed]).toEqual(["mt", "wa", "or", "ca", "az"]);
    expect(Object.keys(firstPop.vars.stations)).toEqual([
      "ktwo",
      "kthree",
      "kfour",
      "kfive",
    ]);
  });

  // Expected values from running my_set_covering in Python on these inputs.
  it("returns None when a state can't be covered", () => {
    const input = { ...BOOK_INPUT, stations: { ...BOOK_INPUT.stations, kfive: ["ca"] } };
    const last = final(input);
    expect(last.vars.stdout).toEqual(["None"]);
    const returned = run(input).find((f) => at(f.line) === "return None")!;
    expect([...returned.vars.states_needed]).toEqual(["az"]);
  });

  it("matches Python on edited stations", () => {
    const input: Input = {
      ...BOOK_INPUT,
      stations: {
        kone: ["id", "nv", "ut", "ca"],
        ktwo: ["wa", "id", "mt"],
        kthree: ["or", "nv", "ca"],
        kfour: ["nv", "ut"],
        kfive: ["az", "or"],
      },
    };
    expect([...final(input).vars.final_stations!].sort()).toEqual([
      "kfive",
      "kone",
      "ktwo",
    ]);
  });

  it("covers nothing when nothing is needed", () => {
    expect(final({ ...BOOK_INPUT, states_needed: [] }).vars.stdout).toEqual(["set()"]);
  });
});
