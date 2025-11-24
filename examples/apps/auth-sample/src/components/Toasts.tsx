import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/20/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { clsx } from 'clsx'
import { LoadingIcon } from './Loading'

export type StatusType = {
  type: 'loading' | 'success' | 'information' | 'error'
  title?: string
  description?: string
} | null

interface InformationToastProps {
  status: StatusType | null
  setStatus: (status: StatusType | null) => void
}

export const InformationToast: React.FC<InformationToastProps> = ({ status, setStatus }) => {
  return (
    <ToastPrimitive.Root
      open={status !== null}
      onOpenChange={() => setStatus(null)}
      className={clsx(
        'fixed inset-x-4 bottom-4 z-50 w-auto rounded-lg shadow-lg md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-full md:max-w-xs',
        'bg-white dark:bg-gray-800',
        'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
        'radix-state-closed:animate-toast-hide',
        'radix-swipe-direction-right:radix-swipe-end:animate-toast-swipe-out-x',
        'radix-swipe-direction-right:translate-x-radix-toast-swipe-move-x',
        'radix-swipe-direction-down:radix-swipe-end:animate-toast-swipe-out-y',
        'radix-swipe-direction-down:translate-y-radix-toast-swipe-move-y',
        'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-in-out',
        'focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75'
      )}
    >
      <div className="flex">
        <div className="flex w-0 flex-1 items-center py-4 pl-5">
          {status && (
            <div className="radix w-full">
              <ToastPrimitive.Title className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {status.title}
              </ToastPrimitive.Title>
              <ToastPrimitive.Description asChild>
                <pre className='className="m-0 text-sm text-gray-700 bg-gray-100 p-2 rounded-lg dark:text-gray-400 whitespace-pre-wrap max-w-full break-all'>
                  {status.description}
                </pre>
              </ToastPrimitive.Description>
            </div>
          )}
        </div>
        <div className="flex">
          <div className="flex flex-col space-y-1 px-3 py-2">
            {/* <div className="flex h-0 flex-1">
              <ToastPrimitive.Action
                altText="view now"
                className="flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-purple-600 hover:bg-gray-50 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:text-purple-500 dark:hover:bg-gray-900"
                onClick={(e) => {
                  e.preventDefault()
                  window.open('https://github.com')
                }}
              >
                Review
              </ToastPrimitive.Action>
            </div> */}
            <div className="flex h-0 flex-1">
              <ToastPrimitive.Close className="flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:text-gray-100 dark:hover:bg-gray-900">
                Dismiss
              </ToastPrimitive.Close>
            </div>
          </div>
        </div>
      </div>
    </ToastPrimitive.Root>
  )
}

interface LoadingToastProps {
  status: StatusType | null
  setStatus: (status: StatusType | null) => void
}

export const LoadingToast: React.FC<LoadingToastProps> = ({ status, setStatus: _setStatus }) => {
  return (
    <ToastPrimitive.Root
      duration={20000}
      open={status !== null}
      className={clsx(
        'fixed inset-x-4 bottom-4 z-50 w-auto rounded-lg shadow-lg md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-full md:max-w-xs',
        'bg-white dark:bg-gray-800',
        'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
        'radix-state-closed:animate-toast-hide',
        'radix-swipe-direction-right:radix-swipe-end:animate-toast-swipe-out-x',
        'radix-swipe-direction-right:translate-x-radix-toast-swipe-move-x',
        'radix-swipe-direction-down:radix-swipe-end:animate-toast-swipe-out-y',
        'radix-swipe-direction-down:translate-y-radix-toast-swipe-move-y',
        'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-in-out',
        'focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75'
      )}
    >
      <div className="flex">
        <div className="flex w-0 flex-1 items-center py-4 pl-5">
          <LoadingIcon className="mr-2 h-7 w-7 animate-spin stroke-zinc-200 text-zinc-600" />

          {status && (
            <div className="radix w-full">
              <ToastPrimitive.Title className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {status.title}
              </ToastPrimitive.Title>
            </div>
          )}
        </div>
      </div>
    </ToastPrimitive.Root>
  )
}

interface SuccessToastProps {
  status: StatusType | null
  setStatus: (status: StatusType | null) => void
  action?: () => void // Assuming action is a function, if not, replace with the appropriate type
  actionText?: string // Assuming actionText is a string
}

