/* ==========================================================================
   gallery.js — tag-filtered gallery grid.
   CONCEPTS: Set for unique values, array map/filter, re-rendering from state.
   ========================================================================== */
import { initShell, initScrollReveal } from '../shell.js';
import { $, html, render } from '../ui.js';

initShell();

const GALLERY = [
  ['Corporate Donor Drive', 'Camp'], ['Volunteer Team, Mohali', 'Volunteers'], ['City Life Hospital', 'Hospital'],
  ['University Blood Camp', 'Camp'], ['First-time Donor Day', 'Drive'], ['Fortis Blood Bank', 'Hospital'],
  ['Community Health Drive', 'Drive'], ['Thank-You Ceremony', 'Volunteers']
];
const TAGS = ['All', ...new Set(GALLERY.map((g) => g[1]))];
let tag = 'All';

function draw() {
  render($('#galleryTags'), TAGS.map((t) => html`<button class="btn btn-sm ${t === tag ? 'btn-primary' : 'btn-ghost'}" data-tag="${t}" aria-pressed="${String(t === tag)}">${t}</button>`));
  render($('#galleryGrid'), GALLERY.filter((g) => tag === 'All' || g[1] === tag).map(([label, t]) => html`
    <div class="gallery-item reveal"><div class="ph">${t}</div><div class="cap">${label}</div></div>`));
  initScrollReveal($('#galleryGrid'));
}

$('#galleryTags').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tag]');
  if (btn) { tag = btn.dataset.tag; draw(); }
});
draw();
