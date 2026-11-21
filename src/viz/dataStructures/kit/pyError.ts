/**
 * Python exceptions raised by the ported data structures.
 *
 * A ported method that raises first records a frame at its `raise` line,
 * then throws a `PyError`. Whoever runs the demo catches it and carries on
 * with the next call, as if the demo had wrapped each call in a `try`.
 * Any other error is a bug in a port and propagates.
 */

export class PyError extends Error {
  constructor(
    /** The exception's class, e.g. `ValueError`. */
    readonly type: string,
    /** Its argument, e.g. `The array is already full`. */
    readonly detail: string,
  ) {
    // How Python prints it: `ValueError: The array is already full`.
    super(`${type}: ${detail}`);
    this.name = type;
  }
}

/** Run `body`; return the `PyError` it raised, or null if it raised none. */
export function attempt(body: () => void): PyError | null {
  try {
    body();
    return null;
  } catch (error) {
    if (error instanceof PyError) return error;
    throw error;
  }
}
