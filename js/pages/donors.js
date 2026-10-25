/* ==========================================================================
   donors.js — Find Donor: live filters over a Promise-loaded list.
   CONCEPTS: async/await + try/catch, array filter, input events,
   escaping with html``, loading / error / empty states.
   ========================================================================== */
import { initShell, initScrollReveal } from '../shell.js';
import { listDonors } from '../lib/api.js';
import { isSample } from '../lib/storage.js';
import { $, GROUPS, errorHTML, html, loadingHTML, render } from '../ui.js';

initShell();

let donors = [];

const card = (d) => html`
  <div class="card donor-card reveal">
    <span class="badge bg-tag">${d.bloodGroup}</span>
    <h3>${d.name}</h3>
    <div class="meta"><span>📍 ${d.city}</span><span>🩸 ${d.donationsCount || 0} donations</span></div>
    <p class="muted mb-0">Last donation: ${d.lastDonation || 'No record yet'}</p>
    <div class="flex gap-sm" style="margin-top:0.4rem">
      <span class="badge ${d.available ? 'badge-success' : ''}">${d.available ? 'Available now' : 'Currently unavailable'}</span>
    </div>
    ${isSample(d)
      ? html`<span class="badge mt-lg" style="align-self:flex-start">Sample profile (fictional)</span>`
      : html`<a href="tel:+91${d.phone}" class="btn btn-ghost btn-sm mt-lg" style="align-self:flex-start">Call number</a>`}
  </div>`;

function apply() {
  const group = $('#filterGroup').value;
  const city = $('#filterCity').value.trim().toLowerCase();
  const onlyAvailable = $('#filterAvailable').checked;
  // An empty filter matches everything (`!group ||`), otherwise it must equal/contain.
  const list = donors.filter((d) =>
    (!group || d.bloodGroup === group) &&
    (!city || d.city.toLowerCase().includes(city)) &&
    (!onlyAvailable || d.available));
  $('#donorCount').textContent = `${list.length} donor${list.length === 1 ? '' : 's'} found`;
  render($('#donorResults'), list.map(card));
  render($('#donorStatus'), list.length ? '' : html`<p class="muted">No donors match those filters yet — try widening your search.</p>`);
  initScrollReveal($('#donorResults'));
}

async function load() {
  render($('#donorStatus'), loadingHTML('Searching donors…'));
  try {
    donors = await listDonors();
    apply();
  } catch (err) {
    render($('#donorStatus'), errorHTML(err));
  }
}

$('#filterGroup').insertAdjacentHTML('beforeend', GROUPS.map((g) => `<option>${g}</option>`).join(''));
['filterGroup', 'filterCity', 'filterAvailable'].forEach((id) => $(`#${id}`).addEventListener('input', () => { if (donors.length) apply(); }));
load();
