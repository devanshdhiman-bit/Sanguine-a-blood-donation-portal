/* ==========================================================================
   home.js — landing page.
   CONCEPTS: Promise.all (two independent requests in parallel), .then/.catch
   chain, DOM updates from resolved data, count-up animation, error state.
   ========================================================================== */
import { initShell, initScrollReveal } from '../shell.js';
import { getOverview, listRequests } from '../lib/api.js';
import { $, countUp, errorHTML, html, loadingHTML, render } from '../ui.js';

initShell();

const bankCard = (b) => html`
  <div class="card reveal">
    <h3>${b.name}</h3><p class="muted">${b.address}</p>
    <span class="badge ${b.hours.includes('24/7') ? 'badge-success' : ''}">${b.hours}</span>
  </div>`;

function showEmergency(requests) {
  const critical = requests.filter((r) => r.urgency === 'Critical');
  const groups = [...new Set(critical.map((r) => r.bloodGroup))];
  render($('#emergencyText'), critical.length
    ? html`🚨 <strong>${critical.length} critical request${critical.length > 1 ? 's' : ''}</strong> saved in this demo (${groups.join(', ')}).`
    : html`🚨 No critical requests saved in this demo.`);
}

render($('#featuredStatus'), loadingHTML('Loading blood banks…'));

// Promise.all starts both reads at once and resolves with [overview, requests].
Promise.all([getOverview(), listRequests()])
  .then(([{ donors, banks, camps }, requests]) => {
    const donations = donors.reduce((sum, d) => sum + (d.donationsCount || 0), 0);
    [['heroDonors', donors.length], ['heroDonations', donations], ['heroBanks', banks.length],
     ['glDonors', donors.length], ['glRequests', requests.length], ['glBanks', banks.length], ['glCamps', camps.length]]
      .forEach(([id, n]) => countUp($(`#${id}`), n));
    showEmergency(requests);
    render($('#featuredStatus'), '');
    render($('#featuredBanks'), banks.slice(0, 3).map(bankCard));
    initScrollReveal();
  })
  .catch((err) => {
    render($('#featuredStatus'), errorHTML(err));
    render($('#emergencyText'), html`🚨 Could not load saved requests.`);
  });
