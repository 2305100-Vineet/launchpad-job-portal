import { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    // No backend endpoint for this yet — placeholder confirmation only.
    setSent(true);
  };

  return (
    <>
      <Header />
      <div className="container" style={{ maxWidth: 640, paddingTop: 48 }}>
        <div className="section-title"><MessageSquare size={20} /><h2 style={{ margin: 0 }}>Contact Us</h2></div>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>
          Questions or feedback about Launchpad? Send a message below.
        </p>

        <div className="card" style={{ marginTop: 24 }}>
          {sent ? (
            <p className="success-text">Thanks — your message has been noted. We'll get back to you soon.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label><Mail size={14} /> Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea name="message" rows={5} value={form.message} onChange={handleChange} required />
              </div>
              <button type="submit"><Send size={15} /> Send Message</button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Contact;