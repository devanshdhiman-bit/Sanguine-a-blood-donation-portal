/* ==========================================================================
   faq.js — searchable accordion.
   CONCEPTS: data array + render(), filtering as you type, event delegation,
   aria-expanded, only one answer open at a time.
   ========================================================================== */
import { initShell } from '../shell.js';
import { $, emptyHTML, html, render } from '../ui.js';

initShell();

const FAQS = [
  { q: 'Does donating blood hurt?', a: 'Most donors feel only a brief pinch when the needle is inserted. The donation itself typically takes 8–10 minutes and is not painful.' },
  { q: 'How often can I donate?', a: 'Whole-blood donors can generally donate again after about 56 days (8 weeks), giving your body time to replenish red blood cells.' },
  { q: 'Is my data safe on Sanguine?', a: "This is a demo with no backend. Details are saved only in this browser's localStorage, unencrypted (demo passwords are stored as plain text). Don't enter real passwords or sensitive information." },
  { q: 'What should I do before donating?', a: 'Sleep well, eat a balanced meal, and drink plenty of water in the hours before your appointment.' },
  { q: 'Can I request blood for someone else?', a: 'In this demo you can save a request on the Request Blood page. It is stored only in your browser; no donors or hospitals are notified.' },
  { q: 'What if I miss my donation interval?', a: "No problem — simply update your availability and donate whenever you're next eligible." }
];

const list = $('#faqList');
let open = null;

function draw() {
  const s = $('#faqSearch').value.toLowerCase();
  const shown = FAQS.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  render(list, shown.length
    ? shown.map((f) => html`
      <div class="accordion-item${open === f.q ? ' open' : ''}">
        <button class="acc-trigger" aria-expanded="${String(open === f.q)}" data-q="${f.q}">${f.q}<span class="plus">+</span></button>
        <div class="acc-panel"><p>${f.a}</p></div>
      </div>`)
    : emptyHTML('No matching questions', 'Try different keywords.'));
}

list.addEventListener('click', (e) => {
  const btn = e.target.closest('.acc-trigger');
  if (!btn) return;
  open = open === btn.dataset.q ? null : btn.dataset.q;
  draw();
});
$('#faqSearch').addEventListener('input', draw);
draw();
