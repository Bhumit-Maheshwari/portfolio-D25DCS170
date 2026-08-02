import Header from './Header';
import About from './About';
import Skills from './Skills';

function Home() {
    const mySkills = [
        'HTML', 'CSS', 'JavaScript', 'PHP', 'React',
        'Node.js', 'Python', 'SQL', 'Git', 'GitHub',
        'Numpy', 'Pandas', 'Matplotlib', 'Seaborn',
        'Scikit-learn', 'MongoDB'
    ];

    return (
        <div className="page home-page">
            <Header name="Maheshwari Bhumit" />
            <About />
            <Skills skillList={mySkills} />
        </div>
    );
}

export default Home;
