import React from "react";
import { useAuthentication } from "../../hooks/useAuthentication";

const GoogleSignInButton: React.FC = () => {
  const { signInWithGoogle } = useAuthentication();

  return (
    <button
      onClick={signInWithGoogle}
      className="w-full p-2 border border-gray-300 rounded hover:bg-gray-100 text-black focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50"
    >
      Continue with Google
    </button>
  );
};

export default GoogleSignInButton;
