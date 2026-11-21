import { defineViz } from "../../../defineViz";
import { DIAGRAM_HEIGHT } from "../shared/band";
import { nextValue } from "../shared/edits";
import { listDraw } from "../shared/listViz";
import { INITIAL_INPUT, run, SRC, type ListFields } from "./trace";

export const singlyLinkedListViz = defineViz({
  id: "ds-singly-linked-list",
  title: "Singly linked list",
  book: "Grokking Data Structures",
  chapter: "6 · Linked lists",
  summary:
    "Each node holds a value and a link to the next node, so inserting in front is instant while reaching the back, an index or a value means walking from the head. search(8) stands for search(lambda x: x == 8).",
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
  draw: listDraw<ListFields>({
    prefix: "sll",
    kind: "singly",
    title: "sll = SinglyLinkedList()",
    fields: (obj) => ({ _head: obj._head }),
    inserts: (ops) => [
      ["insert_in_front", nextValue(ops)],
      ["insert_to_back", nextValue(ops)],
    ],
    chipText: (ops) => String(nextValue(ops)),
    hint: "onto the front or back",
    removal: (slot) => ["delete", slot.node._data as number],
  }),
});
