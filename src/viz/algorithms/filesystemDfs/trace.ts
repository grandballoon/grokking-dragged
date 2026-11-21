/**
 * Port of python-master/07/01_filesystem_dfs.py.
 *
 * `printnames` is kept statement for statement, recursion included; only the
 * filesystem is virtual: `listdir`, `isfile` and `join` are the pure
 * stand-ins in ./fs.ts, bound to the input tree. Each active call is one
 * entry of the `stack` var, outermost first, holding its `dir`, the list its
 * `for` loop walks (`sorted(listdir(dir))`), and its locals.
 */
import { pyRepr } from "../../../core/python";
import source from "@repo/python-master/07/01_filesystem_dfs.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import { BOOK_TREE, isfile, join, listdir, ROOT, type Tree } from "./fs";

export const SRC = pythonSource("python-master/07/01_filesystem_dfs.py", source);

export type Input = { readonly tree: Tree };

export const INITIAL_INPUT: Input = { tree: BOOK_TREE };

/** One active `printnames(dir)` call. */
export type Call = {
  dir: string;
  /** `sorted(listdir(dir))`, once the loop has evaluated it. */
  listing: string[] | null;
  /** Where the loop is in `listing`; `listing.length` once it is used up. */
  index: number;
  file: string | null;
  fullpath: string | null;
};

export type Vars = {
  stack: Call[];
  stdout: string[];
  /** Whether the top-level `printnames("pics")` has returned. */
  finished: boolean;
};

export function run({ tree }: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const stdout: string[] = [];
  let finished = false;
  const vars = (): Vars => ({ stack, stdout, finished });

  function printnames(dir: string): void {
    const call: Call = { dir, listing: null, index: -1, file: null, fullpath: null };
    stack.push(call);
    const listed = listdir(tree, dir);
    const listing = [...listed].sort();
    call.listing = listing;
    step(
      "for file in sorted(listdir(dir)):",
      vars(),
      listing.length === 0
        ? `listdir(${pyRepr(dir)}) is empty: nothing to do.`
        : `listdir(${pyRepr(dir)}) gives ${pyRepr(listed)}; sorted, that's ${pyRepr(listing)}.`,
    );
    for (const [index, file] of listing.entries()) {
      call.index = index;
      call.file = file;
      const fullpath = join(dir, file);
      call.fullpath = fullpath;
      step(
        "fullpath = join(dir, file)",
        vars(),
        `Next up in ${dir} is ${file}; its full path is ${pyRepr(fullpath)}.`,
      );
      const plain = isfile(tree, fullpath);
      step(
        "if isfile(fullpath):",
        vars(),
        plain ? `${fullpath} is a file.` : `${fullpath} is a folder, not a file.`,
      );
      if (plain) {
        stdout.push(file);
        step("print(file)", vars(), `Print its name: ${file}.`);
      } else {
        step(
          "printnames(fullpath)",
          vars(),
          `Call printnames(${pyRepr(fullpath)}) to look inside it.`,
        );
        printnames(fullpath);
      }
    }
    call.index = listing.length;
    if (listing.length > 0) {
      step(
        "for file in sorted(listdir(dir)):",
        vars(),
        stack.length > 1
          ? `Nothing left in ${dir}: return to printnames(${pyRepr(stack[stack.length - 2]!.dir)}).`
          : `Nothing left in ${dir}: printnames(${pyRepr(dir)}) returns.`,
      );
    }
    stack.pop();
  }

  step('printnames("pics")', vars(), `Call printnames(${pyRepr(ROOT)}).`);
  printnames(ROOT);
  finished = true;
  step(
    'printnames("pics")',
    vars(),
    `Done: every file under ${ROOT} has been printed, folders in sorted order, depth first.`,
  );
  return rec.frames;
}
