/**
 * The Python call stack, kept beside a port so frames can show it.
 *
 * A port method that other ported methods call (a Queue calling into its
 * DoublyLinkedList, a Heap's `top` calling `_push_down`) pushes one call
 * record while its body runs. A record names the method and holds the
 * locals in scope, under their Python names; the method replaces `locals`
 * just before each step it records. Frames deep-copy the stack with the
 * rest of their variables, so each frame keeps its own snapshot.
 */

/** Anything with a `push` and `pop`: a stack that may hold wider records too. */
export type Stack<C> = {
  push(call: C): unknown;
  pop(): unknown;
};

/** Run `body` as the innermost call `call`, popping it however `body` exits. */
export function within<C, R>(stack: Stack<C>, call: C, body: () => R): R {
  stack.push(call);
  try {
    return body();
  } finally {
    stack.pop();
  }
}
