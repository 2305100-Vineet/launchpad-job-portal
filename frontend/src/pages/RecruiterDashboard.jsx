import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Rocket, LogOut, Briefcase, PlusCircle, MapPin, Users, Trash2, UserCircle, X, Settings, BarChart3, Pencil } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { fileUrl } from '../config';

const CITY_OPTIONS = [
  'Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad',
  'Chennai', 'Kolkata', 'Gurugram', 'Noida', 'Ahmedabad', 'Remote'
];

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

function SettingsMenu({ onDeleteAccount, onLogout }) {
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

function RecruiterDashboard() {
  const [activeTab, setActiveTab] = useState('myjobs');
  const [stats, setStats] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false });
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const fetchStats = () => {
    api.get('/jobs/my-stats').then(res => setStats(res.data)).catch(() => {});
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
            <Rocket size={20} /> Launchpad <span className="brand-tag">Recruiter</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ cursor: 'pointer' }} title="Change photo (optional)">
              <input type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleHeaderPhotoUpload} />
              {user?.photo ? (
                <img src={`${fileUrl(user.photo)}`} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircle size={22} color="#fff" />
                </div>
              )}
            </label>
            <SettingsMenu onDeleteAccount={handleDeleteAccount} onLogout={handleLogout} />
          </div>
        </div>
      </div>
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h2>Welcome, {user?.name}</h2>
            <span className="role-tag">Recruiter Dashboard</span>
          </div>
        </div>

        {stats && (
          <div className="stat-strip">
            <div className="stat-box">
              <div className="stat-icon-badge" style={{ background: 'var(--coral-tint)', color: 'var(--coral-dark)' }}><Briefcase size={18} /></div>
              <div className="num">{stats.total_jobs}</div><div className="lbl">Jobs Posted</div>
            </div>
            <div className="stat-box">
              <div className="stat-icon-badge" style={{ background: 'var(--info-bg)', color: 'var(--info-text)' }}><Users size={18} /></div>
              <div className="num">{stats.total_applicants}</div><div className="lbl">Total Applicants</div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button className={`tab-button ${activeTab === 'myjobs' ? 'active' : ''}`} onClick={() => setActiveTab('myjobs')}><Briefcase size={16} /> My Job Postings</button>
          <button className={`tab-button ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}><PlusCircle size={16} /> Post New Job</button>
        </div>

        {activeTab === 'myjobs' && <MyJobsSection onChange={fetchStats} />}
        {activeTab === 'post' && <PostJobSection onPosted={() => { fetchStats(); setActiveTab('myjobs'); }} />}
      </div>
    </>
  );
}

function PostJobSection({ onPosted }) {
  const [formData, setFormData] = useState({
    title: '', description: '', company_name: '', location: '',
    job_type: 'full-time', required_skills: '', eligibility: '',
    ctc_min: '', ctc_max: '', deadline: '',
  });
  const [message, setMessage] = useState('');
  const [ctcError, setCtcError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setCtcError('');

    if (formData.ctc_min && formData.ctc_max && Number(formData.ctc_min) > Number(formData.ctc_max)) {
      setCtcError('Minimum CTC cannot be greater than maximum CTC');
      return;
    }

    try {
      await api.post('/jobs', {
        ...formData,
        ctc_min: formData.ctc_min ? Number(formData.ctc_min) : null,
        ctc_max: formData.ctc_max ? Number(formData.ctc_max) : null,
        deadline: formData.deadline || null,
      });
      setMessage('Job posted successfully!');
      setFormData({ title: '', description: '', company_name: '', location: '', job_type: 'full-time', required_skills: '', eligibility: '', ctc_min: '', ctc_max: '', deadline: '' });
      setTimeout(() => onPosted(), 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to post job');
    }
  };

  return (
    <div>
      <div className="section-title"><PlusCircle size={20} /><h3 style={{ margin: 0 }}>Post a New Job</h3></div>
      <form onSubmit={handleSubmit} className="card" style={{ marginTop: '18px' }}>
        <div className="form-group">
          <label>Title</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Company Name</label>
          <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Location</label>
          <select name="location" value={formData.location} onChange={handleChange}>
            <option value="">Select a location</option>
            {CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Job Type</label>
          <select name="job_type" value={formData.job_type} onChange={handleChange}>
            <option value="full-time">Full-time</option>
            <option value="internship">Internship</option>
            <option value="part-time">Part-time</option>
          </select>
        </div>
        <div className="form-group">
          <label>CTC Offered (LPA)</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="number" name="ctc_min" min="0" step="0.1" placeholder="Min" value={formData.ctc_min} onChange={handleChange} style={{ width: '100px' }} />
            <span>to</span>
            <input type="number" name="ctc_max" min="0" step="0.1" placeholder="Max" value={formData.ctc_max} onChange={handleChange} style={{ width: '100px' }} />
          </div>
          {ctcError && <p className="error-text" style={{ marginTop: '6px' }}>{ctcError}</p>}
        </div>
        <div className="form-group">
          <label>Application Deadline (optional)</label>
          <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Required Skills (comma separated)</label>
          <input type="text" name="required_skills" value={formData.required_skills} onChange={handleChange} placeholder="e.g. React, Node.js, MySQL" />
        </div>
        <div className="form-group">
          <label>Eligibility</label>
          <input type="text" name="eligibility" value={formData.eligibility} onChange={handleChange} />
        </div>
        {message && <p className="success-text">{message}</p>}
        <button type="submit">Post Job</button>
      </form>
    </div>
  );
}

function MyJobsSection({ onChange }) {
  const [jobs, setJobs] = useState([]);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmState, setConfirmState] = useState({ open: false });
  const { showToast } = useToast();

  const [editingJobId, setEditingJobId] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [editCtcError, setEditCtcError] = useState('');
  const [editMessage, setEditMessage] = useState('');

  useEffect(() => { fetchMyJobs(); }, []);

  const fetchMyJobs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/jobs/my-jobs');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (jobId) => {
    setConfirmState({
      open: true,
      title: 'Delete Job Posting',
      message: 'This will permanently remove this job posting and all its applications.',
      danger: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState({ open: false });
        try {
          await api.delete(`/jobs/${jobId}`);
          fetchMyJobs();
          onChange?.();
        } catch (err) {
          showToast('Failed to delete job posting', 'error');
        }
      },
    });
  };

  const handleViewApplicants = async (jobId) => {
    if (expandedJobId === jobId) { setExpandedJobId(null); return; }
    try {
      const res = await api.get(`/applications/job/${jobId}`);
      setApplicants(res.data);
      setExpandedJobId(jobId);
    } catch (err) {
      console.error(err);
      showToast('Failed to load applicants', 'error');
    }
  };

  const handleStatusChange = async (applicationId, newStatus, jobId) => {
    try {
      await api.put(`/applications/${applicationId}/status`, { status: newStatus });
      const res = await api.get(`/applications/job/${jobId}`);
      setApplicants(res.data);
      fetchMyJobs(); // refresh the analytics counts on the job card too
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  const handleRemoveApplication = (applicationId, jobId) => {
    setConfirmState({
      open: true,
      title: 'Remove Application',
      message: 'This cannot be undone.',
      danger: true,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setConfirmState({ open: false });
        try {
          await api.delete(`/applications/${applicationId}`);
          const res = await api.get(`/applications/job/${jobId}`);
          setApplicants(res.data);
          fetchMyJobs();
          onChange?.();
        } catch (err) {
          showToast('Failed to remove application', 'error');
        }
      },
    });
  };

  const handleEditClick = (job) => {
    setExpandedJobId(null);
    setEditingJobId(job.id);
    setEditCtcError('');
    setEditMessage('');
    setEditFormData({
      title: job.title || '',
      description: job.description || '',
      company_name: job.company_name || '',
      location: job.location || '',
      job_type: job.job_type || 'full-time',
      required_skills: job.required_skills || '',
      eligibility: job.eligibility || '',
      ctc_min: job.ctc_min ?? '',
      ctc_max: job.ctc_max ?? '',
      deadline: job.deadline ? String(job.deadline).slice(0, 10) : '',
    });
  };

  const handleEditChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleEditCancel = () => {
    setEditingJobId(null);
    setEditFormData(null);
    setEditCtcError('');
    setEditMessage('');
  };

  const handleEditSave = async (e, jobId) => {
    e.preventDefault();
    setEditCtcError('');
    setEditMessage('');

    if (editFormData.ctc_min && editFormData.ctc_max && Number(editFormData.ctc_min) > Number(editFormData.ctc_max)) {
      setEditCtcError('Minimum CTC cannot be greater than maximum CTC');
      return;
    }

    try {
      await api.put(`/jobs/${jobId}`, {
        ...editFormData,
        ctc_min: editFormData.ctc_min ? Number(editFormData.ctc_min) : null,
        ctc_max: editFormData.ctc_max ? Number(editFormData.ctc_max) : null,
        deadline: editFormData.deadline || null,
      });
      setEditingJobId(null);
      setEditFormData(null);
      fetchMyJobs();
    } catch (err) {
      setEditMessage(err.response?.data?.message || 'Failed to update job');
    }
  };

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const formatCtc = (min, max) => {
    if (!min && !max) return null;
    if (min && max) return `₹${min}–${max} LPA`;
    return `₹${min || max} LPA`;
  };

  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    return new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isExpired = (deadline) => deadline && new Date(deadline) < new Date(new Date().toDateString());

  return (
    <div>
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        danger={confirmState.danger}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />
      <div className="section-title"><Briefcase size={20} /><h3 style={{ margin: 0 }}>My Job Postings</h3></div>
      <div style={{ marginTop: '18px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state"><Briefcase size={32} /> You haven't posted any jobs yet.</div>
        ) : (
          jobs.map((job) => {
            const skills = job.required_skills ? job.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [];
            const ctc = formatCtc(job.ctc_min, job.ctc_max);
            const deadlineText = formatDeadline(job.deadline);
            const expired = isExpired(job.deadline);
            const statusCounts = [
              { label: 'Applied', count: Number(job.applied_count) || 0 },
              { label: 'Under Review', count: Number(job.under_review_count) || 0 },
              { label: 'Shortlisted', count: Number(job.shortlisted_count) || 0 },
              { label: 'Rejected', count: Number(job.rejected_count) || 0 },
              { label: 'Selected', count: Number(job.selected_count) || 0 },
            ].filter(s => s.count > 0);

            if (editingJobId === job.id) {
              return (
                <div key={job.id} className="card">
                  <div className="section-title" style={{ marginBottom: '16px' }}><Pencil size={18} /><h4 style={{ margin: 0 }}>Edit Job</h4></div>
                  <form onSubmit={(e) => handleEditSave(e, job.id)}>
                    <div className="form-group">
                      <label>Title</label>
                      <input type="text" name="title" value={editFormData.title} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea name="description" value={editFormData.description} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>Company Name</label>
                      <input type="text" name="company_name" value={editFormData.company_name} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <select name="location" value={editFormData.location} onChange={handleEditChange}>
                        <option value="">Select a location</option>
                        {CITY_OPTIONS.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Job Type</label>
                      <select name="job_type" value={editFormData.job_type} onChange={handleEditChange}>
                        <option value="full-time">Full-time</option>
                        <option value="internship">Internship</option>
                        <option value="part-time">Part-time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>CTC Offered (LPA)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="number" name="ctc_min" min="0" step="0.1" placeholder="Min" value={editFormData.ctc_min} onChange={handleEditChange} style={{ width: '100px' }} />
                        <span>to</span>
                        <input type="number" name="ctc_max" min="0" step="0.1" placeholder="Max" value={editFormData.ctc_max} onChange={handleEditChange} style={{ width: '100px' }} />
                      </div>
                      {editCtcError && <p className="error-text" style={{ marginTop: '6px' }}>{editCtcError}</p>}
                    </div>
                    <div className="form-group">
                      <label>Application Deadline (optional)</label>
                      <input type="date" name="deadline" value={editFormData.deadline} onChange={handleEditChange} />
                    </div>
                    <div className="form-group">
                      <label>Required Skills (comma separated)</label>
                      <input type="text" name="required_skills" value={editFormData.required_skills} onChange={handleEditChange} placeholder="e.g. React, Node.js, MySQL" />
                      <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '6px' }}>
                        Changing this updates every applicant's match score automatically.
                      </p>
                    </div>
                    <div className="form-group">
                      <label>Eligibility</label>
                      <input type="text" name="eligibility" value={editFormData.eligibility} onChange={handleEditChange} />
                    </div>
                    {editMessage && <p className="error-text">{editMessage}</p>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit">Save Changes</button>
                      <button type="button" className="secondary" onClick={handleEditCancel}>Cancel</button>
                    </div>
                  </form>
                </div>
              );
            }

            return (
              <div key={job.id} className="card">
                <div className="card-top">
                  <div>
                    <h4>{job.title}</h4>
                    <div className="company">{job.company_name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {expired && <span className="badge rejected">Expired</span>}
                    <span className="type-pill">{job.job_type}</span>
                  </div>
                </div>
                <p>{job.description}</p>
                <div className="meta-row">
                  <span><MapPin size={13} /> {job.location || 'N/A'}</span>
                  {ctc && <span>{ctc}</span>}
                  {deadlineText && <span>{expired ? 'Deadline was' : 'Apply by'} {deadlineText}</span>}
                </div>
                {skills.length > 0 && (
                  <div className="chip-row">
                    {skills.map((s, i) => <span key={i} className="chip">{s}</span>)}
                  </div>
                )}

                {statusCounts.length > 0 && (
                  <div className="status-count-row">
                    {statusCounts.map((s, i) => <span key={i} className="status-count-item">{s.count} {s.label}</span>)}
                  </div>
                )}

                <div className="card-actions" style={{ marginTop: '14px' }}>
                  <button onClick={() => handleViewApplicants(job.id)}>
                    <Users size={15} /> {expandedJobId === job.id ? 'Hide Applicants' : 'View Applicants'}
                  </button>
                  <button className="secondary" onClick={() => handleEditClick(job)}><Pencil size={15} /> Edit</button>
                  <button className="danger" onClick={() => handleDelete(job.id)}><Trash2 size={15} /> Delete</button>
                </div>

                {expandedJobId === job.id && (
                  <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
                    <div className="section-title" style={{ marginBottom: '12px' }}><BarChart3 size={16} /><h5 style={{ margin: 0 }}>Applicants</h5></div>
                    {applicants.length === 0 ? (
                      <div className="empty-state"><Users size={28} /> No applicants yet.</div>
                    ) : (
                      applicants.map((app) => (
                        <div key={app.id} className="applicant-row">
                          {app.photo ? (
                            <img src={`${fileUrl(app.photo)}`} alt={app.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div className="avatar">{getInitials(app.name)}</div>
                          )}
                          <div className="info">
                            <p><b>{app.name}</b> — {app.email}</p>
                            <div className="muted-line">
                              Applied {new Date(app.applied_at).toLocaleDateString()}
                            </div>
                          </div>
                          {typeof app.match_score === 'number' && (
                            <div className="match-score-wrap" style={{ marginRight: '6px' }}>
                              <span className="badge">{app.match_score}% Match</span>
                              <div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${app.match_score}%` }} /></div>
                            </div>
                          )}
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value, job.id)}
                            style={{ width: 'auto' }}
                          >
                            <option value="applied">Applied</option>
                            <option value="under_review">Under Review</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="rejected">Rejected</option>
                            <option value="selected">Selected</option>
                          </select>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleRemoveApplication(app.id, job.id)}
                            style={{ padding: '6px 10px', marginLeft: '8px' }}
                            title="Remove application"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RecruiterDashboard;