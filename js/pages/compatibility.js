/* ==========================================================================
   compatibility.js — click / keyboard-select a blood group to see its matches.
   CONCEPTS: object lookup tables, Object.entries, ARIA (role=button, aria-pressed),
   keyboard accessibility (Enter / Space), the `hidden` attribute.
   ========================================================================== */
import { initShell } from '../shell.js';
import { $, $$, html, render } from '../ui.js';

initShell();

const COMPAT = {
  'O-': { to: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], from: ['O-'] },
  'O+': { to: ['O+', 'A+', 'B+', 'AB+'], from: ['O-', 'O+'] },
  'A-': { to: ['A-', 'A+', 'AB-', 'AB+'], from: ['O-', 'A-'] },
  'A+': { to: ['A+', 'AB+'], from: ['O-', 'O+', 'A-', 'A+'] },
  'B-': { to: ['B-', 'B+', 'AB-', 'AB+'], from: ['O-', 'B-'] },
  'B+': { to: ['B+', 'AB+'], from: ['O-', 'O+', 'B-', 'B+'] },
  'AB-': { to: ['AB-', 'AB+'], from: ['O-', 'A-', 'B-', 'AB-'] },
  'AB+': { to: ['AB+'], from: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] }
};

const body = $('#compatBody');
let selected = null;

render(body, Object.entries(COMPAT).map(([g, c]) => html`
  <tr data-row="${g}">
    <td class="bg-select" data-group="${g}" tabindex="0" role="button" aria-pressed="false"><span class="badge">${g}</span></td>
    <td>${c.to.join(', ')}</td><td>${c.from.join(', ')}</td>
  </tr>`));

function select(group) {
  selected = selected === group ? null : group; // click again to deselect
  $$('tr', body).forEach((row) => row.classList.toggle('active-row', row.dataset.row === selected));
  $$('.bg-select', body).forEach((cell) => cell.setAttribute('aria-pressed', String(cell.dataset.group === selected)));
  $('#compatDetail').hidden = !selected;
  if (!selected) return;
  $('#donateToTitle').textContent = `${selected} can donate to`;
  $('#receiveFromTitle').textContent = `${selected} can receive from`;
  render($('#donateToList'), COMPAT[selected].to.map((x) => html`<span class="badge badge-success">${x}</span>`));
  render($('#receiveFromList'), COMPAT[selected].from.map((x) => html`<span class="badge">${x}</span>`));
}

body.addEventListener('click', (e) => { const cell = e.target.closest('.bg-select'); if (cell) select(cell.dataset.group); });
body.addEventListener('keydown', (e) => {
  const cell = e.target.closest('.bg-select');
  if (cell && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(cell.dataset.group); }
});
