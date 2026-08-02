import { useState } from 'react';

function Contact() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const maxChars = 500;

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        // Reset after 3 seconds
        setTimeout(() => {
            setSubmitted(false);
            setName('');
            setEmail('');
            setMessage('');
        }, 3000);
    };

    return (
        <div className="page contact-page">
            <h1>Contact Me</h1>
            <p className="page-subtitle">Feel free to reach out — I'd love to hear from you!</p>

            <button
                className="toggle-btn help-btn"
                onClick={() => setShowHelp(!showHelp)}
            >
                {showHelp ? '✕ Close Help' : '❓ Need Help?'}
            </button>

            {showHelp && (
                <div className="help-tooltip">
                    <p>💡 <strong>Tip:</strong> Fill out all fields and click Submit. Your message will be displayed in real time as you type. Maximum {maxChars} characters for the message.</p>
                </div>
            )}

            {submitted ? (
                <div className="success-message">
                    <h2>✅ Message Sent!</h2>
                    <p>Thank you, <strong>{name}</strong>! I'll get back to you soon.</p>
                </div>
            ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="message">Message</label>
                        <textarea
                            id="message"
                            placeholder="Write your message here..."
                            value={message}
                            onChange={(e) => {
                                if (e.target.value.length <= maxChars) {
                                    setMessage(e.target.value);
                                }
                            }}
                            rows="5"
                            required
                        />
                        <div className={`char-count ${message.length >= maxChars ? 'limit' : ''}`}>
                            {message.length} / {maxChars} characters
                        </div>
                    </div>

                    <button type="submit" className="submit-btn">
                        🚀 Send Message
                    </button>
                </form>
            )}

            {message && !submitted && (
                <div className="live-preview">
                    <h3>📝 Live Preview</h3>
                    <p>{message}</p>
                </div>
            )}
        </div>
    );
}

export default Contact;
