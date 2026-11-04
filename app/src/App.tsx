import { useEffect, useState } from 'react'
import { Dashboard } from './pages/Dashboard'
import { AiDeck } from './pages/AiDeck'
import { Deck } from './pages/Deck'
import { Landing } from './pages/Landing'
import { Placeholder } from './pages/Placeholder'

function useHashRoute() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.replace(/^#\/?/, '').split('/')[0]
}

export default function App() {
  const route = useHashRoute()
  switch (route) {
    case 'dashboard':
      return <Dashboard />
    case 'deck-analisis':
      return <Deck />
    case 'deck-ia':
      return <AiDeck />
    case 'sheets':
      return <Placeholder title="Análisis en Google Sheets" />
    default:
      return <Landing />
  }
}
