# Practical 8: Performance Optimization and Lazy Loading in React

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO1 / PO3, PO5
* **Objective:** To improve frontend performance using lazy loading and code splitting techniques.

---

## 1. Architecture & Bundle Split Diagram

### Before Optimization (Single Monolithic Bundle)
All route components (`Home`, `Projects`, `Tasks`, `Contact`, `NotFound`) and libraries were compiled into a single JavaScript bundle loaded on initial page load:

```text
Initial Visit (/)
      │
      ▼
main.bundle.js (245.03 kB) ───► [NavBar] + [Footer] + [Home] + [Projects] + [Tasks] + [Contact] + [NotFound]
                                (All code downloaded upfront regardless of whether the user visits those routes)
```

### After Optimization (Code-Split with `React.lazy()` & `Suspense`)
Only the lightweight entry bundle and shell are downloaded initially. Route components are split into separate on-demand chunks loaded only when their route is accessed:

```text
Initial Visit (/)
      │
      ├──► index.js (4.02 kB)           ─── Shell (Router, NavBar, Footer, Suspense Fallback)
      ├──► vendor.js (227.29 kB)        ─── Shared libraries (React, ReactDOM, React Router) - Cached
      └──► Home.chunk.js (0.91 kB)      ─── Loaded on-demand for /

Navigation to /projects
      │
      ▼ (Suspense renders LoadingFallback UI while fetching chunk)
Projects.chunk.js (2.35 kB)             ─── Loaded only when /projects is visited

Navigation to /tasks
      │
      ▼ (Suspense renders LoadingFallback UI while fetching chunk)
Tasks.chunk.js (9.47 kB)                ─── Loaded only when /tasks is visited

Navigation to /contact
      │
      ▼ (Suspense renders LoadingFallback UI while fetching chunk)
Contact.chunk.js (2.32 kB)              ─── Loaded only when /contact is visited

Navigation to unmatched route (*)
      │
      ▼
NotFound.chunk.js (0.38 kB)             ─── Loaded only when 404 page is visited
```

---

## 2. Key Implementations

### A. Lazy Loading and Suspense Wrapper (`frontend/src/App.jsx`)
Route components are dynamically imported using `React.lazy()` and wrapped in `<Suspense fallback={<LoadingFallback />}>`:

```jsx
import { useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import LoadingFallback from './components/LoadingFallback';
import './App.css';

// Practical 8: Performance Optimization and Lazy Loading in React
// Route-based code splitting using React.lazy()
const Home = lazy(() => import('./components/Home'));
const Projects = lazy(() => import('./components/Projects'));
const Tasks = lazy(() => import('./components/Tasks'));
const Contact = lazy(() => import('./components/Contact'));
const NotFound = lazy(() => import('./components/NotFound'));

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className={darkMode ? 'app dark' : 'app'}>
      <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <main>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
```

---

### B. Meaningful Fallback UI (`frontend/src/components/LoadingFallback.jsx`)
Provides visual feedback during chunk fetching with dual-ring spinning animation, skeleton shimmer lines, and accessible attributes:

```jsx
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
```

---

### C. Build Optimization & Vendor Splitting (`frontend/vite.config.js`)
Configured Rollup chunking to separate third-party runtime libraries from application routes:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
```

---

## 3. Performance Measurement: Before vs After Optimization

### Bundle Size & Asset Distribution Comparison

| Metric / Asset | Before Optimization (Single Bundle) | After Optimization (Code-Split) | Difference / Improvement |
| :--- | :--- | :--- | :--- |
| **Total Initial JS Download** | `245.03 kB` (gzip: `77.83 kB`) | `4.02 kB` + `227.29 kB` vendor | App entry script dropped to **4.02 kB** |
| **Main Application Chunk** | `index-BHGAetHQ.js`: **245.03 kB** | `index-DMeLyJSF.js`: **4.02 kB** | **98.36% reduction** in app entry payload |
| **Vendor Chunk (Cached)** | Bundled inside main | `vendor-Dg7_Zw4k.js`: **227.29 kB** | Separated & cached across route navigations |
| **Home Route Chunk** | Embedded in initial bundle | `Home-1bQXT4qU.js`: **0.91 kB** | Loaded on `/` |
| **Projects Route Chunk** | Embedded in initial bundle | `Projects-D2grfQhn.js`: **2.35 kB** | Loaded on demand when `/projects` requested |
| **Tasks Route Chunk** | Embedded in initial bundle | `Tasks-DfBKpxic.js`: **9.47 kB** | Loaded on demand when `/tasks` requested |
| **Contact Route Chunk** | Embedded in initial bundle | `Contact-BlfdVTjy.js`: **2.32 kB** | Loaded on demand when `/contact` requested |
| **NotFound 404 Chunk** | Embedded in initial bundle | `NotFound-BV1hYKB9.js`: **0.38 kB** | Loaded on demand only on invalid URL |
| **Build Time** | `951 ms` | `180 ms` | **81% faster** incremental build |

---

### Browser Network & Load Time Profiling

| Performance Indicator | Before Optimization | After Optimization | Real-World Benefit |
| :--- | :--- | :--- | :--- |
| **First Contentful Paint (FCP)** | Slower (waited for full 245 kB bundle download & parse) | Faster (initial DOM + shell parse in <100ms) | Instant shell display |
| **Time to Interactive (TTI)** | Blocked by execution of unused routes (`Tasks`, `Projects`, etc.) | Only parses active route code | Low CPU lockup on initial landing |
| **Route Chunks Downloaded** | 100% upfront (wasteful on mobile / slow 3G networks) | Just-In-Time (0 kB transferred for unvisited pages) | Significant bandwidth savings |
| **Browser Cache Reuse** | Any edit to a component invalidates entire 245 kB bundle | App changes only invalidate small route chunks; `vendor.js` remains cached | Drastically reduced repeat visit transfer |

---

## 4. Verification & Testing

1. **Build Verification (`npm run build`)**: Confirmed creation of discrete chunk files for each lazy component.
2. **Linting Check (`npm run lint`)**: Oxlint passed with **0 errors and 0 warnings**.
3. **Browser Routing Verification**:
   - Navigated across `/`, `/projects`, `/tasks`, and `/contact`.
   - Verified `<Suspense>` fallback renders gracefully during network latency.
   - Checked browser console: confirmed zero JavaScript exceptions or unhandled promise rejections.
