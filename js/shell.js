/* ==========================================================================
   shell.js — the chrome shared by EVERY page (plain JS pages and the React page).
   Injects header/footer, wires the mobile menu, dark mode, toasts, scroll reveal.

   CONCEPTS IN THIS FILE
   • ES modules ............. import/export instead of global variables
   • Template literals ...... header/footer markup built from data arrays
   • DOM events ............. click, keydown (Escape), hashchange
   • Observer pattern ....... subscribe() re-renders login buttons / dark mode
                              whenever ANY code (even React) writes to storage
   • IntersectionObserver ... reveal-on-scroll
   • ARIA ................... aria-current, aria-expanded, role="status"
   ========================================================================== */
import { KEYS, read, write, seedIfEmpty, subscribe } from './lib/storage.js';

/* Pages that need React (login, signup, request, dashboard) all live in app.html
   and are chosen by the #/hash route. Everything else is its own HTML file. */
const NAV_LINKS = [
  { href: 'index.html', label: 'Home' },
  { href: 'about.html', label: 'About' },
  { href: 'donors.html', label: 'Find Donor' },
  { href: 'app.html#/request', label: 'Request Blood' },
  { href: 'bloodbanks.html', label: 'Blood Banks' },
  { href: 'camps.html', label: 'Camps' },
  { href: 'compatibility.html', label: 'Compatibility' },
  { href: 'app.html#/dashboard', label: 'Dashboard' }
];
const NAV_MORE_LINKS = [
  { href: 'eligibility.html', label: 'Eligibility' },
  { href: 'faq.html', label: 'FAQ' },
  { href: 'gallery.html', label: 'Gallery' },
  { href: 'contact.html', label: 'Contact' }
];

