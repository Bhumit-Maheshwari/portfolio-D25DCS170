function Skills({ skillList }) {
    return (
        <section>
            <h2>Skills</h2>
            <ul>
                {skillList.map((s) => (
                    <li key={s}>{s}</li>
                ))}
            </ul>
        </section>
    );
}

export default Skills;
