import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Rocket, LogOut, UserCircle, Search, Briefcase, ClipboardList, MapPin,
  GraduationCap, FileText, Inbox, Trash2, Camera, Settings,
  Star, Award, Clock3, ExternalLink, Link2, AlertCircle, CheckCircle2, XCircle, Eye
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { fileUrl } from '../config';
import JobDetailsModal from '../components/JobDetailsModal';

const CITY_OPTIONS = [
  'Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad',
  'Chennai', 'Kolkata', 'Gurugram', 'Noida', 'Ahmedabad', 'Remote'
];
const CTC_OPTIONS = [
  { label: 'Any CTC', value: '' },
  { label: '3+ LPA', value: '3' },
  { label: '5+ LPA', value: '5' },
  { label: '8+ LPA', value: '8' },
  { label: '10+ LPA', value: '10' },
  { label: '15+ LPA', value: '15' },
];

function statusIcon(status) {
  switch (status) {
    case 'selected': return <CheckCircle2 size={12} />;
    case 'rejected': return <XCircle size={12} />;
    case 'shortlisted': return <Star size={12} />;
    case 'under_review': return <Eye size={12} />;
    default: return <Clock3 size={12} />;
  }
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton" style={{ height: '18px', width: '55%', marginBottom: '10px' }} />
      <div className="skeleton" style={{ height: '12px', width: '35%', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '10px', width: '90%', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '10px', width: '70%' }} />
    </div>
  );
}

