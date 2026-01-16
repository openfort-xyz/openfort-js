import type { NextPage } from 'next'
import dynamic from 'next/dynamic'
import Spinner from '../components/Shared/Spinner'

// Dynamic import with SSR disabled - wagmi hooks require client-side context
const HomePageContent = dynamic(() => import('../components/HomePage/HomePageContent'), {
  ssr: false,
  loading: () => (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <Spinner />
    </div>
  ),
})

const HomePage: NextPage = () => {
  return <HomePageContent />
}

export default HomePage
