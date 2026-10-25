/* ==========================================================================
   donor.js — register / edit a donor profile and log donations.
   CONCEPTS: async/await (create / update), a promise CHAIN (.then/.catch/.finally)
   for "log donation", Promise rejection for duplicate emails, form pre-fill,
   date formatting, escaping with html``.
   ========================================================================== */
import { initShell, showToast } from '../shell.js';
import { createDonor, listDonors, logDonation, updateDonor } from '../lib/api.js';
import { goTo } from '../lib/nav.js';
import { KEYS, read, write } from '../lib/storage.js';
import { V } from '../lib/validation.js';
import { $, GROUPS, bindForm, fmtDate, html, loadingHTML, render } from '../ui.js';

initShell();

const RULES = {
  fullName: [V.required, V.minLen(3)],
  age: [V.required, V.range(18, 65)],
  weight: [V.required, V.range(45, 200)],
  phone: [V.required, V.phone],
  email: [V.required, V.email],
  address: [V.required],
  city: [V.required],
  consent: [V.checked('Please confirm and consent to continue.')]
};

const form = $('#donorForm');
const user = read(KEYS.USER);
let me = null;

// Blood-group radio pills (the CSS hides the radio and styles the label).
render($('#bgPicker'), GROUPS.map((g) => html`<input type="radio" id="bg-${g}" name="bloodGroup" value="${g}"${g === 'O+' ? ' checked' : ''}><label for="bg-${g}">${g}</label>`));

const f = bindForm(form, RULES, {
  busyLabel: 'Saving…',
  onInvalid: () => showToast('Please fix the highlighted fields.', 'error'),
  onValid: async (v) => {
    const record = {
      name: v.fullName.trim(), age: Number(v.age), gender: v.gender, bloodGroup: v.bloodGroup, weight: Number(v.weight),
      phone: v.phone.trim(), email: v.email.trim(), address: v.address.trim(), city: v.city.trim(), lastDonation: v.lastDonation || null
    };
    try {
      if (me) {
        await updateDonor(me.id, record);
        showToast('Profile updated.');
        await refresh();
      } else {
        const created = await createDonor(record); // may REJECT (duplicate email) -> jumps to catch
        write(KEYS.USER, { name: created.name, email: created.email, role: 'donor', donorId: created.id });
        showToast(`Thanks, ${created.name.split(' ')[0]}! You're registered as a donor.`);
        setTimeout(() => goTo('app.html#/dashboard'), 700);
      }
    } catch (err) {
      showToast(err.message, 'error'); // e.g. "A donor with that email already exists."
    }
  }
});

function fill(values) {
  Object.entries(values).forEach(([name, value]) => {
    if (name === 'bloodGroup') { // radio group: tick the matching pill
      const radio = form.querySelector(`input[name="bloodGroup"][value="${value}"]`);
      if (radio) radio.checked = true;
      return;
    }
    const el = form.elements[name];
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value ?? '';
  });
}

function renderHistory() {
  const box = $('#historyBox');
  if (!me) { render(box, html`<p class="muted">Register or log in to see your personal donation history here.</p>`); return; }
  // Old seed donors have a date but no history rows — show one legacy row for them.
  const history = [...(me.history || []),
    ...(me.lastDonation && !(me.history || []).length ? [{ date: me.lastDonation, venue: 'City Life Blood Bank', units: 1 }] : [])];
  render(box, html`
    <div class="flex items-center justify-between" style="margin-bottom:1rem;flex-wrap:wrap;gap:0.8rem">
      <div><strong>${me.name}</strong><div class="muted">${me.bloodGroup} · ${me.city} · ${me.donationsCount || 0} donation(s)</div></div>
      <button class="btn btn-primary btn-sm" id="logBtn">+ Log a donation today</button>
    </div>
    ${history.length ? html`<div style="overflow-x:auto"><table class="dash-table">
      <thead><tr><th>Date</th><th>Venue</th><th>Units</th></tr></thead>
      <tbody>${history.map((r) => html`<tr><td>${fmtDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${r.venue}</td><td>${r.units}</td></tr>`)}</tbody>
    </table></div>` : html`<p class="muted mb-0">No donations recorded yet.</p>`}`);
  // Promise CHAIN version (the form above uses async/await — both are equivalent).
  $('#logBtn').addEventListener('click', (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Logging…';
    logDonation(me.id)
      .then(() => showToast('Donation logged. Thank you!'))
      .catch((err) => showToast(err.message, 'error'))
      .finally(refresh);
  });
}

async function refresh() {
  const donors = await listDonors();
  const session = read(KEYS.USER);
  me = session && session.donorId ? donors.find((d) => d.id === session.donorId) || null : null;
  $('#donorTitle').textContent = me ? 'Your donor profile' : 'Register as a blood donor';
  f.setLabel(me ? 'Save Changes' : 'Complete Registration');
  renderHistory();
}

async function init() {
  render($('#historyBox'), loadingHTML());
  try {
    await refresh();
  } catch (err) {
    render($('#historyBox'), html`<p class="muted">Could not load your profile: ${err.message}</p>`);
  }
  // Pre-fill: editing an existing profile, or just name/email from the session.
  if (me) {
    fill({ fullName: me.name, age: me.age, gender: me.gender, weight: me.weight, bloodGroup: me.bloodGroup, phone: me.phone,
      email: me.email, address: me.address || '', city: me.city, lastDonation: me.lastDonation || '', consent: true });
  } else if (user) {
    fill({ fullName: user.name || '', email: user.email || '' });
  }
}
init();
