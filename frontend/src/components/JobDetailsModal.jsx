import { useEffect } from 'react';
import { X, MapPin, GraduationCap, AlertCircle, Clock3, Send } from 'lucide-react';

function formatCtc(min, max) {
  if (!min && !max) return null;
  if (min && max) return `₹${min}–${max} LPA`;
  return `₹${min || max} LPA`;
}

function formatDeadline(deadline) {
  if (!deadline) return null;
  return new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function JobDetailsModal({ job, onClose, onApply }) {
  useEffect(() => {
    if (!job) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden'; // stop the page scrolling behind the modal
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [job, onClose]);

  if (!job) return null;

  const skills = job.required_skills ? job.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const missing = (job.missing_skills || []).map(s => s.toLowerCase());
  const ctc = formatCtc(job.ctc_min, job.ctc_max);
  const deadlineText = formatDeadline(job.deadline);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box job-modal" onClick={(e) => e.stopPropagation()}>
        <button className="job-modal-close" onClick={onClose} title="Close"><X size={18} /></button>

        <div className="card-top">
          <div>
            <h3 style={{ marginBottom: 4 }}>{job.title}</h3>
            <div className="company">{job.company_name}</div>
          </div>
          <span className="type-pill">{job.job_type}</span>
        </div>

        {typeof job.match_score === 'number' && (
          <div className="job-modal-match">
            <span className="badge">{job.match_score}% Match</span>
            <div className="match-bar-track" style={{ width: 120 }}>
              <div className="match-bar-fill" style={{ width: `${job.match_score}%` }} />
            </div>
          </div>
        )}

        <div className="meta-row">
          <span><MapPin size={13} /> {job.location || 'N/A'}{job.location_match ? ' (Preferred)' : ''}</span>
          <span><GraduationCap size={13} /> {job.eligibility || 'Open'}</span>
          {ctc && <span>{ctc}</span>}
          {deadlineText && <span><Clock3 size={13} /> Apply by {deadlineText}</span>}
        </div>

        <h5 className="job-modal-heading">About this role</h5>
        <p className="job-modal-desc">{job.description}</p>

        {skills.length > 0 && (
          <>
            <h5 className="job-modal-heading">Required skills</h5>
            <div className="chip-row">
              {skills.map((s, i) => (
                <span key={i} className={`chip ${missing.includes(s.toLowerCase()) ? 'chip-missing' : ''}`}>{s}</span>
              ))}
            </div>
          </>
        )}

        {job.missing_skills?.length > 0 && (
          <div className="missing-skills-note">
            <AlertCircle size={13} /> Missing: {job.missing_skills.join(', ')}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 22 }}>
          <button className="secondary" onClick={onClose}>Close</button>
          <button onClick={() => onApply(job.id)}><Send size={15} /> Apply Now</button>
        </div>
      </div>
    </div>
  );
}

export default JobDetailsModal;