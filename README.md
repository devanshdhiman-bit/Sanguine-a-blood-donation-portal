# 🩸 Sanguine — HTML/CSS/vanilla-JS first, React where it counts

Blood-donation portal **front-end demo**. Most of the site is traditional **semantic HTML + CSS + vanilla JavaScript (ES modules, Promises)**.
**React is used only for the four pages that need it** and that map to the course rubric.

> **Demo only.** No backend. Data is sample data or lives in this browser's `localStorage`.
> Saved blood requests are **not** sent to anyone. Login/signup is demo authentication with **plain-text passwords** — never enter a real one.

## Which technology where

| Pages | Built with | Why |
|---|---|---|
| Home, About, Find Donor, Donor profile, Blood Banks, Camps, Compatibility, Eligibility, FAQ, Gallery, Contact | one `.html` file each + `js/pages/<name>.js` (vanilla JS) | no framework needed |
| Login, Sign up, Request Blood, Dashboard | `app.html` + the React app in `src/` (HashRouter: `app.html#/request`) | React Router, Context API, Redux Toolkit, controlled forms |

Both worlds share the same framework-free modules in `js/lib/` (`storage.js`, `api.js`, `validation.js`) and the same CSS in `css/`.
The header/footer, dark mode and login buttons are drawn once by `js/shell.js` on **every** page (including the React one).

## Rubric mapping (Front End Engineering-II, Evaluation II)

| Rubric item | Where to look |
|---|---|
| React navigation layout & page structure | `src/App.jsx`: layout route + `<Outlet/>`, `NavLink` sub-nav, index `<Navigate>` redirect, pathless `GuestOnly` guard route, `*` 404; `src/main.jsx` (`HashRouter`) |
| Context API & state architecture | `src/context.jsx` (session + toasts, `useApp`, memoised value) · state split explained at the top of that file |
| Redux Toolkit | `src/store/requestsSlice.js` (`createSlice`, `prepare`, `createSelector`), `src/store/index.js` (`configureStore`, persistence, cross-tab sync); used by `Request.jsx` and `Dashboard.jsx` |
| Form handling in React | `src/lib/hooks.js` `useForm` (controlled inputs, validation, async submit) used by Login, Signup, Forgot-password, Request |

## Promise-based JavaScript

`js/lib/api.js` is a mock service: every call returns a **Promise** (simulated latency over localStorage).

| Concept | Where |
|---|---|
| `new Promise`, simulated latency, custom `ApiError` | `api.js` → `request()`, `delay()` |
| `Promise.all` | `api.getOverview()`; `js/pages/home.js`, `camps.js` |
| `Promise.race` (timeout) | `api.withTimeout()` |
| `Promise.resolve` / `Promise.reject` | `api.login()` |
| `async/await` + `try/catch/finally` | `camps.js`, `donor.js`, `contact.js`, React Auth/Request |
| `.then().catch().finally()` chains | `donor.js` (log donation), `home.js`, `bloodbanks.js`, React Dashboard |
| Loading / error / empty states | `ui.js` (`loadingHTML`, `errorHTML`, `emptyHTML`), React `ui.jsx` |

## Features (all preserved)
Donor registration/edit/donation log · Find Donor filters · Blood requests (save, list, mark fulfilled) · Blood banks search/filter ·
Camps register/cancel with seat counts and "full" rejection · Compatibility explorer · Eligibility checker · FAQ search/accordion ·
Gallery filter · Contact (saved locally) · Dashboard charts, availability toggle, reset demo data · Dark mode · Login/signup/logout.

Demo login: `demo@sanguine.app` / `demo1234`.
