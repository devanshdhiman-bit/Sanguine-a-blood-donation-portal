// Integration tests: real components + real Redux store + Context + HashRouter + localStorage.
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import { AppProvider } from '../context.jsx';
import { attachPersistence, createAppStore } from '../store';
import { requestAdded } from '../store/requestsSlice';
import { KEYS, write } from '../../js/lib/storage.js';
import { goTo } from '../nav.js';

// Leaving the React app for a plain HTML page can't happen in jsdom — record the call instead.
vi.mock('../nav.js', () => ({ goTo: vi.fn() }));

let store;
let detach;

function renderAt(hash) {
  window.location.hash = hash;
  return render(
    <Provider store={store}>
      <HashRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </HashRouter>
    </Provider>
  );
}
const saved = (key) => JSON.parse(localStorage.getItem(key));

beforeEach(() => {
  localStorage.clear();
  document.body.className = '';
  store = createAppStore();        // re-seeds demo data into the cleared storage
  detach = attachPersistence(store);
});
afterEach(() => detach());

describe('routing (layout route, redirect, guard, 404)', () => {
  it('redirects the bare URL to the request page and navigates with the layout NavLinks', async () => {
    const user = userEvent.setup();
    renderAt('#/');
    expect(await screen.findByRole('heading', { name: /save a blood request/i })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /requests and account/i });
    expect(within(nav).getByRole('link', { name: 'Request Blood' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(nav).getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByRole('heading', { name: /network overview/i })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows a 404 page for unknown routes', () => {
    renderAt('#/does-not-exist');
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('guard: an already logged-in visitor opening /login is sent to the dashboard', async () => {
    write(KEYS.USER, { name: 'Demo Donor', email: 'demo@sanguine.app', role: 'donor' });
    renderAt('#/login');
    expect(await screen.findByRole('heading', { name: /network overview/i })).toBeInTheDocument();
  });
});

describe('Context API', () => {
  it('session in Context drives the layout: guests see Log in / Sign up, members do not', async () => {
    const first = renderAt('#/request');
    const nav = screen.getByRole('navigation', { name: /requests and account/i });
    expect(within(nav).getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    first.unmount();
    write(KEYS.USER, { name: 'Demo Donor', email: 'demo@sanguine.app', role: 'donor' });
    renderAt('#/request');
    const nav2 = screen.getByRole('navigation', { name: /requests and account/i });
    expect(within(nav2).queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('demo login stores the session in context + localStorage and reaches the dashboard', async () => {
    const user = userEvent.setup();
    renderAt('#/login');
    expect(screen.getByRole('note')).toHaveTextContent(/demo authentication only/i);
    await user.click(screen.getByRole('button', { name: /fill demo credentials/i }));
    await user.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByRole('heading', { name: /network overview/i }, { timeout: 4000 })).toBeInTheDocument();
    expect(saved(KEYS.USER).email).toBe('demo@sanguine.app');
    expect(screen.getByRole('heading', { name: /hi, demo|welcome/i })).toBeInTheDocument();
  });

  it('wrong credentials are rejected and no session is stored', async () => {
    const user = userEvent.setup();
    renderAt('#/login');
    await user.type(screen.getByLabelText(/^email/i), 'nobody@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByText(/no account matches/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(localStorage.getItem(KEYS.USER)).toBeNull();
  });
});

describe('form validation', () => {
  it('blocks an empty request and shows field errors', async () => {
    const user = userEvent.setup();
    renderAt('#/request');
    await user.click(screen.getByRole('button', { name: /save request/i }));
    expect(screen.getAllByText('This field is required.').length).toBeGreaterThanOrEqual(4);
    expect(store.getState().requests.items).toHaveLength(2); // unchanged
  });

  it('validates phone and unit range', async () => {
    const user = userEvent.setup();
    renderAt('#/request');
    await user.type(screen.getByLabelText(/units required/i), '99');
    await user.type(screen.getByLabelText(/contact number/i), '12345');
    await user.click(screen.getByRole('button', { name: /save request/i }));
    expect(screen.getByText('Must be between 1 and 20.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid 10-digit phone number.')).toBeInTheDocument();
  });

  it('signup requires matching passwords', async () => {
    const user = userEvent.setup();
    renderAt('#/signup');
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'secret1');
    await user.type(screen.getByLabelText(/confirm password/i), 'different');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/passwords must match/i)).toBeInTheDocument();
  });
});

describe('signup success', () => {
  it('creates the account, stores the session and continues to the plain-HTML donor page', async () => {
    const user = userEvent.setup();
    renderAt('#/signup');
    await user.type(screen.getByLabelText(/full name/i), 'New Person');
    await user.type(screen.getByLabelText(/^email/i), 'new.person@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'secret12');
    await user.type(screen.getByLabelText(/confirm password/i), 'secret12');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(saved(KEYS.USER)?.email).toBe('new.person@example.com'), { timeout: 3000 });
    await waitFor(() => expect(goTo).toHaveBeenCalledWith('donor.html'), { timeout: 3000 });
  });
});

describe('Redux + localStorage (blood requests)', () => {
  async function fillAndSave(user, patient) {
    await user.type(screen.getByLabelText(/patient name/i), patient);
    await user.type(screen.getByLabelText(/^hospital/i), 'Test Hospital');
    await user.type(screen.getByLabelText(/units required/i), '2');
    await user.type(screen.getByLabelText(/contact number/i), '9123456789');
    await user.type(screen.getByLabelText(/^city/i), 'Mohali');
    await user.click(screen.getByRole('button', { name: /save request/i }));
  }

  it('saving a request updates the store, the list and localStorage; fulfilling removes it', async () => {
    const user = userEvent.setup();
    renderAt('#/request');
    await fillAndSave(user, 'Jane Tester');

    await waitFor(() => expect(store.getState().requests.items).toHaveLength(3));
    expect(store.getState().requests.items[0]).toMatchObject({ patient: 'Jane Tester', units: 2, city: 'Mohali' });
    expect(saved(KEYS.REQUESTS)[0].patient).toBe('Jane Tester');
    expect(await screen.findByRole('heading', { name: 'Jane Tester' })).toBeInTheDocument();

    const card = screen.getByRole('heading', { name: 'Jane Tester' }).closest('.card');
    await user.click(within(card).getByRole('button', { name: /mark fulfilled/i }));
    expect(screen.queryByRole('heading', { name: 'Jane Tester' })).not.toBeInTheDocument();
    expect(saved(KEYS.REQUESTS).map((r) => r.patient)).not.toContain('Jane Tester');
  });

  it('a saved request survives a simulated reload', async () => {
    const user = userEvent.setup();
    const first = renderAt('#/request');
    await fillAndSave(user, 'Reload Check');
    await waitFor(() => expect(saved(KEYS.REQUESTS)[0].patient).toBe('Reload Check'));
    first.unmount();
    detach();

    store = createAppStore();   // new store, same localStorage = page reload
    detach = attachPersistence(store);
    renderAt('#/request');
    expect(await screen.findByRole('heading', { name: 'Reload Check' })).toBeInTheDocument();
  });

  it('Request page and Dashboard read the same Redux state', async () => {
    renderAt('#/dashboard');
    expect(await screen.findByRole('button', { name: /remove request for ramesh kumar/i })).toBeInTheDocument();
    act(() => {
      store.dispatch(requestAdded({ patient: 'Another Patient', bloodGroup: 'AB-', hospital: 'H', units: 1, contact: '9123456789', city: 'C', urgency: 'Critical' }));
    });
    expect(screen.getByText('Another Patient')).toBeInTheDocument();
    expect(saved(KEYS.REQUESTS)[0].patient).toBe('Another Patient');
  });

  it('removing a request on the dashboard updates the store', async () => {
    const user = userEvent.setup();
    renderAt('#/dashboard');
    const btn = await screen.findByRole('button', { name: /remove request for ramesh kumar/i });
    await user.click(btn);
    expect(store.getState().requests.items.map((r) => r.patient)).not.toContain('Ramesh Kumar');
    expect(saved(KEYS.REQUESTS).map((r) => r.patient)).not.toContain('Ramesh Kumar');
  });
});

describe('honest demo messaging', () => {
  it('request page says requests are local and that nobody is notified', () => {
    renderAt('#/request');
    expect(document.body).toHaveTextContent(/stored locally in this browser/i);
    expect(document.body).toHaveTextContent(/nobody is notified/i);
    expect(document.body).not.toHaveTextContent(/will see this request immediately/i);
    expect(document.body).not.toHaveTextContent(/donors will be notified/i);
  });

  it('login and signup are labelled as demo authentication', () => {
    const { unmount } = renderAt('#/signup');
    expect(screen.getByRole('note')).toHaveTextContent(/plain text/i);
    unmount();
    renderAt('#/login');
    expect(screen.getByRole('note')).toHaveTextContent(/demo authentication only/i);
  });
});
