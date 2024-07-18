import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import Openfort from '@openfort/openfort-js';
import {Navigate, RouterProvider, createBrowserRouter} from 'react-router-dom';
import Authenticate from './components/Authenticate.tsx';

const OPENFORT_PUBLISHABLE_KEY = 'pk_test_505bc088-905e-5a43-b60b-4c37ed1f887a';
const SHIELD_PUBLISHABLE_KEY = 'a4b75269-65e7-49c4-a600-6b5d9d6eec66';

export const openfortInstance = new Openfort({
  baseConfiguration: {
    publishableKey: OPENFORT_PUBLISHABLE_KEY,
  },
  shieldConfiguration: {
    shieldPublishableKey: SHIELD_PUBLISHABLE_KEY,
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/redirect',
    element: <Authenticate openfortInstance={openfortInstance} />,
  },
  {
    path: '/logout',
    element: <Navigate to="/" replace />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
