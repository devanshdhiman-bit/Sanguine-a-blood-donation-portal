/* ==========================================================================
   api.js — a MOCK data layer (there is no server). Every function returns a
   PROMISE, like a fetch()-based API would, but the data comes from localStorage
   after an artificial delay. If you later add a backend, only this file changes.

   CONCEPTS IN THIS FILE
   • Promise constructor .... new Promise((resolve, reject) => …)
   • Promise states ......... pending -> fulfilled (resolve) | rejected (reject)
   • Simulated latency ...... setTimeout inside the promise
   • Custom Error class ..... ApiError carries an HTTP-like status code
   • Promise.reject ......... returning an already-failed promise
   • Promise.race ........... used for a request timeout
   • Promise.all ............ run several requests in parallel (getOverview)
   • async / await .......... sequential logic that reads like normal code
   • Error propagation ...... a `throw` inside an async function becomes a
                              rejected promise the caller can .catch()
   ========================================================================== */
import * as db from './storage';
import { KEYS } from './storage';

const READ_MS = 250;   // pretend network time for GET-like calls
const WRITE_MS = 450;  // writes feel slower, like a real POST

/** An Error that also remembers an HTTP-style status (400, 401, 404, 409…). */
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);        // call the built-in Error constructor
    this.name = 'ApiError';
    this.status = status;
  }
}

/** A promise that resolves after `ms` milliseconds. Building block for fake latency. */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Promise.race settles as soon as the FIRST promise settles. Racing the real
 * work against a timer that rejects gives us a timeout.
 */
export function withTimeout(promise, ms = 4000) {
  const timer = new Promise((_, reject) =>
    setTimeout(() => reject(new ApiError('Request timed out. Please try again.', 408)), ms));
  return Promise.race([promise, timer]);
}

/**
 * Core helper: run `work` after `ms`, wrapped in a Promise.
 *  - return value  -> resolve(value)  -> caller's .then / await result
 *  - thrown error  -> reject(error)   -> caller's .catch / try-catch
 */
function request(work, ms = READ_MS) {
  const p = new Promise((resolve, reject) => {
    setTimeout(() => {
      try { resolve(work()); } catch (err) { reject(err); }
    }, ms);
  });
  return withTimeout(p);
}

/* ------------------------------- READS -------------------------------- */
export const listDonors   = () => request(() => db.all(KEYS.DONORS));
export const listBanks    = () => request(() => db.all(KEYS.BANKS));
export const listCamps    = () => request(() => db.all(KEYS.CAMPS));
export const listMyCamps  = () => request(() => db.all(KEYS.MY_CAMPS));

/**
 * Promise.all starts all three requests AT THE SAME TIME and resolves with an
 * array of results once every one has finished (~250ms total, not 3 x 250ms).
 * If any one rejects, Promise.all rejects immediately.
 */
export async function getOverview() {
  const [donors, banks, camps] = await Promise.all([
    listDonors(), listBanks(), listCamps()
  ]);
  return { donors, banks, camps };
}

/* ------------------------------- DONORS ------------------------------- */
export function createDonor(record) {
  return request(() => {
    const taken = db.all(KEYS.DONORS).some((d) => d.email.toLowerCase() === record.email.toLowerCase());
    // Throwing inside `work` makes request() reject with this error.
    if (taken) throw new ApiError('A donor with that email already exists.', 409);
    const donor = db.insert(KEYS.DONORS, { ...record, available: true, donationsCount: 0, history: [] });
    // Link the new donor to a matching account so it survives log out / log in.
    db.write(KEYS.USERS, db.all(KEYS.USERS).map((u) => (u.email === donor.email ? { ...u, donorId: donor.id } : u)));
    return donor;
  }, WRITE_MS);
}

export const updateDonor = (id, patch) =>
  request(() => {
    if (!db.all(KEYS.DONORS).some((d) => d.id === id)) throw new ApiError('Donor not found.', 404);
    db.update(KEYS.DONORS, id, patch);
    return db.all(KEYS.DONORS).find((d) => d.id === id);
  }, WRITE_MS);

export const setAvailability = (id, available) => updateDonor(id, { available });

export const logDonation = (id) =>
  request(() => {
    const today = new Date().toISOString().slice(0, 10);
    db.update(KEYS.DONORS, id, (d) => ({
      lastDonation: today,
      donationsCount: (d.donationsCount || 0) + 1,
      history: [{ date: today, venue: 'Self-reported donation', units: 1 }, ...(d.history || [])]
    }));
    return today;
  }, WRITE_MS);

/* Blood requests: the React app WRITES them through the Redux store (src/store).
   Plain-JS pages only READ them, through this Promise, from the same localStorage key. */
export const listRequests = () => request(() => db.all(KEYS.REQUESTS));

/* -------------------------------- CAMPS ------------------------------- */
/** Join or leave a camp. Resolves { joined, camp }. Rejects if the camp is full. */
export const toggleCamp = (campId) =>
  request(() => {
    const camp = db.all(KEYS.CAMPS).find((c) => c.id === campId);
    if (!camp) throw new ApiError('Camp not found.', 404);
    const mine = db.all(KEYS.MY_CAMPS);
    if (mine.includes(campId)) {
      db.update(KEYS.CAMPS, campId, { registered: Math.max(0, camp.registered - 1) });
      db.write(KEYS.MY_CAMPS, mine.filter((id) => id !== campId));
      return { joined: false, camp };
    }
    if (camp.registered >= camp.seats) throw new ApiError('Sorry, this camp is full.', 409);
    db.update(KEYS.CAMPS, campId, { registered: camp.registered + 1 });
    db.write(KEYS.MY_CAMPS, [...mine, campId]);
    return { joined: true, camp };
  }, WRITE_MS);

/* --------------------------------- AUTH -------------------------------- */
export function login(email, password) {
  const user = db.all(KEYS.USERS).find((u) => u.email === email && u.password === password);
  // Promise.reject(x) is shorthand for "a promise that is already rejected with x".
  if (!user) return delay(WRITE_MS).then(() => Promise.reject(new ApiError('No account matches those details.', 401)));
  // Promise.resolve(x) is the mirror image: an already-fulfilled promise.
  return delay(WRITE_MS).then(() => Promise.resolve({
    name: user.name, email: user.email, role: user.role, donorId: user.donorId
  }));
}

export const signup = ({ name, email, password }) =>
  request(() => {
    if (db.all(KEYS.USERS).some((u) => u.email === email)) throw new ApiError('An account with that email already exists.', 409);
    const u = db.insert(KEYS.USERS, { name, email, password, role: 'donor' });
    return { name: u.name, email: u.email, role: u.role };
  }, WRITE_MS);

/* ------------------------------- MISC --------------------------------- */
export const sendMessage = (msg) => request(() => db.insert(KEYS.MESSAGES, msg), WRITE_MS);
export const resetDemo = () => request(() => { db.resetDemoData(); return true; }, WRITE_MS);
