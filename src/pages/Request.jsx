/* ==========================================================================
   Request.jsx — save a blood request in this browser + list saved requests.

   DEMO NOTE: requests are stored locally (Redux store -> localStorage). Nothing
   is sent to a server, hospital or donor, and nobody is notified.

   CONCEPTS
   • Redux Toolkit ......... useDispatch(requestAdded / requestRemoved) and
                             useSelector(selectRequests) — the slice is the only
                             place requests are kept
   • Persistence ........... store/index.js saves the slice to localStorage
   • Controlled form ....... useForm + validation rules
   • useRef + scrollIntoView  smooth-scroll to the list after saving
   • Empty state ........... shown when the list is empty
   ========================================================================== */
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { requestAdded, requestRemoved, selectRequests } from '../store/requestsSlice';
import { isSample } from '../../js/lib/storage.js';
import { useForm } from '../lib/hooks';
import { V } from '../../js/lib/validation.js';
import { useApp } from '../context.jsx';
import { Empty, Field, GROUPS, PageHero, Picker, Reveal } from '../components/ui.jsx';

const INITIAL = { patient: '', hospital: '', bloodGroup: 'O+', units: '', contact: '', city: '', urgency: 'Moderate' };
const RULES = {
  patient: [V.required, V.minLen(2)],
  hospital: [V.required],
  units: [V.required, V.range(1, 20)],
  contact: [V.required, V.phone],
  city: [V.required]
};

export default function Request() {
  const { toast } = useApp();
  const dispatch = useDispatch();
  const requests = useSelector(selectRequests);
  const feed = useRef(null); // DOM handle for the list section

  const f = useForm(INITIAL, RULES, (v, reset) => {
    dispatch(requestAdded({ ...v, patient: v.patient.trim(), hospital: v.hospital.trim(), city: v.city.trim(), units: Number(v.units) }));
    toast('Request saved in this browser (demo). No donors were notified.');
    reset();
    setTimeout(() => feed.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  });

  const fulfil = (r) => {
    dispatch(requestRemoved(r.id));
    toast(`Request for ${r.patient} marked as fulfilled.`);
  };

  return (
    <main id="main" tabIndex={-1}>
      <PageHero center eyebrow="Blood Request — Local Demo" title="Save a blood request"
        lead="Demo only: requests are stored locally in this browser. They are not sent to donors, hospitals or any server, and nobody is notified." />
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <form className="form-card" noValidate onSubmit={f.handleSubmit(() => toast('Please fix the highlighted fields.', 'error'))}>
            <div className="form-row">
              <Field f={f} name="patient" label="Patient name" placeholder="Patient's full name" />
              <Field f={f} name="hospital" label="Hospital" placeholder="Hospital name" />
            </div>
            <div className="field">
              <label>Blood group needed</label>
              <Picker name="rbg" label="Blood group needed" options={GROUPS} value={f.values.bloodGroup} onChange={(v) => f.set('bloodGroup', v)} />
            </div>
            <div className="form-row">
              <Field f={f} name="units" label="Units required" type="number" min="1" max="20" placeholder="e.g. 2" />
              <Field f={f} name="contact" label="Contact number" type="tel" placeholder="10-digit mobile number" />
            </div>
            <div className="form-row">
              <Field f={f} name="city" label="City" placeholder="e.g. Chandigarh" />
              <div className="field">
                <label>Urgency</label>
                <Picker className="urgency-picker" name="urg" label="Urgency" options={['Low', 'Moderate', 'Critical']}
                  value={f.values.urgency} onChange={(v) => f.set('urgency', v)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={f.submitting}>
              {f.submitting ? 'Saving…' : 'Save Request (local demo)'}
            </button>
          </form>
        </div>
      </section>

      <section className="section section-alt" ref={feed}>
        <div className="container">
          <div className="section-header"><span className="eyebrow">Saved in this browser</span><h2>Saved blood requests</h2></div>
          <div className="grid grid-3">
            {requests.map((r) => (
              <Reveal key={r.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="mb-0">{r.patient}</h3>
                  <span className={`badge ${r.urgency === 'Critical' ? 'badge-urgent' : ''}`}>{r.urgency}</span>
                </div>
                <p className="muted" style={{ marginTop: '0.4rem' }}>{r.hospital} · {r.city}</p>
                <div className="flex gap-sm items-center" style={{ margin: '0.6rem 0' }}>
                  <span className="badge">{r.bloodGroup}</span><span className="muted">{r.units} unit(s) needed</span>
                </div>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                  {isSample(r)
                    ? <span className="badge">Sample request</span>
                    : <a href={`tel:${r.contact}`} className="btn btn-primary btn-sm">Call contact</a>}
                  <button className="btn btn-ghost btn-sm" onClick={() => fulfil(r)}>Mark fulfilled</button>
                </div>
              </Reveal>
            ))}
          </div>
          {!requests.length && <Empty title="No saved requests">Requests you save will appear here.</Empty>}
        </div>
      </section>
    </main>
  );
}
