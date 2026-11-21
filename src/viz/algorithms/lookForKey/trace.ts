/**
 * Port of python-master/03/08_look_for_key.py.
 *
 * Boxes and the key are `Item`s, as in the Python; a box's contents are its
 * `items_in_box`. `look_for_key` loops over a box's items and calls itself
 * on each box it finds. Printing "found the key!" doesn't end the loop, so
 * the search carries on through every remaining box.
 *
 * Each active call is an entry on `stack`, outermost first, naming its
 * `box` and loop variable `item` by the Item's `uid`.
 */
import source from "@repo/python-master/03/08_look_for_key.py?raw";
import type { KeyedLists } from "../../../core/keyedLists";
import { pythonSource } from "../../../core/pythonSource";
import { recorder, type Frame } from "../../../core/trace";
import type { Known } from "../kit/linearCalls";
import { pyPrint } from "../../../core/python";

export const SRC = pythonSource("python-master/03/08_look_for_key.py", source);

export const ROOT = "main_box";
export const KEY = "key";

/** What each box holds, by the script's variable names. The key is never a list. */
export type Input = { readonly contents: KeyedLists<string> };

export class Item {
  readonly is_key: boolean;
  items_in_box: Item[];
  /** The script's variable name for this item; the one addition, for drawing. */
  readonly uid: string;

  constructor(uid: string, is_key = false) {
    this.uid = uid;
    this.is_key = is_key;
    this.items_in_box = [];
  }

  is_a_box(): boolean {
    return !this.is_key;
  }

  is_a_key(): boolean {
    return this.is_key;
  }
}

export type Call = {
  /** Which call this is, counting from 0; for drawing, not a Python value. */
  uid: number;
  /** The `uid` of the box this call searches. */
  box: string;
  /** The `uid` of the loop variable `item`, once the loop has started. */
  item: string | null;
  /** Never waits on a value; kept for the shared card helpers. */
  got: null;
  /** What this call returns (always None), once it does. */
  returns: Known<null> | null;
};

export type Vars = { stack: Call[]; stdout: string[] };

/** The boxes exactly as the Python script packs them. */
export const BOOK_CONTENTS: KeyedLists<string> = {
  main_box: ["box_A", "box_D"],
  box_A: ["box_B", "box_C"],
  box_B: [],
  box_C: [],
  box_D: ["box_E"],
  box_E: [KEY],
};

/** Build the Items the way the script does: create them, then fill the boxes. */
export function buildItems(contents: KeyedLists<string>): Item {
  const items = new Map<string, Item>();
  const itemFor = (name: string) => {
    let item = items.get(name);
    if (item === undefined) {
      item = new Item(name, name === KEY);
      items.set(name, item);
    }
    return item;
  };
  for (const [box, names] of Object.entries(contents)) {
    itemFor(box).items_in_box = names.map(itemFor);
  }
  return itemFor(ROOT);
}

export function run(input: Input): Frame<Vars>[] {
  const rec = recorder<Vars>();
  const step = rec.in(SRC);
  const stack: Call[] = [];
  const stdout: string[] = [];
  const vars = (): Vars => ({ stack, stdout });
  let calls = 0;

  function look_for_key(box: Item) {
    const call: Call = {
      uid: calls++,
      box: box.uid,
      item: null,
      got: null,
      returns: null,
    };
    stack.push(call);
    step("def look_for_key(box: Item):", vars(), `look_for_key opens ${box.uid}.`);
    for (const item of box.items_in_box) {
      call.item = item.uid;
      step(
        "for item in box.items_in_box:",
        vars(),
        `Take out the next item: ${item.uid}.`,
      );
      step(
        "if item.is_a_box():",
        vars(),
        item.is_a_box() ? `${item.uid} is a box.` : `${item.uid} is not a box.`,
      );
      if (item.is_a_box()) {
        step(
          "look_for_key(item)",
          vars(),
          `Search ${item.uid} with a new call; the search of ${box.uid} waits.`,
        );
        look_for_key(item);
        step(
          "look_for_key(item)",
          vars(),
          `${item.uid} is done; back to the rest of ${box.uid}.`,
        );
      } else if (item.is_a_key()) {
        step("elif item.is_a_key():", vars(), "It's the key!");
        stdout.push(pyPrint("found the key!"));
        step(
          'print("found the key!")',
          vars(),
          "Found the key! Nothing stops the loop, though: the search goes on.",
        );
      }
    }
    call.returns = { value: null };
    step(
      "for item in box.items_in_box:",
      vars(),
      box.items_in_box.length === 0
        ? `${box.uid} is empty, so look_for_key(${box.uid}) returns.`
        : `Nothing left in ${box.uid}, so look_for_key(${box.uid}) returns.`,
    );
    stack.pop();
  }

  step("look_for_key(main_box)", vars(), "The script starts the search at main_box.");
  look_for_key(buildItems(input.contents));
  step(
    "look_for_key(main_box)",
    vars(),
    "Every box has been opened: the search is over.",
  );
  return rec.frames;
}
