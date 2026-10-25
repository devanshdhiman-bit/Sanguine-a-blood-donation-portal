/* ==========================================================================
   requestsSlice.js — Redux Toolkit slice for emergency blood requests.

   This slice is the SINGLE source of truth for requests inside the app. The
   Request, Home and Dashboard pages all read it with useSelector and change it
   with dispatch. localStorage persistence is handled in store/index.js.

   CONCEPTS
   • createSlice ........... reducers + action creators generated together
   • Immer ................. "mutating" code (state.items.unshift) is turned into
                             an immutable update behind the scenes
   • prepare callback ...... keeps reducers pure: the random id and timestamp are
                             generated BEFORE the action reaches the reducer
   • Memoised selector ..... createSelector avoids returning a new array when the
                             input did not change
   ========================================================================== */
import { createSelector, createSlice, nanoid } from '@reduxjs/toolkit';

const requestsSlice = createSlice({
  name: 'requests',
  initialState: { items: [] },
  reducers: {
    requestAdded: {
      reducer(state, action) {
        state.items.unshift(action.payload); // newest first
      },
      prepare(data) {
        return { payload: { ...data, id: nanoid(), createdAt: new Date().toISOString() } };
      }
    },
    requestRemoved(state, action) {
      state.items = state.items.filter((r) => r.id !== action.payload);
    },
    // Used after "Reset demo data" and when another tab changes localStorage.
    requestsReplaced(state, action) {
      state.items = action.payload;
    }
  }
});

export const { requestAdded, requestRemoved, requestsReplaced } = requestsSlice.actions;
export default requestsSlice.reducer;

export const selectRequests = (state) => state.requests.items;
export const selectCriticalRequests = createSelector([selectRequests], (items) =>
  items.filter((r) => r.urgency === 'Critical'));
