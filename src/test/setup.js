// Test setup: jest-dom matchers (toBeInTheDocument, …) and browser APIs jsdom lacks.
import '@testing-library/jest-dom/vitest';

window.scrollTo = () => {}; // jsdom doesn't implement scrolling; App calls it on route change
Element.prototype.scrollIntoView = () => {};
