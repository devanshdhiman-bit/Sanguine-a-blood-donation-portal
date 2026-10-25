/* ==========================================================================
   App.jsx — route table + layout for the React pages.

   CONCEPTS (React Router)
   • Layout route .......... <Route element={<Layout/>}> renders shared UI once and
                             an <Outlet/> where the matching child page appears
   • Nested routes ......... children inherit the layout; a pathless route can
                             wrap several children with a guard
   • Index redirect ........ <Navigate to="/request" replace/> for the bare URL
   • NavLink ............... adds aria-current="page" + an active class automatically
   • Route guard ........... GuestOnly bounces logged-in users to the dashboard
   • Wildcard route ........ path="*" is the 404 page
   • useLocation ........... scroll to top on every route change
   ========================================================================== */
import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Toaster from './components/Toaster.jsx';
import { useApp } from './context.jsx';
import { Login, Signup } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Request from './pages/Request.jsx';

/** Shared frame for every React page: a sub-navigation bar + the page + the toast area. */
function Layout() {
  const { user } = useApp();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]); // the browser doesn't do this for client-side navigation
  return (
    <>
      <nav className="app-subnav" aria-label="Requests and account">
        <div className="container">
          <NavLink to="/request">Request Blood</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          {!user && <NavLink to="/login">Log in</NavLink>}
          {!user && <NavLink to="/signup">Sign up</NavLink>}
        </div>
      </nav>
      <Outlet />
      <Toaster />
    </>
  );
}

/**
 * Pathless guard route: someone who is ALREADY logged in has no business on the
 * login / signup forms. The check happens once, on entry (useRef keeps the first
 * answer) — otherwise logging in would instantly yank the user away and skip the
 * welcome toast / the redirect that the form itself performs.
 */
function GuestOnly() {
  const { user } = useApp();
  const alreadyLoggedIn = useRef(!!user);
  return alreadyLoggedIn.current ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="auth-shell">
      <div className="container text-center">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <NavLink to="/request" className="btn btn-primary mt-lg">Back to requests</NavLink>
        <a href="index.html" className="btn btn-ghost mt-lg" style={{ marginLeft: '0.6rem' }}>Home</a>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/request" replace />} />
        <Route path="request" element={<Request />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
