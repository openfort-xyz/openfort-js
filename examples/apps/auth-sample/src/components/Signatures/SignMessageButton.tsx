import React, { useState } from "react";
import { useOpenfort } from "../../hooks/useOpenfort";
import { EmbeddedState } from "@openfort/openfort-js";
import Spinner from "../Shared/Spinner";
import { useAuth } from "../../contexts/AuthContext";

const SignMessageButton: React.FC = () => {
  const { signMessage, embeddedState, error } = useOpenfort();
  const { idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const handleSignMessage = async () => {
    if (!idToken) {
      console.error("The Openfort integration isn't ready.");
      return;
    }
    try {
      setLoading(true);
      const signature = await signMessage("Hello World!");
      setLoading(false);
      if (!signature) {
        throw new Error("Failed to sign message");
      }
      setSignature(signature);
    } catch (err) {
      // Handle errors from minting process
      console.error("Failed to sign message:", err);
      alert("Failed to sign message. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={handleSignMessage}
        disabled={embeddedState !== EmbeddedState.READY}
        className={`mt-2 w-44 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Spinner /> : "Sign Message"}
      </button>
      {signature && (
        <p className="flex max-w-sm mt-2 overflow-auto">{signature}</p>
      )}
      {error && (
        <p className="mt-2 text-red-500">{`Error: ${error.message}`}</p>
      )}
    </div>
  );
};

export default SignMessageButton;
