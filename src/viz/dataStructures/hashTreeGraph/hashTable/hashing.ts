/**
 * The arithmetic of `HashTable._hash`, step by step, and Python's `hash` for
 * ints, which is the table's default `extract_key`.
 */
import {
  abs,
  decFromFloat,
  decFromInt,
  floor,
  mod1,
  mul,
  type Dec,
} from "../shared/decimal";

/** `HashTable.__A__ = Decimal((sqrt(5) - 1) / 2)`. */
export const A: Dec = decFromFloat((Math.sqrt(5) - 1) / 2);

/** Each intermediate value of `floor(abs(m * ((Decimal(key) * A) % 1)))`. */
export type HashArithmetic = {
  readonly m: number;
  readonly key: number;
  /** `Decimal(key) * A` */
  readonly product: Dec;
  /** `(...) % 1` */
  readonly fraction: Dec;
  /** `m * (...)` */
  readonly scaled: Dec;
  /** `floor(abs(...))` */
  readonly index: number;
};

/** Throws `InvalidOperation` for keys too large for 28 digits, as Python does. */
export function hashArithmetic(m: number, key: number | bigint): HashArithmetic {
  const k = BigInt(key);
  const product = mul(decFromInt(k), A);
  const fraction = mod1(product);
  const scaled = mul(decFromInt(BigInt(m)), fraction);
  return {
    m,
    key: Number(key),
    product,
    fraction,
    scaled,
    index: Number(floor(abs(scaled))),
  };
}

const MODULUS = (1n << 61n) - 1n;

/** Python's `hash` of an int: reduced modulo 2**61 - 1, and never -1. */
export function python_hash(n: number): number {
  const v = BigInt(n);
  const magnitude = (v < 0n ? -v : v) % MODULUS;
  const h = v < 0n ? -magnitude : magnitude;
  return h === -1n ? -2 : Number(h);
}
