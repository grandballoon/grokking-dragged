import { defineViz } from "../../../defineViz";
import { DIAGRAM_HEIGHT } from "../shared/band";
import { nextValue } from "../shared/edits";
import { listDraw } from "../shared/listViz";
import { INITIAL_INPUT, run, SRC, type DoublyFields } from "./trace";

export const doublyLinkedListViz = defineViz({
  id: "ds-doubly-linked-list",
  title: "Doubly linked list",
  book: "Grokking Data Structures",
  chapter: "6 · Linked lists",
  summary:
    "Each node links to both its neighbours and the list keeps both its head and its tail, so it grows and shrinks at either end in constant time. Every insert or delete updates links in both directions, one at a time.",
  drags: [
    "the timeline knob to step through the script",
    "a call in the script to reorder it, or its − and + to change its argument",
    "the value in the palette to the front or the back of the list to insert it there",
    "a node out of the list to delete its value",
  ],
  sources: [SRC],
  initialInput: INITIAL_INPUT,
  run,
  diagramHeight: DIAGRAM_HEIGHT,
  draw: listDraw<DoublyFields>({
    prefix: "dll",
    kind: "doubly",
    title: "dll = DoublyLinkedList()",
    fields: (obj) => ({ _head: obj._head, _tail: obj._tail }),
    inserts: (ops) => [
      ["insert_in_front", nextValue(ops)],
      ["insert_to_back", nextValue(ops)],
    ],
    chipText: (ops) => String(nextValue(ops)),
    hint: "onto the front or back",
    removal: (slot) => ["delete", slot.node._data as number],
  }),
});
