/* ==========================================================================
   contact.js — contact form saved to localStorage through a Promise.
   CONCEPTS: bindForm validation, async/await, try/catch, form reset.
   ========================================================================== */
import { initShell, showToast } from '../shell.js';
import { sendMessage } from '../lib/api.js';
import { V } from '../lib/validation.js';
import { $, bindForm } from '../ui.js';

initShell();

bindForm($('#contactForm'), {
  name: [V.required],
  email: [V.required, V.email],
  message: [V.required, V.minLen(10)]
}, {
  busyLabel: 'Sending…',
  onInvalid: () => showToast('Please fix the highlighted fields.', 'error'),
  onValid: async (values, reset) => {
    try {
      await sendMessage(values); // saved to localStorage after a short fake delay
      showToast('Message saved in this browser (demo). No email was sent.', 'info');
      reset();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
});
