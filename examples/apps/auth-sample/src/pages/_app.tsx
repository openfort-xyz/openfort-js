import '../styles/tailwind.css';

import type {AppProps} from 'next/app';
import * as ToastPrimitive from '@radix-ui/react-toast';

function MyApp({Component, pageProps}: AppProps) {
  return (
    <ToastPrimitive.Provider swipeDirection={'right'}>
      <Component {...pageProps} />
      <ToastPrimitive.Viewport />
    </ToastPrimitive.Provider>
  );
}

export default MyApp;
