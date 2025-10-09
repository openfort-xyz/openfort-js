import '../styles/tailwind.css'

import * as ToastPrimitive from '@radix-ui/react-toast'
import type { AppProps } from 'next/app'
import { OpenfortProvider } from '../hooks/useOpenfort'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <OpenfortProvider>
      <ToastPrimitive.Provider swipeDirection={'right'}>
        <Component {...pageProps} />
        <ToastPrimitive.Viewport />
      </ToastPrimitive.Provider>
    </OpenfortProvider>
  )
}

export default MyApp
