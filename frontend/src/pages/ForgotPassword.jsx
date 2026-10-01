import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rocket, Mail, KeyRound, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('OTP sent! Check your email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div>
        <Link to="/" className="auth-brand" style={{ textDecoration: 'none' }}><Rocket size={26} strokeWidth={2.4} /> Launchpad</Link>
        <div className="auth-container">
          {step === 1 ? (
            <>
              <h2>Forgot Password</h2>
              <p className="auth-subtitle">Enter your email to receive an OTP</p>
              <form onSubmit={handleRequestOtp}>
                <div className="form-group">
                  <label><Mail size={14} /> Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {error && <p className="error-text"><AlertCircle size={14} /> {error}</p>}
                {success && <p className="success-text"><CheckCircle2 size={14} /> {success}</p>}
                <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Reset Password</h2>
              <p className="auth-subtitle">Enter the OTP sent to {email}</p>
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label><KeyRound size={14} /> OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
                </div>
                <div className="form-group">
                  <label><Lock size={14} /> New Password</label>
                  <div className="password-field-wrap">
                    <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && <p className="error-text"><AlertCircle size={14} /> {error}</p>}
                {success && <p className="success-text"><CheckCircle2 size={14} /> {success}</p>}
                <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
          <p style={{ marginTop: '18px', fontSize: '14px', color: 'var(--muted)' }}>
            Remembered your password? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;