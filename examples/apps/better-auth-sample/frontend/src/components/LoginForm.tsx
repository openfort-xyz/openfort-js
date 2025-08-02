import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import { authenticateWithOpenfort, SetPage } from "../lib/openfortAuth";

export function LoginForm({ setPage }: SetPage) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Login to the wallet if coming from Social Login
  useEffect(() => {
    const isAlreadyAuthenticated = async () => {
      const url = new URL(window.location.href);
      const isAuthenticated = url.searchParams.get("authenticated");
      if (isAuthenticated) {
        try {
          authenticateWithOpenfort({ setPage });
        } catch (err) {
          alert("Openfort authentication failed: " + err);
        }
      }
    };
    isAlreadyAuthenticated();
  }, [setPage]);


  // Function to handle password login 
  async function passwordLogin() {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
      rememberMe: false,
    });
    if (error) {
      alert("Login failed: " + error.message);
      return;
    }
    try {
      authenticateWithOpenfort({ setPage });
    } catch (err) {
      alert("Openfort authentication failed: " + err);
    }
  }

  // Function to handle social login (Only google in this case)
  async function socialLogin() {
    try{
      await authClient.signIn.social({
        provider: "google",
        requestSignUp: true,
        callbackURL: window.location.origin + "?authenticated=true",
      });
    } catch (err) {
      alert("Login failed: " + err);
    }
  }

  // Render login form
  return (
    <div className="flex flex-col space-y-4 w-3/4">
      <input
        type="email"
        className="px-4 py-4 rounded-lg"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="px-4 py-4 rounded-lg"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button className="bg-[#FB6157] py-3 rounded-lg font-bold mt-8 hover:bg-white hover:text-[#242424]" onClick={passwordLogin}>Login</button>
      <div className="flex items-center opacity-40">
        <hr className="flex-grow border-t border-gray-300" />
        <span className="mx-2">or</span>
        <hr className="flex-grow border-t border-gray-300" />
      </div>
      <button className="py-3 rounded-lg font-bold mt-8 bg-white text-[#242424]" onClick={socialLogin}>Sign in with Google</button>
    </div>
  );
}
