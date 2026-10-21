import React from 'react';

/**
 * LoadingFallback Component
 * Displayed as a Suspense fallback while React.lazy() fetches route chunks.
 * Features an accessible status container, branded spinner, skeleton pulse,
 * and contextual metadata.
 */
function LoadingFallback({ message = 'Loading route component chunk...' }) {
    return (
        <div className="lazy-loading-container" role="status" aria-live="polite">
            <div className="lazy-loading-card">
                <div className="lazy-spinner-ring">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>
                <h3 className="lazy-loading-title">Loading Page Chunk</h3>
                <p className="lazy-loading-subtitle">{message}</p>
                <div className="lazy-skeleton-wrapper">
                    <div className="lazy-skeleton-line short"></div>
                    <div className="lazy-skeleton-line"></div>
                    <div className="lazy-skeleton-line medium"></div>
                </div>
                <div className="lazy-loading-badge">
                    ⚡ Code-Split Chunk • React.lazy & Suspense
                </div>
            </div>
        </div>
    );
}

export default LoadingFallback;
