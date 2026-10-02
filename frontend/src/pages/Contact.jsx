import { Mail, MessageSquare } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Change this to the public address you want visitors to use
const CONTACT_EMAIL = 'vineetjha0909@gmail.com';

function Contact() {
  const subject = encodeURIComponent('Launchpad enquiry');

  return (
    <>
      <Header />
      <div className="container" style={{ maxWidth: 640, paddingTop: 48 }}>
        <div className="section-title"><MessageSquare size={20} /><h2 style={{ margin: 0 }}>Contact Us</h2></div>
        <p style={{ color: 'var(--muted)', marginTop: 6 }}>
          Questions or feedback about Launchpad? Send us an email and we'll reply as soon as we can.
        </p>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="pi-label"><Mail size={13} /> Email</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '6px 0 16px', wordBreak: 'break-all' }}>{CONTACT_EMAIL}</p>
          <div className="link-pill-row" style={{ marginTop: 0 }}>
            <a className="link-pill" href={`mailto:${CONTACT_EMAIL}?subject=${subject}`}>
              <Mail size={14} /> Send an email
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Contact;