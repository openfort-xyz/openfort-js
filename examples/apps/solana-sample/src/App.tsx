import openfort from './assets/openfort.svg'
import solana from './assets/solanaLogo.svg'
import { Content } from './content'

function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="fixed w-full flex items-center justify-center h-20 text-2xl text-white bg-gray-800">
        <img src={openfort} alt="Openfort" className="h-8 mr-2" />
        Openfort
        <span className="text-gray-400 mx-4">+</span>
        <img src={solana} alt="Solana" className="h-5" />
      </header>
      <div className="flex items-center justify-center h-screen">
        <Content />
      </div>
    </div>
  )
}

export default App
