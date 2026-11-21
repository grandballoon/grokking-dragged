/**
 * The Grokking Data Structures Python files, loaded verbatim. Several
 * structures are built on others (a Stack on a SinglyLinkedList, a Graph on a
 * Queue and a Stack), so a trace can step into any of these files.
 */
import arrayCore from "@sources/grokking_data_structures-main/python/arrays/core.py?raw";
import dynamicArray from "@sources/grokking_data_structures-main/python/arrays/dynamic_array.py?raw";
import sortedArray from "@sources/grokking_data_structures-main/python/arrays/sorted_array.py?raw";
import unsortedArray from "@sources/grokking_data_structures-main/python/arrays/unsorted_array.py?raw";
import bag from "@sources/grokking_data_structures-main/python/bags/bag.py?raw";
import hashTable from "@sources/grokking_data_structures-main/python/dictionaries/hash_table.py?raw";
import graph from "@sources/grokking_data_structures-main/python/graphs/graph.py?raw";
import kLargest from "@sources/grokking_data_structures-main/python/k_largest_elements.py?raw";
import doublyLinkedList from "@sources/grokking_data_structures-main/python/linked_lists/doubly_linked_list.py?raw";
import singlyLinkedList from "@sources/grokking_data_structures-main/python/linked_lists/singly_linked_list.py?raw";
import sortedSinglyLinkedList from "@sources/grokking_data_structures-main/python/linked_lists/sorted_singly_linked_list.py?raw";
import heap from "@sources/grokking_data_structures-main/python/queues/heap.py?raw";
import queue from "@sources/grokking_data_structures-main/python/queues/queue.py?raw";
import queueLinkedList from "@sources/grokking_data_structures-main/python/queues/queue_linked_list.py?raw";
import stack from "@sources/grokking_data_structures-main/python/stacks/stack.py?raw";
import stackDynamicArray from "@sources/grokking_data_structures-main/python/stacks/stack_dynamic_array.py?raw";
import bst from "@sources/grokking_data_structures-main/python/trees/bst.py?raw";
import { pythonSource } from "../../core/pythonSource";

const ROOT = "grokking_data_structures-main/python";
const src = (path: string, text: string) => pythonSource(`${ROOT}/${path}`, text);

export const ARRAY_CORE = src("arrays/core.py", arrayCore);
export const UNSORTED_ARRAY = src("arrays/unsorted_array.py", unsortedArray);
export const SORTED_ARRAY = src("arrays/sorted_array.py", sortedArray);
export const DYNAMIC_ARRAY = src("arrays/dynamic_array.py", dynamicArray);
export const SINGLY_LINKED_LIST = src(
  "linked_lists/singly_linked_list.py",
  singlyLinkedList,
);
export const SORTED_SINGLY_LINKED_LIST = src(
  "linked_lists/sorted_singly_linked_list.py",
  sortedSinglyLinkedList,
);
export const DOUBLY_LINKED_LIST = src(
  "linked_lists/doubly_linked_list.py",
  doublyLinkedList,
);
export const STACK = src("stacks/stack.py", stack);
export const STACK_DYNAMIC_ARRAY = src(
  "stacks/stack_dynamic_array.py",
  stackDynamicArray,
);
export const QUEUE = src("queues/queue.py", queue);
export const QUEUE_LINKED_LIST = src("queues/queue_linked_list.py", queueLinkedList);
export const HEAP = src("queues/heap.py", heap);
export const K_LARGEST_ELEMENTS = src("k_largest_elements.py", kLargest);
export const BAG = src("bags/bag.py", bag);
export const HASH_TABLE = src("dictionaries/hash_table.py", hashTable);
export const BST = src("trees/bst.py", bst);
export const GRAPH = src("graphs/graph.py", graph);
