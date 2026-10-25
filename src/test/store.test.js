// Store + localStorage persistence tests (no React).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachPersistence, createAppStore } from '../store';
import { requestAdded, requestRemoved } from '../store/requestsSlice';
import { KEYS } from '../../js/lib/storage.js';

const payload = { patient: 'Persist Me', bloodGroup: 'O-', hospital: 'H', units: 2, contact: '9876543210', city: 'C', urgency: 'Critical' };
let detach;

beforeEach(() => { localStorage.clear(); });
afterEach(() => { detach?.(); detach = undefined; });

describe('store persistence', () => {
  it('hydrates from seeded localStorage on first run', () => {
    const store = createAppStore();
    expect(store.getState().requests.items.length).toBe(2); // the two sample requests
    expect(JSON.parse(localStorage.getItem(KEYS.REQUESTS))).toHaveLength(2);
  });

  it('writes to localStorage when a request is added and removed', () => {
    const store = createAppStore();
    detach = attachPersistence(store);
    store.dispatch(requestAdded(payload));
    let saved = JSON.parse(localStorage.getItem(KEYS.REQUESTS));
    expect(saved).toHaveLength(3);
    expect(saved[0].patient).toBe('Persist Me');

    store.dispatch(requestRemoved(saved[0].id));
    saved = JSON.parse(localStorage.getItem(KEYS.REQUESTS));
    expect(saved.map((r) => r.patient)).not.toContain('Persist Me');
  });

  it('a brand-new store (simulated page reload) restores saved requests', () => {
    const first = createAppStore();
    detach = attachPersistence(first);
    first.dispatch(requestAdded(payload));
    const reloaded = createAppStore();
    expect(reloaded.getState().requests.items[0].patient).toBe('Persist Me');
  });

  it('pulls in changes made by another tab (storage event)', () => {
    const store = createAppStore();
    detach = attachPersistence(store);
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify([{ id: 'x1', patient: 'From other tab', urgency: 'Low' }]));
    window.dispatchEvent(new StorageEvent('storage', { key: KEYS.REQUESTS }));
    expect(store.getState().requests.items.map((r) => r.patient)).toEqual(['From other tab']);
  });
});
