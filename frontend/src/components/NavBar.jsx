import { Link, useLocation } from 'react-router-dom';

function NavBar({ darkMode, toggleDarkMode }) {
    const location = useLocation();

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <Link to="/">📁 Portfolio</Link>
            </div>
            <ul className="nav-links">
                <li>
                    <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                        Home
                    </Link>
                </li>
                <li>
                    <Link to="/projects" className={location.pathname === '/projects' ? 'active' : ''}>
                        Projects
                    </Link>
                </li>
                <li>
                    <Link to="/contact" className={location.pathname === '/contact' ? 'active' : ''}>
                        Contact
                    </Link>
                </li>
            </ul>
            <button className="theme-toggle" onClick={toggleDarkMode} title="Toggle dark/light mode">
                {darkMode ? '☀️' : '🌙'}
            </button>
        </nav>
    );
}

export default NavBar;
