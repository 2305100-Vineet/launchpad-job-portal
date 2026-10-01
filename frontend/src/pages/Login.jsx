import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Rocket, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      login(user, token);
      navigate(user.role === 'student' ? '/student-dashboard' : '/recruiter-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div>
        <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}><Rocket size={26} strokeWidth={2.4} /> Launchpad</Link>
        <div className="auth-container">
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Log in to continue</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label><Mail size={14} /> Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Password</label>
              <div className="password-field-wrap">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="error-text"><AlertCircle size={14} /> {error}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--muted)' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p style={{ marginTop: '10px', fontSize: '14px', color: 'var(--muted)' }}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;