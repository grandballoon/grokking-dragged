/**
 * Port of dictionaries/hash_table.py, run over an operation script.
 *
 * `HashTable` keeps the Python's fields and methods: `_m` buckets, `_data` a
 * list of SinglyLinkedLists (chaining), `_extract_key` defaulting to
 * Python's `hash`, and `_hash` computed with the exact Decimal arithmetic of
 * the original. Each method records steps in hash_table.py; the bucket
 * lists record theirs in singly_linked_list.py.
 */
import { recorder, type Frame } from "../../../../core/trace";
import { attempt, PyError } from "../../kit/pyError";
import { scriptRunner } from "../../kit/script";
import { tracer, type Tracer, type Where } from "../../kit/tracer";
import type { Op } from "../../opScript";
import {
  SinglyLinkedList,
  SRC as SLL_SRC,
  type Node,
} from "../../ports/singly_linked_list";
import { HASH_TABLE } from "../../sources";
import { decStr } from "../shared/decimal";
import { hashArithmetic, python_hash, type HashArithmetic } from "./hashing";

export const SRC = HASH_TABLE;
export { SLL_SRC };

export type Input = {
  /** `HashTable(buckets)` */
  readonly buckets: number;
  readonly ops: readonly Op[];
};

/** What a frame shows: the table, and the locals of the call in progress. */
export type Vars = {
  _m: number;
  _data: SinglyLinkedList<number>[];
  /** Index of the script op running, or null while the table is built. */
  op: number | null;
  key: number | null;
  index: number | null;
  hashing: HashArithmetic | null;
  /** The list method's `current` and `previous` nodes. */
  current: Node<number> | null;
  previous: Node<number> | null;
  /** The op's return value, in Python's repr, once it has returned. */
  result: string | null;
  error: string | null;
};

type Locals = Omit<Vars, "_m" | "_data" | "op">;

const EMPTY_LOCALS: Locals = {
  key: null,
  index: null,
  hashing: null,
  current: null,
  previous: null,
  result: null,
  error: null,
};

/**
 * How a method records a step in hash_table.py, updating the shown locals
 * first, or raises; `t` traces the bucket lists' own steps.
 */
type Env = {
  readonly at: (where: Where, note: string, locals?: Partial<Locals>) => void;
  readonly raise: (where: Where, type: string, detail: string) => never;
  readonly t: Tracer;
};

export class HashTable {
  _m: number;
  _data: SinglyLinkedList<number>[];
  _extract_key: (value: number) => number;

  constructor(buckets: number, env: Env, extract_key = python_hash) {
    if (buckets <= 0) {
      env.raise(
        "raise ValueError(f'Invalid size for the hash table (must be positive): {buckets}')",
        "ValueError",
        `Invalid size for the hash table (must be positive): ${buckets}`,
      );
    }
    this._m = buckets;
    this._data = Array.from({ length: buckets }, () => new SinglyLinkedList<number>());
    this._extract_key = extract_key;
    env.at(
      "self._data = [SinglyLinkedList() for _ in range(buckets)]",
      `A table of ${buckets} buckets, each an empty linked list.`,
    );
  }

  _hash(key: number, env: Env): number {
    const where = "return floor(abs(self._m * ((Decimal(key) * HashTable.__A__) % 1)))";
    let h: HashArithmetic;
    try {
      h = hashArithmetic(this._m, key);
    } catch (e) {
      return env.raise(
        where,
        "InvalidOperation",
        e instanceof Error ? e.message : String(e),
      );
    }
    env.at(
      where,
      `_hash(${key}): the fractional part of ${key}·A is ${short(decStr(h.fraction))}; ${this._m} times that, made positive and floored, is bucket ${h.index}.`,
      { key, hashing: h },
    );
    return h.index;
  }

  search(key: number, env: Env): number | null {
    const index = this._hash(key, env);
    env.at(
      "index = self._hash(key)",
      `Key ${key} lives in bucket ${index}, if anywhere.`,
      {
        index,
      },
    );
    const value_matches_key = {
      source: "value_matches_key",
      test: (v: number) => this._extract_key(v) === key,
    };
    const found = this._data[index]!.search(value_matches_key, env.t);
    env.at(
      "return self._data[index].search(value_matches_key)",
      `search(${key}) returns ${found === null ? "None" : found}.`,
      { result: found === null ? "None" : String(found) },
    );
    return found;
  }

  insert(value: number, env: Env): void {
    const key = this._extract_key(value);
    const index = this._hash(key, env);
    env.at(
      { snippet: "index = self._hash(self._extract_key(value))", after: "def insert(" },
      `${keyPhrase(value, key)}, so ${value} goes into bucket ${index}.`,
      { index },
    );
    this._data[index]!.insert_in_front(value, env.t);
  }

  contains(value: number, env: Env): boolean {
    const found = this.search(this._extract_key(value), env) !== null;
    env.at(
      "return self.search(self._extract_key(value)) is not None",
      `contains(${value}) returns ${found ? "True" : "False"}.`,
      { result: found ? "True" : "False" },
    );
    return found;
  }

  delete(value: number, env: Env): void {
    const key = this._extract_key(value);
    const index = this._hash(key, env);
    env.at(
      { snippet: "index = self._hash(self._extract_key(value))", after: "def delete(" },
      `${keyPhrase(value, key)}, so look for ${value} in bucket ${index}.`,
      { index },
    );
    if (attempt(() => this._data[index]!.delete(value, env.t)) !== null) {
      env.raise(
        "raise ValueError(f'No element with value {value} was found in the hash table.') from exc",
        "ValueError",
        `No element with value ${value} was found in the hash table.`,
      );
    }
  }
}

function keyPhrase(value: number, key: number): string {
  return key === value
    ? `The key of ${value} is ${key}`
    : `The key of ${value} is hash(${value}) = ${key}`;
}

/** A long Decimal string cut to a readable length for narration. */
function short(text: string): string {
  return text.length > 12 ? `${text.slice(0, 11)}…` : text;
}

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const stepTable = rec.in(SRC);
  const runner = scriptRunner(input.ops);

  let table: HashTable | null = null;
  let locals: Locals = EMPTY_LOCALS;
  const vars = (): Vars => ({
    _m: table?._m ?? input.buckets,
    _data: table?._data ?? [],
    op: runner.op,
    ...locals,
  });
  const at: Env["at"] = (where, note, patch = {}) => {
    locals = { ...locals, ...patch };
    stepTable(where, vars(), note);
  };
  const env: Env = {
    at,
    raise(where, type, detail) {
      const error = new PyError(type, detail);
      at(where, error.message, { error: error.message });
      throw error;
    },
    // A bucket list's step shows its `current` and `previous` nodes.
    t: tracer({
      newUid: runner.newUid,
      record(event) {
        const list = event.stack.at(-1)!.locals;
        locals = {
          ...locals,
          current: (list.current as Node<number> | undefined) ?? null,
          previous: (list.previous as Node<number> | undefined) ?? null,
        };
        rec.in(SLL_SRC)(event.where, vars(), event.note);
      },
    }),
  };

  const built = attempt(() => {
    table = new HashTable(input.buckets, env);
  });
  if (built !== null) return rec.frames;
  runner.run((o) => {
    locals = EMPTY_LOCALS;
    const arg = o.args[0] ?? 0;
    if (o.name === "insert") table!.insert(arg, env);
    else if (o.name === "search") table!.search(arg, env);
    else if (o.name === "contains") table!.contains(arg, env);
    else if (o.name === "delete") table!.delete(arg, env);
    else throw new Error(`Unknown op ${o.name}`);
  });
  return rec.frames;
}