function SettingsMenu({ onMyProfile, onDeleteAccount, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: '14px', textAlign: 'left', color: 'var(--text, #1a1a2e)'
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="ghost" onClick={() => setOpen(o => !o)} title="Settings">
        <Settings size={15} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          background: '#fff', border: '1px solid var(--border)', borderRadius: '8px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)', minWidth: '190px', zIndex: 30, overflow: 'hidden'
        }}>
          <button style={itemStyle} onClick={() => { setOpen(false); onMyProfile(); }}>
            <UserCircle size={15} /> My Profile
          </button>
          <button style={{ ...itemStyle, color: 'var(--danger-text)' }} onClick={() => { setOpen(false); onDeleteAccount(); }}>
            <Trash2 size={15} /> Delete Account
          </button>
          <button style={itemStyle} onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [stats, setStats] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false });
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchStats = () => {
    api.get('/applications/my-stats').then(res => setStats(res.data)).catch(() => {});
  };

  useEffect(() => { fetchStats(); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleDeleteAccount = () => {
    setConfirmState({
      open: true,
      title: 'Delete Account',
      message: 'Are you sure you want to permanently delete your account? This cannot be undone.',
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState({ open: false });
        try {
          await api.delete('/auth/delete-account');
          logout();
          navigate('/login');
        } catch (err) {
          showToast('Failed to delete account. Please try again.', 'error');
        }
      },
    });
  };

  const handleHeaderPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      showToast('Only JPG/PNG files are allowed', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await api.post('/auth/upload-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
    } catch (err) {
      showToast('Failed to upload photo', 'error');
    }
  };

  return (
    <>
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        danger={confirmState.danger}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />
      <div className="brand-bar">
        <div className="brand-bar-inner">
          <Link to="/" className="brand-name" style={{ color: '#fff', textDecoration: 'none' }}>
            <Rocket size={20} /> Launchpad <span className="brand-tag">Student</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ cursor: 'pointer' }} title="Change photo">
              <input type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleHeaderPhotoUpload} />
              {user?.photo ? (
                <img src={`${fileUrl(user.photo)}`} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircle size={22} color="#fff" />
                </div>
              )}
            </label>
            <SettingsMenu
              onMyProfile={() => setActiveTab('profile')}
              onDeleteAccount={handleDeleteAccount}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h2>Welcome, {user?.name}</h2>
            <span className="role-tag">Student Dashboard</span>
          </div>
        </div>

        {stats && (
          <div className="stat-strip">
            <div className="stat-box">
              <div className="stat-icon-badge" style={{ background: 'var(--coral-tint)', color: 'var(--coral-dark)' }}><ClipboardList size={18} /></div>
              <div className="num">{stats.total}</div><div className="lbl">Total Applications</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-badge" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}><Star size={18} /></div>
              <div className="num">{stats.shortlisted}</div><div className="lbl">Shortlisted</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-badge" style={{ background: 'var(--success-bg)', color: 'var(--success-text)' }}><Award size={18} /></div>
              <div className="num">{stats.selected}</div><div className="lbl">Selected</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-badge" style={{ background: 'var(--warn-bg)', color: 'var(--warn-text)' }}><Clock3 size={18} /></div>
              <div className="num">{stats.pending}</div><div className="lbl">Pending</div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><UserCircle size={16} /> My Profile</button>
          <button className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}><Search size={16} /> Browse Jobs</button>
          <button className={`tab-button ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}><ClipboardList size={16} /> My Applications</button>
        </div>

        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'jobs' && <JobsSection onApplied={fetchStats} />}
        {activeTab === 'applications' && <ApplicationsSection />}
      </div>
    </>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ education: '', skills: '', certifications: '', resume_link: '', resume_file: '', github_link: '', preferred_location: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const [pendingPhotoRemoval, setPendingPhotoRemoval] = useState(false);
  const [pendingResumeRemoval, setPendingResumeRemoval] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile/me');
      setProfile(res.data);
      setHasProfile(true);
      setIsEditing(false);
    } catch (err) {
      setHasProfile(false);
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const displayedPhoto = pendingPhotoRemoval ? null : user?.photo;
  const displayedResumeFile = pendingResumeRemoval ? '' : profile.resume_file;

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!displayedResumeFile || !displayedPhoto) {
      setShowValidation(true);
      setMessage('Please upload both your resume and photo before saving your profile.');
      return;
    }

    setShowValidation(false);
    try {
      let finalProfile = profile;

      if (pendingPhotoRemoval) {
        const res = await api.delete('/auth/remove-photo');
        updateUser(res.data.user);
        setPendingPhotoRemoval(false);
      }

      if (pendingResumeRemoval) {
        await api.delete('/profile/remove-resume');
        finalProfile = { ...profile, resume_file: '' };
        setProfile(finalProfile);
        setPendingResumeRemoval(false);
      }

      await api.put('/profile/me', finalProfile);
      setMessage('Profile saved successfully');
      setHasProfile(true);
      setIsEditing(false);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to save profile');
    }
  };

  const handleCancel = () => {
    setPendingPhotoRemoval(false);
    setPendingResumeRemoval(false);
    setShowValidation(false);
    setMessage('');
    setIsEditing(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setMessage('Only PDF files are allowed for resume');
      return;
    }
    const formData = new FormData();
    formData.append('resume', file);
    setUploadingResume(true);
    setMessage('');
    try {
      const res = await api.post('/profile/upload-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile({ ...profile, resume_file: res.data.resume_file });
      setPendingResumeRemoval(false);
      setMessage('Resume uploaded successfully');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleRemoveResume = () => {
    setPendingResumeRemoval(true);
    setMessage('Resume will be removed when you save');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setMessage('Only JPG/PNG files are allowed for photo');
      return;
    }
    const formData = new FormData();
    formData.append('photo', file);
    setUploadingPhoto(true);
    setMessage('');
    try {
      const res = await api.post('/auth/upload-photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
      setPendingPhotoRemoval(false);
      setMessage('Photo uploaded successfully');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPendingPhotoRemoval(true);
    setMessage('Photo will be removed when you save');
  };

  if (loading) return <p>Loading profile...</p>;

  if (hasProfile && !isEditing) {
    return (
      <div>
        <div className="section-title"><GraduationCap size={20} /><h3 style={{ margin: 0 }}>My Profile</h3></div>
        <div className="card" style={{ marginTop: '18px' }}>
          <div className="profile-view-card">
            <div className="profile-avatar-col">
              {user?.photo ? (
                <img src={`${fileUrl(user.photo)}`} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--paper)', boxShadow: '0 0 0 1px var(--border)' }} />
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#EDEBE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircle size={50} color="var(--muted)" />
                </div>
              )}
            </div>
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <div className="pi-label"><GraduationCap size={13} /> Education</div>
                <div className="pi-value">{profile.education || 'Not provided'}</div>
              </div>
              <div className="profile-info-item">
                <div className="pi-label"><MapPin size={13} /> Preferred Location</div>
                <div className="pi-value">{profile.preferred_location || 'Not set'}</div>
              </div>
              <div className="profile-info-item" style={{ gridColumn: '1 / -1' }}>
                <div className="pi-label">Skills</div>
                {profile.skills ? (
                  <div className="chip-row" style={{ marginTop: 4 }}>
                    {profile.skills.split(',').map(s => s.trim()).filter(Boolean).map((s, i) => <span key={i} className="chip">{s}</span>)}
                  </div>
                ) : <div className="pi-value">Not provided</div>}
              </div>
              <div className="profile-info-item" style={{ gridColumn: '1 / -1' }}>
                <div className="pi-label">Certifications</div>
                <div className="pi-value">{profile.certifications || 'Not provided'}</div>
              </div>
            </div>
          </div>

          <div className="link-pill-row">
            {profile.resume_file && (
              <a className="link-pill" href={`${fileUrl(profile.resume_file)}`} target="_blank" rel="noopener noreferrer">
                <FileText size={14} /> View Resume
              </a>
            )}
            {profile.resume_link && (
              <a className="link-pill" href={profile.resume_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Resume Link
              </a>
            )}
            {profile.github_link && (
              <a className="link-pill" href={profile.github_link} target="_blank" rel="noopener noreferrer">
                <Link2 size={14} /> GitHub
              </a>
            )}
          </div>

          <button onClick={() => setIsEditing(true)} style={{ marginTop: '20px' }}>Edit Profile</button>
        </div>
      </div>
    );
  }

  const missingResume = showValidation && !displayedResumeFile;
  const missingPhoto = showValidation && !displayedPhoto;

  return (
    <div>
      <div className="section-title"><GraduationCap size={20} /><h3 style={{ margin: 0 }}>My Profile</h3></div>
      <form onSubmit={handleSave} className="card" style={{ marginTop: '18px' }}>

        <div className="form-group" style={missingPhoto ? { border: '1.5px solid var(--danger-text)', borderRadius: '8px', padding: '10px' } : {}}>
          <label>Passport Size Photo <span style={{ color: 'var(--danger-text)' }}>*</span></label>
          <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
          {uploadingPhoto && <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>Uploading...</p>}
          {displayedPhoto && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={`${fileUrl(displayedPhoto)}`} alt="Profile" style={{ width: '90px', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
              <button type="button" className="danger" onClick={handleRemovePhoto} style={{ padding: '6px 12px' }}>✕ Remove</button>
            </div>
          )}
          {pendingPhotoRemoval && <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>Photo will be removed when you save</p>}
          {missingPhoto && <p className="error-text" style={{ marginTop: '6px' }}>Photo is required</p>}
        </div>

        <div className="form-group" style={missingResume ? { border: '1.5px solid var(--danger-text)', borderRadius: '8px', padding: '10px', marginTop: '16px' } : { marginTop: '16px' }}>
          <label>Upload Resume (PDF) <span style={{ color: 'var(--danger-text)' }}>*</span></label>
          <input type="file" accept="application/pdf" onChange={handleResumeUpload} disabled={uploadingResume} />
          {uploadingResume && <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>Uploading...</p>}
          {displayedResumeFile && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a href={`${fileUrl(displayedResumeFile)}`} target="_blank" rel="noopener noreferrer">View Uploaded Resume</a>
              <button type="button" className="danger" onClick={handleRemoveResume} style={{ padding: '4px 10px', fontSize: '12px' }}>✕ Remove</button>
            </div>
          )}
          {pendingResumeRemoval && <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>Resume will be removed when you save</p>}
          {missingResume && <p className="error-text" style={{ marginTop: '6px' }}>Resume is required</p>}
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label>Education</label>
          <input type="text" name="education" value={profile.education || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Skills</label>
          <textarea name="skills" value={profile.skills || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Certifications</label>
          <textarea name="certifications" value={profile.certifications || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Preferred Job Location</label>
          <select name="preferred_location" value={profile.preferred_location || ''} onChange={handleChange}>
            <option value="">No preference</option>
            {CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Resume Link (optional, e.g. Google Drive/LinkedIn)</label>
          <input type="text" name="resume_link" value={profile.resume_link || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>GitHub Link (optional)</label>
          <input type="text" name="github_link" value={profile.github_link || ''} onChange={handleChange} placeholder="https://github.com/yourusername" />
        </div>

        {message && <p className={showValidation ? 'error-text' : 'success-text'}>{message}</p>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit">Save Profile</button>
          {hasProfile && <button type="button" className="secondary" onClick={handleCancel}>Cancel</button>}
        </div>
      </form>
    </div>
  );
}

function JobsSection({ onApplied }) {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [sortByMatch, setSortByMatch] = useState(false);
  const [minCtc, setMinCtc] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchJobs(); }, [sortByMatch, minCtc]);

  const fetchJobs = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = { ...params };
      if (sortByMatch) queryParams.sort = 'match';
      if (minCtc) queryParams.min_ctc = minCtc;
      const res = await api.get('/jobs', { params: queryParams });
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (jobType) params.job_type = jobType;
    fetchJobs(params);
  };

  const handleApply = async (jobId) => {
    try {
      await api.post(`/applications/${jobId}`);
      showToast('Applied successfully!', 'success');
      setSelectedJob(null);
      onApplied?.();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to apply', 'error');
    }
  };

  const formatCtc = (min, max) => {
    if (!min && !max) return null;
    if (min && max) return `₹${min}–${max} LPA`;
    return `₹${min || max} LPA`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    return new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} onApply={handleApply} />
      <div className="section-title"><Briefcase size={20} /><h3 style={{ margin: 0 }}>Browse Jobs</h3></div>
      <form onSubmit={handleSearch} className="search-bar" style={{ marginTop: '18px' }}>
        <div className="search-wrap">
          <Search size={16} />
          <input type="text" placeholder="Search by title, company, skills..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
          <option value="">All Types</option>
          <option value="full-time">Full-time</option>
          <option value="internship">Internship</option>
          <option value="part-time">Part-time</option>
        </select>
        <select value={minCtc} onChange={(e) => setMinCtc(e.target.value)}>
          {CTC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '14px', cursor: 'pointer' }}>
        <input type="checkbox" checked={sortByMatch} onChange={(e) => setSortByMatch(e.target.checked)} />
        Sort by Best Match
      </label>

      {loading ? (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state"><Inbox size={32} /> No jobs found. Try a different search.</div>
      ) : (
        jobs.map((job) => {
          const skills = job.required_skills ? job.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [];
          const ctc = formatCtc(job.ctc_min, job.ctc_max);
          const deadlineText = formatDeadline(job.deadline);
          return (
            <div key={job.id} className="card">
              <div className="card-top">
                <div>
                  <h4>{job.title}</h4>
                  <div className="company">{job.company_name}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {typeof job.match_score === 'number' && (
                    <div className="match-score-wrap">
                      <span className="badge">{job.match_score}% Match</span>
                      <div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${job.match_score}%` }} /></div>
                    </div>
                  )}
                  <span className="type-pill">{job.job_type}</span>
                </div>
              </div>
              <p className="card-desc-clamp">{job.description}</p>
              <div className="meta-row">
                <span><MapPin size={13} /> {job.location || 'N/A'}{job.location_match ? ' (Preferred)' : ''}</span>
                <span><GraduationCap size={13} /> {job.eligibility || 'Open'}</span>
                {ctc && <span>{ctc}</span>}
                {deadlineText && <span>Apply by {deadlineText}</span>}
              </div>
              {skills.length > 0 && (
                <div className="chip-row">
                  {skills.map((s, i) => <span key={i} className="chip">{s}</span>)}
                </div>
              )}
              {job.missing_skills?.length > 0 && (
                <div className="missing-skills-note">
                  <AlertCircle size={13} /> Missing: {job.missing_skills.join(', ')}
                </div>
              )}
              <div className="card-actions" style={{ marginTop: '10px' }}>
                <button className="secondary" onClick={() => setSelectedJob(job)}><Eye size={15} /> View Details</button>
                <button onClick={() => handleApply(job.id)}>Apply Now</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ApplicationsSection() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications/my-applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="section-title"><ClipboardList size={20} /><h3 style={{ margin: 0 }}>My Applications</h3></div>
      <div style={{ marginTop: '18px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state"><FileText size={32} /> You haven't applied to any jobs yet.</div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="card">
              <div className="card-top">
                <div>
                  <h4>{app.title}</h4>
                  <div className="company">{app.company_name}</div>
                </div>
                <span className={`badge ${app.status}`}>{statusIcon(app.status)} {app.status.replace('_', ' ')}</span>
              </div>
              <div className="meta-row">
                <span><MapPin size={13} /> {app.location || 'N/A'}</span>
                <span>{app.job_type}</span>
                <span>Applied {new Date(app.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;