/* ==========================================================================
   main.jsx — entry point of the (small) React app mounted by app.html.

   React is used ONLY for the four pages that benefit from it:
   login, signup, request and dashboard. Every other page is plain HTML/CSS/JS.

   CONCEPTS
   • ReactDOM.createRoot ... React 18 root API
   • HashRouter ............ routes live in the URL #fragment (app.html#/request),
                             so it works on any static host with no server rewrites
   • Redux <Provider> ...... makes the store available to useSelector/useDispatch
   • Context provider ...... AppProvider shares the session + toasts
   • Provider nesting ...... router outside, state inside
   The page CSS is linked from app.html (same files as every other page).
   ========================================================================== */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.jsx';
import { AppProvider } from './context.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <HashRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </HashRouter>
    </Provider>
  </React.StrictMode>
);
