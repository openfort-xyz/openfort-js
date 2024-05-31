import React, { useState } from "react";
import { useOpenfort } from "../../hooks/useOpenfort";
import { EmbeddedState } from "@openfort/openfort-js";
import Spinner from "../Shared/Spinner";
import { useAuth } from "../../contexts/AuthContext";

const MintNFTButton: React.FC = () => {
  const { mintNFT, embeddedState, error } = useOpenfort();
  const { idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const handleMintNFT = async () => {
    if (!idToken) {
      console.error("The Openfort integration isn't ready.");
      return;
    }
    try {
      setLoading(true);
      const transactionHash = await mintNFT(idToken);
      setLoading(false);
      if (!transactionHash) {
        throw new Error("Failed to mint NFT");
      }
      setTransactionHash(`https://www.oklink.com/amoy/tx/${transactionHash}`);
    } catch (err) {
      // Handle errors from minting process
      console.error("Failed to mint NFT:", err);
      alert("Failed to mint NFT. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <button
        onClick={handleMintNFT}
        disabled={embeddedState !== EmbeddedState.READY}
        className={`mt-4 w-32 px-4 py-2 bg-black text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50`}
      >
        {loading ? <Spinner /> : "Mint NFT"}
      </button>
      {transactionHash && (
        <a
          className="text-blue-500 hover:underline mt-2 truncate max-w-sm"
          href={transactionHash}
          target="_blank"
          rel="noreferrer noopener"
        >
          {transactionHash}
        </a>
      )}
      {error && (
        <p className="mt-2 text-red-500">{`Error: ${error.message}`}</p>
      )}
    </div>
  );
};

export default MintNFTButton;
