import React, { useEffect } from "react";
import { useOpenfort } from "../../hooks/useOpenfort";
import { EmbeddedState } from "@openfort/openfort-js";
import Spinner from "../Shared/Spinner";
import { useAuth } from "../../contexts/AuthContext";
import { useAccount, useSignTypedData } from "wagmi";
import { baseSepolia } from "viem/chains";

const SignTypedDataButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({ handleSetMessage }) => {
  const { embeddedState } = useOpenfort();
  const { address, isConnected } = useAccount();
  const { signTypedData, data, isPending, error  } = useSignTypedData();
  const handleSignTypedData = async () => {
    try {
      const domain = {
        name: "Openfort",
        version: "0.5",
        chainId: baseSepolia.id,
        verifyingContract: address,
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
      const message = {
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
      signTypedData({
        domain, types, message,
        primaryType: "Mail"
      });
    } catch (err) {
      // Handle errors from minting process
      console.error("Failed to sign message:", err);
      alert("Failed to sign message. Please try again.");
    }
  };

  useEffect(() => {
    if (data) {
      handleSetMessage(data);
    }
  }, [data]);

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={handleSignTypedData}
        disabled={embeddedState !== EmbeddedState.READY || !isConnected}
        className={`w-full px-4 py-1 bg-white text-black font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:bg-gray-400 disabled:cursor-not-allowed`}
      >
        {isPending ? <Spinner /> : "Sign Typed Message"}
      </button>
      <p className="mt-2 text-red-500">{error?.message}</p>
    </div>
  );
};

export default SignTypedDataButton;
