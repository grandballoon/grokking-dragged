/**
 * Port of python-master/06/01_breadth-first_search.py.
 *
 * Same data structures as the Python: `graph` is a dict of name -> list of
 * names, `search_queue` a deque (an array popped from the left), `searched` a
 * set. The port runs the same statements in the same order and records a
 * frame at each one.
 */
import source from "@repo/python-master/06/01_breadth-first_search.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";

export const SRC = pythonSource("python-master/06/01_breadth-first_search.py", source);

export type Graph = Readonly<Record<string, readonly string[]>>;
export type Input = { readonly graph: Graph; readonly start: string };

export type Vars = {
  search_queue: string[];
  searched: Set<string>;
  person: string | null;
  /** What `search` returned, once it has. */
  result: boolean | null;
};

/** The graph exactly as the Python script builds it. */
export const BOOK_GRAPH: Graph = {
  you: ["alice", "bob", "claire"],
  bob: ["anuj", "peggy"],
  alice: ["peggy"],
  claire: ["thom", "jonny"],
  anuj: [],
  peggy: [],
  thom: [],
  jonny: [],
};

export const INITIAL_INPUT: Input = { graph: BOOK_GRAPH, start: "you" };

export function person_is_seller(name: string): boolean {
  return name[name.length - 1] === "m";
}

export function run({ graph, start }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);

  const name = start;
  const search_queue: string[] = [];
  let searched = new Set<string>();
  let person: string | null = null;
  const vars = (result: boolean | null = null): Vars => ({
    search_queue,
    searched,
    person,
    result,
  });

  search_queue.push(name);
  step("search_queue += [name]", vars(), `Start the queue with ${name}.`);
  searched = new Set();
  step("searched = set()", vars(), "Nobody has been searched yet.");
  while (search_queue.length > 0) {
    person = search_queue.shift()!;
    step(
      "person = search_queue.popleft()",
      vars(),
      `Take ${person} off the front of the queue.`,
    );
    if (searched.has(person)) {
      step("continue", vars(), `${person} was already searched, so skip them.`);
      continue;
    }
    step(
      "if person_is_seller(person):",
      vars(),
      person_is_seller(person)
        ? `${person} ends in 'm': a mango seller!`
        : `${person} doesn't end in 'm', so isn't a mango seller.`,
    );
    if (person_is_seller(person)) {
      step(
        'print(person + " is a mango seller!")',
        vars(),
        `${person} is a mango seller!`,
      );
      step("return True", vars(true), "search returns True.");
      return rec.frames;
    }
    const friends = graph[person] ?? [];
    search_queue.push(...friends);
    step(
      "search_queue += graph[person]",
      vars(),
      friends.length === 0
        ? `${person} has no friends to add.`
        : `Queue up ${person}'s friends: ${friends.join(", ")}.`,
    );
    searched.add(person);
    step("searched.add(person)", vars(), `Mark ${person} as searched.`);
  }
  step(
    "return False",
    vars(false),
    "The queue is empty: no mango seller. search returns False.",
  );
  return rec.frames;
}
