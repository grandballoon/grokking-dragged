/**
 * Port of python-master/10/01_set_covering.py.
 *
 * `states_needed` and every station's states are `Set`s and `stations` a
 * dict in insertion order, as in the Python. Like the Python,
 * `my_set_covering` mutates what it is given: it subtracts covered states
 * from `states_needed` and pops each chosen station out of `stations`.
 *
 * Python prints sets in hash order, which changes from run to run; the port
 * prints them in insertion order instead.
 */
import source from "@repo/python-master/10/01_set_covering.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import { dictPop, pyRepr } from "../../../core/python";

export const SRC = pythonSource("python-master/10/01_set_covering.py", source);

export type Input = {
  readonly states_needed: readonly string[];
  readonly stations: Readonly<Record<string, readonly string[]>>;
};

/** The sets exactly as the Python script builds them. */
export const BOOK_INPUT: Input = {
  states_needed: ["mt", "wa", "or", "id", "nv", "ut", "ca", "az"],
  stations: {
    kone: ["id", "nv", "ut"],
    ktwo: ["wa", "id", "mt"],
    kthree: ["or", "nv", "ca"],
    kfour: ["nv", "ut"],
    kfive: ["ca", "az"],
  },
};

export type Vars = {
  states_needed: Set<string>;
  stations: Record<string, Set<string>>;
  final_stations: Set<string> | null;
  best_station: string | null;
  states_covered: Set<string> | null;
  station: string | null;
  covered: Set<string> | null;
  /** What `my_set_covering` returned, once it has (`None` stays null). */
  returned: boolean;
  stdout: string[];
};

/** Python's `a & b`, listing the shared items in `b`'s order. */
function intersect(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...b].filter((x) => a.has(x)));
}

const setRepr = (s: Set<string>) => pyRepr(s);

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);

  const states_needed = new Set(input.states_needed);
  const stations: Record<string, Set<string>> = {};
  for (const [name, states] of Object.entries(input.stations)) {
    stations[name] = new Set(states);
  }
  const stdout: string[] = [];
  let final_stations: Set<string> | null = null;
  let best_station: string | null = null;
  let states_covered: Set<string> | null = null;
  let station: string | null = null;
  let covered: Set<string> | null = null;
  let returned = false;
  const vars = (): Vars => ({
    states_needed,
    stations,
    final_stations,
    best_station,
    states_covered,
    station,
    covered,
    returned,
    stdout,
  });

  step(
    'stations["kfive"] = set(["ca", "az"])',
    vars(),
    `Need ${states_needed.size} states, from ${Object.keys(stations).length} stations.`,
  );

  function my_set_covering(
    states_needed: Set<string>,
    stations: Record<string, Set<string>>,
  ): Set<string> | null {
    final_stations = new Set();
    step("final_stations = set()", vars(), "No stations chosen yet.");
    while (states_needed.size > 0) {
      step(
        "while states_needed:",
        vars(),
        `Still need ${setRepr(states_needed)}: pick another station.`,
      );
      best_station = null;
      states_covered = new Set();
      step(
        "states_covered = set()",
        vars(),
        "Start this round with no best station, covering nothing.",
      );
      for (const [name, states_for_station] of Object.entries(stations)) {
        station = name;
        covered = intersect(states_needed, states_for_station);
        const better = covered.size > states_covered.size && !final_stations.has(station);
        step(
          "covered = states_needed & states_for_station",
          vars(),
          `${station} covers ${covered.size} still-needed state${covered.size === 1 ? "" : "s"}: ${setRepr(covered)}.` +
            (better
              ? ` More than ${states_covered.size}, so it's the best so far.`
              : ` Not more than ${states_covered.size}, so keep ${best_station ?? "None"}.`),
        );
        if (better) {
          best_station = station;
          states_covered = covered;
          step("states_covered = covered", vars(), `${station} is the best so far.`);
        }
      }
      if (best_station !== null) {
        for (const s of states_covered) states_needed.delete(s);
        step(
          "states_needed -= states_covered",
          vars(),
          `${best_station} wins: ${setRepr(states_covered)} are covered now.`,
        );
        final_stations.add(best_station);
        step("final_stations.add(best_station)", vars(), `Choose ${best_station}.`);
        dictPop(stations, best_station);
        step(
          "stations.pop(best_station)",
          vars(),
          `Pop ${best_station} out of stations so it isn't considered again.`,
        );
      } else {
        returned = true;
        step(
          "return None",
          vars(),
          `No station covers any of ${setRepr(states_needed)}: return None.`,
        );
        return null;
      }
    }
    returned = true;
    step(
      "return final_stations",
      vars(),
      `Every state is covered: return ${setRepr(final_stations)}.`,
    );
    return final_stations;
  }

  const result = my_set_covering(states_needed, stations);
  stdout.push(result === null ? "None" : setRepr(result));
  step("print(my_set_covering(states_needed, stations))", vars(), `Print ${stdout[0]}.`);
  return rec.frames;
}
