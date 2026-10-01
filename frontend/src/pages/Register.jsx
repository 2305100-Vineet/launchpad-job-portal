import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Rocket, User, Mail, Lock, GraduationCap, Briefcase, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleRoleSelect = (role) => setFormData({ ...formData, role });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/register', formData);
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div>
        <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}><Rocket size={26} strokeWidth={2.4} /> Launchpad</Link>
        <div className="auth-container">
          <h2>Create your account</h2>
          <p className="auth-subtitle">Join as a student or recruiter</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>I am a</label>
              <div className="role-select-row">
                <div
                  className={`role-option ${formData.role === 'student' ? 'active' : ''}`}
                  onClick={() => handleRoleSelect('student')}
                >
                  <GraduationCap size={20} />
                  <span className="role-option-label">Student</span>
                </div>
                <div
                  className={`role-option ${formData.role === 'recruiter' ? 'active' : ''}`}
                  onClick={() => handleRoleSelect('recruiter')}
                >
                  <Briefcase size={20} />
                  <span className="role-option-label">Recruiter</span>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label><User size={14} /> Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><Mail size={14} /> Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label><Lock size={14} /> Password</label>
              <div className="password-field-wrap">
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required minLength={6} />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="error-text"><AlertCircle size={14} /> {error}</p>}
            {success && <p className="success-text"><CheckCircle2 size={14} /> {success}</p>}
            <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <p style={{ marginTop: '18px', fontSize: '14px', color: 'var(--muted)' }}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;