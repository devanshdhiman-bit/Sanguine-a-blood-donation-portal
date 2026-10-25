// nav.js — leave the current page for another one (full page load).
// A function (not a bare `location.href =`) so tests can replace it: jsdom cannot navigate.
export const goTo = (url) => window.location.assign(url);
