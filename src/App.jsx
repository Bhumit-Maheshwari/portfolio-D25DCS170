import Header from './components/Header';
import About from './components/About';
import Skills from './components/Skills';
import Footer from './components/Footer';

function App() {
  const mySkills = ['HTML', 'CSS', 'JavaScript', 'PHP', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'GitHub', 'Numpy', 'Pandas', 'Matplotlib', 'Seaborn', 'Scikit-learn', 'MongoDB'];

  return (
    <div>
      <Header name="Maheshwari Bhumit" />
      <About />
      <Skills skillList={mySkills} />
      <Footer />
    </div>
  );
}

export default App;
