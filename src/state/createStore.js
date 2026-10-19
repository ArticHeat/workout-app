import { useSyncExternalStore } from "react";

/* A very small external store. State is replaced, never mutated, so selectors can return stable slices. */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  const store = {
    get: () => state,
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : patch;
      state = Object.assign({}, state, next);
      subs.forEach(f => f());
    },
    replace(next) { state = next; subs.forEach(f => f()); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); }
  };
  return store;
}
export function useStore(store, selector = s => s) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}
