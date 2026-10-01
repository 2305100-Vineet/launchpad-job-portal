import { Link, useNavigate } from 'react-router-dom';
import { Rocket, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = user?.role === 'student' ? '/student-dashboard' : '/recruiter-dashboard';

  return (
    <div className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-name" style={{ color: '#fff', textDecoration: 'none' }}>
          <Rocket size={20} /> Launchpad
        </Link>

        <nav className="site-nav">
          <Link to="/">Home</Link>
          <Link to="/contact">Contact</Link>
        </nav>

        <div className="site-nav-actions">
          {user ? (
            <>
              <button className="secondary" onClick={() => navigate(dashboardPath)}>
                <LayoutDashboard size={15} /> Dashboard
              </button>
              <button className="ghost" onClick={handleLogout}>
                <LogOut size={15} /> Logout
              </button>
            </>
          ) : (
            <>
              <button className="ghost" onClick={() => navigate('/login')}>Login</button>
              <button onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;