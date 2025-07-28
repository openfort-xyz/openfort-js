import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { SetPage } from "../lib/openfortAuth";

export function SignupForm({ setPage }: SetPage) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Better auth singup function
  async function handleSignup() {
    await authClient.signUp.email(
      {
        email,
        password,
        name,
        // callbackURL: "/",
      },
      {
        onRequest: () => console.log("Signing up..."),
        onSuccess: () => {
          alert("Signup successful!")
          setPage("login");
        },
        onError: ctx => alert("Signup failed: " + ctx.error.message),
      }
    );
  }

  // Render signup form
  return (
    <div className="flex flex-col space-y-4 w-3/4">
      <input placeholder="Name" className="px-4 py-4 rounded-lg" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Email" className="px-4 py-4 rounded-lg" value={email} onChange={e => setEmail(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        className="px-4 py-4 rounded-lg"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button className="bg-[#FB6157] py-3 rounded-lg font-bold mt-8 hover:bg-white hover:text-[#242424]" onClick={handleSignup}>Sign Up</button>
    </div>
  );
}
