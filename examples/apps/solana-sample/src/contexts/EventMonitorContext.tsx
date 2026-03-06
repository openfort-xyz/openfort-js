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

    // Store handler references so we only remove our own listeners on cleanup
    const onAuthInit = (payload: any) => addEvent('onAuthInit', payload)
    const onAuthSuccess = (payload: any) => addEvent('onAuthSuccess', payload)
    const onAuthFailure = (error: any) => addEvent('onAuthFailure', error)
    const onLogout = () => addEvent('onLogout')
    const onSwitchAccount = (address: any) => addEvent('onSwitchAccount', { address })
    const onSignedMessage = (payload: any) => addEvent('onSignedMessage', payload)
    const onWalletCreated = (wallet: any) => addEvent('onEmbeddedWalletCreated', wallet)
    const onWalletRecovered = (wallet: any) => addEvent('onEmbeddedWalletRecovered', wallet)

    openfortEvents.on(OpenfortEvents.ON_AUTH_INIT, onAuthInit)
    openfortEvents.on(OpenfortEvents.ON_AUTH_SUCCESS, onAuthSuccess)
    openfortEvents.on(OpenfortEvents.ON_AUTH_FAILURE, onAuthFailure)
    openfortEvents.on(OpenfortEvents.ON_LOGOUT, onLogout)
    openfortEvents.on(OpenfortEvents.ON_SWITCH_ACCOUNT, onSwitchAccount)
    openfortEvents.on(OpenfortEvents.ON_SIGNED_MESSAGE, onSignedMessage)
    openfortEvents.on(OpenfortEvents.ON_EMBEDDED_WALLET_CREATED, onWalletCreated)
    openfortEvents.on(OpenfortEvents.ON_EMBEDDED_WALLET_RECOVERED, onWalletRecovered)

    return () => {
      openfortEvents.off(OpenfortEvents.ON_AUTH_INIT, onAuthInit)
      openfortEvents.off(OpenfortEvents.ON_AUTH_SUCCESS, onAuthSuccess)
      openfortEvents.off(OpenfortEvents.ON_AUTH_FAILURE, onAuthFailure)
      openfortEvents.off(OpenfortEvents.ON_LOGOUT, onLogout)
      openfortEvents.off(OpenfortEvents.ON_SWITCH_ACCOUNT, onSwitchAccount)
      openfortEvents.off(OpenfortEvents.ON_SIGNED_MESSAGE, onSignedMessage)
      openfortEvents.off(OpenfortEvents.ON_EMBEDDED_WALLET_CREATED, onWalletCreated)
      openfortEvents.off(OpenfortEvents.ON_EMBEDDED_WALLET_RECOVERED, onWalletRecovered)
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
