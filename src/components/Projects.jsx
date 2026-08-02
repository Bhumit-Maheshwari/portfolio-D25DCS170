import { useState } from 'react';

const projectData = [
    {
        id: 1,
        title: 'Student Portfolio',
        description: 'A personal portfolio website built with React and Vite, featuring routing, state management, and responsive design.',
        tech: ['React', 'Vite', 'CSS'],
    },
    {
        id: 2,
        title: 'Weather Dashboard',
        description: 'A weather application that fetches real-time data from an API and displays forecasts with interactive charts.',
        tech: ['JavaScript', 'HTML', 'CSS'],
    },
    {
        id: 3,
        title: 'Task Manager',
        description: 'A full-stack task management app with user authentication, CRUD operations, and a clean UI.',
        tech: ['Node.js', 'MongoDB', 'React'],
    },
    {
        id: 4,
        title: 'E-Commerce Store',
        description: 'An online store with product listing, cart functionality, and payment integration.',
        tech: ['React', 'Node.js', 'SQL'],
    },
];

function Projects() {
    const [showDetails, setShowDetails] = useState(true);

    return (
        <div className="page projects-page">
            <h1>My Projects</h1>
            <p className="page-subtitle">A collection of projects I've worked on</p>

            <button
                className="toggle-btn"
                onClick={() => setShowDetails(!showDetails)}
            >
                {showDetails ? '🙈 Hide Descriptions' : '👁️ Show Descriptions'}
            </button>

            <div className="projects-grid">
                {projectData.map((project) => (
                    <div key={project.id} className="project-card">
                        <h3>{project.title}</h3>
                        {showDetails && (
                            <p className="project-desc">{project.description}</p>
                        )}
                        <div className="tech-tags">
                            {project.tech.map((t) => (
                                <span key={t} className="tag">{t}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Projects;
