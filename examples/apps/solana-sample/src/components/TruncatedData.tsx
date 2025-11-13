import { useState } from 'react'
import { copyToClipboard } from '../utils/clipboard'

interface TruncatedDataProps {
  data: string
  maxLength?: number
  label?: string
  className?: string
}

export default function TruncatedData({ data, maxLength = 20, label, className = '' }: TruncatedDataProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(data)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const truncated = data.length > maxLength ? `${data.slice(0, maxLength / 2)}...${data.slice(-maxLength / 2)}` : data

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-gray-400 text-sm">{label}:</span>}
      <code className="font-mono text-sm bg-gray-700 px-2 py-1 rounded">{truncated}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="p-1 hover:bg-gray-700 rounded transition-colors"
        title={copied ? 'Copied!' : 'Copy to clipboard'}
      >
        {copied ? (
          <svg
            className="w-4 h-4 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Copied checkmark"
          >
            <title>Copied checkmark</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Copy to clipboard"
          >
            <title>Copy to clipboard</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
