import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Nav } from './components/Nav'
import { FilterBuilder } from './pages/FilterBuilder'
import { LiveSession } from './pages/LiveSession'
import { FilterLibrary } from './pages/FilterLibrary'

function Shell() {
  const location = useLocation()
  const fullBleed = location.pathname === '/live'

  return (
    <div className="app-shell">
      <Nav />
      <main className={`app-main${fullBleed ? ' app-main--fullbleed' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/builder" replace />} />
          <Route path="/builder" element={<FilterBuilder />} />
          <Route path="/live" element={<LiveSession />} />
          <Route path="/library" element={<FilterLibrary />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
