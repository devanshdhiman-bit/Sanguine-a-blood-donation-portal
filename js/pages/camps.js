/* ==========================================================================
   camps.js — donation camps with register / cancel.
   CONCEPTS: Promise.all (camps + my camps), async/await with try/catch/finally,
   a rejected Promise used as business logic ("camp is full" -> toast),
   per-button busy state, derived UI state (joined / full), progress bar math.
   ========================================================================== */
import { initShell, initScrollReveal, showToast } from '../shell.js';
import { listCamps, listMyCamps, toggleCamp } from '../lib/api.js';
import { $, emptyHTML, errorHTML, fmtDate, html, loadingHTML, render } from '../ui.js';

initShell();

const list = $('#campList');
const status = $('#campStatus');

const card = (c, joined) => {
  const full = c.registered >= c.seats && !joined;
  const pct = Math.round((c.registered / c.seats) * 100);
  return html`
  <div class="card camp-card reveal">
    <span class="badge">${fmtDate(c.date)}</span>
    <h3>${c.title}</h3>
    <p class="muted mb-0">📍 ${c.venue}</p>
    <p class="muted mb-0">Organized by ${c.organizer}</p>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <p class="muted" style="margin:0.4rem 0">${c.registered}/${c.seats} seats filled</p>
    <button class="btn ${joined || full ? 'btn-ghost' : 'btn-primary'} btn-sm" data-camp="${c.id}" ${full ? 'disabled' : ''}>
      ${full ? 'Camp Full' : joined ? '✓ Registered — cancel' : 'Register for Camp'}</button>
  </div>`;
};

async function load() {
  try {
    // Two independent reads, started together.
    const [camps, mine] = await Promise.all([listCamps(), listMyCamps()]);
    render(status, camps.length ? '' : emptyHTML('No camps scheduled', 'New donation camps will appear here.'));
    render(list, camps.map((c) => card(c, mine.includes(c.id))));
    initScrollReveal(list);
  } catch (err) {
    render(status, errorHTML(err));
  }
}

// Event delegation: one listener on the grid handles every button, even after re-renders.
list.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-camp]');
  if (!btn || btn.disabled) return;
  const title = btn.closest('.camp-card').querySelector('h3').textContent;
  btn.disabled = true;
  btn.textContent = 'Please wait…';
  try {
    const { joined } = await toggleCamp(btn.dataset.camp); // rejects with "Sorry, this camp is full."
    showToast(joined ? `You're registered for ${title}!` : `Registration cancelled for ${title}.`, joined ? 'success' : 'info');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    await load(); // always redraw from the saved data so the UI never shows a state the "server" refused
  }
});

render(status, loadingHTML('Loading camps…'));
load();
