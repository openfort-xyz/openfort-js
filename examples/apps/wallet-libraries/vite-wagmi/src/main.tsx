import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import Openfort from '@openfort/openfort-js';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';
import Authenticate from './components/Authenticate.tsx';

const OPENFORT_PUBLISHABLE_KEY = 'pk_test_505bc088-905e-5a43-b60b-4c37ed1f887a';
const SHIELD_PUBLISHABLE_KEY = 'a4b75269-65e7-49c4-a600-6b5d9d6eec66';
const SHIELD_ENCRYPTION_PART = '/cC/ElEv1bCHxvbE/UUH+bLIf8nSLZOrxj8TkKChiY4=';

export const openfortInstance = new Openfort({
  baseConfiguration: {
    publishableKey: OPENFORT_PUBLISHABLE_KEY,
  },
  shieldConfiguration: {
    shieldPublishableKey: SHIELD_PUBLISHABLE_KEY,
    shieldEncryptionKey: SHIELD_ENCRYPTION_PART,
    debug: true,
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/authentication',
    element: <Authenticate openfortInstance={openfortInstance} />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
