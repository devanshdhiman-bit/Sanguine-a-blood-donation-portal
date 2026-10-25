/* ==========================================================================
   storage.js — the lowest layer: a tiny synchronous "database" on top of
   localStorage. Nothing here knows about React or Promises; the async
   behaviour lives one layer up in api.js. It is shared by the plain-JS pages
   (js/pages/*) and the React app (src/), so both see the same data.

   CONCEPTS IN THIS FILE
   • Web Storage API ........ localStorage only stores strings, so we
                              serialise with JSON.stringify / JSON.parse.
   • try / catch ............ localStorage can throw (private mode, quota
                              exceeded, corrupted JSON) — we never let that
                              crash the UI.
   • Memoisation (cache) .... read() returns the *same object* while the raw
                              string is unchanged. React's useSyncExternalStore
                              (used by the React app) requires a stable snapshot.
   • Observer / pub-sub ..... write() announces changes through a DOM Event;
                              subscribe() lets other code listen for them.
   • Version counter ........ a number bumped on every change; hooks use it
                              as a "something changed, refetch" signal.
   • Immutable updates ...... we build new arrays/objects (spread, map, filter)
                              instead of mutating existing ones.
   ========================================================================== */

// Central list of storage keys so a typo can't silently create a new "table".
export const KEYS = {
  DONORS: 'bc_donors',
  REQUESTS: 'bc_requests',
  CAMPS: 'bc_camps',
  BANKS: 'bc_banks',
  USER: 'bc_current_user',
  USERS: 'bc_users',
  PREFS: 'bc_prefs',
  MY_CAMPS: 'bc_my_camps',
  MESSAGES: 'bc_messages'
};

const EVENT = 'bc:storage';  // custom DOM event name used for same-tab notifications
let version = 0;             // bumped on every change (see notify)
const cache = new Map();     // key -> { raw, parsed } — the memoisation table

export const getVersion = () => version;

// Bump the version and tell every subscriber that data changed.
function notify() {
  version += 1;
  window.dispatchEvent(new Event(EVENT));
}

/** Read + parse a key. Returns null when missing or unreadable. */
export function read(key) {
  try {
    const raw = localStorage.getItem(key);
    // Cache hit: same raw string => return the identical parsed object.
    if (cache.has(key) && cache.get(key).raw === raw) return cache.get(key).parsed;
    const parsed = raw ? JSON.parse(raw) : null;
    cache.set(key, { raw, parsed });
    return parsed;
  } catch (e) {
    console.error('read failed', key, e);
    return null;
  }
}

/** Serialise + save a key. Passing null/undefined deletes it. */
export function write(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    notify();
    return true;
  } catch (e) {
    console.error('write failed', key, e); // e.g. QuotaExceededError
    return false;
  }
}

// "table" helpers — `|| []` guarantees callers always get an array.
export const all = (key) => read(key) || [];

