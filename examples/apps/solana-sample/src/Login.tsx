import { useState } from "react"
import { openfort } from "./openfort"

export const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(true)

  return (
    <div className="text-white flex flex-col items-center gap-2">
      <h1
        className="text-2xl pb-2 font-bold"
        onClick={() => {
          setEmail(import.meta.env.VITE_TEST_EMAIL || "")
          setPassword(import.meta.env.VITE_TEST_PASSWORD || "")
        }}
      >
        {
          isLoggingIn
            ? "Log in"
            : "Sign up"
        }
      </h1>
      <div className="flex flex-col items-center justify-center gap-2 w-sm">
        <input
          className="w-full"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          className="w-full"
          onClick={async () => {
            if (isLoggingIn) {
              await openfort.logInWithEmailPassword({
                email,
                password
              })
              return
            } else {
              await openfort.signUpWithEmailPassword({
                email,
                password
              })
            }
          }}>
          {
            isLoggingIn
              ? "Log in"
              : "Sign up"
          }
        </button>
      </div>
      <div className="w-sm flex items-center justify-center gap-2 py-2">
        <div className="bg-gray-500 w-full h-[1px]" />
        <span className="opacity-50">
          or
        </span>
        <div className="bg-gray-500 w-full h-[1px]" />
      </div>
      <button
        className="w-full"
        onClick={async () => {
          setIsLoggingIn(!isLoggingIn)
        }}>
        {
          isLoggingIn
            ? "Sign up"
            : "Log in"
        }
      </button>
      <button
        className="w-full"
        onClick={() => openfort.signUpGuest()}
      >
        Login as guest
      </button>
    </div >
  )
}