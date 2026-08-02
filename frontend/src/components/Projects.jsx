import { useState, useEffect } from 'react';

function Projects() {
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [showDetails, setShowDetails] = useState(true);

    const fetchRepos = () => {
        setLoading(true);
        setError(null);

        fetch('https://api.github.com/users/Bhumit-Maheshwari/repos')
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to fetch repositories (HTTP ' + res.status + ')');
                }
                return res.json();
            })
            .then((data) => setRepos(data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchRepos();
    }, []);

    const filteredRepos = repos.filter((repo) =>
        repo.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <Spinner />;
    if (error) return <ErrorMessage message={error} onRetry={fetchRepos} />;

    return (
        <div className="page projects-page">
            <h1>My Projects</h1>
            <p className="page-subtitle">Repositories fetched from GitHub</p>

            <div className="projects-controls">
                <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 Search repositories..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button
                    className="toggle-btn"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? '🙈 Hide Details' : '👁️ Show Details'}
                </button>
            </div>

            {filteredRepos.length === 0 ? (
                <p className="no-results">No repositories match "{search}"</p>
            ) : (
                <div className="projects-grid">
                    {filteredRepos.map((repo) => (
                        <div key={repo.id} className="project-card">
                            <div className="card-header">
                                <h3>{repo.name}</h3>
                                <span className="star-count">⭐ {repo.stargazers_count}</span>
                            </div>
                            {showDetails && repo.description && (
                                <p className="project-desc">{repo.description}</p>
                            )}
                            {showDetails && (
                                <div className="card-meta">
                                    {repo.language && <span className="tag">{repo.language}</span>}
                                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="repo-link">
                                        View on GitHub →
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Spinner() {
    return (
        <div className="page spinner-container">
            <div className="spinner"></div>
            <p>Loading repositories...</p>
        </div>
    );
}

function ErrorMessage({ message, onRetry }) {
    return (
        <div className="page error-container">
            <h2>⚠️ Something went wrong</h2>
            <p>{message}</p>
            <button className="retry-btn" onClick={onRetry}>
                🔄 Retry
            </button>
        </div>
    );
}

export default Projects;
