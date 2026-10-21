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
