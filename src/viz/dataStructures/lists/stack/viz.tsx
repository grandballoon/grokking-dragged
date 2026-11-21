import { defineViz } from "../../../defineViz";
import { SINGLY_LINKED_LIST } from "../../sources";
import { DIAGRAM_HEIGHT } from "../shared/band";
import { nextValue } from "../shared/edits";
import { listDraw } from "../shared/listViz";
import { INITIAL_INPUT, run, SRC, type StackFields } from "./trace";

export const stackViz = defineViz({
  id: "ds-stack",
  title: "Stack on a linked list",
  book: "Grokking Data Structures",
  chapter: "8 · Stacks",
  summary:
    "Last in, first out: the stack keeps its items in a singly linked list whose head is the top, so push and pop are the list's insert_in_front and delete_from_front, both constant time.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change its argument",
    "the value in the palette onto the top of the stack to push it",
    "the top node off the stack to pop it",
  ],
  sources: [SRC, SINGLY_LINKED_LIST],
  initialInput: INITIAL_INPUT,
  run,
  diagramHeight: DIAGRAM_HEIGHT,
  draw: listDraw<StackFields>({
    prefix: "stack",
    kind: "singly",
    title: "stack._data: the top of the stack is _head",
    fields: (obj) => ({ _head: obj._data._head }),
    inserts: (ops) => [["push", nextValue(ops)]],
    chipText: (ops) => String(nextValue(ops)),
    hint: "onto the top",
    removal: (slot, fields) =>
      slot.node.uid === fields._head?.uid ? ["pop"] : undefined,
  }),
});
