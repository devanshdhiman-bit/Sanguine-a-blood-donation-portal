// Unit tests for the Redux requests slice (pure reducer + selectors, no React).
import { describe, expect, it } from 'vitest';
import reducer, {
  requestAdded, requestRemoved, requestsReplaced, selectCriticalRequests, selectRequests
} from '../store/requestsSlice';

const base = { patient: 'Test Patient', bloodGroup: 'A+', hospital: 'H', units: 1, contact: '9876543210', city: 'X', urgency: 'Moderate' };
const start = { items: [] };

describe('requestsSlice', () => {
  it('requestAdded prepends a request and stamps an id + createdAt', () => {
    const s1 = reducer(start, requestAdded(base));
    const s2 = reducer(s1, requestAdded({ ...base, patient: 'Second' }));
    expect(s2.items).toHaveLength(2);
    expect(s2.items[0].patient).toBe('Second'); // newest first
    expect(s2.items[0].id).toBeTruthy();
    expect(s2.items[0].id).not.toBe(s2.items[1].id);
    expect(Number.isNaN(Date.parse(s2.items[0].createdAt))).toBe(false);
  });

  it('requestRemoved deletes only the matching id', () => {
    const s1 = reducer(start, requestAdded(base));
    const s2 = reducer(s1, requestAdded({ ...base, patient: 'Keep me' }));
    const s3 = reducer(s2, requestRemoved(s2.items[1].id));
    expect(s3.items.map((r) => r.patient)).toEqual(['Keep me']);
  });

  it('requestsReplaced swaps the whole list', () => {
    const s = reducer({ items: [{ id: 'old' }] }, requestsReplaced([{ id: 'new' }]));
    expect(s.items).toEqual([{ id: 'new' }]);
  });

  it('does not mutate the previous state', () => {
    const frozen = Object.freeze({ items: Object.freeze([]) });
    expect(() => reducer(frozen, requestAdded(base))).not.toThrow();
    expect(frozen.items).toHaveLength(0);
  });

  it('selectors read and filter the slice', () => {
    let s = reducer(start, requestAdded({ ...base, urgency: 'Critical' }));
    s = reducer(s, requestAdded(base));
    const root = { requests: s };
    expect(selectRequests(root)).toHaveLength(2);
    expect(selectCriticalRequests(root)).toHaveLength(1);
    expect(selectCriticalRequests(root)).toBe(selectCriticalRequests(root)); // memoised
  });
});
