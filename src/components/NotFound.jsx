import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div className="page not-found-page">
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>Oops! The page you're looking for doesn't exist.</p>
            <Link to="/" className="back-home-btn">
                ← Back to Home
            </Link>
        </div>
    );
}

export default NotFound;
