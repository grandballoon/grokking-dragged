/**
 * Port of python-master/05/01_price_of_groceries.py.
 *
 * `book` is a dict from grocery name to price, built by one dict literal and
 * printed. The literal's key/value pairs are the input; the port inserts
 * them in order, recording a frame per pair, so the dict can be seen
 * filling up (in Python the name `book` is bound once the literal is done).
 * The print uses Python's dict repr, with `float` prices.
 */
import source from "@sources/python-master/05/01_price_of_groceries.py?raw";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import { pyDictRepr, pyFloat } from "../../../core/python";

export const SRC = pythonSource("python-master/05/01_price_of_groceries.py", source);

export type Entry = readonly [name: string, price: number];

/** The literal's pairs, as written in the file. */
export const BOOK_LITERAL: readonly Entry[] = [
  ["apple", 0.67],
  ["milk", 1.49],
  ["avocado", 1.49],
];

export type Vars = { book: Record<string, number>; stdout: string[] };

export function bookRepr(book: Readonly<Record<string, number>>): string {
  return pyDictRepr(book, pyFloat);
}

export function run(literal: readonly Entry[]): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const book: Record<string, number> = {};
  const stdout: string[] = [];
  const vars = (): Vars => ({ book, stdout });

  if (literal.length === 0) {
    step("book = {", vars(), "The literal is empty, so book = {}.");
  }
  for (const [name, price] of literal) {
    book[name] = price;
    step("book = {", vars(), `The literal maps "${name}" to ${pyFloat(price)}.`);
  }
  stdout.push(bookRepr(book));
  step(
    "print(book)",
    vars(),
    "print shows the dict: its keys in the order they were inserted, each with its price.",
  );
  return rec.frames;
}
