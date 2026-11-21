/**
 * Just enough of Python's `decimal` module to reproduce `HashTable._hash`
 * exactly:
 *
 *     floor(abs(self._m * ((Decimal(key) * HashTable.__A__) % 1)))
 *
 * with `__A__ = Decimal((sqrt(5) - 1) / 2)`. Python evaluates this in the
 * default context: 28 significant digits, ROUND_HALF_EVEN after every
 * operation, and `Decimal(float)` taking the float's exact binary value.
 * A `Dec` is the same triple Python stores: a sign, an integer coefficient
 * (trailing zeros kept, as Python keeps them) and a power-of-ten exponent.
 */

export type Dec = {
  /** 1 for negative, as in Python's `_sign`. */
  readonly sign: 0 | 1;
  readonly coeff: bigint;
  readonly exp: number;
};

/** The default context's precision. */
const PREC = 28;

/** Python's `decimal.InvalidOperation`, which the default context traps. */
export class InvalidOperation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOperation";
  }
}

const TEN = 10n;
const pow10 = (n: number): bigint => TEN ** BigInt(n);
const digits = (n: bigint): number => (n === 0n ? 1 : n.toString().length);

/** `Decimal(n)` for an int. */
export function decFromInt(n: bigint): Dec {
  return { sign: n < 0n ? 1 : 0, coeff: n < 0n ? -n : n, exp: 0 };
}

/**
 * `Decimal(x)` for a finite float: its exact binary value, written the way
 * `Decimal.from_float` writes it (from `x.as_integer_ratio()`, so the
 * fraction is in lowest terms).
 */
export function decFromFloat(x: number): Dec {
  if (!Number.isFinite(x)) throw new Error(`Not a finite float: ${x}`);
  const sign: 0 | 1 = x < 0 || Object.is(x, -0) ? 1 : 0;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, Math.abs(x));
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const biased = (hi >>> 20) & 0x7ff;
  let mantissa = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let exp2: number;
  if (biased === 0) {
    exp2 = -1074;
  } else {
    mantissa |= 1n << 52n;
    exp2 = biased - 1075;
  }
  if (mantissa === 0n) return { sign, coeff: 0n, exp: 0 };
  while (exp2 < 0 && (mantissa & 1n) === 0n) {
    mantissa >>= 1n;
    exp2++;
  }
  if (exp2 >= 0) return { sign, coeff: mantissa << BigInt(exp2), exp: 0 };
  // m / 2^k == m * 5^k / 10^k
  return { sign, coeff: mantissa * 5n ** BigInt(-exp2), exp: exp2 };
}

/** Round to `PREC` significant digits, half to even (Python's `_fix`). */
function fix(sign: 0 | 1, coeff: bigint, exp: number): Dec {
  const extra = digits(coeff) - PREC;
  if (extra <= 0) return { sign, coeff, exp };
  const unit = pow10(extra);
  let q = coeff / unit;
  const r = coeff % unit;
  const twice = 2n * r;
  if (twice > unit || (twice === unit && q % 2n === 1n)) q += 1n;
  let e = exp + extra;
  if (digits(q) > PREC) {
    // Rounded up to 10^PREC: drop the trailing zero.
    q /= TEN;
    e += 1;
  }
  return { sign, coeff: q, exp: e };
}

/** `a * b`. */
export function mul(a: Dec, b: Dec): Dec {
  const sign = (a.sign ^ b.sign) as 0 | 1;
  return fix(sign, a.coeff * b.coeff, a.exp + b.exp);
}

/** The exponent of the most significant digit (Python's `adjusted()`). */
function adjusted(a: Dec): number {
  return a.exp + digits(a.coeff) - 1;
}

/**
 * `a % 1`: the remainder of truncated division, with the sign of `a`.
 * Python raises `InvalidOperation` (DivisionImpossible) when the integer
 * quotient would need more than `PREC` digits.
 */
export function mod1(a: Dec): Dec {
  const idealExp = Math.min(a.exp, 0);
  if (a.coeff === 0n || adjusted(a) <= -2) {
    // |a| < 0.1: the remainder is `a` itself, rescaled to the ideal exponent.
    return a.exp > idealExp
      ? { ...a, coeff: a.coeff * pow10(a.exp - idealExp), exp: idealExp }
      : a;
  }
  if (adjusted(a) <= PREC) {
    let q: bigint;
    let r: bigint;
    if (a.exp >= 0) {
      q = a.coeff * pow10(a.exp);
      r = 0n;
    } else {
      const unit = pow10(-a.exp);
      q = a.coeff / unit;
      r = a.coeff % unit;
    }
    if (q < pow10(PREC)) return fix(a.sign, r, idealExp);
  }
  throw new InvalidOperation("[<class 'decimal.DivisionImpossible'>]");
}

export function abs(a: Dec): Dec {
  return { ...a, sign: 0 };
}

/** `math.floor(a)`. */
export function floor(a: Dec): bigint {
  if (a.exp >= 0) {
    const n = a.coeff * pow10(a.exp);
    return a.sign === 1 ? -n : n;
  }
  const unit = pow10(-a.exp);
  const q = a.coeff / unit;
  if (a.sign === 0) return q;
  return a.coeff % unit === 0n ? -q : -q - 1n;
}

/** `str(a)`, exactly as Python formats a finite Decimal. */
export function decStr(a: Dec): string {
  const s = a.coeff.toString();
  const leftdigits = a.exp + s.length;
  const dotplace = a.exp <= 0 && leftdigits > -6 ? leftdigits : 1;
  let intpart: string;
  let fracpart: string;
  if (dotplace <= 0) {
    intpart = "0";
    fracpart = "." + "0".repeat(-dotplace) + s;
  } else if (dotplace >= s.length) {
    intpart = s + "0".repeat(dotplace - s.length);
    fracpart = "";
  } else {
    intpart = s.slice(0, dotplace);
    fracpart = "." + s.slice(dotplace);
  }
  const e = leftdigits - dotplace;
  const expPart = e === 0 ? "" : `E${e > 0 ? "+" : ""}${e}`;
  return (a.sign === 1 ? "-" : "") + intpart + fracpart + expPart;
}
