import React, { useState } from "react";
import { useOpenfort } from "../../hooks/useOpenfort";
import { EmbeddedState } from "@openfort/openfort-js";
import Spinner from "../Shared/Spinner";
import { useAuth } from "../../contexts/AuthContext";

const SignTypedDataButton: React.FC = () => {
  const { signTypedData, embeddedState, error } = useOpenfort();
  const { idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const handleSignTypedData = async () => {
    if (!idToken) {
      console.error("The Openfort integration isn't ready.");
      return;
    }
    try {
      setLoading(true);
      const domain = {
        name: "Openfort",
        version: "0.5",
        chainId: 80002,
        verifyingContract: "0x9b5AB198e042fCF795E4a0Fa4269764A4E8037D2",
      };
      const types = {
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "content", type: "string" },
        ],
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
      };
      const data = {
        from: {
          name: "Alice",
          wallet: "0x2111111111111111111111111111111111111111",
        },
        to: {
          name: "Bob",
          wallet: "0x3111111111111111111111111111111111111111",
        },
        content: "Hello!",
      };
      const signature = await signTypedData(domain, types, data);
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
        onClick={handleSignTypedData}
        disabled={embeddedState !== EmbeddedState.READY}
        className={`mt-2 w-52 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Spinner /> : "Sign Typed Message"}
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

export default SignTypedDataButton;