const bloodDropMark = (size = 26) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2C12 2 5 11.5 5 15.5C5 19.64 8.13 22 12 22C15.87 22 19 19.64 19 15.5C19 11.5 12 2 12 2Z" fill="#D90429"/>
  </svg>`;

/** "index.html", "camps.html" or — for the React page — "app.html#/request". */
function currentKey() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return file === 'app.html' ? `app.html${location.hash || '#/request'}` : file;
}

function renderHeader() {
  const linkHTML = (l) => `<a href="${l.href}">${l.label}</a>`;
  const links = NAV_LINKS.map(linkHTML).join('');
  const moreLinks = NAV_MORE_LINKS.map(linkHTML).join('');
  return `
  <a href="#" class="skip-link" id="skipLink">Skip to main content</a>
  <header class="site-header">
    <div class="nav container">
      <a href="index.html" class="brand">${bloodDropMark()} Sanguine</a>
      <nav class="nav-links" id="navLinks" aria-label="Primary">${links}</nav>
      <div class="nav-actions">
        <button class="btn-ghost btn btn-sm" id="darkModeToggle" aria-label="Toggle dark mode" title="Toggle dark mode">🌙</button>
        <span class="nav-auth-desktop" id="navAuth"></span>
        <a href="app.html#/login" class="btn btn-primary btn-sm nav-login-mobile" id="navLoginMobile">Login</a>
        <button class="nav-toggle" id="navToggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobileNav"><span></span><span></span><span></span></button>
      </div>
    </div>
    <div class="mobile-nav" id="mobileNav">
      <div class="container">
        <nav class="mobile-nav-links" aria-label="Mobile primary navigation">${links}</nav>
        <div class="mobile-nav-more">${moreLinks}<span id="mobileSignup"></span></div>
        <p class="mobile-nav-copy">&copy; <span id="mobileYear"></span> Sanguine</p>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="index.html" class="brand" style="color:#fff;margin-bottom:0.8rem;">${bloodDropMark()} Sanguine</a>
          <p style="color:rgba(255,255,255,0.65);max-width:32ch;">Connecting every drop to every life. A front-end demo of a donor network — all data is sample or stored only in your browser.</p>
        </div>
        <div><h4>Platform</h4>
          <a href="donors.html">Find a Donor</a><a href="app.html#/request">Request Blood</a>
          <a href="bloodbanks.html">Blood Banks</a><a href="camps.html">Donation Camps</a></div>
        <div><h4>Learn</h4>
          <a href="compatibility.html">Compatibility</a><a href="eligibility.html">Eligibility</a>
          <a href="faq.html">FAQ</a><a href="gallery.html">Gallery</a></div>
        <div><h4>Company</h4>
          <a href="about.html">About Us</a><a href="contact.html">Contact</a>
          <a href="app.html#/dashboard">Impact Dashboard</a></div>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span id="year"></span> Sanguine. Built for Front-End Engineering-II.</span>
        <span>Made with care — every donor matters.</span>
      </div>
    </div>
  </footer>`;
}

/* The login buttons depend on the saved session, so they are redrawn whenever storage changes. */
function refreshAuth() {
  const loggedIn = !!read(KEYS.USER);
  const desktop = document.getElementById('navAuth');
  if (desktop) {
    desktop.innerHTML = loggedIn
      ? '<a href="app.html#/dashboard" class="btn btn-primary btn-sm">My Dashboard</a>'
      : '<a href="app.html#/login" class="btn-ghost btn btn-sm">Log in</a><a href="app.html#/signup" class="btn btn-primary btn-sm">Donate Now</a>';
  }
  const mobile = document.getElementById('navLoginMobile');
  if (mobile) {
    mobile.href = loggedIn ? 'app.html#/dashboard' : 'app.html#/login';
    mobile.textContent = loggedIn ? 'Dashboard' : 'Login';
  }
  const signup = document.getElementById('mobileSignup');
  if (signup) signup.innerHTML = loggedIn ? '' : '<a href="app.html#/signup">Donate Now</a>';
}

function markCurrentLink() {
  const key = currentKey();
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach((a) => {
    if (a.getAttribute('href') === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function mountShell() {
  const headerMount = document.getElementById('site-header');
  const footerMount = document.getElementById('site-footer');
  if (headerMount) headerMount.outerHTML = renderHeader();
  if (footerMount) footerMount.outerHTML = renderFooter();
  const year = new Date().getFullYear();
  ['year', 'mobileYear'].forEach((id) => { const el = document.getElementById(id); if (el) el.textContent = year; });
}

function initSkipLink() {
  const link = document.getElementById('skipLink');
  if (!link) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.querySelector('main'); // looked up on click: React renders <main> after this runs
    if (!main) return;
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus();
    main.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileNav');
  if (!toggle || !menu) return;
  const setOpen = (isOpen) => {
    menu.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); toggle.focus(); }
  });
  window.addEventListener('hashchange', () => setOpen(false));
}

function applyDark() {
  const dark = !!(read(KEYS.PREFS) || {}).dark;
  document.body.classList.toggle('dark', dark);
  const btn = document.getElementById('darkModeToggle');
  if (btn) btn.textContent = dark ? '☀️' : '🌙';
}

function initDarkMode() {
  applyDark();
  const btn = document.getElementById('darkModeToggle');
  if (btn) btn.addEventListener('click', () => write(KEYS.PREFS, { ...read(KEYS.PREFS), dark: !document.body.classList.contains('dark') }));
}

/** Plain-JS toast (React pages use the Context-based toasts in src/context.jsx). */
export function showToast(message, type = 'success') {
  let root = document.getElementById('toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'toast-root';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const i = document.createElement('span'); i.textContent = icon;
  const m = document.createElement('span'); m.textContent = message; // textContent: never parses HTML
  toast.append(i, m);
  root.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

/** Fade-in on scroll. Call again after rendering new `.reveal` elements. */
export function initScrollReveal(root = document) {
  const items = [...root.querySelectorAll('.reveal:not(.in)')];
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15 });
  items.forEach((el) => io.observe(el));
}

let started = false;
/** Call once per page. Safe to call twice. */
export function initShell() {
  if (started) return;
  started = true;
  seedIfEmpty(); // guarantees demo data exists before any page reads it
  const start = () => {
    mountShell();
    refreshAuth();
    markCurrentLink();
    initSkipLink();
    initNavToggle();
    initDarkMode();
    initScrollReveal();
    subscribe(() => { refreshAuth(); applyDark(); });
    window.addEventListener('hashchange', markCurrentLink);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
