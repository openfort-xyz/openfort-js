import '../styles/tailwind.css';

import type {AppProps} from 'next/app';
import * as ToastPrimitive from '@radix-ui/react-toast';
import {OpenfortProvider} from '../hooks/useOpenfort';

function MyApp({Component, pageProps}: AppProps) {
  return (
    <OpenfortProvider>
      <ToastPrimitive.Provider swipeDirection={'right'}>
        <Component {...pageProps} />
        <ToastPrimitive.Viewport />
      </ToastPrimitive.Provider>
    </OpenfortProvider>
  );
}

export default MyApp;
