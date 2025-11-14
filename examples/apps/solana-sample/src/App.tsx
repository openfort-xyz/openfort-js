import openfort from './assets/openfort.svg'
import solana from './assets/solanaLogo.svg'
import { Content } from './content'

function App() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-16 md:h-20 text-lg md:text-2xl text-white bg-gray-800 shadow-lg px-4">
        <img src={openfort} alt="Openfort" className="h-6 md:h-8 mr-2" />
        <span className="text-gray-400 mx-2 md:mx-4">-</span>
        <img src={solana} alt="Solana" className="h-4 md:h-5" />
      </header>
      <div className="pt-16 md:pt-20 px-4 pb-8">
        <div className="container mx-auto max-w-7xl">
          <Content />
        </div>
      </div>
    </div>
  )
}

export default App
