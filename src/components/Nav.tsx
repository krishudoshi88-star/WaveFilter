import { NavLink } from 'react-router-dom'

export function Nav() {
  return (
    <nav className="app-nav">
      <div className="app-nav__brand">
        <span className="app-nav__logo" />
        WaveFilter
      </div>
      <div className="app-nav__links">
        <NavLink to="/builder" className={({ isActive }) => `app-nav__link${isActive ? ' active' : ''}`}>
          Filter Builder
        </NavLink>
        <NavLink to="/live" className={({ isActive }) => `app-nav__link${isActive ? ' active' : ''}`}>
          Live Session
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `app-nav__link${isActive ? ' active' : ''}`}>
          Filter Library
        </NavLink>
      </div>
    </nav>
  )
}
