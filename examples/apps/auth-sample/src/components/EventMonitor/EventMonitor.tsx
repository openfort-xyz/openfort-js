import { Activity } from 'lucide-react'
import { useEventMonitor } from '../../contexts/EventMonitorContext'
import { Button } from '../ui/button'

export default function EventMonitor() {
  const { events, clearEvents } = useEventMonitor()

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getEventColor = (eventName: string) => {
    if (eventName.includes('Success') || eventName.includes('Created') || eventName.includes('Recovered')) {
      return 'text-green-600 bg-green-50'
    }
    if (eventName.includes('Failure') || eventName.includes('Cancel')) {
      return 'text-red-600 bg-red-50'
    }
    if (eventName.includes('Init') || eventName.includes('Open')) {
      return 'text-blue-600 bg-blue-50'
    }
    if (eventName.includes('Logout') || eventName.includes('Close')) {
      return 'text-gray-600 bg-gray-50'
    }
    return 'text-purple-600 bg-purple-50'
  }

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <div className='flex flex-col w-full'>
          <div className='flex w-full'>
            <div className="flex-1 flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <h2 className="font-semibold text-lg">Event Monitor</h2>
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">{events.length}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={clearEvents} className="h-8 text-xs">
              Clear
            </Button>
          </div>
          <a
            href="https://www.openfort.io/docs/products/embedded-wallet/javascript"
            className="text-blue-600 hover:underline text-xs"
          >
            View available events
          </a>
         </div>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <Activity className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No events yet. Interact with the app to see events appear here.</p>
        </div>
      ) : (
        <div className="h-64 overflow-y-auto">
          {events.map((log) => (
            <div key={log.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
              <div className="p-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getEventColor(log.event)}`}>
                      {log.event}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                  </div>
                  {log.payload && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View payload
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
