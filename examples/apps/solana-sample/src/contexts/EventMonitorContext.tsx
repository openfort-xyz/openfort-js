import { OpenfortEvents, openfortEvents } from '@openfort/openfort-js'
import { createContext, useContext, useEffect, useState } from 'react'

export type EventLog = {
  id: string
  event: string
  timestamp: Date
  payload?: any
}

type EventMonitorContextType = {
  events: EventLog[]
  clearEvents: () => void
}

const EventMonitorContext = createContext<EventMonitorContextType | undefined>(undefined)

export function EventMonitorProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EventLog[]>([])

  useEffect(() => {
    const addEvent = (eventName: string, payload?: any) => {
      const eventLog: EventLog = {
        id: `${Date.now()}-${Math.random()}`,
        event: eventName,
        timestamp: new Date(),
        payload,
      }
      setEvents((prev) => [eventLog, ...prev].slice(0, 100)) // Keep last 100 events
    }

    // Subscribe to all Openfort events
    openfortEvents.on(OpenfortEvents.ON_AUTH_INIT, (payload) => addEvent('onAuthInit', payload))
    openfortEvents.on(OpenfortEvents.ON_AUTH_SUCCESS, (payload) => addEvent('onAuthSuccess', payload))
    openfortEvents.on(OpenfortEvents.ON_AUTH_FAILURE, (error) => addEvent('onAuthFailure', error))
    openfortEvents.on(OpenfortEvents.ON_LOGOUT, () => addEvent('onLogout'))
    openfortEvents.on(OpenfortEvents.ON_SWITCH_ACCOUNT, (address) => addEvent('onSwitchAccount', { address }))
    openfortEvents.on(OpenfortEvents.ON_SIGNED_MESSAGE, (payload) => addEvent('onSignedMessage', payload))
    openfortEvents.on(OpenfortEvents.ON_EMBEDDED_WALLET_CREATED, (wallet) =>
      addEvent('onEmbeddedWalletCreated', wallet)
    )
    openfortEvents.on(OpenfortEvents.ON_EMBEDDED_WALLET_RECOVERED, (wallet) =>
      addEvent('onEmbeddedWalletRecovered', wallet)
    )

    // Cleanup function to remove all listeners
    return () => {
      openfortEvents.removeAllListeners(OpenfortEvents.ON_AUTH_INIT)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_AUTH_SUCCESS)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_AUTH_FAILURE)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_LOGOUT)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_SWITCH_ACCOUNT)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_SIGNED_MESSAGE)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_EMBEDDED_WALLET_CREATED)
      openfortEvents.removeAllListeners(OpenfortEvents.ON_EMBEDDED_WALLET_RECOVERED)
    }
  }, [])

  const clearEvents = () => {
    setEvents([])
  }

  return <EventMonitorContext.Provider value={{ events, clearEvents }}>{children}</EventMonitorContext.Provider>
}

export function useEventMonitor() {
  const context = useContext(EventMonitorContext)
  if (context === undefined) {
    throw new Error('useEventMonitor must be used within an EventMonitorProvider')
  }
  return context
}
