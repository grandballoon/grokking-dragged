/** Helpers shared by the array ports' tests. */
import type { Frame } from "../../../core/trace";
import type { Outcome } from "../kit/outcome";
import type { Op } from "../opScript";

type OutcomeVars = {
  readonly op: number | null;
  readonly returned: Outcome | null;
  readonly error: string | null;
};

/**
 * What each op of the script came to, as the Python demo would report it:
 * the error it raised, else what the method itself returned, else "None".
 */
export function outcomes<V extends OutcomeVars>(
  frames: readonly Frame<V>[],
  ops: readonly Op[],
): string[] {
  return ops.map((op, i) => {
    const own = frames.filter((f) => f.vars.op === i);
    return (
      own.find((f) => f.vars.error !== null)?.vars.error ??
      own.findLast((f) => f.vars.returned?.from === op.name)?.vars.returned?.text ??
      "None"
    );
  });
}
