import React, { useState } from "react";
import GoogleSignInButton from "./GoogleSignInButton";
import { useAuthentication } from "../../hooks/useAuthentication";
import Spinner from "../Shared/Spinner";

const LoginSignupForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp } = useAuthentication();
  const [loading, setLoading] = useState(false);
  const handleToggle = () => setIsLogin(!isLogin);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    event.preventDefault();
    if (isLogin) {
      // Assuming 'login' is provided for signing in
      await signIn(email, password).catch((error) => {
        console.error("Failed to sign in:", error);
        alert("Failed to sign in. Please try again.");
      });
      setLoading(false);
    } else {
      // Assuming 'register' is provided for signing up
      await signUp(email, password).catch((error) => {
        console.error("Failed to sign up:", error);
        alert("Failed to sign up. Please try again.");
      });
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-left mb-2 font-semibold text-xl">
        {isLogin ? "Sign In" : "Sign Up"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-200 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex space-x-5 justify-center p-2 bg-black text-white rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50"
        >
          {loading ? <Spinner /> : isLogin ? "Sign In" : "Sign Up"}
        </button>
        <GoogleSignInButton />
      </form>
      <button
        onClick={handleToggle}
        className="mt-4 text-indigo-600 hover:underline"
      >
        {isLogin ? "Need to create an account?" : "Already have an account?"}
      </button>
    </div>
  );
};

export default LoginSignupForm;
