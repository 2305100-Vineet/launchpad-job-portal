import { useNavigate } from 'react-router-dom';
import { Search, Target, BarChart3, ShieldCheck, UserPlus, FileEdit, Send, Briefcase, Users2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goToStart = () => {
    if (user) {
      navigate(user.role === 'student' ? '/student-dashboard' : '/recruiter-dashboard');
    } else {
      navigate('/register');
    }
  };

  const features = [
    { icon: Target, title: 'Smart Skill Matching', text: 'Rule-based match scoring compares your skills against every job\'s requirements — transparent, explainable, no black box.' },
    { icon: BarChart3, title: 'Real-Time Tracking', text: 'Track every application\'s status live, from Applied to Selected, with instant email updates when things change.' },
    { icon: ShieldCheck, title: 'Built for Both Sides', text: 'Students browse and apply with confidence; recruiters manage postings and applicants with clear, sortable analytics.' },
  ];

  const studentSteps = [
    { icon: UserPlus, text: 'Create your profile with skills, education & resume' },
    { icon: Search, text: 'Browse jobs, sorted by your best match' },
    { icon: Send, text: 'Apply and track your status in real time' },
  ];

  const recruiterSteps = [
    { icon: FileEdit, text: 'Post a job with required skills & CTC' },
    { icon: Users2, text: 'Review applicants ranked by match score' },
    { icon: Briefcase, text: 'Update statuses — candidates get notified automatically' },
  ];

  

  return (
    <>
      <Header />

      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-inner">
          <span className="hero-eyebrow">STUDENT &amp; RECRUITER PLATFORM</span>
          <h1>Find the right fit, faster.</h1>
          <p className="hero-subtitle">
            Launchpad connects students with internships and jobs that actually match their skills —
            and gives recruiters a clear, ranked view of who to talk to first.
          </p>
          <div className="hero-actions">
            <button onClick={goToStart} style={{ padding: '13px 26px', fontSize: '15px' }}>
              {user ? 'Go to Dashboard' : 'Get Started'} <ArrowRight size={16} />
            </button>
                        {!user && (
              <button className="secondary" onClick={() => navigate('/login')} style={{ padding: '13px 26px', fontSize: '15px' }}>
                Log In
              </button>
            )}
          </div>
        </div>
      </section>


      <section className="container">
        <div className="feature-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon"><f.icon size={22} /></div>
              <h4>{f.title}</h4>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: 6 }}>How it works</h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 36 }}>Two sides of the same platform.</p>

          <div className="hiw-columns">
            <div className="hiw-col">
              <span className="hiw-label">For Students</span>
              {studentSteps.map((s, i) => (
                <div key={i} className="hiw-step">
                  <div className="hiw-step-icon"><s.icon size={18} /></div>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
            <div className="hiw-col">
              <span className="hiw-label">For Recruiters</span>
              {recruiterSteps.map((s, i) => (
                <div key={i} className="hiw-step">
                  <div className="hiw-step-icon"><s.icon size={18} /></div>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

export default Home;