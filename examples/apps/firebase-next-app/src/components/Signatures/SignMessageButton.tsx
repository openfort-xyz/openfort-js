import React, { useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import Spinner from "../Shared/Spinner";

const SignMessageButton: React.FC<{
  handleSetMessage: (message: string) => void;
}> = ({ handleSetMessage }) => {
  const { data, signMessage, error, isPending } = useSignMessage()
  const {  isConnected } = useAccount();
  useEffect(() => {
    if(data) {
      handleSetMessage(data)
    }
  }, [data])
  return (
    <div>
      <form
        className='flex-col flex space-y-2'
        onSubmit={(event) => {
          event.preventDefault()
          const formData = new FormData(event.target as HTMLFormElement)
          signMessage({ message: formData.get('message') as string })
        }}
      >
        <input  name="message" className="p-2 border border-gray-200"/>
        <button 
          disabled={isPending || !isConnected}
          type="submit"
          className={`w-full px-4 py-1 bg-white text-black font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:bg-gray-400 disabled:cursor-not-allowed`}>
          {isPending ? <Spinner />: "Sign Message"}
          </button>
        <p className="mt-2 text-red-500">{error?.message}</p>
      </form>
    </div>
  );
};

export default SignMessageButton;
