import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import DailyView from './pages/DailyView'
import Trends from './pages/Trends'
import './index.css'

function Navigation() {
  const location = useLocation()
  
  return (
    <nav className="main-nav">
      <Link 
        to="/" 
        className={location.pathname === '/' ? 'active' : ''}
      >
        Dashboard
      </Link>
      <Link 
        to="/calendar" 
        className={location.pathname.startsWith('/calendar') || location.pathname.startsWith('/day') ? 'active' : ''}
      >
        Calendar
      </Link>
      <Link 
        to="/trends" 
        className={location.pathname.startsWith('/trends') ? 'active' : ''}
      >
        Trends
      </Link>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <h1>Spata</h1>
          <p>A Spotify Analytics Platform</p>
        </header>

        <Navigation />

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/day/:date" element={<DailyView />} />
          <Route path="/trends" element={<Trends />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
