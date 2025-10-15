import '../styles/tailwind.css'

import * as ToastPrimitive from '@radix-ui/react-toast'
import type { AppProps } from 'next/app'
import { EventMonitorProvider } from '../contexts/EventMonitorContext'
import { OpenfortProvider } from '../contexts/OpenfortContext'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <OpenfortProvider>
      <EventMonitorProvider>
        <ToastPrimitive.Provider swipeDirection={'right'}>
          <Component {...pageProps} />
          <ToastPrimitive.Viewport />
        </ToastPrimitive.Provider>
      </EventMonitorProvider>
    </OpenfortProvider>
  )
}

export default MyApp
