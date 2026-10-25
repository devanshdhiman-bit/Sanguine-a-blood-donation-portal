/* ==========================================================================
   store/index.js — the Redux store and its localStorage persistence.

   CONCEPTS
   • configureStore ........ builds the store (adds Redux DevTools + default middleware)
   • preloadedState ........ the store starts from whatever is saved in localStorage
   • store.subscribe ....... runs after every dispatched action; used to persist
   • Factory function ...... createAppStore() lets tests build an isolated store
   • Cross-tab sync ........ the browser 'storage' event fires in OTHER tabs only
   Only the `requests` slice lives here. Session, dark mode and toasts stay in the
   Context API (src/context.jsx) so no state is duplicated between the two.
   ========================================================================== */
import { configureStore } from '@reduxjs/toolkit';
import requestsReducer, { requestsReplaced } from './requestsSlice';
import { KEYS, all, seedIfEmpty, write } from '../../js/lib/storage.js';

export function createAppStore() {
  seedIfEmpty(); // make sure demo data exists before we read it (safe to call repeatedly)
  return configureStore({
    reducer: { requests: requestsReducer },
    preloadedState: { requests: { items: all(KEYS.REQUESTS) } }
  });
}

/** Save the requests slice to localStorage whenever it changes. Returns a detach function. */
export function attachPersistence(store) {
  let last = store.getState().requests.items;

  const unsubscribe = store.subscribe(() => {
    const items = store.getState().requests.items;
    if (items === last) return; // some other slice/action changed — nothing to save
    last = items;
    if (localStorage.getItem(KEYS.REQUESTS) !== JSON.stringify(items)) write(KEYS.REQUESTS, items);
  });

  // Another tab changed the saved requests -> pull them into this tab's store.
  const onStorage = (e) => {
    if (e.key === KEYS.REQUESTS) store.dispatch(requestsReplaced(all(KEYS.REQUESTS)));
  };
  window.addEventListener('storage', onStorage);

  return () => { unsubscribe(); window.removeEventListener('storage', onStorage); };
}

export const store = createAppStore();
attachPersistence(store);
