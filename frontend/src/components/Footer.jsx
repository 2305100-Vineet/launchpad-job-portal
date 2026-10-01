import { Link } from 'react-router-dom';
import { Rocket, Link2, Mail } from 'lucide-react';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-col footer-brand-col">
          <span className="brand-name" style={{ color: '#fff' }}><Rocket size={18} /> Launchpad</span>
                    <p>Connecting students with the right opportunities and recruiters with the right candidates, through transparent, skill-based matching.</p>
        </div>

        <div className="footer-col">
          <h5>Platform</h5>
          <Link to="/">Home</Link>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
        </div>

        <div className="footer-col">
          <h5>Support</h5>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-col">
          <h5>Connect</h5>
          <div className="footer-social">
            <a href="#" aria-label="GitHub"><Link2 size={17} /></a>
            <a href="mailto:contact@launchpad.dev" aria-label="Email"><Mail size={17} /></a>
          </div>
        </div>
      </div>
            <div className="footer-bottom">
        © {new Date().getFullYear()} Launchpad. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;