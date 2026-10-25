/* ==========================================================================
   eligibility.js — quick eligibility checker.
   CONCEPTS: input events, reading numeric fields, building a list of reasons,
   escaping with html``.
   ========================================================================== */
import { initShell } from '../shell.js';
import { $, html, render } from '../ui.js';

initShell();

function check() {
  const age = $('#ea').value;
  const weight = $('#ew').value;
  const days = $('#ed').value;
  const well = $('#ewell').checked;
  if (age === '' || weight === '') { render($('#eligResult'), ''); return; } // nothing to judge yet

  const issues = [];
  if (age < 18 || age > 65) issues.push('Age should be between 18 and 65.');
  if (weight < 45) issues.push('Weight should be at least 45 kg.');
  if (days !== '' && days < 56) issues.push(`Wait ${56 - days} more day(s) — the usual interval is 56 days.`);
  if (!well) issues.push('You should be feeling well, with no fever or infection.');

  render($('#eligResult'), issues.length
    ? html`<span class="badge badge-urgent">Not yet</span>
        <ul style="list-style:disc;padding-left:1.2rem;margin-top:0.6rem">${issues.map((i) => html`<li class="muted">${i}</li>`)}</ul>`
    : html`<span class="badge badge-success">Looks good</span>
        <p class="muted" style="margin-top:0.6rem">You appear to meet the general guidelines. <a href="donor.html" style="color:var(--color-primary);font-weight:600">Register as a donor →</a></p>`);
}

['ea', 'ew', 'ed', 'ewell'].forEach((id) => $(`#${id}`).addEventListener('input', check));
