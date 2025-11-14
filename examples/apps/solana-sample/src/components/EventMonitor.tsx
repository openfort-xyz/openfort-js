import { useEventMonitor } from '../contexts/EventMonitorContext'

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
      return 'text-green-400 bg-green-900/30'
    }
    if (eventName.includes('Failure') || eventName.includes('Cancel')) {
      return 'text-red-400 bg-red-900/30'
    }
    if (eventName.includes('Init') || eventName.includes('Open')) {
      return 'text-blue-400 bg-blue-900/30'
    }
    if (eventName.includes('Logout') || eventName.includes('Close')) {
      return 'text-gray-400 bg-gray-800/30'
    }
    return 'text-purple-400 bg-purple-900/30'
  }

  return (
    <div className="w-full max-w-4xl mt-6 bg-gray-800 rounded-lg border border-gray-600">
      <div className="flex items-center justify-between p-4 border-b border-gray-600">
        <div className="flex flex-col w-full">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Lightning bolt icon"
              >
                <title>Lightning bolt icon</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="font-semibold text-lg text-white">Event Monitor</h2>
              <span className="px-2 py-0.5 text-xs bg-blue-900/50 text-blue-200 rounded-full">{events.length}</span>
            </div>

            <button
              type="button"
              onClick={clearEvents}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Clear
            </button>
          </div>
          <a
            href="https://www.openfort.io/docs/products/embedded-wallet/javascript/events"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline text-xs mt-1"
          >
            View available events
          </a>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <svg
            className="h-12 w-12 mx-auto mb-2 opacity-20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Lightning bolt icon"
          >
            <title>Lightning bolt icon</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-sm">No events yet. Interact with the app to see events appear here.</p>
        </div>
      ) : (
        <div className="h-64 overflow-y-auto">
          {events.map((log) => (
            <div
              key={log.id}
              className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30 transition-colors"
            >
              <div className="p-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getEventColor(log.event)}`}>
                      {log.event}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(log.timestamp)}</span>
                  </div>
                  {log.payload && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                        View payload
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto text-gray-300 max-h-40">
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