export const SuccessToast: React.FC<SuccessToastProps> = ({ status, setStatus, action, actionText }) => {
  return (
    <ToastPrimitive.Root
      open={status !== null}
      onOpenChange={() => setStatus(null)}
      className={clsx(
        'fixed inset-x-4 bottom-4 z-50 w-auto rounded-lg shadow-lg md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-full md:max-w-xs',
        'bg-white dark:bg-gray-800',
        'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
        'radix-state-closed:animate-toast-hide',
        'radix-swipe-direction-right:radix-swipe-end:animate-toast-swipe-out-x',
        'radix-swipe-direction-right:translate-x-radix-toast-swipe-move-x',
        'radix-swipe-direction-down:radix-swipe-end:animate-toast-swipe-out-y',
        'radix-swipe-direction-down:translate-y-radix-toast-swipe-move-y',
        'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-in-out',
        'focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75'
      )}
    >
      <div className="flex">
        <div className="flex w-0 flex-1 items-center py-4 pl-5">
          <CheckBadgeIcon className="mr-2 h-7 w-7 fill-green-500 text-white" aria-hidden="true" />
          {status && (
            <div className="radix w-full">
              <ToastPrimitive.Title className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {status.title}
              </ToastPrimitive.Title>
              {status.description && (
                <ToastPrimitive.Description asChild>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-400">{status.description}</div>
                </ToastPrimitive.Description>
              )}
            </div>
          )}
        </div>
        <div className="flex">
          <div className="flex flex-col space-y-1 px-3 py-2">
            {action && actionText && (
              <div className="flex h-0 flex-1">
                <ToastPrimitive.Action
                  altText="view now"
                  className="flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-purple-600 hover:bg-gray-50 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:text-purple-500 dark:hover:bg-gray-900"
                  onClick={(e) => {
                    e.preventDefault()
                    action()
                  }}
                >
                  {actionText}
                </ToastPrimitive.Action>
              </div>
            )}
            <div className="flex h-0 flex-1">
              <ToastPrimitive.Close className="flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:text-gray-100 dark:hover:bg-gray-900">
                <XMarkIcon className="h-4 w-4" />
              </ToastPrimitive.Close>
            </div>
          </div>
        </div>
      </div>
    </ToastPrimitive.Root>
  )
}

interface ErrorToastProps {
  status: StatusType | null
  setStatus: (status: StatusType | null) => void
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ status, setStatus }) => {
  return (
    <ToastPrimitive.Root
      open={status !== null}
      onOpenChange={() => setStatus(null)}
      className={clsx(
        'fixed inset-x-4 bottom-4 z-50 w-auto rounded-lg shadow-lg md:bottom-auto md:left-auto md:right-4 md:top-4 md:w-full md:max-w-xs',
        'bg-white dark:bg-gray-800',
        'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
        'radix-state-closed:animate-toast-hide',
        'radix-swipe-direction-right:radix-swipe-end:animate-toast-swipe-out-x',
        'radix-swipe-direction-right:translate-x-radix-toast-swipe-move-x',
        'radix-swipe-direction-down:radix-swipe-end:animate-toast-swipe-out-y',
        'radix-swipe-direction-down:translate-y-radix-toast-swipe-move-y',
        'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-in-out',
        'focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75'
      )}
    >
      <div className="flex">
        <div className="flex w-0 flex-1 items-center py-4 pl-5">
          <XCircleIcon className="mr-2 h-7 w-7 fill-red-500 text-white" aria-hidden="true" />
          {status && (
            <div className="radix w-full">
              <ToastPrimitive.Title className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {status.title}
              </ToastPrimitive.Title>
              {status.description && (
                <ToastPrimitive.Description asChild>
                  <div className="mt-1 text-sm text-gray-700 dark:text-gray-400">{status.description}</div>
                </ToastPrimitive.Description>
              )}
            </div>
          )}
        </div>
        <div className="flex">
          <div className="flex flex-col space-y-1 px-3 py-2">
            {/* <div className="flex h-0 flex-1">
              <ToastPrimitive.Action
                altText="view now"
                className="flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-purple-600 hover:bg-gray-50 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:text-purple-500 dark:hover:bg-gray-900"
                onClick={(e) => {
                  e.preventDefault()
                  window.open('https://github.com')
                }}
              >
                Review
              </ToastPrimitive.Action>
            </div> */}
            <div className="flex h-0 flex-1">
              <ToastPrimitive.Close className="flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75 dark:text-gray-100 dark:hover:bg-gray-900">
                <XMarkIcon className="h-4 w-4" />
              </ToastPrimitive.Close>
            </div>
          </div>
        </div>
      </div>
    </ToastPrimitive.Root>
  )
}

interface ToastProps {
  status: StatusType | null
  setStatus: (status: StatusType | null) => void
  action?: () => void // Assuming action is a function, if not, replace with the appropriate type
  actionText?: string // Assuming actionText is a string
}

export const Toast: React.FC<ToastProps> = ({ status, setStatus, action, actionText }) => {
  if (status === null) return null
  else if (status.type === 'loading') return <LoadingToast status={status} setStatus={setStatus} />
  else if (status.type === 'success')
    return <SuccessToast status={status} setStatus={setStatus} action={action} actionText={actionText} />
  else if (status.type === 'information') return <InformationToast status={status} setStatus={setStatus} />
  else if (status.type === 'error') return <ErrorToast status={status} setStatus={setStatus} />
  else return null
}
