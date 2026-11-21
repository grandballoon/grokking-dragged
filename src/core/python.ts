/**
 * Python semantics the ports need beyond plain JavaScript, as pure
 * functions: how values print (`repr`, `str`, `print`), how `float`s print,
 * floor division, slicing, negative indexing and `dict.pop`.
 *
 * A JavaScript number does not know whether it was a Python `int` or a
 * `float`. `pyRepr` prints numbers as `int`s; a port that holds a `float`
 * formats it with `pyFloat`, and a dict of them with `pyDictRepr`.
 */

/** Python's `repr(s)` for a str: single quotes unless only double quotes avoid escaping. */
export function pyStrRepr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  const escaped = s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replaceAll(quote, `\\${quote}`);
  return `${quote}${escaped}${quote}`;
}

/** Python's `repr(x)` for an `int`, written the way JavaScript holds it. */
function intRepr(x: number): string {
  if (x === Infinity) return "inf";
  if (x === -Infinity) return "-inf";
  return String(x);
}

/**
 * Python's `repr` of a value as the ports hold it: `None` for null or
 * undefined, `True`/`False`, numbers as `int`s, a list for an array, a set
 * for a `Set` and a dict for a plain object (in insertion order).
 */
export function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return intRepr(value);
  if (typeof value === "string") return pyStrRepr(value);
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(", ")}]`;
  if (value instanceof Set) {
    return value.size === 0 ? "set()" : `{${[...value].map(pyRepr).join(", ")}}`;
  }
  if (typeof value === "object") return pyDictRepr(value as Record<string, unknown>);
  return String(value);
}

/** Python's `repr` of a dict, each value printed by `valueRepr`. */
export function pyDictRepr<V>(
  dict: Readonly<Record<string, V>>,
  valueRepr: (value: V) => string = pyRepr,
): string {
  const entries = Object.entries(dict).map(
    ([k, v]) => `${pyStrRepr(k)}: ${valueRepr(v)}`,
  );
  return `{${entries.join(", ")}}`;
}

/** Python's `str(value)`: a str prints bare, everything else as its repr. */
export function pyStr(value: unknown): string {
  return typeof value === "string" ? value : pyRepr(value);
}

/** The line `print(*args)` writes: each argument's `str`, joined by spaces. */
export function pyPrint(...args: readonly unknown[]): string {
  return args.map(pyStr).join(" ");
}

/** Python's `repr(x)` for a `float`: `1.0`, `0.67`, `1e-05`, `1e+16`, `inf`. */
export function pyFloat(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (x === Infinity) return "inf";
  if (x === -Infinity) return "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  // toExponential() with no argument gives the shortest digits that
  // round-trip, which is also what Python's repr uses.
  const [mantissa, exp] = x.toExponential().split("e") as [string, string];
  const e = Number(exp);
  const sign = mantissa.startsWith("-") ? "-" : "";
  const digits = mantissa.replace("-", "").replace(".", "");
  if (e < -4 || e >= 16) {
    const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    const ee = Math.abs(e).toString().padStart(2, "0");
    return `${sign}${m}e${e < 0 ? "-" : "+"}${ee}`;
  }
  if (e < 0) return `${sign}0.${"0".repeat(-e - 1)}${digits}`;
  const whole = digits.slice(0, e + 1).padEnd(e + 1, "0");
  const frac = digits.slice(e + 1);
  return `${sign}${whole}.${frac === "" ? "0" : frac}`;
}

/** Python's `a // b` on `int`s: floor division, rounding towards -inf. */
export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

/**
 * Python's `list[start:end]` with a step of 1: a fresh list, negative bounds
 * counted from the end, out-of-range bounds clamped. JavaScript's `slice`
 * has exactly these rules, so this only names the intent.
 */
export function pySlice<T>(list: readonly T[], start?: number, end?: number): T[] {
  return list.slice(start, end);
}

/**
 * The position `list[k]` reads in a list of `length` items: a negative `k`
 * counts from the end. Raises Python's IndexError when there is none.
 */
export function pyIndexOf(k: number, length: number): number {
  const at = k < 0 ? length + k : k;
  if (at < 0 || at >= length) throw new RangeError("IndexError: list index out of range");
  return at;
}

/** Python's `list[k]`: negative indexes count from the end. */
export function pyIndex<T>(list: readonly T[], k: number): T {
  return list[pyIndexOf(k, list.length)]!;
}

/**
 * Python's `d.pop(key)` on a dict held as a plain object: removes the key in
 * place, keeping the others' order, and raises KeyError if it is missing.
 */
export function dictPop<V>(dict: Record<string, V>, key: string): V {
  if (!Object.hasOwn(dict, key)) throw new Error(`KeyError: ${pyStrRepr(key)}`);
  const value = dict[key]!;
  Reflect.deleteProperty(dict, key);
  return value;
}
