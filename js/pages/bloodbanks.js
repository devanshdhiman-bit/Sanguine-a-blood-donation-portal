/* ==========================================================================
   bloodbanks.js — searchable, filterable blood bank list.
   CONCEPTS: Promise .then/.catch, string search, array includes, escaping.
   ========================================================================== */
import { initShell, initScrollReveal } from '../shell.js';
import { listBanks } from '../lib/api.js';
import { $, GROUPS, emptyHTML, errorHTML, html, loadingHTML, render } from '../ui.js';

initShell();

let banks = [];

const card = (b, group) => html`
  <div class="card bank-card reveal">
    <div class="flex items-center justify-between" style="gap:0.6rem;flex-wrap:wrap">
      <h3 class="mb-0">${b.name}</h3>
      <span class="badge ${b.hours.includes('24/7') ? 'badge-success' : ''}">${b.hours}</span>
    </div>
    <p class="muted mb-0">📍 ${b.address}</p>
    <p class="muted mb-0">📞 <a href="tel:${b.phone}">${b.phone}</a></p>
    <div class="flex gap-sm" style="flex-wrap:wrap;margin-top:0.4rem">
      ${b.groups.map((g) => html`<span class="badge ${g === group ? 'badge-success' : ''}">${g}</span>`)}
    </div>
  </div>`;

function apply() {
  const group = $('#bg').value;
  const q = $('#bq').value.trim().toLowerCase();
  const list = banks.filter((b) => (!group || b.groups.includes(group)) &&
    (!q || `${b.name} ${b.address}`.toLowerCase().includes(q)));
  render($('#bankList'), list.map((b) => card(b, group)));
  render($('#bankStatus'), list.length ? '' : emptyHTML('No blood banks found', 'Try a different search or blood group.'));
  initScrollReveal($('#bankList'));
}

$('#bg').insertAdjacentHTML('beforeend', GROUPS.map((g) => `<option>${g}</option>`).join(''));
['bq', 'bg'].forEach((id) => $(`#${id}`).addEventListener('input', () => { if (banks.length) apply(); }));

render($('#bankStatus'), loadingHTML('Loading blood banks…'));
listBanks()
  .then((data) => { banks = data; apply(); })
  .catch((err) => render($('#bankStatus'), errorHTML(err)));
