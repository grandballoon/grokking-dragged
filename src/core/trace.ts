import { lineOf, type LineQuery, type PythonSource } from "./pythonSource";

/**
 * One recorded step of a traced algorithm: where it was in the Python source,
 * a snapshot of the variables it was working on, and a sentence about what
 * just happened.
 *
 * `vars` keeps the shapes of the Python implementation: a `dict` stays a
 * keyed object, a `deque` an array used from both ends, a `set` a `Set`, a
 * linked node an object with `_data` and `_next`, and so on. Renderers draw
 * those structures directly.
 */
export type Frame<V> = {
  readonly file: string;
  readonly line: number;
  readonly vars: V;
  readonly note: string;
};

/**
 * Records frames while a port runs. A port is a pure function from its input
 * to its list of frames: inside, it mutates local variables exactly the way
 * the Python does, and calls a step function at the lines worth stopping on.
 * Each step deep-copies the variables it is given, so later mutation never
 * reaches an earlier frame.
 */
export type Recorder<V> = {
  readonly frames: Frame<V>[];
  /** A step function whose snippets are looked up in `src`. */
  in(src: PythonSource): Step<V>;
};

export type Step<V> = (snippet: string | Located, vars: V, note?: string) => void;

/** A snippet plus a query that disambiguates it. */
export type Located = { readonly snippet: string } & LineQuery;

export function recorder<V>(): Recorder<V> {
  const frames: Frame<V>[] = [];
  return {
    frames,
    in(src) {
      return (where, vars, note = "") => {
        const located = typeof where === "string" ? { snippet: where } : where;
        frames.push({
          file: src.file,
          line: lineOf(src, located.snippet, located),
          vars: structuredClone(vars),
          note,
        });
      };
    },
  };
}

/**
 * A string that is equal for two inputs exactly when they are equal as
 * values: plain objects (key order ignored), arrays, `Set`s and `Map`s (in
 * insertion order, which is meaningful in Python), strings, numbers,
 * booleans, `null` and `undefined`. Anything else, such as a class
 * instance or a function, is not an input value and throws.
 */
export function valueKey(value: unknown): string {
  if (value === undefined) return "u";
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    return Object.is(value, -0) ? "-0" : String(value);
  }
  if (Array.isArray(value)) return `[${value.map(valueKey).join(",")}]`;
  if (value instanceof Set) return `Set[${[...value].map(valueKey).join(",")}]`;
  if (value instanceof Map) {
    return `Map[${[...value].map(([k, v]) => `${valueKey(k)}:${valueKey(v)}`).join(",")}]`;
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.keys(value)
      .sort()
      .map(
        (k) => `${JSON.stringify(k)}:${valueKey((value as Record<string, unknown>)[k])}`,
      );
    return `{${entries.join(",")}}`;
  }
  throw new TypeError(`valueKey: not a plain input value: ${String(value)}`);
}

/**
 * Wraps a pure `input -> result` function so that equal inputs share one
 * result. Dragology builds every candidate state of a drag on every step,
 * each candidate a fresh but equal input object, so caching by identity
 * alone would re-run the port for each. Identity is checked first, then the
 * input's `valueKey`; the value cache keeps the `capacity` most recently
 * used results.
 */
export function memoByValue<I extends object, R>(
  fn: (input: I) => R,
  capacity = 2048,
): (input: I) => R {
  const byIdentity = new WeakMap<I, R>();
  const byValue = new Map<string, R>();
  return (input) => {
    const known = byIdentity.get(input);
    if (known !== undefined) return known;
    const key = valueKey(input);
    let result = byValue.get(key);
    if (result === undefined) {
      result = fn(input);
    } else {
      byValue.delete(key);
    }
    byValue.set(key, result);
    if (byValue.size > capacity) byValue.delete(byValue.keys().next().value!);
    byIdentity.set(input, result);
    return result;
  };
}