/** Insert at the front (newest first) and stamp id + createdAt. */
export function insert(key, record) {
  const rec = {
    ...record, // spread copies the caller's object — we never mutate it
    id: record.id || `${key}_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    createdAt: record.createdAt || new Date().toISOString()
  };
  write(key, [rec, ...all(key)]);
  return rec;
}

/** Patch one record. `patch` can be an object or a function(record) => object. */
export const update = (key, id, patch) =>
  write(key, all(key).map((r) =>
    r.id === id ? { ...r, ...(typeof patch === 'function' ? patch(r) : patch) } : r));

/**
 * Subscribe to changes. Returns an *unsubscribe* function (the shape React's
 * useSyncExternalStore and useEffect cleanups expect).
 */
export function subscribe(cb) {
  // The native 'storage' event only fires in OTHER tabs, so it needs its own handler.
  const onOtherTab = () => { version += 1; cb(); };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onOtherTab);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onOtherTab);
  };
}

// Date maths: "today + n days" as YYYY-MM-DD, so seeded camps are always upcoming.
const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** True for the fictional records created by seedIfEmpty() (current and older seed id formats). */
export const isSample = (r) => /^(seed_|req_\d+$)/.test(String(r.id));

/** First-run demo data. Each block only runs if that key doesn't exist yet. */
export function seedIfEmpty() {
  if (!read(KEYS.DONORS)) {
    const cities = ['Chandigarh', 'Mohali', 'Delhi', 'Mumbai', 'Pune', 'Bengaluru'];
    const groups = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const names = ['Aarav Sharma', 'Isha Verma', 'Rohan Mehta', 'Priya Nair', 'Karan Singh', 'Ananya Gupta',
      'Vikram Rao', 'Sneha Kapoor', 'Aditya Joshi', 'Meera Iyer', 'Farhan Khan', 'Neha Reddy'];
    // Array.map builds one donor per name; the modulo (%) operator cycles through the lists.
    write(KEYS.DONORS, names.map((name, i) => ({
      id: `seed_donor_${i}`,
      name,
      age: 20 + (i % 15),
      gender: i % 2 === 0 ? 'Male' : 'Female',
      bloodGroup: groups[i % groups.length],
      weight: 55 + (i % 20),
      phone: `9${(800000000 + i * 1234).toString().slice(0, 9)}`,
      email: `${name.split(' ')[0].toLowerCase()}@example.com`,
      city: cities[i % cities.length],
      lastDonation: i % 3 === 0 ? '2025-11-02' : '2026-05-14',
      available: i % 4 !== 0,
      donationsCount: (i * 3) % 12,
      history: [],
      createdAt: new Date().toISOString()
    })));
  }
  if (!read(KEYS.BANKS)) {
    write(KEYS.BANKS, [
      { id: 'bank_1', name: 'City Life Blood Bank', address: 'Sector 34, Chandigarh', phone: '0172-2345678', hours: '24/7 Emergency', groups: ['O+', 'O-', 'A+', 'B+', 'AB+'] },
      { id: 'bank_2', name: 'Red Cross Blood Centre', address: 'Phase 7, Mohali', phone: '0172-3456789', hours: '8:00 AM – 8:00 PM', groups: ['O+', 'A-', 'B-', 'AB-'] },
      { id: 'bank_3', name: 'Fortis Blood Bank', address: 'Sector 62, Mohali', phone: '0172-4567890', hours: '24/7 Emergency', groups: ['O-', 'A+', 'B+', 'AB+', 'AB-'] },
      { id: 'bank_4', name: 'Government Hospital Blood Bank', address: 'Sector 16, Chandigarh', phone: '0172-5678901', hours: '9:00 AM – 6:00 PM', groups: ['O+', 'A+', 'B+'] }
    ]);
  }
  if (!read(KEYS.CAMPS)) {
    write(KEYS.CAMPS, [
      { id: 'camp_1', title: 'Corporate Donor Drive', date: dayOffset(7), venue: 'Tech Park, Mohali', organizer: 'Sanguine x TechPark', seats: 60, registered: 41 },
      { id: 'camp_2', title: 'University Blood Camp', date: dayOffset(21), venue: 'Panjab University Ground', organizer: 'Rotary Club', seats: 120, registered: 88 },
      { id: 'camp_3', title: 'Community Health Drive', date: dayOffset(35), venue: 'Sector 21 Community Hall', organizer: 'City Life Blood Bank', seats: 80, registered: 30 }
    ]);
  }
  if (!read(KEYS.REQUESTS)) {
    write(KEYS.REQUESTS, [
      { id: 'req_1', patient: 'Ramesh Kumar', bloodGroup: 'B+', hospital: 'City Life Hospital', units: 2, contact: '9812345670', city: 'Chandigarh', urgency: 'Critical', createdAt: new Date().toISOString() },
      { id: 'req_2', patient: 'Simran Kaur', bloodGroup: 'O-', hospital: 'Fortis Mohali', units: 1, contact: '9876543210', city: 'Mohali', urgency: 'Moderate', createdAt: new Date().toISOString() }
    ]);
  }
  if (!read(KEYS.USERS)) {
    write(KEYS.USERS, [{ id: 'user_demo', name: 'Demo Donor', email: 'demo@sanguine.app', password: 'demo1234', role: 'donor' }]);
  }
}

/** Wipe everything except UI preferences, then re-seed. */
export function resetDemoData() {
  // Object.values + filter + forEach: iterate every key except PREFS (keeps dark-mode choice).
  Object.values(KEYS).filter((k) => k !== KEYS.PREFS).forEach((k) => localStorage.removeItem(k));
  seedIfEmpty();
  notify();
}
